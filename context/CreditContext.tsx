/**
 * Credit Context - Manages user wallet balance and top-up
 * Uses zaspot.cz/api/payment/* endpoints
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Linking, AppState } from 'react-native';
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
  /** A browser payment was opened and hasn't been confirmed yet — UI should
   *  show a "processing" state and block starting a second payment. */
  paymentPending: boolean;
  /** Manually dismiss the pending state (user aborted in the browser). */
  clearPaymentPending: () => void;
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
  const [paymentPending, setPaymentPending] = useState(false);
  // Mirror of `balance` for use inside stable callbacks (no stale closures),
  // plus bookkeeping for the pending-payment poll.
  const balanceRef = useRef(0);
  const pendingSinceRef = useRef<number | null>(null);
  const pendingBalanceBeforeRef = useRef(0);
  const pollTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

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
  // the new balance shows up regardless. While a payment is pending, a single
  // fetch is not enough (GP callback + reconcile cron may lag) — poll with
  // backoff until the balance moves or the attempts run out.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isAuthenticated) {
        if (pendingSinceRef.current != null) {
          pollPendingPayment();
        } else {
          fetchBalance();
        }
      }
    });
    return () => {
      sub.remove();
      clearPollTimers();
    };
  }, [isAuthenticated]);

  const fetchBalance = async (): Promise<number | null> => {
    setLoading(true);
    try {
      const res = await apiFetch<{ success: boolean; balance_czk: number; user_id: string }>(
        '/payment/balance',
        { requireAuth: true }
      );
      if (res.ok && res.data.success) {
        const value = res.data.balance_czk || 0;
        balanceRef.current = value;
        setBalance(value);
        return value;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const clearPollTimers = () => {
    pollTimersRef.current.forEach(clearTimeout);
    pollTimersRef.current = [];
  };

  const clearPaymentPending = useCallback(() => {
    pendingSinceRef.current = null;
    clearPollTimers();
    setPaymentPending(false);
  }, []);

  // Backoff poll after returning from the external browser: the GP callback
  // usually credits before the user switches back (first fetch hits), the
  // reconcile cron (5 min) covers abandoned redirects — so we give up after
  // ~90s and leave the pending banner to the manual refresh.
  const pollPendingPayment = () => {
    clearPollTimers();
    const startedAt = pendingSinceRef.current;
    const attempt = async () => {
      // A newer payment attempt or manual dismiss invalidates this poll run.
      if (pendingSinceRef.current !== startedAt) return false;
      const value = await fetchBalance();
      if (value != null && value > pendingBalanceBeforeRef.current) {
        clearPaymentPending();
        return true;
      }
      return false;
    };
    attempt();
    [4000, 10000, 20000, 45000, 90000].forEach((delay) => {
      pollTimersRef.current.push(
        setTimeout(async () => {
          const done = await attempt();
          // Last scheduled attempt: stop blocking new payments even if the
          // credit never showed up (user likely aborted in the browser).
          if (!done && delay === 90000 && pendingSinceRef.current === startedAt) {
            clearPaymentPending();
          }
        }, delay)
      );
    });
  };

  const refreshBalance = useCallback(async () => {
    await fetchBalance();
  }, []);

  const topUp = useCallback(async (
    amountCzk: number,
    payMethod?: 'GPAY' | 'APAY'
  ): Promise<{ success: boolean; error?: string }> => {
    // Double-payment guard: one browser payment at a time. The button UI also
    // disables on paymentPending, this is the belt-and-braces check.
    if (pendingSinceRef.current != null) {
      return { success: false, error: 'payment_pending' };
    }
    try {
      // Hand off to the REAL external browser on BOTH platforms via Linking.openURL —
      // NOT an in-app browser / Custom Tab. When 3DS hops to another app (e.g. Revolut)
      // and returns, the in-app browser tab is dismissed → the GP session is orphaned
      // and the payment never completes (user lands back on "select amount", nothing
      // charged). The real external browser survives the app-switch (exactly why it
      // "works on the website"); the AppState foreground listener refreshes the balance
      // when the user returns. iOS already did this (also required for Apple Pay).
      const res = await apiFetch<{ success: boolean; payment_url?: string; paymentUrl?: string; completed?: boolean; order_number?: string; error?: string }>(
        '/payment/create',
        {
          method: 'POST',
          // Backend expects snake_case `amount_czk` (see app/api/payment/create/route.ts).
          // client:'app' on both platforms → GP callback returns to the app success page.
          // pay_method narrows GP's PAYMETHODS to one wallet (dedicated GPay/APay buttons).
          body: JSON.stringify({
            amount_czk: amountCzk,
            client: 'app',
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
        // Real external browser on both platforms. Resolves immediately (the browser
        // is a separate app) — so this is NOT payment success yet. Mark the payment
        // as pending; the AppState listener polls the balance when the user returns.
        pendingBalanceBeforeRef.current = balanceRef.current;
        pendingSinceRef.current = Date.now();
        setPaymentPending(true);
        await Linking.openURL(paymentUrl);
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
        paymentPending,
        clearPaymentPending,
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
