import React, { useState, useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { FinanceProvider } from './context/FinanceContext';
import { FeedbackProvider } from './context/FeedbackContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import SplashScreen from './components/SplashScreen';
import LockScreen from './components/LockScreen';
import ErrorBoundary from './components/ErrorBoundary';
import { biometricAuth } from './services/biometricAuth';

// Code splitting - lazy load pages for faster initial bundle
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Transactions = React.lazy(() => import('./pages/Transactions'));
const Accounts = React.lazy(() => import('./pages/Accounts'));
const AccountDetail = React.lazy(() => import('./pages/AccountDetail'));
const Categories = React.lazy(() => import('./pages/Categories'));
const Insights = React.lazy(() => import('./pages/Insights'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Bills = React.lazy(() => import('./pages/Bills'));
const Friends = React.lazy(() => import('./pages/Friends'));

import Lenis from 'lenis';
import { AnimatePresence, motion } from 'framer-motion';

import ScrollToTop from './components/ScrollToTop';

// Loading fallback for lazy-loaded pages
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-canvas">
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-4"
    >
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-bold uppercase tracking-widest text-text-muted">Loading</span>
    </motion.div>
  </div>
);

function App() {
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);

  // Detect if running as PWA (standalone mode)
  const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  useEffect(() => {
    // Only apply lock when running as PWA, not in browser
    if (isPWA && biometricAuth.isLockEnabled()) {
      setIsLocked(true);
    }
  }, [isPWA]);

  useEffect(() => {
    const lenis = new Lenis();
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }, []);

  const handleUnlock = () => {
    setIsLocked(false);
  };

  return (
    <ErrorBoundary>
      <FeedbackProvider>
        <ThemeProvider>
          <FinanceProvider>
            {loading ? (
              <SplashScreen onComplete={() => setLoading(false)} />
            ) : isLocked ? (
              <LockScreen onUnlock={handleUnlock} />
            ) : (
              <BrowserRouter>
                <ScrollToTop />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Layout />}>
                      <Route index element={<Dashboard />} />
                      <Route path="transactions" element={<Transactions />} />
                      <Route path="accounts" element={<Accounts />} />
                      <Route path="accounts/:accountId" element={<AccountDetail />} />
                      <Route path="categories" element={<Categories />} />
                      <Route path="insights" element={<Insights />} />
                      <Route path="settings" element={<Settings />} />
                      <Route path="bills" element={<Bills />} />
                      <Route path="friends" element={<Friends />} />
                    </Route>
                  </Routes>
                </Suspense>
              </BrowserRouter>
            )}
          </FinanceProvider>
        </ThemeProvider>
      </FeedbackProvider>
    </ErrorBoundary>
  );
}

export default App;
