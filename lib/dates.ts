/**
 * Date parsing for API/Postgres timestamps — Hermes-safe.
 *
 * Postgres (through our APIs) returns timestamps as "YYYY-MM-DD HH:MM:SS+00"
 * (space separator, no 'T'). Node's V8 parses that leniently, but Hermes —
 * the app's JS engine — follows the spec strictly and returns NaN, which
 * renders as "Invalid Date" (receipt screen bug, 12.06.2026).
 *
 * ALWAYS use parseDbDate() instead of `new Date(apiString)` in the app.
 */

export function parseDbDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  // "2026-06-11 14:13:00+00" → "2026-06-11T14:13:00+00" (ISO-ish, Hermes-safe).
  // Already-ISO strings ("...T...") contain no space and pass through unchanged.
  const d = new Date(dateStr.replace(' ', 'T'));
  return isNaN(d.getTime()) ? null : d;
}

/** Epoch millis or NaN — drop-in for `new Date(s).getTime()` comparisons. */
export function parseDbDateMs(dateStr: string | null | undefined): number {
  const d = parseDbDate(dateStr);
  return d ? d.getTime() : NaN;
}

export function formatDbDate(
  dateStr: string | null | undefined,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = parseDbDate(dateStr);
  if (!d) return '—';
  return d.toLocaleDateString(locale, options ?? { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatDbTime(
  dateStr: string | null | undefined,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = parseDbDate(dateStr);
  if (!d) return '—';
  return d.toLocaleTimeString(locale, options ?? { hour: '2-digit', minute: '2-digit' });
}
