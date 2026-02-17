/**
 * Charging API - Station details, start/stop charging, sessions
 * Connects to zaspot.cz/api/ocpp/* endpoints
 */

import { apiFetch } from './api';

// ─── Types ───────────────────────────────────────

export interface Connector {
  connectorId: number;
  status: 'Available' | 'Charging' | 'Preparing' | 'Faulted' | 'Unavailable' | 'SuspendedEVSE' | 'SuspendedEV';
  connectorType: string | null;
  maxPowerKw: number | null;
  errorCode: string | null;
}

export interface ChargePointDetail {
  id: string;
  chargePointId: string;
  name: string;
  vendor: string | null;
  model: string | null;
  status: string;
  isOnline: boolean;
  lastHeartbeat: string | null;
  locationAddress: string | null;
  locationLat: number | null;
  locationLng: number | null;
  maxPowerKw: number | null;
  numConnectors: number;
  reservationEnabled: boolean;
  reservationDepositCzk: number;
  connectors: Connector[];
  stats: {
    totalSessions: number;
    totalEnergyKwh: number;
    totalRevenueCzk: number;
    avgSessionDurationMinutes: number;
    avgEnergyPerSessionKwh: number;
    lastSessionAt: string | null;
  };
}

export interface MeterValue {
  timestamp: string;
  energyWh: number | null;
  powerW: number | null;
  socPercent: number | null;
}

export interface ChargingSession {
  id: string;
  transactionId: number;
  connectorId: number;
  idTag: string;
  userName: string | null;
  userEmail: string | null;
  startTimestamp: string;
  stopTimestamp: string | null;
  durationMinutes: number | null;
  meterStart: number;
  meterStop: number | null;
  energyKwh: number | null;
  status: 'active' | 'completed';
  stopReason: string | null;
  billingStatus: string;
  totalCostCzk: number | null;
  avgSpotPriceCzkKwh: number | null;
  meterValues: MeterValue[];
}

export interface UserTransaction {
  id: string;
  transactionId: number;
  chargePointId: string;
  chargePointName: string;
  connectorId: number;
  startTimestamp: string;
  stopTimestamp: string | null;
  energyKwh: number | null;
  status: 'active' | 'completed';
  billingStatus: string;
  totalCostCzk: number | null;
  avgSpotPriceCzkKwh: number | null;
}

// ─── API Functions ───────────────────────────────

/**
 * Fetch detailed charge point info with connectors and stats
 */
export async function fetchChargePoint(id: string): Promise<ChargePointDetail | null> {
  const res = await apiFetch<{ success: boolean; chargePoint: ChargePointDetail }>(
    `/ocpp/charge-points/${encodeURIComponent(id)}`
  );
  if (res.ok && res.data.chargePoint) {
    return res.data.chargePoint;
  }
  return null;
}

/**
 * Fetch active sessions for a charge point
 */
export async function fetchActiveSessions(chargePointId: string): Promise<ChargingSession[]> {
  const res = await apiFetch<{ success: boolean; sessions: ChargingSession[] }>(
    `/ocpp/charge-points/${encodeURIComponent(chargePointId)}/sessions?status=active&includeMeterValues=true`
  );
  if (res.ok && res.data.sessions) {
    return res.data.sessions;
  }
  return [];
}

/**
 * Start a charging session (requires auth)
 */
export async function startCharging(
  chargePointId: string,
  connectorId: number = 1
): Promise<{ success: boolean; error?: string; message?: string }> {
  const res = await apiFetch<{ success: boolean; error?: string; message?: string }>(
    '/ocpp/start-charging',
    {
      method: 'POST',
      body: JSON.stringify({ chargePointId, connectorId }),
      requireAuth: true,
    }
  );
  return { success: res.ok, error: res.data?.error, message: res.data?.message };
}

/**
 * Stop a charging session (requires auth)
 */
export async function stopCharging(
  chargePointId: string,
  transactionId: number
): Promise<{ success: boolean; error?: string }> {
  const res = await apiFetch<{ success: boolean; error?: string }>(
    '/ocpp/stop-charging',
    {
      method: 'POST',
      body: JSON.stringify({ chargePointId, transactionId }),
      requireAuth: true,
    }
  );
  return { success: res.ok, error: res.data?.error };
}

/**
 * Fetch user's transactions (requires auth)
 */
export async function fetchUserTransactions(
  status: 'active' | 'completed' | 'all' = 'all',
  limit: number = 20
): Promise<{
  transactions: UserTransaction[];
  activeTransaction: UserTransaction | null;
}> {
  const res = await apiFetch<{
    success: boolean;
    transactions: UserTransaction[];
    activeTransaction: UserTransaction | null;
  }>(`/ocpp/transactions?status=${status}&limit=${limit}`, {
    requireAuth: true,
  });
  if (res.ok) {
    return {
      transactions: res.data.transactions || [],
      activeTransaction: res.data.activeTransaction || null,
    };
  }
  return { transactions: [], activeTransaction: null };
}

/**
 * Get connector status color
 */
export function getConnectorStatusColor(status: string): string {
  switch (status) {
    case 'Available': return '#16A34A';
    case 'Charging': return '#3B82F6';
    case 'Preparing': return '#F59E0B';
    case 'SuspendedEV':
    case 'SuspendedEVSE': return '#F97316';
    case 'Faulted': return '#DC2626';
    case 'Unavailable':
    default: return '#6B7280';
  }
}

/**
 * Format duration from minutes to human-readable
 */
export function formatDuration(minutes: number): string {
  if (minutes < 1) return '<1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

/**
 * Format energy in kWh
 */
export function formatEnergy(kwh: number | null): string {
  if (kwh === null || kwh === undefined) return '0.00';
  return kwh.toFixed(2);
}
