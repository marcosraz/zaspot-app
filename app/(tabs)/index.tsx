/**
 * Home Screen - Dashboard with real-time spot prices and nearby stations
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useFavorites } from '../../context/FavoritesContext';
import { useNotifications } from '../../context/NotificationsContext';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { fetchSpotPrices, getCurrentSlot, getPriceColor, DailyPrices } from '../../lib/spotPrices';
import { fetchNearbyStations, fetchStationsByIds, ChargingStation } from '../../lib/supabase';
import FavoriteButton from '../../components/FavoriteButton';

interface QuickAction {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
  color: string;
}

export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { favorites, isLoaded: favoritesLoaded } = useFavorites();
  const { checkPriceAndNotify } = useNotifications();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [priceData, setPriceData] = useState<DailyPrices | null>(null);
  const [nearbyStations, setNearbyStations] = useState<ChargingStation[]>([]);
  const [favoriteStations, setFavoriteStations] = useState<ChargingStation[]>([]);
  const [locationError, setLocationError] = useState<string | null>(null);

  const quickActions: QuickAction[] = [
    { icon: 'map', label: t.home.findStation, route: '/map', color: Colors.brand.accentGreen },
    { icon: 'navigate', label: t.home.planRoute, route: '/route', color: '#3B82F6' },
    { icon: 'flash', label: t.home.spotPrices, route: '/spot-prices', color: '#F59E0B' },
    { icon: 'calendar', label: t.home.myReservations, route: '/profile', color: '#8B5CF6' },
  ];

  const loadData = useCallback(async () => {
    try {
      // Load spot prices
      const prices = await fetchSpotPrices();
      if (prices) {
        setPriceData(prices);

        // Check if current price triggers any notification alerts
        const currentHour = Math.floor(getCurrentSlot() / 4);
        const currentPrice = prices.prices[currentHour]?.priceKwh;
        if (currentPrice) {
          checkPriceAndNotify(currentPrice);
        }
      }

      // Try to get location and nearby stations
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const stations = await fetchNearbyStations(
          location.coords.latitude,
          location.coords.longitude,
          20 // 20km radius
        );
        setNearbyStations(stations.slice(0, 3)); // Show top 3
        setLocationError(null);
      } else {
        setLocationError('Přístup k poloze není povolen');
      }
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load favorite stations when favorites change
  useEffect(() => {
    if (favoritesLoaded && favorites.length > 0) {
      fetchStationsByIds(favorites.slice(0, 3)).then(setFavoriteStations);
    } else {
      setFavoriteStations([]);
    }
  }, [favorites, favoritesLoaded]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Calculate current price and trend
  const currentSlot = getCurrentSlot();
  const currentHour = Math.floor(currentSlot / 4);
  const currentPrice = priceData?.prices[currentHour]?.priceKwh || 0;
  const prevPrice = priceData?.prices[Math.max(0, currentHour - 1)]?.priceKwh || currentPrice;
  const trend = currentPrice < prevPrice ? 'falling' : currentPrice > prevPrice ? 'rising' : 'stable';

  // Find best time
  const bestSlot = priceData?.stats.lowestSlot || 0;
  const bestTime = priceData?.prices[bestSlot]?.time || '--:--';

  const getTrendIcon = (t: string): keyof typeof Ionicons.glyphMap => {
    switch (t) {
      case 'rising': return 'trending-up';
      case 'falling': return 'trending-down';
      default: return 'remove';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brand.accentGreen} />
        </View>
      </SafeAreaView>
    );
  }

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
            <View style={styles.priceHeaderLeft}>
              <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>
                {t.home.priceNow}
              </Text>
              <View style={[styles.liveBadge, { backgroundColor: Colors.brand.accentGreen + '20' }]}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>
            <View style={styles.trendContainer}>
              <Ionicons
                name={getTrendIcon(trend)}
                size={20}
                color={trend === 'falling' ? Colors.spotPrice.veryLow : trend === 'rising' ? Colors.spotPrice.high : colors.textMuted}
              />
              <Text style={[
                styles.trendText,
                { color: trend === 'falling' ? Colors.spotPrice.veryLow : trend === 'rising' ? Colors.spotPrice.high : colors.textMuted }
              ]}>
                {trend === 'falling' ? 'Klesá' : trend === 'rising' ? 'Stoupá' : 'Stabilní'}
              </Text>
            </View>
          </View>

          <View style={styles.priceMain}>
            <Text style={[styles.priceValue, { color: getPriceColor(currentPrice) }]}>
              {currentPrice.toFixed(2)}
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
                {(priceData?.stats.lowest || 0).toFixed(2)}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                {t.spotPrices.average}
              </Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {(priceData?.stats.average || 0).toFixed(2)}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                {t.spotPrices.highest}
              </Text>
              <Text style={[styles.statValue, { color: Colors.spotPrice.high }]}>
                {(priceData?.stats.highest || 0).toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Best Time to Charge */}
          <TouchableOpacity
            style={[styles.bestTimeContainer, { backgroundColor: isDark ? colors.surfaceSecondary : '#ECFDF5' }]}
            onPress={() => router.push('/spot-prices')}
          >
            <Ionicons name="time-outline" size={20} color={Colors.brand.accentGreen} />
            <Text style={[styles.bestTimeText, { color: Colors.brand.accentGreen }]}>
              {t.spotPrices.bestTime}: {bestTime}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.brand.accentGreen} />
          </TouchableOpacity>
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

        {/* Favorite Stations */}
        {favoriteStations.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                <Ionicons name="heart" size={18} color={Colors.brand.accentGreen} /> Oblíbené stanice
              </Text>
              {favorites.length > 3 && (
                <TouchableOpacity onPress={() => router.push('/map')}>
                  <Text style={[styles.viewAllText, { color: Colors.brand.accentGreen }]}>
                    +{favorites.length - 3}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.stationsList}>
              {favoriteStations.map((station) => (
                <TouchableOpacity
                  key={station.id}
                  style={[styles.stationCard, { backgroundColor: colors.surface }]}
                  onPress={() => router.push('/map')}
                >
                  <View style={[
                    styles.stationTypeIcon,
                    { backgroundColor: station.type === 'DC' ? '#EF4444' : Colors.brand.accentGreen }
                  ]}>
                    <Ionicons name="flash" size={16} color="#FFFFFF" />
                  </View>
                  <View style={styles.stationInfo}>
                    <Text style={[styles.stationName, { color: colors.text }]} numberOfLines={1}>
                      {station.name}
                    </Text>
                    <Text style={[styles.stationAddress, { color: colors.textSecondary }]} numberOfLines={1}>
                      {station.address}
                    </Text>
                  </View>
                  <View style={styles.stationMeta}>
                    <FavoriteButton stationId={station.id} size={20} />
                    <View style={[
                      styles.typeBadge,
                      { backgroundColor: station.type === 'DC' ? '#FEE2E2' : '#ECFDF5' }
                    ]}>
                      <Text style={[
                        styles.typeBadgeText,
                        { color: station.type === 'DC' ? '#EF4444' : Colors.brand.accentGreen }
                      ]}>
                        {station.power_kw} kW
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Nearby Stations */}
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

        {nearbyStations.length > 0 ? (
          <View style={styles.stationsList}>
            {nearbyStations.map((station) => (
              <TouchableOpacity
                key={station.id}
                style={[styles.stationCard, { backgroundColor: colors.surface }]}
                onPress={() => router.push('/map')}
              >
                <View style={[
                  styles.stationTypeIcon,
                  { backgroundColor: station.type === 'DC' ? '#EF4444' : Colors.brand.accentGreen }
                ]}>
                  <Ionicons name="flash" size={16} color="#FFFFFF" />
                </View>
                <View style={styles.stationInfo}>
                  <Text style={[styles.stationName, { color: colors.text }]} numberOfLines={1}>
                    {station.name}
                  </Text>
                  <Text style={[styles.stationAddress, { color: colors.textSecondary }]} numberOfLines={1}>
                    {station.address}
                  </Text>
                </View>
                <View style={styles.stationMeta}>
                  <FavoriteButton stationId={station.id} size={20} />
                  <View style={[
                    styles.typeBadge,
                    { backgroundColor: station.type === 'DC' ? '#FEE2E2' : '#ECFDF5' }
                  ]}>
                    <Text style={[
                      styles.typeBadgeText,
                      { color: station.type === 'DC' ? '#EF4444' : Colors.brand.accentGreen }
                    ]}>
                      {station.type} {station.power_kw} kW
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={[styles.nearbyCard, { backgroundColor: colors.surface }]}>
            <View style={styles.nearbyContent}>
              <Ionicons name="location" size={40} color={Colors.brand.accentGreen} />
              <Text style={[styles.nearbyText, { color: colors.textSecondary }]}>
                {locationError || 'Aktivujte GPS pro zobrazení stanic poblíž'}
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
        )}

        {/* Data source info */}
        <View style={styles.dataSource}>
          <Text style={[styles.dataSourceText, { color: colors.textMuted }]}>
            Ceny: OTE-CR • Aktualizováno: {new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
          </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  priceHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
  },
  priceLabel: {
    fontSize: Layout.fontSize.md,
    fontWeight: '500',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Layout.borderRadius.full,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.brand.accentGreen,
  },
  liveText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.brand.accentGreen,
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
    height: 30,
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
    flex: 1,
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
  stationsList: {
    gap: Layout.spacing.sm,
    marginBottom: Layout.spacing.md,
  },
  stationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.lg,
    gap: Layout.spacing.md,
  },
  stationTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: Layout.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stationInfo: {
    flex: 1,
  },
  stationName: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  stationAddress: {
    fontSize: Layout.fontSize.sm,
  },
  stationMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  stationPower: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Layout.borderRadius.sm,
  },
  typeBadgeText: {
    fontSize: Layout.fontSize.xs,
    fontWeight: '600',
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
  dataSource: {
    marginTop: Layout.spacing.md,
    alignItems: 'center',
  },
  dataSourceText: {
    fontSize: Layout.fontSize.xs,
  },
});
