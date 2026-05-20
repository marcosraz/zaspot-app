/**
 * Magic Link Login — Email-based passwordless auth
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { requestMagicLink } from '../../lib/v2Features';

export default function MagicLinkScreen() {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const send = async () => {
    if (!email.trim().includes('@')) {
      Alert.alert('Neplatný e-mail');
      return;
    }
    setSubmitting(true);
    const res = await requestMagicLink(email.trim().toLowerCase());
    setSubmitting(false);
    if (res.ok && res.data?.success) {
      setSent(true);
    } else {
      Alert.alert('Chyba', 'Magic link se nepodařilo odeslat. Zkuste klasické přihlášení.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <Ionicons name="mail" size={48} color={Colors.brand.accentGreen} />
          {sent ? (
            <>
              <Text style={[styles.title, { color: colors.text }]}>Zkontrolujte e-mail</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Odeslali jsme přihlašovací odkaz na {email}. Klikněte na odkaz v e-mailu.
              </Text>
              <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={[styles.btn, { backgroundColor: Colors.brand.accentGreen }]}>
                <Text style={styles.btnText}>Zpět na přihlášení</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.title, { color: colors.text }]}>Přihlášení e-mailem</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Pošleme vám odkaz, kliknutím na který se automaticky přihlásíte.
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="vas@email.cz"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
              />
              <TouchableOpacity
                onPress={send}
                disabled={submitting}
                style={[styles.btn, { backgroundColor: Colors.brand.accentGreen, opacity: submitting ? 0.6 : 1 }]}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Poslat magic link</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={[styles.altLink, { color: colors.textSecondary }]}>Použít heslo</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Layout.spacing.lg, gap: 12 },
  title: { fontSize: 26, fontWeight: '700', marginTop: 8 },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 12 },
  input: { width: '100%', borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 16 },
  btn: { width: '100%', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  altLink: { fontSize: 14, marginTop: 12, textDecorationLine: 'underline' },
});
