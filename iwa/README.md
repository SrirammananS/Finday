# Isolated Web App (IWA) Packaging

This project is moving away from Trusted Web Activity (TWA) APKs to Isolated Web Apps (IWA). IWAs run as installable Chrome apps with enhanced isolation and security, without requiring a separate Android APK.

## Why IWA
- Strong process isolation and tighter security boundaries
- One packaging step for web + app, no Android build chain
- Works across platforms where Chrome supports IWA

## Prerequisites
- HTTPS origin (e.g., https://finma-ea199.web.app)
- Chrome with Isolated Web Apps enabled (stable on recent Chrome versions; enterprise policies may apply)
- A signing key for the web bundle

## Build Steps
1. Build the web app:
   ```bash
   npm run build
   ```
2. Generate a Signed Web Bundle (SWBN) from `dist/` using your preferred tooling (examples vary by environment):
   - Using gen-signed-web-bundle (Chromium tool):
     ```bash
     gen-signed-web-bundle \
       --private-key ./iwa/private-key.pem \
       --domain https://finma-ea199.web.app \
       --output ./iwa/app.swbn \
       ./dist
     ```
   - Or use a compatible bundling/signing tool that outputs `.swbn`.
3. Host the `.swbn` and follow Chrome IWA installation instructions (varies by platform).
   - Developers can install via a command-line flag or dev UI; production distribution typically relies on enterprise or store policies.

## Notes
- TWA assets are deprecated; the APK build script is removed from active use.
- The app’s PWA manifest remains; IWA packaging does not require code changes beyond bundling.
- OAuth in WebView is no longer needed; sign-in occurs in Chrome as part of the IWA context.

