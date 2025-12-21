/**
 * Spot Prices Screen - Electricity price chart with daily/weekly/monthly views
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';

type TimeRange = 'today' | 'week' | 'month';

// Mock data - will be replaced with OTE API call
const generateMockPrices = (range: TimeRange) => {
  const now = new Date();
  const prices = [];

  const count = range === 'today' ? 24 : range === 'week' ? 7 : 30;

  for (let i = 0; i < count; i++) {
    const basePrice = 2500 + Math.random() * 2000;
    const hour = range === 'today' ? i : 12;
    // Simulate typical price patterns
    const hourFactor = Math.sin((hour - 14) * Math.PI / 12) * 500;
    prices.push({
      time: range === 'today'
        ? `${i.toString().padStart(2, '0')}:00`
        : range === 'week'
        ? ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'][i]
        : `${i + 1}.`,
      price: Math.max(500, basePrice + hourFactor),
    });
  }
  return prices;
};

const mockPrices = {
  today: generateMockPrices('today'),
  week: generateMockPrices('week'),
  month: generateMockPrices('month'),
};

export default function SpotPricesScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [refreshing, setRefreshing] = useState(false);
  const [prices, setPrices] = useState(mockPrices);
  const [unit, setUnit] = useState<'mwh' | 'kwh'>('kwh');

  const currentPrices = prices[timeRange];
  const priceValues = currentPrices.map(p => p.price / (unit === 'kwh' ? 1000 : 1));

  const stats = {
    current: priceValues[new Date().getHours()] || priceValues[0],
    average: priceValues.reduce((a, b) => a + b, 0) / priceValues.length,
    lowest: Math.min(...priceValues),
    highest: Math.max(...priceValues),
    lowestIndex: priceValues.indexOf(Math.min(...priceValues)),
  };

  const screenWidth = Dimensions.get('window').width;

  const onRefresh = async () => {
    setRefreshing(true);
    // TODO: Fetch from OTE API
    setTimeout(() => {
      setPrices({
        today: generateMockPrices('today'),
        week: generateMockPrices('week'),
        month: generateMockPrices('month'),
      });
      setRefreshing(false);
    }, 1000);
  };

  const getPriceColor = (price: number) => {
    const kwhPrice = unit === 'mwh' ? price / 1000 : price;
    if (kwhPrice < 2) return Colors.spotPrice.veryLow;
    if (kwhPrice < 3) return Colors.spotPrice.low;
    if (kwhPrice < 4) return Colors.spotPrice.medium;
    if (kwhPrice < 5) return Colors.spotPrice.high;
    return Colors.spotPrice.veryHigh;
  };

  // Prepare chart data - show fewer labels for readability
  const labelStep = timeRange === 'today' ? 4 : timeRange === 'week' ? 1 : 5;
  const chartLabels = currentPrices
    .map((p, i) => i % labelStep === 0 ? p.time : '')
    .filter((_, i) => i % labelStep === 0 || timeRange === 'week');

  const chartData = {
    labels: timeRange === 'week'
      ? currentPrices.map(p => p.time)
      : currentPrices.filter((_, i) => i % labelStep === 0).map(p => p.time),
    datasets: [{
      data: timeRange === 'week'
        ? priceValues
        : priceValues.filter((_, i) => i % labelStep === 0),
      color: () => Colors.brand.accentGreen,
      strokeWidth: 2,
    }],
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
          <Text style={[styles.title, { color: colors.text }]}>
            {t.spotPrices.title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t.spotPrices.subtitle}
          </Text>
        </View>

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
          <Text style={[styles.currentPriceLabel, { color: colors.textSecondary }]}>
            {t.spotPrices.current}
          </Text>
          <View style={styles.currentPriceRow}>
            <Text style={[styles.currentPriceValue, { color: getPriceColor(stats.current) }]}>
              {stats.current.toFixed(2)}
            </Text>
            <Text style={[styles.currentPriceUnit, { color: colors.textSecondary }]}>
              {unit === 'mwh' ? t.spotPrices.perMwh : t.spotPrices.perKwh}
            </Text>
          </View>
        </View>

        {/* Chart */}
        <View style={[styles.chartContainer, { backgroundColor: colors.surface }]}>
          <LineChart
            data={chartData}
            width={screenWidth - Layout.spacing.md * 4}
            height={220}
            chartConfig={{
              backgroundColor: colors.surface,
              backgroundGradientFrom: colors.surface,
              backgroundGradientTo: colors.surface,
              decimalPlaces: 2,
              color: (opacity = 1) => Colors.brand.accentGreen,
              labelColor: () => colors.textSecondary,
              style: {
                borderRadius: Layout.borderRadius.lg,
              },
              propsForDots: {
                r: '4',
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
            withHorizontalLabels={true}
            withVerticalLabels={true}
            fromZero={false}
          />
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Ionicons name="trending-down" size={24} color={Colors.spotPrice.veryLow} />
            <Text style={[styles.statValue, { color: Colors.spotPrice.veryLow }]}>
              {stats.lowest.toFixed(2)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              {t.spotPrices.lowest}
            </Text>
            <Text style={[styles.statTime, { color: colors.textSecondary }]}>
              {currentPrices[stats.lowestIndex]?.time}
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Ionicons name="analytics" size={24} color="#3B82F6" />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats.average.toFixed(2)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              {t.spotPrices.average}
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Ionicons name="trending-up" size={24} color={Colors.spotPrice.high} />
            <Text style={[styles.statValue, { color: Colors.spotPrice.high }]}>
              {stats.highest.toFixed(2)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              {t.spotPrices.highest}
            </Text>
          </View>
        </View>

        {/* Best Time Card */}
        <View style={[styles.bestTimeCard, { backgroundColor: isDark ? colors.surfaceSecondary : '#ECFDF5' }]}>
          <View style={styles.bestTimeHeader}>
            <Ionicons name="time" size={24} color={Colors.brand.accentGreen} />
            <Text style={[styles.bestTimeTitle, { color: Colors.brand.accentGreen }]}>
              {t.spotPrices.bestTime}
            </Text>
          </View>
          <Text style={[styles.bestTimeValue, { color: colors.text }]}>
            {currentPrices[stats.lowestIndex]?.time}
            {timeRange === 'today' && ` - ${String(stats.lowestIndex + 1).padStart(2, '0')}:00`}
          </Text>
          <Text style={[styles.bestTimePrice, { color: Colors.brand.accentGreen }]}>
            {stats.lowest.toFixed(2)} {unit === 'mwh' ? t.spotPrices.perMwh : t.spotPrices.perKwh}
          </Text>
        </View>

        {/* Price Alert Button */}
        <TouchableOpacity style={[styles.alertButton, { backgroundColor: colors.surface }]}>
          <Ionicons name="notifications-outline" size={24} color={Colors.brand.accentGreen} />
          <View style={styles.alertButtonText}>
            <Text style={[styles.alertButtonTitle, { color: colors.text }]}>
              {t.spotPrices.priceAlert}
            </Text>
            <Text style={[styles.alertButtonSubtitle, { color: colors.textSecondary }]}>
              {t.spotPrices.setAlert}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
        </TouchableOpacity>

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
  currentPriceLabel: {
    fontSize: Layout.fontSize.sm,
    marginBottom: Layout.spacing.xs,
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
  alertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.lg,
    borderRadius: Layout.borderRadius.xl,
    marginBottom: Layout.spacing.md,
    gap: Layout.spacing.md,
  },
  alertButtonText: {
    flex: 1,
  },
  alertButtonTitle: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
  },
  alertButtonSubtitle: {
    fontSize: Layout.fontSize.sm,
  },
  lastUpdated: {
    textAlign: 'center',
    fontSize: Layout.fontSize.sm,
  },
});
