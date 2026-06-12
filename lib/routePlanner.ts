/**
 * Route Planner - Calculate optimal charging stops
 */

import { ChargingStation, fetchNearbyStations } from './stations';
import { getCompatibleConnectors } from '../constants/vehiclePresets';
import { fetchEmpStations } from './v2Features';
import { loadPriceContext, getStationPriceCzk, PriceContext } from './stationPrices';

export interface RoutePlanOptions {
  /** 'all' adds Hubject roaming stations along the corridor (chargeable via
   *  the app since the EMP go-live); 'zaspot' restricts to our network. */
  network?: 'zaspot' | 'all';
  /** Weight price into stop selection instead of pure DC/power scoring. */
  preferCheapest?: boolean;
  /** Only consider chargers with at least this power. */
  minPowerKw?: number;
  /** Skip stations costlier than this (stations without a published price
   *  are kept — dropping them would empty rural corridors). */
  maxPriceCzkKwh?: number;
}

export interface RoutePoint {
  latitude: number;
  longitude: number;
  name?: string;
}

export interface ChargingStop {
  station: ChargingStation;
  distanceFromStart: number;  // km
  arrivalBattery: number;     // %
  chargeToPercent: number;    // %
  chargeTime: number;         // minutes
  chargeCost: number;         // CZK
  /** Effective price used for the cost estimate (CZK/kWh), null if unknown */
  pricePerKwh: number | null;
}

export interface RouteResult {
  from: RoutePoint;
  to: RoutePoint;
  totalDistance: number;      // km
  totalDuration: number;      // minutes (driving + charging)
  drivingDuration: number;    // minutes
  chargingDuration: number;   // minutes
  totalCost: number;          // CZK
  stops: ChargingStop[];
}

// Constants for route calculation
const AVERAGE_SPEED_KMH = 90;           // Average highway speed
const CONSUMPTION_KWH_PER_100KM = 18;   // Average EV consumption
const CHARGING_EFFICIENCY = 0.9;        // 90% charging efficiency
const MIN_BATTERY_PERCENT = 15;         // Don't go below 15%
const ARRIVAL_TARGET_PERCENT = 20;      // Arrive with at least 20%

/**
 * Calculate distance between two points using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate driving time for a distance
 */
function calculateDrivingTime(distanceKm: number): number {
  return (distanceKm / AVERAGE_SPEED_KMH) * 60; // minutes
}

/**
 * Calculate charging time to add a certain percentage
 */
function calculateChargingTime(
  percentToAdd: number,
  batteryCapacityKwh: number,
  chargerPowerKw: number,
  vehicleMaxPowerKw?: number
): number {
  const energyNeeded = (percentToAdd / 100) * batteryCapacityKwh;
  // Vehicle can only accept up to its max charging power
  const actualPower = vehicleMaxPowerKw
    ? Math.min(chargerPowerKw, vehicleMaxPowerKw)
    : chargerPowerKw;
  const effectivePower = actualPower * CHARGING_EFFICIENCY;
  // Simplified: assumes linear charging (in reality it's curved)
  return (energyNeeded / effectivePower) * 60; // minutes
}

/**
 * Calculate battery consumption for a distance
 */
function calculateBatteryConsumption(
  distanceKm: number,
  vehicleRangeKm: number
): number {
  return (distanceKm / vehicleRangeKm) * 100;
}

/**
 * Find optimal charging stops along a route
 */
export async function planRoute(
  from: RoutePoint,
  to: RoutePoint,
  currentBatteryPercent: number,
  vehicleRangeKm: number,
  batteryCapacityKwh: number = 60,
  maxChargingPowerKw?: number,
  connectorType?: string,
  options: RoutePlanOptions = {}
): Promise<RouteResult> {
  const totalDistance = calculateDistance(
    from.latitude,
    from.longitude,
    to.latitude,
    to.longitude
  );

  // Calculate if we can make it without charging
  const batteryNeeded = calculateBatteryConsumption(totalDistance, vehicleRangeKm);
  const batteryAfterTrip = currentBatteryPercent - batteryNeeded;

  const stops: ChargingStop[] = [];
  let currentPosition = from;
  let remainingDistance = totalDistance;
  let currentBattery = currentBatteryPercent;
  let totalChargingTime = 0;
  let totalChargingCost = 0;

  // If we can make it, no stops needed
  if (batteryAfterTrip >= ARRIVAL_TARGET_PERCENT) {
    return {
      from,
      to,
      totalDistance,
      totalDuration: calculateDrivingTime(totalDistance),
      drivingDuration: calculateDrivingTime(totalDistance),
      chargingDuration: 0,
      totalCost: 0,
      stops: [],
    };
  }

  // We need charging stops
  // Find stations along the route corridor
  const midLat = (from.latitude + to.latitude) / 2;
  const midLon = (from.longitude + to.longitude) / 2;
  const searchRadius = Math.max(totalDistance * 0.6, 50); // Search in corridor

  // Price context for filtering/scoring/cost — non-fatal if it fails
  const priceCtx: PriceContext | null = await loadPriceContext().catch(() => null);

  let allStations = await fetchNearbyStations(midLat, midLon, searchRadius);

  // 'all': add Hubject roaming stations from a bounding box around the route
  // (padded ~0.3° ≈ 25 km). They are startable from the app since the EMP
  // go-live, so they are legitimate stops.
  if (options.network === 'all') {
    const pad = 0.3;
    const west = Math.min(from.longitude, to.longitude) - pad;
    const east = Math.max(from.longitude, to.longitude) + pad;
    const south = Math.min(from.latitude, to.latitude) - pad;
    const north = Math.max(from.latitude, to.latitude) + pad;
    const empRes = await fetchEmpStations({
      bounds: `${west},${south},${east},${north}`,
      limit: 1000,
    }).catch(() => null);
    if (empRes?.ok && empRes.data?.success) {
      const seen = new Set(allStations.map((s) => s.id));
      const empMapped: ChargingStation[] = empRes.data.stations
        .map((s) => ({
          id: 'emp-' + s.evse_id,
          name: s.name,
          address: s.address,
          city: null,
          postal_code: null,
          country: 'EU',
          latitude: s.latitude,
          longitude: s.longitude,
          type: (s.max_power_kw >= 50 ? 'DC' : 'AC') as 'AC' | 'DC',
          power_kw: s.max_power_kw,
          price_per_kwh: s.price_per_kwh,
          available: s.status === 'available',
          status: (s.status === 'available' ? 'operational' : 'offline') as ChargingStation['status'],
          operator: s.operator,
          operator_phone: null,
          connector_types: s.connectors.map((c) => c.type),
          num_connectors: s.connectors.length,
          access_hours: '24/7',
          parking_fee: false,
          description: null,
        }))
        .filter((s) => !seen.has(s.id));
      allStations = [...allStations, ...empMapped];
    }
  }

  // User-selected constraints: minimum power + maximum price. Stations with
  // NO published price survive the price filter (dropping them would empty
  // rural corridors), but preferCheapest scoring ranks priced ones higher.
  if (options.minPowerKw && options.minPowerKw > 0) {
    allStations = allStations.filter((s) => s.power_kw >= options.minPowerKw!);
  }
  if (options.maxPriceCzkKwh && options.maxPriceCzkKwh > 0 && priceCtx) {
    allStations = allStations.filter((s) => {
      const p = getStationPriceCzk(s, priceCtx);
      return p == null || p <= options.maxPriceCzkKwh!;
    });
  }

  // Filter by connector compatibility
  const compatibleConnectors = connectorType ? getCompatibleConnectors(connectorType) : null;
  const compatibleStations = compatibleConnectors
    ? allStations.filter(station => {
        // Check if station has a compatible connector type
        if (station.connector_types && Array.isArray(station.connector_types)) {
          return station.connector_types.some((ct: string) =>
            compatibleConnectors.some(cc => ct.toLowerCase().includes(cc.toLowerCase()))
          );
        }
        // If no connector info, include by default
        return true;
      })
    : allStations;

  // Filter stations that are roughly along the route
  // Simple heuristic: station should be between from and to
  const stationsAlongRoute = compatibleStations.filter(station => {
    const distToFrom = calculateDistance(
      from.latitude,
      from.longitude,
      station.latitude,
      station.longitude
    );
    const distToTo = calculateDistance(
      station.latitude,
      station.longitude,
      to.latitude,
      to.longitude
    );
    // Station should be roughly on the way (not a big detour)
    return distToFrom + distToTo < totalDistance * 1.3;
  });

  // Sort by distance from start
  stationsAlongRoute.sort((a, b) => {
    const distA = calculateDistance(from.latitude, from.longitude, a.latitude, a.longitude);
    const distB = calculateDistance(from.latitude, from.longitude, b.latitude, b.longitude);
    return distA - distB;
  });

  // Plan stops
  let distanceTraveled = 0;

  while (remainingDistance > 0) {
    // Calculate how far we can go with current battery
    const rangeWithCurrentBattery = (currentBattery - MIN_BATTERY_PERCENT) / 100 * vehicleRangeKm;

    // If we can reach destination
    if (rangeWithCurrentBattery >= remainingDistance + (ARRIVAL_TARGET_PERCENT / 100 * vehicleRangeKm)) {
      break;
    }

    // Find best charging station within our range
    const reachableStations = stationsAlongRoute.filter(station => {
      const distToStation = calculateDistance(
        currentPosition.latitude,
        currentPosition.longitude,
        station.latitude,
        station.longitude
      );
      return distToStation < rangeWithCurrentBattery && distToStation > distanceTraveled;
    });

    if (reachableStations.length === 0) {
      // No reachable stations - this route may not be possible
      console.warn('No reachable stations found for route');
      break;
    }

    // Pick the best station. Base score favors DC fast chargers + power; with
    // preferCheapest every Kč/kWh costs 25 points (≈ a 10-Kč-cheaper station
    // outweighs a 250-kW-stronger one) and unpriced stations get a flat
    // penalty so a known-cheap charger beats an unknown one.
    const scoreStation = (s: ChargingStation): number => {
      let score = (s.type === 'DC' ? 100 : 0) + s.power_kw;
      if (options.preferCheapest && priceCtx) {
        const p = getStationPriceCzk(s, priceCtx);
        score += p != null ? -p * 25 : -150;
      }
      return score;
    };
    const bestStation = reachableStations.reduce((best, current) =>
      scoreStation(current) > scoreStation(best) ? current : best
    );

    // Calculate stop details
    const distToStation = calculateDistance(
      currentPosition.latitude,
      currentPosition.longitude,
      bestStation.latitude,
      bestStation.longitude
    );

    const batteryUsedToStation = calculateBatteryConsumption(distToStation, vehicleRangeKm);
    const arrivalBattery = currentBattery - batteryUsedToStation;

    // Calculate how much to charge
    const distStationToEnd = calculateDistance(
      bestStation.latitude,
      bestStation.longitude,
      to.latitude,
      to.longitude
    );
    const batteryNeededToEnd = calculateBatteryConsumption(distStationToEnd, vehicleRangeKm);
    const targetBattery = Math.min(80, batteryNeededToEnd + ARRIVAL_TARGET_PERCENT + 10);
    const chargeAmount = Math.max(0, targetBattery - arrivalBattery);

    const chargeTime = calculateChargingTime(
      chargeAmount,
      batteryCapacityKwh,
      bestStation.power_kw,
      maxChargingPowerKw
    );

    // Real comparable price (ZAspot live tariff / Hubject EUR→CZK / public DB);
    // 8 Kč/kWh as the estimate when the operator publishes nothing.
    const knownPrice = priceCtx ? getStationPriceCzk(bestStation, priceCtx) : null;
    const pricePerKwh = knownPrice ?? bestStation.price_per_kwh ?? 8;
    const energyCharged = (chargeAmount / 100) * batteryCapacityKwh;
    const chargeCost = energyCharged * pricePerKwh;

    stops.push({
      station: bestStation,
      distanceFromStart: distanceTraveled + distToStation,
      arrivalBattery: Math.round(arrivalBattery),
      chargeToPercent: Math.round(arrivalBattery + chargeAmount),
      chargeTime: Math.round(chargeTime),
      chargeCost: Math.round(chargeCost),
      pricePerKwh: knownPrice,
    });

    totalChargingTime += chargeTime;
    totalChargingCost += chargeCost;

    // Update position and battery for next iteration
    currentPosition = {
      latitude: bestStation.latitude,
      longitude: bestStation.longitude,
      name: bestStation.name,
    };
    currentBattery = arrivalBattery + chargeAmount;
    distanceTraveled += distToStation;
    remainingDistance = totalDistance - distanceTraveled;
  }

  const drivingDuration = calculateDrivingTime(totalDistance);

  return {
    from,
    to,
    totalDistance: Math.round(totalDistance),
    totalDuration: Math.round(drivingDuration + totalChargingTime),
    drivingDuration: Math.round(drivingDuration),
    chargingDuration: Math.round(totalChargingTime),
    totalCost: Math.round(totalChargingCost),
    stops,
  };
}

/**
 * Geocode a location name to coordinates (simplified - uses Nominatim)
 */
export async function geocodeLocation(query: string): Promise<RoutePoint | null> {
  try {
    const encodedQuery = encodeURIComponent(query + ', Czech Republic');
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'ZAspot Mobile App',
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (data.length === 0) return null;

    return {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
      name: data[0].display_name.split(',')[0],
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}
