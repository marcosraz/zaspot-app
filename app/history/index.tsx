/**
 * Transaction History Screen
 * Shows charging history with costs and energy consumed
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { getLocale } from '../../constants/translations';
import { UserTransaction, fetchUserTransactions, formatDuration, formatEnergy } from '../../lib/charging';

export default function HistoryScreen() {
  const { colors } = useTheme();
  const { language, t } = useLanguage();
  const { isAuthenticated } = useAuth();

  const [transactions, setTransactions] = useState<UserTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTransactions = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    const result = await fetchUserTransactions('all', 50);
    // Pin active sessions to top
    const sorted = [...result.transactions].sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return 0; // Keep original order (newest first) within same status
    });
    setTransactions(sorted);
    setLoading(false);
  }, [isAuthenticated]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Auto-refresh every 15s when there are active transactions
  useEffect(() => {
    const hasActive = transactions.some((tx) => tx.status === 'active');
    if (!hasActive) return;
    const interval = setInterval(() => {
      loadTransactions();
    }, 15000);
    return () => clearInterval(interval);
  }, [transactions, loadTransactions]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(getLocale(language), {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDurationMinutes = (tx: UserTransaction): number => {
    if (!tx.stopTimestamp) return (Date.now() - new Date(tx.startTimestamp).getTime()) / 60000;
    return (new Date(tx.stopTimestamp).getTime() - new Date(tx.startTimestamp).getTime()) / 60000;
  };

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t.history.title}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="log-in-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t.history.loginRequired}</Text>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/login')}
            style={[styles.loginBtn, { backgroundColor: Colors.brand.accentGreen }]}
          >
            <Text style={styles.loginBtnText}>{t.history.login}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderTransaction = ({ item: tx }: { item: UserTransaction }) => {
    const isActive = tx.status === 'active';
    const isCompleted = tx.status === 'completed';

    return (
      <TouchableOpacity
        style={[styles.txCard, { backgroundColor: colors.surface }]}
        onPress={isActive ? () => router.push(`/station/${tx.chargePointId}`) : isCompleted ? () => router.push(`/receipt/${tx.id}`) : undefined}
        activeOpacity={isActive || isCompleted ? 0.7 : 1}
      >
        <View style={styles.txHeader}>
          <View style={styles.txStation}>
            <View style={[styles.txIcon, { backgroundColor: isActive ? '#3B82F620' : Colors.brand.accentGreen + '20' }]}>
              <Ionicons
                name={isActive ? 'flash' : 'checkmark-circle'}
                size={18}
                color={isActive ? '#3B82F6' : Colors.brand.accentGreen}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.txName, { color: colors.text }]} numberOfLines={1}>
                {tx.chargePointName}
              </Text>
              <Text style={[styles.txDate, { color: colors.textMuted }]}>
                {formatDate(tx.startTimestamp)}
              </Text>
            </View>
            {isActive && (
              <View style={[styles.activeBadge, { backgroundColor: '#3B82F620' }]}>
                <View style={[styles.activeDot, { backgroundColor: '#3B82F6' }]} />
                <Text style={{ color: '#3B82F6', fontSize: 11, fontWeight: '600' }}>{t.history.active}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.txStats}>
          {isActive && tx.live?.powerKw != null ? (
            <>
              <View style={styles.txStat}>
                <Text style={[styles.txStatLabel, { color: colors.textMuted }]}>{t.history.power}</Text>
                <Text style={[styles.txStatValue, { color: '#3B82F6' }]}>
                  {tx.live.powerKw.toFixed(1)} kW
                </Text>
              </View>
              <View style={styles.txStat}>
                <Text style={[styles.txStatLabel, { color: colors.textMuted }]}>{t.history.energy}</Text>
                <Text style={[styles.txStatValue, { color: colors.text }]}>
                  {tx.live.energyKwh != null ? tx.live.energyKwh.toFixed(2) : '0.00'} kWh
                </Text>
              </View>
              <View style={styles.txStat}>
                <Text style={[styles.txStatLabel, { color: colors.textMuted }]}>
                  {t.history.duration}
                </Text>
                <Text style={[styles.txStatValue, { color: colors.text }]}>
                  {formatDuration(getDurationMinutes(tx))}
                </Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.txStat}>
                <Text style={[styles.txStatLabel, { color: colors.textMuted }]}>{t.history.energy}</Text>
                <Text style={[styles.txStatValue, { color: colors.text }]}>
                  {formatEnergy(tx.energyKwh)} kWh
                </Text>
              </View>
              <View style={styles.txStat}>
                <Text style={[styles.txStatLabel, { color: colors.textMuted }]}>{t.history.cost}</Text>
                <Text style={[styles.txStatValue, { color: colors.text }]}>
                  {tx.totalCostCzk != null ? `${tx.totalCostCzk.toFixed(2)} CZK` : '—'}
                </Text>
              </View>
              <View style={styles.txStat}>
                <Text style={[styles.txStatLabel, { color: colors.textMuted }]}>
                  {t.history.duration}
                </Text>
                <Text style={[styles.txStatValue, { color: colors.text }]}>
                  {formatDuration(getDurationMinutes(tx))}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Receipt link for completed sessions */}
        {isCompleted && (
          <View style={[styles.receiptLink, { borderTopColor: colors.border }]}>
            <Ionicons name="receipt-outline" size={14} color={Colors.brand.accentGreen} />
            <Text style={[styles.receiptLinkText, { color: Colors.brand.accentGreen }]}>
              {t.history.viewReceipt}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.brand.accentGreen} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t.history.title}</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={Colors.brand.accentGreen} />
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="time-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t.history.noHistory}</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t.history.noHistoryDesc}</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
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
  emptyTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
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
  txCard: {
    borderRadius: Layout.borderRadius.xl,
    padding: Layout.spacing.md,
    marginBottom: Layout.spacing.sm,
  },
  txHeader: {
    marginBottom: Layout.spacing.md,
  },
  txStation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.md,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txName: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
  },
  txDate: {
    fontSize: Layout.fontSize.xs,
    marginTop: 2,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Layout.borderRadius.full,
    gap: 4,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  txStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  txStat: {
    alignItems: 'center',
    gap: 2,
  },
  txStatLabel: {
    fontSize: Layout.fontSize.xs,
  },
  txStatValue: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
  },
  receiptLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Layout.spacing.md,
    paddingTop: Layout.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  receiptLinkText: {
    fontSize: Layout.fontSize.xs,
    fontWeight: '600',
  },
});
