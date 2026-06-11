/**
 * ActiveChargingWidget - Shows active charging session on home screen
 * Polls for updates every 10 seconds, displays live energy/cost/duration
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { fetchUserTransactions, UserTransaction, formatDuration, formatEnergy } from '../lib/charging';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

const POLL_INTERVAL = 10_000; // 10 seconds

export default function ActiveChargingWidget() {
  const { user } = useAuth();
  const router = useRouter();
  const [session, setSession] = useState<UserTransaction | null>(null);
  const [elapsed, setElapsed] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Pulsing animation for the live dot
  useEffect(() => {
    if (!session) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [session, pulseAnim]);

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
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.85}
      onPress={() => router.push(`/station/${session.chargePointId}`)}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
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
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Layout.borderRadius.xl,
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.lg,
    backgroundColor: '#2563EB',
    elevation: 4,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
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
