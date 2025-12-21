/**
 * Home Screen - Dashboard with current price and quick actions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';

// Mock data - will be replaced with API call
const mockCurrentPrice = {
  price: 2.45,
  trend: 'falling' as const,
  average: 3.12,
  lowestToday: 1.85,
  highestToday: 4.20,
  bestTimeStart: '14:00',
  bestTimeEnd: '16:00',
};

interface QuickAction {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
  color: string;
}

export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(mockCurrentPrice);

  const quickActions: QuickAction[] = [
    { icon: 'map', label: t.home.findStation, route: '/map', color: Colors.brand.accentGreen },
    { icon: 'navigate', label: t.home.planRoute, route: '/route', color: '#3B82F6' },
    { icon: 'flash', label: t.home.spotPrices, route: '/spot-prices', color: '#F59E0B' },
    { icon: 'calendar', label: t.home.myReservations, route: '/profile', color: '#8B5CF6' },
  ];

  const onRefresh = async () => {
    setRefreshing(true);
    // TODO: Fetch fresh data from API
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getPriceColor = (price: number) => {
    if (price < 2) return Colors.spotPrice.veryLow;
    if (price < 3) return Colors.spotPrice.low;
    if (price < 4) return Colors.spotPrice.medium;
    if (price < 5) return Colors.spotPrice.high;
    return Colors.spotPrice.veryHigh;
  };

  const getTrendIcon = (trend: string): keyof typeof Ionicons.glyphMap => {
    switch (trend) {
      case 'rising': return 'trending-up';
      case 'falling': return 'trending-down';
      default: return 'remove';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.brand.accentGreen}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>
              {t.home.welcome}
            </Text>
            <Text style={[styles.appName, { color: colors.text }]}>
              ZAspot
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.themeToggle, { backgroundColor: colors.surface }]}
            onPress={() => router.push('/profile')}
          >
            <Ionicons name="settings-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Current Price Card */}
        <View style={[styles.priceCard, { backgroundColor: colors.surface }]}>
          <View style={styles.priceHeader}>
            <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>
              {t.home.priceNow}
            </Text>
            <View style={styles.trendContainer}>
              <Ionicons
                name={getTrendIcon(currentPrice.trend)}
                size={20}
                color={currentPrice.trend === 'falling' ? Colors.spotPrice.veryLow : Colors.spotPrice.high}
              />
              <Text style={[
                styles.trendText,
                { color: currentPrice.trend === 'falling' ? Colors.spotPrice.veryLow : Colors.spotPrice.high }
              ]}>
                {t.spotPrices[currentPrice.trend as keyof typeof t.spotPrices]}
              </Text>
            </View>
          </View>

          <View style={styles.priceMain}>
            <Text style={[styles.priceValue, { color: getPriceColor(currentPrice.price) }]}>
              {currentPrice.price.toFixed(2)}
            </Text>
            <Text style={[styles.priceUnit, { color: colors.textSecondary }]}>
              {t.home.perKwh}
            </Text>
          </View>

          <View style={styles.priceStats}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                {t.spotPrices.lowest}
              </Text>
              <Text style={[styles.statValue, { color: Colors.spotPrice.veryLow }]}>
                {currentPrice.lowestToday.toFixed(2)}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                {t.spotPrices.average}
              </Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {currentPrice.average.toFixed(2)}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                {t.spotPrices.highest}
              </Text>
              <Text style={[styles.statValue, { color: Colors.spotPrice.high }]}>
                {currentPrice.highestToday.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Best Time to Charge */}
          <View style={[styles.bestTimeContainer, { backgroundColor: isDark ? colors.surfaceSecondary : '#ECFDF5' }]}>
            <Ionicons name="time-outline" size={20} color={Colors.brand.accentGreen} />
            <Text style={[styles.bestTimeText, { color: Colors.brand.accentGreen }]}>
              {t.spotPrices.bestTime}: {currentPrice.bestTimeStart} - {currentPrice.bestTimeEnd}
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t.home.quickActions}
          </Text>
        </View>

        <View style={styles.quickActionsGrid}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.quickActionCard, { backgroundColor: colors.surface }]}
              onPress={() => router.push(action.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}20` }]}>
                <Ionicons name={action.icon} size={28} color={action.color} />
              </View>
              <Text style={[styles.quickActionLabel, { color: colors.text }]}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Nearby Stations Preview */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t.home.nearbyStations}
          </Text>
          <TouchableOpacity onPress={() => router.push('/map')}>
            <Text style={[styles.viewAllText, { color: Colors.brand.accentGreen }]}>
              {t.home.viewAll}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.nearbyCard, { backgroundColor: colors.surface }]}>
          <View style={styles.nearbyContent}>
            <Ionicons name="location" size={40} color={Colors.brand.accentGreen} />
            <Text style={[styles.nearbyText, { color: colors.textSecondary }]}>
              Aktiviere GPS um Stationen in deiner Nähe zu sehen
            </Text>
            <TouchableOpacity
              style={styles.enableLocationBtn}
              onPress={() => router.push('/map')}
            >
              <Text style={styles.enableLocationText}>
                {t.home.findStation}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Layout.spacing.md,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.lg,
  },
  welcomeText: {
    fontSize: Layout.fontSize.sm,
    marginBottom: 2,
  },
  appName: {
    fontSize: Layout.fontSize.xxl,
    fontWeight: 'bold',
  },
  themeToggle: {
    width: 44,
    height: 44,
    borderRadius: Layout.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  priceCard: {
    borderRadius: Layout.borderRadius.xl,
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  priceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.sm,
  },
  priceLabel: {
    fontSize: Layout.fontSize.md,
    fontWeight: '500',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
  },
  priceMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Layout.spacing.lg,
  },
  priceValue: {
    fontSize: 56,
    fontWeight: 'bold',
    letterSpacing: -2,
  },
  priceUnit: {
    fontSize: Layout.fontSize.lg,
    marginLeft: Layout.spacing.sm,
  },
  priceStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Layout.spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: Layout.spacing.sm,
  },
  statLabel: {
    fontSize: Layout.fontSize.xs,
    marginBottom: 4,
  },
  statValue: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
  },
  bestTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.lg,
    gap: Layout.spacing.sm,
  },
  bestTimeText: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.md,
  },
  sectionTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
  },
  viewAllText: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.md,
    marginBottom: Layout.spacing.lg,
  },
  quickActionCard: {
    width: '47%',
    padding: Layout.spacing.lg,
    borderRadius: Layout.borderRadius.xl,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: Layout.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Layout.spacing.sm,
  },
  quickActionLabel: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  nearbyCard: {
    borderRadius: Layout.borderRadius.xl,
    padding: Layout.spacing.xl,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  nearbyContent: {
    alignItems: 'center',
    gap: Layout.spacing.md,
  },
  nearbyText: {
    fontSize: Layout.fontSize.md,
    textAlign: 'center',
  },
  enableLocationBtn: {
    backgroundColor: Colors.brand.accentGreen,
    paddingHorizontal: Layout.spacing.xl,
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.borderRadius.full,
  },
  enableLocationText: {
    color: '#FFFFFF',
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
  },
});
