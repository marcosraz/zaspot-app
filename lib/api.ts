/**
 * Central API Client with JWT Authentication
 * Handles token injection, refresh, and error handling
 */

import * as SecureStore from 'expo-secure-store';

const API_BASE = 'https://zaspot.cz/api';

const TOKEN_KEY = 'zaspot_auth_token';
const USER_KEY = 'zaspot_auth_user';
const EXPIRES_KEY = 'zaspot_auth_expires';

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
}

// ─── Token Storage ───────────────────────────────

export async function getStoredAuth(): Promise<AuthState | null> {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    const userJson = await SecureStore.getItemAsync(USER_KEY);
    const expiresAt = await SecureStore.getItemAsync(EXPIRES_KEY);

    if (!token || !userJson || !expiresAt) return null;

    // Check if token is expired
    if (new Date(expiresAt) <= new Date()) {
      await clearStoredAuth();
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
}

export async function clearStoredAuth(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
  await SecureStore.deleteItemAsync(EXPIRES_KEY);
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
    const auth = await getStoredAuth();
    if (!auth) {
      return { ok: false, status: 401, data: { error: 'Not authenticated' } as any };
    }
    headers['Authorization'] = `Bearer ${auth.token}`;
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...fetchOptions,
      headers,
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
        // Retry the request with the new token
        const newAuth = await getStoredAuth();
        if (newAuth) {
          headers['Authorization'] = `Bearer ${newAuth.token}`;
          const retryRes = await fetch(`${API_BASE}${endpoint}`, {
            ...fetchOptions,
            headers,
          });
          const retryData = retryRes.headers.get('content-type')?.includes('application/json')
            ? await retryRes.json()
            : await retryRes.text();
          return { ok: retryRes.ok, status: retryRes.status, data: retryData as T };
        }
      }
      // Refresh failed - clear auth
      await clearStoredAuth();
    }

    return { ok: res.ok, status: res.status, data };
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    return {
      ok: false,
      status: 0,
      data: { error: 'Network error' } as any,
    };
  }
}

// ─── Token Refresh ───────────────────────────────

async function refreshToken(): Promise<boolean> {
  try {
    const auth = await getStoredAuth();
    if (!auth) return false;

    const res = await fetch(`${API_BASE}/auth/mobile-refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`,
      },
    });

    if (!res.ok) return false;

    const data = await res.json();
    await storeAuth({
      token: data.token,
      user: data.user,
      expiresAt: data.expiresAt,
    });

    return true;
  } catch {
    return false;
  }
}

// ─── Auth API Methods ────────────────────────────

export interface LoginResponse {
  token: string;
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

export { API_BASE };
