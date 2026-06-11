/**
 * EMP Roaming Stations — Hubject Network (500k+ across Europe)
 *
 * Customers can start/stop charging at foreign stations here. The chain:
 * empRemoteStart → /api/emp/remote-start → OICP adapter → Hubject → CPO.
 * While a session runs, a status banner is shown and polled every 10s.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import * as Location from 'expo-location';
import PressableScale from '../../components/ui/PressableScale';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import {
  fetchEmpStations,
  EmpStation,
  empRemoteStart,
  empRemoteStop,
  fetchActiveEmpSession,
  EmpRoamingSession,
} from '../../lib/v2Features';

const SESSION_POLL_MS = 10_000;

const STATUS_LABEL: Record<string, string> = {
  pending: 'Čeká na potvrzení…',
  authorizing: 'Autorizace u operátora…',
  active: 'Nabíjení probíhá',
};

export default function EmpStationsScreen() {
  const { colors } = useTheme();
  const [stations, setStations] = useState<EmpStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active roaming session (status banner)
  const [session, setSession] = useState<EmpRoamingSession | null>(null);
  const [stopping, setStopping] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start flow (confirm modal)
  const [selected, setSelected] = useState<EmpStation | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    const res = await fetchActiveEmpSession();
    if (res.ok && res.data?.success) {
      setSession(res.data.session);
    }
  }, []);

  // Poll the session while one is running so the banner tracks
  // authorizing → active → gone (completed).
  useEffect(() => {
    if (session && !pollRef.current) {
      pollRef.current = setInterval(refreshSession, SESSION_POLL_MS);
    }
    if (!session && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [session, refreshSession]);

  useEffect(() => {
    (async () => {
      refreshSession();
      const { status } = await Location.requestForegroundPermissionsAsync();
      let params = {};
      if (status === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          params = { lat: loc.coords.latitude, lng: loc.coords.longitude, radius_km: 50 };
        } catch {
          // no location → fetch generic list
        }
      }
      const res = await fetchEmpStations(params);
      if (res.ok && res.data?.success) {
        setStations(res.data.stations);
      } else {
        setError('Nepodařilo se načíst EMP stanice');
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = async () => {
    if (!selected || starting) return;
    setStarting(true);
    setStartError(null);
    const res = await empRemoteStart(selected.evse_id);
    setStarting(false);
    if (res.ok && res.data?.success) {
      setSelected(null);
      await refreshSession();
    } else if (res.status === 402) {
      const min = res.data?.min_balance_czk ?? 200;
      const bal = res.data?.balance_czk;
      setStartError(
        `Nedostatečný kredit. Pro roaming je potřeba alespoň ${min} Kč` +
          (bal != null ? ` (máte ${bal.toFixed(0)} Kč).` : '.')
      );
    } else if (res.status === 409) {
      setStartError('Už máte aktivní roamingové nabíjení.');
      refreshSession();
    } else {
      setStartError('Operátor stanice požadavek odmítl. Zkuste to znovu nebo vyberte jinou stanici.');
    }
  };

  const handleStop = async () => {
    if (stopping) return;
    setStopping(true);
    const res = await empRemoteStop(session?.hubject_session_id ?? undefined);
    setStopping(false);
    if (res.ok && res.data?.success) {
      setSession(null);
      refreshSession();
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={Colors.brand.accentGreen} />;

  return (
    <>
      <Stack.Screen options={{ title: 'eRoaming (Hubject)', headerShown: true }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Active session banner */}
          {session && (
            <Animated.View
              entering={FadeInUp.springify().damping(15)}
              style={[styles.sessionBanner, { backgroundColor: Colors.brand.accentGreen }]}
            >
              <View style={styles.sessionHeader}>
                <View style={styles.sessionPulse}>
                  <Ionicons name="flash" size={18} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sessionTitle} numberOfLines={1}>
                    {session.station_name || session.evse_id}
                  </Text>
                  <Text style={styles.sessionStatus}>
                    {STATUS_LABEL[session.session_status] || session.session_status}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.stopButton}
                onPress={handleStop}
                disabled={stopping}
                activeOpacity={0.8}
              >
                {stopping ? (
                  <ActivityIndicator size="small" color={Colors.brand.accentGreen} />
                ) : (
                  <>
                    <Ionicons name="stop-circle" size={18} color="#DC2626" />
                    <Text style={styles.stopButtonText}>Ukončit nabíjení</Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          )}

          <View style={[styles.infoCard, { backgroundColor: Colors.brand.accentGreen + '15', borderColor: Colors.brand.accentGreen }]}>
            <Ionicons name="globe" size={20} color={Colors.brand.accentGreen} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              Načteno {stations.length} stanic z evropské Hubject sítě.
              Plaťte s vaším ZAspot kreditem.
            </Text>
          </View>

          {error && <Text style={{ color: colors.error, padding: 14 }}>{error}</Text>}

          {stations.map((s, idx) => {
            const startable = s.status === 'available' && !session;
            return (
              <Animated.View
                key={s.evse_id}
                entering={FadeInDown.delay(Math.min(idx, 8) * 50).springify().damping(16)}
              >
              <PressableScale
                style={[styles.stationCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
                onPress={() => {
                  if (startable) {
                    setStartError(null);
                    setSelected(s);
                  }
                }}
                scaleTo={startable ? 0.97 : 1}
                haptic={startable}
              >
                <View style={styles.headerRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.stationName, { color: colors.text }]} numberOfLines={1}>{s.name}</Text>
                    <Text style={[styles.operator, { color: colors.textMuted }]}>{s.operator}</Text>
                    <Text style={[styles.addr, { color: colors.textMuted }]} numberOfLines={2}>{s.address}</Text>
                  </View>
                  <View style={[styles.statusDot, { backgroundColor: s.status === 'available' ? Colors.brand.accentGreen : s.status === 'occupied' ? colors.warning : colors.textMuted }]} />
                </View>

                <View style={styles.specsRow}>
                  <Spec icon="flash" label={`${s.max_power_kw} kW`} colors={colors} />
                  <Spec icon="hardware-chip" label={s.connectors.map((c) => c.type).join(', ') || '–'} colors={colors} />
                  {s.price_per_kwh != null && (
                    <Spec icon="cash" label={`${s.price_per_kwh.toFixed(2)} €/kWh`} colors={colors} highlight />
                  )}
                </View>

                {startable && (
                  <View style={styles.startHint}>
                    <Ionicons name="play-circle" size={16} color={Colors.brand.accentGreen} />
                    <Text style={[styles.startHintText, { color: Colors.brand.accentGreen }]}>
                      Klepněte pro nabíjení
                    </Text>
                  </View>
                )}
              </PressableScale>
              </Animated.View>
            );
          })}
        </ScrollView>

        {/* Start confirmation modal */}
        <Modal
          visible={selected !== null}
          transparent
          animationType="slide"
          onRequestClose={() => !starting && setSelected(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
              <View style={styles.modalHandle} />
              <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={2}>
                {selected?.name}
              </Text>
              <Text style={[styles.modalOperator, { color: colors.textMuted }]}>
                {selected?.operator}
              </Text>

              <View style={[styles.modalPriceRow, { borderColor: colors.borderLight }]}>
                <View style={styles.modalPriceItem}>
                  <Text style={[styles.modalPriceLabel, { color: colors.textMuted }]}>Výkon</Text>
                  <Text style={[styles.modalPriceValue, { color: colors.text }]}>
                    {selected?.max_power_kw ?? '–'} kW
                  </Text>
                </View>
                <View style={styles.modalPriceItem}>
                  <Text style={[styles.modalPriceLabel, { color: colors.textMuted }]}>Cena operátora</Text>
                  <Text style={[styles.modalPriceValue, { color: Colors.brand.accentGreen }]}>
                    {selected?.price_per_kwh != null ? `${selected.price_per_kwh.toFixed(2)} €/kWh` : 'dle CDR'}
                  </Text>
                </View>
              </View>

              <Text style={[styles.modalNote, { color: colors.textMuted }]}>
                Částka se odečte z vašeho ZAspot kreditu po ukončení nabíjení
                (cena operátora + malá přirážka za roaming). Minimální kredit: 200 Kč.
              </Text>

              {startError && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                  <Text style={styles.errorBoxText}>{startError}</Text>
                </View>
              )}

              <PressableScale
                style={[styles.primaryButton, { backgroundColor: Colors.brand.accentGreen, opacity: starting ? 0.7 : 1 }]}
                onPress={handleStart}
                disabled={starting}
                scaleTo={0.96}
              >
                {starting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="flash" size={18} color="#fff" />
                    <Text style={styles.primaryButtonText}>Zahájit nabíjení</Text>
                  </>
                )}
              </PressableScale>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setSelected(null)}
                disabled={starting}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textMuted }]}>Zrušit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}

function Spec({ icon, label, colors, highlight }: { icon: keyof typeof Ionicons.glyphMap; label: string; colors: any; highlight?: boolean }) {
  return (
    <View style={styles.spec}>
      <Ionicons name={icon} size={14} color={highlight ? Colors.brand.accentGreen : colors.textMuted} />
      <Text style={{ color: highlight ? Colors.brand.accentGreen : colors.text, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Layout.spacing.lg, gap: 10, paddingBottom: 40 },
  infoCard: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  stationCard: { padding: 14, borderRadius: 12, borderWidth: 1 },
  headerRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stationName: { fontSize: 15, fontWeight: '700' },
  operator: { fontSize: 12, marginTop: 2 },
  addr: { fontSize: 12, marginTop: 2 },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  specsRow: { flexDirection: 'row', gap: 14, marginTop: 12, flexWrap: 'wrap' },
  spec: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  startHint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  startHintText: { fontSize: 12, fontWeight: '700' },

  // Active session banner
  sessionBanner: { borderRadius: 14, padding: 14, gap: 12 },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sessionPulse: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  sessionTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  sessionStatus: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 2 },
  stopButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 10, paddingVertical: 10,
  },
  stopButtonText: { color: '#DC2626', fontSize: 14, fontWeight: '700' },

  // Start confirmation modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: Layout.spacing.lg, paddingBottom: 34,
  },
  modalHandle: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.4)', marginBottom: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalOperator: { fontSize: 13, marginTop: 2, marginBottom: 14 },
  modalPriceRow: {
    flexDirection: 'row', borderWidth: 1, borderRadius: 12, padding: 12, gap: 12,
  },
  modalPriceItem: { flex: 1 },
  modalPriceLabel: { fontSize: 11, marginBottom: 2 },
  modalPriceValue: { fontSize: 16, fontWeight: '700' },
  modalNote: { fontSize: 12, lineHeight: 17, marginTop: 12 },
  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(220,38,38,0.1)', borderRadius: 10, padding: 10, marginTop: 12,
  },
  errorBoxText: { flex: 1, color: '#DC2626', fontSize: 12, lineHeight: 16 },
  primaryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 12, paddingVertical: 14, marginTop: 16,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelButton: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  cancelButtonText: { fontSize: 14, fontWeight: '600' },
});
