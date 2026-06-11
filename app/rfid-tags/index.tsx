/**
 * My RFID Tags
 */
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { fetchMyRfidTags, addRfidTag, deleteRfidTag, MyRfidTag } from '../../lib/v2Features';

export default function RfidTagsScreen() {
  const { colors } = useTheme();
  const [tags, setTags] = useState<MyRfidTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTag, setNewTag] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const load = async () => {
    const res = await fetchMyRfidTags();
    if (res.ok && res.data?.success) setTags(res.data.tags);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const onAdd = async () => {
    if (!newTag.trim()) return;
    const res = await addRfidTag(newTag.trim(), newDesc.trim() || undefined);
    if (res.ok && res.data?.success) {
      setNewTag('');
      setNewDesc('');
      load();
    } else {
      Alert.alert('Chyba', 'Tag se nepodařilo přidat');
    }
  };

  const onDelete = (tag: MyRfidTag) => {
    Alert.alert('Smazat RFID tag?', tag.id_tag, [
      { text: 'Zrušit', style: 'cancel' },
      { text: 'Smazat', style: 'destructive', onPress: () => deleteRfidTag(tag.id).then(load) },
    ]);
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={Colors.brand.accentGreen} />;

  return (
    <>
      <Stack.Screen options={{ title: 'RFID karty', headerShown: true }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.addCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Text style={[styles.title, { color: colors.text }]}>Přidat RFID tag</Text>
            <TextInput
              value={newTag}
              onChangeText={setNewTag}
              placeholder="UID karty (např. ABCD1234)"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            />
            <TextInput
              value={newDesc}
              onChangeText={setNewDesc}
              placeholder="Popis (volitelné)"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text, borderColor: colors.border, marginTop: 8 }]}
            />
            <TouchableOpacity
              onPress={onAdd}
              disabled={!newTag.trim()}
              style={[styles.addBtn, { backgroundColor: newTag.trim() ? Colors.brand.accentGreen : colors.textMuted }]}
            >
              <Text style={styles.addBtnText}>Přidat</Text>
            </TouchableOpacity>
          </View>

          {tags.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textMuted }]}>Žádné RFID karty</Text>
          ) : (
            tags.map((t) => (
              <View key={t.id} style={[styles.tagCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                <Ionicons name="card" size={20} color={Colors.brand.accentGreen} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.tagId, { color: colors.text }]}>{t.id_tag}</Text>
                  {t.description && (
                    <Text style={[styles.tagDesc, { color: colors.textMuted }]} numberOfLines={1}>{t.description}</Text>
                  )}
                </View>
                <Text style={[styles.tagStatus, { color: (t.status === 'active' || t.status === 'Accepted') ? Colors.brand.accentGreen : colors.error }]}>
                  {t.status}
                </Text>
                <TouchableOpacity onPress={() => onDelete(t)}>
                  <Ionicons name="trash" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Layout.spacing.lg, gap: 10, paddingBottom: 40 },
  addCard: { padding: 16, borderRadius: 12, borderWidth: 1 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14 },
  addBtn: { padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  tagCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  tagId: { fontSize: 14, fontWeight: '600' },
  tagDesc: { fontSize: 12, marginTop: 2 },
  tagStatus: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  empty: { textAlign: 'center', padding: 30 },
});
