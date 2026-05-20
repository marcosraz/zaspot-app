/**
 * LiveStationPrice — fetches /api/terminal-price?chargePointId=X and renders the
 * same station-specific price the web /charge page and the map modal show.
 *
 * Until this component existed, the mobile map detail showed `price_per_kwh` from
 * the static stations table — but ZAspot OCPP stations don't have that field, so
 * they showed "—" while the customer-facing /charge page showed a real number.
 * Now the price displayed here matches what they'll be billed.
 */
import { useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { API_BASE } from '../lib/api';
import { Colors } from '../constants/Colors';

interface Props {
  /** OCPP charge_point_id, e.g. "CZ-ZAS-E00018". Pass ChargingStation.external_id. */
  chargePointId: string | null | undefined;
  isDc: boolean;
  /** Fallback price (e.g. from non-OCPP datasource like OCM) when external_id is missing. */
  fallbackPriceCzkKwh?: number | null;
  textColor?: string;
  labelColor?: string;
}

interface PriceResult {
  /** Total price/kWh including VAT, in CZK. */
  pricePerKwh: number;
  /** True if the station has a fixed price set (no spot fluctuation). */
  isFixed: boolean;
}

export function LiveStationPrice({
  chargePointId,
  isDc,
  fallbackPriceCzkKwh,
  textColor,
  labelColor,
}: Props) {
  const [result, setResult] = useState<PriceResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!chargePointId) {
      setResult(fallbackPriceCzkKwh != null
        ? { pricePerKwh: Number(fallbackPriceCzkKwh), isFixed: true }
        : null);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`${API_BASE}/terminal-price?chargePointId=${encodeURIComponent(chargePointId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (data.pricingMode === 'fixed' && data.fixedPrice != null) {
          const sDph = (Number(data.fixedPrice) + Number(data.platformFee || 0.5)) * 1.21;
          setResult({ pricePerKwh: Math.round(sDph * 100) / 100, isFixed: true });
          return;
        }
        const spot = Number(data.spotPrice || 0);
        const platformFee = Number(data.platformFee || 0.5);
        const operatorMarkup = Number(data.operatorMarkup || 0);
        const distributionFee = isDc
          ? Number(data.distributionFeeDc ?? 0.9)
          : Number(data.distributionFeeAc ?? 2.27);
        const minPrice = Number(data.minPrice ?? 0);
        const raw = spot + distributionFee + platformFee + operatorMarkup;
        const floor = Math.max(0.01, minPrice + platformFee);
        const beforeVat = raw < floor ? floor : raw;
        const sDph = beforeVat * 1.21;
        setResult({ pricePerKwh: Math.round(sDph * 100) / 100, isFixed: false });
      })
      .catch(() => { /* swallow — show '—' instead */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [chargePointId, isDc, fallbackPriceCzkKwh]);

  const valueColor = textColor || Colors.brand.accentGreen;
  if (loading || !result) {
    return <Text style={[styles.value, { color: labelColor || '#9CA3AF' }]}>—</Text>;
  }
  return (
    <Text style={[styles.value, { color: valueColor }]}>
      {result.pricePerKwh.toFixed(2)}
    </Text>
  );
}

const styles = StyleSheet.create({
  value: {
    fontSize: 18,
    fontWeight: '700',
  },
});
