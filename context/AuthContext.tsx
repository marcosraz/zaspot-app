/**
 * Auth Context - Manages user authentication state
 * Uses JWT tokens stored in expo-secure-store
 * Integrates with zaspot.cz/api/auth/* endpoints
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  AuthUser,
  getStoredAuth,
  storeAuth,
  clearStoredAuth,
  apiLogin,
  apiRegister,
  apiForgotPassword,
  apiResendVerification,
  API_BASE,
} from '../lib/api';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  resendVerification: (email: string) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = user !== null;

  // Load stored auth on app start
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    let authenticated = false;
    try {
      const auth = await getStoredAuth();
      console.log('[Auth] Stored auth:', auth ? `found (${auth.user.email})` : 'none');
      if (auth) {
        setUser(auth.user);
        authenticated = true;
        await refreshTokenSilently();
      }
    } catch (error) {
      console.error('[Auth] Failed to load auth:', error);
    } finally {
      console.log('[Auth] Loading complete, had stored auth:', authenticated);
      setIsLoading(false);
    }
  };

  const refreshTokenSilently = async () => {
    try {
      // Get stored token directly
      const auth = await getStoredAuth();
      if (!auth) {
        console.log('[Auth] No stored token for refresh');
        setUser(null);
        return;
      }

      // Use raw fetch to avoid apiFetch's built-in 401→refresh retry loop
      // (apiFetch would call refreshToken() internally on 401, creating a circular call)
      console.log('[Auth] Refreshing token...');
      const res = await fetch(`${API_BASE}/auth/mobile-refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`,
        },
      });

      console.log('[Auth] Refresh response status:', res.status);

      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          await storeAuth({
            token: data.token,
            user: data.user,
            expiresAt: data.expiresAt,
          });
          setUser(data.user);
          console.log('[Auth] Token refreshed successfully');
          return;
        }
      }

      // Refresh failed - token is invalid, user needs to log in again
      const errorText = await res.text().catch(() => 'unknown');
      console.log('[Auth] Token refresh failed:', res.status, errorText);
      await clearStoredAuth();
      setUser(null);
    } catch (error) {
      console.log('[Auth] Token refresh error:', error);
      await clearStoredAuth();
      setUser(null);
    }
  };

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await apiLogin(email.trim().toLowerCase(), password);

      if (res.ok) {
        await storeAuth({
          token: res.data.token,
          user: res.data.user,
          expiresAt: res.data.expiresAt,
        });
        setUser(res.data.user);
        return { success: true };
      }

      // Handle specific error codes
      const errorData = res.data as any;
      if (res.status === 429) {
        return { success: false, error: 'too_many_attempts' };
      }
      if (res.status === 401) {
        return { success: false, error: 'invalid_credentials' };
      }
      return { success: false, error: errorData?.error || 'login_failed' };
    } catch {
      return { success: false, error: 'network_error' };
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    try {
      const res = await apiRegister(email.trim().toLowerCase(), password, name.trim());

      if (res.ok) {
        return { success: true };
      }

      const errorData = res.data as any;
      if (res.status === 409) {
        return { success: false, error: 'email_exists' };
      }
      if (res.status === 400) {
        return { success: false, error: errorData?.error || 'invalid_input' };
      }
      return { success: false, error: errorData?.error || 'register_failed' };
    } catch {
      return { success: false, error: 'network_error' };
    }
  }, []);

  const logout = useCallback(async () => {
    await clearStoredAuth();
    setUser(null);
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    try {
      const res = await apiForgotPassword(email.trim().toLowerCase());
      // Always returns success to prevent email enumeration
      return { success: true };
    } catch {
      return { success: false, error: 'network_error' };
    }
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    try {
      const res = await apiResendVerification(email.trim().toLowerCase());
      return { success: true };
    } catch {
      return { success: false, error: 'network_error' };
    }
  }, []);

  const refreshUser = useCallback(async () => {
    await refreshTokenSilently();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        forgotPassword,
        resendVerification,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
