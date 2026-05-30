/**
 * Top Up — Wallet recharge via card (GP Webpay) or bank transfer (with QR code).
 * UX mirrors the web /credit modal: tab switch, amount selector, QR/copyable
 * fields, and a pending-transfers list with cancel.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Share,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../context/ThemeContext';
import { useCredit } from '../../context/CreditContext';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import {
  requestBankTransfer,
  fetchActiveBankTransfers,
  cancelBankTransfer,
  BankTransferInfo,
  PendingTransfer,
} from '../../lib/v2Features';

const PRESETS = [100, 250, 500, 1000, 2000, 5000];
const MIN_AMOUNT = 50;
const MAX_AMOUNT = 10000;

type Tab = 'card' | 'transfer';

export default function TopUpScreen() {
  const { colors } = useTheme();
  const { balanceFormatted, topUp, refreshBalance } = useCredit();

  const [tab, setTab] = useState<Tab>('card');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(500);
  const [customAmount, setCustomAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Bank transfer state
  const [bankResult, setBankResult] = useState<BankTransferInfo | null>(null);
  const [pendingList, setPendingList] = useState<PendingTransfer[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const getAmount = (): number | null => {
    if (customAmount.trim()) {
      const n = parseInt(customAmount, 10);
      return isNaN(n) ? null : n;
    }
    return selectedPreset;
  };

  // Refresh balance + pending transfers on focus
  const reloadPending = useCallback(async () => {
    setPendingLoading(true);
    const res = await fetchActiveBankTransfers();
    if (res.ok && res.data.success) setPendingList(res.data.transfers);
    setPendingLoading(false);
  }, []);

  useEffect(() => {
    if (tab === 'transfer') reloadPending();
  }, [tab, reloadPending]);

  const handleCard = async () => {
    const amount = getAmount();
    if (!amount || amount < MIN_AMOUNT) {
      Alert.alert('Minimální částka', `Minimum ${MIN_AMOUNT} Kč`);
      return;
    }
    if (amount > MAX_AMOUNT) {
      Alert.alert('Maximální částka', `Maximum ${MAX_AMOUNT} Kč`);
      return;
    }
    setSubmitting(true);
    const result = await topUp(amount);
    setSubmitting(false);
    if (!result.success) {
      Alert.alert('Platbu se nepodařilo zahájit', result.error || 'Zkuste to prosím znovu.');
    } else {
      await refreshBalance();
    }
  };

  const handleTransferGenerate = async () => {
    const amount = getAmount();
    if (!amount || amount < MIN_AMOUNT) {
      Alert.alert('Minimální částka', `Minimum ${MIN_AMOUNT} Kč`);
      return;
    }
    if (amount > MAX_AMOUNT) {
      Alert.alert('Maximální částka', `Maximum ${MAX_AMOUNT} Kč`);
      return;
    }
    setSubmitting(true);
    const res = await requestBankTransfer(amount);
    setSubmitting(false);
    if (res.ok && res.data.success && res.data.transfer) {
      setBankResult(res.data.transfer);
      reloadPending();
    } else {
      Alert.alert('Chyba', res.data.error ?? 'Nepodařilo se vygenerovat platbu.');
    }
  };

  const copy = async (value: string, key: string) => {
    await Clipboard.setStringAsync(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const share = async () => {
    if (!bankResult) return;
    await Share.share({
      message: `IBAN: ${bankResult.iban}\nBIC: ${bankResult.bic}\nPříjemce: ${bankResult.recipient}\nČástka: ${bankResult.amount_czk} Kč\nVS: ${bankResult.variable_symbol}`,
    });
  };

  const handleCancel = (id: string) => {
    Alert.alert(
      'Zrušit platbu?',
      'Tímto smažete čekající žádost o převod. Tuto akci nelze vrátit zpět.',
      [
        { text: 'Zpět', style: 'cancel' },
        {
          text: 'Zrušit', style: 'destructive', onPress: async () => {
            setCancellingId(id);
            const res = await cancelBankTransfer(id);
            setCancellingId(null);
            if (res.ok && res.data.success) {
              // If we cancelled the one currently displayed, also clear the result panel
              setBankResult(prev => (prev && prev.variable_symbol === pendingList.find(p => p.id === id)?.variable_symbol) ? null : prev);
              reloadPending();
            } else {
              Alert.alert('Chyba', res.data.error ?? 'Zrušení selhalo.');
            }
          },
        },
      ],
    );
  };

  const formatExpires = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Dobít kredit', headerShown: true }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={tab === 'transfer' ? (
            <RefreshControl refreshing={pendingLoading} onRefresh={reloadPending} tintColor={Colors.brand.accentGreen} />
          ) : undefined}
        >
          {/* Balance card */}
          <View style={[styles.balanceCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>Aktuální zůstatek</Text>
            <Text style={[styles.balanceValue, { color: Colors.brand.accentGreen }]}>{balanceFormatted}</Text>
          </View>

          {/* Tab switcher */}
          <View style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <TabBtn label="Karta" icon="card" active={tab === 'card'} onPress={() => { setTab('card'); }} colors={colors} />
            <TabBtn label="Bank. převod" icon="business" active={tab === 'transfer'} onPress={() => setTab('transfer')} colors={colors} />
          </View>

          {/* Card flow */}
          {tab === 'card' && (
            <>
              <AmountSelector
                presets={PRESETS}
                selectedPreset={selectedPreset}
                customAmount={customAmount}
                setSelectedPreset={(p) => { setSelectedPreset(p); setCustomAmount(''); }}
                setCustomAmount={(v) => { setCustomAmount(v); setSelectedPreset(null); }}
                colors={colors}
                disabled={submitting}
              />

              <TouchableOpacity
                onPress={handleCard}
                disabled={submitting || !getAmount()}
                style={[styles.primaryBtn, { backgroundColor: Colors.brand.accentGreen, opacity: (submitting || !getAmount()) ? 0.55 : 1 }]}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Ionicons name="card" size={18} color="#fff" />
                    <Text style={styles.primaryBtnText}>
                      Dobít {getAmount() ? `${getAmount()} Kč` : ''}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <Text style={[styles.hint, { color: colors.textMuted }]}>
                Platební metody: Visa, Mastercard, Google Pay, Apple Pay
              </Text>
            </>
          )}

          {/* Bank transfer flow */}
          {tab === 'transfer' && bankResult && (
            <View style={[styles.bankCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              {bankResult.qr_data_url ? (
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <Image
                    source={{ uri: bankResult.qr_data_url }}
                    style={styles.qrImage}
                    resizeMode="contain"
                  />
                  <Text style={[styles.qrHint, { color: colors.textMuted }]}>
                    Naskenujte QR kód ve své bankovní aplikaci
                  </Text>
                </View>
              ) : null}

              <View style={{ height: 1, backgroundColor: colors.borderLight, marginVertical: 12 }} />

              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Nebo zadejte ručně:</Text>

              <CopyRow label="IBAN" value={bankResult.iban} fieldKey="iban" copiedKey={copiedKey} onCopy={copy} colors={colors} />
              <CopyRow label="BIC/SWIFT" value={bankResult.bic} fieldKey="bic" copiedKey={copiedKey} onCopy={copy} colors={colors} />
              <CopyRow label="Variabilní symbol" value={bankResult.variable_symbol} fieldKey="vs" copiedKey={copiedKey} onCopy={copy} colors={colors} highlight />
              <CopyRow label="Částka" value={`${bankResult.amount_czk} CZK`} fieldKey="amount" copiedKey={copiedKey} onCopy={copy} colors={colors} highlight />
              <CopyRow label="Příjemce" value={bankResult.recipient} fieldKey="recipient" copiedKey={copiedKey} onCopy={copy} colors={colors} />

              <View style={[styles.infoBox, { backgroundColor: '#3B82F615', borderColor: '#3B82F640' }]}>
                <Ionicons name="information-circle" size={18} color="#3B82F6" />
                <Text style={{ color: '#3B82F6', fontSize: 13, flex: 1 }}>
                  Po přijetí platby (obvykle 1 pracovní den) se kredit automaticky připíše.
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={share} style={[styles.secondaryBtn, { borderColor: colors.border, flex: 1 }]}>
                  <Ionicons name="share-outline" size={18} color={colors.text} />
                  <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Sdílet</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setBankResult(null); setSelectedPreset(500); setCustomAmount(''); }}
                  style={[styles.secondaryBtn, { borderColor: colors.border, flex: 1 }]}
                >
                  <Ionicons name="add-circle-outline" size={18} color={colors.text} />
                  <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Nová platba</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {tab === 'transfer' && !bankResult && (
            <>
              {/* Pending transfers list */}
              {pendingList.length > 0 && (
                <View style={{ gap: 8 }}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Čekající platby</Text>
                  {pendingList.map((p) => (
                    <View key={p.id} style={[styles.pendingCard, { backgroundColor: '#3B82F615', borderColor: '#3B82F640' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="qr-code-outline" size={16} color="#3B82F6" />
                          <Text style={{ color: colors.text, fontWeight: '600' }}>VS: {p.variable_symbol}</Text>
                        </View>
                        <View style={{ backgroundColor: '#F59E0B30', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                          <Text style={{ color: '#D97706', fontSize: 11, fontWeight: '700' }}>Čeká</Text>
                        </View>
                      </View>
                      <Text style={{ color: Colors.brand.accentGreen, fontSize: 18, fontWeight: '700', marginBottom: 4 }}>{p.amount_czk} Kč</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>Expiruje: {formatExpires(p.expires_at)}</Text>
                      <TouchableOpacity
                        onPress={() => handleCancel(p.id)}
                        disabled={cancellingId === p.id}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                      >
                        {cancellingId === p.id ? (
                          <ActivityIndicator size="small" color="#EF4444" />
                        ) : (
                          <Ionicons name="trash-outline" size={14} color="#EF4444" />
                        )}
                        <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '600' }}>Zrušit platbu</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <AmountSelector
                presets={PRESETS}
                selectedPreset={selectedPreset}
                customAmount={customAmount}
                setSelectedPreset={(p) => { setSelectedPreset(p); setCustomAmount(''); }}
                setCustomAmount={(v) => { setCustomAmount(v); setSelectedPreset(null); }}
                colors={colors}
                disabled={submitting}
              />

              <TouchableOpacity
                onPress={handleTransferGenerate}
                disabled={submitting || !getAmount()}
                style={[styles.primaryBtn, { backgroundColor: '#3B82F6', opacity: (submitting || !getAmount()) ? 0.55 : 1 }]}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Ionicons name="qr-code" size={18} color="#fff" />
                    <Text style={styles.primaryBtnText}>Vygenerovat QR platbu</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

// ─── Helper components ──────────────────────────────────────────────────────

function TabBtn({ label, icon, active, onPress, colors }: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
  colors: any;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.tabBtn, active && { backgroundColor: Colors.brand.accentGreen }]}
    >
      <Ionicons name={icon} size={16} color={active ? '#fff' : colors.textSecondary} />
      <Text style={{ color: active ? '#fff' : colors.textSecondary, fontWeight: '600', fontSize: 14 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function AmountSelector({ presets, selectedPreset, customAmount, setSelectedPreset, setCustomAmount, colors, disabled }: {
  presets: number[];
  selectedPreset: number | null;
  customAmount: string;
  setSelectedPreset: (p: number) => void;
  setCustomAmount: (v: string) => void;
  colors: any;
  disabled: boolean;
}) {
  return (
    <>
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Vyberte částku</Text>
      <View style={styles.presetGrid}>
        {presets.map((p) => (
          <TouchableOpacity
            key={p}
            disabled={disabled}
            onPress={() => setSelectedPreset(p)}
            style={[
              styles.presetBtn,
              {
                backgroundColor: selectedPreset === p ? Colors.brand.accentGreen : colors.surface,
                borderColor: selectedPreset === p ? Colors.brand.accentGreen : colors.borderLight,
              },
            ]}
          >
            <Text style={{ color: selectedPreset === p ? '#fff' : colors.text, fontWeight: '700' }}>
              {p} Kč
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Nebo vlastní částka</Text>
      <TextInput
        value={customAmount}
        onChangeText={setCustomAmount}
        keyboardType="numeric"
        placeholder={`${MIN_AMOUNT}–${MAX_AMOUNT}`}
        placeholderTextColor={colors.textMuted}
        editable={!disabled}
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
      />
      <Text style={{ color: colors.textMuted, fontSize: 11 }}>
        Min. {MIN_AMOUNT} Kč • Max. {MAX_AMOUNT} Kč
      </Text>
    </>
  );
}

function CopyRow({ label, value, fieldKey, copiedKey, onCopy, colors, highlight }: {
  label: string;
  value: string;
  fieldKey: string;
  copiedKey: string | null;
  onCopy: (value: string, key: string) => void;
  colors: any;
  highlight?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={() => onCopy(value, fieldKey)}
      style={[styles.copyRow, { backgroundColor: highlight ? Colors.brand.accentGreen + '15' : colors.surface, borderColor: colors.borderLight }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 2 }}>{label}</Text>
        <Text style={{ color: colors.text, fontFamily: 'monospace', fontSize: 14, fontWeight: highlight ? '700' : '500' }} selectable numberOfLines={1}>{value}</Text>
      </View>
      {copiedKey === fieldKey ? (
        <Ionicons name="checkmark-circle" size={20} color={Colors.brand.accentGreen} />
      ) : (
        <Ionicons name="copy-outline" size={18} color={colors.textMuted} />
      )}
    </TouchableOpacity>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Layout.spacing.lg, gap: 12, paddingBottom: 40 },
  balanceCard: { padding: 20, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  balanceLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  balanceValue: { fontSize: 32, fontWeight: '700', marginTop: 6 },

  tabBar: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 4, gap: 4 },
  tabBtn: { flex: 1, flexDirection: 'row', gap: 6, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  sectionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 10 },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  presetBtn: { width: '31.5%', paddingVertical: 14, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 18, fontWeight: '600' },

  primaryBtn: { flexDirection: 'row', gap: 8, padding: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: { flexDirection: 'row', gap: 6, padding: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  secondaryBtnText: { fontSize: 14, fontWeight: '600' },
  hint: { fontSize: 12, textAlign: 'center', marginTop: 4 },

  bankCard: { padding: 16, borderRadius: 14, borderWidth: 1, gap: 8 },
  qrImage: { width: 200, height: 200, borderRadius: 8, backgroundColor: '#fff' },
  qrHint: { fontSize: 12, textAlign: 'center' },

  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    marginVertical: 3,
  },

  infoBox: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 8, borderWidth: 1, marginTop: 4, alignItems: 'flex-start' },

  pendingCard: { padding: 14, borderRadius: 10, borderWidth: 1 },
});
