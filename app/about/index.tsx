/**
 * O aplikaci — app version, company identity, legal links.
 * Target of the previously dead "O aplikaci" menu item in the profile.
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';

const COMPANY = {
  name: 'Sdil Building Automotive s.r.o.',
  ico: 'IČO 09873236',
  dic: 'DIČ CZ09873236',
  address: 'Štefánikova 605/46b, 612 00 Brno',
  phone: '+420 770 103 103',
  email: 'info@zaspot.cz',
};

export default function AboutScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const version = Constants.expoConfig?.version ?? '—';

  const LINKS: { icon: keyof typeof Ionicons.glyphMap; label: string; url: string }[] = [
    { icon: 'globe-outline', label: t.about.website, url: 'https://www.zaspot.cz' },
    { icon: 'document-text-outline', label: t.about.legal, url: 'https://www.zaspot.cz/cs/legal' },
    { icon: 'reader-outline', label: t.about.terms, url: 'https://www.zaspot.cz/cs/vop' },
    { icon: 'shield-checkmark-outline', label: t.about.privacy, url: 'https://www.zaspot.cz/cs/privacy' },
  ];

  return (
    <>
      <Stack.Screen options={{ title: t.profile.about, headerShown: true }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* App identity */}
          <View style={[styles.hero, { backgroundColor: colors.surface }]}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={[styles.appName, { color: colors.text }]}>ZAspot</Text>
            <Text style={[styles.version, { color: colors.textMuted }]}>
              {t.profile.version} {version}
            </Text>
          </View>

          {/* Links */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            {LINKS.map((link, i) => (
              <React.Fragment key={link.url}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(link.url)}>
                  <Ionicons name={link.icon} size={20} color={Colors.brand.accentGreen} />
                  <Text style={[styles.linkLabel, { color: colors.text }]}>{link.label}</Text>
                  <Ionicons name="open-outline" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>

          {/* Company */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.companyName, { color: colors.text }]}>{COMPANY.name}</Text>
            <Text style={[styles.companyLine, { color: colors.textSecondary }]}>
              {COMPANY.ico} · {COMPANY.dic}
            </Text>
            <Text style={[styles.companyLine, { color: colors.textSecondary }]}>{COMPANY.address}</Text>
            <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 10 }]} />
            <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(`tel:${COMPANY.phone.replace(/ /g, '')}`)}>
              <Ionicons name="call-outline" size={18} color={Colors.brand.accentGreen} />
              <Text style={[styles.contactText, { color: colors.text }]}>{COMPANY.phone}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(`mailto:${COMPANY.email}`)}>
              <Ionicons name="mail-outline" size={18} color={Colors.brand.accentGreen} />
              <Text style={[styles.contactText, { color: colors.text }]}>{COMPANY.email}</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.footer, { color: colors.textMuted }]}>
            © {new Date().getFullYear()} {COMPANY.name}
          </Text>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Layout.spacing.lg, gap: 14, paddingBottom: 40 },
  hero: { alignItems: 'center', padding: 24, borderRadius: 16, gap: 4 },
  logo: { width: 72, height: 72, borderRadius: 18 },
  appName: { fontSize: 22, fontWeight: '800', marginTop: 8 },
  version: { fontSize: 13 },
  card: { borderRadius: 14, padding: 16 },
  divider: { height: StyleSheet.hairlineWidth },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  linkLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  companyName: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  companyLine: { fontSize: 13, lineHeight: 19 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  contactText: { fontSize: 14, fontWeight: '500' },
  footer: { textAlign: 'center', fontSize: 12, marginTop: 8 },
});
