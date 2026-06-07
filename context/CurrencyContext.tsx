/**
 * Currency Context - Manages the display currency (CZK / EUR).
 * Persists preference in AsyncStorage. The selection is display-only and
 * never changes what the user is actually billed (always CZK on the Czech
 * market). The EUR/CZK rate is fetched from the same endpoint the web uses.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Currency,
  FALLBACK_EUR_CZK_RATE,
  formatMoney,
  convertFromCzk,
  currencyCode,
  currencySymbol,
  FormatMoneyOptions,
} from '../lib/currency';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  toggleCurrency: () => void;
  /** Live EUR→CZK rate (CZK per 1 EUR). Falls back to 25 until loaded. */
  rate: number;
  /** Format a CZK amount in the selected currency. */
  format: (amountCzk: number, opts?: Omit<FormatMoneyOptions, 'currency' | 'rate'>) => string;
  /** Numeric conversion of a CZK amount into the selected currency. */
  convert: (amountCzk: number) => number;
  /** ISO code ('CZK' | 'EUR'). */
  code: 'CZK' | 'EUR';
  /** Bare symbol ('Kč' | '€'). */
  symbol: string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const CURRENCY_STORAGE_KEY = '@zaspot_currency';
const RATE_URL = 'https://www.zaspot.cz/api/exchange-rate';

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('czk');
  const [rate, setRate] = useState<number>(FALLBACK_EUR_CZK_RATE);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved currency preference
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(CURRENCY_STORAGE_KEY);
        if (saved === 'czk' || saved === 'eur') {
          setCurrencyState(saved);
        }
      } catch (error) {
        console.error('Failed to load currency preference:', error);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  // Persist on change (after initial load)
  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(CURRENCY_STORAGE_KEY, currency).catch((e) =>
      console.error('Failed to save currency preference:', e)
    );
  }, [currency, isLoaded]);

  // Fetch the live EUR→CZK rate once
  useEffect(() => {
    let cancelled = false;
    fetch(RATE_URL)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data.rate === 'number' && data.rate > 0) {
          setRate(data.rate);
        }
      })
      .catch(() => {
        /* keep fallback rate */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setCurrency = useCallback((c: Currency) => setCurrencyState(c), []);
  const toggleCurrency = useCallback(
    () => setCurrencyState((c) => (c === 'czk' ? 'eur' : 'czk')),
    []
  );

  const format = useCallback(
    (amountCzk: number, opts?: Omit<FormatMoneyOptions, 'currency' | 'rate'>) =>
      formatMoney(amountCzk, { currency, rate, ...opts }),
    [currency, rate]
  );

  const convert = useCallback(
    (amountCzk: number) => convertFromCzk(amountCzk, currency, rate),
    [currency, rate]
  );

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        toggleCurrency,
        rate,
        format,
        convert,
        code: currencyCode(currency),
        symbol: currencySymbol(currency),
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
