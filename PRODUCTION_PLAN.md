# Production-Ready Update Plan: LAKSH Finance v3.0

This plan outlines the steps to stabilize and upgrade the LAKSH application to a production-ready state, focusing on security, offline-first reliability, and unified mobile experiences.

## 1. Security & Telegram Cleanup
- **Requirement**: Remove non-functional Telegram bot trace and audit security.
- **Action**: 
  - Scan all files for `TELEGRAM_` and delete any trace. [DONE]
  - Review `.env` and `firebase.json` for orphaned secrets. [DONE]
  - Audit `crypto.randomUUID` usage to ensure it doesn't crash on older Android WebViews. [DONE]

## 2. Universal Mobile Support (Android, iOS, PWA)
- **Requirement**: Rebuild Android, create iOS & PWA with native feel.
- **Action**:
  - **PWA**: Enhance `manifest.json` and `vite-plugin-pwa` config for better standalone feel (iOS splash screens, theme color parity). [DONE]
  - **Android**: 
    - Fix SMS detection regex (add `sent` pattern). [DONE]
    - Improve WebView reliability (better error handling, SSL bypass for local testing). [DONE]
    - Fix potential background service crashes (SMS abuse prevention). [DONE]
  - **iOS**: Since native iOS setup is external, optimize PWA `index.html` with iOS-specific meta tags and icons to provide a "native" feel. [DONE]

## 3. Storage Migration & Guest Mode
- **Requirement**: Remove Google Drive/Sheets as primary storage. Implement local-only Guest Mode.
- **Action**:
  - **FinanceContext**: 
    - Decouple `isConnected` from `spreadsheetId`. [DONE]
    - Introduce `isGuest` state. [DONE]
    - If `isGuest`, skip all Google API initialization. [DONE]
  - **LocalDB**: Ensure IndexedDB is the primary source of truth for both Guest and Authenticated users (offline-first). [DONE]
  - **Cleanup**: Mark `sheets.js` and `cloudBackup.js` as optional or legacy, removed from the main flow. [DONE]

## 4. Guest Data Management (Backup/Import)
- **Requirement**: Allow Guest users to preserve data.
- **Action**:
  - Implement JSON Export: Generate a `.laksh` (JSON) backup file. [DONE]
  - Implement JSON Import: Allow uploading a `.laksh` file to restore IndexedDB. [DONE]
  - Add these controls to the Settings page. [DONE]

## 5. Billing Closure Logic
- **Requirement**: Mark periods as closed to prevent modification.
- **Action**:
  - Add `closedPeriods` store in IndexedDB. [DONE]
  - UI: Add "Close Month" button in Insights or Transactions page. [DONE]
  - Validation: Block `addTransaction` and `updateTransaction` if the transaction date falls within a closed period. [DONE]

## 6. SMS Parser & Detector Fixes
- **Requirement**: Fix "SMS not detected" and abuse issues.
- **Action**:
  - Update `smsParser.js` and `SmsParser.kt` with provided transaction patterns (e.g., `sent via UPI`). [DONE]
  - Add deduplication based on `(amount, date, merchant)` hash. [DONE]
  - Implement a `throttle` in `SmsReceiver.kt` to prevent system failures from spam. [DONE]

## 7. UI/UX Polishing
- **Requirement**: Improve Grid, Cubes, and responsiveness.
- **Action**:
  - Compact the Account grids on mobile. [DONE]
  - Optimize `DynamicIsland` for smaller screens. [DONE]
  - Enhance "Cubes" (Insight cards) with better contrast and spacing. [DONE]

---

## Task Progress Tracking
- [x] Remove Telegram code & verify security
- [x] Implement Guest Mode & storage decoupling
- [x] Add JSON Backup/Import
- [x] Update SMS Regex (JS & Kotlin)
- [x] Fix ID generation (randomUUID polyfill)
- [x] Implement Billing Closure logic
- [x] Mobile UI/UX audit & improvements
- [x] Build & Test PWA/Android/iOS compatibility
