/**
 * Forgot Password Screen
 * Sends password reset link via email
 */

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const { forgotPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const labels: Record<string, Record<string, string>> = {
    cz: {
      title: 'Zapomenuté heslo',
      subtitle: 'Zadejte svůj e-mail a pošleme vám odkaz pro obnovení hesla.',
      email: 'E-mail',
      send: 'Odeslat odkaz',
      sentTitle: 'E-mail odeslán!',
      sentMessage: 'Pokud existuje účet s tímto e-mailem, poslali jsme vám odkaz pro obnovení hesla. Zkontrolujte svou e-mailovou schránku.',
      backToLogin: 'Zpět na přihlášení',
      email_required: 'Zadejte e-mail',
      email_invalid: 'Neplatný e-mail',
      network_error: 'Chyba připojení',
    },
    en: {
      title: 'Forgot Password',
      subtitle: 'Enter your email and we will send you a password reset link.',
      email: 'Email',
      send: 'Send Reset Link',
      sentTitle: 'Email sent!',
      sentMessage: 'If an account with this email exists, we sent you a password reset link. Check your inbox.',
      backToLogin: 'Back to sign in',
      email_required: 'Enter your email',
      email_invalid: 'Invalid email',
      network_error: 'Connection error',
    },
    de: {
      title: 'Passwort vergessen',
      subtitle: 'Geben Sie Ihre E-Mail ein und wir senden Ihnen einen Link zum Zurücksetzen.',
      email: 'E-Mail',
      send: 'Link senden',
      sentTitle: 'E-Mail gesendet!',
      sentMessage: 'Falls ein Konto mit dieser E-Mail existiert, haben wir Ihnen einen Link zum Zurücksetzen gesendet.',
      backToLogin: 'Zurück zur Anmeldung',
      email_required: 'E-Mail eingeben',
      email_invalid: 'Ungültige E-Mail',
      network_error: 'Verbindungsfehler',
    },
    pl: {
      title: 'Zapomniałeś hasła',
      subtitle: 'Podaj swój e-mail, a wyślemy Ci link do resetowania hasła.',
      email: 'E-mail',
      send: 'Wyślij link',
      sentTitle: 'E-mail wysłany!',
      sentMessage: 'Jeśli konto z tym e-mailem istnieje, wysłaliśmy Ci link do resetowania hasła. Sprawdź swoją skrzynkę.',
      backToLogin: 'Powrót do logowania',
      email_required: 'Podaj e-mail',
      email_invalid: 'Nieprawidłowy e-mail',
      network_error: 'Błąd połączenia',
    },
  };

  const l = labels[language] || labels.en;

  const handleSend = async () => {
    setError('');

    if (!email.trim()) {
      setError(l.email_required);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(l.email_invalid);
      return;
    }

    setIsLoading(true);
    const result = await forgotPassword(email);

    if (result.success) {
      setSent(true);
    } else {
      setError(l.network_error);
    }
    setIsLoading(false);
  };

  // Success state
  if (sent) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.successContainer}>
          <View style={[styles.successIcon, { backgroundColor: Colors.brand.accentGreen + '20' }]}>
            <Ionicons name="mail" size={56} color={Colors.brand.accentGreen} />
          </View>
          <Text style={[styles.successTitle, { color: colors.text }]}>{l.sentTitle}</Text>
          <Text style={[styles.successMessage, { color: colors.textSecondary }]}>
            {l.sentMessage}
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            style={[styles.primaryButton, { backgroundColor: Colors.brand.accentGreen }]}
          >
            <Text style={styles.primaryButtonText}>{l.backToLogin}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: colors.surface }]}>
              <Ionicons name="key-outline" size={32} color={Colors.brand.accentGreen} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{l.title}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{l.subtitle}</Text>
          </View>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{l.email}</Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: colors.surface,
                  borderColor: error ? colors.error : colors.border,
                },
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={20}
                color={error ? colors.error : colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={email}
                onChangeText={setEmail}
                placeholder={l.email}
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                returnKeyType="send"
                onSubmitEditing={handleSend}
              />
            </View>
            {error && (
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            )}
          </View>

          {/* Send Button */}
          <TouchableOpacity
            onPress={handleSend}
            disabled={isLoading}
            style={[
              styles.primaryButton,
              { backgroundColor: Colors.brand.accentGreen },
              isLoading && styles.buttonDisabled,
            ]}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>{l.send}</Text>
            )}
          </TouchableOpacity>

          {/* Back to Login */}
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            style={styles.backToLogin}
          >
            <Text style={[styles.backToLoginText, { color: Colors.brand.accentGreen }]}>
              {l.backToLogin}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Layout.spacing.lg,
    paddingTop: Layout.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Layout.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Layout.spacing.xl,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Layout.spacing.md,
  },
  title: {
    fontSize: Layout.fontSize.xxl,
    fontWeight: '700',
    marginBottom: Layout.spacing.sm,
  },
  subtitle: {
    fontSize: Layout.fontSize.sm,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Layout.spacing.md,
  },
  inputGroup: {
    marginBottom: Layout.spacing.lg,
  },
  label: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
    marginBottom: Layout.spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Layout.borderRadius.lg,
    paddingHorizontal: Layout.spacing.md,
    height: 52,
  },
  inputIcon: {
    marginRight: Layout.spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: Layout.fontSize.md,
    height: '100%',
  },
  errorText: {
    fontSize: Layout.fontSize.xs,
    marginTop: Layout.spacing.xs,
    marginLeft: Layout.spacing.xs,
  },
  primaryButton: {
    height: 52,
    borderRadius: Layout.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Layout.spacing.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: Layout.fontSize.lg,
    fontWeight: '700',
  },
  backToLogin: {
    alignItems: 'center',
    paddingVertical: Layout.spacing.sm,
  },
  backToLoginText: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Layout.spacing.xl,
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Layout.spacing.lg,
  },
  successTitle: {
    fontSize: Layout.fontSize.xxl,
    fontWeight: '700',
    marginBottom: Layout.spacing.sm,
  },
  successMessage: {
    fontSize: Layout.fontSize.md,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Layout.spacing.xl,
  },
});
