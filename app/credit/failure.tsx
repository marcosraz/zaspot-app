/**
 * Credit top-up FAILURE return screen.
 *
 * Reached after an iOS Safari top-up that was declined/cancelled, via either
 *   zaspot://credit/failure?order=...&error=...   (custom scheme)
 *   https://zaspot.cz/credit/failure?...          (universal link)
 * Both map to this expo-router route. See context/CreditContext.tsx.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

export default function CreditFailureScreen() {
  const { colors } = useTheme();
  const { error } = useLocalSearchParams<{ order?: string; error?: string }>();

  // expo-router already URL-decodes params — decoding again throws URIError on
  // messages containing a literal '%'. Use the value as-is.
  const reason = error || 'Platba nebyla dokončena.';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: colors.error + '22' }]}>
          <Ionicons name="close-circle" size={56} color={colors.error} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Platba se nezdařila</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{reason}</Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.success }]}
          onPress={() => router.replace('/top-up')}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Zkusit znovu</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={() => router.replace('/(tabs)')}>
          <Text style={[styles.secondaryText, { color: colors.textSecondary }]}>
            Zpět na úvod
          </Text>
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
  subtitle: { fontSize: 15, textAlign: 'center' },
  button: {
    marginTop: 32,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  secondary: { marginTop: 16, padding: 8 },
  secondaryText: { fontSize: 15 },
});
