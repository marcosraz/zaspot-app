/**
 * Vehicle & AutoCharge API
 * Manages registered vehicles (AutoCharge) and pending vehicle discovery
 */

import { apiFetch } from './api';

// ─── Types ───────────────────────────────────────

export interface RegisteredVehicle {
  id: string;
  id_tag: string;
  user_id: string;
  status: 'Accepted' | 'Blocked' | 'Expired';
  description: string | null;
  created_at: string;
}

export interface PendingVehicle {
  id: string;
  id_tag: string;
  last_charge_point_id: string;
  last_seen_at: string;
  times_seen: number;
}

// ─── API Functions ───────────────────────────────

/**
 * Fetch registered AutoCharge vehicles (requires auth)
 */
export async function fetchRegisteredVehicles(): Promise<RegisteredVehicle[]> {
  const res = await apiFetch<RegisteredVehicle[]>('/vehicles', {
    requireAuth: true,
  });
  if (res.ok && Array.isArray(res.data)) {
    return res.data;
  }
  return [];
}

/**
 * Fetch pending/discovered vehicles not yet registered (requires auth)
 */
export async function fetchPendingVehicles(): Promise<PendingVehicle[]> {
  const res = await apiFetch<PendingVehicle[]>('/vehicles/pending', {
    requireAuth: true,
  });
  if (res.ok && Array.isArray(res.data)) {
    return res.data;
  }
  return [];
}

/**
 * Register a vehicle for AutoCharge (requires auth)
 * Accepts MAC address from discovery or manual entry
 */
export async function registerVehicle(
  idTag: string,
  description: string
): Promise<{ success: boolean; error?: string }> {
  const res = await apiFetch<{ success: boolean; error?: string }>('/vehicles', {
    method: 'POST',
    body: JSON.stringify({ macAddress: idTag, description }),
    requireAuth: true,
  });
  return { success: res.ok, error: res.data?.error };
}

/**
 * Delete a registered vehicle (requires auth)
 */
export async function deleteVehicle(vehicleId: string): Promise<{ success: boolean }> {
  const res = await apiFetch(`/vehicles/${vehicleId}`, {
    method: 'DELETE',
    requireAuth: true,
  });
  return { success: res.ok };
}

// ─── RFID Cards ─────────────────────────────────

export interface RfidCard {
  id: string;
  id_tag: string;
  description: string | null;
  status: string;
  created_at: string;
}

/**
 * Fetch registered RFID cards (requires auth)
 */
export async function fetchRfidCards(): Promise<RfidCard[]> {
  const res = await apiFetch<RfidCard[]>('/rfid-tags', {
    requireAuth: true,
  });
  if (res.ok && Array.isArray(res.data)) {
    return res.data;
  }
  return [];
}

/**
 * Register a new RFID card (requires auth)
 */
export async function registerRfidCard(
  tagId: string,
  description: string
): Promise<{ success: boolean; error?: string }> {
  const res = await apiFetch<{ success: boolean; error?: string }>('/rfid-tags', {
    method: 'POST',
    body: JSON.stringify({ tagId, description }),
    requireAuth: true,
  });
  return { success: res.ok, error: res.data?.error };
}
