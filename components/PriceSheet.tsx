/**
 * PriceSheet — Home screen pricing card that mirrors the zaspot.cz homepage
 * "sheet": two side-by-side columns comparing the live ZAspot spot price with
 * the fixed ZAfix price. Each column shows the raw energy price (the big number,
 * excl. VAT — same as the web hero cards) plus the real AC/DC totals incl. VAT.
 *
 * Self-contained on purpose: all labels are inlined per-language (the same
 * pattern the website itself uses) so this drop-in never has to touch the typed
 * `Translations` interface in constants/translations.ts.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, ColorScheme } from '../constants/colors';
import { Layout } from '../constants/layout';
import { EffectivePrices } from '../lib/pricing';
import { Language } from '../constants/translations';

const GREEN = Colors.brand.accentGreen; // ZAspot spot
const BLUE = '#3B82F6';                 // ZAfix fixed (matches app DC/info blue)

interface Labels {
  heading: string;
  spotCaption: string;
  fixedCaption: string;
  fixedBadge: string;
  inclVat: string;
  spotCheaper: string;
  fixedCheaper: string;
  disclaimer: string;
}

const LABELS: Record<Language, Labels> = {
  cz: {
    heading: 'Modelová cena',
    spotCaption: 'Spotová cena (OTE)',
    fixedCaption: 'Fixní cena',
    fixedBadge: 'FIXNÍ',
    inclVat: 'včetně DPH 21%',
    spotCheaper: 'Spot je teď levnější než ZAfix',
    fixedCheaper: 'ZAfix je teď výhodnější než spot',
    disclaimer: 'Cena podléhá pravidlům vlastníka stanice a je zobrazena v mapě stanic.',
  },
  en: {
    heading: 'Model price',
    spotCaption: 'Spot price (OTE)',
    fixedCaption: 'Fixed price',
    fixedBadge: 'FIXED',
    inclVat: 'incl. VAT 21%',
    spotCheaper: 'Spot is currently cheaper than ZAfix',
    fixedCheaper: 'ZAfix is currently the better deal',
    disclaimer: "The price is subject to the station owner's rules and is shown in the station map.",
  },
  de: {
    heading: 'Modellpreis',
    spotCaption: 'Spotpreis (OTE)',
    fixedCaption: 'Festpreis',
    fixedBadge: 'FIX',
    inclVat: 'inkl. MwSt. 21%',
    spotCheaper: 'Spot ist gerade günstiger als ZAfix',
    fixedCheaper: 'ZAfix ist gerade das bessere Angebot',
    disclaimer: 'Der Preis unterliegt den Regeln des Stationsbetreibers und wird in der Stationskarte angezeigt.',
  },
  pl: {
    heading: 'Cena modelowa',
    spotCaption: 'Cena spot (OTE)',
    fixedCaption: 'Cena stała',
    fixedBadge: 'STAŁA',
    inclVat: 'z VAT 21%',
    spotCheaper: 'Spot jest teraz tańszy niż ZAfix',
    fixedCheaper: 'ZAfix jest teraz korzystniejszy',
    disclaimer: 'Cena podlega zasadom właściciela stacji i jest pokazana w mapie stacji.',
  },
};

interface PriceColumnProps {
  accent: string;
  name: string;
  badge?: string;
  energy: number;   // raw energy price excl. VAT (the big number)
  caption: string;
  ac: number;       // total AC incl. VAT
  dc: number;       // total DC incl. VAT
  inclVatLabel: string;
  colors: ColorScheme;
  isDark: boolean;
}

function PriceColumn({
  accent, name, badge, energy, caption, ac, dc, inclVatLabel, colors, isDark,
}: PriceColumnProps) {
  return (
    <View style={[
      styles.column,
      { backgroundColor: isDark ? colors.surfaceSecondary : accent + '0D', borderColor: accent + '40' },
    ]}>
      <View style={styles.colHeader}>
        <View style={[styles.iconChip, { backgroundColor: accent + '22' }]}>
          <Ionicons name="flash" size={13} color={accent} />
        </View>
        <Text style={[styles.brand, { color: accent }]}>{name}</Text>
        {badge && (
          <View style={[styles.badgePill, { backgroundColor: accent + '22' }]}>
            <Text style={[styles.badgeText, { color: accent }]}>{badge}</Text>
          </View>
        )}
      </View>

      <View style={styles.priceRow}>
        <Text style={[styles.bigPrice, { color: accent }]}>{energy.toFixed(2)}</Text>
        <Text style={[styles.unit, { color: colors.textSecondary }]}>Kč/kWh</Text>
      </View>
      <Text style={[styles.caption, { color: colors.textMuted }]} numberOfLines={1}>
        {caption}
      </Text>

      <View style={[styles.acdcRow, { borderTopColor: colors.border }]}>
        <View style={styles.acdcItem}>
          <Text style={[styles.acdcLabel, { color: colors.textMuted }]}>AC</Text>
          <Text style={[styles.acdcValue, { color: colors.text }]}>{ac.toFixed(2)}</Text>
        </View>
        <View style={[styles.acdcDivider, { backgroundColor: colors.border }]} />
        <View style={styles.acdcItem}>
          <Text style={[styles.acdcLabel, { color: colors.textMuted }]}>DC</Text>
          <Text style={[styles.acdcValue, { color: colors.text }]}>{dc.toFixed(2)}</Text>
        </View>
      </View>
      <Text style={[styles.inclVat, { color: colors.textMuted }]} numberOfLines={1}>
        {inclVatLabel}
      </Text>
    </View>
  );
}

interface PriceSheetProps {
  prices: EffectivePrices;
  language: Language;
  colors: ColorScheme;
  isDark: boolean;
  /** Optional "LIVE • slot" pill text (e.g. effectivePrices.timeSlot). */
  timeSlot?: string;
  onPressDetails?: () => void;
}

export default function PriceSheet({
  prices, language, colors, isDark, timeSlot, onPressDetails,
}: PriceSheetProps) {
  const L = LABELS[language] || LABELS.cz;
  const spotCheaper = prices.spotPrice <= prices.zafixEnergyPrice;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.heading, { color: colors.text }]}>{L.heading}</Text>
        <View style={[styles.liveBadge, { backgroundColor: GREEN + '20' }]}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>{timeSlot ? timeSlot : 'LIVE'}</Text>
        </View>
      </View>

      <View style={styles.columns}>
        <PriceColumn
          accent={GREEN}
          name="ZAspot"
          energy={prices.spotPrice}
          caption={L.spotCaption}
          ac={prices.acPrice}
          dc={prices.dcPrice}
          inclVatLabel={L.inclVat}
          colors={colors}
          isDark={isDark}
        />
        <PriceColumn
          accent={BLUE}
          name="ZAfix"
          badge={L.fixedBadge}
          energy={prices.zafixEnergyPrice}
          caption={L.fixedCaption}
          ac={prices.zafixAcPrice}
          dc={prices.zafixDcPrice}
          inclVatLabel={L.inclVat}
          colors={colors}
          isDark={isDark}
        />
      </View>

      {/* Dynamic value hint — which option is currently the better deal */}
      <View style={[
        styles.hint,
        { backgroundColor: (spotCheaper ? GREEN : BLUE) + (isDark ? '22' : '12') },
      ]}>
        <Ionicons
          name={spotCheaper ? 'trending-down' : 'lock-closed'}
          size={14}
          color={spotCheaper ? GREEN : BLUE}
        />
        <Text style={[styles.hintText, { color: spotCheaper ? GREEN : BLUE }]}>
          {spotCheaper ? L.spotCheaper : L.fixedCheaper}
        </Text>
      </View>

      <TouchableOpacity
        onPress={onPressDetails}
        disabled={!onPressDetails}
        activeOpacity={0.7}
        style={styles.disclaimerRow}
      >
        <Ionicons name="information-circle-outline" size={13} color={colors.textMuted} />
        <Text style={[styles.disclaimer, { color: colors.textMuted }]}>{L.disclaimer}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Layout.borderRadius.xl,
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.md,
  },
  heading: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '700',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Layout.borderRadius.full,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GREEN,
  },
  liveText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: GREEN,
  },
  columns: {
    flexDirection: 'row',
    gap: Layout.spacing.sm,
  },
  column: {
    flex: 1,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
    padding: Layout.spacing.md,
  },
  colHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Layout.spacing.sm,
  },
  iconChip: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontSize: Layout.fontSize.md,
    fontWeight: '800',
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Layout.borderRadius.full,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  bigPrice: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -1,
  },
  unit: {
    fontSize: Layout.fontSize.xs,
    fontWeight: '600',
    marginLeft: 4,
  },
  caption: {
    fontSize: 11,
    marginTop: 2,
  },
  acdcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Layout.spacing.sm,
    paddingTop: Layout.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  acdcItem: {
    flex: 1,
    alignItems: 'center',
  },
  acdcLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  acdcValue: {
    fontSize: Layout.fontSize.md,
    fontWeight: '700',
    marginTop: 1,
  },
  acdcDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
  },
  inclVat: {
    fontSize: 9,
    textAlign: 'center',
    marginTop: 4,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Layout.spacing.md,
    paddingVertical: 8,
    paddingHorizontal: Layout.spacing.md,
    borderRadius: Layout.borderRadius.lg,
  },
  hintText: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '700',
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.sm,
  },
  disclaimer: {
    fontSize: 10,
    textAlign: 'center',
    flexShrink: 1,
  },
});
