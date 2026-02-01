#!/usr/bin/env bash
set -euo pipefail

# Build an Isolated Web App (IWA) signed web bundle
# This script is a scaffold; install a suitable bundling/signing tool as needed.

APP_DIR="$(cd "$(dirname "$0")"/.. && pwd)"
DIST_DIR="$APP_DIR/dist"
IWA_DIR="$APP_DIR/iwa"
OUT_BUNDLE="$IWA_DIR/app.swbn"
DOMAIN="https://finma-ea199.web.app"
KEY_FILE="$IWA_DIR/private-key.pem"

mkdir -p "$IWA_DIR"

echo "[IWA] Building web app..."
cd "$APP_DIR"
npm run build

if [[ ! -f "$KEY_FILE" ]]; then
  echo "[IWA] No private key found at $KEY_FILE"
  echo "[IWA] Generate a private key (example only):"
  echo "    openssl genpkey -algorithm RSA -out $KEY_FILE -pkeyopt rsa_keygen_bits:2048"
fi

echo "[IWA] Bundling and signing (placeholder command):"
echo "    gen-signed-web-bundle --private-key $KEY_FILE --domain $DOMAIN --output $OUT_BUNDLE $DIST_DIR"

echo "[IWA] NOTE: Install or configure an appropriate tool to generate .swbn."
echo "[IWA] Output bundle (expected): $OUT_BUNDLE"
