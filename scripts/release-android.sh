#!/bin/bash
# Rollt eine fertig gebaute APK auf zaspot.cz aus (/download/zaspot-android.apk).
#
#   scripts/release-android.sh <pfad/zur.apk>   prüfen + hochladen + verifizieren
#   scripts/release-android.sh --rollback       vorherige APK wiederherstellen
#   FORCE=1 scripts/release-android.sh <apk>    versionCode-Prüfung überspringen
#
# Vor dem Upload wird geprüft, was beim Sideload sonst erst beim Kunden auffällt:
#   - Paketname + Version passen zu app.config.ts
#   - alle 4 ABIs enthalten (arm64-only ließ sich nicht überall installieren)
#   - signiert mit dem EAS-Keystore (sonst: Google-Login tot UND Update über die
#     bestehende Installation schlägt fehl, weil die Signatur nicht passt)
#   - versionCode höher als die Live-Version (Android verweigert Downgrades)
#
# Neben die APK kommt eine Sidecar-Datei zaspot-android.json; die Website liest
# daraus die angezeigte Version (/api/download/android/meta) — kein Web-Deploy.
# Die vorherige APK bleibt als zaspot-android.prev.apk für --rollback liegen.
set -euo pipefail

SRC="$(cd "$(dirname "$0")/.." && pwd)"
SITE="https://www.zaspot.cz"
SSH_HOST="zaspot@46.225.71.186"
SSH_OPTS=(-i "$HOME/.ssh/hetzner_zaspot" -o BatchMode=yes -o ConnectTimeout=20)
REMOTE_DIR="/app/public/storage/downloads"
EXPECTED_PKG="cz.zaspot.app"

export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export PATH="$JAVA_HOME/bin:$PATH"

die() { echo "✗ $*" >&2; exit 1; }

if [ "${1:-}" = "--rollback" ]; then
  echo "=== Rollback auf die vorherige APK"
  ssh "${SSH_OPTS[@]}" "$SSH_HOST" "docker exec -u 0 web sh -ec '
    cd $REMOTE_DIR
    [ -f zaspot-android.prev.apk ] || { echo \"keine vorherige APK vorhanden\"; exit 1; }
    mv zaspot-android.prev.apk zaspot-android.apk
    if [ -f zaspot-android.prev.json ]; then mv zaspot-android.prev.json zaspot-android.json; else rm -f zaspot-android.json; fi
    ls -la
  '"
  curl -fsS --max-time 20 "$SITE/api/download/android/meta" || true
  echo
  exit 0
fi

APK="${1:-}"
[ -f "$APK" ] || die "Usage: $0 <apk> | --rollback"

AAPT2=$(ls "$ANDROID_HOME"/build-tools/*/aapt2 2>/dev/null | sort -V | tail -1)
APKSIGNER=$(ls "$ANDROID_HOME"/build-tools/*/apksigner 2>/dev/null | sort -V | tail -1)
[ -x "$AAPT2" ] && [ -x "$APKSIGNER" ] || die "aapt2/apksigner nicht gefunden (Android build-tools)"

echo "=== [1/4] APK prüfen"
BADGING=$("$AAPT2" dump badging "$APK")
PKG=$(sed -n "s/^package: name='\([^']*\)'.*/\1/p" <<<"$BADGING")
VCODE=$(sed -n "s/^package:.* versionCode='\([^']*\)'.*/\1/p" <<<"$BADGING")
VNAME=$(sed -n "s/^package:.* versionName='\([^']*\)'.*/\1/p" <<<"$BADGING")
ABIS=$(sed -n "s/^native-code: //p" <<<"$BADGING")
WANT_VNAME=$(sed -n "s/^ *version: '\([^']*\)'.*/\1/p" "$SRC/app.config.ts" | head -1)

echo "  $PKG $VNAME (versionCode $VCODE) · ABIs: $ABIS"
[ "$PKG" = "$EXPECTED_PKG" ] || die "Paketname ist $PKG, erwartet $EXPECTED_PKG"
[ "$VNAME" = "$WANT_VNAME" ] || die "APK ist $VNAME, app.config.ts steht auf $WANT_VNAME — falsche/alte APK?"
for abi in armeabi-v7a arm64-v8a x86 x86_64; do
  grep -q "'$abi'" <<<"$ABIS" || die "ABI $abi fehlt — APK muss universal sein"
done

CREDS="$SRC/credentials.json"
KS="$SRC/credentials/android/keystore.jks"
[ -f "$CREDS" ] && [ -f "$KS" ] || die "credentials.json / keystore.jks fehlen — Signatur nicht prüfbar"
ALIAS=$(python3 -c "import json; print(json.load(open('$CREDS'))['android']['keystore']['keyAlias'])")
KS_PASS=$(python3 -c "import json; print(json.load(open('$CREDS'))['android']['keystore']['keystorePassword'])")
export KS_PASS
KS_SHA=$(keytool -list -v -keystore "$KS" -alias "$ALIAS" -storepass:env KS_PASS 2>/dev/null \
  | sed -n 's/^[[:space:]]*SHA256: //p' | tr -d ':' | tr 'A-F' 'a-f')
APK_SHA=$("$APKSIGNER" verify --print-certs "$APK" | sed -n 's/^Signer #1 certificate SHA-256 digest: //p')
[ -n "$KS_SHA" ] || die "Keystore-Zertifikat nicht lesbar"
[ "$APK_SHA" = "$KS_SHA" ] || die "APK ist NICHT mit dem EAS-Keystore signiert (Debug-Key?) — nicht ausrollen"
echo "  Signatur = EAS-Keystore ✓"

LIVE_VCODE=$(curl -fsS --max-time 20 "$SITE/api/download/android/meta" 2>/dev/null \
  | python3 -c "import json,sys; v=json.load(sys.stdin).get('versionCode'); print(v if v is not None else '')" 2>/dev/null || true)
if [ -n "$LIVE_VCODE" ]; then
  echo "  live: versionCode $LIVE_VCODE"
  if [ "$VCODE" -le "$LIVE_VCODE" ] && [ "${FORCE:-0}" != "1" ]; then
    die "versionCode $VCODE ist nicht höher als live ($LIVE_VCODE) — Android installiert das nicht als Update (FORCE=1 zum Erzwingen)"
  fi
else
  echo "  live-Version unbekannt (noch keine Sidecar-Datei) — versionCode-Prüfung übersprungen"
fi

echo "=== [2/4] Hochladen"
SHA=$(shasum -a 256 "$APK" | cut -d' ' -f1)
SIZE=$(stat -f%z "$APK")
META=$(mktemp)
python3 - "$META" <<EOF
import json, sys, datetime
json.dump({
    "version": "$VNAME",
    "versionCode": int("$VCODE"),
    "sha256": "$SHA",
    "sizeBytes": int("$SIZE"),
    "releasedAt": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "gitCommit": "$(git -C "$SRC" rev-parse --short HEAD 2>/dev/null || echo unknown)",
}, open(sys.argv[1], "w"))
EOF
scp "${SSH_OPTS[@]}" -q "$APK" "$SSH_HOST:/tmp/zaspot-android-upload.apk"
scp "${SSH_OPTS[@]}" -q "$META" "$SSH_HOST:/tmp/zaspot-android-upload.json"

echo "=== [3/4] Auf dem Server austauschen (alte APK bleibt als .prev)"
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "set -e
  docker cp -q /tmp/zaspot-android-upload.apk web:$REMOTE_DIR/zaspot-android.apk.new
  docker cp -q /tmp/zaspot-android-upload.json web:$REMOTE_DIR/zaspot-android.json.new
  docker exec -u 0 web sh -ec '
    cd $REMOTE_DIR
    echo \"$SHA  zaspot-android.apk.new\" | sha256sum -c - >/dev/null
    if [ -f zaspot-android.apk ]; then cp -p zaspot-android.apk zaspot-android.prev.apk; fi
    if [ -f zaspot-android.json ]; then cp -p zaspot-android.json zaspot-android.prev.json; else rm -f zaspot-android.prev.json; fi
    chmod 644 zaspot-android.apk.new zaspot-android.json.new
    mv zaspot-android.json.new zaspot-android.json
    mv zaspot-android.apk.new zaspot-android.apk
  '
  rm -f /tmp/zaspot-android-upload.apk /tmp/zaspot-android-upload.json"

echo "=== [4/4] Live prüfen"
LIVE_LEN=$(curl -sI --max-time 30 "$SITE/download/zaspot-android.apk" | tr -d '\r' \
  | awk 'tolower($1)=="content-length:"{print $2}')
[ "$LIVE_LEN" = "$SIZE" ] || die "Download liefert $LIVE_LEN Bytes, erwartet $SIZE — prüfen! (Rollback: $0 --rollback)"
echo "  $SITE/download/zaspot-android.apk → $SIZE Bytes ✓"
curl -fsS --max-time 20 "$SITE/api/download/android/meta" 2>/dev/null || echo "  (meta-Route noch nicht deployt)"
echo
echo "DONE: $VNAME (versionCode $VCODE) ist live. Rollback: $0 --rollback"
