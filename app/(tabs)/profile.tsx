/**
 * Profile Screen - Settings, language, theme, reservations
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Linking,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useCredit } from '../../context/CreditContext';
import { useVehicle, POPULAR_VEHICLES, VehicleProfile } from '../../context/VehicleContext';
import { useNotifications } from '../../context/NotificationsContext';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import {
  RegisteredVehicle,
  PendingVehicle,
  RfidCard,
  fetchRegisteredVehicles,
  fetchPendingVehicles,
  registerVehicle,
  deleteVehicle,
  fetchRfidCards,
  registerRfidCard,
} from '../../lib/vehicles';
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
  const { user, isAuthenticated, logout } = useAuth();
  const { balance, balanceFormatted, loading: creditLoading, topUp, refreshBalance } = useCredit();
  const { settings, setSelectedVehicle } = useVehicle();
  const {
    settings: notificationSettings,
    hasPermission,
    requestPermission,
    togglePriceAlert,
    updatePriceAlert,
    sendTestNotification,
  } = useNotifications();

  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);
  const [showPriceAlertEditor, setShowPriceAlertEditor] = useState(false);
  const [showAutoCharge, setShowAutoCharge] = useState(false);
  const [registeredVehicles, setRegisteredVehicles] = useState<RegisteredVehicle[]>([]);
  const [pendingVehicles, setPendingVehicles] = useState<PendingVehicle[]>([]);
  const [rfidCards, setRfidCards] = useState<RfidCard[]>([]);
  const [autoChargeLoading, setAutoChargeLoading] = useState(false);
  const [registeringTag, setRegisteringTag] = useState<string | null>(null);
  const [vehicleDescription, setVehicleDescription] = useState('');
  const [showManualMac, setShowManualMac] = useState(false);
  const [manualMac, setManualMac] = useState('');
  const [manualMacName, setManualMacName] = useState('');
  const [showRfidForm, setShowRfidForm] = useState(false);
  const [rfidTag, setRfidTag] = useState('');
  const [rfidName, setRfidName] = useState('');

  const loadAutoCharge = async () => {
    if (!isAuthenticated) return;
    setAutoChargeLoading(true);
    const [registered, pending, rfid] = await Promise.all([
      fetchRegisteredVehicles(),
      fetchPendingVehicles(),
      fetchRfidCards(),
    ]);
    setRegisteredVehicles(registered);
    setPendingVehicles(pending);
    setRfidCards(rfid);
    setAutoChargeLoading(false);
  };

  useEffect(() => {
    if (showAutoCharge && isAuthenticated) {
      loadAutoCharge();
    }
  }, [showAutoCharge, isAuthenticated]);

  const handleRegisterVehicle = async (idTag: string) => {
    if (!vehicleDescription.trim()) return;
    const result = await registerVehicle(idTag, vehicleDescription.trim());
    if (result.success) {
      setRegisteringTag(null);
      setVehicleDescription('');
      loadAutoCharge();
    } else {
      Alert.alert('Error', result.error || 'Registration failed');
    }
  };

  const handleDeleteVehicle = (vehicle: RegisteredVehicle) => {
    const confirmText = language === 'cz' ? 'Opravdu chcete odebrat toto vozidlo?' :
                        language === 'de' ? 'Möchten Sie dieses Fahrzeug wirklich entfernen?' :
                        'Do you want to remove this vehicle?';
    Alert.alert(
      language === 'cz' ? 'Odebrat vozidlo' : language === 'de' ? 'Fahrzeug entfernen' : 'Remove Vehicle',
      confirmText,
      [
        { text: language === 'cz' ? 'Ne' : language === 'de' ? 'Nein' : 'No', style: 'cancel' },
        {
          text: language === 'cz' ? 'Ano' : language === 'de' ? 'Ja' : 'Yes',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteVehicle(vehicle.id);
            if (result.success) {
              loadAutoCharge();
            }
          },
        },
      ]
    );
  };

  const handleManualMacRegister = async () => {
    const mac = manualMac.trim();
    const name = manualMacName.trim();
    if (!mac || !name) return;
    const result = await registerVehicle(mac, name);
    if (result.success) {
      setShowManualMac(false);
      setManualMac('');
      setManualMacName('');
      loadAutoCharge();
    } else {
      Alert.alert('Error', result.error || 'Registration failed');
    }
  };

  const handleRfidRegister = async () => {
    const tag = rfidTag.trim();
    const name = rfidName.trim();
    if (!tag || !name) return;
    const result = await registerRfidCard(tag, name);
    if (result.success) {
      setShowRfidForm(false);
      setRfidTag('');
      setRfidName('');
      loadAutoCharge();
    } else {
      Alert.alert('Error', result.error || 'Registration failed');
    }
  };

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

        {/* User Account Section */}
        {isAuthenticated ? (
          <View style={[styles.userCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.userAvatar, { backgroundColor: Colors.brand.accentGreen + '20' }]}>
              <Text style={styles.userAvatarText}>
                {(user?.name || user?.email || '?')[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.userInfo}>
              {user?.name && (
                <Text style={[styles.userName, { color: colors.text }]}>{user.name}</Text>
              )}
              <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
            </View>
            <TouchableOpacity
              onPress={logout}
              style={[styles.logoutBtn, { backgroundColor: colors.error + '15' }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="log-out-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.loginCard, { backgroundColor: Colors.brand.accentGreen }]}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.8}
          >
            <View style={styles.loginCardContent}>
              <Ionicons name="person-circle-outline" size={36} color="#FFFFFF" />
              <View style={styles.loginCardText}>
                <Text style={styles.loginCardTitle}>
                  {language === 'cz' ? 'Přihlaste se' :
                   language === 'de' ? 'Melden Sie sich an' :
                   language === 'pl' ? 'Zaloguj się' : 'Sign in'}
                </Text>
                <Text style={styles.loginCardSubtitle}>
                  {language === 'cz' ? 'Pro nabíjení a platby' :
                   language === 'de' ? 'Zum Laden und Bezahlen' :
                   language === 'pl' ? 'Do ładowania i płatności' : 'For charging and payments'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* Credit Balance Card */}
        {isAuthenticated && (
          <View style={[styles.creditCard, { backgroundColor: colors.surface }]}>
            <View style={styles.creditInfo}>
              <Text style={[styles.creditLabel, { color: colors.textSecondary }]}>
                {language === 'cz' ? 'Kredit' :
                 language === 'de' ? 'Guthaben' :
                 language === 'pl' ? 'Saldo' : 'Credit'}
              </Text>
              <Text style={[styles.creditAmount, { color: colors.text }]}>
                {creditLoading ? '...' : balanceFormatted}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.topUpBtn, { backgroundColor: Colors.brand.accentGreen }]}
              onPress={() => topUp(100)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.topUpBtnText}>
                {language === 'cz' ? 'Dobít' :
                 language === 'de' ? 'Aufladen' :
                 language === 'pl' ? 'Doładuj' : 'Top Up'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

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

        {/* AutoCharge Section */}
        {isAuthenticated && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              AUTOCHARGE
            </Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
              <MenuItem
                icon="car-sport"
                label="AutoCharge"
                value={registeredVehicles.length > 0
                  ? `${registeredVehicles.length} ${language === 'cz' ? 'vozidel' : language === 'de' ? 'Fahrzeuge' : 'vehicles'}`
                  : undefined
                }
                onPress={() => setShowAutoCharge(!showAutoCharge)}
                iconColor={Colors.brand.accentGreen}
              />

              {showAutoCharge && (
                <View style={[styles.autoChargeContent, { backgroundColor: colors.surfaceSecondary }]}>
                  {autoChargeLoading ? (
                    <ActivityIndicator color={Colors.brand.accentGreen} style={{ padding: Layout.spacing.md }} />
                  ) : (
                    <>
                      {/* Registered Vehicles */}
                      {registeredVehicles.map((v) => (
                        <View key={v.id} style={styles.autoChargeItem}>
                          <Ionicons name="checkmark-circle" size={20} color={Colors.brand.accentGreen} />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.autoChargeTag, { color: colors.text }]}>
                              {v.description || v.id_tag}
                            </Text>
                            <Text style={[styles.autoChargeMeta, { color: colors.textMuted }]}>
                              {v.id_tag} • {v.status}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => handleDeleteVehicle(v)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Ionicons name="trash-outline" size={18} color={colors.error} />
                          </TouchableOpacity>
                        </View>
                      ))}

                      {/* Pending Vehicles */}
                      {pendingVehicles.map((v) => (
                        <View key={v.id}>
                          <View style={styles.autoChargeItem}>
                            <Ionicons name="help-circle" size={20} color="#F59E0B" />
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.autoChargeTag, { color: colors.text }]}>
                                {language === 'cz' ? 'Nové vozidlo' :
                                 language === 'de' ? 'Neues Fahrzeug' : 'New vehicle'}
                              </Text>
                              <Text style={[styles.autoChargeMeta, { color: colors.textMuted }]}>
                                {v.id_tag}
                              </Text>
                            </View>
                            {registeringTag !== v.id_tag && (
                              <TouchableOpacity
                                onPress={() => setRegisteringTag(v.id_tag)}
                                style={[styles.registerBtn, { backgroundColor: Colors.brand.accentGreen }]}
                              >
                                <Text style={styles.registerBtnText}>
                                  {language === 'cz' ? 'Přidat' :
                                   language === 'de' ? 'Hinzufügen' : 'Add'}
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>

                          {registeringTag === v.id_tag && (
                            <View style={styles.registerForm}>
                              <TextInput
                                style={[styles.registerInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                                value={vehicleDescription}
                                onChangeText={setVehicleDescription}
                                placeholder={language === 'cz' ? 'Název vozidla (např. Můj Enyaq)' :
                                            language === 'de' ? 'Fahrzeugname (z.B. Mein Enyaq)' : 'Vehicle name (e.g. My Enyaq)'}
                                placeholderTextColor={colors.textMuted}
                              />
                              <View style={styles.registerActions}>
                                <TouchableOpacity
                                  onPress={() => { setRegisteringTag(null); setVehicleDescription(''); }}
                                  style={[styles.cancelRegBtn, { borderColor: colors.border }]}
                                >
                                  <Text style={{ color: colors.textSecondary }}>
                                    {t.common.cancel}
                                  </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => handleRegisterVehicle(v.id_tag)}
                                  style={[styles.confirmRegBtn, { backgroundColor: Colors.brand.accentGreen }]}
                                >
                                  <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>
                                    {t.common.save}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}
                        </View>
                      ))}

                      {registeredVehicles.length === 0 && pendingVehicles.length === 0 && (
                        <Text style={[styles.autoChargeEmpty, { color: colors.textMuted }]}>
                          {language === 'cz' ? 'Připojte EV k naší stanici - vozidlo se automaticky rozpozná.' :
                           language === 'de' ? 'Schließen Sie Ihr EV an unsere Station an - es wird automatisch erkannt.' :
                           'Plug your EV into our station - it will be auto-detected.'}
                        </Text>
                      )}

                      {/* Manual MAC Registration */}
                      <TouchableOpacity
                        onPress={() => setShowManualMac(!showManualMac)}
                        style={[styles.addManualBtn, { borderColor: colors.border }]}
                      >
                        <Ionicons name="add-circle-outline" size={18} color={Colors.brand.accentGreen} />
                        <Text style={[styles.addManualBtnText, { color: Colors.brand.accentGreen }]}>
                          {language === 'cz' ? 'Zadat MAC adresu ručně' :
                           language === 'de' ? 'MAC-Adresse manuell eingeben' :
                           'Enter MAC address manually'}
                        </Text>
                      </TouchableOpacity>

                      {showManualMac && (
                        <View style={styles.registerForm}>
                          <TextInput
                            style={[styles.registerInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                            value={manualMac}
                            onChangeText={setManualMac}
                            placeholder="MAC (e.g. 98:ED:5C:89:BE:0E)"
                            placeholderTextColor={colors.textMuted}
                            autoCapitalize="characters"
                          />
                          <TextInput
                            style={[styles.registerInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                            value={manualMacName}
                            onChangeText={setManualMacName}
                            placeholder={language === 'cz' ? 'Název vozidla' :
                                        language === 'de' ? 'Fahrzeugname' : 'Vehicle name'}
                            placeholderTextColor={colors.textMuted}
                          />
                          <Text style={[styles.macHint, { color: colors.textMuted }]}>
                            {language === 'cz' ? 'Tesla: Ovládání → Software → Další info o vozidle\nVW ID: Infotainment → Nastavení → O vozidle' :
                             language === 'de' ? 'Tesla: Steuerung → Software → Zusätzliche Fahrzeuginfo\nVW ID: Infotainment → Einstellungen → Über das Fahrzeug' :
                             'Tesla: Controls → Software → Additional Vehicle Info\nVW ID: Infotainment → Settings → About the vehicle'}
                          </Text>
                          <View style={styles.registerActions}>
                            <TouchableOpacity
                              onPress={() => { setShowManualMac(false); setManualMac(''); setManualMacName(''); }}
                              style={[styles.cancelRegBtn, { borderColor: colors.border }]}
                            >
                              <Text style={{ color: colors.textSecondary }}>{t.common.cancel}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={handleManualMacRegister}
                              disabled={!manualMac.trim() || !manualMacName.trim()}
                              style={[
                                styles.confirmRegBtn,
                                { backgroundColor: Colors.brand.accentGreen },
                                (!manualMac.trim() || !manualMacName.trim()) && { opacity: 0.5 },
                              ]}
                            >
                              <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>
                                {t.common.save}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}

                      {/* RFID Cards Section */}
                      <View style={[styles.rfidDivider, { borderTopColor: colors.border }]}>
                        <Text style={[styles.rfidSectionTitle, { color: colors.textSecondary }]}>
                          {language === 'cz' ? 'RFID karty' :
                           language === 'de' ? 'RFID-Karten' : 'RFID Cards'}
                        </Text>
                      </View>

                      {rfidCards.map((card) => (
                        <View key={card.id} style={styles.autoChargeItem}>
                          <Ionicons name="card-outline" size={20} color="#3B82F6" />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.autoChargeTag, { color: colors.text }]}>
                              {card.description || card.id_tag}
                            </Text>
                            <Text style={[styles.autoChargeMeta, { color: colors.textMuted }]}>
                              {card.id_tag} • {card.status}
                            </Text>
                          </View>
                        </View>
                      ))}

                      <TouchableOpacity
                        onPress={() => setShowRfidForm(!showRfidForm)}
                        style={[styles.addManualBtn, { borderColor: colors.border }]}
                      >
                        <Ionicons name="add-circle-outline" size={18} color="#3B82F6" />
                        <Text style={[styles.addManualBtnText, { color: '#3B82F6' }]}>
                          {language === 'cz' ? 'Přidat RFID kartu' :
                           language === 'de' ? 'RFID-Karte hinzufügen' : 'Add RFID card'}
                        </Text>
                      </TouchableOpacity>

                      {showRfidForm && (
                        <View style={styles.registerForm}>
                          <TextInput
                            style={[styles.registerInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                            value={rfidTag}
                            onChangeText={setRfidTag}
                            placeholder={language === 'cz' ? 'Číslo RFID karty' :
                                        language === 'de' ? 'RFID-Kartennummer' : 'RFID card number'}
                            placeholderTextColor={colors.textMuted}
                            autoCapitalize="characters"
                          />
                          <TextInput
                            style={[styles.registerInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                            value={rfidName}
                            onChangeText={setRfidName}
                            placeholder={language === 'cz' ? 'Název karty' :
                                        language === 'de' ? 'Kartenname' : 'Card name'}
                            placeholderTextColor={colors.textMuted}
                          />
                          <View style={styles.registerActions}>
                            <TouchableOpacity
                              onPress={() => { setShowRfidForm(false); setRfidTag(''); setRfidName(''); }}
                              style={[styles.cancelRegBtn, { borderColor: colors.border }]}
                            >
                              <Text style={{ color: colors.textSecondary }}>{t.common.cancel}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={handleRfidRegister}
                              disabled={!rfidTag.trim() || !rfidName.trim()}
                              style={[
                                styles.confirmRegBtn,
                                { backgroundColor: '#3B82F6' },
                                (!rfidTag.trim() || !rfidName.trim()) && { opacity: 0.5 },
                              ]}
                            >
                              <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>
                                {t.common.save}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {/* My Stuff Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t.profile.reservations}
          </Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
            <MenuItem
              icon="calendar"
              label={t.profile.reservations}
              onPress={() => router.push('/reservations')}
              iconColor="#8B5CF6"
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem
              icon="time"
              label={t.profile.history}
              onPress={() => router.push('/history')}
              iconColor="#06B6D4"
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem
              icon="notifications-circle"
              label={t.profile.priceAlerts}
              onPress={() => setShowPriceAlertEditor(!showPriceAlertEditor)}
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
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.xl,
    marginBottom: Layout.spacing.lg,
    gap: Layout.spacing.md,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: Layout.fontSize.xl,
    fontWeight: '700',
    color: Colors.brand.accentGreen,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: Layout.fontSize.sm,
    marginTop: 2,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.xl,
    marginBottom: Layout.spacing.lg,
  },
  creditInfo: {
    gap: 2,
  },
  creditLabel: {
    fontSize: Layout.fontSize.sm,
  },
  creditAmount: {
    fontSize: Layout.fontSize.xxl,
    fontWeight: '700',
  },
  topUpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.lg,
    gap: 4,
  },
  topUpBtnText: {
    color: '#FFFFFF',
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
  },
  autoChargeContent: {
    marginHorizontal: Layout.spacing.md,
    marginBottom: Layout.spacing.md,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.md,
  },
  autoChargeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
  },
  autoChargeTag: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '500',
  },
  autoChargeMeta: {
    fontSize: Layout.fontSize.xs,
    marginTop: 1,
  },
  autoChargeEmpty: {
    fontSize: Layout.fontSize.sm,
    textAlign: 'center',
    padding: Layout.spacing.md,
    lineHeight: 20,
  },
  registerBtn: {
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: 6,
    borderRadius: Layout.borderRadius.md,
  },
  registerBtnText: {
    color: '#FFFFFF',
    fontSize: Layout.fontSize.xs,
    fontWeight: '600',
  },
  registerForm: {
    paddingLeft: 36,
    paddingBottom: Layout.spacing.sm,
    gap: Layout.spacing.sm,
  },
  registerInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: Layout.borderRadius.md,
    paddingHorizontal: Layout.spacing.md,
    fontSize: Layout.fontSize.sm,
  },
  registerActions: {
    flexDirection: 'row',
    gap: Layout.spacing.sm,
  },
  cancelRegBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
  },
  confirmRegBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: Layout.borderRadius.md,
  },
  addManualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Layout.spacing.sm,
    marginTop: Layout.spacing.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Layout.borderRadius.md,
  },
  addManualBtnText: {
    fontSize: Layout.fontSize.xs,
    fontWeight: '600',
  },
  macHint: {
    fontSize: 11,
    lineHeight: 16,
    paddingHorizontal: 4,
  },
  rfidDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: Layout.spacing.md,
    paddingTop: Layout.spacing.md,
  },
  rfidSectionTitle: {
    fontSize: Layout.fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Layout.spacing.sm,
  },
  loginCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.xl,
    marginBottom: Layout.spacing.lg,
  },
  loginCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.md,
  },
  loginCardText: {
    gap: 2,
  },
  loginCardTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loginCardSubtitle: {
    fontSize: Layout.fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
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
