/**
 * Pricing API - Real-time DC/AC electricity prices
 * Fetches spot price + platform fee + operator markups from zaspot.cz
 */

const API_BASE = 'https://zaspot.cz/api';

export interface SpotPriceData {
  price: number;           // Base spot price CZK/kWh
  timeSlot: string;        // e.g. "14:00 - 14:15"
  slot: number;            // 0-95
  exchangeRate: number;    // EUR → CZK
  platformFee: number;     // CZK/kWh
  acMarkup: number;        // CZK/kWh
  dcMarkup: number;        // CZK/kWh
  timestamp: string;
}

export interface EffectivePrices {
  spotPrice: number;
  platformFee: number;
  acPrice: number;         // (spotPrice + platformFee + acMarkup) * 1.21 (incl. VAT)
  dcPrice: number;         // (spotPrice + platformFee + dcMarkup) * 1.21 (incl. VAT)
  acMarkup: number;
  dcMarkup: number;
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
    const prices: EffectivePrices = {
      spotPrice: data.price,
      platformFee: data.platformFee,
      acMarkup: data.acMarkup,
      dcMarkup: data.dcMarkup,
      acPrice: (data.price + data.platformFee + data.acMarkup) * VAT,
      dcPrice: (data.price + data.platformFee + data.dcMarkup) * VAT,
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
