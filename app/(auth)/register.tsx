/**
 * Register Screen
 * New user registration with name, email, password
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';

export default function RegisterScreen() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const labels: Record<string, Record<string, string>> = {
    cz: {
      title: 'Registrace',
      subtitle: 'Vytvořte si účet v ZAspot',
      name: 'Jméno',
      namePlaceholder: 'Vaše jméno',
      email: 'E-mail',
      password: 'Heslo',
      confirmPassword: 'Heslo znovu',
      register: 'Zaregistrovat se',
      hasAccount: 'Již máte účet?',
      login: 'Přihlásit se',
      successTitle: 'Účet vytvořen!',
      successMessage: 'Poslali jsme vám ověřovací e-mail. Klikněte na odkaz v e-mailu pro aktivaci účtu.',
      goToLogin: 'Přejít na přihlášení',
      name_required: 'Zadejte jméno',
      email_required: 'Zadejte e-mail',
      email_invalid: 'Neplatný e-mail',
      password_required: 'Zadejte heslo',
      password_short: 'Heslo musí mít alespoň 6 znaků',
      passwords_mismatch: 'Hesla se neshodují',
      email_exists: 'Účet s tímto e-mailem již existuje',
      network_error: 'Chyba připojení. Zkontrolujte internet.',
    },
    en: {
      title: 'Sign Up',
      subtitle: 'Create your ZAspot account',
      name: 'Name',
      namePlaceholder: 'Your name',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm password',
      register: 'Create Account',
      hasAccount: 'Already have an account?',
      login: 'Sign in',
      successTitle: 'Account created!',
      successMessage: 'We sent you a verification email. Click the link to activate your account.',
      goToLogin: 'Go to sign in',
      name_required: 'Enter your name',
      email_required: 'Enter your email',
      email_invalid: 'Invalid email',
      password_required: 'Enter a password',
      password_short: 'Password must be at least 6 characters',
      passwords_mismatch: 'Passwords do not match',
      email_exists: 'An account with this email already exists',
      network_error: 'Connection error. Check your internet.',
    },
    de: {
      title: 'Registrieren',
      subtitle: 'Erstellen Sie Ihr ZAspot-Konto',
      name: 'Name',
      namePlaceholder: 'Ihr Name',
      email: 'E-Mail',
      password: 'Passwort',
      confirmPassword: 'Passwort bestätigen',
      register: 'Konto erstellen',
      hasAccount: 'Haben Sie bereits ein Konto?',
      login: 'Anmelden',
      successTitle: 'Konto erstellt!',
      successMessage: 'Wir haben Ihnen eine Bestätigungs-E-Mail gesendet. Klicken Sie auf den Link zur Aktivierung.',
      goToLogin: 'Zur Anmeldung',
      name_required: 'Name eingeben',
      email_required: 'E-Mail eingeben',
      email_invalid: 'Ungültige E-Mail',
      password_required: 'Passwort eingeben',
      password_short: 'Passwort muss mindestens 6 Zeichen haben',
      passwords_mismatch: 'Passwörter stimmen nicht überein',
      email_exists: 'Ein Konto mit dieser E-Mail existiert bereits',
      network_error: 'Verbindungsfehler. Überprüfen Sie Ihr Internet.',
    },
    pl: {
      title: 'Rejestracja',
      subtitle: 'Utwórz konto w ZAspot',
      name: 'Imię',
      namePlaceholder: 'Twoje imię',
      email: 'E-mail',
      password: 'Hasło',
      confirmPassword: 'Potwierdź hasło',
      register: 'Zarejestruj się',
      hasAccount: 'Masz już konto?',
      login: 'Zaloguj się',
      successTitle: 'Konto utworzone!',
      successMessage: 'Wysłaliśmy e-mail weryfikacyjny. Kliknij link, aby aktywować konto.',
      goToLogin: 'Przejdź do logowania',
      name_required: 'Podaj imię',
      email_required: 'Podaj e-mail',
      email_invalid: 'Nieprawidłowy e-mail',
      password_required: 'Podaj hasło',
      password_short: 'Hasło musi mieć co najmniej 6 znaków',
      passwords_mismatch: 'Hasła nie są zgodne',
      email_exists: 'Konto z tym adresem e-mail już istnieje',
      network_error: 'Błąd połączenia. Sprawdź internet.',
    },
  };

  const l = labels[language] || labels.en;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = l.name_required;
    if (!email.trim()) {
      newErrors.email = l.email_required;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = l.email_invalid;
    }
    if (!password) {
      newErrors.password = l.password_required;
    } else if (password.length < 6) {
      newErrors.password = l.password_short;
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = l.passwords_mismatch;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    const result = await register(email, password, name);

    if (result.success) {
      setShowSuccess(true);
    } else {
      if (result.error === 'email_exists') {
        setErrors({ general: l.email_exists });
      } else if (result.error === 'network_error') {
        setErrors({ general: l.network_error });
      } else {
        setErrors({ general: result.error || l.network_error });
      }
    }

    setIsLoading(false);
  };

  // Success state
  if (showSuccess) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.successContainer}>
          <View style={[styles.successIcon, { backgroundColor: Colors.brand.accentGreen + '20' }]}>
            <Ionicons name="checkmark-circle" size={64} color={Colors.brand.accentGreen} />
          </View>
          <Text style={[styles.successTitle, { color: colors.text }]}>{l.successTitle}</Text>
          <Text style={[styles.successMessage, { color: colors.textSecondary }]}>
            {l.successMessage}
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            style={[styles.loginButton, { backgroundColor: Colors.brand.accentGreen }]}
          >
            <Text style={styles.loginButtonText}>{l.goToLogin}</Text>
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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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

          {/* Name Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{l.name}</Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: colors.surface,
                  borderColor: errors.name ? colors.error : colors.border,
                },
              ]}
            >
              <Ionicons
                name="person-outline"
                size={20}
                color={errors.name ? colors.error : colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={name}
                onChangeText={setName}
                placeholder={l.namePlaceholder}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                autoComplete="name"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
              />
            </View>
            {errors.name && (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.name}</Text>
            )}
          </View>

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
                ref={emailRef}
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
                autoComplete="new-password"
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
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

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{l.confirmPassword}</Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: colors.surface,
                  borderColor: errors.confirmPassword ? colors.error : colors.border,
                },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={errors.confirmPassword ? colors.error : colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                ref={confirmRef}
                style={[styles.input, { color: colors.text }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={l.confirmPassword}
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
            </View>
            {errors.confirmPassword && (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.confirmPassword}</Text>
            )}
          </View>

          {/* Register Button */}
          <TouchableOpacity
            onPress={handleRegister}
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
              <Text style={styles.loginButtonText}>{l.register}</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.registerRow}>
            <Text style={[styles.registerText, { color: colors.textSecondary }]}>
              {l.hasAccount}{' '}
            </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={[styles.registerLink, { color: Colors.brand.accentGreen }]}>
                {l.login}
              </Text>
            </TouchableOpacity>
          </View>
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
    paddingTop: Layout.spacing.md,
    paddingBottom: Layout.spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Layout.spacing.sm,
  },
  header: {
    marginBottom: Layout.spacing.xl,
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
  loginButton: {
    height: 52,
    borderRadius: Layout.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Layout.spacing.sm,
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
  },
  registerText: {
    fontSize: Layout.fontSize.sm,
  },
  registerLink: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '700',
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
