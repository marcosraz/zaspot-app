/**
 * Route Planner Screen - Plan trips with real charging stops from Supabase
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import {
  planRoute,
  geocodeLocation,
  RouteResult,
  RoutePoint,
} from '../../lib/routePlanner';

export default function RouteScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [fromCoords, setFromCoords] = useState<RoutePoint | null>(null);
  const [toCoords, setToCoords] = useState<RoutePoint | null>(null);
  const [batteryLevel, setBatteryLevel] = useState(80);
  const [vehicleRange, setVehicleRange] = useState(400);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get current location
  const useCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Chyba', 'Přístup k poloze byl zamítnut');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const coords: RoutePoint = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        name: 'Moje poloha',
      };

      // Reverse geocode to get address
      const [address] = await Location.reverseGeocodeAsync({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });

      if (address) {
        coords.name = address.city || address.subregion || 'Moje poloha';
        setFromLocation(coords.name);
      } else {
        setFromLocation('Moje poloha');
      }

      setFromCoords(coords);
    } catch (err) {
      console.error('Location error:', err);
      Alert.alert('Chyba', 'Nepodařilo se získat polohu');
    } finally {
      setIsLocating(false);
    }
  };

  // Geocode destination when user finishes typing
  const handleToLocationBlur = async () => {
    if (!toLocation.trim()) return;

    const coords = await geocodeLocation(toLocation);
    if (coords) {
      setToCoords(coords);
      setToLocation(coords.name || toLocation);
    }
  };

  // Calculate route
  const calculateRoute = async () => {
    setError(null);

    // Ensure we have coordinates
    let from = fromCoords;
    let to = toCoords;

    if (!from && fromLocation) {
      from = await geocodeLocation(fromLocation);
      setFromCoords(from);
    }

    if (!to && toLocation) {
      to = await geocodeLocation(toLocation);
      setToCoords(to);
    }

    if (!from || !to) {
      setError('Zadejte platné adresy pro start a cíl');
      return;
    }

    setIsCalculating(true);

    try {
      const result = await planRoute(
        from,
        to,
        batteryLevel,
        vehicleRange,
        60 // Default battery capacity
      );
      setRouteResult(result);
    } catch (err) {
      console.error('Route planning error:', err);
      setError('Nepodařilo se naplánovat trasu');
    } finally {
      setIsCalculating(false);
    }
  };

  // Open navigation to a station
  const navigateToStation = (latitude: number, longitude: number) => {
    const url = Platform.select({
      ios: `maps://app?daddr=${latitude},${longitude}`,
      android: `google.navigation:q=${latitude},${longitude}`,
    });
    if (url) {
      Linking.openURL(url);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours} h ${mins} min`;
    }
    return `${mins} min`;
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
            <TouchableOpacity
              style={styles.locationBtn}
              onPress={useCurrentLocation}
              disabled={isLocating}
            >
              {isLocating ? (
                <ActivityIndicator size="small" color={Colors.brand.accentGreen} />
              ) : (
                <Ionicons name="locate" size={20} color={Colors.brand.accentGreen} />
              )}
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
              onBlur={handleToLocationBlur}
            />
          </View>

          {/* Vehicle Info */}
          <View style={[styles.vehicleInfo, { borderTopColor: colors.border }]}>
            <View style={styles.vehicleRow}>
              <TouchableOpacity
                style={styles.vehicleItem}
                onPress={() => {
                  // Simple battery level adjustment
                  const levels = [20, 40, 60, 80, 100];
                  const currentIndex = levels.indexOf(batteryLevel);
                  const nextIndex = (currentIndex + 1) % levels.length;
                  setBatteryLevel(levels[nextIndex]);
                }}
              >
                <Ionicons
                  name={batteryLevel > 50 ? 'battery-half' : 'battery-dead'}
                  size={20}
                  color={batteryLevel > 30 ? Colors.brand.accentGreen : '#EF4444'}
                />
                <Text style={[styles.vehicleLabel, { color: colors.textSecondary }]}>
                  {t.route.batteryLevel}
                </Text>
                <Text style={[styles.vehicleValue, { color: colors.text }]}>
                  {batteryLevel}%
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.vehicleItem}
                onPress={() => {
                  // Simple range adjustment
                  const ranges = [200, 300, 400, 500, 600];
                  const currentIndex = ranges.indexOf(vehicleRange);
                  const nextIndex = (currentIndex + 1) % ranges.length;
                  setVehicleRange(ranges[nextIndex]);
                }}
              >
                <Ionicons name="speedometer" size={20} color={colors.textSecondary} />
                <Text style={[styles.vehicleLabel, { color: colors.textSecondary }]}>
                  {t.route.vehicleRange}
                </Text>
                <Text style={[styles.vehicleValue, { color: colors.text }]}>
                  {vehicleRange} km
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.tapHint, { color: colors.textMuted }]}>
              Klepněte pro změnu hodnot
            </Text>
          </View>

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="warning" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

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
              <ActivityIndicator color="#FFFFFF" />
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
                    {routeResult.totalDistance} km
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                    {t.route.distance}
                  </Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryItem}>
                  <Ionicons name="time" size={24} color="#3B82F6" />
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    {formatDuration(routeResult.totalDuration)}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                    {t.route.duration}
                  </Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryItem}>
                  <Ionicons name="wallet" size={24} color="#F59E0B" />
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    {routeResult.totalCost} Kč
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                    {t.route.estimatedCost}
                  </Text>
                </View>
              </View>

              {/* Duration Breakdown */}
              <View style={[styles.durationBreakdown, { borderTopColor: colors.border }]}>
                <View style={styles.durationItem}>
                  <Ionicons name="car" size={16} color={colors.textSecondary} />
                  <Text style={[styles.durationText, { color: colors.textSecondary }]}>
                    Jízda: {formatDuration(routeResult.drivingDuration)}
                  </Text>
                </View>
                {routeResult.chargingDuration > 0 && (
                  <View style={styles.durationItem}>
                    <Ionicons name="flash" size={16} color={Colors.brand.accentGreen} />
                    <Text style={[styles.durationText, { color: colors.textSecondary }]}>
                      Nabíjení: {formatDuration(routeResult.chargingDuration)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* No Stops Needed */}
            {routeResult.stops.length === 0 && (
              <View style={[styles.noStopsCard, { backgroundColor: isDark ? colors.surfaceSecondary : '#ECFDF5' }]}>
                <Ionicons name="checkmark-circle" size={32} color={Colors.brand.accentGreen} />
                <Text style={[styles.noStopsTitle, { color: Colors.brand.accentGreen }]}>
                  Žádné nabíjení není potřeba!
                </Text>
                <Text style={[styles.noStopsText, { color: colors.textSecondary }]}>
                  S aktuální baterií dojede na cíl bez zastávky.
                </Text>
              </View>
            )}

            {/* Charging Stops */}
            {routeResult.stops.length > 0 && (
              <>
                <View style={styles.stopsHeader}>
                  <Ionicons name="flash" size={20} color={Colors.brand.accentGreen} />
                  <Text style={[styles.stopsTitle, { color: colors.text }]}>
                    {t.route.chargingStops} ({routeResult.stops.length})
                  </Text>
                </View>

                {routeResult.stops.map((stop, index) => (
                  <View key={stop.station.id} style={[styles.stopCard, { backgroundColor: colors.surface }]}>
                    <View style={styles.stopHeader}>
                      <View style={styles.stopNumber}>
                        <Text style={styles.stopNumberText}>{index + 1}</Text>
                      </View>
                      <View style={styles.stopInfo}>
                        <Text style={[styles.stopName, { color: colors.text }]}>
                          {stop.station.name}
                        </Text>
                        <Text style={[styles.stopDistance, { color: colors.textSecondary }]}>
                          {stop.station.address}
                        </Text>
                        <Text style={[styles.stopDistance, { color: colors.textSecondary }]}>
                          {Math.round(stop.distanceFromStart)} km od startu
                        </Text>
                      </View>
                      <View style={[
                        styles.typeBadge,
                        { backgroundColor: stop.station.type === 'DC' ? '#EF4444' : Colors.brand.accentGreen }
                      ]}>
                        <Text style={styles.typeBadgeText}>{stop.station.type}</Text>
                      </View>
                    </View>

                    <View style={styles.stopDetails}>
                      <View style={styles.stopDetailItem}>
                        <Ionicons name="flash" size={16} color={Colors.brand.accentGreen} />
                        <Text style={[styles.stopDetailText, { color: colors.text }]}>
                          {stop.station.power_kw} kW
                        </Text>
                      </View>
                      <View style={styles.stopDetailItem}>
                        <Ionicons name="battery-charging" size={16} color="#3B82F6" />
                        <Text style={[styles.stopDetailText, { color: colors.text }]}>
                          {stop.arrivalBattery}% → {stop.chargeToPercent}%
                        </Text>
                      </View>
                      <View style={styles.stopDetailItem}>
                        <Ionicons name="time" size={16} color="#F59E0B" />
                        <Text style={[styles.stopDetailText, { color: colors.text }]}>
                          ~{stop.chargeTime} min
                        </Text>
                      </View>
                    </View>

                    <View style={styles.stopCost}>
                      <Text style={[styles.stopCostLabel, { color: colors.textSecondary }]}>
                        Odhadovaná cena:
                      </Text>
                      <Text style={[styles.stopCostValue, { color: Colors.brand.accentGreen }]}>
                        {stop.chargeCost} Kč
                      </Text>
                    </View>

                    <View style={styles.stopActions}>
                      <TouchableOpacity
                        style={[styles.stopActionBtn, { borderColor: Colors.brand.accentGreen }]}
                        onPress={() => navigateToStation(stop.station.latitude, stop.station.longitude)}
                      >
                        <Ionicons name="navigate-outline" size={18} color={Colors.brand.accentGreen} />
                        <Text style={[styles.stopActionText, { color: Colors.brand.accentGreen }]}>
                          {t.map.navigate}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            )}
          </>
        )}

        {/* Empty State */}
        {!routeResult && !isCalculating && (
          <View style={styles.emptyState}>
            <Ionicons name="navigate-circle-outline" size={80} color={colors.textMuted} />
            <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
              Naplánujte si cestu
            </Text>
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
              Zadejte odkud a kam jedete, a najdeme vám optimální nabíjecí zastávky ze sítě ZAspot
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
    padding: Layout.spacing.sm,
  },
  vehicleLabel: {
    fontSize: Layout.fontSize.xs,
  },
  vehicleValue: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
  },
  tapHint: {
    textAlign: 'center',
    fontSize: Layout.fontSize.xs,
    marginTop: Layout.spacing.sm,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.md,
    marginTop: Layout.spacing.md,
    gap: Layout.spacing.xs,
  },
  errorText: {
    color: '#EF4444',
    fontSize: Layout.fontSize.sm,
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
  durationBreakdown: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Layout.spacing.lg,
    marginTop: Layout.spacing.md,
    paddingTop: Layout.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  durationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.xs,
  },
  durationText: {
    fontSize: Layout.fontSize.sm,
  },
  noStopsCard: {
    borderRadius: Layout.borderRadius.xl,
    padding: Layout.spacing.xl,
    alignItems: 'center',
    marginBottom: Layout.spacing.lg,
    gap: Layout.spacing.sm,
  },
  noStopsTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
  },
  noStopsText: {
    fontSize: Layout.fontSize.sm,
    textAlign: 'center',
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
    alignItems: 'flex-start',
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
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Layout.borderRadius.sm,
  },
  typeBadgeText: {
    color: '#FFFFFF',
    fontSize: Layout.fontSize.xs,
    fontWeight: 'bold',
  },
  stopDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.md,
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
  stopCost: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.md,
    paddingTop: Layout.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  stopCostLabel: {
    fontSize: Layout.fontSize.sm,
  },
  stopCostValue: {
    fontSize: Layout.fontSize.lg,
    fontWeight: 'bold',
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
    gap: Layout.spacing.xs,
  },
  stopActionText: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Layout.spacing.xxl * 2,
    gap: Layout.spacing.md,
  },
  emptyStateTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
  },
  emptyStateText: {
    fontSize: Layout.fontSize.md,
    textAlign: 'center',
    paddingHorizontal: Layout.spacing.xl,
  },
});
