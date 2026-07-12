/**
 * Polling that respects screen focus AND app state.
 *
 * Every screen-level setInterval in the app used to keep firing when the
 * screen lost focus (stack screens stay mounted when you push deeper, tabs
 * stay mounted when you switch) and even when the app was backgrounded —
 * the station detail poll alone is 4 network requests every 5 seconds.
 *
 * This hook runs `callback` every `intervalMs` only while:
 *   - the owning screen is focused (expo-router useFocusEffect), and
 *   - the app is in the foreground (AppState === 'active'), and
 *   - `enabled` is true.
 *
 * On regaining focus/foreground with `immediate: true` the callback fires
 * right away, so returning users see fresh data without waiting a full tick.
 */
import { useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';

export function useFocusedInterval(
  callback: () => void,
  intervalMs: number,
  options: { enabled?: boolean; immediate?: boolean } = {}
) {
  const { enabled = true, immediate = false } = options;

  // Latest callback without re-arming the interval on every render.
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;

      let interval: ReturnType<typeof setInterval> | null = null;

      const start = () => {
        if (interval) return;
        if (immediate) cbRef.current();
        interval = setInterval(() => cbRef.current(), intervalMs);
      };
      const stop = () => {
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
      };

      if (AppState.currentState === 'active') start();
      const sub = AppState.addEventListener('change', (state) => {
        if (state === 'active') start();
        else stop();
      });

      return () => {
        stop();
        sub.remove();
      };
    }, [enabled, intervalMs, immediate])
  );
}
