/**
 * eRoaming Receipt — one Hubject roaming session with the full price split:
 * CPO tariff (converted to CZK) + ZAspot roaming markup, VAT derived from the
 * gross wallet debit. Data: /api/emp/receipt/[sessionId] (owner-only).
 * PDF export mirrors the wallet receipt screen (HTML → expo-print → share sheet).
 */
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { Colors } from '../../../constants/colors';
import { fetchEmpReceipt, EmpReceipt } from '../../../lib/v2Features';
import { formatDbDate, formatDbTime } from '../../../lib/dates';

const STATUS: Record<EmpReceipt['status'], { label: string; color: string }> = {
  billed: { label: 'Zaúčtováno', color: '#16A34A' },
  pending: { label: 'Čeká na vyúčtování', color: '#F59E0B' },
  no_price: { label: 'Čeká na cenu operátora', color: '#F59E0B' },
  insufficient_credit: { label: 'Čeká na dobití kreditu', color: '#DC2626' },
  active: { label: 'Probíhá', color: '#3B82F6' },
  failed: { label: 'Nezdařilo se', color: '#DC2626' },
};

const czk = (n: number | null | undefined, d = 2) => (n == null ? '–' : `${n.toFixed(d).replace('.', ',')} Kč`);
const perKwh = (n: number | null | undefined) => (n == null ? '–' : `${n.toFixed(2).replace('.', ',')} Kč/kWh`);
const fmtDate = (s: string | null) => (s ? formatDbDate(s, 'cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' }) : '–');
const fmtTime = (s: string | null) => (s ? formatDbTime(s, 'cs-CZ', { hour: '2-digit', minute: '2-digit' }) : '–');

export default function EmpReceiptScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { colors } = useTheme();
  const [receipt, setReceipt] = useState<EmpReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPdf, setSavingPdf] = useState(false);

  useEffect(() => {
    (async () => {
      if (!sessionId) return;
      const res = await fetchEmpReceipt(sessionId);
      if (res.ok && res.data?.receipt) setReceipt(res.data.receipt);
      setLoading(false);
    })();
  }, [sessionId]);

  const rows = (r: EmpReceipt): Array<[string, string, boolean?]> => {
    const out: Array<[string, string, boolean?]> = [
      ['Datum', fmtDate(r.startedAt)],
      ['Začátek', fmtTime(r.startedAt)],
      ['Konec', fmtTime(r.endedAt)],
      ['Doba nabíjení', r.durationMinutes != null ? `${r.durationMinutes} min` : '–'],
      ['Energie', r.energyKwh != null ? `${r.energyKwh.toFixed(3).replace('.', ',')} kWh` : '–'],
    ];
    if (r.cpoPriceOriginal != null && r.cpoCurrencyOriginal && r.cpoCurrencyOriginal !== 'CZK') {
      out.push(['Tarif operátora', `${r.cpoPriceOriginal.toFixed(2).replace('.', ',')} ${r.cpoCurrencyOriginal}/kWh`]);
    }
    return out;
  };

  const priceRows = (r: EmpReceipt): Array<[string, string, boolean?]> => [
    [`Cena operátora (${r.operatorName || r.operatorId || 'CPO'})`, perKwh(r.cpoPriceCzkKwh)],
    ['   × energie', czk(r.cpoCostCzk)],
    ['Roamingová přirážka ZAspot', perKwh(r.markupCzkKwh)],
    ['   × energie', czk(r.markupCostCzk)],
    ['Základ daně', czk(r.totalNetCzk)],
    ['DPH 21 %', czk(r.vatCzk)],
    ['Celkem odečteno z kreditu', czk(r.totalCzk), true],
  ];

  const buildHtml = (r: EmpReceipt) => {
    const st = STATUS[r.status];
    const line = ([k, v, bold]: [string, string, boolean?]) =>
      `<div class="row"><span class="label">${k}</span><span class="val${bold ? ' total' : ''}">${v}</span></div>`;
    return `<!DOCTYPE html><html lang="cs"><head><meta charset="utf-8"/><title>ZAspot eRoaming ${r.receiptNumber}</title>
<style>
 @page{size:A4;margin:16mm} body{font-family:-apple-system,"Segoe UI",Roboto,sans-serif;color:#111;line-height:1.4}
 h1{color:#16A34A;margin:0 0 4px;font-size:26px} .brand{display:flex;align-items:center;gap:12px;margin-bottom:4px}
 .brand img{width:44px;height:44px;border-radius:10px} .sub{color:#6B7280;font-size:13px;margin-bottom:24px}
 .card{border:1px solid #E5E7EB;border-radius:12px;padding:20px;margin-bottom:16px}
 .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #F3F4F6} .row:last-child{border-bottom:none}
 .label{color:#6B7280;font-size:13px;white-space:pre} .val{color:#111827;font-weight:600;font-size:14px}
 .total{font-size:20px;color:#16A34A;font-weight:700} .station{font-size:18px;font-weight:700;margin-bottom:4px}
 .station-id{color:#6B7280;font-size:12px;margin-bottom:16px}
 .badge{display:inline-block;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:600;background:${st.color}22;color:${st.color}}
 .footer{text-align:center;color:#9CA3AF;font-size:11px;margin-top:24px}
</style></head><body>
<div class="brand"><img src="https://www.zaspot.cz/images/LogoZ.png" alt="ZAspot"/><h1>ZAspot</h1></div>
<div class="sub">Doklad o roamingovém nabíjení ${r.receiptNumber} · <span class="badge">${st.label}</span></div>
<div class="card"><div class="station">${r.stationName || r.evseId}</div>
<div class="station-id">${r.operatorName || r.operatorId || ''} · ${r.evseId} · síť Hubject</div>
${rows(r).map(line).join('')}</div>
<div class="card">${priceRows(r).map(line).join('')}</div>
<div class="footer">Zprostředkovatel roamingu: Sdil Building Automotive s.r.o. (ZAspot) · IČO 09873236 · DIČ CZ09873236<br/>
Štefánikova 605/46b, 612 00 Brno · zaspot.cz · Hubject session ${r.hubjectSessionId ?? ''}</div>
</body></html>`;
  };

  const handleSavePdf = async () => {
    if (!receipt) return;
    setSavingPdf(true);
    try {
      const { uri } = await Print.printToFileAsync({ html: buildHtml(receipt), base64: false });
      let finalUri = uri;
      try {
        const dest = new File(Paths.cache, `ZAspot-eRoaming-${receipt.receiptNumber}.pdf`);
        if (dest.exists) dest.delete();
        new File(uri).move(dest);
        finalUri = dest.uri;
      } catch { /* keep original uri */ }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(finalUri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf', dialogTitle: 'Doklad o nabíjení' });
      } else {
        Alert.alert('PDF uloženo', finalUri);
      }
    } catch (e) {
      Alert.alert('Chyba', 'PDF se nepodařilo vytvořit.');
    } finally {
      setSavingPdf(false);
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={Colors.brand.accentGreen} />;
  if (!receipt) {
    return (
      <>
        <Stack.Screen options={{ title: 'Doklad', headerShown: true }} />
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <Ionicons name="receipt-outline" size={44} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, marginTop: 10 }}>Doklad se nepodařilo načíst.</Text>
        </View>
      </>
    );
  }

  const st = STATUS[receipt.status];
  const Row = ({ k, v, bold }: { k: string; v: string; bold?: boolean }) => (
    <View style={[styles.row, { borderBottomColor: colors.borderLight }]}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{k}</Text>
      <Text style={[styles.val, { color: bold ? Colors.brand.accentGreen : colors.text }, bold && styles.valTotal]}>{v}</Text>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Doklad o roamingu', headerShown: true }} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <View style={styles.headRow}>
              <Text style={[styles.number, { color: colors.textMuted }]}>{receipt.receiptNumber}</Text>
              <View style={[styles.badge, { backgroundColor: st.color + '22' }]}>
                <Text style={{ color: st.color, fontSize: 11, fontWeight: '700' }}>{st.label}</Text>
              </View>
            </View>
            <Text style={[styles.station, { color: colors.text }]}>{receipt.stationName || receipt.evseId}</Text>
            <Text style={[styles.stationId, { color: colors.textMuted }]}>
              {receipt.operatorName || receipt.operatorId} · {receipt.evseId} · síť Hubject
            </Text>
            {rows(receipt).map(([k, v]) => <Row key={k} k={k} v={v} />)}
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            {receipt.status === 'billed' ? (
              priceRows(receipt).map(([k, v, bold]) => <Row key={k} k={k} v={v} bold={bold} />)
            ) : (
              <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 18 }}>
                {receipt.status === 'no_price'
                  ? 'Operátor zatím nezveřejnil cenu pro tuto stanici. Částka bude odečtena z kreditu, jakmile bude cena doplněna; poté zde uvidíte kompletní rozpis.'
                  : receipt.status === 'insufficient_credit'
                  ? 'Na kreditu není dostatek prostředků. Po dobití se částka odečte automaticky.'
                  : receipt.status === 'active'
                  ? 'Nabíjení stále probíhá.'
                  : 'Vyúčtování proběhne po přijetí záznamu (CDR) od operátora, obvykle do několika minut po ukončení.'}
              </Text>
            )}
          </View>

          <Text style={[styles.note, { color: colors.textMuted }]}>
            Cena operátora je jeho veřejný tarif přepočtený na Kč. Roamingová přirážka pokrývá zprostředkování přes síť Hubject. Částky jsou včetně DPH.
          </Text>

          <TouchableOpacity
            style={[styles.pdfButton, { backgroundColor: Colors.brand.accentGreen, opacity: savingPdf ? 0.7 : 1 }]}
            onPress={handleSavePdf}
            disabled={savingPdf}
          >
            {savingPdf ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="document-text-outline" size={18} color="#fff" />
                <Text style={styles.pdfButtonText}>Uložit / sdílet PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  card: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 14 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  number: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  station: { fontSize: 18, fontWeight: '700' },
  stationId: { fontSize: 12, marginTop: 2, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  label: { fontSize: 13, flex: 1, paddingRight: 8 },
  val: { fontSize: 14, fontWeight: '600' },
  valTotal: { fontSize: 18, fontWeight: '800' },
  note: { fontSize: 12, lineHeight: 17, marginBottom: 16, marginHorizontal: 4 },
  pdfButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 14 },
  pdfButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
