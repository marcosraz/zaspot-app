/**
 * Shop Product Detail
 */
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useShop } from '../../context/ShopContext';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { fetchProduct, ShopProduct } from '../../lib/v2Features';

export default function ProductDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const { addToCart } = useShop();
  const [product, setProduct] = useState<ShopProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetchProduct(slug);
      if (res.ok && res.data?.success) setProduct(res.data.product);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} color={Colors.brand.accentGreen} />;
  }
  if (!product) {
    return (
      <SafeAreaView style={{ flex: 1, padding: 20 }}>
        <Text>Produkt nenalezen</Text>
      </SafeAreaView>
    );
  }

  const onAdd = () => {
    addToCart(product, quantity);
    Alert.alert('Přidáno do košíku', `${quantity}× ${product.name}`, [
      { text: 'OK' },
      { text: 'Do košíku', onPress: () => router.push('/shop/checkout') },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: product.name, headerShown: true }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {product.image_url && (
            <Image source={{ uri: product.image_url }} style={styles.image} resizeMode="cover" />
          )}
          <Text style={[styles.name, { color: colors.text }]}>{product.name}</Text>
          <Text style={[styles.price, { color: Colors.brand.accentGreen }]}>{product.price_czk.toFixed(0)} Kč</Text>
          {product.description && (
            <Text style={[styles.desc, { color: colors.textSecondary }]}>{product.description}</Text>
          )}

          <View style={styles.qtyRow}>
            <Text style={[styles.qtyLabel, { color: colors.text }]}>Množství</Text>
            <View style={styles.qtyControls}>
              <TouchableOpacity onPress={() => setQuantity((q) => Math.max(1, q - 1))} style={[styles.qtyBtn, { borderColor: colors.border }]}>
                <Ionicons name="remove" size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.qtyValue, { color: colors.text }]}>{quantity}</Text>
              <TouchableOpacity onPress={() => setQuantity((q) => q + 1)} style={[styles.qtyBtn, { borderColor: colors.border }]}>
                <Ionicons name="add" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.borderLight }]}>
          <TouchableOpacity
            disabled={!product.in_stock}
            onPress={onAdd}
            style={[styles.addBtn, { backgroundColor: product.in_stock ? Colors.brand.accentGreen : colors.textMuted }]}
          >
            <Ionicons name="cart" size={20} color="#fff" />
            <Text style={styles.addBtnText}>
              {product.in_stock ? `Přidat do košíku · ${(product.price_czk * quantity).toFixed(0)} Kč` : 'Vyprodáno'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Layout.spacing.lg, paddingBottom: 100, gap: 12 },
  image: { width: '100%', height: 280, borderRadius: 14 },
  name: { fontSize: 22, fontWeight: '700', marginTop: 8 },
  price: { fontSize: 24, fontWeight: '700' },
  desc: { fontSize: 15, lineHeight: 22, marginTop: 4 },
  qtyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  qtyLabel: { fontSize: 16, fontWeight: '600' },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  qtyBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  qtyValue: { fontSize: 18, fontWeight: '700', minWidth: 32, textAlign: 'center' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Layout.spacing.lg, borderTopWidth: 1 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, borderRadius: 12 },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
