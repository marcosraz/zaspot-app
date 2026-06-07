/**
 * Currency display helpers (React Native).
 *
 * The platform bills in CZK. Every stored monetary value (credit balance,
 * transaction cost, ...) is CZK. These helpers convert a CZK amount to the
 * *display* currency only — they never change what is stored or charged.
 *
 * NOTE: We format manually (no Intl.NumberFormat) because Intl locale support
 * is unreliable on Hermes. Style: space thousands separator + comma decimal,
 * which both Czech and German use.
 */

export type Currency = 'czk' | 'eur';

/** EUR→CZK fallback (CZK per 1 EUR) when the live rate is unavailable. */
export const FALLBACK_EUR_CZK_RATE = 25;

export function convertFromCzk(amountCzk: number, currency: Currency, rate: number): number {
  if (currency === 'eur') {
    return amountCzk / (rate || FALLBACK_EUR_CZK_RATE);
  }
  return amountCzk;
}

export interface FormatMoneyOptions {
  currency: Currency;
  /** EUR→CZK rate (CZK per 1 EUR). Falls back to 25 if missing. */
  rate: number;
  /** Force a fixed number of decimals. Defaults: per-kWh → 2, EUR → 2, CZK → 0. */
  decimals?: number;
  /** Append a "/kWh" unit suffix and use 2 decimals by default. */
  perKwh?: boolean;
  /** Render only the number (no currency symbol). */
  symbol?: boolean;
}

const NBSP = ' '; // non-breaking space (keeps "1 234" / "5 Kč" together)

function groupThousands(intDigits: string): string {
  return intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/**
 * Format a CZK amount as a localized money string in the selected currency.
 * CZK → "1 234 Kč" / "6,50 Kč/kWh"
 * EUR → "49,32 €" / "0,26 €/kWh"
 */
export function formatMoney(amountCzk: number, opts: FormatMoneyOptions): string {
  const { currency, rate, perKwh } = opts;
  const value = convertFromCzk(amountCzk ?? 0, currency, rate);

  const decimals = opts.decimals ?? (perKwh ? 2 : currency === 'eur' ? 2 : 0);
  const sym = currency === 'eur' ? '€' : 'Kč';

  const fixed = Math.abs(value).toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');
  const grouped = groupThousands(intPart);
  const sign = value < 0 ? '-' : '';
  const numStr = decPart ? `${sign}${grouped},${decPart}` : `${sign}${grouped}`;

  const unit = perKwh ? '/kWh' : '';

  if (opts.symbol === false) {
    return `${numStr}${unit}`;
  }
  return `${numStr}${NBSP}${sym}${unit}`;
}

/** ISO code for the selected currency. */
export function currencyCode(currency: Currency): 'CZK' | 'EUR' {
  return currency === 'eur' ? 'EUR' : 'CZK';
}

/** Bare symbol for unit labels like "(€/kWh)". */
export function currencySymbol(currency: Currency): string {
  return currency === 'eur' ? '€' : 'Kč';
}
