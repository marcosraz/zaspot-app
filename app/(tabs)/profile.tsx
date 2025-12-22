/**
 * Profile Screen - Settings, language, theme, reservations
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useVehicle, POPULAR_VEHICLES, VehicleProfile } from '../../context/VehicleContext';
import { useNotifications } from '../../context/NotificationsContext';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import Constants from 'expo-constants';

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  showArrow?: boolean;
  rightElement?: React.ReactNode;
  iconColor?: string;
}

function MenuItem({ icon, label, value, onPress, showArrow = true, rightElement, iconColor }: MenuItemProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.menuIconContainer, { backgroundColor: (iconColor || Colors.brand.accentGreen) + '15' }]}>
        <Ionicons name={icon} size={20} color={iconColor || Colors.brand.accentGreen} />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuLabel, { color: colors.text }]}>{label}</Text>
        {value && (
          <Text style={[styles.menuValue, { color: colors.textSecondary }]}>{value}</Text>
        )}
      </View>
      {rightElement}
      {showArrow && !rightElement && (
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      )}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { colors, isDark, toggleTheme, setTheme } = useTheme();
  const { t, language, setLanguage, availableLanguages } = useLanguage();
  const { settings, setSelectedVehicle } = useVehicle();
  const {
    settings: notificationSettings,
    hasPermission,
    requestPermission,
    togglePriceAlert,
    updatePriceAlert,
    sendTestNotification,
  } = useNotifications();

  const [showLanguageSelector, setShowLanguageSelector] = React.useState(false);
  const [showVehicleSelector, setShowVehicleSelector] = React.useState(false);
  const [showPriceAlertEditor, setShowPriceAlertEditor] = React.useState(false);

  const getCurrentVehicleName = () => {
    if (settings.selectedVehicle) {
      return `${settings.selectedVehicle.manufacturer} ${settings.selectedVehicle.name}`;
    }
    return 'Vybrat vozidlo';
  };

  // Group vehicles by manufacturer
  const vehiclesByManufacturer = POPULAR_VEHICLES.reduce((acc, vehicle) => {
    if (!acc[vehicle.manufacturer]) {
      acc[vehicle.manufacturer] = [];
    }
    acc[vehicle.manufacturer].push(vehicle);
    return acc;
  }, {} as Record<string, VehicleProfile[]>);

  const getCurrentLanguageName = () => {
    return availableLanguages.find(l => l.code === language)?.nativeName || 'Čeština';
  };

  const handleContactPress = () => {
    Linking.openURL(`tel:${t.company.phone}`);
  };

  const handleEmailPress = () => {
    Linking.openURL(`mailto:${t.company.email}`);
  };

  const handleWebsitePress = () => {
    Linking.openURL(`https://${t.company.website}`);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t.profile.title}
          </Text>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t.profile.settings}
          </Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
            {/* Theme Toggle */}
            <MenuItem
              icon={isDark ? 'moon' : 'sunny'}
              label={isDark ? t.profile.darkMode : t.profile.lightMode}
              showArrow={false}
              iconColor={isDark ? '#8B5CF6' : '#F59E0B'}
              rightElement={
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: '#D1D5DB', true: Colors.brand.accentGreen + '50' }}
                  thumbColor={isDark ? Colors.brand.accentGreen : '#FFFFFF'}
                />
              }
            />

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Language Selector */}
            <MenuItem
              icon="language"
              label={t.profile.language}
              value={getCurrentLanguageName()}
              onPress={() => setShowLanguageSelector(!showLanguageSelector)}
              iconColor="#3B82F6"
            />

            {showLanguageSelector && (
              <View style={[styles.languageSelector, { backgroundColor: colors.surfaceSecondary }]}>
                {availableLanguages.map((lang) => (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.languageOption,
                      language === lang.code && styles.languageOptionActive,
                    ]}
                    onPress={() => {
                      setLanguage(lang.code);
                      setShowLanguageSelector(false);
                    }}
                  >
                    <Text style={[
                      styles.languageText,
                      { color: language === lang.code ? Colors.brand.accentGreen : colors.text }
                    ]}>
                      {lang.nativeName}
                    </Text>
                    {language === lang.code && (
                      <Ionicons name="checkmark" size={20} color={Colors.brand.accentGreen} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Notifications */}
            <MenuItem
              icon="notifications"
              label={t.profile.notifications}
              value={hasPermission ? 'Zapnuto' : 'Vypnuto'}
              onPress={async () => {
                if (!hasPermission) {
                  await requestPermission();
                }
                setShowPriceAlertEditor(!showPriceAlertEditor);
              }}
              iconColor="#F59E0B"
            />

            {showPriceAlertEditor && (
              <View style={[styles.priceAlertEditor, { backgroundColor: colors.surfaceSecondary }]}>
                {/* Permission Status */}
                {!hasPermission && (
                  <TouchableOpacity
                    style={[styles.enableNotificationsBtn, { backgroundColor: Colors.brand.accentGreen }]}
                    onPress={requestPermission}
                  >
                    <Ionicons name="notifications" size={20} color="#FFFFFF" />
                    <Text style={styles.enableNotificationsBtnText}>Povolit notifikace</Text>
                  </TouchableOpacity>
                )}

                {/* Price Alerts */}
                {notificationSettings.priceAlerts.map((alert) => (
                  <View key={alert.id} style={styles.priceAlertItem}>
                    <View style={styles.priceAlertInfo}>
                      <Text style={[styles.priceAlertLabel, { color: colors.text }]}>
                        {alert.notifyBelow ? 'Upozornit pod' : 'Upozornit nad'}
                      </Text>
                      <View style={styles.priceAlertValue}>
                        <TouchableOpacity
                          onPress={() => updatePriceAlert(alert.id, {
                            thresholdKwh: Math.max(0.5, alert.thresholdKwh - 0.5)
                          })}
                          style={[styles.priceAdjustBtn, { backgroundColor: colors.border }]}
                        >
                          <Ionicons name="remove" size={18} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.priceAlertAmount, { color: Colors.brand.accentGreen }]}>
                          {alert.thresholdKwh.toFixed(1)} Kč/kWh
                        </Text>
                        <TouchableOpacity
                          onPress={() => updatePriceAlert(alert.id, {
                            thresholdKwh: Math.min(10, alert.thresholdKwh + 0.5)
                          })}
                          style={[styles.priceAdjustBtn, { backgroundColor: colors.border }]}
                        >
                          <Ionicons name="add" size={18} color={colors.text} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Switch
                      value={alert.enabled}
                      onValueChange={() => togglePriceAlert(alert.id)}
                      trackColor={{ false: '#D1D5DB', true: Colors.brand.accentGreen + '50' }}
                      thumbColor={alert.enabled ? Colors.brand.accentGreen : '#FFFFFF'}
                    />
                  </View>
                ))}

                {/* Test Notification Button */}
                {hasPermission && (
                  <TouchableOpacity
                    style={[styles.testNotificationBtn, { borderColor: colors.border }]}
                    onPress={sendTestNotification}
                  >
                    <Ionicons name="notifications-outline" size={18} color={colors.textSecondary} />
                    <Text style={[styles.testNotificationText, { color: colors.textSecondary }]}>
                      Odeslat testovací notifikaci
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Vehicle Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            ELEKTROMOBIL
          </Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
            <MenuItem
              icon="car-sport"
              label="Moje vozidlo"
              value={getCurrentVehicleName()}
              onPress={() => setShowVehicleSelector(!showVehicleSelector)}
              iconColor="#3B82F6"
            />

            {showVehicleSelector && (
              <View style={[styles.vehicleSelector, { backgroundColor: colors.surfaceSecondary }]}>
                <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled>
                  {Object.entries(vehiclesByManufacturer).map(([manufacturer, vehicles]) => (
                    <View key={manufacturer}>
                      <Text style={[styles.manufacturerHeader, { color: colors.textSecondary }]}>
                        {manufacturer}
                      </Text>
                      {vehicles.map((vehicle) => (
                        <TouchableOpacity
                          key={vehicle.id}
                          style={[
                            styles.vehicleOption,
                            settings.selectedVehicle?.id === vehicle.id && styles.vehicleOptionActive,
                          ]}
                          onPress={() => {
                            setSelectedVehicle(vehicle);
                            setShowVehicleSelector(false);
                          }}
                        >
                          <View style={styles.vehicleInfo}>
                            <Text style={[
                              styles.vehicleName,
                              { color: settings.selectedVehicle?.id === vehicle.id ? Colors.brand.accentGreen : colors.text }
                            ]}>
                              {vehicle.name}
                            </Text>
                            <Text style={[styles.vehicleSpecs, { color: colors.textMuted }]}>
                              {vehicle.batteryCapacityKwh} kWh • {vehicle.rangeKm} km • {vehicle.maxChargingPowerKw} kW
                            </Text>
                          </View>
                          {settings.selectedVehicle?.id === vehicle.id && (
                            <Ionicons name="checkmark" size={20} color={Colors.brand.accentGreen} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {settings.selectedVehicle && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.vehicleStats}>
                  <View style={styles.vehicleStat}>
                    <Ionicons name="battery-full" size={20} color={Colors.brand.accentGreen} />
                    <Text style={[styles.vehicleStatValue, { color: colors.text }]}>
                      {settings.selectedVehicle.batteryCapacityKwh} kWh
                    </Text>
                    <Text style={[styles.vehicleStatLabel, { color: colors.textMuted }]}>Baterie</Text>
                  </View>
                  <View style={styles.vehicleStat}>
                    <Ionicons name="speedometer" size={20} color="#3B82F6" />
                    <Text style={[styles.vehicleStatValue, { color: colors.text }]}>
                      {settings.selectedVehicle.rangeKm} km
                    </Text>
                    <Text style={[styles.vehicleStatLabel, { color: colors.textMuted }]}>Dojezd</Text>
                  </View>
                  <View style={styles.vehicleStat}>
                    <Ionicons name="flash" size={20} color="#F59E0B" />
                    <Text style={[styles.vehicleStatValue, { color: colors.text }]}>
                      {settings.selectedVehicle.maxChargingPowerKw} kW
                    </Text>
                    <Text style={[styles.vehicleStatLabel, { color: colors.textMuted }]}>Max nabíjení</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* My Stuff Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t.profile.reservations}
          </Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
            <MenuItem
              icon="calendar"
              label={t.profile.reservations}
              iconColor="#8B5CF6"
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem
              icon="time"
              label={t.profile.history}
              iconColor="#06B6D4"
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem
              icon="notifications-circle"
              label={t.profile.priceAlerts}
              iconColor="#EF4444"
            />
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t.profile.help}
          </Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
            <MenuItem
              icon="help-circle"
              label={t.profile.help}
              iconColor="#10B981"
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem
              icon="information-circle"
              label={t.profile.about}
              iconColor="#6366F1"
            />
          </View>
        </View>

        {/* Contact Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t.profile.contact}
          </Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
            <MenuItem
              icon="call"
              label={t.company.phone}
              onPress={handleContactPress}
              iconColor={Colors.brand.accentGreen}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem
              icon="mail"
              label={t.company.email}
              onPress={handleEmailPress}
              iconColor="#3B82F6"
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem
              icon="globe"
              label={t.company.website}
              onPress={handleWebsitePress}
              iconColor="#8B5CF6"
            />
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={[styles.appName, { color: colors.text }]}>ZAspot</Text>
          <Text style={[styles.companyName, { color: colors.textSecondary }]}>
            {t.company.name}
          </Text>
          <Text style={[styles.version, { color: colors.textMuted }]}>
            {t.profile.version} {Constants.expoConfig?.version || '1.0.0'}
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
  header: {
    marginBottom: Layout.spacing.lg,
  },
  title: {
    fontSize: Layout.fontSize.xxl,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: Layout.spacing.lg,
  },
  sectionTitle: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Layout.spacing.sm,
    marginLeft: Layout.spacing.xs,
  },
  sectionCard: {
    borderRadius: Layout.borderRadius.xl,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.md,
    gap: Layout.spacing.md,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: Layout.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: Layout.fontSize.md,
    fontWeight: '500',
  },
  menuValue: {
    fontSize: Layout.fontSize.sm,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 60,
  },
  languageSelector: {
    marginHorizontal: Layout.spacing.md,
    marginBottom: Layout.spacing.md,
    borderRadius: Layout.borderRadius.lg,
    overflow: 'hidden',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Layout.spacing.md,
  },
  languageOptionActive: {
    backgroundColor: Colors.brand.accentGreen + '10',
  },
  languageText: {
    fontSize: Layout.fontSize.md,
  },
  vehicleSelector: {
    marginHorizontal: Layout.spacing.md,
    marginBottom: Layout.spacing.md,
    borderRadius: Layout.borderRadius.lg,
    overflow: 'hidden',
  },
  manufacturerHeader: {
    fontSize: Layout.fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Layout.spacing.md,
    paddingTop: Layout.spacing.md,
    paddingBottom: Layout.spacing.xs,
  },
  vehicleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Layout.spacing.md,
  },
  vehicleOptionActive: {
    backgroundColor: Colors.brand.accentGreen + '10',
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: Layout.fontSize.md,
    fontWeight: '500',
  },
  vehicleSpecs: {
    fontSize: Layout.fontSize.xs,
    marginTop: 2,
  },
  vehicleStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: Layout.spacing.md,
  },
  vehicleStat: {
    alignItems: 'center',
    gap: 4,
  },
  vehicleStatValue: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
  },
  vehicleStatLabel: {
    fontSize: Layout.fontSize.xs,
  },
  priceAlertEditor: {
    marginHorizontal: Layout.spacing.md,
    marginBottom: Layout.spacing.md,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.md,
  },
  enableNotificationsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.borderRadius.lg,
    gap: Layout.spacing.sm,
    marginBottom: Layout.spacing.md,
  },
  enableNotificationsBtnText: {
    color: '#FFFFFF',
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
  },
  priceAlertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Layout.spacing.sm,
  },
  priceAlertInfo: {
    flex: 1,
  },
  priceAlertLabel: {
    fontSize: Layout.fontSize.sm,
    marginBottom: 4,
  },
  priceAlertValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
  },
  priceAdjustBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceAlertAmount: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    minWidth: 100,
    textAlign: 'center',
  },
  testNotificationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
    gap: Layout.spacing.sm,
    marginTop: Layout.spacing.md,
  },
  testNotificationText: {
    fontSize: Layout.fontSize.sm,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: Layout.spacing.xl,
    gap: 4,
  },
  appName: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
  },
  companyName: {
    fontSize: Layout.fontSize.sm,
  },
  version: {
    fontSize: Layout.fontSize.xs,
    marginTop: Layout.spacing.xs,
  },
});
