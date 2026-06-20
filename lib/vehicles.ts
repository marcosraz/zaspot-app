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
  // API shape: { vehicles: [{ id, macAddress, description, status, createdAt }] }
  // (NOT a bare array, and field names differ — must unwrap + remap.)
  const res = await apiFetch<{ vehicles?: any[] }>('/vehicles', {
    requireAuth: true,
  });
  if (res.ok && Array.isArray(res.data?.vehicles)) {
    return res.data.vehicles.map((v) => ({
      id: v.id ?? v.macAddress,
      id_tag: v.macAddress,
      user_id: '',
      status: v.status,
      description: v.description ?? null,
      created_at: v.createdAt,
    }));
  }
  return [];
}

/**
 * Fetch pending/discovered vehicles not yet registered (requires auth)
 */
export async function fetchPendingVehicles(): Promise<PendingVehicle[]> {
  // API shape: { pendingVehicles: [{ macAddress, lastSeen, attempts, chargePointId }] }
  // This is the AutoCharge MAC the user registers — unwrap + remap to UI fields.
  const res = await apiFetch<{ pendingVehicles?: any[] }>('/vehicles/pending', {
    requireAuth: true,
  });
  if (res.ok && Array.isArray(res.data?.pendingVehicles)) {
    return res.data.pendingVehicles.map((v) => ({
      id: v.macAddress,
      id_tag: v.macAddress,
      last_charge_point_id: v.chargePointId,
      last_seen_at: v.lastSeen,
      times_seen: v.attempts,
    }));
  }
  return [];
}

/**
 * Register a vehicle for AutoCharge (requires auth)
 * Accepts MAC address from discovery or manual entry.
 * For manually entered MACs (not auto-detected at a station), pass manual=true
 * so the backend skips its "must be in unknown_id_tags" check (route.ts:155).
 */
export async function registerVehicle(
  idTag: string,
  description: string,
  manual = false
): Promise<{ success: boolean; error?: string }> {
  const res = await apiFetch<{ success: boolean; error?: string }>('/vehicles', {
    method: 'POST',
    body: JSON.stringify({ macAddress: idTag, description, manual }),
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
  // API shape: { rfidTags: [{ id, tagId, description, status, createdAt }] }
  const res = await apiFetch<{ rfidTags?: any[] }>('/rfid-tags', {
    requireAuth: true,
  });
  if (res.ok && Array.isArray(res.data?.rfidTags)) {
    return res.data.rfidTags.map((t) => ({
      id: t.id ?? t.tagId,
      id_tag: t.tagId,
      description: t.description ?? null,
      status: t.status,
      created_at: t.createdAt,
    }));
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
