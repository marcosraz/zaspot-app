/**
 * Supabase Client Configuration
 * Connects to ZAspot Supabase backend
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://krbsbsiauuxevtjziudl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyYnNic2lhdXV4ZXZ0anppdWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTYzMjYsImV4cCI6MjA3NTIzMjMyNn0.mD8cVk__1yWz_ZFYcaLhrK-U2BNwyldMyxCfnsv19ac';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

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
  const { data, error } = await supabase
    .from('charging_stations')
    .select('*')
    .eq('status', 'operational')
    .order('name');

  if (error) {
    console.error('Error fetching stations:', error);
    return [];
  }

  return data || [];
}

// Fetch stations near a location
export async function fetchNearbyStations(
  latitude: number,
  longitude: number,
  radiusKm: number = 50
): Promise<ChargingStation[]> {
  // Simple bounding box calculation
  const latDelta = radiusKm / 111; // ~111km per degree latitude
  const lonDelta = radiusKm / (111 * Math.cos(latitude * Math.PI / 180));

  const { data, error } = await supabase
    .from('charging_stations')
    .select('*')
    .gte('latitude', latitude - latDelta)
    .lte('latitude', latitude + latDelta)
    .gte('longitude', longitude - lonDelta)
    .lte('longitude', longitude + lonDelta)
    .eq('status', 'operational');

  if (error) {
    console.error('Error fetching nearby stations:', error);
    return [];
  }

  return data || [];
}

// Fetch single station by ID
export async function fetchStation(id: string): Promise<ChargingStation | null> {
  const { data, error } = await supabase
    .from('charging_stations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching station:', error);
    return null;
  }

  return data;
}

// Fetch multiple stations by IDs (for favorites)
export async function fetchStationsByIds(ids: string[]): Promise<ChargingStation[]> {
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from('charging_stations')
    .select('*')
    .in('id', ids);

  if (error) {
    console.error('Error fetching stations by IDs:', error);
    return [];
  }

  // Maintain the order of the input IDs
  const stationMap = new Map(data?.map(s => [s.id, s]) || []);
  return ids.map(id => stationMap.get(id)).filter((s): s is ChargingStation => s !== undefined);
}
