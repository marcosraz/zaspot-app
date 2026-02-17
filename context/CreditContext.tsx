/**
 * Credit Context - Manages user wallet balance and top-up
 * Uses zaspot.cz/api/payment/* endpoints
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from './AuthContext';
import { apiFetch } from '../lib/api';

export interface CreditTransaction {
  id: string;
  type: 'topup' | 'charge' | 'refund';
  amount: number;
  description: string;
  created_at: string;
  status: string;
}

interface CreditContextType {
  balance: number;
  balanceFormatted: string;
  loading: boolean;
  refreshBalance: () => Promise<void>;
  topUp: (amountCzk: number) => Promise<{ success: boolean; error?: string }>;
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

  const topUp = useCallback(async (amountCzk: number): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await apiFetch<{ success: boolean; paymentUrl?: string; error?: string }>(
        '/payment/create',
        {
          method: 'POST',
          body: JSON.stringify({ amount: amountCzk }),
          requireAuth: true,
        }
      );

      if (res.ok && res.data.paymentUrl) {
        // Open GP webpay payment page in browser
        const result = await WebBrowser.openBrowserAsync(res.data.paymentUrl, {
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
