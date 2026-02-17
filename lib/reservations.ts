/**
 * Reservations API
 * OCPP station booking with deposit handling and time slots
 */

import { apiFetch } from './api';

export interface Reservation {
  id: string;
  charge_point_id: string;
  charge_point_name: string;
  connector_id: number;
  user_id: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'expired';
  deposit_czk: number;
  created_at: string;
}

export interface TimeSlot {
  start_time: string;
  end_time: string;
  available: boolean;
}

export interface TimeSlotsResponse {
  chargePointId: string;
  connectorId: number;
  date: string;
  duration: number;
  depositCzk: number;
  slots: TimeSlot[];
}

/**
 * Fetch user's reservations (requires auth)
 */
export async function fetchReservations(): Promise<Reservation[]> {
  const res = await apiFetch<{ reservations: Reservation[] }>(
    '/reservations/ocpp/active?all=true',
    { requireAuth: true }
  );
  if (res.ok && res.data.reservations) {
    return res.data.reservations;
  }
  return [];
}

/**
 * Fetch available time slots for a connector on a given date
 */
export async function fetchTimeSlots(
  chargePointId: string,
  connectorId: number,
  date: string,
  duration: 30 | 60 = 30
): Promise<TimeSlotsResponse | null> {
  const params = new URLSearchParams({
    chargePointId,
    connectorId: String(connectorId),
    date,
    duration: String(duration),
  });
  const res = await apiFetch<{ success: boolean; data: TimeSlotsResponse }>(
    `/reservations/ocpp?${params}`
  );
  if (res.ok && res.data.data) {
    return res.data.data;
  }
  return null;
}

/**
 * Create a reservation (requires auth)
 */
export async function createReservation(
  chargePointId: string,
  connectorId: number,
  startTime: string,
  duration: 30 | 60 = 30
): Promise<{ success: boolean; reservationId?: string; error?: string }> {
  const res = await apiFetch<{ success: boolean; data?: { reservationId: string }; error?: string }>(
    '/reservations/ocpp',
    {
      method: 'POST',
      body: JSON.stringify({ chargePointId, connectorId, startTime, duration }),
      requireAuth: true,
    }
  );
  return {
    success: res.ok,
    reservationId: res.data?.data?.reservationId,
    error: res.data?.error,
  };
}

/**
 * Cancel a reservation (requires auth)
 */
export async function cancelReservation(
  reservationId: string
): Promise<{ success: boolean; error?: string }> {
  const res = await apiFetch<{ success: boolean; error?: string }>(
    `/reservations/ocpp/${reservationId}`,
    {
      method: 'DELETE',
      requireAuth: true,
    }
  );
  return { success: res.ok, error: res.data?.error };
}
