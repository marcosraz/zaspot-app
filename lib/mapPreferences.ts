/**
 * Map preferences — which stations the map opens with.
 *
 *   network   'all'    every station nearby: ZAspot + Hubject roaming + directory (default)
 *             'zaspot' only ZAspot's own stations
 *   remember  true     ticking "Jen ZAspot" on the map updates `network`, so the
 *                      choice survives an app restart (default)
 *             false    the map checkbox only lasts for the session; every start
 *                      opens with `network` as set in Profile → Settings
 *
 * Both are editable in Profile → Settings. The map screen stays mounted while
 * the user is on another tab, so changes are pushed to it through subscribe().
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export type MapNetwork = 'all' | 'zaspot';

export interface MapPrefs {
  network: MapNetwork;
  remember: boolean;
}

export const DEFAULT_MAP_PREFS: MapPrefs = { network: 'all', remember: true };

const KEY = 'zaspot.mapPrefs.v1';
let current: MapPrefs | null = null;
const listeners = new Set<(p: MapPrefs) => void>();

export async function loadMapPrefs(): Promise<MapPrefs> {
  if (current) return current;
  let prefs = DEFAULT_MAP_PREFS;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      prefs = {
        network: parsed?.network === 'zaspot' ? 'zaspot' : 'all',
        remember: parsed?.remember !== false,
      };
    }
  } catch {
    // Unreadable storage must never keep the map from opening.
  }
  current = prefs;
  return prefs;
}

export async function saveMapPrefs(patch: Partial<MapPrefs>): Promise<MapPrefs> {
  const next = { ...(await loadMapPrefs()), ...patch };
  current = next;
  listeners.forEach((fn) => fn(next));
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Keep the in-memory value; it just won't survive a restart.
  }
  return next;
}

/** Called with every saved change. Returns the unsubscribe function. */
export function subscribeMapPrefs(fn: (p: MapPrefs) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
