/**
 * Stations API Client
 * Fetches charging station data from ZAspot backend REST API
 */

const API_BASE = 'https://www.zaspot.cz/api';

export interface OcppConnector {
  id: number;
  type: string;
  status: string;
  maxPowerKw?: number;
}

// Types for charging stations
export interface ChargingStation {
  id: string;
  // For ZAspot OCPP stations this is the OCPP charge_point_id (e.g. "CZ-ZAS-E00018").
  // Needed by /api/terminal-price to get the station-specific live price.
  external_id?: string | null;
  name: string;
  address: string;
  city: string | null;
  postal_code: string | null;
  country: string;
  latitude: number;
  longitude: number;
  type: 'AC' | 'DC';
  power_kw: number;
  price_per_kwh: number | null;
  available: boolean;
  status: 'operational' | 'maintenance' | 'offline';
  operator: string | null;
  operator_phone: string | null;
  connector_types: string[];
  num_connectors: number;
  access_hours: string;
  parking_fee: boolean;
  description: string | null;
  // ZAspot-eigene OCPP-Stationen
  is_ocpp?: boolean;
  connectors?: OcppConnector[];
}

// Fetch all stations
export async function fetchStations(): Promise<ChargingStation[]> {
  try {
    const res = await fetch(`${API_BASE}/charging-stations`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.stations || [];
  } catch (error) {
    console.error('Error fetching stations:', error);
    return [];
  }
}

// Fetch stations near a location
export async function fetchNearbyStations(
  latitude: number,
  longitude: number,
  radiusKm: number = 50
): Promise<ChargingStation[]> {
  try {
    // Fetch all stations and filter client-side (same bounding box logic as before)
    const stations = await fetchStations();

    const latDelta = radiusKm / 111;
    const lonDelta = radiusKm / (111 * Math.cos(latitude * Math.PI / 180));

    return stations.filter(s =>
      s.latitude >= latitude - latDelta &&
      s.latitude <= latitude + latDelta &&
      s.longitude >= longitude - lonDelta &&
      s.longitude <= longitude + lonDelta &&
      s.status === 'operational'
    );
  } catch (error) {
    console.error('Error fetching nearby stations:', error);
    return [];
  }
}

// Fetch ZAspot's own OCPP-connected stations (matches web charging-map default view)
export async function fetchOcppStations(): Promise<ChargingStation[]> {
  try {
    const res = await fetch(`${API_BASE}/ocpp/charge-points`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const chargePoints = json.chargePoints || [];

    return chargePoints
      .filter((cp: any) => cp.locationLat != null && cp.locationLng != null)
      .map((cp: any): ChargingStation => {
        const physicalConnectors = (cp.connectors || []).filter(
          (c: any) => c.connectorId !== 0
        );
        const isDc = physicalConnectors.some((c: any) =>
          ['CCS', 'CCS1', 'CCS2', 'CHAdeMO', 'chademo'].includes(c.connectorType)
        );
        const isAvailable =
          cp.isOnline &&
          (physicalConnectors.length === 0 ||
            physicalConnectors.some((c: any) => c.status === 'Available'));

        return {
          id: cp.id || cp.chargePointId,
          name: cp.name || cp.chargePointId,
          address: cp.locationAddress || '',
          city: null,
          postal_code: null,
          country: 'CZ',
          latitude: Number(cp.locationLat),
          longitude: Number(cp.locationLng),
          type: isDc ? 'DC' : 'AC',
          power_kw: Number(cp.maxPowerKw) || 0,
          price_per_kwh: null,
          available: isAvailable,
          status: cp.isOnline ? 'operational' : 'offline',
          operator: 'ZAspot',
          operator_phone: null,
          connector_types: physicalConnectors
            .map((c: any) => c.connectorType)
            .filter(Boolean),
          num_connectors: physicalConnectors.length || 1,
          access_hours: '24/7',
          parking_fee: false,
          description: null,
          is_ocpp: true,
          connectors: physicalConnectors
            .sort((a: any, b: any) => a.connectorId - b.connectorId)
            .map((c: any) => ({
              id: c.connectorId,
              type: c.connectorType,
              status: c.status || 'Unknown',
              maxPowerKw: c.maxPowerKw,
            })),
        };
      });
  } catch (error) {
    console.error('Error fetching OCPP stations:', error);
    return [];
  }
}

// Fetch single station by ID
export async function fetchStation(id: string): Promise<ChargingStation | null> {
  try {
    const res = await fetch(`${API_BASE}/charging-stations/${id}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.station || json || null;
  } catch (error) {
    console.error('Error fetching station:', error);
    return null;
  }
}

// Fetch multiple stations by IDs (for favorites)
export async function fetchStationsByIds(ids: string[]): Promise<ChargingStation[]> {
  if (ids.length === 0) return [];

  try {
    // Fetch all stations and filter by IDs
    const allStations = await fetchStations();
    const stationMap = new Map(allStations.map(s => [s.id, s]));

    // Maintain the order of the input IDs
    return ids.map(id => stationMap.get(id)).filter((s): s is ChargingStation => s !== undefined);
  } catch (error) {
    console.error('Error fetching stations by IDs:', error);
    return [];
  }
}
