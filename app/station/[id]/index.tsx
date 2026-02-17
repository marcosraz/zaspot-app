/**
 * Station Detail Screen - Real-time connector status + charging controls
 * Shows charge point details, connector status (5s polling), start/stop charging
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../context/AuthContext';
import { useFavorites } from '../../../context/FavoritesContext';
import { useNotifications } from '../../../context/NotificationsContext';
import { Colors } from '../../../constants/colors';
import { Layout } from '../../../constants/layout';
import {
  ChargePointDetail,
  Connector,
  ChargingSession,
  fetchChargePoint,
  fetchActiveSessions,
  startCharging,
  stopCharging,
  getConnectorStatusColor,
  formatDuration,
  formatEnergy,
} from '../../../lib/charging';
import { fetchEffectivePrices, EffectivePrices, formatPrice } from '../../../lib/pricing';
import { createReservation } from '../../../lib/reservations';

// ─── Translations ────────────────────────────────

const labels: Record<string, Record<string, string>> = {
  cz: {
    loading: 'Načítání stanice...',
    error: 'Stanice nenalezena',
    back: 'Zpět',
    online: 'Online',
    offline: 'Offline',
    connectors: 'Konektory',
    startCharging: 'Spustit nabíjení',
    stopCharging: 'Zastavit nabíjení',
    navigate: 'Navigovat',
    favorite: 'Oblíbená',
    loginRequired: 'Pro nabíjení se přihlaste',
    login: 'Přihlásit se',
    starting: 'Spouštím...',
    stopping: 'Zastavuji...',
    activeSession: 'Aktivní nabíjení',
    energy: 'Energie',
    duration: 'Doba',
    cost: 'Náklady',
    power: 'Výkon',
    soc: 'Stav baterie',
    stats: 'Statistiky',
    totalSessions: 'Celkem nabíjení',
    totalEnergy: 'Celkem energie',
    confirmStop: 'Opravdu chcete zastavit nabíjení?',
    yes: 'Ano',
    no: 'Ne',
    errorStarting: 'Chyba při spouštění nabíjení',
    errorStopping: 'Chyba při zastavování nabíjení',
    insufficientCredit: 'Nedostatečný kredit (min. 10 CZK)',
    stationOffline: 'Stanice je offline',
    currentPrices: 'Aktuální ceny',
    acPrice: 'AC nabíjení',
    dcPrice: 'DC nabíjení',
    spotPrice: 'Spotová cena',
    perKwh: 'CZK/kWh',
    timeSlot: 'Časový slot',
    Available: 'Dostupný',
    Charging: 'Nabíjí',
    Preparing: 'Připravuje se',
    Faulted: 'Porucha',
    Unavailable: 'Nedostupný',
    SuspendedEV: 'Pozastaveno (EV)',
    SuspendedEVSE: 'Pozastaveno',
    reserve: 'Rezervovat',
    reserveConfirm: 'Rezervovat konektor na 30 minut?',
    reserveDeposit: 'Záloha',
    reserveSuccess: 'Rezervace vytvořena',
    reserveError: 'Chyba při rezervaci',
    reserving: 'Rezervuji...',
  },
  en: {
    loading: 'Loading station...',
    error: 'Station not found',
    back: 'Back',
    online: 'Online',
    offline: 'Offline',
    connectors: 'Connectors',
    startCharging: 'Start Charging',
    stopCharging: 'Stop Charging',
    navigate: 'Navigate',
    favorite: 'Favorite',
    loginRequired: 'Sign in to start charging',
    login: 'Sign In',
    starting: 'Starting...',
    stopping: 'Stopping...',
    activeSession: 'Active Charging',
    energy: 'Energy',
    duration: 'Duration',
    cost: 'Cost',
    power: 'Power',
    soc: 'Battery',
    stats: 'Statistics',
    totalSessions: 'Total sessions',
    totalEnergy: 'Total energy',
    confirmStop: 'Do you want to stop charging?',
    yes: 'Yes',
    no: 'No',
    errorStarting: 'Error starting charging',
    errorStopping: 'Error stopping charging',
    insufficientCredit: 'Insufficient credit (min. 10 CZK)',
    stationOffline: 'Station is offline',
    currentPrices: 'Current Prices',
    acPrice: 'AC Charging',
    dcPrice: 'DC Charging',
    spotPrice: 'Spot Price',
    perKwh: 'CZK/kWh',
    timeSlot: 'Time slot',
    Available: 'Available',
    Charging: 'Charging',
    Preparing: 'Preparing',
    Faulted: 'Faulted',
    Unavailable: 'Unavailable',
    SuspendedEV: 'Suspended (EV)',
    SuspendedEVSE: 'Suspended',
    reserve: 'Reserve',
    reserveConfirm: 'Reserve connector for 30 minutes?',
    reserveDeposit: 'Deposit',
    reserveSuccess: 'Reservation created',
    reserveError: 'Reservation error',
    reserving: 'Reserving...',
  },
  de: {
    loading: 'Station wird geladen...',
    error: 'Station nicht gefunden',
    back: 'Zurück',
    online: 'Online',
    offline: 'Offline',
    connectors: 'Anschlüsse',
    startCharging: 'Laden starten',
    stopCharging: 'Laden stoppen',
    navigate: 'Navigieren',
    favorite: 'Favorit',
    loginRequired: 'Anmelden zum Laden',
    login: 'Anmelden',
    starting: 'Wird gestartet...',
    stopping: 'Wird gestoppt...',
    activeSession: 'Aktives Laden',
    energy: 'Energie',
    duration: 'Dauer',
    cost: 'Kosten',
    power: 'Leistung',
    soc: 'Akkustand',
    stats: 'Statistiken',
    totalSessions: 'Gesamte Ladevorgänge',
    totalEnergy: 'Gesamte Energie',
    confirmStop: 'Möchten Sie das Laden stoppen?',
    yes: 'Ja',
    no: 'Nein',
    errorStarting: 'Fehler beim Starten',
    errorStopping: 'Fehler beim Stoppen',
    insufficientCredit: 'Unzureichendes Guthaben (min. 10 CZK)',
    stationOffline: 'Station ist offline',
    currentPrices: 'Aktuelle Preise',
    acPrice: 'AC-Laden',
    dcPrice: 'DC-Laden',
    spotPrice: 'Spotpreis',
    perKwh: 'CZK/kWh',
    timeSlot: 'Zeitfenster',
    Available: 'Verfügbar',
    Charging: 'Lädt',
    Preparing: 'Vorbereitung',
    Faulted: 'Störung',
    Unavailable: 'Nicht verfügbar',
    SuspendedEV: 'Pausiert (EV)',
    SuspendedEVSE: 'Pausiert',
    reserve: 'Reservieren',
    reserveConfirm: 'Anschluss für 30 Min reservieren?',
    reserveDeposit: 'Kaution',
    reserveSuccess: 'Reservierung erstellt',
    reserveError: 'Reservierungsfehler',
    reserving: 'Reserviere...',
  },
  pl: {
    loading: 'Ładowanie stacji...',
    error: 'Stacja nie znaleziona',
    back: 'Wstecz',
    online: 'Online',
    offline: 'Offline',
    connectors: 'Złącza',
    startCharging: 'Rozpocznij ładowanie',
    stopCharging: 'Zatrzymaj ładowanie',
    navigate: 'Nawiguj',
    favorite: 'Ulubiona',
    loginRequired: 'Zaloguj się, aby ładować',
    login: 'Zaloguj się',
    starting: 'Uruchamianie...',
    stopping: 'Zatrzymywanie...',
    activeSession: 'Aktywne ładowanie',
    energy: 'Energia',
    duration: 'Czas',
    cost: 'Koszt',
    power: 'Moc',
    soc: 'Bateria',
    stats: 'Statystyki',
    totalSessions: 'Wszystkie sesje',
    totalEnergy: 'Całkowita energia',
    confirmStop: 'Czy chcesz zatrzymać ładowanie?',
    yes: 'Tak',
    no: 'Nie',
    errorStarting: 'Błąd uruchamiania ładowania',
    errorStopping: 'Błąd zatrzymywania ładowania',
    insufficientCredit: 'Niewystarczające saldo (min. 10 CZK)',
    stationOffline: 'Stacja jest offline',
    currentPrices: 'Aktualne ceny',
    acPrice: 'Ładowanie AC',
    dcPrice: 'Ładowanie DC',
    spotPrice: 'Cena spot',
    perKwh: 'CZK/kWh',
    timeSlot: 'Przedział czasu',
    Available: 'Dostępny',
    Charging: 'Ładuje',
    Preparing: 'Przygotowanie',
    Faulted: 'Awaria',
    Unavailable: 'Niedostępny',
    SuspendedEV: 'Wstrzymano (EV)',
    SuspendedEVSE: 'Wstrzymano',
    reserve: 'Zarezerwuj',
    reserveConfirm: 'Zarezerwować złącze na 30 minut?',
    reserveDeposit: 'Kaucja',
    reserveSuccess: 'Rezerwacja utworzona',
    reserveError: 'Błąd rezerwacji',
    reserving: 'Rezerwuję...',
  },
};

// ─── Component ───────────────────────────────────

export default function StationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { notifyChargingStarted, notifyChargingComplete } = useNotifications();

  const l = labels[language] || labels.en;

  const [station, setStation] = useState<ChargePointDetail | null>(null);
  const [sessions, setSessions] = useState<ChargingSession[]>([]);
  const [prices, setPrices] = useState<EffectivePrices | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // 'start-N' or 'stop-N'
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Data Fetching ─────────────────────────────

  const loadStation = useCallback(async (showLoader = false) => {
    if (!id) return;
    if (showLoader) setLoading(true);

    const [data, effectivePrices] = await Promise.all([
      fetchChargePoint(id),
      fetchEffectivePrices(),
    ]);

    if (data) {
      setStation(data);
      // Fetch active sessions
      const activeSessions = await fetchActiveSessions(data.chargePointId);
      setSessions(activeSessions);
    }
    if (effectivePrices) setPrices(effectivePrices);

    if (showLoader) setLoading(false);
  }, [id]);

  // Initial load
  useEffect(() => {
    loadStation(true);
  }, [loadStation]);

  // Poll every 5 seconds for real-time connector status
  useEffect(() => {
    pollRef.current = setInterval(() => {
      loadStation(false);
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadStation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStation(false);
    setRefreshing(false);
  };

  // ─── Actions ───────────────────────────────────

  const handleStartCharging = async (connector: Connector) => {
    if (!isAuthenticated) {
      router.push('/(auth)/login');
      return;
    }
    if (!station) return;

    setActionLoading(`start-${connector.connectorId}`);
    const result = await startCharging(station.chargePointId, connector.connectorId);

    if (result.success) {
      notifyChargingStarted(station.name || station.chargePointId);
      await loadStation(false);
    } else {
      const errorMsg = result.error === 'Insufficient credit'
        ? l.insufficientCredit
        : result.error === 'Station offline'
        ? l.stationOffline
        : result.error || l.errorStarting;

      Alert.alert(l.errorStarting, errorMsg);
    }
    setActionLoading(null);
  };

  const handleStopCharging = async (session: ChargingSession) => {
    if (!station) return;

    Alert.alert(l.stopCharging, l.confirmStop, [
      { text: l.no, style: 'cancel' },
      {
        text: l.yes,
        style: 'destructive',
        onPress: async () => {
          setActionLoading(`stop-${session.transactionId}`);
          const result = await stopCharging(station.chargePointId, session.transactionId);

          if (result.success) {
            notifyChargingComplete(
              station.name || station.chargePointId,
              session.energyKwh || 0,
              session.totalCostCzk ?? undefined
            );
          } else {
            Alert.alert(l.errorStopping, result.error || l.errorStopping);
          }
          await loadStation(false);
          setActionLoading(null);
        },
      },
    ]);
  };

  const handleReserve = async (connector: Connector) => {
    if (!isAuthenticated) {
      router.push('/(auth)/login');
      return;
    }
    if (!station) return;

    // Calculate the next 30-minute slot boundary
    const now = new Date();
    const mins = now.getMinutes();
    const nextSlot = new Date(now);
    nextSlot.setMinutes(mins < 30 ? 30 : 60, 0, 0);
    if (mins >= 30) nextSlot.setHours(nextSlot.getHours());

    const startTime = nextSlot.toISOString();
    const timeStr = nextSlot.toLocaleTimeString(language === 'cz' ? 'cs-CZ' : 'en-US', {
      hour: '2-digit', minute: '2-digit',
    });

    const depositText = station.reservationDepositCzk
      ? `\n${l.reserveDeposit}: ${station.reservationDepositCzk} CZK`
      : '';

    Alert.alert(
      l.reserve,
      `${l.reserveConfirm}\n${timeStr} — ${new Date(nextSlot.getTime() + 30 * 60000).toLocaleTimeString(language === 'cz' ? 'cs-CZ' : 'en-US', { hour: '2-digit', minute: '2-digit' })}${depositText}`,
      [
        { text: l.no, style: 'cancel' },
        {
          text: l.reserve,
          onPress: async () => {
            setActionLoading(`reserve-${connector.connectorId}`);
            const result = await createReservation(
              station.chargePointId,
              connector.connectorId,
              startTime,
              30
            );
            if (result.success) {
              Alert.alert(l.reserveSuccess, `${timeStr}`);
            } else {
              Alert.alert(l.reserveError, result.error || l.reserveError);
            }
            setActionLoading(null);
          },
        },
      ]
    );
  };

  const handleNavigate = () => {
    if (!station?.locationLat || !station?.locationLng) return;
    const url = Platform.select({
      ios: `maps://app?daddr=${station.locationLat},${station.locationLng}`,
      android: `google.navigation:q=${station.locationLat},${station.locationLng}`,
    });
    if (url) Linking.openURL(url);
  };

  // ─── Helpers ───────────────────────────────────

  const getActiveSessionForConnector = (connectorId: number): ChargingSession | undefined => {
    return sessions.find(s => s.connectorId === connectorId && s.status === 'active');
  };

  const getSessionDurationMinutes = (session: ChargingSession): number => {
    const start = new Date(session.startTimestamp).getTime();
    const now = Date.now();
    return (now - start) / 60000;
  };

  const getLatestMeterValue = (session: ChargingSession) => {
    if (!session.meterValues || session.meterValues.length === 0) return null;
    return session.meterValues[session.meterValues.length - 1];
  };

  // ─── Loading State ─────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brand.accentGreen} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{l.loading}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!station) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{l.error}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={{ color: Colors.brand.accentGreen, fontWeight: '600' }}>{l.back}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Render ────────────────────────────────────

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBackBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-down" size={28} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {station.name || station.chargePointId}
          </Text>
          <View style={styles.headerStatus}>
            <View style={[styles.statusDot, { backgroundColor: station.isOnline ? '#16A34A' : '#DC2626' }]} />
            <Text style={[styles.headerSubtitle, { color: station.isOnline ? '#16A34A' : colors.error }]}>
              {station.isOnline ? l.online : l.offline}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => toggleFavorite(station.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={isFavorite(station.id) ? 'heart' : 'heart-outline'}
            size={24}
            color={isFavorite(station.id) ? '#EF4444' : colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brand.accentGreen} />
        }
      >
        {/* Station Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          {station.locationAddress && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {station.locationAddress}
              </Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Ionicons name="flash-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {station.vendor ? `${station.vendor} ${station.model || ''}` : station.chargePointId}
              {station.maxPowerKw ? ` • ${station.maxPowerKw} kW` : ''}
            </Text>
          </View>

          {/* Navigate Button */}
          {station.locationLat && station.locationLng && (
            <TouchableOpacity
              onPress={handleNavigate}
              style={[styles.navigateBtn, { backgroundColor: Colors.brand.accentGreen + '15' }]}
              activeOpacity={0.7}
            >
              <Ionicons name="navigate" size={18} color={Colors.brand.accentGreen} />
              <Text style={[styles.navigateBtnText, { color: Colors.brand.accentGreen }]}>
                {l.navigate}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Current Prices */}
        {prices && (
          <View style={[styles.priceCard, { backgroundColor: colors.surface }]}>
            <View style={styles.priceCardHeader}>
              <Ionicons name="flash" size={18} color={Colors.brand.accentGreen} />
              <Text style={[styles.priceCardTitle, { color: colors.text }]}>
                {l.currentPrices}
              </Text>
              <Text style={[styles.priceTimeSlot, { color: colors.textMuted }]}>
                {prices.timeSlot}
              </Text>
            </View>

            <View style={styles.priceRow}>
              <View style={[styles.priceBox, { backgroundColor: Colors.brand.accentGreen + '12' }]}>
                <Text style={[styles.priceBoxLabel, { color: colors.textSecondary }]}>
                  {l.acPrice}
                </Text>
                <Text style={[styles.priceBoxValue, { color: Colors.brand.accentGreen }]}>
                  {formatPrice(prices.acPrice)}
                </Text>
                <Text style={[styles.priceBoxUnit, { color: colors.textMuted }]}>
                  {l.perKwh}
                </Text>
              </View>
              <View style={[styles.priceBox, { backgroundColor: '#EF4444' + '12' }]}>
                <Text style={[styles.priceBoxLabel, { color: colors.textSecondary }]}>
                  {l.dcPrice}
                </Text>
                <Text style={[styles.priceBoxValue, { color: '#EF4444' }]}>
                  {formatPrice(prices.dcPrice)}
                </Text>
                <Text style={[styles.priceBoxUnit, { color: colors.textMuted }]}>
                  {l.perKwh}
                </Text>
              </View>
            </View>

            <View style={[styles.spotPriceRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.spotPriceLabel, { color: colors.textMuted }]}>
                {l.spotPrice}: {formatPrice(prices.spotPrice)} CZK/kWh
              </Text>
            </View>
          </View>
        )}

        {/* Connectors */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {l.connectors}
        </Text>

        {station.connectors.map((connector) => {
          const activeSession = getActiveSessionForConnector(connector.connectorId);
          const statusColor = getConnectorStatusColor(connector.status);
          const isCharging = connector.status === 'Charging';
          const isAvailable = connector.status === 'Available';
          const isStarting = actionLoading === `start-${connector.connectorId}`;
          const latestMeter = activeSession ? getLatestMeterValue(activeSession) : null;

          return (
            <View key={connector.connectorId} style={[styles.connectorCard, { backgroundColor: colors.surface }]}>
              {/* Connector Header */}
              <View style={styles.connectorHeader}>
                <View style={styles.connectorInfo}>
                  <View style={[styles.connectorBadge, { backgroundColor: statusColor + '20' }]}>
                    <Ionicons
                      name={isCharging ? 'flash' : 'plug-outline' as any}
                      size={20}
                      color={statusColor}
                    />
                  </View>
                  <View>
                    <Text style={[styles.connectorName, { color: colors.text }]}>
                      {connector.connectorType || `Connector ${connector.connectorId}`}
                    </Text>
                    <Text style={[styles.connectorMeta, { color: colors.textMuted }]}>
                      #{connector.connectorId}
                      {connector.maxPowerKw ? ` • ${connector.maxPowerKw} kW` : ''}
                    </Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                  <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {l[connector.status] || connector.status}
                  </Text>
                </View>
              </View>

              {/* Active Session Details */}
              {activeSession && (
                <View style={[styles.sessionCard, { backgroundColor: colors.background }]}>
                  <View style={styles.sessionHeader}>
                    <Ionicons name="flash" size={16} color={Colors.brand.accentGreen} />
                    <Text style={[styles.sessionTitle, { color: Colors.brand.accentGreen }]}>
                      {l.activeSession}
                    </Text>
                  </View>

                  <View style={styles.sessionStats}>
                    <View style={styles.sessionStat}>
                      <Text style={[styles.sessionStatLabel, { color: colors.textMuted }]}>
                        {l.energy}
                      </Text>
                      <Text style={[styles.sessionStatValue, { color: colors.text }]}>
                        {formatEnergy(activeSession.energyKwh)} kWh
                      </Text>
                    </View>
                    <View style={styles.sessionStat}>
                      <Text style={[styles.sessionStatLabel, { color: colors.textMuted }]}>
                        {l.duration}
                      </Text>
                      <Text style={[styles.sessionStatValue, { color: colors.text }]}>
                        {formatDuration(getSessionDurationMinutes(activeSession))}
                      </Text>
                    </View>
                    {latestMeter?.powerW != null && (
                      <View style={styles.sessionStat}>
                        <Text style={[styles.sessionStatLabel, { color: colors.textMuted }]}>
                          {l.power}
                        </Text>
                        <Text style={[styles.sessionStatValue, { color: colors.text }]}>
                          {(latestMeter.powerW / 1000).toFixed(1)} kW
                        </Text>
                      </View>
                    )}
                    {latestMeter?.socPercent != null && (
                      <View style={styles.sessionStat}>
                        <Text style={[styles.sessionStatLabel, { color: colors.textMuted }]}>
                          {l.soc}
                        </Text>
                        <Text style={[styles.sessionStatValue, { color: colors.text }]}>
                          {latestMeter.socPercent}%
                        </Text>
                      </View>
                    )}
                  </View>

                  {activeSession.totalCostCzk != null && (
                    <View style={[styles.costRow, { borderTopColor: colors.border }]}>
                      <Text style={[styles.costLabel, { color: colors.textSecondary }]}>{l.cost}</Text>
                      <Text style={[styles.costValue, { color: colors.text }]}>
                        {activeSession.totalCostCzk.toFixed(2)} CZK
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Action Button */}
              <View style={styles.connectorAction}>
                {isCharging && activeSession ? (
                  <TouchableOpacity
                    onPress={() => handleStopCharging(activeSession)}
                    disabled={actionLoading !== null}
                    style={[styles.actionBtn, styles.stopBtn]}
                    activeOpacity={0.8}
                  >
                    {actionLoading === `stop-${activeSession.transactionId}` ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Ionicons name="stop-circle" size={20} color="#FFFFFF" />
                        <Text style={styles.actionBtnText}>{l.stopCharging}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : isAvailable ? (
                  isAuthenticated ? (
                    <>
                      <TouchableOpacity
                        onPress={() => handleStartCharging(connector)}
                        disabled={actionLoading !== null || !station.isOnline}
                        style={[
                          styles.actionBtn,
                          styles.startBtn,
                          (!station.isOnline || actionLoading !== null) && styles.btnDisabled,
                        ]}
                        activeOpacity={0.8}
                      >
                        {isStarting ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <>
                            <Ionicons name="flash" size={20} color="#FFFFFF" />
                            <Text style={styles.actionBtnText}>{l.startCharging}</Text>
                          </>
                        )}
                      </TouchableOpacity>
                      {station.reservationEnabled && (
                        <TouchableOpacity
                          onPress={() => handleReserve(connector)}
                          disabled={actionLoading !== null}
                          style={[styles.actionBtn, styles.reserveBtn]}
                          activeOpacity={0.8}
                        >
                          {actionLoading === `reserve-${connector.connectorId}` ? (
                            <ActivityIndicator color="#8B5CF6" size="small" />
                          ) : (
                            <>
                              <Ionicons name="calendar-outline" size={20} color="#8B5CF6" />
                              <Text style={[styles.actionBtnText, { color: '#8B5CF6' }]}>{l.reserve}</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                    </>
                  ) : (
                    <TouchableOpacity
                      onPress={() => router.push('/(auth)/login')}
                      style={[styles.actionBtn, styles.loginBtn, { borderColor: Colors.brand.accentGreen }]}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="log-in-outline" size={20} color={Colors.brand.accentGreen} />
                      <Text style={[styles.actionBtnText, { color: Colors.brand.accentGreen }]}>
                        {l.loginRequired}
                      </Text>
                    </TouchableOpacity>
                  )
                ) : null}
              </View>
            </View>
          );
        })}

        {/* Station Stats */}
        {station.stats && station.stats.totalSessions > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{l.stats}</Text>
            <View style={[styles.statsCard, { backgroundColor: colors.surface }]}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Ionicons name="flash-outline" size={20} color={Colors.brand.accentGreen} />
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {station.stats.totalSessions}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>{l.totalSessions}</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="battery-charging-outline" size={20} color="#3B82F6" />
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {station.stats.totalEnergyKwh.toFixed(0)} kWh
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>{l.totalEnergy}</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Bottom Spacer */}
        <View style={{ height: Layout.spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Layout.spacing.md,
  },
  loadingText: {
    fontSize: Layout.fontSize.md,
  },
  backBtn: {
    paddingVertical: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.lg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Layout.spacing.md,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '700',
  },
  headerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerSubtitle: {
    fontSize: Layout.fontSize.xs,
    fontWeight: '600',
  },

  scrollContent: {
    padding: Layout.spacing.md,
  },

  // Info Card
  infoCard: {
    borderRadius: Layout.borderRadius.xl,
    padding: Layout.spacing.md,
    marginBottom: Layout.spacing.md,
    gap: Layout.spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
  },
  infoText: {
    fontSize: Layout.fontSize.sm,
    flex: 1,
  },
  navigateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.lg,
    gap: Layout.spacing.sm,
    marginTop: Layout.spacing.xs,
  },
  navigateBtnText: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
  },

  // Price Card
  priceCard: {
    borderRadius: Layout.borderRadius.xl,
    padding: Layout.spacing.md,
    marginBottom: Layout.spacing.md,
  },
  priceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
    marginBottom: Layout.spacing.md,
  },
  priceCardTitle: {
    fontSize: Layout.fontSize.md,
    fontWeight: '700',
    flex: 1,
  },
  priceTimeSlot: {
    fontSize: Layout.fontSize.xs,
  },
  priceRow: {
    flexDirection: 'row',
    gap: Layout.spacing.sm,
  },
  priceBox: {
    flex: 1,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  priceBoxLabel: {
    fontSize: Layout.fontSize.xs,
    fontWeight: '600',
  },
  priceBoxValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
  },
  priceBoxUnit: {
    fontSize: Layout.fontSize.xs,
  },
  spotPriceRow: {
    marginTop: Layout.spacing.md,
    paddingTop: Layout.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  spotPriceLabel: {
    fontSize: Layout.fontSize.xs,
  },

  // Section
  sectionTitle: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Layout.spacing.sm,
    marginTop: Layout.spacing.sm,
    marginLeft: Layout.spacing.xs,
  },

  // Connector Card
  connectorCard: {
    borderRadius: Layout.borderRadius.xl,
    padding: Layout.spacing.md,
    marginBottom: Layout.spacing.sm,
  },
  connectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  connectorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.md,
    flex: 1,
  },
  connectorBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectorName: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
  },
  connectorMeta: {
    fontSize: Layout.fontSize.xs,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Layout.borderRadius.full,
    gap: 6,
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: Layout.fontSize.xs,
    fontWeight: '600',
  },

  // Active Session
  sessionCard: {
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.md,
    marginTop: Layout.spacing.md,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Layout.spacing.md,
  },
  sessionTitle: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '700',
  },
  sessionStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.md,
  },
  sessionStat: {
    minWidth: '40%',
    gap: 2,
  },
  sessionStatLabel: {
    fontSize: Layout.fontSize.xs,
  },
  sessionStatValue: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '700',
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Layout.spacing.md,
    paddingTop: Layout.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  costLabel: {
    fontSize: Layout.fontSize.sm,
  },
  costValue: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '700',
  },

  // Action Buttons
  connectorAction: {
    marginTop: Layout.spacing.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: Layout.borderRadius.lg,
    gap: Layout.spacing.sm,
  },
  startBtn: {
    backgroundColor: Colors.brand.accentGreen,
  },
  stopBtn: {
    backgroundColor: '#DC2626',
  },
  loginBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  reserveBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#8B5CF6',
    marginTop: Layout.spacing.sm,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: Layout.fontSize.md,
    fontWeight: '700',
  },

  // Stats
  statsCard: {
    borderRadius: Layout.borderRadius.xl,
    padding: Layout.spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: Layout.fontSize.xs,
  },
});
