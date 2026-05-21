/**
 * Receipt Detail Screen - Shows charging session receipt with full breakdown
 * Fetches from /api/receipt/[transactionId] (public, no auth required)
 */

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  Platform,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../context/AuthContext';
import { Colors } from '../../../constants/colors';
import { Layout } from '../../../constants/layout';
import { getLocale } from '../../../constants/translations';
import { apiFetch } from '../../../lib/api';
import { formatDuration, formatEnergy } from '../../../lib/charging';

interface ReceiptData {
  id: string;
  transactionId: number;
  stationName: string;
  stationIdentity: string;
  connectorId: number;
  startTimestamp: string;
  stopTimestamp: string;
  durationMinutes: number;
  energyKwh: number;
  totalCostCzk: number;
  avgSpotPriceCzkKwh: number;
  status: string;
  userName: string;
  isArchived: boolean;
}

export default function ReceiptScreen() {
  const { transactionId } = useLocalSearchParams<{ transactionId: string }>();
  const { colors, isDark } = useTheme();
  const { language, t } = useLanguage();
  const { user } = useAuth();

  const l = t.receipt;

  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [savingPdf, setSavingPdf] = useState(false);

  useEffect(() => {
    async function loadReceipt() {
      if (!transactionId) return;
      const res = await apiFetch<ReceiptData>(`/receipt/${transactionId}`);
      if (res.ok) {
        setReceipt(res.data);
      }
      setLoading(false);
    }
    loadReceipt();
  }, [transactionId]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(getLocale(language), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString(getLocale(language), {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleShare = async () => {
    if (!receipt) return;
    try {
      await Share.share({
        title: `${l.title} - ZAspot`,
        message: `${l.receiptNo} ${receipt.transactionId}\n${l.station}: ${receipt.stationName}\n${l.energy}: ${formatEnergy(receipt.energyKwh)} kWh\n${l.total}: ${receipt.totalCostCzk.toFixed(2)} CZK\n${l.date}: ${formatDate(receipt.startTimestamp)}`,
      });
    } catch (error) {
      // User cancelled share
    }
  };

  // Build a clean, print-friendly HTML version of the receipt for PDF export.
  // Inline CSS keeps PDFs identical across iOS/Android (each uses its native WebKit/WebView).
  const buildReceiptHtml = (r: ReceiptData): string => {
    const fmtPrice = (n: number) => n.toFixed(2).replace('.', ',');
    return `
<!DOCTYPE html>
<html lang="${language}">
<head>
<meta charset="utf-8" />
<title>ZAspot Receipt #${r.transactionId}</title>
<style>
  @page { size: A4; margin: 16mm; }
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color: #111; line-height: 1.4; }
  h1 { color: #16A34A; margin: 0 0 4px; font-size: 26px; }
  .sub { color: #6B7280; font-size: 13px; margin-bottom: 24px; }
  .card { border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
  .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #F3F4F6; }
  .row:last-child { border-bottom: none; }
  .label { color: #6B7280; font-size: 13px; }
  .val { color: #111827; font-weight: 600; font-size: 14px; }
  .total { font-size: 22px; color: #16A34A; font-weight: 700; }
  .station { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
  .station-id { color: #6B7280; font-size: 12px; margin-bottom: 16px; }
  .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 600;
           background: ${r.status === 'completed' ? '#DCFCE7' : '#DBEAFE'};
           color: ${r.status === 'completed' ? '#16A34A' : '#3B82F6'}; }
  .footer { text-align: center; color: #9CA3AF; font-size: 11px; margin-top: 24px; }
</style>
</head>
<body>
  <h1>ZAspot</h1>
  <div class="sub">${l.title} #${r.transactionId} · <span class="badge">${r.status === 'completed' ? l.completed : l.active}</span></div>

  <div class="card">
    <div class="station">${r.stationName}</div>
    <div class="station-id">${r.stationIdentity} · ${l.connector} ${r.connectorId}</div>
    <div class="row"><span class="label">${l.date}</span><span class="val">${formatDate(r.startTimestamp)}</span></div>
    <div class="row"><span class="label">${l.startTime}</span><span class="val">${formatTime(r.startTimestamp)}</span></div>
    ${r.stopTimestamp ? `<div class="row"><span class="label">${l.endTime}</span><span class="val">${formatTime(r.stopTimestamp)}</span></div>` : ''}
    <div class="row"><span class="label">${l.duration || 'Duration'}</span><span class="val">${formatDuration(r.durationMinutes)}</span></div>
    <div class="row"><span class="label">${l.energy}</span><span class="val">${formatEnergy(r.energyKwh)} kWh</span></div>
    ${r.avgSpotPriceCzkKwh ? `<div class="row"><span class="label">${(l as any).avgPrice || 'Avg. price'}</span><span class="val">${fmtPrice(r.avgSpotPriceCzkKwh)} CZK/kWh</span></div>` : ''}
    <div class="row"><span class="label">${l.total}</span><span class="val total">${fmtPrice(r.totalCostCzk)} CZK</span></div>
    ${r.userName ? `<div class="row"><span class="label">${(l as any).customer || 'Customer'}</span><span class="val">${r.userName}</span></div>` : ''}
  </div>

  <div class="footer">
    Sdil Building Automotive s.r.o. · IČO 09873236 · DIČ CZ09873236<br/>
    Štefánikova 605/46b, 612 00 Brno · zaspot.cz
  </div>
</body>
</html>`;
  };

  const handleSavePdf = async () => {
    if (!receipt) return;
    setSavingPdf(true);
    try {
      // Print.printToFileAsync renders our HTML via the system's PDF engine
      // (no extra dependencies; same engine that prints from Safari/Chrome).
      const { uri } = await Print.printToFileAsync({
        html: buildReceiptHtml(receipt),
        base64: false,
      });

      // Rename so the OS share/save sheet shows a human-friendly filename.
      // expo-file-system v19 introduced the File/Paths object API.
      const filename = `ZAspot-Receipt-${receipt.transactionId}.pdf`;
      let finalUri = uri;
      try {
        const source = new File(uri);
        const dest = new File(Paths.cache, filename);
        // If a previous export sits there, replace it.
        if (dest.exists) dest.delete();
        source.move(dest);
        finalUri = dest.uri;
      } catch {
        // Fall back to original URI; share sheet still works, just with the raw filename.
      }

      // Sharing.shareAsync opens the native share sheet so the user can
      // "Save to Files", "Save to Photos", AirDrop, mail it, etc.
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(finalUri, {
          UTI: 'com.adobe.pdf',
          mimeType: 'application/pdf',
          dialogTitle: l.title,
        });
      } else {
        Alert.alert(l.title, finalUri);
      }
    } catch (err: any) {
      Alert.alert(l.error || 'Error', err?.message || 'Could not generate PDF');
    } finally {
      setSavingPdf(false);
    }
  };

  const handleSendEmail = async () => {
    if (!receipt || !user?.email) return;
    setSendingEmail(true);
    try {
      const res = await apiFetch('/receipt/send-email', {
        method: 'POST',
        body: JSON.stringify({
          transactionId: receipt.id,
          email: user.email,
        }),
      });
      if (res.ok) {
        Alert.alert(l.emailSent, user.email);
      } else {
        Alert.alert(l.emailError);
      }
    } catch {
      Alert.alert(l.emailError);
    } finally {
      setSendingEmail(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.brand.accentGreen} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{l.loading}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (!receipt) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerContainer}>
          <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{l.error}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
            <Text style={{ color: Colors.brand.accentGreen, fontWeight: '600' }}>{l.back}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isCompleted = receipt.status === 'completed';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{l.title}</Text>
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
          <TouchableOpacity
            onPress={handleSavePdf}
            disabled={savingPdf}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {savingPdf ? (
              <ActivityIndicator size="small" color={Colors.brand.accentGreen} />
            ) : (
              <Ionicons name="download-outline" size={24} color={colors.text} />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="share-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Receipt Card */}
        <View style={[styles.receiptCard, { backgroundColor: colors.surface }]}>
          {/* Status Badge */}
          <View style={styles.receiptHeader}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: isCompleted ? Colors.brand.accentGreen + '15' : '#3B82F615' },
            ]}>
              <Ionicons
                name={isCompleted ? 'checkmark-circle' : 'flash'}
                size={16}
                color={isCompleted ? Colors.brand.accentGreen : '#3B82F6'}
              />
              <Text style={[
                styles.statusText,
                { color: isCompleted ? Colors.brand.accentGreen : '#3B82F6' },
              ]}>
                {isCompleted ? l.completed : l.active}
              </Text>
            </View>
            <Text style={[styles.receiptId, { color: colors.textMuted }]}>
              #{receipt.transactionId}
            </Text>
          </View>

          {/* Station Name */}
          <Text style={[styles.stationName, { color: colors.text }]}>
            {receipt.stationName}
          </Text>
          <Text style={[styles.stationId, { color: colors.textMuted }]}>
            {receipt.stationIdentity} • {l.connector} {receipt.connectorId}
          </Text>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Time Details */}
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
            </View>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{l.date}</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {formatDate(receipt.startTimestamp)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
            </View>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{l.startTime}</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {formatTime(receipt.startTimestamp)}
            </Text>
          </View>

          {receipt.stopTimestamp && (
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
              </View>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{l.endTime}</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {formatTime(receipt.stopTimestamp)}
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="hourglass-outline" size={18} color={colors.textSecondary} />
            </View>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{l.duration}</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {formatDuration(receipt.durationMinutes)}
            </Text>
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Energy & Cost */}
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="battery-charging-outline" size={18} color={Colors.brand.accentGreen} />
            </View>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{l.energy}</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {formatEnergy(receipt.energyKwh)} kWh
            </Text>
          </View>

          {receipt.avgSpotPriceCzkKwh != null && (
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="trending-up" size={18} color={colors.textSecondary} />
              </View>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{l.avgPrice}</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {receipt.avgSpotPriceCzkKwh.toFixed(2)} CZK/kWh
              </Text>
            </View>
          )}

          {/* Total */}
          <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>{l.total}</Text>
            <Text style={[styles.totalValue, { color: Colors.brand.accentGreen }]}>
              {receipt.totalCostCzk.toFixed(2)} CZK
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={handleShare}
            style={[styles.actionBtn, { backgroundColor: colors.surface }]}
            activeOpacity={0.7}
          >
            <Ionicons name="share-outline" size={20} color={Colors.brand.accentGreen} />
            <Text style={[styles.actionBtnText, { color: Colors.brand.accentGreen }]}>
              {l.share}
            </Text>
          </TouchableOpacity>

          {user?.email && (
            <TouchableOpacity
              onPress={handleSendEmail}
              disabled={sendingEmail}
              style={[styles.actionBtn, { backgroundColor: Colors.brand.accentGreen }]}
              activeOpacity={0.7}
            >
              {sendingEmail ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="mail-outline" size={20} color="#FFFFFF" />
                  <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>
                    {l.sendEmail}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* ZAspot Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            ZAspot • zaspot.cz
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Layout.spacing.md,
  },
  loadingText: {
    fontSize: Layout.fontSize.md,
  },
  backLink: {
    paddingVertical: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: Layout.fontSize.xl,
    fontWeight: '700',
  },
  scrollContent: {
    padding: Layout.spacing.md,
    paddingBottom: 40,
  },
  receiptCard: {
    borderRadius: Layout.borderRadius.xl,
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.md,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Layout.borderRadius.full,
    gap: 6,
  },
  statusText: {
    fontSize: Layout.fontSize.xs,
    fontWeight: '700',
  },
  receiptId: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
  },
  stationName: {
    fontSize: Layout.fontSize.xl,
    fontWeight: '700',
    marginBottom: 4,
  },
  stationId: {
    fontSize: Layout.fontSize.sm,
    marginBottom: Layout.spacing.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Layout.spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailIcon: {
    width: 28,
    alignItems: 'center',
  },
  detailLabel: {
    flex: 1,
    fontSize: Layout.fontSize.sm,
    marginLeft: Layout.spacing.sm,
  },
  detailValue: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Layout.spacing.md,
    paddingTop: Layout.spacing.md,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
  },
  actions: {
    flexDirection: 'row',
    gap: Layout.spacing.sm,
    marginBottom: Layout.spacing.lg,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: Layout.borderRadius.lg,
    gap: Layout.spacing.sm,
  },
  actionBtnText: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Layout.spacing.md,
  },
  footerText: {
    fontSize: Layout.fontSize.xs,
  },
});
