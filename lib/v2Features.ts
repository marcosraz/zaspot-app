/**
 * v2.0 User App Feature APIs
 * Bündelt: Community Energy, Shop, Cards (Tokenization), Magic Link,
 * Bank Transfer, Achievements, Price Alerts, Reviews, Photos,
 * RFID Tags, EMP Roaming, POIs.
 */

import { apiFetch } from './api';

// ─── Community Energy ────────────────────────────

export interface CommunityInfo {
  id: string;
  name: string;
  region: string | null;
  member_count: number;
  total_energy_kwh: number;
  status: string;
}

export interface MyCommunityStats {
  community: CommunityInfo;
  my_share_percent: number;
  my_energy_kwh: number;
  my_savings_czk: number;
  current_month_energy_kwh: number;
}

export async function fetchPublicCommunityInfo() {
  return apiFetch<{ success: boolean; communities: CommunityInfo[] }>('/community-energy/info');
}

export async function fetchMyCommunity() {
  return apiFetch<{ success: boolean; community: CommunityInfo | null }>(
    '/community-energy/my-community',
    { requireAuth: true }
  );
}

export async function fetchMyCommunityStats() {
  return apiFetch<{ success: boolean; stats: MyCommunityStats | null }>(
    '/community-energy/my-stats',
    { requireAuth: true }
  );
}

export async function fetchMyCommunityBilling() {
  return apiFetch<{
    success: boolean;
    billings: Array<{
      id: string;
      period_month: string;
      energy_kwh: number;
      total_czk: number;
      status: string;
    }>;
  }>('/community-energy/my-billing', { requireAuth: true });
}

export async function applyToCommunity(communityId: string, ean?: string) {
  return apiFetch<{ success: boolean }>('/community-energy/apply', {
    method: 'POST',
    body: JSON.stringify({ communityId, ean }),
    requireAuth: true,
  });
}

// ─── Shop ────────────────────────────────────────

export interface ShopProduct {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_czk: number;
  image_url: string | null;
  in_stock: boolean;
  category: string | null;
}

export interface ShopCartItem {
  product: ShopProduct;
  quantity: number;
}

export interface ShopOrder {
  id: string;
  order_number: string;
  status: string;
  total_amount_czk: number;
  tracking_number: string | null;
  created_at: string;
  items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit_price_czk: number;
    total_price_czk: number;
  }>;
}

export async function fetchProducts() {
  // Public listing — no auth required
  return apiFetch<{ success: boolean; products: ShopProduct[] }>('/shop');
}

export async function fetchProduct(slug: string) {
  return apiFetch<{ success: boolean; product: ShopProduct }>(`/shop?slug=${encodeURIComponent(slug)}`);
}

export async function shopCheckout(payload: {
  items: Array<{ product_id: string; quantity: number }>;
  payment_method: 'card' | 'wallet';
  shipping_address: string;
  contact_email?: string;
}) {
  return apiFetch<{ success: boolean; orderId?: string; paymentUrl?: string; error?: string }>(
    '/shop/checkout',
    {
      method: 'POST',
      body: JSON.stringify(payload),
      requireAuth: true,
    }
  );
}

export async function fetchMyOrders() {
  return apiFetch<{ success: boolean; orders: ShopOrder[] }>('/shop/orders', { requireAuth: true });
}

export async function fetchOrderDetail(id: string) {
  return apiFetch<{ success: boolean; order: ShopOrder }>(`/shop/order?id=${encodeURIComponent(id)}`, {
    requireAuth: true,
  });
}

// ─── Cards (Tokenization) ────────────────────────

export interface SavedCard {
  id: string;
  masked_pan: string;
  expiry: string;
  card_brand: string | null;
  is_default: boolean;
  created_at: string;
}

export async function fetchMyCards() {
  return apiFetch<{ success: boolean; cards: SavedCard[] }>('/payment/card-token', {
    requireAuth: true,
  });
}

export async function registerCard() {
  // Returns a payment URL where user enters card to register it without charge
  return apiFetch<{ success: boolean; registrationUrl?: string }>('/payment/register-card', {
    method: 'POST',
    body: JSON.stringify({}),
    requireAuth: true,
  });
}

export async function deleteCard(id: string) {
  return apiFetch<{ success: boolean }>(`/payment/card-token?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    requireAuth: true,
  });
}

// ─── Magic Link Login ────────────────────────────

export async function requestMagicLink(email: string) {
  return apiFetch<{ success: boolean }>('/auth/magic-link', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

// ─── Bank Transfer ───────────────────────────────

export interface BankTransferInfo {
  account_number: string;
  iban: string;
  swift: string;
  variable_symbol: string;
  amount_czk: number;
  recipient_name: string;
  message: string;
}

export async function requestBankTransfer(amountCzk: number) {
  return apiFetch<{ success: boolean; transfer?: BankTransferInfo; error?: string }>(
    '/payment/bank-transfer',
    {
      method: 'POST',
      body: JSON.stringify({ amount_czk: amountCzk }),
      requireAuth: true,
    }
  );
}

// ─── Achievements ────────────────────────────────

export interface Achievement {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  earned_at: string | null;
  progress: number | null;
  target: number | null;
}

export async function fetchMyAchievements() {
  return apiFetch<{ success: boolean; achievements: Achievement[] }>('/user/achievements', {
    requireAuth: true,
  });
}

// ─── Price Alerts ────────────────────────────────

export interface PriceAlert {
  id: string;
  threshold_czk_kwh: number;
  direction: 'below' | 'above';
  is_active: boolean;
  notify_via: 'push' | 'email' | 'both';
}

export async function fetchPriceAlerts() {
  return apiFetch<{ success: boolean; alerts: PriceAlert[] }>('/user/price-alerts', {
    requireAuth: true,
  });
}

export async function createPriceAlert(alert: Omit<PriceAlert, 'id'>) {
  return apiFetch<{ success: boolean; id: string }>('/user/price-alerts', {
    method: 'POST',
    body: JSON.stringify(alert),
    requireAuth: true,
  });
}

export async function deletePriceAlert(id: string) {
  return apiFetch<{ success: boolean }>(`/user/price-alerts?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    requireAuth: true,
  });
}

// ─── Reviews ─────────────────────────────────────

export interface StationReview {
  id: string;
  user_name: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  status: string;
}

export async function fetchStationReviews(chargePointId: string) {
  return apiFetch<{ success: boolean; reviews: StationReview[]; average_rating: number; count: number }>(
    `/user/reviews?chargePointId=${encodeURIComponent(chargePointId)}`
  );
}

export async function submitReview(chargePointId: string, rating: number, comment?: string) {
  return apiFetch<{ success: boolean }>('/user/reviews', {
    method: 'POST',
    body: JSON.stringify({ chargePointId, rating, comment }),
    requireAuth: true,
  });
}

// ─── Photos ──────────────────────────────────────

export interface StationPhoto {
  id: string;
  url: string;
  thumbnail_url: string | null;
  caption: string | null;
  user_name: string | null;
  created_at: string;
}

export async function fetchStationPhotos(chargePointId: string) {
  return apiFetch<{ success: boolean; photos: StationPhoto[] }>(
    `/user/photos?chargePointId=${encodeURIComponent(chargePointId)}`
  );
}

export async function uploadStationPhoto(
  chargePointId: string,
  uri: string,
  caption?: string
): Promise<{ ok: boolean; error?: string }> {
  const { getStoredAuth, API_BASE } = await import('./api');
  const auth = await getStoredAuth();
  if (!auth) return { ok: false, error: 'not_authenticated' };

  const form = new FormData();
  form.append('chargePointId', chargePointId);
  if (caption) form.append('caption', caption);
  // @ts-ignore — RN expects this special object shape
  form.append('photo', { uri, name: 'photo.jpg', type: 'image/jpeg' });

  try {
    const res = await fetch(`${API_BASE}/user/photos`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.token}` },
      body: form,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.error ?? `Upload failed (${res.status})` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: 'network_error' };
  }
}

// ─── RFID Tags ───────────────────────────────────

export interface MyRfidTag {
  id: string;
  id_tag: string;
  description: string | null;
  status: 'active' | 'blocked';
  created_at: string;
}

export async function fetchMyRfidTags() {
  return apiFetch<{ success: boolean; tags: MyRfidTag[] }>('/rfid-tags', { requireAuth: true });
}

export async function addRfidTag(idTag: string, description?: string) {
  return apiFetch<{ success: boolean }>('/rfid-tags', {
    method: 'POST',
    body: JSON.stringify({ id_tag: idTag, description }),
    requireAuth: true,
  });
}

export async function deleteRfidTag(id: string) {
  return apiFetch<{ success: boolean }>(`/rfid-tags/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    requireAuth: true,
  });
}

// ─── EMP Roaming (Hubject Stations) ──────────────

export interface EmpStation {
  evse_id: string;
  name: string;
  operator: string;
  latitude: number;
  longitude: number;
  address: string;
  max_power_kw: number;
  connectors: Array<{ type: string; power_kw: number }>;
  status: 'available' | 'occupied' | 'unknown';
  price_per_kwh: number | null;
}

export async function fetchEmpStations(params?: {
  lat?: number;
  lng?: number;
  radius_km?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.lat != null) qs.set('lat', String(params.lat));
  if (params?.lng != null) qs.set('lng', String(params.lng));
  if (params?.radius_km != null) qs.set('radius_km', String(params.radius_km));
  const q = qs.toString();
  return apiFetch<{ success: boolean; stations: EmpStation[] }>(
    `/emp/stations${q ? '?' + q : ''}`,
    { requireAuth: true }
  );
}

// ─── POIs (Restaurants, Hotels near stations) ───

export interface POI {
  id: string;
  name: string;
  type: 'restaurant' | 'cafe' | 'hotel' | 'shop' | 'other';
  latitude: number;
  longitude: number;
  distance_m: number;
  rating: number | null;
}

export async function fetchPois(lat: number, lng: number, radiusM = 500) {
  return apiFetch<{ success: boolean; pois: POI[] }>(
    `/pois?lat=${lat}&lng=${lng}&radius=${radiusM}`
  );
}
