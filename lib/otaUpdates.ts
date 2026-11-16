import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Updates from 'expo-updates';

const MIN_CHECK_INTERVAL_MS = 15 * 60 * 1000;

/**
 * Downloads a pending OTA update whenever the app returns to the foreground.
 *
 * expo-updates on its own only checks on a cold start, and an update it finds
 * then is applied on the cold start AFTER that. This app typically lives in
 * the background for days, so a fix would need two process deaths to land.
 * Fetching on foreground gets the update onto the device early.
 *
 * It is still applied on the next cold start — never by reloading a running
 * session, which could interrupt a payment or the start of a charge.
 */
export function useOtaUpdateFetch() {
  // The cold start has just checked, so the first foreground check waits a full interval.
  const lastCheck = useRef(Date.now());

  useEffect(() => {
    if (!Updates.isEnabled) return; // dev client: JS comes from Metro

    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const now = Date.now();
      if (now - lastCheck.current < MIN_CHECK_INTERVAL_MS) return;
      lastCheck.current = now;

      Updates.checkForUpdateAsync()
        .then((result) => (result.isAvailable ? Updates.fetchUpdateAsync() : null))
        .catch(() => {
          // offline or update server unreachable — the next foreground retries
        });
    });
    return () => sub.remove();
  }, []);
}

/**
 * Short label for the JS bundle that is running, for the About screen:
 * `null` while the bundle shipped inside the APK/IPA is running, otherwise the
 * publish time and short id of the OTA update (support can match it against
 * `eas update:list`).
 */
export function getOtaUpdateLabel(): string | null {
  if (!Updates.isEnabled || Updates.isEmbeddedLaunch || !Updates.updateId) return null;
  const d = Updates.createdAt;
  const pad = (n: number) => String(n).padStart(2, '0');
  const when = d
    ? `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    : '';
  return `OTA ${when} · ${Updates.updateId.slice(0, 8)}`.replace('  ', ' ');
}
