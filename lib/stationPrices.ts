/**
 * Station price normalization — one comparable number (CZK/kWh) for every
 * station type on the map:
 *
 *  - ZAspot OCPP stations: live effective price from /api/ocpp/station-prices
 *    (spot + distribution + fees per station tariff, bulk endpoint)
 *  - Hubject roaming stations: price_per_kwh in EUR → × EUR/CZK rate
 *    (often null — those sort to the end and are excluded by price filters)
 *  - Public DB stations: their static price_per_kwh (already CZK)
 *
 * The "cheapest nearby" list and the max-price filter both rely on this.
 */
import { apiFetch, API_BASE } from './api';
import { ChargingStation } from './stations';

export interface StationPriceInfo {
  effectivePrice: number;
  pricingMode: string;
  isDc: boolean;
}

export interface PriceContext {
  /** chargePointId → live effective price for ZAspot stations */
  zaspotPrices: Record<string, StationPriceInfo>;
  /** EUR → CZK conversion for Hubject prices */
  eurCzk: number;
  loadedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
let cached: PriceContext | null = null;

export async function loadPriceContext(): Promise<PriceContext> {
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) return cached;

  const [pricesRes, fxRes] = await Promise.all([
    apiFetch<{ success: boolean; prices: Record<string, StationPriceInfo> }>(
      '/ocpp/station-prices'
    ).catch(() => null),
    fetch(`${API_BASE}/exchange-rate`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]);

  cached = {
    zaspotPrices: pricesRes?.ok && pricesRes.data?.prices ? pricesRes.data.prices : {},
    eurCzk:
      fxRes && Number.isFinite(parseFloat(fxRes.rate)) && parseFloat(fxRes.rate) > 0
        ? parseFloat(fxRes.rate)
        : 24.5, // sane fallback if the FX endpoint is unreachable
    loadedAt: Date.now(),
  };
  return cached;
}

/**
 * Comparable price in CZK/kWh for any station on the map, or null when the
 * operator publishes no price (common for Hubject entries).
 */
export function getStationPriceCzk(
  station: ChargingStation,
  ctx: PriceContext
): number | null {
  // ZAspot OCPP station → live effective price by charge point id
  if (station.is_ocpp && station.external_id) {
    const p = ctx.zaspotPrices[station.external_id];
    if (p) return p.effectivePrice;
  }
  // Hubject roaming station → EUR price converted
  if (typeof station.id === 'string' && station.id.startsWith('emp-')) {
    if (station.price_per_kwh != null && station.price_per_kwh > 0) {
      return Math.round(station.price_per_kwh * ctx.eurCzk * 100) / 100;
    }
    return null;
  }
  // Public DB station → static CZK price as stored
  if (station.price_per_kwh != null && station.price_per_kwh > 0) {
    return station.price_per_kwh;
  }
  return null;
}

/** Sort ascending by price; stations without a published price go last. */
export function sortByPrice(
  stations: ChargingStation[],
  ctx: PriceContext
): { station: ChargingStation; priceCzk: number | null }[] {
  return stations
    .map((station) => ({ station, priceCzk: getStationPriceCzk(station, ctx) }))
    .sort((a, b) => {
      if (a.priceCzk == null && b.priceCzk == null) return 0;
      if (a.priceCzk == null) return 1;
      if (b.priceCzk == null) return -1;
      return a.priceCzk - b.priceCzk;
    });
}
