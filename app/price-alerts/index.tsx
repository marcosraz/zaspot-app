/**
 * Price Alerts — Notify when spot price below/above threshold
 */
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useCurrency } from '../../context/CurrencyContext';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { fetchPriceAlerts, createPriceAlert, deletePriceAlert, PriceAlert } from '../../lib/v2Features';

export default function PriceAlertsScreen() {
  const { colors } = useTheme();
  const { format } = useCurrency();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState('5.0');
  const [direction, setDirection] = useState<'below' | 'above'>('below');

  const load = async () => {
    const res = await fetchPriceAlerts();
    if (res.ok && res.data?.success) setAlerts(res.data.alerts);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const onAdd = async () => {
    const t = parseFloat(threshold);
    if (isNaN(t) || t <= 0) {
      Alert.alert('Neplatná hodnota');
      return;
    }
    const res = await createPriceAlert({
      threshold_czk_kwh: t,
      direction,
      is_active: true,
      notify_via: 'push',
    });
    if (res.ok && res.data?.success) {
      setThreshold('5.0');
      load();
    }
  };

  const onDelete = (a: PriceAlert) => {
    Alert.alert('Smazat alert?', `${a.direction} ${format(a.threshold_czk_kwh, { perKwh: true })}`, [
      { text: 'Zrušit', style: 'cancel' },
      { text: 'Smazat', style: 'destructive', onPress: () => deletePriceAlert(a.id).then(load) },
    ]);
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={Colors.brand.accentGreen} />;

  return (
    <>
      <Stack.Screen options={{ title: 'Cenové alerty', headerShown: true }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Text style={[styles.title, { color: colors.text }]}>Nový alert</Text>
            <Text style={[styles.label, { color: colors.textMuted }]}>Spot cena (Kč/kWh)</Text>
            <TextInput
              value={threshold}
              onChangeText={setThreshold}
              keyboardType="numeric"
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            />
            <View style={styles.dirRow}>
              <DirBtn label="Když pod" selected={direction === 'below'} onPress={() => setDirection('below')} colors={colors} />
              <DirBtn label="Když nad" selected={direction === 'above'} onPress={() => setDirection('above')} colors={colors} />
            </View>
            <TouchableOpacity onPress={onAdd} style={[styles.btn, { backgroundColor: Colors.brand.accentGreen }]}>
              <Text style={styles.btnText}>Vytvořit alert</Text>
            </TouchableOpacity>
          </View>

          {alerts.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textMuted }]}>Žádné aktivní alerty</Text>
          ) : (
            alerts.map((a) => (
              <View key={a.id} style={[styles.alertRow, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                <Ionicons
                  name={a.direction === 'below' ? 'trending-down' : 'trending-up'}
                  size={22}
                  color={Colors.brand.accentGreen}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.alertLabel, { color: colors.text }]}>
                    {a.direction === 'below' ? 'Když cena pod' : 'Když cena nad'} {format(a.threshold_czk_kwh, { perKwh: true })}
                  </Text>
                  <Text style={[styles.alertSub, { color: colors.textMuted }]}>
                    via {a.notify_via}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => onDelete(a)}>
                  <Ionicons name="trash" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function DirBtn({ label, selected, onPress, colors }: { label: string; selected: boolean; onPress: () => void; colors: any }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.dirBtn,
        { borderColor: selected ? Colors.brand.accentGreen : colors.border, backgroundColor: selected ? Colors.brand.accentGreen + '15' : 'transparent' },
      ]}
    >
      <Text style={{ color: selected ? Colors.brand.accentGreen : colors.text, fontWeight: '600' }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Layout.spacing.lg, gap: 10, paddingBottom: 40 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  label: { fontSize: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  dirRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  dirBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  btn: { padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  alertLabel: { fontSize: 14, fontWeight: '600' },
  alertSub: { fontSize: 12, marginTop: 2 },
  empty: { textAlign: 'center', padding: 30 },
});
