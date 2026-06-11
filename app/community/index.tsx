/**
 * Community Energy — Member Dashboard
 */
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import {
  fetchMyCommunity,
  fetchMyCommunityStats,
  fetchMyCommunityBilling,
  fetchPublicCommunityInfo,
  applyToCommunity,
  CommunityInfo,
  MyCommunityStats,
} from '../../lib/v2Features';

export default function CommunityScreen() {
  const { colors } = useTheme();
  const { format } = useCurrency();
  const { user } = useAuth();
  const [community, setCommunity] = useState<CommunityInfo | null>(null);
  const [stats, setStats] = useState<MyCommunityStats | null>(null);
  const [billings, setBillings] = useState<any[]>([]);
  const [available, setAvailable] = useState<CommunityInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const myRes = await fetchMyCommunity();
    if (myRes.ok && myRes.data?.success) {
      setCommunity(myRes.data.community);
      if (myRes.data.community) {
        const [statsRes, billRes] = await Promise.all([
          fetchMyCommunityStats(),
          fetchMyCommunityBilling(),
        ]);
        if (statsRes.ok && statsRes.data?.success) setStats(statsRes.data.stats);
        if (billRes.ok && billRes.data?.success) setBillings(billRes.data.billings);
      } else {
        const pubRes = await fetchPublicCommunityInfo();
        if (pubRes.ok && pubRes.data?.success) setAvailable(pubRes.data.communities);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const doApply = async (c: CommunityInfo, applicationType: 'vyrobna' | 'spotreba') => {
    const email = user?.email;
    const fullName = user?.name || user?.email?.split('@')[0] || '';
    if (!email) {
      Alert.alert('Přihlášení', 'Pro vstup do komunity se nejprve přihlaste.');
      return;
    }
    const res = await applyToCommunity(c.id, { fullName, email, applicationType });
    if (res.ok && res.data?.success) {
      Alert.alert('Žádost odeslána', 'Po schválení uvidíte své statistiky zde.');
      await load();
    } else {
      Alert.alert('Chyba', res.data?.error || 'Žádost se nepodařilo odeslat');
    }
  };

  const apply = (c: CommunityInfo) => {
    // The apply endpoint needs a role; ask producer vs. consumer.
    Alert.alert(c.name, 'Jste výrobce energie, nebo spotřebitel?', [
      { text: 'Zrušit', style: 'cancel' },
      { text: 'Výrobna', onPress: () => doApply(c, 'vyrobna') },
      { text: 'Spotřeba', onPress: () => doApply(c, 'spotreba') },
    ]);
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={Colors.brand.accentGreen} />;

  return (
    <>
      <Stack.Screen options={{ title: 'Komunitní energetika', headerShown: true }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brand.accentGreen} />}
        >
          {community ? (
            <>
              <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                <Ionicons name="leaf" size={32} color={Colors.brand.accentGreen} />
                <Text style={[styles.heroName, { color: colors.text }]}>{community.name}</Text>
                <Text style={[styles.heroMeta, { color: colors.textMuted }]}>
                  {community.region ?? '–'} · {community.member_count} členů
                </Text>
              </View>

              {stats && (
                <View style={styles.statsGrid}>
                  <StatCard
                    icon="flash"
                    label="Můj podíl"
                    value={`${stats.my_share_percent.toFixed(1)} %`}
                    colors={colors}
                  />
                  <StatCard
                    icon="speedometer"
                    label="Spotřebováno"
                    value={`${stats.my_energy_kwh.toFixed(0)} kWh`}
                    colors={colors}
                  />
                  <StatCard
                    icon="cash"
                    label="Ušetřeno"
                    value={format(stats.my_savings_czk, { decimals: 0 })}
                    highlight
                    colors={colors}
                  />
                  <StatCard
                    icon="calendar"
                    label="Tento měsíc"
                    value={`${stats.current_month_energy_kwh.toFixed(1)} kWh`}
                    colors={colors}
                  />
                </View>
              )}

              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Vyúčtování</Text>
              {billings.length === 0 ? (
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                  <Text style={{ color: colors.textMuted }}>Zatím žádné vyúčtování</Text>
                </View>
              ) : (
                billings.map((b) => (
                  <View key={b.id} style={[styles.billRow, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.billPeriod, { color: colors.text }]}>{b.period_month}</Text>
                      <Text style={[styles.billSub, { color: colors.textMuted }]}>{b.energy_kwh.toFixed(1)} kWh</Text>
                    </View>
                    <Text style={[styles.billAmount, { color: Colors.brand.accentGreen }]}>{format(b.total_czk, { decimals: 0 })}</Text>
                  </View>
                ))
              )}
            </>
          ) : (
            <>
              <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                <Ionicons name="information-circle" size={28} color={Colors.brand.accentGreen} />
                <Text style={[styles.infoText, { color: colors.text }]}>
                  Komunitní energetika umožňuje sdílet vyrobenou energii mezi členy komunity a šetřit za elektřinu.
                </Text>
              </View>

              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Dostupné komunity</Text>
              {available.length === 0 ? (
                <Text style={{ color: colors.textMuted, padding: 14 }}>Žádné aktivní komunity</Text>
              ) : (
                available.map((c) => (
                  <TouchableOpacity key={c.id} onPress={() => apply(c)}>
                    <View style={[styles.communityCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.communityName, { color: colors.text }]}>{c.name}</Text>
                        <Text style={[styles.communityMeta, { color: colors.textMuted }]}>
                          {c.region ?? '–'} · {c.member_count} členů
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function StatCard({ icon, label, value, colors, highlight }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; colors: any; highlight?: boolean }) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      <Ionicons name={icon} size={18} color={highlight ? Colors.brand.accentGreen : colors.textMuted} />
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: highlight ? Colors.brand.accentGreen : colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Layout.spacing.lg, gap: 12, paddingBottom: 40 },
  heroCard: { padding: 20, borderRadius: 14, borderWidth: 1, alignItems: 'center', gap: 4 },
  heroName: { fontSize: 18, fontWeight: '700', marginTop: 8 },
  heroMeta: { fontSize: 13 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '48%', padding: 14, borderRadius: 12, borderWidth: 1, gap: 4 },
  statLabel: { fontSize: 11, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 18, fontWeight: '700' },
  sectionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 10 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1 },
  billRow: { flexDirection: 'row', padding: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  billPeriod: { fontSize: 14, fontWeight: '600' },
  billSub: { fontSize: 12, marginTop: 2 },
  billAmount: { fontSize: 16, fontWeight: '700' },
  infoCard: { padding: 16, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  infoText: { flex: 1, fontSize: 14, lineHeight: 20 },
  communityCard: { padding: 14, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
  communityName: { fontSize: 15, fontWeight: '600' },
  communityMeta: { fontSize: 12, marginTop: 2 },
});
