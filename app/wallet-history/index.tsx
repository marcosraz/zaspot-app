/**
 * Wallet History — credit top-ups, charging debits, refunds, adjustments.
 *
 * The data layer (CreditContext.refreshTransactions → /payment/history) has
 * existed since the wallet launch but no screen ever consumed it — this is
 * that screen. Charging-session history (kWh, receipts) stays in /history;
 * this one is strictly the money view.
 */
import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useCredit, CreditTransaction } from '../../context/CreditContext';
import { useCurrency } from '../../context/CurrencyContext';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { formatDbDate } from '../../lib/dates';
import { getLocale } from '../../constants/translations';

const TYPE_META: Record<
  CreditTransaction['type'],
  { icon: keyof typeof Ionicons.glyphMap; labelKey: 'typeTopup' | 'typeCharge' | 'typeRefund' | 'typeAdjustment' | 'typeCommunity' | 'typeBankTransfer' }
> = {
  topup: { icon: 'add-circle', labelKey: 'typeTopup' },
  bank_transfer: { icon: 'business', labelKey: 'typeBankTransfer' },
  charge: { icon: 'flash', labelKey: 'typeCharge' },
  refund: { icon: 'return-down-back', labelKey: 'typeRefund' },
  adjustment: { icon: 'construct', labelKey: 'typeAdjustment' },
  community_credit: { icon: 'people', labelKey: 'typeCommunity' },
};

export default function WalletHistoryScreen() {
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { transactions, transactionsLoading, refreshTransactions, balance } = useCredit();
  const { format } = useCurrency();

  const l = t.walletHistory;

  useEffect(() => {
    if (isAuthenticated) refreshTransactions();
  }, [isAuthenticated, refreshTransactions]);

  const renderItem = useCallback(
    ({ item }: { item: CreditTransaction }) => {
      const meta = TYPE_META[item.type] ?? TYPE_META.adjustment;
      const positive = item.amount_czk > 0;
      return (
        <View style={[styles.row, { backgroundColor: colors.surface }]}>
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: (positive ? Colors.brand.accentGreen : '#EF4444') + '15' },
            ]}
          >
            <Ionicons
              name={meta.icon}
              size={20}
              color={positive ? Colors.brand.accentGreen : '#EF4444'}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
              {item.description || l[meta.labelKey]}
            </Text>
            <Text style={[styles.rowSub, { color: colors.textMuted }]}>
              {l[meta.labelKey]} · {formatDbDate(item.created_at, getLocale(language), {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text
              style={[
                styles.rowAmount,
                { color: positive ? Colors.brand.accentGreen : colors.text },
              ]}
            >
              {positive ? '+' : ''}
              {format(item.amount_czk, { decimals: 2 })}
            </Text>
            {item.balance_after_czk != null && (
              <Text style={[styles.rowBalance, { color: colors.textMuted }]}>
                {format(item.balance_after_czk, { decimals: 2 })}
              </Text>
            )}
          </View>
        </View>
      );
    },
    [colors, format, l]
  );

  return (
    <>
      <Stack.Screen options={{ title: l.title, headerShown: true }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        {!isAuthenticated ? (
          <View style={styles.empty}>
            <Ionicons name="lock-closed-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{l.loginRequired}</Text>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/login')}
              style={[styles.emptyBtn, { backgroundColor: Colors.brand.accentGreen }]}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>{t.history.login}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={transactions}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <View style={[styles.balanceCard, { backgroundColor: colors.surface }]}>
                <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>
                  {t.profile.credit}
                </Text>
                <Text style={[styles.balanceValue, { color: Colors.brand.accentGreen }]}>
                  {format(balance, { decimals: 2 })}
                </Text>
              </View>
            }
            ListEmptyComponent={
              transactionsLoading ? null : (
                <View style={styles.empty}>
                  <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{l.empty}</Text>
                  <Text style={[styles.emptyHint, { color: colors.textMuted }]}>{l.emptyHint}</Text>
                </View>
              )
            }
            refreshControl={
              <RefreshControl
                refreshing={transactionsLoading}
                onRefresh={refreshTransactions}
                tintColor={Colors.brand.accentGreen}
              />
            }
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: Layout.spacing.md, gap: 8, paddingBottom: 40 },
  balanceCard: {
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  balanceValue: { fontSize: 28, fontWeight: '800', marginTop: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 14, fontWeight: '600' },
  rowSub: { fontSize: 12, marginTop: 2 },
  rowAmount: { fontSize: 15, fontWeight: '700' },
  rowBalance: { fontSize: 11, marginTop: 2 },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 60 },
  emptyText: { fontSize: 15, fontWeight: '600' },
  emptyHint: { fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, marginTop: 8 },
});
