/**
 * Pricing API - Real-time DC/AC electricity prices
 * Fetches spot price + platform fee + operator markups from zaspot.cz
 */

const API_BASE = 'https://www.zaspot.cz/api';

/**
 * ZAfix — ZAspot's fixed energy price (CZK/kWh, excl. VAT/distribution/fees).
 * Mirrors `ZAFIX_PRICE` on the web homepage (HomePageClient.tsx). It is a flat
 * alternative to the fluctuating OTE spot energy price; the surrounding fees
 * (distribution, markup, platform fee, VAT) are identical to the spot path.
 */
export const ZAFIX_ENERGY_PRICE = 2.9;

export interface SpotPriceData {
  price: number;                // Base spot price CZK/kWh
  timeSlot: string;             // e.g. "14:00 - 14:15"
  slot: number;                 // 0-95
  exchangeRate: number;         // EUR → CZK
  platformFee: number;          // CZK/kWh
  distributionFee?: number;     // legacy fallback
  acDistributionFee: number;    // CZK/kWh — D25d tariff
  dcDistributionFee: number;    // CZK/kWh — C45d tariff
  acDistributionLabel?: string;
  dcDistributionLabel?: string;
  acMarkup: number;             // CZK/kWh
  dcMarkup: number;             // CZK/kWh
  timestamp: string;
}

export interface EffectivePrices {
  spotPrice: number;
  platformFee: number;
  acDistributionFee: number;
  dcDistributionFee: number;
  // (spotPrice + acDistributionFee + acMarkup + platformFee) * 1.21 (incl. VAT)
  acPrice: number;
  // (spotPrice + dcDistributionFee + dcMarkup + platformFee) * 1.21 (incl. VAT)
  dcPrice: number;
  acMarkup: number;
  dcMarkup: number;
  // ZAfix fixed-price variant — same formula as ac/dcPrice but with the energy
  // term replaced by the flat ZAFIX_ENERGY_PRICE instead of the live spot price.
  zafixEnergyPrice: number; // raw fixed energy price excl. VAT (== ZAFIX_ENERGY_PRICE)
  zafixAcPrice: number;     // total AC incl. VAT
  zafixDcPrice: number;     // total DC incl. VAT
  timeSlot: string;
  timestamp: string;
}

// Cache for 60 seconds
let cachedPrices: EffectivePrices | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 1000;

/**
 * Fetch current effective DC/AC prices
 */
export async function fetchEffectivePrices(): Promise<EffectivePrices | null> {
  // Return cache if fresh
  if (cachedPrices && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedPrices;
  }

  try {
    const res = await fetch(`${API_BASE}/current-spot-price`);
    if (!res.ok) return cachedPrices; // Return stale cache on error

    const data: SpotPriceData = await res.json();

    const VAT = 1.21; // 21% Czech DPH
    // Fallback: legacy responses without per-type distribution fees
    const acDist = data.acDistributionFee ?? data.distributionFee ?? 0;
    const dcDist = data.dcDistributionFee ?? data.distributionFee ?? 0;
    const prices: EffectivePrices = {
      spotPrice: data.price,
      platformFee: data.platformFee,
      acDistributionFee: acDist,
      dcDistributionFee: dcDist,
      acMarkup: data.acMarkup,
      dcMarkup: data.dcMarkup,
      // Web formula: (spot + distrib + markup + platform) * VAT
      acPrice: (data.price + acDist + data.acMarkup + data.platformFee) * VAT,
      dcPrice: (data.price + dcDist + data.dcMarkup + data.platformFee) * VAT,
      // ZAfix: identical formula, flat energy price instead of spot
      zafixEnergyPrice: ZAFIX_ENERGY_PRICE,
      zafixAcPrice: (ZAFIX_ENERGY_PRICE + acDist + data.acMarkup + data.platformFee) * VAT,
      zafixDcPrice: (ZAFIX_ENERGY_PRICE + dcDist + data.dcMarkup + data.platformFee) * VAT,
      timeSlot: data.timeSlot,
      timestamp: data.timestamp,
    };

    cachedPrices = prices;
    cacheTimestamp = Date.now();
    return prices;
  } catch (error) {
    console.error('Error fetching effective prices:', error);
    return cachedPrices;
  }
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  return price.toFixed(2);
}

// ─── Station-specific tariff prices ──────────────────────────────
//
// Stations can have their own tariff (fixed price or custom operator markup)
// that overrides the global spot formula above. /api/terminal-price is the
// same source the web charge page uses; the formulas below mirror its
// getConnectorPriceInclVat() and the OCPP-server billing path exactly:
//   fixed: (fixedPrice + platformFee) × VAT
//   spot:  (spot + distribution(AC/DC) + platformFee + operatorMarkup) × VAT
//   both clamped to max(0.01, minPrice + platformFee) before VAT.

export interface StationTariffPrices {
  pricingMode: 'spot' | 'fixed';
  /** Customer price incl. VAT for fixed tariffs (AC/DC identical) */
  fixedPriceInclVat: number | null;
  /** Customer prices incl. VAT for spot tariffs */
  acPriceInclVat: number;
  dcPriceInclVat: number;
  spotPrice: number;
  tariffName: string | null;
  timestamp: string;
}

interface TerminalPriceResponse {
  pricingMode?: string;
  spotPrice?: number;
  platformFee?: number;
  distributionFeeAc?: number;
  distributionFeeDc?: number;
  operatorMarkup?: number;
  fixedPrice?: number | null;
  minPrice?: number;
  stationFound?: boolean;
  tariffName?: string | null;
  timestamp?: string;
}

const stationPriceCache = new Map<string, { data: StationTariffPrices; at: number }>();
const STATION_PRICE_TTL = 60 * 1000;

export async function fetchStationTariffPrices(
  chargePointId: string
): Promise<StationTariffPrices | null> {
  const hit = stationPriceCache.get(chargePointId);
  if (hit && Date.now() - hit.at < STATION_PRICE_TTL) return hit.data;

  try {
    const res = await fetch(
      `${API_BASE}/terminal-price?chargePointId=${encodeURIComponent(chargePointId)}`
    );
    if (!res.ok) return hit?.data ?? null;

    const data: TerminalPriceResponse = await res.json();
    if (data.stationFound === false) return null;

    const VAT = 1.21;
    const spot = Number.isFinite(data.spotPrice) ? (data.spotPrice as number) : 0;
    // NOT `|| 0.5` — a legitimate 0 platform fee must be honored (free networks)
    const platformFee = Number.isFinite(data.platformFee) ? (data.platformFee as number) : 0.5;
    const markup = Number.isFinite(data.operatorMarkup) ? (data.operatorMarkup as number) : 0;
    const distAc = Number.isFinite(data.distributionFeeAc) ? (data.distributionFeeAc as number) : 2.27;
    const distDc = Number.isFinite(data.distributionFeeDc) ? (data.distributionFeeDc as number) : 0.9;
    const minPrice = Number.isFinite(data.minPrice) ? (data.minPrice as number) : 0;

    const floor = Math.max(0.01, minPrice > 0 ? minPrice + platformFee : 0);
    const clamp = (raw: number) => (raw < floor ? floor : raw);
    const round2 = (v: number) => Math.round(v * 100) / 100;

    const isFixed = data.pricingMode === 'fixed' && data.fixedPrice != null;
    const fixedInclVat = isFixed
      ? round2(clamp((data.fixedPrice as number) + platformFee) * VAT)
      : null;

    const prices: StationTariffPrices = {
      pricingMode: isFixed ? 'fixed' : 'spot',
      fixedPriceInclVat: fixedInclVat,
      acPriceInclVat: fixedInclVat ?? round2(clamp(spot + distAc + platformFee + markup) * VAT),
      dcPriceInclVat: fixedInclVat ?? round2(clamp(spot + distDc + platformFee + markup) * VAT),
      spotPrice: spot,
      tariffName: data.tariffName ?? null,
      timestamp: data.timestamp ?? new Date().toISOString(),
    };

    stationPriceCache.set(chargePointId, { data: prices, at: Date.now() });
    return prices;
  } catch (error) {
    console.error('Error fetching station tariff prices:', error);
    return hit?.data ?? null;
  }
}
