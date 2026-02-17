/**
 * Reservations Screen
 * Shows upcoming and past reservations with cancel functionality
 */

import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { useNotifications } from '../../context/NotificationsContext';
import { Reservation, fetchReservations, cancelReservation } from '../../lib/reservations';

export default function ReservationsScreen() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { scheduleReservationReminder, cancelReservationReminder } = useNotifications();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  const loadReservations = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    const data = await fetchReservations();
    setReservations(data);
    setLoading(false);

    // Schedule reminders for upcoming confirmed reservations
    const now = new Date();
    data
      .filter(r => ['pending', 'confirmed'].includes(r.status) && new Date(r.start_time) > now)
      .forEach(r => scheduleReservationReminder(r.id, r.charge_point_name, r.start_time));
  }, [isAuthenticated, scheduleReservationReminder]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReservations();
    setRefreshing(false);
  };

  const handleCancel = (reservation: Reservation) => {
    Alert.alert(
      t.reservations.cancel,
      language === 'cz' ? 'Opravdu chcete zrušit tuto rezervaci?' :
      language === 'de' ? 'Möchten Sie diese Reservierung stornieren?' :
      'Do you want to cancel this reservation?',
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.reservations.cancel,
          style: 'destructive',
          onPress: async () => {
            const result = await cancelReservation(reservation.id);
            if (result.success) {
              cancelReservationReminder(reservation.id);
              loadReservations();
            } else {
              Alert.alert(t.common.error, result.error || 'Cancel failed');
            }
          },
        },
      ]
    );
  };

  const now = new Date();
  const upcoming = reservations.filter(r =>
    ['pending', 'confirmed', 'active'].includes(r.status) && new Date(r.end_time) > now
  );
  const past = reservations.filter(r =>
    ['completed', 'cancelled', 'expired'].includes(r.status) || new Date(r.end_time) <= now
  );

  const currentData = activeTab === 'upcoming' ? upcoming : past;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'active': return Colors.brand.accentGreen;
      case 'pending': return '#F59E0B';
      case 'cancelled': return '#DC2626';
      case 'completed': return '#6B7280';
      case 'expired': return '#9CA3AF';
      default: return '#6B7280';
    }
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(language === 'cz' ? 'cs-CZ' : language === 'de' ? 'de-DE' : 'en-US', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t.reservations.title}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="log-in-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {language === 'cz' ? 'Pro zobrazení rezervací se přihlaste.' :
             language === 'de' ? 'Melden Sie sich an, um Reservierungen zu sehen.' :
             'Sign in to see your reservations.'}
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/login')}
            style={[styles.loginBtn, { backgroundColor: Colors.brand.accentGreen }]}
          >
            <Text style={styles.loginBtnText}>
              {language === 'cz' ? 'Přihlásit se' : language === 'de' ? 'Anmelden' : 'Sign In'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderReservation = ({ item: res }: { item: Reservation }) => {
    const statusColor = getStatusColor(res.status);
    const canCancel = ['pending', 'confirmed'].includes(res.status);

    return (
      <View style={[styles.resCard, { backgroundColor: colors.surface }]}>
        <View style={styles.resHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.resStation, { color: colors.text }]} numberOfLines={1}>
              {res.charge_point_name}
            </Text>
            <Text style={[styles.resTime, { color: colors.textSecondary }]}>
              {formatDateTime(res.start_time)} — {formatDateTime(res.end_time)}
            </Text>
          </View>
          <View style={[styles.resBadge, { backgroundColor: statusColor + '15' }]}>
            <Text style={[styles.resBadgeText, { color: statusColor }]}>
              {t.reservations[res.status as keyof typeof t.reservations] || res.status}
            </Text>
          </View>
        </View>

        {res.deposit_czk > 0 && (
          <Text style={[styles.resDeposit, { color: colors.textMuted }]}>
            {language === 'cz' ? 'Záloha' : language === 'de' ? 'Kaution' : 'Deposit'}: {res.deposit_czk} CZK
          </Text>
        )}

        {canCancel && (
          <TouchableOpacity
            onPress={() => handleCancel(res)}
            style={[styles.cancelBtn, { borderColor: colors.error }]}
          >
            <Ionicons name="close-circle-outline" size={18} color={colors.error} />
            <Text style={[styles.cancelBtnText, { color: colors.error }]}>{t.reservations.cancel}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t.reservations.title}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'upcoming' ? Colors.brand.accentGreen : colors.textSecondary }
          ]}>
            {t.reservations.upcoming} ({upcoming.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.tabActive]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'past' ? Colors.brand.accentGreen : colors.textSecondary }
          ]}>
            {t.reservations.past} ({past.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={Colors.brand.accentGreen} />
        </View>
      ) : currentData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t.reservations.noReservations}
          </Text>
        </View>
      ) : (
        <FlatList
          data={currentData}
          renderItem={renderReservation}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brand.accentGreen} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.md,
  },
  headerTitle: {
    fontSize: Layout.fontSize.xl,
    fontWeight: '700',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: Layout.spacing.md,
    borderRadius: Layout.borderRadius.lg,
    marginBottom: Layout.spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: Layout.spacing.md,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.brand.accentGreen,
  },
  tabText: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
  },
  listContent: {
    padding: Layout.spacing.md,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.xl,
  },
  emptyText: {
    fontSize: Layout.fontSize.sm,
    textAlign: 'center',
  },
  loginBtn: {
    paddingHorizontal: Layout.spacing.xl,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.lg,
    marginTop: Layout.spacing.sm,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: Layout.fontSize.md,
  },
  resCard: {
    borderRadius: Layout.borderRadius.xl,
    padding: Layout.spacing.md,
    marginBottom: Layout.spacing.sm,
  },
  resHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Layout.spacing.sm,
  },
  resStation: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
  },
  resTime: {
    fontSize: Layout.fontSize.sm,
    marginTop: 4,
  },
  resBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Layout.borderRadius.full,
  },
  resBadgeText: {
    fontSize: Layout.fontSize.xs,
    fontWeight: '600',
  },
  resDeposit: {
    fontSize: Layout.fontSize.xs,
    marginTop: Layout.spacing.sm,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
    gap: Layout.spacing.xs,
  },
  cancelBtnText: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
  },
});
