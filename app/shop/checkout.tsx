/**
 * Shop Checkout — Cart review & payment
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useShop } from '../../context/ShopContext';
import { useCredit } from '../../context/CreditContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { shopCheckout } from '../../lib/v2Features';

export default function CheckoutScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { cart, total, updateQuantity, removeFromCart, clearCart } = useShop();
  const { balance } = useCredit();
  const { isAuthenticated } = useAuth();
  const { format } = useCurrency();
  const [address, setAddress] = useState('');
  const [method, setMethod] = useState<'card' | 'wallet'>('card');
  const [submitting, setSubmitting] = useState(false);

  const walletDiscount = method === 'wallet' ? Math.round(total * 0.05) : 0;
  const finalTotal = total - walletDiscount;
  const walletInsufficient = method === 'wallet' && finalTotal > balance;

  const onCheckout = async () => {
    if (!isAuthenticated) {
      Alert.alert('Přihlášení', 'Pro nákup se musíte přihlásit');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Doručovací adresa', 'Vyplňte adresu doručení');
      return;
    }
    if (walletInsufficient) {
      Alert.alert('Nedostatek kreditu', 'Dobijte kredit nebo zvolte platbu kartou');
      return;
    }

    setSubmitting(true);
    const res = await shopCheckout({
      items: cart.map((c) => ({ product_id: c.product.id, quantity: c.quantity })),
      payment_method: method,
      shipping_address: address.trim(),
    });
    setSubmitting(false);

    if (!res.ok || !res.data.success) {
      Alert.alert('Chyba', res.data.error ?? 'Objednávku se nepodařilo vytvořit');
      return;
    }

    if (res.data.paymentUrl) {
      // Real external browser — NOT an in-app Custom Tab. A 3DS challenge that hops
      // to another app (e.g. Revolut) destroys an in-app tab and orphans the GP
      // session (payment never finalizes). The external browser survives the
      // app-switch, exactly like the credit top-up flow (see CreditContext).
      await Linking.openURL(res.data.paymentUrl);
    }
    clearCart();
    Alert.alert('Hotovo', 'Objednávka byla vytvořena', [
      { text: 'OK', onPress: () => router.replace('/shop') },
    ]);
  };

  if (cart.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: 'Košík', headerShown: true }} />
        <SafeAreaView style={[styles.empty, { backgroundColor: colors.background }]}>
          <Ionicons name="cart-outline" size={64} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Košík je prázdný</Text>
          <TouchableOpacity onPress={() => router.replace('/shop')} style={[styles.emptyBtn, { backgroundColor: Colors.brand.accentGreen }]}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>Prozkoumat obchod</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Košík', headerShown: true }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {cart.map((item) => (
            <View key={item.product.id} style={[styles.cartItem, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>{item.product.name}</Text>
                <Text style={[styles.itemPrice, { color: Colors.brand.accentGreen }]}>{format(item.product.price_czk, { decimals: 0 })}</Text>
              </View>
              <View style={styles.qtyControls}>
                <TouchableOpacity onPress={() => updateQuantity(item.product.id, item.quantity - 1)} style={[styles.qtyBtn, { borderColor: colors.border }]}>
                  <Ionicons name="remove" size={16} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.qtyValue, { color: colors.text }]}>{item.quantity}</Text>
                <TouchableOpacity onPress={() => updateQuantity(item.product.id, item.quantity + 1)} style={[styles.qtyBtn, { borderColor: colors.border }]}>
                  <Ionicons name="add" size={16} color={colors.text} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => removeFromCart(item.product.id)} style={{ marginLeft: 8 }}>
                <Ionicons name="trash" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))}

          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Doručovací adresa</Text>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="Ulice, město, PSČ"
            placeholderTextColor={colors.textMuted}
            multiline
            style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
          />

          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Platební metoda</Text>
          <PaymentOption
            icon="card"
            label="Karta (GP webpay)"
            sub="Online platba kartou"
            selected={method === 'card'}
            onPress={() => setMethod('card')}
            colors={colors}
          />
          <PaymentOption
            icon="wallet"
            label={`Peněženka · ${format(balance, { decimals: 2 })}`}
            sub={`Sleva 5% · konečně ${format(finalTotal, { decimals: 0 })}`}
            selected={method === 'wallet'}
            onPress={() => setMethod('wallet')}
            colors={colors}
            disabled={total > balance && method !== 'wallet'}
          />

          <View style={[styles.summary, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Row label="Mezisoučet" value={format(total, { decimals: 0 })} colors={colors} />
            {walletDiscount > 0 && (
              <Row label="Sleva (5%)" value={`-${format(walletDiscount, { decimals: 0 })}`} colors={colors} highlight />
            )}
            <Row label="Celkem" value={format(finalTotal, { decimals: 0 })} colors={colors} bold />
          </View>

          <TouchableOpacity
            disabled={submitting || walletInsufficient}
            onPress={onCheckout}
            style={[
              styles.checkoutBtn,
              { backgroundColor: walletInsufficient ? colors.textMuted : Colors.brand.accentGreen },
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.checkoutText}>Dokončit objednávku · {format(finalTotal, { decimals: 0 })}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function PaymentOption({
  icon, label, sub, selected, onPress, colors, disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap; label: string; sub: string; selected: boolean; onPress: () => void; colors: any; disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.payOpt,
        { backgroundColor: colors.surface, borderColor: selected ? Colors.brand.accentGreen : colors.borderLight, opacity: disabled ? 0.5 : 1 },
      ]}
    >
      <Ionicons name={icon} size={22} color={selected ? Colors.brand.accentGreen : colors.text} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[styles.payLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.paySub, { color: colors.textMuted }]}>{sub}</Text>
      </View>
      {selected && <Ionicons name="checkmark-circle" size={22} color={Colors.brand.accentGreen} />}
    </TouchableOpacity>
  );
}

function Row({ label, value, colors, bold, highlight }: { label: string; value: string; colors: any; bold?: boolean; highlight?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: highlight ? Colors.brand.accentGreen : colors.textSecondary, fontWeight: bold ? '700' : '500' }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: highlight ? Colors.brand.accentGreen : colors.text, fontWeight: bold ? '700' : '600' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Layout.spacing.lg, gap: 12, paddingBottom: 40 },
  cartItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, gap: 10 },
  itemName: { fontSize: 14, fontWeight: '600' },
  itemPrice: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  qtyValue: { fontSize: 14, fontWeight: '600', minWidth: 20, textAlign: 'center' },
  sectionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 4 },
  input: { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 15, minHeight: 80, textAlignVertical: 'top' },
  payOpt: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1 },
  payLabel: { fontSize: 14, fontWeight: '600' },
  paySub: { fontSize: 12, marginTop: 2 },
  summary: { padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 16, gap: 6 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14 },
  checkoutBtn: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  checkoutText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyText: { fontSize: 16 },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, marginTop: 8 },
});
