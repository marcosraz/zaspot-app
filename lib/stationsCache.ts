/**
 * Stations Cache - Offline support for charging stations
 * Caches station data locally for offline access
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { ChargingStation, supabase } from './supabase';

const CACHE_KEY = '@zaspot_stations_cache';
const CACHE_TIMESTAMP_KEY = '@zaspot_stations_cache_timestamp';
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheData {
  stations: ChargingStation[];
  timestamp: number;
}

/**
 * Check if device is online
 */
export async function isOnline(): Promise<boolean> {
  try {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected === true && netInfo.isInternetReachable !== false;
  } catch {
    return true; // Assume online if check fails
  }
}

/**
 * Get cached stations
 */
export async function getCachedStations(): Promise<ChargingStation[] | null> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data: CacheData = JSON.parse(cached);

    // Check if cache is still valid
    const age = Date.now() - data.timestamp;
    if (age > CACHE_MAX_AGE_MS) {
      return null; // Cache expired
    }

    return data.stations;
  } catch (error) {
    console.error('Error reading stations cache:', error);
    return null;
  }
}

/**
 * Save stations to cache
 */
export async function cacheStations(stations: ChargingStation[]): Promise<void> {
  try {
    const data: CacheData = {
      stations,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
    console.log(`Cached ${stations.length} stations`);
  } catch (error) {
    console.error('Error caching stations:', error);
  }
}

/**
 * Get cache timestamp
 */
export async function getCacheTimestamp(): Promise<Date | null> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data: CacheData = JSON.parse(cached);
    return new Date(data.timestamp);
  } catch {
    return null;
  }
}

/**
 * Clear cache
 */
export async function clearCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Fetch stations with offline fallback
 * Returns cached data when offline, fetches fresh data when online
 */
export async function fetchStationsWithCache(): Promise<{
  stations: ChargingStation[];
  isFromCache: boolean;
  cacheAge?: number;
}> {
  const online = await isOnline();

  if (online) {
    try {
      // Fetch fresh data
      const { data, error } = await supabase
        .from('charging_stations')
        .select('*')
        .limit(1000);

      if (error) throw error;

      const stations = data || [];

      // Update cache
      await cacheStations(stations);

      return { stations, isFromCache: false };
    } catch (error) {
      console.error('Error fetching stations, trying cache:', error);
      // Fall back to cache on error
    }
  }

  // Try cache
  const cached = await getCachedStations();
  if (cached) {
    const cacheData = await getCacheTimestamp();
    const cacheAge = cacheData ? Date.now() - cacheData.getTime() : undefined;
    return { stations: cached, isFromCache: true, cacheAge };
  }

  // No cache available
  return { stations: [], isFromCache: false };
}

/**
 * Format cache age for display
 */
export function formatCacheAge(ageMs: number): string {
  const hours = Math.floor(ageMs / (1000 * 60 * 60));
  const minutes = Math.floor((ageMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes} min`;
}
