/**
 * Smazání účtu — self-service account deletion (App Store Guideline 5.1.1(v)).
 * Flow: explanation → type own email → native confirm dialog → POST
 * /account/delete → logout → back to profile.
 */
import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { deleteAccount } from '../../lib/vehicles';

export default function DeleteAccountScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const p = t.profile;
  const matches = !!user?.email && email.trim().toLowerCase() === user.email.toLowerCase();

  const performDelete = async () => {
    setBusy(true);
    const result = await deleteAccount(email.trim());
    setBusy(false);
    if (result.success) {
      await logout();
      Alert.alert(p.deleteAccountTitle, p.deleteAccountDone, [
        { text: 'OK', onPress: () => router.replace('/(tabs)/profile') },
      ]);
      return;
    }
    const msg =
      result.error === 'active_session' ? p.deleteAccountActiveSession
      : result.error === 'confirm_email_mismatch' ? p.deleteAccountEmailMismatch
      : p.deleteAccountError;
    Alert.alert(p.deleteAccountTitle, msg);
  };

  const confirm = () => {
    if (!matches) {
      Alert.alert(p.deleteAccountTitle, p.deleteAccountEmailMismatch);
      return;
    }
    Alert.alert(p.deleteAccountConfirmTitle, p.deleteAccountConfirmMessage, [
      { text: t.common.cancel, style: 'cancel' },
      { text: p.deleteAccountButton, style: 'destructive', onPress: performDelete },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: p.deleteAccountTitle, headerShown: true }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={[styles.warnCard, { backgroundColor: colors.error + '12', borderColor: colors.error + '40' }]}>
              <Ionicons name="warning-outline" size={28} color={colors.error} />
              <Text style={[styles.intro, { color: colors.text }]}>{p.deleteAccountIntro}</Text>
              {p.deleteAccountBullets.map((b) => (
                <View key={b} style={styles.bulletRow}>
                  <Text style={[styles.bulletDot, { color: colors.error }]}>•</Text>
                  <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{b}</Text>
                </View>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {p.deleteAccountConfirmLabel}
            </Text>
            <Text style={[styles.hintEmail, { color: colors.textMuted }]}>{user?.email}</Text>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="email@example.com"
              placeholderTextColor={colors.textMuted}
              editable={!busy}
            />

            <TouchableOpacity
              style={[styles.deleteBtn, { backgroundColor: colors.error, opacity: matches && !busy ? 1 : 0.4 }]}
              onPress={confirm}
              disabled={!matches || busy}
              activeOpacity={0.8}
            >
              {busy
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.deleteBtnText}>{p.deleteAccountButton}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 12 },
  warnCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 8, marginBottom: 12 },
  intro: { fontSize: 15, fontWeight: '600', marginTop: 4 },
  bulletRow: { flexDirection: 'row', gap: 8 },
  bulletDot: { fontSize: 15, lineHeight: 20 },
  bulletText: { flex: 1, fontSize: 14, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  hintEmail: { fontSize: 13 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  deleteBtn: { marginTop: 12, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  deleteBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
