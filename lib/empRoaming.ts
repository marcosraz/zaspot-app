/**
 * EMP roaming helpers shared by the map card and the emp-stations screen.
 *
 *  - pickEvseForStart(): a grouped Hubject site carries several EVSEs (e.g. 1× AC
 *    22 kW + 2× DC 150 kW). Starting blindly on the representative EVSE fails when
 *    that connector is occupied, so prefer a free one (highest power first).
 *  - remoteStartErrorMessage(): Hubject can reject before the CPO is even asked
 *    (code 210 "set up your EMSP account first" while our account is being
 *    activated). Don't blame the operator for that.
 */
import type { EmpEvse, EmpStation } from './v2Features';

const STATUS_RANK: Record<string, number> = { available: 0, unknown: 1, reserved: 2, occupied: 3, charging: 3, outofservice: 4 };

function rank(e: EmpEvse): number {
  return STATUS_RANK[String(e.current_status ?? 'unknown').toLowerCase()] ?? 1;
}

/** Pick the EVSE to start on: free first, then highest power, then stable id order. */
export function pickEvseForStart(station: Pick<EmpStation, 'evse_id' | 'evses'>): EmpEvse | null {
  if (!station.evses || station.evses.length === 0) return null;
  const sorted = [...station.evses].sort(
    (a, b) => rank(a) - rank(b) || (b.power_kw ?? 0) - (a.power_kw ?? 0) || a.evse_id.localeCompare(b.evse_id)
  );
  return sorted[0];
}

/** Human label for the confirm dialog, e.g. "CCS · 150 kW · volný". */
export function describeEvse(e: EmpEvse): string {
  const plug = e.plugs[0] ? shortPlug(e.plugs[0]) : (e.power_type ?? 'Konektor');
  const power = e.power_kw != null ? `${Math.round(e.power_kw)} kW` : '';
  const st = String(e.current_status ?? '').toLowerCase();
  const status = st === 'available' ? 'volný' : (st === 'occupied' || st === 'charging') ? 'obsazený' : st === 'outofservice' ? 'mimo provoz' : '';
  return [plug, power, status].filter(Boolean).join(' · ');
}

function shortPlug(p: string): string {
  const s = p.toLowerCase();
  if (s.includes('ccs')) return 'CCS';
  if (s.includes('chademo')) return 'CHAdeMO';
  if (s.includes('type 2')) return 'Type 2';
  if (s.includes('type 1')) return 'Type 1';
  if (s.includes('schuko') || s.includes('type f')) return 'Schuko';
  return p;
}

/** Czech error text for a failed empRemoteStart() (non-402/409 case). */
export function remoteStartErrorMessage(data: { reason?: string; hubject_code?: string | null } | undefined): string {
  if (data?.reason === 'emp_not_activated') {
    return 'Roaming se pro ZAspot u Hubject teprve aktivuje. Zkuste to prosím později, o zprovoznění vás budeme informovat.';
  }
  if (data?.reason === 'hubject_rejected') {
    return `Roamingová platforma požadavek odmítla (kód ${data.hubject_code ?? '?'}). Zkuste to znovu nebo vyberte jinou stanici.`;
  }
  return 'Operátor stanice požadavek odmítl. Zkuste to znovu nebo vyberte jinou stanici.';
}
