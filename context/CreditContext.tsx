/**
 * Credit Context - Manages user wallet balance and top-up
 * Uses zaspot.cz/api/payment/* endpoints
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Platform, Linking, AppState } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from './AuthContext';
import { apiFetch } from '../lib/api';

export interface CreditTransaction {
  id: string;
  user_id?: string;
  // Matches /api/payment/history: field is amount_czk (number) and the type
  // union includes adjustment/community_credit/bank_transfer.
  type: 'topup' | 'charge' | 'refund' | 'adjustment' | 'community_credit' | 'bank_transfer';
  amount_czk: number;
  balance_after_czk?: number;
  description: string | null;
  created_at: string;
  status: string;
}

interface CreditContextType {
  balance: number;
  balanceFormatted: string;
  loading: boolean;
  refreshBalance: () => Promise<void>;
  topUp: (amountCzk: number, payMethod?: 'GPAY' | 'APAY') => Promise<{ success: boolean; error?: string }>;
  transactions: CreditTransaction[];
  transactionsLoading: boolean;
  refreshTransactions: () => Promise<void>;
}

const CreditContext = createContext<CreditContextType | undefined>(undefined);

interface CreditProviderProps {
  children: ReactNode;
}

export function CreditProvider({ children }: CreditProviderProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  const balanceFormatted = `${balance.toFixed(2)} CZK`;

  // Fetch balance when authenticated (wait for auth to finish loading)
  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated) {
      fetchBalance();
    } else {
      setBalance(0);
      setTransactions([]);
    }
  }, [isAuthenticated, authLoading]);

  // Refresh balance whenever the app returns to the foreground. This is the
  // safety net for the iOS Safari top-up flow: after paying in Safari the user
  // may return to the app without the deep link firing — re-fetch on focus so
  // the new balance shows up regardless.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isAuthenticated) {
        fetchBalance();
      }
    });
    return () => sub.remove();
  }, [isAuthenticated]);

  const fetchBalance = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ success: boolean; balance_czk: number; user_id: string }>(
        '/payment/balance',
        { requireAuth: true }
      );
      console.log('[CreditContext] balance response:', JSON.stringify(res.data), 'ok:', res.ok, 'status:', res.status);
      if (res.ok && res.data.success) {
        setBalance(res.data.balance_czk || 0);
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshBalance = useCallback(async () => {
    await fetchBalance();
  }, []);

  const topUp = useCallback(async (
    amountCzk: number,
    payMethod?: 'GPAY' | 'APAY'
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // iOS: Apple Pay only renders in real Safari — SFSafariViewController (used
      // by WebBrowser) hides the Apple Pay button. So on iOS we hand off to Safari
      // via Linking.openURL and tag the payment with client:'app' so the GP
      // callback bounces the user back into the app (see app/credit/success.tsx).
      // Android keeps Custom Tabs (Google Pay works there) — unchanged behaviour.
      const useSafari = Platform.OS === 'ios';

      const res = await apiFetch<{ success: boolean; payment_url?: string; paymentUrl?: string; completed?: boolean; order_number?: string; error?: string }>(
        '/payment/create',
        {
          method: 'POST',
          // Backend expects snake_case `amount_czk` (see app/api/payment/create/route.ts)
          // client:'app' only on iOS — it drives the Safari return-marker + the
          // CIT `completed` shortcut. Android keeps its Custom-Tabs flow unchanged.
          // pay_method narrows GP's PAYMETHODS to one wallet (dedicated
          // Google Pay / Apple Pay buttons on the top-up screen).
          body: JSON.stringify({
            amount_czk: amountCzk,
            client: useSafari ? 'app' : undefined,
            pay_method: payMethod,
          }),
          requireAuth: true,
        }
      );

      // Saved-card (CIT) payments are captured instantly server-side — no browser
      // to open. Just refresh the balance and report success.
      if (res.ok && res.data?.completed) {
        await fetchBalance();
        return { success: true };
      }

      // Backend returns `payment_url` (snake_case). Older fallback for `paymentUrl`.
      const paymentUrl = res.ok ? (res.data.payment_url ?? res.data.paymentUrl) : undefined;
      if (res.ok && paymentUrl) {
        if (useSafari) {
          // Hands off to Safari and resolves immediately — the deep-link return
          // (app/credit/success.tsx) and the AppState foreground listener refresh
          // the balance once the user comes back.
          await Linking.openURL(paymentUrl);
          return { success: true };
        }

        // Android: Custom Tabs overlay; promise resolves when the tab is dismissed.
        const result = await WebBrowser.openBrowserAsync(paymentUrl, {
          dismissButtonStyle: 'cancel',
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        });

        // After browser closes, refresh balance
        if (result.type === 'cancel' || result.type === 'dismiss') {
          // User may have completed payment, refresh to check
          await fetchBalance();
        }

        return { success: true };
      }

      return { success: false, error: res.data?.error || 'Payment creation failed' };
    } catch (error) {
      return { success: false, error: 'network_error' };
    }
  }, []);

  const refreshTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    try {
      const res = await apiFetch<{ transactions: CreditTransaction[] }>(
        '/payment/history?limit=20',
        { requireAuth: true }
      );
      if (res.ok) {
        setTransactions(res.data.transactions || []);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setTransactionsLoading(false);
    }
  }, []);

  return (
    <CreditContext.Provider
      value={{
        balance,
        balanceFormatted,
        loading,
        refreshBalance,
        topUp,
        transactions,
        transactionsLoading,
        refreshTransactions,
      }}
    >
      {children}
    </CreditContext.Provider>
  );
}

export function useCredit() {
  const context = useContext(CreditContext);
  if (context === undefined) {
    throw new Error('useCredit must be used within a CreditProvider');
  }
  return context;
}
