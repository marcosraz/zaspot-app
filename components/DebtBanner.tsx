/**
 * DebtBanner — shown wherever the wallet is in view while the user still owes
 * for an earlier charge (cost above their credit, at our own stations or in
 * roaming). The server takes the debt from the next top-up before anything
 * else, so until it is cleared the balance stays at zero and no charge can
 * start. Without this banner that looks like "top-up is broken".
 *
 * Renders nothing when there is no debt.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCredit } from '../context/CreditContext';

export function debtAmountLabel(debtCzk: number): string {
  return `${debtCzk.toFixed(2).replace('.', ',')} Kč`;
}

export default function DebtBanner({ showTopUpButton = true }: { showTopUpButton?: boolean }) {
  const { debt } = useCredit();
  if (!(debt > 0)) return null;

  return (
    <View style={styles.box} accessibilityRole="alert">
      <Ionicons name="alert-circle" size={22} color="#B91C1C" style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Nedoplatek {debtAmountLabel(debt)}</Text>
        <Text style={styles.text}>
          Předchozí nabíjení stálo víc, než bylo na kreditu. Nedoplatek se strhne automaticky při
          příštím dobití. Do té doby nelze zahájit další nabíjení.
        </Text>
        {showTopUpButton && (
          <TouchableOpacity style={styles.button} onPress={() => router.push('/top-up')}>
            <Text style={styles.buttonText}>Dobít kredit</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  title: { color: '#991B1B', fontSize: 15, fontWeight: '700' },
  text: { color: '#7F1D1D', fontSize: 13, lineHeight: 18, marginTop: 4 },
  button: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: '#B91C1C',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  buttonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
