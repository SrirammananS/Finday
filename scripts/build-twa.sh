#!/bin/bash
# LAKSH TWA APK Build Script

set -e

echo "🚀 LAKSH TWA APK Builder"
echo "========================"

# Step 1: Build the web app
echo "📦 Building web app..."
npm run build

# Step 1.5: Update Digital Asset Links automatically if keystore details are set
if [[ -n "$KEYSTORE_PATH" && -n "$KEYSTORE_ALIAS" && -n "$KEYSTORE_PASS" ]]; then
    echo "🔐 Updating assetlinks.json from keystore fingerprint..."
    npm run update:assetlinks -- \
        --keystore "$KEYSTORE_PATH" \
        --alias "$KEYSTORE_ALIAS" \
        --storepass "$KEYSTORE_PASS" \
        --assetlinks public/.well-known/assetlinks.json \
        --package "${ANDROID_PACKAGE:-com.laksh.finance}"
else
    echo "ℹ️  Skipping assetlinks.json auto-update (set KEYSTORE_PATH, KEYSTORE_ALIAS, KEYSTORE_PASS to enable)"
fi

# Step 2: Check if Bubblewrap CLI is installed
if ! command -v bubblewrap &> /dev/null; then
    echo "📥 Installing Bubblewrap CLI..."
    npm install -g @bubblewrap/cli
fi

# Step 3: Initialize TWA if not done
if [ ! -d "twa-output" ]; then
    echo "🔧 Initializing TWA project..."
    mkdir -p twa-output
    cd twa-output
    bubblewrap init --manifest ../twa-manifest.json
    cd ..
fi

# Step 4: Build APK
echo "🔨 Building APK..."
cd twa-output
bubblewrap build
cd ..

echo ""
echo "✅ APK built successfully!"
echo "📍 Location: twa-output/app-release-signed.apk"
