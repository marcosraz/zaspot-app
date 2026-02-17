/**
 * Vehicle Profiles API Client
 * CRUD operations for server-synced vehicle profiles
 */

import { apiFetch } from './api';

export interface ServerVehicleProfile {
  id: string;
  presetId: string | null;
  name: string;
  manufacturer: string;
  batteryCapacityKwh: number;
  rangeKm: number;
  maxChargingPowerKw: number;
  connectorType: string;
  preferredMinBattery: number | null;
  preferredMaxCharge: number | null;
  isActive: boolean;
  autochargeIdTagId: string | null;
  createdAt: string;
}

interface CreateVehicleInput {
  presetId?: string;
  name: string;
  manufacturer: string;
  batteryCapacityKwh: number;
  rangeKm: number;
  maxChargingPowerKw: number;
  connectorType: string;
  preferredMinBattery?: number;
  preferredMaxCharge?: number;
  isActive?: boolean;
}

interface UpdateVehicleInput {
  name?: string;
  manufacturer?: string;
  batteryCapacityKwh?: number;
  rangeKm?: number;
  maxChargingPowerKw?: number;
  connectorType?: string;
  preferredMinBattery?: number;
  preferredMaxCharge?: number;
  isActive?: boolean;
  autochargeIdTagId?: string | null;
}

/**
 * Fetch all vehicle profiles for the authenticated user
 */
export async function fetchVehicleProfiles(): Promise<ServerVehicleProfile[]> {
  const res = await apiFetch<{ vehicles: ServerVehicleProfile[] }>(
    '/user-vehicles',
    { requireAuth: true }
  );
  if (res.ok && res.data.vehicles) {
    return res.data.vehicles;
  }
  return [];
}

/**
 * Create a new vehicle profile
 */
export async function createVehicleProfile(
  input: CreateVehicleInput
): Promise<ServerVehicleProfile | null> {
  const res = await apiFetch<{ success: boolean; vehicle: ServerVehicleProfile }>(
    '/user-vehicles',
    {
      method: 'POST',
      body: JSON.stringify(input),
      requireAuth: true,
    }
  );
  if (res.ok && res.data.vehicle) {
    return res.data.vehicle;
  }
  return null;
}

/**
 * Update an existing vehicle profile
 */
export async function updateVehicleProfile(
  id: string,
  updates: UpdateVehicleInput
): Promise<ServerVehicleProfile | null> {
  const res = await apiFetch<{ success: boolean; vehicle: ServerVehicleProfile }>(
    `/user-vehicles/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(updates),
      requireAuth: true,
    }
  );
  if (res.ok && res.data.vehicle) {
    return res.data.vehicle;
  }
  return null;
}

/**
 * Delete a vehicle profile
 */
export async function deleteVehicleProfile(id: string): Promise<boolean> {
  const res = await apiFetch<{ success: boolean }>(
    `/user-vehicles/${id}`,
    {
      method: 'DELETE',
      requireAuth: true,
    }
  );
  return res.ok;
}
