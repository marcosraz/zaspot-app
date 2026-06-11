/**
 * QR Scanner Screen — point camera at a station QR code (encodes
 * zaspot.cz/charge/<chargePointId>) and the app jumps straight to the
 * matching station detail. Falls back to a manual code-entry form if the
 * scan can't be done (low light, broken camera, etc.).
 */

import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';

/**
 * Extracts the chargePointId from a scanned URL/string. Accepts:
 *   https://zaspot.cz/charge/CZ-ZAS-E00009
 *   https://www.zaspot.cz/charge/CZ-ZAS-E00009
 *   zaspot.cz/charge/CZ-ZAS-E00009
 *   CZ-ZAS-E00009   (plain code, fallback)
 */
function parseChargePointId(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  // Also accept the sticker URL zaspot.cz/api/qr/<id>?connector=N — the website's
  // QR endpoint 302-redirects that to /charge/<id>, but a raw camera scan can't
  // follow the redirect, so we match /api/qr/ directly alongside /charge/ and /c/.
  const urlMatch = trimmed.match(/(?:zaspot\.cz|zaspot\.eu)\/(?:api\/qr|charge|c)\/([A-Za-z0-9-]+)/i);
  if (urlMatch?.[1]) return urlMatch[1];
  // Plain code — accept common ZAspot/AUTEL/Hubject formats
  if (/^[A-Z]{2,4}-?[A-Z]{0,4}-?E?[0-9A-Z]{4,12}$/i.test(trimmed)) return trimmed;
  if (/^[A-Z0-9]{15,30}$/.test(trimmed)) return trimmed; // AUTEL serials
  return null;
}

export default function ScanScreen() {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const handlingRef = useRef(false);

  // Auto-request camera permission on mount when allowed
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  const navigateToStation = (chargePointId: string, connector?: string) => {
    setNavigating(true); // brief confirmation overlay before the screen changes
    // Reset scanner after a delay so user can scan another if they come back
    setTimeout(() => {
      handlingRef.current = false;
      setScanned(false);
      setNavigating(false);
    }, 1500);
    router.push(
      connector
        ? `/station/${chargePointId}?connector=${encodeURIComponent(connector)}`
        : `/station/${chargePointId}`,
    );
  };

  const handleBarcode = (data: string) => {
    if (handlingRef.current) return;
    handlingRef.current = true;
    setScanned(true);

    const id = parseChargePointId(data);
    // Preselect the plug if the sticker URL carried ?connector=N
    const connMatch = data.match(/[?&]connector=([^&\s]+)/i);
    const connector = connMatch ? decodeURIComponent(connMatch[1]) : undefined;
    if (!id) {
      Alert.alert(
        'Neznámý QR kód',
        `Tento kód nepatří k ZAspot nabíjecí stanici.\n\nObsah: ${data.slice(0, 80)}`,
        [{ text: 'OK', onPress: () => { handlingRef.current = false; setScanned(false); } }],
      );
      return;
    }
    navigateToStation(id, connector);
  };

  const handleManualSubmit = () => {
    const id = parseChargePointId(manualCode);
    if (!id) {
      Alert.alert('Neplatný kód', 'Zadejte platné ID stanice (např. CZ-ZAS-E00009).');
      return;
    }
    navigateToStation(id);
  };

  if (!permission) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]}>
        <ActivityIndicator size="large" color="#fff" />
      </SafeAreaView>
    );
  }

  // Permission denied — show manual entry + a way to retry
  if (!permission.granted) {
    return (
      <>
        <Stack.Screen options={{ title: 'Skenovat QR kód', headerShown: true }} />
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.permissionBox}>
            <Ionicons name="camera-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.permissionTitle, { color: colors.text }]}>
              Bez přístupu k fotoaparátu
            </Text>
            <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
              Pro skenování QR kódů aktivujte přístup v nastavení, nebo zadejte ID stanice ručně.
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (permission.canAskAgain) requestPermission();
                else Linking.openSettings();
              }}
              style={[styles.btn, { backgroundColor: Colors.brand.accentGreen }]}
            >
              <Ionicons name="settings-outline" size={18} color="#fff" />
              <Text style={styles.btnText}>
                {permission.canAskAgain ? 'Povolit fotoaparát' : 'Otevřít nastavení'}
              </Text>
            </TouchableOpacity>
            <ManualInput
              code={manualCode}
              setCode={setManualCode}
              onSubmit={handleManualSubmit}
              colors={colors}
            />
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Skenovat QR kód', headerShown: true, headerStyle: { backgroundColor: '#000' }, headerTintColor: '#fff' }} />
      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'datamatrix', 'aztec'],
          }}
          onBarcodeScanned={scanned ? undefined : (result) => handleBarcode(result.data)}
        />

        {/* Scanning frame overlay — dimmed surround with a transparent cutout so
            the eye is drawn to where the QR code should be aimed. The mask is built
            from four translucent blocks (top / left+hole+right / bottom). */}
        <View pointerEvents="none" style={styles.overlay}>
          <View style={styles.mask} />
          <View style={styles.maskMiddle}>
            <View style={styles.mask} />
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <View style={styles.mask} />
          </View>
          <View style={[styles.mask, styles.maskBottom]}>
            <Text style={styles.overlayText}>
              Namiřte fotoaparát na QR kód u stanice
            </Text>
          </View>
        </View>

        {/* Bottom controls */}
        <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
          {!manualMode ? (
            <TouchableOpacity
              onPress={() => setManualMode(true)}
              style={[styles.bottomBtn, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
            >
              <Ionicons name="keypad-outline" size={18} color="#fff" />
              <Text style={styles.bottomBtnText}>Zadat ručně</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.manualWrap}>
              <TextInput
                value={manualCode}
                onChangeText={setManualCode}
                placeholder="Např. CZ-ZAS-E00009"
                placeholderTextColor="rgba(255,255,255,0.5)"
                autoCapitalize="characters"
                autoCorrect={false}
                style={styles.manualInput}
              />
              <TouchableOpacity
                onPress={handleManualSubmit}
                disabled={!manualCode.trim()}
                style={[styles.bottomBtn, { backgroundColor: Colors.brand.accentGreen, opacity: manualCode.trim() ? 1 : 0.5 }]}
              >
                <Text style={styles.bottomBtnText}>Otevřít</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setManualMode(false); setManualCode(''); }} style={{ padding: 8 }}>
                <Text style={{ color: '#fff' }}>Zpět ke skenování</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>

        {/* Brief confirmation while we open the matched station */}
        {navigating && (
          <View style={styles.scannedOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.scannedText}>Otevírám stanici…</Text>
          </View>
        )}
      </View>
    </>
  );
}

function ManualInput({ code, setCode, onSubmit, colors }: {
  code: string;
  setCode: (s: string) => void;
  onSubmit: () => void;
  colors: { text: string; surface: string; border: string };
}) {
  return (
    <View style={{ width: '100%', marginTop: 24, gap: 8 }}>
      <Text style={{ color: colors.text, fontWeight: '600' }}>Zadat ID stanice ručně:</Text>
      <TextInput
        value={code}
        onChangeText={setCode}
        placeholder="CZ-ZAS-E00009"
        autoCapitalize="characters"
        autoCorrect={false}
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          padding: 12,
          borderRadius: 10,
          color: colors.text,
          fontSize: 16,
        }}
      />
      <TouchableOpacity
        onPress={onSubmit}
        disabled={!code.trim()}
        style={[styles.btn, { backgroundColor: Colors.brand.accentGreen, opacity: code.trim() ? 1 : 0.5 }]}
      >
        <Text style={styles.btnText}>Otevřít stanici</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  permissionBox: {
    flex: 1,
    padding: Layout.spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  permissionTitle: { fontSize: 20, fontWeight: '700', marginTop: 12 },
  permissionText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  btn: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  cameraContainer: { flex: 1, backgroundColor: '#000' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  mask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  maskMiddle: {
    flexDirection: 'row',
    height: 260,
  },
  maskBottom: {
    alignItems: 'center',
  },
  scannedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  scannedText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  scanFrame: { width: 260, height: 260, position: 'relative' },
  corner: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderColor: Colors.brand.accentGreen,
    borderWidth: 4,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
  overlayText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 24,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowRadius: 4,
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    alignItems: 'center',
  },
  bottomBtn: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 24,
    alignItems: 'center',
    minWidth: 160,
    justifyContent: 'center',
  },
  bottomBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  manualWrap: { width: '100%', gap: 10 },
  manualInput: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderColor: 'rgba(255,255,255,0.3)',
    borderWidth: 1,
    padding: 14,
    borderRadius: 10,
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
});
