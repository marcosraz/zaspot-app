/**
 * Spot Prices Screen - Real electricity prices from OTE API
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { useNotifications } from '../../context/NotificationsContext';
import {
  fetchSpotPrices,
  fetchSpotPricesRange,
  getCurrentSlot,
  getPriceColor,
  DailyPrices,
} from '../../lib/spotPrices';

type TimeRange = 'today' | 'week' | 'month';

export default function SpotPricesScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { checkPriceAndNotify } = useNotifications();
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unit, setUnit] = useState<'mwh' | 'kwh'>('kwh');
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [dailyData, setDailyData] = useState<DailyPrices | null>(null);
  const [weeklyData, setWeeklyData] = useState<{ date: string; avgPrice: number }[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ date: string; avgPrice: number }[]>([]);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      // Load today's data
      const today = await fetchSpotPrices();
      if (today) {
        setDailyData(today);

        // Check if current price triggers any notification alerts
        const currentHour = Math.floor(getCurrentSlot() / 4);
        const currentPrice = today.prices[currentHour]?.priceKwh;
        if (currentPrice) {
          checkPriceAndNotify(currentPrice);
        }
      }

      // Load weekly data
      const weekly = await fetchSpotPricesRange(7);
      setWeeklyData(weekly);

      // Load monthly data (last 30 days)
      const monthly = await fetchSpotPricesRange(30);
      setMonthlyData(monthly);
    } catch (err) {
      console.error('Error loading spot prices:', err);
      setError('Nepodařilo se načíst ceny');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Get data for current view
  const getChartData = () => {
    if (timeRange === 'today' && dailyData) {
      const validPrices = dailyData.prices.filter(p => p.price > 0);
      return {
        labels: validPrices.filter((_, i) => i % 4 === 0).map(p => p.time),
        values: validPrices.map(p => unit === 'kwh' ? p.priceKwh : p.price),
      };
    } else if (timeRange === 'week') {
      return {
        labels: weeklyData.map(d => {
          const date = new Date(d.date);
          return ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'][date.getDay()];
        }),
        values: weeklyData.map(d => unit === 'kwh' ? d.avgPrice : d.avgPrice * 1000),
      };
    } else {
      // Monthly - show every 5th day
      return {
        labels: monthlyData.filter((_, i) => i % 5 === 0).map(d => {
          const date = new Date(d.date);
          return `${date.getDate()}.`;
        }),
        values: monthlyData.map(d => unit === 'kwh' ? d.avgPrice : d.avgPrice * 1000),
      };
    }
  };

  const chartData = getChartData();
  const screenWidth = Dimensions.get('window').width;

  // Stats
  const stats = dailyData?.stats || {
    current: 0,
    average: 0,
    lowest: 0,
    highest: 0,
    lowestSlot: 0,
    highestSlot: 0,
  };

  const displayStats = {
    current: unit === 'kwh' ? stats.current : stats.current * 1000,
    average: unit === 'kwh' ? stats.average : stats.average * 1000,
    lowest: unit === 'kwh' ? stats.lowest : stats.lowest * 1000,
    highest: unit === 'kwh' ? stats.highest : stats.highest * 1000,
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brand.accentGreen} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {t.common.loading}
          </Text>
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
          <Text style={[styles.title, { color: colors.text }]}>
            {t.spotPrices.title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t.spotPrices.subtitle}
          </Text>
        </View>

        {/* Error Message */}
        {error && (
          <View style={[styles.errorCard, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="warning" size={20} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Time Range Selector */}
        <View style={[styles.rangeSelector, { backgroundColor: colors.surface }]}>
          {(['today', 'week', 'month'] as TimeRange[]).map((range) => (
            <TouchableOpacity
              key={range}
              style={[
                styles.rangeButton,
                timeRange === range && styles.rangeButtonActive,
              ]}
              onPress={() => setTimeRange(range)}
            >
              <Text style={[
                styles.rangeButtonText,
                { color: timeRange === range ? '#FFFFFF' : colors.textSecondary },
              ]}>
                {t.spotPrices[range]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Unit Toggle */}
        <View style={styles.unitToggle}>
          <TouchableOpacity
            style={[
              styles.unitButton,
              { backgroundColor: unit === 'kwh' ? Colors.brand.accentGreen : colors.surface }
            ]}
            onPress={() => setUnit('kwh')}
          >
            <Text style={{ color: unit === 'kwh' ? '#FFFFFF' : colors.text, fontWeight: '600' }}>
              CZK/kWh
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.unitButton,
              { backgroundColor: unit === 'mwh' ? Colors.brand.accentGreen : colors.surface }
            ]}
            onPress={() => setUnit('mwh')}
          >
            <Text style={{ color: unit === 'mwh' ? '#FFFFFF' : colors.text, fontWeight: '600' }}>
              CZK/MWh
            </Text>
          </TouchableOpacity>
        </View>

        {/* Current Price Card */}
        <View style={[styles.currentPriceCard, { backgroundColor: colors.surface }]}>
          <View style={styles.currentPriceHeader}>
            <Text style={[styles.currentPriceLabel, { color: colors.textSecondary }]}>
              {t.spotPrices.current}
            </Text>
            <View style={[styles.liveBadge, { backgroundColor: Colors.brand.accentGreen + '20' }]}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          <View style={styles.currentPriceRow}>
            <Text style={[styles.currentPriceValue, { color: getPriceColor(stats.current) }]}>
              {displayStats.current.toFixed(2)}
            </Text>
            <Text style={[styles.currentPriceUnit, { color: colors.textSecondary }]}>
              {unit === 'mwh' ? t.spotPrices.perMwh : t.spotPrices.perKwh}
            </Text>
          </View>
          <Text style={[styles.currentSlot, { color: colors.textMuted }]}>
            Slot {getCurrentSlot() + 1}/96 ({dailyData?.prices[getCurrentSlot()]?.time || '--:--'})
          </Text>
        </View>

        {/* Chart */}
        {chartData.values.length > 0 && (
          <View style={[styles.chartContainer, { backgroundColor: colors.surface }]}>
            <LineChart
              data={{
                labels: chartData.labels,
                datasets: [{
                  data: chartData.values.length > 0 ? chartData.values : [0],
                  color: () => Colors.brand.accentGreen,
                  strokeWidth: 2,
                }],
              }}
              width={screenWidth - Layout.spacing.md * 4}
              height={220}
              chartConfig={{
                backgroundColor: colors.surface,
                backgroundGradientFrom: colors.surface,
                backgroundGradientTo: colors.surface,
                decimalPlaces: unit === 'kwh' ? 2 : 0,
                color: (opacity = 1) => Colors.brand.accentGreen,
                labelColor: () => colors.textSecondary,
                style: {
                  borderRadius: Layout.borderRadius.lg,
                },
                propsForDots: {
                  r: '3',
                  strokeWidth: '2',
                  stroke: Colors.brand.accentGreen,
                },
                propsForBackgroundLines: {
                  strokeDasharray: '',
                  stroke: isDark ? colors.border : '#E5E7EB',
                  strokeWidth: 0.5,
                },
              }}
              bezier
              style={{
                marginVertical: Layout.spacing.sm,
                borderRadius: Layout.borderRadius.lg,
              }}
              withInnerLines={true}
              withOuterLines={false}
              fromZero={false}
            />
          </View>
        )}

        {/* Hourly Prices List */}
        {timeRange === 'today' && dailyData && (
          <View style={[styles.hourlyContainer, { backgroundColor: colors.surface }]}>
            <Text style={[styles.hourlySectionTitle, { color: colors.text }]}>
              {t.spotPrices.hourlyPrices}
            </Text>
            {dailyData.prices.filter(p => p.price > 0).map((p, idx) => {
              const currentHour = new Date().getHours();
              const isCurrent = p.slot === currentHour;
              const barWidth = dailyData.stats.highest > 0
                ? Math.max(8, (p.priceKwh / dailyData.stats.highest) * 100)
                : 0;
              const barColor = getPriceColor(p.priceKwh);
              return (
                <View
                  key={idx}
                  style={[
                    styles.hourlyRow,
                    isCurrent && { backgroundColor: isDark ? '#FFFFFF08' : '#F0FDF4' },
                  ]}
                >
                  <View style={styles.hourlyTimeCol}>
                    {isCurrent && <View style={[styles.currentDot, { backgroundColor: Colors.brand.accentGreen }]} />}
                    <Text style={[
                      styles.hourlyTime,
                      { color: isCurrent ? Colors.brand.accentGreen : colors.textSecondary },
                      isCurrent && { fontWeight: '700' },
                    ]}>
                      {p.time}
                    </Text>
                  </View>
                  <View style={styles.hourlyBarCol}>
                    <View style={[styles.hourlyBar, { width: `${barWidth}%`, backgroundColor: barColor }]} />
                  </View>
                  <Text style={[
                    styles.hourlyPrice,
                    { color: barColor },
                    isCurrent && { fontWeight: '700' },
                  ]}>
                    {(unit === 'kwh' ? p.priceKwh : p.price).toFixed(2)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Ionicons name="trending-down" size={24} color={Colors.spotPrice.veryLow} />
            <Text style={[styles.statValue, { color: Colors.spotPrice.veryLow }]}>
              {displayStats.lowest.toFixed(2)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              {t.spotPrices.lowest}
            </Text>
            <Text style={[styles.statTime, { color: colors.textSecondary }]}>
              {dailyData?.prices[stats.lowestSlot]?.time || '--:--'}
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Ionicons name="analytics" size={24} color="#3B82F6" />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {displayStats.average.toFixed(2)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              {t.spotPrices.average}
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Ionicons name="trending-up" size={24} color={Colors.spotPrice.high} />
            <Text style={[styles.statValue, { color: Colors.spotPrice.high }]}>
              {displayStats.highest.toFixed(2)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              {t.spotPrices.highest}
            </Text>
            <Text style={[styles.statTime, { color: colors.textSecondary }]}>
              {dailyData?.prices[stats.highestSlot]?.time || '--:--'}
            </Text>
          </View>
        </View>

        {/* Recommendation Card */}
        {(() => {
          const currentIsLow = stats.current <= stats.average * 0.7;
          const saving = stats.highest - stats.lowest;
          const displaySaving = unit === 'kwh' ? saving : saving * 1000;
          const recColor = currentIsLow ? Colors.brand.accentGreen : '#F59E0B';
          const recBg = currentIsLow
            ? (isDark ? '#16A34A15' : '#ECFDF5')
            : (isDark ? '#F59E0B15' : '#FFFBEB');
          return (
            <View style={[styles.bestTimeCard, { backgroundColor: recBg }]}>
              <View style={styles.bestTimeHeader}>
                <Ionicons
                  name={currentIsLow ? 'flash' : 'time'}
                  size={24}
                  color={recColor}
                />
                <Text style={[styles.bestTimeTitle, { color: recColor }]}>
                  {currentIsLow ? t.spotPrices.chargeNow : t.spotPrices.waitForBetter}
                </Text>
              </View>
              <Text style={[styles.bestTimeValue, { color: colors.text }]}>
                {t.spotPrices.bestTime}: {dailyData?.prices[stats.lowestSlot]?.time || '--:--'}
              </Text>
              <Text style={[styles.bestTimePrice, { color: recColor }]}>
                {displayStats.lowest.toFixed(2)} {unit === 'mwh' ? t.spotPrices.perMwh : t.spotPrices.perKwh}
              </Text>
              {saving > 0 && (
                <Text style={[styles.savingText, { color: colors.textSecondary }]}>
                  {t.spotPrices.savingPotential}: {displaySaving.toFixed(2)} {unit === 'mwh' ? 'CZK/MWh' : 'CZK/kWh'}
                </Text>
              )}
            </View>
          );
        })()}

        {/* Data Source */}
        <View style={[styles.sourceCard, { backgroundColor: colors.surface }]}>
          <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
          <Text style={[styles.sourceText, { color: colors.textMuted }]}>
            Data: OTE-CR (Operátor trhu s elektřinou)
          </Text>
        </View>

        {/* Last Updated */}
        <Text style={[styles.lastUpdated, { color: colors.textMuted }]}>
          {t.spotPrices.lastUpdated}: {new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
        </Text>
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
    gap: Layout.spacing.md,
  },
  loadingText: {
    fontSize: Layout.fontSize.md,
  },
  header: {
    marginBottom: Layout.spacing.lg,
  },
  title: {
    fontSize: Layout.fontSize.xxl,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: Layout.fontSize.md,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.lg,
    marginBottom: Layout.spacing.md,
    gap: Layout.spacing.sm,
  },
  errorText: {
    color: '#DC2626',
    fontSize: Layout.fontSize.sm,
  },
  rangeSelector: {
    flexDirection: 'row',
    borderRadius: Layout.borderRadius.lg,
    padding: 4,
    marginBottom: Layout.spacing.md,
  },
  rangeButton: {
    flex: 1,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.md,
    alignItems: 'center',
  },
  rangeButtonActive: {
    backgroundColor: Colors.brand.accentGreen,
  },
  rangeButtonText: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
  },
  unitToggle: {
    flexDirection: 'row',
    gap: Layout.spacing.sm,
    marginBottom: Layout.spacing.md,
  },
  unitButton: {
    paddingVertical: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
  },
  currentPriceCard: {
    padding: Layout.spacing.lg,
    borderRadius: Layout.borderRadius.xl,
    marginBottom: Layout.spacing.md,
    alignItems: 'center',
  },
  currentPriceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
    marginBottom: Layout.spacing.xs,
  },
  currentPriceLabel: {
    fontSize: Layout.fontSize.sm,
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
  currentPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currentPriceValue: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  currentPriceUnit: {
    fontSize: Layout.fontSize.lg,
    marginLeft: Layout.spacing.sm,
  },
  currentSlot: {
    fontSize: Layout.fontSize.xs,
    marginTop: Layout.spacing.xs,
  },
  chartContainer: {
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.xl,
    marginBottom: Layout.spacing.md,
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Layout.spacing.sm,
    marginBottom: Layout.spacing.md,
  },
  statCard: {
    flex: 1,
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.lg,
    alignItems: 'center',
  },
  statValue: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    marginTop: Layout.spacing.xs,
  },
  statLabel: {
    fontSize: Layout.fontSize.xs,
    marginTop: 2,
  },
  statTime: {
    fontSize: Layout.fontSize.xs,
    marginTop: 2,
    fontWeight: '500',
  },
  bestTimeCard: {
    padding: Layout.spacing.lg,
    borderRadius: Layout.borderRadius.xl,
    marginBottom: Layout.spacing.md,
  },
  bestTimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
    marginBottom: Layout.spacing.sm,
  },
  bestTimeTitle: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
  },
  bestTimeValue: {
    fontSize: Layout.fontSize.xxl,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bestTimePrice: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
  },
  savingText: {
    fontSize: Layout.fontSize.sm,
    marginTop: Layout.spacing.xs,
  },
  hourlyContainer: {
    borderRadius: Layout.borderRadius.xl,
    padding: Layout.spacing.md,
    marginBottom: Layout.spacing.md,
  },
  hourlySectionTitle: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    marginBottom: Layout.spacing.sm,
  },
  hourlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: Layout.borderRadius.sm,
  },
  hourlyTimeCol: {
    width: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  currentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  hourlyTime: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '500',
  },
  hourlyBarCol: {
    flex: 1,
    height: 16,
    backgroundColor: 'transparent',
    borderRadius: 4,
    marginHorizontal: Layout.spacing.sm,
    overflow: 'hidden',
  },
  hourlyBar: {
    height: '100%',
    borderRadius: 4,
    opacity: 0.85,
  },
  hourlyPrice: {
    width: 56,
    textAlign: 'right',
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
  },
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.lg,
    marginBottom: Layout.spacing.md,
    gap: Layout.spacing.sm,
  },
  sourceText: {
    fontSize: Layout.fontSize.sm,
  },
  lastUpdated: {
    textAlign: 'center',
    fontSize: Layout.fontSize.sm,
  },
});
