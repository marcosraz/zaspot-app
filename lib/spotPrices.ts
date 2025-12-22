/**
 * Spot Prices API - Optimized for Mobile
 * Uses the zaspot.cz optimized endpoint for fast loading
 * Falls back to legacy OTE proxy if new endpoint not available
 */

export interface SpotPriceData {
  slot: number;      // 0-23 for hourly
  time: string;      // HH:00 format
  price: number;     // CZK per MWh
  priceKwh: number;  // CZK per kWh
}

export interface DailyPrices {
  date: string;
  prices: SpotPriceData[];
  stats: {
    current: number;
    average: number;
    lowest: number;
    highest: number;
    lowestSlot: number;
    highestSlot: number;
  };
}

// Cache for today's prices
let cachedPrices: DailyPrices | null = null;
let cacheTime: number = 0;
const CACHE_MS = 10 * 60 * 1000; // 10 minutes

// Exchange rate cache
let cachedExchangeRate: number = 25.2;
let exchangeRateFetchTime: number = 0;
const EXCHANGE_RATE_CACHE_MS = 60 * 60 * 1000;

/**
 * Get current 15-minute slot (0-95)
 */
export function getCurrentSlot(): number {
  const now = new Date();
  return now.getHours() * 4 + Math.floor(now.getMinutes() / 15);
}

function formatSlotTime(slot: number): string {
  return `${slot.toString().padStart(2, '0')}:00`;
}

/**
 * Fetch exchange rate (with caching)
 */
async function getExchangeRate(): Promise<number> {
  if (Date.now() - exchangeRateFetchTime < EXCHANGE_RATE_CACHE_MS) {
    return cachedExchangeRate;
  }
  try {
    const response = await fetch('https://api.frankfurter.app/latest?from=EUR&to=CZK');
    if (response.ok) {
      const data = await response.json();
      cachedExchangeRate = data.rates?.CZK || 25.2;
      exchangeRateFetchTime = Date.now();
    }
  } catch {
    // Use cached rate
  }
  return cachedExchangeRate;
}

/**
 * Fallback: Fetch from legacy OTE proxy
 */
async function fetchFromLegacyProxy(dateKey: string): Promise<DailyPrices | null> {
  const [year, month, day] = dateKey.split('-');
  const exchangeRate = await getExchangeRate();

  const response = await fetch(
    `https://www.zaspot.cz/api/oteProxyHandler?date_from_to=${day}.${month}.${year}&currency_code=EUR&time_resolution=PT60M`
  );

  if (!response.ok) return null;

  const data = await response.json();
  const priceSeries = data?.data?.dataLine?.find(
    (s: any) => s.title?.toLowerCase().includes('price')
  );

  if (!priceSeries?.point) return null;

  const prices: SpotPriceData[] = [];
  for (let slot = 0; slot < 24; slot++) {
    prices.push({ slot, time: formatSlotTime(slot), price: 0, priceKwh: 0 });
  }

  priceSeries.point.forEach((p: any) => {
    const slot = (typeof p.x === 'number' ? p.x : parseInt(p.x)) - 1;
    if (slot >= 0 && slot < 24) {
      const priceCZK = p.y * exchangeRate;
      prices[slot].price = Math.round(priceCZK);
      prices[slot].priceKwh = priceCZK / 1000;
    }
  });

  const validPrices = prices.filter(p => p.price > 0);
  if (validPrices.length === 0) return null;

  const priceValues = validPrices.map(p => p.priceKwh);
  const now = new Date();
  const currentPrice = prices[now.getHours()]?.priceKwh || priceValues[0];
  const lowestPrice = Math.min(...priceValues);
  const highestPrice = Math.max(...priceValues);

  return {
    date: dateKey,
    prices,
    stats: {
      current: currentPrice,
      average: priceValues.reduce((a, b) => a + b, 0) / priceValues.length,
      lowest: lowestPrice,
      highest: highestPrice,
      lowestSlot: prices.findIndex(p => p.priceKwh === lowestPrice),
      highestSlot: prices.findIndex(p => p.priceKwh === highestPrice),
    },
  };
}

/**
 * Fetch spot prices from optimized zaspot.cz API
 * Falls back to legacy proxy if new endpoint not available
 */
export async function fetchSpotPrices(
  date: Date = new Date()
): Promise<DailyPrices | null> {
  try {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;

    // Check cache
    const now = new Date();
    const isToday = dateKey === `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

    if (isToday && cachedPrices && Date.now() - cacheTime < CACHE_MS) {
      const currentHour = now.getHours();
      if (cachedPrices.prices[currentHour]) {
        cachedPrices.stats.current = cachedPrices.prices[currentHour].priceKwh;
      }
      return cachedPrices;
    }

    // Try optimized endpoint first
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(
        `https://www.zaspot.cz/api/spot-prices-mobile?date=${dateKey}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const result: DailyPrices = {
          date: data.date,
          prices: data.prices,
          stats: data.stats,
        };
        if (isToday) {
          cachedPrices = result;
          cacheTime = Date.now();
        }
        return result;
      }
    } catch {
      clearTimeout(timeoutId);
    }

    // Fallback to legacy proxy
    console.log('Using legacy OTE proxy fallback');
    const result = await fetchFromLegacyProxy(dateKey);
    if (result && isToday) {
      cachedPrices = result;
      cacheTime = Date.now();
    }
    return result || cachedPrices;
  } catch (error) {
    console.error('Error fetching spot prices:', error);
    return cachedPrices;
  }
}

/**
 * Fetch spot prices for multiple days (for weekly views)
 */
export async function fetchSpotPricesRange(
  days: number = 7
): Promise<{ date: string; avgPrice: number; minPrice: number; maxPrice: number }[]> {
  const results: { date: string; avgPrice: number; minPrice: number; maxPrice: number }[] = [];

  // Fetch in parallel for speed
  const promises = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    promises.push(fetchSpotPrices(date));
  }

  const dayResults = await Promise.all(promises);

  for (const dayData of dayResults) {
    if (dayData) {
      results.push({
        date: dayData.date,
        avgPrice: dayData.stats.average,
        minPrice: dayData.stats.lowest,
        maxPrice: dayData.stats.highest,
      });
    }
  }

  return results;
}

/**
 * Get price color based on kWh price
 */
export function getPriceColor(priceKwh: number): string {
  if (priceKwh < 2) return '#22C55E';  // Green - very low
  if (priceKwh < 3) return '#84CC16';  // Light green - low
  if (priceKwh < 4) return '#F59E0B';  // Orange - medium
  if (priceKwh < 5) return '#EF4444';  // Red - high
  return '#DC2626';                     // Dark red - very high
}
