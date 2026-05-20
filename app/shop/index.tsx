/**
 * Shop Index — Product list
 */
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useShop } from '../../context/ShopContext';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { fetchProducts, ShopProduct } from '../../lib/v2Features';

export default function ShopScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { itemCount } = useShop();
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const res = await fetchProducts();
    if (res.ok && res.data?.success) {
      setProducts(res.data.products);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator style={{ flex: 1 }} color={Colors.brand.accentGreen} />
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Obchod',
          headerShown: true,
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push('/shop/checkout')} style={{ paddingHorizontal: 12 }}>
              <View>
                <Ionicons name="cart" size={24} color={Colors.brand.accentGreen} />
                {itemCount > 0 && (
                  <View style={styles.cartBadge}>
                    <Text style={styles.cartBadgeText}>{itemCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brand.accentGreen} />}
        >
          {products.map((p) => (
            <TouchableOpacity
              key={p.id}
              activeOpacity={0.7}
              onPress={() => router.push(`/shop/${p.slug}`)}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
            >
              {p.image_url ? (
                <Image source={{ uri: p.image_url }} style={styles.image} resizeMode="cover" />
              ) : (
                <View style={[styles.image, { backgroundColor: colors.surfaceSecondary }]} />
              )}
              <View style={styles.cardBody}>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>{p.name}</Text>
                <View style={styles.priceRow}>
                  <Text style={[styles.price, { color: Colors.brand.accentGreen }]}>{p.price_czk.toFixed(0)} Kč</Text>
                  {!p.in_stock && (
                    <Text style={[styles.outOfStock, { color: colors.error }]}>Vyprodáno</Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Layout.spacing.lg, gap: 12, paddingBottom: 40 },
  card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  image: { width: '100%', height: 200 },
  cardBody: { padding: 14 },
  name: { fontSize: 16, fontWeight: '700' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  price: { fontSize: 18, fontWeight: '700' },
  outOfStock: { fontSize: 12, fontWeight: '600' },
  cartBadge: { position: 'absolute', top: -6, right: -8, backgroundColor: Colors.brand.accentGreen, borderRadius: 10, paddingHorizontal: 6, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  cartBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
