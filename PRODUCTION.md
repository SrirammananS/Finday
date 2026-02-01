# LAKSH Production Readiness Guide

This guide outlines the steps to deploy LAKSH for production and package it as an Isolated Web App (IWA).

## 1. Environment Setup
Create a `.env` file in the root directory based on `.env.example`:
```bash
VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
VITE_APP_NAME=LAKSH
VITE_APP_VERSION=1.0.32
IWA_DOMAIN=https://your-domain.web.app
```

## 2. Google Cloud Console Configuration
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create/Select a project.
3. Configure OAuth Consent Screen:
   - Add scopes: `.../auth/spreadsheets`, `.../auth/drive.file`, `.../auth/drive.readonly`.
4. Create OAuth 2.0 Client ID:
   - Application type: Web application.
   - Authorized JavaScript origins: `https://your-domain.web.app`, `http://localhost:5173`.
   - Authorized redirect URIs: `https://your-domain.web.app/oauth-callback`, `http://localhost:5173/oauth-callback`.

## 3. Building the PWA
Run the production build:
```bash
npm run build
```
This generates the `dist/` folder with optimized assets and Service Worker.

## 4. Deploying to Firebase (Optional)
LAKSH is pre-configured for Firebase Hosting.
```bash
firebase deploy
```

## 5. Packaging as Isolated Web App (IWA)
IWAs provide enhanced security and offline capabilities.
1. Generate a private key (first time only):
   ```bash
   openssl genpkey -algorithm RSA -out iwa/private-key.pem -pkeyopt rsa_keygen_bits:2048
   ```
2. Build the app and generate the signed web bundle:
   ```bash
   npm run build:iwa
   ```
3. The bundle will be available at `iwa/app.swbn`.

## 6. Testing the Sign-In
1. Clear browser cache/data.
2. Open the app.
3. Click "Sign in with Google".
4. Ensure the redirect flow works on both desktop and mobile.
5. Verify that "Finday Ledger" is created in your Google Drive.

## 7. Optimization Checklist
- [x] All heavy UI components are lazy-loaded.
- [x] Service Worker precaches critical assets.
- [x] Google API scripts pre-initialized to avoid gesture timeouts.
- [x] Biometric Auth (WebAuthn) enabled for PWA mode.
- [x] Strict CSP headers configured in `firebase.json`.
