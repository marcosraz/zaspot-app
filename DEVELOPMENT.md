# ZAspot App - Entwicklungsnotizen

## EAS Build - Bekannte Probleme & Lösungen

### 1. Dependency Konflikte bei EAS Build
**Problem:** EAS Build verwendet `npm install` ohne `--legacy-peer-deps`, was zu Fehlern führt.

**Lösung:** `.npmrc` Datei im Projekt-Root erstellen:
```
legacy-peer-deps=true
```

### 2. New Architecture (newArchEnabled)
**Problem:** `react-native-worklets` (benötigt von `react-native-reanimated`) erfordert die neue Architektur.

**Lösung:** MUSS auf `true` bleiben:
```json
"newArchEnabled": true
```

**WICHTIG:** Nicht auf `false` setzen, sonst schlägt der Build fehl mit:
`Task :react-native-worklets:assertNewArchitectureEnabledTask FAILED`

### 3. react-native-worklets Version
**Problem:** Falsche Version von `react-native-worklets` verursacht Build-Fehler.

**Lösung:** Immer `npx expo install --fix` ausführen um kompatible Versionen zu installieren.
Für Expo SDK 54: `react-native-worklets@0.5.1` (nicht 0.7.1)

### 4. Fehlende Peer Dependencies
**Problem:** `expo-font` fehlt als Peer Dependency von `@expo/vector-icons`.

**Lösung:**
```bash
npx expo-doctor  # Prüft auf fehlende Dependencies
npm install expo-font --legacy-peer-deps
```

## Lokale Entwicklung

### App starten
```bash
npx expo start --clear
```

### Auf Handy testen (gleiches WLAN)
```bash
npx expo start --lan
```
Dann QR-Code mit Expo Go scannen.

### Auf Handy testen (unterwegs/remote)
```bash
npx expo start --tunnel
```

## EAS Build

### APK für Android erstellen
```bash
npx eas-cli build --platform android --profile preview
```

**Wichtig:** Free Account = 15 Builds/Monat (auch fehlgeschlagene zählen!)

### Vor dem Build prüfen
```bash
npx expo-doctor  # Alle Checks müssen grün sein
```

## Supabase

- **Project ID:** krbsbsiauuxevtjziudl
- **URL:** https://krbsbsiauuxevtjziudl.supabase.co
- **Tabelle:** `charging_stations` (845 Stationen)

## Google Maps API Key

Für Produktion muss ein echter API Key in `app.json` eingetragen werden:
- Android: `expo.android.config.googleMaps.apiKey`
- iOS: `expo.ios.config.googleMapsApiKey`
