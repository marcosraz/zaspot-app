/**
 * EMP Roaming Stations — Hubject Network (500k+ across Europe)
 */
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import * as Location from 'expo-location';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { fetchEmpStations, EmpStation } from '../../lib/v2Features';

export default function EmpStationsScreen() {
  const { colors } = useTheme();
  const [stations, setStations] = useState<EmpStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
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
  }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={Colors.brand.accentGreen} />;

  return (
    <>
      <Stack.Screen options={{ title: 'eRoaming (Hubject)', headerShown: true }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.infoCard, { backgroundColor: Colors.brand.accentGreen + '15', borderColor: Colors.brand.accentGreen }]}>
            <Ionicons name="globe" size={20} color={Colors.brand.accentGreen} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              Načteno {stations.length} stanic z evropské Hubject sítě.
              Plaťte s vaším ZAspot kreditem.
            </Text>
          </View>

          {error && <Text style={{ color: colors.error, padding: 14 }}>{error}</Text>}

          {stations.map((s) => (
            <View key={s.evse_id} style={[styles.stationCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
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
            </View>
          ))}
        </ScrollView>
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
});
