/**
 * ActiveChargingWidget - Shows active charging session on home screen
 * Polls for updates every 10 seconds, displays live energy/cost/duration.
 *
 * Visual: blue→teal gradient hero card with a pulsing bolt ring (reanimated)
 * and a spring entrance when a session appears.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useAuth } from '../context/AuthContext';
import { fetchUserTransactions, UserTransaction, formatDuration, formatEnergy } from '../lib/charging';
import { Layout } from '../constants/layout';
import PressableScale from './ui/PressableScale';

const POLL_INTERVAL = 10_000; // 10 seconds

export default function ActiveChargingWidget() {
  const { user } = useAuth();
  const router = useRouter();
  const [session, setSession] = useState<UserTransaction | null>(null);
  const [elapsed, setElapsed] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pulsing ring around the bolt — scale + fade out, looped.
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.6);

  const fetchActiveSession = useCallback(async () => {
    if (!user) {
      setSession(null);
      return;
    }
    try {
      const { activeTransaction } = await fetchUserTransactions('active', 1);
      setSession(activeTransaction);
    } catch {
      // Silently fail — widget is non-critical
    }
  }, [user]);

  // Poll for active sessions
  useEffect(() => {
    fetchActiveSession();
    pollRef.current = setInterval(fetchActiveSession, POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchActiveSession]);

  // Live elapsed time ticker
  useEffect(() => {
    if (!session) return;

    const updateElapsed = () => {
      // Postgres returns "YYYY-MM-DD HH:MM:SS+00" (space, no 'T'); Hermes's Date
      // parser returns NaN for that → duration showed "—". Normalize to ISO.
      const start = new Date(session.startTimestamp.replace(' ', 'T')).getTime();
      const now = Date.now();
      const mins = (now - start) / 60_000;
      setElapsed(formatDuration(mins));
    };

    updateElapsed();
    tickRef.current = setInterval(updateElapsed, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [session]);

  // Start the pulse loop while a session is active
  useEffect(() => {
    if (!session) return;
    ringScale.value = withRepeat(
      withTiming(1.8, { duration: 1600, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
    ringOpacity.value = withRepeat(
      withTiming(0, { duration: 1600, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
  }, [session, ringScale, ringOpacity]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  if (!session) return null;

  // During an active session the top-level energyKwh/totalCostCzk are NULL (only
  // set at stop). Use the live fields the server now provides: live.energyKwh and
  // accumulatedCostCzk (the running cost, updated every MeterValue).
  const energyKwh = session.live?.energyKwh ?? session.energyKwh ?? 0;
  // accumulated_cost_czk / total_cost_czk are NET; display gross (× 1.21 DPH) to
  // match the wallet deduction and every other cost surface.
  const costCzk = (session.accumulatedCostCzk ?? session.totalCostCzk ?? 0) * 1.21;
  const soc = session.live?.socPercent;

  return (
    <Animated.View entering={FadeInDown.springify().damping(16)}>
      <PressableScale
        style={styles.container}
        onPress={() => router.push(`/station/${session.chargePointId}`)}
        accessibilityLabel={`Aktivní nabíjení: ${session.chargePointName}`}
      >
        <LinearGradient
          colors={['#2563EB', '#0D9488']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.boltWrap}>
                <Animated.View style={[styles.boltRing, ringStyle]} />
                <View style={styles.boltCircle}>
                  <Ionicons name="flash" size={14} color="#FFFFFF" />
                </View>
              </View>
              <Text style={styles.headerTitle}>Nabíjení aktivní</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
          </View>

          {/* Station name */}
          <Text style={styles.stationName} numberOfLines={1}>
            {session.chargePointName}
          </Text>

          {/* Stats grid */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="flash" size={16} color="rgba(255,255,255,0.7)" />
              <Text style={styles.statValue}>{formatEnergy(energyKwh)}</Text>
              <Text style={styles.statLabel}>kWh</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Ionicons name="wallet-outline" size={16} color="rgba(255,255,255,0.7)" />
              <Text style={styles.statValue}>{costCzk.toFixed(1)}</Text>
              <Text style={styles.statLabel}>CZK</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.7)" />
              <Text style={styles.statValue}>{elapsed}</Text>
              <Text style={styles.statLabel}>doba</Text>
            </View>

            {/* Battery SoC — only when the car/charger actually reports it over OCPP */}
            {soc != null && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Ionicons name="battery-half-outline" size={16} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.statValue}>{soc}%</Text>
                  <Text style={styles.statLabel}>baterie</Text>
                </View>
              </>
            )}
          </View>
        </LinearGradient>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    marginBottom: Layout.spacing.lg,
    elevation: 6,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  gradient: {
    borderRadius: 20,
    padding: Layout.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
  },
  boltWrap: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boltRing: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#4ADE80',
  },
  boltCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: Layout.fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stationName: {
    color: '#FFFFFF',
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    marginBottom: Layout.spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: Layout.fontSize.lg,
    fontWeight: '700',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: Layout.fontSize.xs,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
});
