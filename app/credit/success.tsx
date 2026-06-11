/**
 * Credit top-up SUCCESS return screen.
 *
 * Reached two ways after an iOS Safari top-up (see context/CreditContext.tsx):
 *   1. Custom scheme  zaspot://credit/success?order=...&amount=...
 *   2. Universal Link https://zaspot.cz/credit/success?...   (needs associatedDomains)
 * Both map to this expo-router route. We refresh the balance and let the user
 * jump back into the app.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useCredit } from '../../context/CreditContext';

export default function CreditSuccessScreen() {
  const { colors } = useTheme();
  const { refreshBalance } = useCredit();
  const { amount, card_registered } = useLocalSearchParams<{
    order?: string;
    amount?: string;
    card_registered?: string;
  }>();

  const isCard = card_registered === 'true';
  const amountNum = amount ? parseFloat(amount) : null;

  // Pull the freshly topped-up balance the moment we land back in the app.
  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: colors.success + '22' }]}>
          <Ionicons
            name={isCard ? 'card' : 'checkmark-circle'}
            size={56}
            color={colors.success}
          />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          {isCard ? 'Karta uložena' : 'Platba úspěšná'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {isCard
            ? 'Vaše platební karta byla úspěšně uložena.'
            : 'Váš kredit byl úspěšně dobit.'}
        </Text>

        {amountNum != null && !isCard && (
          <Text style={[styles.amount, { color: colors.success }]}>
            +{amountNum.toFixed(2)} CZK
          </Text>
        )}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.success }]}
          onPress={() => router.replace('/(tabs)')}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Hotovo</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center', marginBottom: 16 },
  amount: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  button: {
    marginTop: 32,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
