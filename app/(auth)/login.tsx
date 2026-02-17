/**
 * Login Screen
 * Email/password authentication with validation
 */

import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';

export default function LoginScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  const passwordRef = useRef<TextInput>(null);

  const errorMessages: Record<string, Record<string, string>> = {
    cz: {
      invalid_credentials: 'Nesprávný e-mail nebo heslo',
      too_many_attempts: 'Příliš mnoho pokusů. Zkuste to za 15 minut.',
      network_error: 'Chyba připojení. Zkontrolujte internet.',
      email_required: 'Zadejte e-mail',
      email_invalid: 'Neplatný e-mail',
      password_required: 'Zadejte heslo',
      password_short: 'Heslo musí mít alespoň 6 znaků',
    },
    en: {
      invalid_credentials: 'Invalid email or password',
      too_many_attempts: 'Too many attempts. Try again in 15 minutes.',
      network_error: 'Connection error. Check your internet.',
      email_required: 'Enter your email',
      email_invalid: 'Invalid email',
      password_required: 'Enter your password',
      password_short: 'Password must be at least 6 characters',
    },
    de: {
      invalid_credentials: 'Ungültige E-Mail oder Passwort',
      too_many_attempts: 'Zu viele Versuche. Versuchen Sie es in 15 Minuten.',
      network_error: 'Verbindungsfehler. Überprüfen Sie Ihr Internet.',
      email_required: 'E-Mail eingeben',
      email_invalid: 'Ungültige E-Mail',
      password_required: 'Passwort eingeben',
      password_short: 'Passwort muss mindestens 6 Zeichen haben',
    },
    pl: {
      invalid_credentials: 'Nieprawidłowy e-mail lub hasło',
      too_many_attempts: 'Zbyt wiele prób. Spróbuj za 15 minut.',
      network_error: 'Błąd połączenia. Sprawdź internet.',
      email_required: 'Podaj e-mail',
      email_invalid: 'Nieprawidłowy e-mail',
      password_required: 'Podaj hasło',
      password_short: 'Hasło musi mieć co najmniej 6 znaków',
    },
  };

  const { language } = useLanguage();
  const msg = errorMessages[language] || errorMessages.en;

  const labels: Record<string, Record<string, string>> = {
    cz: {
      title: 'Přihlášení',
      subtitle: 'Vítejte zpět v ZAspot',
      email: 'E-mail',
      password: 'Heslo',
      login: 'Přihlásit se',
      forgotPassword: 'Zapomenuté heslo?',
      noAccount: 'Nemáte účet?',
      register: 'Zaregistrujte se',
      skipLogin: 'Pokračovat bez přihlášení',
    },
    en: {
      title: 'Sign In',
      subtitle: 'Welcome back to ZAspot',
      email: 'Email',
      password: 'Password',
      login: 'Sign In',
      forgotPassword: 'Forgot password?',
      noAccount: "Don't have an account?",
      register: 'Sign up',
      skipLogin: 'Continue without signing in',
    },
    de: {
      title: 'Anmelden',
      subtitle: 'Willkommen zurück bei ZAspot',
      email: 'E-Mail',
      password: 'Passwort',
      login: 'Anmelden',
      forgotPassword: 'Passwort vergessen?',
      noAccount: 'Kein Konto?',
      register: 'Registrieren',
      skipLogin: 'Ohne Anmeldung fortfahren',
    },
    pl: {
      title: 'Logowanie',
      subtitle: 'Witamy ponownie w ZAspot',
      email: 'E-mail',
      password: 'Hasło',
      login: 'Zaloguj się',
      forgotPassword: 'Zapomniałeś hasła?',
      noAccount: 'Nie masz konta?',
      register: 'Zarejestruj się',
      skipLogin: 'Kontynuuj bez logowania',
    },
  };

  const l = labels[language] || labels.en;

  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (!email.trim()) {
      newErrors.email = msg.email_required;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = msg.email_invalid;
    }

    if (!password) {
      newErrors.password = msg.password_required;
    } else if (password.length < 6) {
      newErrors.password = msg.password_short;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    const result = await login(email, password);

    if (result.success) {
      router.replace('/(tabs)');
    } else {
      setErrors({ general: msg[result.error || 'invalid_credentials'] || msg.invalid_credentials });
    }

    setIsLoading(false);
  };

  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo & Header */}
          <View style={styles.header}>
            <View style={[styles.logoContainer, { backgroundColor: Colors.brand.accentGreen }]}>
              <Ionicons name="flash" size={36} color="#FFFFFF" />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{l.title}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{l.subtitle}</Text>
          </View>

          {/* General Error */}
          {errors.general && (
            <View style={[styles.errorBanner, { backgroundColor: colors.error + '15' }]}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={[styles.errorBannerText, { color: colors.error }]}>{errors.general}</Text>
            </View>
          )}

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{l.email}</Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: colors.surface,
                  borderColor: errors.email ? colors.error : colors.border,
                },
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={20}
                color={errors.email ? colors.error : colors.textMuted}
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
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>
            {errors.email && (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.email}</Text>
            )}
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{l.password}</Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: colors.surface,
                  borderColor: errors.password ? colors.error : colors.border,
                },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={errors.password ? colors.error : colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                ref={passwordRef}
                style={[styles.input, { color: colors.text }]}
                value={password}
                onChangeText={setPassword}
                placeholder={l.password}
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                autoComplete="password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
            {errors.password && (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.password}</Text>
            )}
          </View>

          {/* Forgot Password */}
          <TouchableOpacity
            onPress={() => router.push('/(auth)/forgot-password')}
            style={styles.forgotPasswordBtn}
          >
            <Text style={[styles.forgotPasswordText, { color: Colors.brand.accentGreen }]}>
              {l.forgotPassword}
            </Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={isLoading}
            style={[
              styles.loginButton,
              { backgroundColor: Colors.brand.accentGreen },
              isLoading && styles.buttonDisabled,
            ]}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>{l.login}</Text>
            )}
          </TouchableOpacity>

          {/* Register Link */}
          <View style={styles.registerRow}>
            <Text style={[styles.registerText, { color: colors.textSecondary }]}>
              {l.noAccount}{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={[styles.registerLink, { color: Colors.brand.accentGreen }]}>
                {l.register}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Skip Login */}
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={[styles.skipText, { color: colors.textMuted }]}>{l.skipLogin}</Text>
          </TouchableOpacity>
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Layout.spacing.lg,
    paddingTop: Layout.spacing.xxl,
    paddingBottom: Layout.spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Layout.spacing.xl,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Layout.spacing.md,
  },
  title: {
    fontSize: Layout.fontSize.xxxl,
    fontWeight: '700',
    marginBottom: Layout.spacing.xs,
  },
  subtitle: {
    fontSize: Layout.fontSize.md,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.lg,
    marginBottom: Layout.spacing.md,
    gap: Layout.spacing.sm,
  },
  errorBannerText: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '500',
    flex: 1,
  },
  inputGroup: {
    marginBottom: Layout.spacing.md,
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
  forgotPasswordBtn: {
    alignSelf: 'flex-end',
    marginBottom: Layout.spacing.lg,
  },
  forgotPasswordText: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
  },
  loginButton: {
    height: 52,
    borderRadius: Layout.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Layout.spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: Layout.fontSize.lg,
    fontWeight: '700',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: Layout.spacing.xl,
  },
  registerText: {
    fontSize: Layout.fontSize.sm,
  },
  registerLink: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '700',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: Layout.spacing.sm,
  },
  skipText: {
    fontSize: Layout.fontSize.sm,
  },
});
