#!/bin/bash
# LAKSH - One-shot build and deploy (no prompts)
set -e
cd "$(dirname "$0")/.."

echo "🚀 Building web app..."
npm run build

echo ""
echo "📦 Deploying to Firebase..."
firebase deploy --only hosting

echo ""
echo "📱 Building Android APK..."
cd android-app
chmod +x ./gradlew
./gradlew assembleDebug

APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_PATH" ]; then
  cp "$APK_PATH" "../LAKSH-Finance-$(date +%Y%m%d).apk"
  echo ""
  echo "✅ APK: $(pwd)/$APK_PATH"
  echo "✅ Copied: ../LAKSH-Finance-$(date +%Y%m%d).apk"
fi

echo ""
echo "✅ All done!"
