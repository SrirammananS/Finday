# Finday - Personal Finance Tracker

A modern, privacy-focused personal finance tracking application that uses **Google Sheets** as its primary database. It features a high-end, futuristic UI with glassmorphism effects, 3D elements, and smooth animations.

[... original readme content stripped for brevity, replacing with full walkthrough ...]

# Finday - Technical Walkthrough & Documentation

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
*   **Build**: `vite build` produces a static SPA.
*   **Manifest**: Includes `manifest.webmanifest` for PWA installation (Add to Home Screen).
*   **Hosting**: Can be hosted on any static host (Vercel, Netlify, GitHub Pages) since the backend is just Google Sheets API calls directly from the client.

---
*Documentation generated by Antigravity*
