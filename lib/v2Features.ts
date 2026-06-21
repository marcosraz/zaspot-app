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
  my_share_percent: number;
  my_energy_kwh: number;
  my_savings_czk: number;
  current_month_energy_kwh: number;
}

export interface CommunityBilling {
  id: string;
  period_month: string;
  energy_kwh: number;
  total_czk: number;
  status: string;
}

// All community-energy read routes return { data: ... } with NO top-level
// `success` and camelCase fields. These helpers unwrap `data` and remap to the
// snake_case shape the screen renders, synthesising `success: res.ok` so the
// screen's existing guards keep working.

export async function fetchPublicCommunityInfo() {
  // GET /community-energy/info → { success, communities: CommunityInfo[] }
  return apiFetch<{ success: boolean; communities: CommunityInfo[] }>('/community-energy/info');
}

export async function fetchMyCommunity(): Promise<{ ok: boolean; status: number; data: { success: boolean; community: CommunityInfo | null } }> {
  const res = await apiFetch<{ data: { community?: any } | null }>(
    '/community-energy/my-community',
    { requireAuth: true }
  );
  const c = res.data?.data?.community;
  const community: CommunityInfo | null = c
    ? {
        id: c.id,
        name: c.name,
        region: null, // region (regionOrp) is only on the public /info route
        member_count: c.totalMembersCount ?? 0,
        total_energy_kwh: Number(c.totalSharedKwh) || 0,
        status: c.status,
      }
    : null;
  return { ok: res.ok, status: res.status, data: { success: res.ok, community } };
}

export async function fetchMyCommunityStats(): Promise<{ ok: boolean; status: number; data: { success: boolean; stats: MyCommunityStats | null } }> {
  const res = await apiFetch<{ data: any | null }>(
    '/community-energy/my-stats',
    { requireAuth: true }
  );
  const d = res.data?.data;
  const stats: MyCommunityStats | null = d
    ? {
        my_share_percent: 0, // allocation % lives on my-community.member, not my-stats
        my_energy_kwh: Number(d.totals?.sharedKwh) || 0,
        my_savings_czk: Number(d.totals?.amountCzk) || 0,
        current_month_energy_kwh: Number(d.currentMonth?.sharedKwh) || 0,
      }
    : null;
  return { ok: res.ok, status: res.status, data: { success: res.ok, stats } };
}

export async function fetchMyCommunityBilling(): Promise<{ ok: boolean; status: number; data: { success: boolean; billings: CommunityBilling[] } }> {
  const res = await apiFetch<{ data: any[] | null }>(
    '/community-energy/my-billing',
    { requireAuth: true }
  );
  const arr = Array.isArray(res.data?.data) ? res.data.data : [];
  const billings: CommunityBilling[] = arr.map((r: any) => ({
    id: r.id,
    period_month: r.billingMonth,
    energy_kwh: Number(r.sharedKwh) || 0,
    total_czk: Number(r.totalAmountCzk) || 0,
    status: r.periodStatus,
  }));
  return { ok: res.ok, status: res.status, data: { success: res.ok, billings } };
}

export async function applyToCommunity(
  communityId: string,
  args: { fullName: string; email: string; applicationType: 'vyrobna' | 'spotreba'; phone?: string; ean?: string }
) {
  // POST /community-energy/apply requires communityId + fullName + email +
  // applicationType ('vyrobna'|'spotreba'); EAN field is `eanNumber`.
  return apiFetch<{ success: boolean; error?: string }>('/community-energy/apply', {
    method: 'POST',
    body: JSON.stringify({
      communityId,
      fullName: args.fullName,
      email: args.email,
      applicationType: args.applicationType,
      phone: args.phone,
      eanNumber: args.ean,
    }),
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

export async function fetchMyCards(): Promise<{ ok: boolean; status: number; data: { success: boolean; cards: SavedCard[] } }> {
  // The endpoint returns a SINGLE-card shape: { success, has_card, card_pattern,
  // token_status, registered_at } — NOT a { cards: [] } array. Casting it to a
  // cards[] left `cards` undefined and crashed the screen on .length / .map.
  // Normalize here so the UI always receives a real array.
  const res = await apiFetch<{
    success: boolean;
    has_card?: boolean;
    card_pattern?: string | null;
    token_status?: string;
    registered_at?: string | null;
    cards?: SavedCard[];
  }>('/payment/card-token', { requireAuth: true });

  let cards: SavedCard[] = [];
  if (res.ok && res.data?.success) {
    if (Array.isArray(res.data.cards)) {
      cards = res.data.cards;
    } else if (res.data.has_card && res.data.card_pattern) {
      cards = [{
        id: 'default',
        masked_pan: res.data.card_pattern,
        expiry: '',
        card_brand: null,
        is_default: true,
        created_at: res.data.registered_at ?? '',
      }];
    }
  }
  return { ok: res.ok, status: res.status, data: { success: res.data?.success ?? res.ok, cards } };
}

export async function registerCard() {
  // Returns a payment URL where user enters card to register it without charge.
  // Backend (and the web app) return this as `verification_url`; older app code
  // read `registrationUrl` → always undefined → "Registraci karty se nepodařilo
  // zahájit". Accept both names so the contract can't silently drift again.
  return apiFetch<{ success: boolean; verification_url?: string; registrationUrl?: string }>('/payment/register-card', {
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
  iban: string;
  bic: string;
  recipient: string;
  variable_symbol: string;
  amount_czk: number;
  currency?: 'CZK' | 'EUR';
  amount_eur?: number;
  reference?: string;
  spd_string?: string;
  qr_data_url?: string;
  expires_at?: string;
}

// Subset of bank_transfer_requests row returned by /active
export interface PendingTransfer {
  id: string;
  amount_czk: number;
  variable_symbol: string;
  status: string;
  expires_at: string;
  created_at: string;
}

export async function fetchActiveBankTransfers() {
  return apiFetch<{ success: boolean; transfers: PendingTransfer[] }>(
    '/payment/bank-transfer/active',
    { requireAuth: true },
  );
}

export async function cancelBankTransfer(id: string) {
  return apiFetch<{ success: boolean; error?: string }>(
    '/payment/bank-transfer/cancel',
    {
      method: 'POST',
      body: JSON.stringify({ id }),
      requireAuth: true,
    },
  );
}

// Backend endpoint is /payment/bank-transfer/create (not /payment/bank-transfer).
// Response shape is flat — fields live at the top level, not under .transfer.
export async function requestBankTransfer(amount: number, currency: 'CZK' | 'EUR' = 'CZK') {
  const res = await apiFetch<
    | (BankTransferInfo & { success: true; id: string })
    | { success: false; error?: string }
  >('/payment/bank-transfer/create', {
    method: 'POST',
    body: JSON.stringify(
      currency === 'EUR' ? { currency: 'EUR', amount_eur: amount } : { amount_czk: amount }
    ),
    requireAuth: true,
  });

  if (res.ok && res.data.success) {
    const { success: _s, id: _id, ...transfer } = res.data;
    return { ok: true as const, data: { success: true, transfer: transfer as BankTransferInfo } };
  }
  const errMsg = res.ok ? ('error' in res.data ? res.data.error : undefined) : undefined;
  return { ok: false as const, data: { success: false, error: errMsg ?? 'bank_transfer_failed' } };
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

// `stationId` is the station UUID (ChargingStation.id === ocpp_charge_points.id),
// NOT the OCPP charge_point_id string. The correct per-station routes use
// getAuthUserId() (Bearer auth) and key on that UUID. GET returns only { reviews }
// (no success / average — compute the average client-side).
export async function fetchStationReviews(stationId: string) {
  return apiFetch<{ reviews: StationReview[] }>(
    `/stations/${encodeURIComponent(stationId)}/reviews`
  );
}

export async function submitReview(stationId: string, rating: number, comment?: string) {
  // POST derives the station from the path and the user from the Bearer token.
  return apiFetch<{ success: boolean }>(`/stations/${encodeURIComponent(stationId)}/reviews`, {
    method: 'POST',
    body: JSON.stringify({ rating, comment }),
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

export async function fetchStationPhotos(stationId: string) {
  // GET /stations/[id]/photos returns { photos } (no `success`).
  return apiFetch<{ photos: StationPhoto[] }>(
    `/stations/${encodeURIComponent(stationId)}/photos`
  );
}

export async function uploadStationPhoto(
  stationId: string,
  uri: string,
  caption?: string
): Promise<{ ok: boolean; error?: string }> {
  const { getStoredAuth, API_BASE } = await import('./api');
  const auth = await getStoredAuth();
  if (!auth) return { ok: false, error: 'not_authenticated' };

  const form = new FormData();
  if (caption) form.append('caption', caption);
  // The route reads the image from form field `file` (not `photo`).
  // @ts-ignore — RN expects this special object shape
  form.append('file', { uri, name: 'photo.jpg', type: 'image/jpeg' });

  try {
    const res = await fetch(`${API_BASE}/stations/${encodeURIComponent(stationId)}/photos`, {
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
  status: string; // DB stores 'Accepted'/'Blocked' — not the old 'active'|'blocked'
  created_at: string;
}

export async function fetchMyRfidTags(): Promise<{ ok: boolean; status: number; data: { success: boolean; tags: MyRfidTag[] } }> {
  // GET /rfid-tags returns { rfidTags: [{ id, tagId, description, status, createdAt }] }
  // — NO `success` key, camelCase fields. Unwrap + remap to what the screen expects.
  const res = await apiFetch<{ rfidTags?: any[] }>('/rfid-tags', { requireAuth: true });
  const tags: MyRfidTag[] = res.ok && Array.isArray(res.data?.rfidTags)
    ? res.data.rfidTags.map((t: any) => ({
        id: t.id,
        id_tag: t.tagId,
        description: t.description ?? null,
        status: t.status,
        created_at: t.createdAt,
      }))
    : [];
  return { ok: res.ok, status: res.status, data: { success: res.ok, tags } };
}

export async function addRfidTag(idTag: string, description?: string) {
  // POST /rfid-tags parses `tagId` (not `id_tag`) → sending the wrong name 400'd.
  return apiFetch<{ success: boolean }>('/rfid-tags', {
    method: 'POST',
    body: JSON.stringify({ tagId: idTag, description }),
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

// The /emp/stations endpoint returns DB-shaped rows (station_name, geo_lat,
// plugs, current_status, …), NOT the EmpStation shape the UI assumes. Casting it
// left `connectors`/`name`/`latitude` undefined and crashed on `s.connectors.map`.
// This adapter maps the real fields and guarantees `connectors` is always an array.
function adaptEmpStation(raw: any): EmpStation {
  const statusRaw = String(raw?.current_status ?? '').toLowerCase();
  const status: EmpStation['status'] =
    statusRaw === 'available' ? 'available'
    : (statusRaw === 'occupied' || statusRaw === 'charging') ? 'occupied'
    : 'unknown';
  const powerKw = typeof raw?.power_kw === 'number' ? raw.power_kw : 0;
  const connectors = Array.isArray(raw?.plugs)
    ? raw.plugs.map((p: any) => ({ type: String(p), power_kw: powerKw }))
    : [];
  return {
    evse_id: raw?.evse_id ?? raw?.id ?? '',
    name: raw?.station_name ?? raw?.name ?? '',
    operator: raw?.operator_name ?? '',
    latitude: typeof raw?.geo_lat === 'number' ? raw.geo_lat : 0,
    longitude: typeof raw?.geo_lon === 'number' ? raw.geo_lon : 0,
    address: raw?.address ?? '',
    max_power_kw: powerKw,
    connectors,
    status,
    price_per_kwh: typeof raw?.price_per_kwh === 'number' ? raw.price_per_kwh : null,
  };
}

export async function fetchEmpStations(params?: {
  lat?: number;
  lng?: number;
  radius_km?: number;
  /** Map viewport "west,south,east,north" — preferred over lat/radius for the
   *  map, mirrors the web charging-map. Server caps limit at 1000. */
  bounds?: string;
  limit?: number;
}): Promise<{ ok: boolean; status: number; data: { success: boolean; stations: EmpStation[] } }> {
  const qs = new URLSearchParams();
  // The route reads lat/lon/radius (NOT lng/radius_km). With the wrong names the
  // geo filter never activated → full-table scan of ~53k rows → the request hung
  // and the screen spun forever. Use the correct names + a hard limit so it hits
  // the (geo_lat, geo_lon) index and returns only the nearby bounding box.
  if (params?.bounds) qs.set('bounds', params.bounds);
  if (params?.lat != null) qs.set('lat', String(params.lat));
  if (params?.lng != null) qs.set('lon', String(params.lng));
  if (params?.radius_km != null) qs.set('radius', String(params.radius_km));
  qs.set('limit', String(params?.limit ?? 300));
  const q = qs.toString();
  const res = await apiFetch<{ success: boolean; stations: any[] }>(
    `/emp/stations${q ? '?' + q : ''}`,
    { requireAuth: true }
  );
  const stations = res.ok && Array.isArray(res.data?.stations)
    ? res.data.stations.map(adaptEmpStation)
    : [];
  return { ok: res.ok, status: res.status, data: { success: res.data?.success ?? res.ok, stations } };
}

// ─── EMP Roaming: Start/Stop + active session ───

export interface EmpRoamingSession {
  id: string;
  evse_id: string;
  station_name: string | null;
  operator_name: string | null;
  session_status: 'pending' | 'authorizing' | 'active' | 'completed' | 'failed';
  hubject_session_id: string | null;
  requested_at: string | null;
  started_at: string | null;
}

export interface EmpCompletedSession {
  id: string;
  evse_id: string;
  station_name: string | null;
  operator_name: string | null;
  energy_kwh: string | null;
  user_total_cost: string | null;
  billed_to_user: boolean;
  ended_at: string | null;
}

/** Start charging at a foreign (Hubject) station. 402 = balance below the
 *  roaming minimum (min_balance_czk in the response), 409 = a roaming session
 *  is already running. */
export async function empRemoteStart(evseId: string): Promise<{
  ok: boolean;
  status: number;
  data: {
    success: boolean;
    sessionId?: string;
    error?: string;
    balance_czk?: number;
    min_balance_czk?: number;
  };
}> {
  return apiFetch(`/emp/remote-start`, {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify({ evseId }),
  });
}

/** Stop the user's running roaming session (sessionId optional — the server
 *  resolves the single active one). */
export async function empRemoteStop(sessionId?: string): Promise<{
  ok: boolean;
  status: number;
  data: { success: boolean; error?: string };
}> {
  return apiFetch(`/emp/remote-stop`, {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify(sessionId ? { sessionId } : {}),
  });
}

/** The user's current roaming session (null when idle) — polled for the
 *  status banner on the eRoaming screen. */
export async function fetchActiveEmpSession(): Promise<{
  ok: boolean;
  status: number;
  data: {
    success: boolean;
    session: EmpRoamingSession | null;
    lastCompleted?: EmpCompletedSession | null;
  };
}> {
  return apiFetch(`/emp/session`, { requireAuth: true });
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
