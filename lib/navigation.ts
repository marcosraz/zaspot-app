/**
 * Cross-platform helper for launching turn-by-turn navigation to a destination.
 *
 * iOS: uses Apple Maps universal link — works whether the user has Apple Maps,
 *      Google Maps, or only a browser installed.
 * Android: uses the `geo:` intent — Android shows a chooser if multiple maps
 *          apps are installed; falls back to Google Maps web URL otherwise.
 */
import { Linking, Platform, Alert } from 'react-native';

const FALLBACK = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

export async function openNavigationTo(
  latitude: number,
  longitude: number,
  label?: string
): Promise<void> {
  const labelEncoded = label ? encodeURIComponent(label) : '';
  const primary = Platform.select({
    // dirflg=d → driving directions; dirflg without value used to be common but
    // `=d` is the documented form. saddr omitted → start from current location.
    ios: `http://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d`,
    // geo:0,0?q=lat,lng(Label) opens the system chooser if multiple apps are
    // present; falls back gracefully if only one maps app is installed.
    android: label
      ? `geo:0,0?q=${latitude},${longitude}(${labelEncoded})`
      : `geo:0,0?q=${latitude},${longitude}`,
  });

  if (!primary) {
    await Linking.openURL(FALLBACK(latitude, longitude));
    return;
  }

  try {
    const supported = await Linking.canOpenURL(primary);
    if (supported) {
      await Linking.openURL(primary);
      return;
    }
    await Linking.openURL(FALLBACK(latitude, longitude));
  } catch (err) {
    try {
      await Linking.openURL(FALLBACK(latitude, longitude));
    } catch {
      Alert.alert('Navigation', 'Could not open a maps app on this device.');
    }
  }
}
