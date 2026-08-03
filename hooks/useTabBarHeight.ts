import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Höhe der Tab-Leiste inklusive System-Navigation.
 *
 * Die App läuft edge-to-edge (`edgeToEdgeEnabled: true`), zeichnet also unter
 * die Systemleisten. Unter der Tab-Leiste liegt je nach Gerät die Android-
 * Navigation (Gestenbalken ~24dp, Drei-Tasten-Navigation ~48dp) bzw. der
 * iOS-Home-Indicator (~34pt). `insets.bottom` deckt alle Fälle ab; vorher war
 * für Android pauschal 10px eingeplant, wodurch die Labels auf Geräten mit
 * Drei-Tasten-Navigation verdeckt wurden.
 */

/** Sichtbarer Inhalt der Leiste: paddingTop + Icon + Label. */
export const TAB_BAR_CONTENT_HEIGHT = 60;

/** Mindestabstand nach unten auf Geräten, die kein Inset melden. */
const MIN_BOTTOM_INSET = 10;

export function useTabBarInsets() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, MIN_BOTTOM_INSET);

  return {
    bottomInset,
    height: TAB_BAR_CONTENT_HEIGHT + bottomInset,
  };
}

/**
 * Freiraum am Ende scrollbarer Tab-Screens, damit der letzte Eintrag nicht
 * unter der Leiste verschwindet.
 */
export function useTabBarScrollPadding(extra = 24) {
  return useTabBarInsets().height + extra;
}
