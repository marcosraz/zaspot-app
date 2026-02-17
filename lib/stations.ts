/**
 * Stations API Client
 * Fetches charging station data from ZAspot backend REST API
 */

const API_BASE = 'https://zaspot.cz/api';

// Types for charging stations
export interface ChargingStation {
  id: string;
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
