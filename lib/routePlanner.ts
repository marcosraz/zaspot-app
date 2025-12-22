/**
 * Route Planner - Calculate optimal charging stops
 */

import { ChargingStation, fetchNearbyStations } from './supabase';

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
  chargerPowerKw: number
): number {
  const energyNeeded = (percentToAdd / 100) * batteryCapacityKwh;
  const effectivePower = chargerPowerKw * CHARGING_EFFICIENCY;
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
  batteryCapacityKwh: number = 60
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

  const allStations = await fetchNearbyStations(midLat, midLon, searchRadius);

  // Filter stations that are roughly along the route
  // Simple heuristic: station should be between from and to
  const stationsAlongRoute = allStations.filter(station => {
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

    // Pick the best station (prefer DC fast chargers, higher power)
    const bestStation = reachableStations.reduce((best, current) => {
      const score = (current.type === 'DC' ? 100 : 0) + current.power_kw;
      const bestScore = (best.type === 'DC' ? 100 : 0) + best.power_kw;
      return score > bestScore ? current : best;
    });

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
      bestStation.power_kw
    );

    const pricePerKwh = bestStation.price_per_kwh || 8; // Default price
    const energyCharged = (chargeAmount / 100) * batteryCapacityKwh;
    const chargeCost = energyCharged * pricePerKwh;

    stops.push({
      station: bestStation,
      distanceFromStart: distanceTraveled + distToStation,
      arrivalBattery: Math.round(arrivalBattery),
      chargeToPercent: Math.round(arrivalBattery + chargeAmount),
      chargeTime: Math.round(chargeTime),
      chargeCost: Math.round(chargeCost),
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
