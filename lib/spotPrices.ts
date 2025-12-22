/**
 * OTE Spot Price API Integration
 * Fetches real electricity spot prices from Czech OTE (Operátor trhu s elektřinou)
 */

export interface SpotPriceData {
  slot: number;      // 0-95 for 15-min intervals, 0-23 for hourly
  time: string;      // HH:MM format
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

// EUR to CZK exchange rate (fallback)
const DEFAULT_EXCHANGE_RATE = 25.2;

/**
 * Fetch current exchange rate from Frankfurter API
 */
async function getExchangeRate(): Promise<number> {
  try {
    const response = await fetch('https://api.frankfurter.app/latest?from=EUR&to=CZK');
    if (response.ok) {
      const data = await response.json();
      return data.rates?.CZK || DEFAULT_EXCHANGE_RATE;
    }
  } catch (error) {
    console.warn('Could not fetch exchange rate, using default:', error);
  }
  return DEFAULT_EXCHANGE_RATE;
}

/**
 * Format slot number to time string
 */
function formatSlotTime(slot: number, is15Min: boolean = true): string {
  if (is15Min) {
    const hour = Math.floor(slot / 4);
    const minute = (slot % 4) * 15;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  } else {
    return `${slot.toString().padStart(2, '0')}:00`;
  }
}

/**
 * Get current 15-minute slot (0-95)
 */
export function getCurrentSlot(): number {
  const now = new Date();
  return now.getHours() * 4 + Math.floor(now.getMinutes() / 15);
}

/**
 * Fetch spot prices for a specific date from OTE API
 */
export async function fetchSpotPrices(
  date: Date = new Date(),
  resolution: 'PT15M' | 'PT60M' = 'PT60M'
): Promise<DailyPrices | null> {
  try {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const reportDate = `${year}-${month}-${day}`;

    // Get exchange rate
    const exchangeRate = await getExchangeRate();

    // Fetch from OTE API directly (CORS should work for public API)
    // If CORS fails, we use the zaspot.cz proxy
    let data: any = null;

    try {
      // Try direct OTE API first
      const oteUrl = `https://www.ote-cr.cz/en/short-term-markets/electricity/day-ahead-market/@@chart-data?report_date=${reportDate}&currency_code=EUR&time_resolution=${resolution}`;
      const response = await fetch(oteUrl);
      if (response.ok) {
        data = await response.json();
      }
    } catch (corsError) {
      // Fallback to zaspot.cz proxy
      console.log('Using zaspot.cz proxy for OTE data');
      const proxyUrl = `https://www.zaspot.cz/api/oteProxyHandler?date_from_to=${day}.${month}.${year}&currency_code=EUR&time_resolution=${resolution}`;
      const response = await fetch(proxyUrl);
      if (response.ok) {
        data = await response.json();
      }
    }

    if (!data?.data?.dataLine) {
      console.warn('No data from OTE API');
      return null;
    }

    // Find price series in the response
    const priceSeries = data.data.dataLine.find(
      (series: any) => series.title && (series.title.includes('Price') || series.title.includes('price'))
    );

    if (!priceSeries?.point) {
      console.warn('No price series found in OTE response');
      return null;
    }

    // Process prices
    const is15Min = resolution === 'PT15M';
    const slotCount = is15Min ? 96 : 24;
    const prices: SpotPriceData[] = [];

    for (let slot = 0; slot < slotCount; slot++) {
      prices.push({
        slot,
        time: formatSlotTime(slot, is15Min),
        price: 0,
        priceKwh: 0,
      });
    }

    // Fill in actual prices
    priceSeries.point.forEach((p: any) => {
      let slot: number;

      if (typeof p.x === 'string' && /^\d{1,2}$/.test(p.x)) {
        slot = parseInt(p.x) - 1; // OTE uses 1-indexed
      } else if (typeof p.x === 'number') {
        slot = p.x - 1;
      } else {
        return;
      }

      if (slot >= 0 && slot < slotCount && prices[slot]) {
        // Convert EUR to CZK
        const priceCZK = p.y * exchangeRate;
        prices[slot].price = Math.round(priceCZK);
        prices[slot].priceKwh = priceCZK / 1000;
      }
    });

    // Calculate stats
    const validPrices = prices.filter(p => p.price > 0);
    if (validPrices.length === 0) {
      return null;
    }

    const priceValues = validPrices.map(p => p.priceKwh);
    const currentSlot = is15Min ? getCurrentSlot() : new Date().getHours();
    const currentPrice = prices[currentSlot]?.priceKwh || priceValues[0];
    const lowestPrice = Math.min(...priceValues);
    const highestPrice = Math.max(...priceValues);

    return {
      date: reportDate,
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
  } catch (error) {
    console.error('Error fetching spot prices:', error);
    return null;
  }
}

/**
 * Fetch spot prices for multiple days (for weekly/monthly views)
 */
export async function fetchSpotPricesRange(
  days: number = 7
): Promise<{ date: string; avgPrice: number; minPrice: number; maxPrice: number }[]> {
  const results: { date: string; avgPrice: number; minPrice: number; maxPrice: number }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    const dayData = await fetchSpotPrices(date, 'PT60M');
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
