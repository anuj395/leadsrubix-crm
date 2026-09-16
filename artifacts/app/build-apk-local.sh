#!/bin/bash
set -e

echo "=========================================="
echo "🚀 Building LeadsRubix CRM APK Locally"
echo "=========================================="

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

# Ensure local.properties has Android SDK path
ANDROID_SDK_PATH="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
if [ ! -f "$APP_DIR/android/local.properties" ]; then
  echo "sdk.dir=$ANDROID_SDK_PATH" > "$APP_DIR/android/local.properties"
fi

cd "$APP_DIR/android"

echo "⚡ Running Gradle assembleRelease (Local Build)..."
./gradlew assembleRelease

OUTPUT_APK="$APP_DIR/android/app/build/outputs/apk/release/app-release.apk"
DEST_APK="$APP_DIR/leadsrubix-crm-latest.apk"

if [ -f "$OUTPUT_APK" ]; then
  cp "$OUTPUT_APK" "$DEST_APK"
  echo "=========================================="
  echo "✅ APK Build Successful!"
  echo "📍 APK Location: $DEST_APK"
  echo "📱 Transfer it to your Android device to test."
  echo "=========================================="
else
  echo "❌ Could not find output APK at $OUTPUT_APK"
  exit 1
fi
