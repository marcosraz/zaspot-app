/**
 * Route Planner Screen - Plan trips with charging stops
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';

interface ChargingStop {
  id: string;
  name: string;
  distance: number;
  duration: number;
  power: number;
  price: number;
  chargeTime: number;
}

export default function RouteScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [batteryLevel, setBatteryLevel] = useState(80);
  const [vehicleRange, setVehicleRange] = useState(400);
  const [isCalculating, setIsCalculating] = useState(false);
  const [routeResult, setRouteResult] = useState<{
    distance: number;
    duration: number;
    estimatedCost: number;
    stops: ChargingStop[];
  } | null>(null);

  const calculateRoute = () => {
    if (!fromLocation || !toLocation) return;

    setIsCalculating(true);

    // Simulate API call
    setTimeout(() => {
      setRouteResult({
        distance: 285,
        duration: 195,
        estimatedCost: 450,
        stops: [
          {
            id: '1',
            name: 'ZAspot Jihlava D1',
            distance: 125,
            duration: 75,
            power: 150,
            price: 8.50,
            chargeTime: 20,
          },
          {
            id: '2',
            name: 'ZAspot Praha Chodov',
            distance: 240,
            duration: 150,
            power: 100,
            price: 7.80,
            chargeTime: 15,
          },
        ],
      });
      setIsCalculating(false);
    }, 1500);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours} ${t.common.hour} ${mins} ${t.common.min}`;
    }
    return `${mins} ${t.common.min}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t.route.title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t.route.subtitle}
          </Text>
        </View>

        {/* Route Input Card */}
        <View style={[styles.inputCard, { backgroundColor: colors.surface }]}>
          {/* From */}
          <View style={styles.inputRow}>
            <View style={[styles.inputIcon, { backgroundColor: Colors.brand.accentGreen + '20' }]}>
              <Ionicons name="radio-button-on" size={16} color={Colors.brand.accentGreen} />
            </View>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder={t.route.from}
              placeholderTextColor={colors.textMuted}
              value={fromLocation}
              onChangeText={setFromLocation}
            />
            <TouchableOpacity style={styles.locationBtn}>
              <Ionicons name="locate" size={20} color={Colors.brand.accentGreen} />
            </TouchableOpacity>
          </View>

          {/* Connection Line */}
          <View style={styles.connectionLine}>
            <View style={[styles.dottedLine, { borderColor: colors.border }]} />
          </View>

          {/* To */}
          <View style={styles.inputRow}>
            <View style={[styles.inputIcon, { backgroundColor: '#EF4444' + '20' }]}>
              <Ionicons name="location" size={16} color="#EF4444" />
            </View>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder={t.route.to}
              placeholderTextColor={colors.textMuted}
              value={toLocation}
              onChangeText={setToLocation}
            />
          </View>

          {/* Vehicle Info */}
          <View style={[styles.vehicleInfo, { borderTopColor: colors.border }]}>
            <View style={styles.vehicleRow}>
              <View style={styles.vehicleItem}>
                <Ionicons name="battery-half" size={20} color={colors.textSecondary} />
                <Text style={[styles.vehicleLabel, { color: colors.textSecondary }]}>
                  {t.route.batteryLevel}
                </Text>
                <Text style={[styles.vehicleValue, { color: colors.text }]}>
                  {batteryLevel}%
                </Text>
              </View>
              <View style={styles.vehicleItem}>
                <Ionicons name="speedometer" size={20} color={colors.textSecondary} />
                <Text style={[styles.vehicleLabel, { color: colors.textSecondary }]}>
                  {t.route.vehicleRange}
                </Text>
                <Text style={[styles.vehicleValue, { color: colors.text }]}>
                  {vehicleRange} km
                </Text>
              </View>
            </View>
          </View>

          {/* Calculate Button */}
          <TouchableOpacity
            style={[
              styles.calculateBtn,
              (!fromLocation || !toLocation) && styles.calculateBtnDisabled,
            ]}
            onPress={calculateRoute}
            disabled={!fromLocation || !toLocation || isCalculating}
          >
            {isCalculating ? (
              <Text style={styles.calculateBtnText}>{t.route.calculating}</Text>
            ) : (
              <>
                <Ionicons name="navigate" size={20} color="#FFFFFF" />
                <Text style={styles.calculateBtnText}>{t.route.calculateRoute}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Route Result */}
        {routeResult && (
          <>
            {/* Summary Card */}
            <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Ionicons name="map" size={24} color={Colors.brand.accentGreen} />
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    {routeResult.distance} km
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                    {t.route.distance}
                  </Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryItem}>
                  <Ionicons name="time" size={24} color="#3B82F6" />
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    {formatDuration(routeResult.duration)}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                    {t.route.duration}
                  </Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryItem}>
                  <Ionicons name="wallet" size={24} color="#F59E0B" />
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    {routeResult.estimatedCost} Kč
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                    {t.route.estimatedCost}
                  </Text>
                </View>
              </View>
            </View>

            {/* Charging Stops */}
            <View style={styles.stopsHeader}>
              <Ionicons name="flash" size={20} color={Colors.brand.accentGreen} />
              <Text style={[styles.stopsTitle, { color: colors.text }]}>
                {t.route.chargingStops} ({routeResult.stops.length})
              </Text>
            </View>

            {routeResult.stops.map((stop, index) => (
              <View key={stop.id} style={[styles.stopCard, { backgroundColor: colors.surface }]}>
                <View style={styles.stopHeader}>
                  <View style={styles.stopNumber}>
                    <Text style={styles.stopNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.stopInfo}>
                    <Text style={[styles.stopName, { color: colors.text }]}>
                      {stop.name}
                    </Text>
                    <Text style={[styles.stopDistance, { color: colors.textSecondary }]}>
                      {stop.distance} km • {formatDuration(stop.duration)}
                    </Text>
                  </View>
                </View>

                <View style={styles.stopDetails}>
                  <View style={styles.stopDetailItem}>
                    <Ionicons name="flash" size={16} color={Colors.brand.accentGreen} />
                    <Text style={[styles.stopDetailText, { color: colors.text }]}>
                      {stop.power} kW
                    </Text>
                  </View>
                  <View style={styles.stopDetailItem}>
                    <Ionicons name="time" size={16} color="#3B82F6" />
                    <Text style={[styles.stopDetailText, { color: colors.text }]}>
                      ~{stop.chargeTime} min
                    </Text>
                  </View>
                  <View style={styles.stopDetailItem}>
                    <Ionicons name="pricetag" size={16} color="#F59E0B" />
                    <Text style={[styles.stopDetailText, { color: colors.text }]}>
                      {stop.price} Kč/kWh
                    </Text>
                  </View>
                </View>

                <View style={styles.stopActions}>
                  <TouchableOpacity style={styles.stopActionBtn}>
                    <Ionicons name="navigate-outline" size={18} color={Colors.brand.accentGreen} />
                    <Text style={[styles.stopActionText, { color: Colors.brand.accentGreen }]}>
                      {t.map.navigate}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.stopActionBtnPrimary]}>
                    <Ionicons name="calendar-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.stopActionTextPrimary}>
                      {t.map.reserve}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* Add Stop Button */}
            <TouchableOpacity style={[styles.addStopBtn, { borderColor: colors.border }]}>
              <Ionicons name="add-circle-outline" size={24} color={Colors.brand.accentGreen} />
              <Text style={[styles.addStopText, { color: Colors.brand.accentGreen }]}>
                {t.route.addStop}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Empty State */}
        {!routeResult && !isCalculating && (
          <View style={styles.emptyState}>
            <Ionicons name="navigate-circle-outline" size={80} color={colors.textMuted} />
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
              Zadej odkud a kam jedeš, a najdeme ti optimální trasu s nabíjecími stanicemi
            </Text>
          </View>
        )}
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
  inputCard: {
    borderRadius: Layout.borderRadius.xl,
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.lg,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.md,
  },
  inputIcon: {
    width: 32,
    height: 32,
    borderRadius: Layout.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: Layout.fontSize.md,
    paddingVertical: Layout.spacing.sm,
  },
  locationBtn: {
    padding: Layout.spacing.sm,
  },
  connectionLine: {
    marginLeft: 15,
    height: 24,
    justifyContent: 'center',
  },
  dottedLine: {
    width: 2,
    height: '100%',
    borderStyle: 'dashed',
    borderWidth: 1,
  },
  vehicleInfo: {
    marginTop: Layout.spacing.lg,
    paddingTop: Layout.spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  vehicleRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  vehicleItem: {
    alignItems: 'center',
    gap: 4,
  },
  vehicleLabel: {
    fontSize: Layout.fontSize.xs,
  },
  vehicleValue: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
  },
  calculateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.brand.accentGreen,
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.borderRadius.lg,
    marginTop: Layout.spacing.lg,
    gap: Layout.spacing.sm,
  },
  calculateBtnDisabled: {
    opacity: 0.5,
  },
  calculateBtnText: {
    color: '#FFFFFF',
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
  },
  summaryCard: {
    borderRadius: Layout.borderRadius.xl,
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  summaryDivider: {
    width: 1,
    height: 40,
  },
  summaryValue: {
    fontSize: Layout.fontSize.lg,
    fontWeight: 'bold',
  },
  summaryLabel: {
    fontSize: Layout.fontSize.xs,
  },
  stopsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
    marginBottom: Layout.spacing.md,
  },
  stopsTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
  },
  stopCard: {
    borderRadius: Layout.borderRadius.xl,
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.md,
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.md,
    marginBottom: Layout.spacing.md,
  },
  stopNumber: {
    width: 28,
    height: 28,
    borderRadius: Layout.borderRadius.full,
    backgroundColor: Colors.brand.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopNumberText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: Layout.fontSize.sm,
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  stopDistance: {
    fontSize: Layout.fontSize.sm,
  },
  stopDetails: {
    flexDirection: 'row',
    gap: Layout.spacing.lg,
    marginBottom: Layout.spacing.md,
  },
  stopDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stopDetailText: {
    fontSize: Layout.fontSize.sm,
  },
  stopActions: {
    flexDirection: 'row',
    gap: Layout.spacing.md,
  },
  stopActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.brand.accentGreen,
    gap: Layout.spacing.xs,
  },
  stopActionText: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
  },
  stopActionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.lg,
    backgroundColor: Colors.brand.accentGreen,
    gap: Layout.spacing.xs,
  },
  stopActionTextPrimary: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: Layout.spacing.sm,
  },
  addStopText: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Layout.spacing.xxl * 2,
    gap: Layout.spacing.lg,
  },
  emptyStateText: {
    fontSize: Layout.fontSize.md,
    textAlign: 'center',
    paddingHorizontal: Layout.spacing.xl,
  },
});
