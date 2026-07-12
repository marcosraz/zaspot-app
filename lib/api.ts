/**
 * Central API Client with JWT Authentication
 * Handles token injection, refresh, and error handling
 */

import * as SecureStore from 'expo-secure-store';

const API_BASE = 'https://www.zaspot.cz/api';

const TOKEN_KEY = 'zaspot_auth_token';
const USER_KEY = 'zaspot_auth_user';
const EXPIRES_KEY = 'zaspot_auth_expires';
// Long-lived refresh token (180d, type 'mobile-refresh') — only ever sent to
// /auth/mobile-refresh. Lets the session survive access-token expiry (30d).
const REFRESH_KEY = 'zaspot_auth_refresh';

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role?: string;
  emailVerified?: boolean;
}

interface AuthState {
  token: string;
  user: AuthUser;
  expiresAt: string;
  refreshToken?: string;
}

// ─── Session-expired notification ────────────────
// api.ts can't reach React state, so AuthContext registers a listener; it is
// fired exactly when the stored session is definitively dead (refresh got 401)
// so the UI can drop `user` instead of pretending to be logged in.

let sessionExpiredListener: (() => void) | null = null;

export function setSessionExpiredListener(listener: (() => void) | null): void {
  sessionExpiredListener = listener;
}

async function expireSession(): Promise<void> {
  await clearStoredAuth();
  sessionExpiredListener?.();
}

// ─── Token Storage ───────────────────────────────

export async function getStoredAuth(): Promise<AuthState | null> {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    const userJson = await SecureStore.getItemAsync(USER_KEY);
    const expiresAt = await SecureStore.getItemAsync(EXPIRES_KEY);

    if (!token || !userJson || !expiresAt) return null;

    // Expired access token → not usable for requests. Do NOT clear storage:
    // the refresh token can still rescue the session (doRefreshToken reads
    // the keys directly).
    if (new Date(expiresAt) <= new Date()) {
      return null;
    }

    return {
      token,
      user: JSON.parse(userJson),
      expiresAt,
    };
  } catch {
    return null;
  }
}

export async function storeAuth(auth: AuthState): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, auth.token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(auth.user));
  await SecureStore.setItemAsync(EXPIRES_KEY, auth.expiresAt);
  // Keep an existing refresh token when the response didn't rotate one
  // (defensive — the current backend always sends it).
  if (auth.refreshToken) {
    await SecureStore.setItemAsync(REFRESH_KEY, auth.refreshToken);
  }
}

export async function clearStoredAuth(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
  await SecureStore.deleteItemAsync(EXPIRES_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

// ─── API Fetch with Auth ─────────────────────────

interface ApiOptions extends RequestInit {
  requireAuth?: boolean;
}

interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data: T;
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const { requireAuth = false, headers: customHeaders, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  // Inject auth token if available or required
  if (requireAuth) {
    let auth = await getStoredAuth();
    if (!auth) {
      // Access token missing/expired — the refresh token may still rescue the
      // session before we give up (previously this was an instant 401 and the
      // session died hard at the 30-day mark).
      const refreshed = await refreshToken();
      if (refreshed) auth = await getStoredAuth();
    }
    if (!auth) {
      return { ok: false, status: 401, data: { error: 'Not authenticated' } as any };
    }
    headers['Authorization'] = `Bearer ${auth.token}`;
  }

  // Hard timeout so a slow/stalled endpoint fails fast instead of hanging the UI
  // forever. An abort surfaces as { ok:false, status:0 } (catch below), which
  // screens already treat as an error and use to stop their spinners.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });

    // Try to parse JSON response
    let data: T;
    const contentType = res.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      data = await res.json();
    } else {
      data = (await res.text()) as any;
    }

    // Handle 401 - try token refresh once
    if (res.status === 401 && requireAuth) {
      const refreshed = await refreshToken();
      if (refreshed) {
        // Retry the request with the new token — and a FRESH abort signal:
        // the original 15s timeout kept ticking through the refresh, so the
        // old signal may already be aborted even though the network is fine.
        const newAuth = await getStoredAuth();
        if (newAuth) {
          headers['Authorization'] = `Bearer ${newAuth.token}`;
          const retryController = new AbortController();
          const retryTimeoutId = setTimeout(() => retryController.abort(), 15000);
          try {
            const retryRes = await fetch(`${API_BASE}${endpoint}`, {
              ...fetchOptions,
              headers,
              signal: retryController.signal,
            });
            const retryData = retryRes.headers.get('content-type')?.includes('application/json')
              ? await retryRes.json()
              : await retryRes.text();
            return { ok: retryRes.ok, status: retryRes.status, data: retryData as T };
          } finally {
            clearTimeout(retryTimeoutId);
          }
        }
      }
      // Refresh failed with the server telling us the session is dead —
      // clear storage AND tell the UI (AuthContext) so isAuthenticated flips.
      await expireSession();
    }

    return { ok: res.ok, status: res.status, data };
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    return {
      ok: false,
      status: 0,
      data: { error: 'Network error' } as any,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Token Refresh (with mutex to prevent race conditions) ───
// Single central refresh used by BOTH apiFetch's 401 retry and AuthContext's
// silent refresh on app start — one mutex, no more duplicate refresh races.

let refreshPromise: Promise<boolean> | null = null;

async function refreshToken(): Promise<boolean> {
  // If a refresh is already in progress, wait for it instead of starting another
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = doRefreshToken();
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function doRefreshToken(): Promise<boolean> {
  try {
    // Prefer the dedicated refresh token; fall back to the access token for
    // sessions stored by older app versions (works while it's still valid).
    const refreshTok = await SecureStore.getItemAsync(REFRESH_KEY);
    const accessTok = await SecureStore.getItemAsync(TOKEN_KEY);
    const bearer = refreshTok || accessTok;
    if (!bearer) return false;

    // Raw fetch on purpose — apiFetch would recurse into refreshToken() on 401.
    const res = await fetch(`${API_BASE}/auth/mobile-refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearer}`,
      },
    });

    if (!res.ok) return false;

    const data = await res.json();
    await storeAuth({
      token: data.token,
      user: data.user,
      expiresAt: data.expiresAt,
      refreshToken: data.refreshToken,
    });

    return true;
  } catch {
    return false;
  }
}

/**
 * Refresh the stored session. For AuthContext (app start / manual refresh).
 *  - 'ok':      new tokens stored, getStoredAuth() has the fresh user
 *  - 'expired': server rejected the session (401/403) — storage cleared
 *  - 'network': transient failure — keep the current session, try later
 */
export async function refreshSession(): Promise<'ok' | 'expired' | 'network'> {
  const hadTokens =
    (await SecureStore.getItemAsync(REFRESH_KEY)) ||
    (await SecureStore.getItemAsync(TOKEN_KEY));
  if (!hadTokens) return 'expired';

  const ok = await refreshToken();
  if (ok) return 'ok';

  // Distinguish "server said no" from "no connectivity": ask the server once
  // more with a definitive status check.
  try {
    const bearer =
      (await SecureStore.getItemAsync(REFRESH_KEY)) ||
      (await SecureStore.getItemAsync(TOKEN_KEY));
    if (!bearer) return 'expired';
    const res = await fetch(`${API_BASE}/auth/mobile-refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bearer}` },
    });
    if (res.ok) {
      const data = await res.json();
      await storeAuth({
        token: data.token,
        user: data.user,
        expiresAt: data.expiresAt,
        refreshToken: data.refreshToken,
      });
      return 'ok';
    }
    if (res.status === 401 || res.status === 403) {
      await clearStoredAuth();
      return 'expired';
    }
    return 'network';
  } catch {
    return 'network';
  }
}

// ─── Auth API Methods ────────────────────────────

export interface LoginResponse {
  token: string;
  refreshToken?: string;
  user: AuthUser;
  expiresAt: string;
}

export interface RegisterResponse {
  success: boolean;
  user: { id: string; email: string };
  emailVerificationSent: boolean;
}

export async function apiLogin(email: string, password: string): Promise<ApiResponse<LoginResponse>> {
  return apiFetch<LoginResponse>('/auth/mobile-login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function apiRegister(
  email: string,
  password: string,
  name: string
): Promise<ApiResponse<RegisterResponse>> {
  return apiFetch<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
}

export async function apiForgotPassword(email: string): Promise<ApiResponse<{ success: boolean }>> {
  return apiFetch<{ success: boolean }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function apiResendVerification(email: string): Promise<ApiResponse<{ success: boolean }>> {
  return apiFetch<{ success: boolean }>('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/**
 * Exchanges a Google ID token (obtained client-side via expo-auth-session)
 * for a ZAspot mobile JWT. Server side validates the token signature against
 * Google's public keys before issuing our JWT.
 */
export async function apiGoogleLogin(idToken: string): Promise<ApiResponse<LoginResponse>> {
  return apiFetch<LoginResponse>('/auth/mobile-google', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });
}

/**
 * Exchanges an Apple identity token (from expo-apple-authentication) for a
 * ZAspot mobile JWT. fullName is only available on the FIRST authorization —
 * pass it along so the account gets a name.
 */
export async function apiAppleLogin(
  identityToken: string,
  fullName?: string | null
): Promise<ApiResponse<LoginResponse>> {
  return apiFetch<LoginResponse>('/auth/mobile-apple', {
    method: 'POST',
    body: JSON.stringify({ identityToken, fullName: fullName || undefined }),
  });
}

export { API_BASE };
