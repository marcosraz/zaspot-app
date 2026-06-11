#!/bin/bash
# Build-Copy-Rebuild für zaspot-app Android APK (universal, alle 4 ABIs).
# Workaround für reanimated 4.1.6 ↔ worklets Pfad-Mismatch:
# Pass 1 baut libworklets.so unter intermediates/cxx/..., reanimated importiert
# aber aus intermediates/cmake/release/obj/<abi>/ → kopieren → Pass 2 linkt.
set -uo pipefail

export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export ANDROID_NDK_HOME="$ANDROID_HOME/ndk/27.1.12297006"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
# IMMER universal — arm64-only ließ sich nicht installieren (User-Vorgabe 03.06.2026)
export ORG_GRADLE_PROJECT_reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64

SRC=/Users/mara/Websites/zaspot/zaspot-app
WORK=/tmp/zaspot-bcr-build

echo "=== [1/6] Frische Projektkopie nach $WORK"
rm -rf "$WORK"
mkdir -p "$WORK"
rsync -a --exclude node_modules --exclude .git --exclude android --exclude ios \
      --exclude logs --exclude .claude --exclude .expo "$SRC/" "$WORK/"

cd "$WORK"
echo "=== [2/6] npm ci"
npm ci --no-audit --no-fund > /tmp/zaspot_bcr_npm.log 2>&1 || { echo "npm ci FAILED"; tail -20 /tmp/zaspot_bcr_npm.log; exit 1; }

echo "=== [3/6] expo prebuild (android)"
npx expo prebuild --platform android --no-install > /tmp/zaspot_bcr_prebuild.log 2>&1 || { echo "prebuild FAILED"; tail -20 /tmp/zaspot_bcr_prebuild.log; exit 1; }

cd android
echo "=== [4/6] Gradle Pass 1 (erwarteter Fail bei reanimated/libworklets)"
./gradlew :app:assembleRelease -x lint > /tmp/zaspot_bcr_pass1.log 2>&1 || true
tail -3 /tmp/zaspot_bcr_pass1.log

echo "=== [5/6] libworklets.so in cmake-Pfad kopieren (alle ABIs)"
WORKLETS="$WORK/node_modules/react-native-worklets/android/build/intermediates"
FAIL=0
for abi in armeabi-v7a arm64-v8a x86 x86_64; do
  src=$(find "$WORKLETS/cxx" -path "*obj/$abi/libworklets.so" 2>/dev/null | head -1)
  if [ -n "$src" ]; then
    mkdir -p "$WORKLETS/cmake/release/obj/$abi"
    cp "$src" "$WORKLETS/cmake/release/obj/$abi/"
    echo "  copied $abi"
  else
    echo "  MISSING $abi"
    FAIL=1
  fi
done
[ "$FAIL" = "1" ] && { echo "Worklets-Libs unvollständig — Abbruch"; exit 1; }

echo "=== [6/6] Gradle Pass 2 (final)"
./gradlew :app:assembleRelease -x lint > /tmp/zaspot_bcr_pass2.log 2>&1 || { echo "Pass 2 FAILED"; tail -30 /tmp/zaspot_bcr_pass2.log; exit 1; }

APK="$WORK/android/app/build/outputs/apk/release/app-release.apk"
ts=$(date +%Y%m%d-%H%M)
OUT="$HOME/Downloads/zaspot-app-$ts.apk"
cp "$APK" "$OUT"

echo "=== [7/7] Mit EAS-Keystore nachsignieren (Google-Login braucht registrierte SHA-1)"
CREDS="$SRC/credentials.json"
KS="$SRC/credentials/android/keystore.jks"
if [ -f "$CREDS" ] && [ -f "$KS" ]; then
  ALIAS=$(python3 -c "import json; print(json.load(open('$CREDS'))['android']['keystore']['keyAlias'])")
  SPASS=$(python3 -c "import json; print(json.load(open('$CREDS'))['android']['keystore']['keystorePassword'])")
  KPASS=$(python3 -c "import json; print(json.load(open('$CREDS'))['android']['keystore']['keyPassword'])")
  APKSIGNER=$(ls "$ANDROID_HOME"/build-tools/*/apksigner 2>/dev/null | sort -V | tail -1)
  "$APKSIGNER" sign --ks "$KS" --ks-key-alias "$ALIAS" \
    --ks-pass "pass:$SPASS" --key-pass "pass:$KPASS" "$OUT"
  "$APKSIGNER" verify --print-certs "$OUT" | grep "SHA-1" | head -1
  echo "  signiert mit EAS-Keystore ✓ (Google Sign-In funktioniert im Sideload)"
else
  echo "  ⚠️  credentials.json/keystore.jks fehlen — APK bleibt DEBUG-signiert (kein Google-Login!)"
fi

ls -lh "$OUT"
echo "DONE: $OUT"
