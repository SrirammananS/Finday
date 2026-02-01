# LAKSH - Personal Finance Tracker

A modern, privacy-focused personal finance tracking PWA with **one-touch cloud backup**. Features end-to-end encrypted backups, biometric authentication, and a premium dark UI.

## 🆕 Version 3.0 - Major Updates

### One-Touch Cloud Backup (WhatsApp-style)
- **Single tap Google Sign-In** - No more manual OAuth Client ID entry
- **End-to-end encrypted backups** using AES-256-GCM with PBKDF2 key derivation
- **Automatic backups** after data changes + manual backup button
- **Privacy-preserving** - Data encrypted before leaving device; only you can decrypt

### Security Hardening
- **Secure PIN storage** - Migrated from Base64 to PBKDF2 hashing (100k iterations)
- **Security headers** - X-Content-Type-Options, X-Frame-Options, X-XSS-Protection
- **Device-bound encryption** - Backup keys derived from Google ID + device secret

### IWA Packaging Ready
- **Isolated Web App (IWA)** packaging guide and script
- No Android APK build chain required
- Runs as an installable Chrome app with isolation

---

# Technical Documentation

Finday is a modern, privacy-focused personal finance tracking application that uses **Google Sheets** as its primary database. It features a high-end, futuristic UI with glassmorphism effects, 3D elements, and smooth animations.

## 🛠 Technology Stack

### Core Framework
*   **[React](https://react.dev/)**: Component-based UI library.
*   **[Vite](https://vitejs.dev/)**: Next-generation frontend tooling for fast builds and HMR.
*   **[React Router](https://reactrouter.com/)**: Client-side routing.

### State Management & Data
*   **[Context API](https://react.dev/learn/passing-data-deeply-with-context)**: Used for global state management (`FinanceContext`, `ThemeContext`, `FeedbackContext`).
*   **[Google Sheets API](https://developers.google.com/sheets/api)**: Acts as the headless CMS/Database.
    *   **Raw Data Storage**: All transactions, accounts, and categories are stored in a simple Google Sheet.
    *   **Privacy**: User owns their data completeley. No external servers.

### Styling & Animation
*   **[Tailwind CSS](https://tailwindcss.com/)**: Utility-first CSS framework with a custom designated design system (`@theme`).
*   **[Framer Motion](https://www.framer.com/motion/)**: For complex layout transitions, entry animations, and micro-interactions.
*   **[GSAP (GreenSock)](https://gsap.com/)**: Used for high-performance complex animations (e.g., in `TransactionForm`).
*   **[Lenis](https://lenis.studio/)**: For silky smooth scroll smoothing.
*   **[Lucide React](https://lucide.dev/)**: Lovely, consistent SVG icons.

### Key Libraries
*   **[Recharts](https://recharts.org/)**: For financial data visualization (Pie charts, etc.).
*   **[date-fns](https://date-fns.org/)**: Robust date manipulation.
*   **[react-confetti](https://www.npmjs.com/package/react-confetti)**: For celebratory effects.

---

## 🧠 Core Logic & Data Flow

### 1. Initialization (`App.jsx` & `SplashScreen.jsx`)
*   **Flow**: App starts -> `SplashScreen` displays -> `FinanceContext` initializes.
*   **Logic**:
    *   The app checks for a valid Google Access Token.
    *   If token exists: It fetches data from the user's Google Sheet (`FinanceContext.jsx` - `fetchSheetData`).
    *   If token missing/invalid: It prompts the user to "Connect with Google".
    *   **Smart Parsing**: The app reads raw rows from sheets (`Transactions`, `Accounts`, `Categories`) and converts them into structured JSON objects.

### 2. The Data Engine (`FinanceContext.jsx`)
This is the heart of the application.
*   **Synchronization**:
    *   **Reads**: Fetches all sheets in parallel for speed.
    *   **Writes**: When a user adds a transaction, it optimistically updates the local UI *immediately* (for perceived speed) and then pushes the row to Google Sheets in the background.
*   **Formatting**: Handles currency formatting (INR ₹), date parsing, and grouping by categories.

### 3. Feature Logic

#### **Dashboard (`Dashboard.jsx`)**
*   **Aggregator**: computes `Total Net Worth`, `Monthly Income/Expense`, and `Recent Transactions` on the fly.
*   **Visuals**: Displays a spending breakdown pie chart.

#### **Transaction Form (`TransactionForm.jsx`)**
*   **Input**: Smart form with "Expense/Income" toggle.
*   **Voice Input**: Uses `webkitSpeechRecognition` to parse spoken amounts and descriptions (e.g., "500 rupees for lunch").
*   **Smart Bill Payment**:
    *   Context-aware: If "Expense" is selected, shows "Is this a Bill Payment?".
    *   Linking: Can link an expense to a specific **Recurring Subscription** or **Credit Card Bill**.
*   **Categories**: Horizontal scrollable list fetched dynamically from the sheet.

#### **Subscription Manager (`Bills.jsx`)**
*   **Logic**: Tracks recurring payments.
*   **View**: Toggle between **List View** and **Calendar View**.
*   **Insight**: Calculates "Total Monthly Fixed Cost".
*   **Add Subscription**: Writes to a specific `Recurring` sheet range.

#### **Friends & Debts (`Friends.jsx` & `Accounts.jsx`)**
*   **Logic**: Calculates who owes you vs. who you owe based on tagged transactions.
*   **Integration**:
    *   **Transactions**: You can tag a "Friend" in any transaction.
    *   **Summary**: A card in `Accounts` page summarizes total friends' debt status.

#### **Insights (`Insights.jsx`)**
*   **Analysis**: Provides deep dive analytics.
*   **Logic**: Filters data by Month/Year/Category without need for server-side processing.
*   **UI**: Bento-grid style layout for metrics.

---

## 🎨 Design System & UX

### **Theme Engine (`ThemeContext.jsx` & `index.css`)**
*   **Dark Mode First**: The app is built for a premium dark aesthetic (`#050505` bg).
*   **Dynamic Theme**:
    *   **Primary Color**: Toxic Lime (`#CCFF00`) for dark mode, Electric Violet for light mode.
    *   **Glassmorphism**: Heavy use of `backdrop-filter: blur()` and semi-transparent backgrounds for that "Apple Vision Pro" feel.

### **Mascot Integration**
*   A custom 3D Robot Mascot (generated via AI) acts as the branding face.
*   **Implementation**: Used in `SplashScreen` with `mix-blend-screen` to seamlessly blend into the dark UI, creating a holographic effect.

### **Dynamic Island Navigation (`DynamicIsland.jsx`)**
*   A floating bottom navigation bar mimicking the iOS Dynamic Island.
*   **Interaction**: Becomes the centralized hub for navigation and adding new transactions (`+` button).
*   **Glass Effect**: High-quality blur and shadow to separate it from content.

---

## 🚀 Deployment & Production

### Quick Start
```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env and add your VITE_GOOGLE_CLIENT_ID

# Development
npm run dev

# Production build
npm run build
```

### Setting Up Google OAuth Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google Drive API** and **Google Sheets API**
4. Go to **Credentials** → **Create Credentials** → **OAuth Client ID**
5. Choose **Web application**
6. Add authorized JavaScript origins:
   - `http://localhost:5173` (development)
   - `https://your-domain.com` (production)
7. Copy the Client ID to your `.env` file

### Isolated Web App (IWA) Build

```bash
# Make script executable
chmod +x scripts/build-iwa.sh

# Run IWA build scaffold
./scripts/build-iwa.sh
```

The script will:
1. Build the web application to `dist/`
2. Prepare `iwa/` directory and check for a signing key
3. Print the `gen-signed-web-bundle` command (install appropriate tooling)

See [iwa/README.md](iwa/README.md) for details.

### Hosting
- **Vercel/Netlify**: Deploy with zero configuration
- **Custom domain + HTTPS**: Mandatory for PWA/IWA functionality

---

## 🔒 Security Architecture

### Encryption Flow
```
User Data → JSON.stringify → AES-256-GCM Encrypt → Base64 → Google Drive
                                    ↑
                            PBKDF2 Key Derivation
                                    ↑
                    Google User ID + Device Secret
```

### Key Components
- **`src/services/crypto.js`** - PBKDF2/AES-GCM encryption utilities
- **`src/services/cloudBackup.js`** - Google Drive backup with E2E encryption
- **`src/services/biometricAuth.js`** - Secure PIN hashing with WebAuthn support

---

## 📁 Project Structure

```
src/
├── components/
│   ├── CloudBackupSection.jsx  # One-touch backup UI
│   ├── LockScreen.jsx          # Biometric/PIN authentication
│   └── ...
├── context/
│   ├── FinanceContext.jsx      # Main data management
│   └── ...
├── services/
│   ├── crypto.js               # E2E encryption utilities
│   ├── cloudBackup.js          # Google Drive backup service
│   ├── biometricAuth.js        # Secure authentication
│   ├── localDB.js              # IndexedDB offline cache
│   └── sheets.js               # Google Sheets API
└── pages/
    └── Settings.jsx            # Backup controls & settings
```

---

## 📱 Version History

### v3.0.0 (Current)
- One-touch cloud backup with E2E encryption
- Security hardening (PBKDF2 PIN hashing)
- IWA packaging scaffold (replacing TWA)
- Automatic backup scheduling

### v2.1.0
- PWA optimizations
- Offline-first with IndexedDB
- Biometric authentication

---
*LAKSH - Your finances, encrypted & private*
