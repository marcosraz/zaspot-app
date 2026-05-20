/**
 * Achievements — Gamification
 */
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { fetchMyAchievements, Achievement } from '../../lib/v2Features';

export default function AchievementsScreen() {
  const { colors } = useTheme();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetchMyAchievements();
      if (res.ok && res.data?.success) setAchievements(res.data.achievements);
      setLoading(false);
    })();
  }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={Colors.brand.accentGreen} />;

  const earned = achievements.filter((a) => a.earned_at);
  const inProgress = achievements.filter((a) => !a.earned_at);

  return (
    <>
      <Stack.Screen options={{ title: 'Úspěchy', headerShown: true }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.summary, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Text style={[styles.summaryValue, { color: Colors.brand.accentGreen }]}>
              {earned.length}/{achievements.length}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Získané úspěchy</Text>
          </View>

          {earned.length > 0 && (
            <>
              <Text style={[styles.section, { color: colors.textSecondary }]}>Získané</Text>
              {earned.map((a) => <AchCard key={a.id} a={a} earned colors={colors} />)}
            </>
          )}

          {inProgress.length > 0 && (
            <>
              <Text style={[styles.section, { color: colors.textSecondary }]}>V průběhu</Text>
              {inProgress.map((a) => <AchCard key={a.id} a={a} colors={colors} />)}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function AchCard({ a, earned, colors }: { a: Achievement; earned?: boolean; colors: any }) {
  const progressPct = a.progress != null && a.target != null
    ? Math.min(100, (a.progress / a.target) * 100)
    : 0;

  return (
    <View style={[styles.achCard, { backgroundColor: colors.surface, borderColor: colors.borderLight, opacity: earned ? 1 : 0.7 }]}>
      <View style={[styles.achIcon, { backgroundColor: earned ? Colors.brand.accentGreen + '20' : colors.surfaceSecondary }]}>
        <Ionicons
          name={(a.icon as keyof typeof Ionicons.glyphMap) || 'trophy'}
          size={28}
          color={earned ? Colors.brand.accentGreen : colors.textMuted}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.achName, { color: colors.text }]}>{a.name}</Text>
        <Text style={[styles.achDesc, { color: colors.textMuted }]}>{a.description}</Text>
        {!earned && a.target != null && (
          <>
            <View style={[styles.progressTrack, { backgroundColor: colors.surfaceSecondary }]}>
              <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
            </View>
            <Text style={[styles.progressText, { color: colors.textMuted }]}>
              {a.progress ?? 0} / {a.target}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Layout.spacing.lg, gap: 10, paddingBottom: 40 },
  summary: { padding: 20, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  summaryValue: { fontSize: 36, fontWeight: '700' },
  summaryLabel: { fontSize: 12, marginTop: 4 },
  section: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 14 },
  achCard: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  achIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  achName: { fontSize: 15, fontWeight: '700' },
  achDesc: { fontSize: 12, marginTop: 2 },
  progressTrack: { height: 6, borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.brand.accentGreen },
  progressText: { fontSize: 11, marginTop: 2 },
});
