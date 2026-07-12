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
  apiGoogleLogin,
  apiAppleLogin,
  refreshSession,
  setSessionExpiredListener,
} from '../lib/api';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (idToken: string) => Promise<{ success: boolean; error?: string }>;
  loginWithApple: (identityToken: string, fullName?: string | null) => Promise<{ success: boolean; error?: string }>;
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

  // api.ts fires this when a refresh definitively fails (server 401) — the UI
  // must drop `user`, otherwise isAuthenticated stays true while every
  // request silently 401s until the next app restart.
  useEffect(() => {
    setSessionExpiredListener(() => setUser(null));
    return () => setSessionExpiredListener(null);
  }, []);

  const loadStoredAuth = async () => {
    try {
      const auth = await getStoredAuth();
      if (__DEV__) console.log('[Auth] Stored auth:', auth ? 'found' : 'none');
      if (auth) {
        setUser(auth.user);
        await refreshTokenSilently();
      } else {
        // No valid access token — a refresh token may still revive the session
        // (access token expired while the app was closed).
        const result = await refreshSession();
        if (result === 'ok') {
          const revived = await getStoredAuth();
          if (revived) setUser(revived.user);
        }
      }
    } catch (error) {
      if (__DEV__) console.error('[Auth] Failed to load auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Central refresh via api.ts (shared mutex with apiFetch's 401 retry — no
  // more parallel refresh race). Network failures keep the session: the
  // stored token may still be perfectly valid, we just couldn't rotate it.
  const refreshTokenSilently = async () => {
    const result = await refreshSession();
    if (__DEV__) console.log('[Auth] Silent refresh:', result);
    if (result === 'ok') {
      const auth = await getStoredAuth();
      if (auth) setUser(auth.user);
    } else if (result === 'expired') {
      setUser(null);
    }
    // 'network' → keep current user; next apiFetch retries the refresh
  };

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await apiLogin(email.trim().toLowerCase(), password);

      if (res.ok) {
        await storeAuth({
          token: res.data.token,
          user: res.data.user,
          expiresAt: res.data.expiresAt,
          refreshToken: res.data.refreshToken,
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

  const loginWithGoogle = useCallback(async (idToken: string) => {
    try {
      const res = await apiGoogleLogin(idToken);
      if (res.ok) {
        await storeAuth({
          token: res.data.token,
          user: res.data.user,
          expiresAt: res.data.expiresAt,
          refreshToken: res.data.refreshToken,
        });
        setUser(res.data.user);
        return { success: true };
      }
      const errorData = res.data as any;
      return { success: false, error: errorData?.error || 'google_login_failed' };
    } catch {
      return { success: false, error: 'network_error' };
    }
  }, []);

  const loginWithApple = useCallback(async (identityToken: string, fullName?: string | null) => {
    try {
      const res = await apiAppleLogin(identityToken, fullName);
      if (res.ok) {
        await storeAuth({
          token: res.data.token,
          user: res.data.user,
          expiresAt: res.data.expiresAt,
          refreshToken: res.data.refreshToken,
        });
        setUser(res.data.user);
        return { success: true };
      }
      const errorData = res.data as any;
      return { success: false, error: errorData?.error || 'apple_login_failed' };
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
        loginWithGoogle,
        loginWithApple,
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
