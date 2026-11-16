#!/bin/bash
# Veröffentlicht den aktuellen JS-Stand als Over-the-Air-Update (EAS Update).
#
#   scripts/ota-update.sh "kurze Beschreibung der Änderung"
#
# Alle installierten Apps mit derselben nativen Version holen sich das Update
# beim nächsten Start (bzw. wenn sie in den Vordergrund kommen) und wenden es
# beim darauffolgenden Kaltstart an — ohne neue APK, ohne TestFlight.
#
# Was per OTA geht:   alles in JS/TS (Screens, Logik, Texte, Styles, Bilder).
# Was NICHT geht:     neue native Pakete, Expo-SDK-Upgrade, Berechtigungen,
#                     app.config-Plugins, App-Icon → dafür `version` hochzählen
#                     und neu bauen (build-apk-local.sh + release-android.sh).
#
# Sicherungen (jede bricht ab, statt ein kaputtes Update auszuliefern):
#   1. Arbeitsverzeichnis committet — das Update gehört zu genau einem Commit
#   2. `version` unverändert seit dem letzten nativen Build — die Runtime-Version
#      IST die App-Version; ein Update mit neuer Version erreicht kein Gerät
#   3. nativer Fingerabdruck unverändert — sonst würde JS an eine App gehen,
#      der ein natives Modul fehlt (Absturz beim Start)
#   4. Typecheck grün
# FORCE=1 überspringt 2 und 3 (nur wenn du sicher bist, warum sie anschlagen).
set -euo pipefail

SRC="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SRC"
MSG="${1:-}"
[ -n "$MSG" ] || { echo "Usage: $0 \"Beschreibung der Änderung\"" >&2; exit 1; }
die() { echo "✗ $*" >&2; exit 1; }

echo "=== [1/4] Vorab-Prüfungen"
[ -z "$(git status --porcelain --untracked-files=no)" ] || die "Uncommittete Änderungen — erst committen, dann veröffentlichen"

[ -f native-fingerprint.json ] || die "native-fingerprint.json fehlt — wird beim nativen Build geschrieben (build-apk-local.sh)"
BUILT_VERSION=$(python3 -c "import json; print(json.load(open('native-fingerprint.json'))['version'])")
BUILT_HASH=$(python3 -c "import json; print(json.load(open('native-fingerprint.json'))['hash'])")
VERSION=$(sed -n "s/^ *version: '\([^']*\)'.*/\1/p" app.config.ts | head -1)
NOW_HASH=$(npx --no-install @expo/fingerprint fingerprint:generate 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin)['hash'])")

if [ "${FORCE:-0}" != "1" ]; then
  [ "$VERSION" = "$BUILT_VERSION" ] || die "version ist $VERSION, der letzte native Build war $BUILT_VERSION — ein Update für $VERSION erreicht kein Gerät. Entweder version zurücksetzen (reines JS-Update) oder neu bauen (nativer Release)."
  [ "$NOW_HASH" = "$BUILT_HASH" ] || die "Das native Projekt hat sich seit Build $BUILT_VERSION geändert (Pakete/Plugins/Config) — das braucht einen neuen Build, kein OTA. Diff: npx @expo/fingerprint fingerprint:diff"
fi
echo "  Runtime $VERSION, nativer Stand unverändert ✓"

echo "=== [2/4] Typecheck"
node node_modules/typescript/lib/tsc.js --noEmit || die "Typecheck fehlgeschlagen"

echo "=== [3/4] Veröffentlichen (Kanal production)"
command -v eas >/dev/null || die "eas-cli nicht gefunden (npm i -g eas-cli)"
eas update --channel production --message "$MSG ($(git rev-parse --short HEAD))" --non-interactive

echo "=== [4/4] Fertig"
echo "  Geräte mit App-Version $VERSION laden das Update beim nächsten Öffnen und"
echo "  nutzen es ab dem darauffolgenden Kaltstart. Sichtbar unter Profil → O aplikaci."
echo "  Zurücknehmen: eas update:rollback   |   Verlauf: eas update:list --branch production"
