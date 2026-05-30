/**
 * Top Up — Wallet recharge via card or bank transfer
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useCredit } from '../../context/CreditContext';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { requestBankTransfer, BankTransferInfo } from '../../lib/v2Features';

const PRESETS = [100, 250, 500, 1000, 2000, 5000];

export default function TopUpScreen() {
  const { colors } = useTheme();
  const { balanceFormatted, topUp } = useCredit();
  const [amount, setAmount] = useState('500');
  const [submitting, setSubmitting] = useState(false);
  const [bankInfo, setBankInfo] = useState<BankTransferInfo | null>(null);

  const onCard = async () => {
    const a = parseInt(amount, 10);
    if (isNaN(a) || a < 100) {
      Alert.alert('Minimální částka', 'Minimum 100 Kč');
      return;
    }
    setSubmitting(true);
    const result = await topUp(a);
    setSubmitting(false);
    // Surface errors to the user — silent failures were the previous UX bug
    if (!result.success) {
      Alert.alert('Platbu se nepodařilo zahájit', result.error || 'Zkuste to prosím znovu.');
    }
  };

  const onBank = async () => {
    const a = parseInt(amount, 10);
    if (isNaN(a) || a < 100) {
      Alert.alert('Minimální částka', 'Minimum 100 Kč');
      return;
    }
    setSubmitting(true);
    const res = await requestBankTransfer(a);
    setSubmitting(false);
    if (res.ok && res.data.transfer) {
      setBankInfo(res.data.transfer);
    } else {
      Alert.alert('Chyba', res.data.error ?? 'Bank transfer se nepodařil');
    }
  };

  const share = async () => {
    if (!bankInfo) return;
    await Share.share({
      message: `IBAN: ${bankInfo.iban}\nBIC: ${bankInfo.bic}\nPříjemce: ${bankInfo.recipient}\nČástka: ${bankInfo.amount_czk} Kč\nVS: ${bankInfo.variable_symbol}`,
    });
  };

  if (bankInfo) {
    return (
      <>
        <Stack.Screen options={{ title: 'Bankovní převod', headerShown: true }} />
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={[styles.bankCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <Ionicons name="business" size={32} color={Colors.brand.accentGreen} style={{ alignSelf: 'center' }} />
              <Text style={[styles.bankTitle, { color: colors.text }]}>Údaje k převodu</Text>
              <BankRow label="IBAN" value={bankInfo.iban} colors={colors} />
              <BankRow label="BIC/SWIFT" value={bankInfo.bic} colors={colors} />
              <BankRow label="Příjemce" value={bankInfo.recipient} colors={colors} />
              <BankRow label="Částka" value={`${bankInfo.amount_czk} Kč`} colors={colors} bold />
              <BankRow label="VS" value={bankInfo.variable_symbol} colors={colors} bold />

              <TouchableOpacity onPress={share} style={[styles.btn, { backgroundColor: Colors.brand.accentGreen }]}>
                <Ionicons name="share-outline" size={18} color="#fff" />
                <Text style={styles.btnText}>Sdílet údaje</Text>
              </TouchableOpacity>
              <Text style={[styles.note, { color: colors.textMuted }]}>
                Po přijetí platby (obvykle 1 pracovní den) se kredit automaticky připíše.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Dobít kredit', headerShown: true }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.balanceCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>Aktuální zůstatek</Text>
            <Text style={[styles.balanceValue, { color: Colors.brand.accentGreen }]}>{balanceFormatted}</Text>
          </View>

          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Vyberte částku</Text>
          <View style={styles.presetGrid}>
            {PRESETS.map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => setAmount(String(p))}
                style={[
                  styles.presetBtn,
                  {
                    backgroundColor: amount === String(p) ? Colors.brand.accentGreen : colors.surface,
                    borderColor: amount === String(p) ? Colors.brand.accentGreen : colors.borderLight,
                  },
                ]}
              >
                <Text style={{ color: amount === String(p) ? '#fff' : colors.text, fontWeight: '700' }}>
                  {p} Kč
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Nebo vlastní částka</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
          />

          <TouchableOpacity onPress={onCard} disabled={submitting} style={[styles.btn, { backgroundColor: Colors.brand.accentGreen }]}>
            {submitting ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="card" size={18} color="#fff" />
                <Text style={styles.btnText}>Dobít kartou</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={onBank} disabled={submitting} style={[styles.btn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
            <Ionicons name="business" size={18} color={colors.text} />
            <Text style={[styles.btnText, { color: colors.text }]}>Bankovní převod</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function BankRow({ label, value, colors, bold }: { label: string; value: string; colors: any; bold?: boolean }) {
  return (
    <View style={styles.bankRow}>
      <Text style={[styles.bankLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.bankValue, { color: colors.text, fontWeight: bold ? '700' : '500' }]} selectable>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Layout.spacing.lg, gap: 12, paddingBottom: 40 },
  balanceCard: { padding: 20, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  balanceLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  balanceValue: { fontSize: 32, fontWeight: '700', marginTop: 6 },
  sectionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 10 },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  presetBtn: { width: '31.5%', paddingVertical: 14, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 18, fontWeight: '600' },
  btn: { flexDirection: 'row', gap: 8, padding: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  bankCard: { padding: 20, borderRadius: 14, borderWidth: 1, gap: 8 },
  bankTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginVertical: 8 },
  bankRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  bankLabel: { fontSize: 13 },
  bankValue: { fontSize: 14, maxWidth: '65%', textAlign: 'right' },
  note: { fontSize: 12, lineHeight: 18, marginTop: 12, textAlign: 'center' },
});
