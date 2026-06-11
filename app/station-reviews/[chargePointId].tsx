/**
 * Station Reviews — Read & write reviews + photos
 */
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import {
  fetchStationReviews,
  fetchStationPhotos,
  submitReview,
  StationReview,
  StationPhoto,
} from '../../lib/v2Features';

export default function StationReviewsScreen() {
  const { chargePointId } = useLocalSearchParams<{ chargePointId: string }>();
  const { colors } = useTheme();
  const [reviews, setReviews] = useState<StationReview[]>([]);
  const [photos, setPhotos] = useState<StationPhoto[]>([]);
  const [average, setAverage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const [rRes, pRes] = await Promise.all([
      fetchStationReviews(chargePointId),
      fetchStationPhotos(chargePointId),
    ]);
    // The per-station GET routes return { reviews } / { photos } (no `success`,
    // no average) — compute the average client-side.
    if (rRes.ok && Array.isArray(rRes.data?.reviews)) {
      const list = rRes.data.reviews;
      setReviews(list);
      setAverage(list.length ? list.reduce((s, r) => s + (r.rating || 0), 0) / list.length : 0);
    }
    if (pRes.ok && Array.isArray(pRes.data?.photos)) setPhotos(pRes.data.photos);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [chargePointId]);

  const onSubmit = async () => {
    if (rating < 1) return;
    setSubmitting(true);
    const res = await submitReview(chargePointId, rating, comment.trim() || undefined);
    setSubmitting(false);
    if (res.ok && res.data?.success) {
      Alert.alert('Děkujeme', 'Vaše recenze byla přidána.');
      setComment('');
      setRating(5);
      load();
    } else {
      Alert.alert('Chyba', 'Recenzi se nepodařilo odeslat');
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={Colors.brand.accentGreen} />;

  return (
    <>
      <Stack.Screen options={{ title: 'Recenze stanice', headerShown: true }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.summary, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Text style={[styles.avgValue, { color: Colors.brand.accentGreen }]}>{average.toFixed(1)}</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Ionicons
                  key={n}
                  name={n <= Math.round(average) ? 'star' : 'star-outline'}
                  size={20}
                  color="#F59E0B"
                />
              ))}
            </View>
            <Text style={[styles.summaryMeta, { color: colors.textMuted }]}>{reviews.length} recenzí</Text>
          </View>

          {photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
              {photos.map((p) => (
                <Image
                  key={p.id}
                  source={{ uri: p.thumbnail_url ?? p.url }}
                  style={styles.photo}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          )}

          <View style={[styles.writeCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Text style={[styles.writeTitle, { color: colors.text }]}>Napsat recenzi</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setRating(n)} style={{ padding: 4 }}>
                  <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={32} color="#F59E0B" />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Volitelný komentář"
              placeholderTextColor={colors.textMuted}
              multiline
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            />
            <TouchableOpacity
              onPress={onSubmit}
              disabled={submitting}
              style={[styles.btn, { backgroundColor: Colors.brand.accentGreen, opacity: submitting ? 0.6 : 1 }]}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Odeslat</Text>}
            </TouchableOpacity>
          </View>

          {reviews.map((r) => (
            <View key={r.id} style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <View style={styles.reviewHeader}>
                <Text style={[styles.reviewer, { color: colors.text }]}>{r.user_name ?? 'Anonym'}</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Ionicons key={n} name={n <= r.rating ? 'star' : 'star-outline'} size={12} color="#F59E0B" />
                  ))}
                </View>
              </View>
              {r.comment && <Text style={[styles.reviewText, { color: colors.text }]}>{r.comment}</Text>}
              <Text style={[styles.reviewDate, { color: colors.textMuted }]}>
                {new Date(r.created_at).toLocaleDateString('cs')}
              </Text>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Layout.spacing.lg, gap: 10, paddingBottom: 40 },
  summary: { padding: 20, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  avgValue: { fontSize: 48, fontWeight: '700' },
  starsRow: { flexDirection: 'row', gap: 2 },
  summaryMeta: { fontSize: 12, marginTop: 6 },
  photo: { width: 100, height: 100, borderRadius: 10, marginRight: 8 },
  writeCard: { padding: 16, borderRadius: 12, borderWidth: 1, gap: 10 },
  writeTitle: { fontSize: 16, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  btn: { padding: 12, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  reviewCard: { padding: 14, borderRadius: 12, borderWidth: 1, gap: 6 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewer: { fontSize: 14, fontWeight: '600' },
  reviewText: { fontSize: 13, lineHeight: 18 },
  reviewDate: { fontSize: 11, marginTop: 4 },
});
