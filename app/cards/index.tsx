/**
 * Saved Cards — Tokenization for Pre-Auth & Quick Pay
 */
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { fetchMyCards, registerCard, deleteCard, SavedCard } from '../../lib/v2Features';

export default function CardsScreen() {
  const { colors } = useTheme();
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  const load = async () => {
    const res = await fetchMyCards();
    if (res.ok && res.data?.success) setCards(res.data.cards);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const onAddCard = async () => {
    setRegistering(true);
    const res = await registerCard();
    setRegistering(false);
    // Backend returns `verification_url`; keep `registrationUrl` as a fallback.
    const url = res.data?.verification_url ?? res.data?.registrationUrl;
    if (res.ok && url) {
      await WebBrowser.openBrowserAsync(url);
      await load();
    } else {
      Alert.alert('Chyba', 'Registraci karty se nepodařilo zahájit');
    }
  };

  const onDelete = (card: SavedCard) => {
    Alert.alert('Smazat kartu?', `${card.masked_pan}`, [
      { text: 'Zrušit', style: 'cancel' },
      {
        text: 'Smazat',
        style: 'destructive',
        onPress: async () => {
          await deleteCard(card.id);
          load();
        },
      },
    ]);
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={Colors.brand.accentGreen} />;

  return (
    <>
      <Stack.Screen options={{ title: 'Moje karty', headerShown: true }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {cards.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="card-outline" size={56} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Žádné uložené karty</Text>
              <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                Uložte si kartu pro rychlé placení a pre-autorizace na terminálech.
              </Text>
            </View>
          ) : (
            cards.map((c) => (
              <View key={c.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                <Ionicons name="card" size={24} color={Colors.brand.accentGreen} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardPan, { color: colors.text }]}>{c.masked_pan}</Text>
                  <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
                    {[c.card_brand, c.expiry].filter(Boolean).join(' · ') || 'Aktivní'}
                  </Text>
                </View>
                {c.is_default && (
                  <View style={[styles.defaultBadge, { backgroundColor: Colors.brand.accentGreen + '20' }]}>
                    <Text style={[styles.defaultBadgeText, { color: Colors.brand.accentGreen }]}>Výchozí</Text>
                  </View>
                )}
                <TouchableOpacity onPress={() => onDelete(c)}>
                  <Ionicons name="trash" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))
          )}

          <TouchableOpacity
            onPress={onAddCard}
            disabled={registering}
            style={[styles.addBtn, { backgroundColor: Colors.brand.accentGreen, opacity: registering ? 0.6 : 1 }]}
          >
            {registering ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addBtnText}>Přidat kartu</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Layout.spacing.lg, gap: 10, paddingBottom: 40 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  cardPan: { fontSize: 15, fontWeight: '600' },
  cardMeta: { fontSize: 12, marginTop: 2 },
  defaultBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  defaultBadgeText: { fontSize: 11, fontWeight: '600' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, marginTop: 10 },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  empty: { alignItems: 'center', padding: 40, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600' },
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
