import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import SmartAnalytics from './components/SmartAnalytics';

import LockScreen from './components/LockScreen';
import ErrorBoundary from './components/ErrorBoundary';
import PendingTransactionsBadge from './components/PendingTransactionsBadge';
import { biometricAuth } from './services/biometricAuth';
import { transactionDetector } from './services/transactionDetector';
import { parseSMS, formatParsedTransaction } from './services/smsParser';
import { pendingTransactionsService } from './services/pendingTransactions';
import { useFinance } from './context/FinanceContext';
import { AnimatePresence } from 'framer-motion';

import { lazyWithRetry } from './utils/lazyRetry';

// Code splitting - lazy load pages for faster initial bundle
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));
const Transactions = lazyWithRetry(() => import('./pages/Transactions'));
const Accounts = lazyWithRetry(() => import('./pages/Accounts'));
const AccountDetail = lazyWithRetry(() => import('./pages/AccountDetail'));
const Categories = lazyWithRetry(() => import('./pages/Categories'));
const Insights = lazyWithRetry(() => import('./pages/Insights'));
const Settings = lazyWithRetry(() => import('./pages/Settings'));
const Bills = lazyWithRetry(() => import('./pages/Bills'));
const Friends = lazyWithRetry(() => import('./pages/Friends'));
const Welcome = lazyWithRetry(() => import('./pages/Welcome'));
const OAuthCallback = lazyWithRetry(() => import('./pages/OAuthCallback'));

import Lenis from 'lenis';
import { motion } from 'framer-motion';

import ScrollToTop from './components/ScrollToTop';
import TypeGPUBackground from './components/ui/TypeGPUBackground';
import AnimatedBackground from './components/ui/AnimatedBackground';

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

const GlobalLoading = () => {
  const { loadingStage, isLoading, error } = useFinance();
  const [forceHide, setForceHide] = useState(false);

  // Maximum display time - after 8 seconds, hide regardless of state
  useEffect(() => {
    const timeout = setTimeout(() => {
      console.log('[LAKSH] GlobalLoading max time reached, hiding overlay');
      setForceHide(true);
    }, 8000);
    return () => clearTimeout(timeout);
  }, []);

  // Hide conditions: 
  // 1. loadingStage is 'ready'
  // 2. isLoading from FinanceContext is false (data loaded or error handled)
  // 3. forceHide timeout triggered
  if (loadingStage === 'ready' || !isLoading || forceHide) return null;

  const messages = {
    'init': 'Initializing Secure Core...',
    'auth': 'Verifying Credentials...',
    'fetch': 'Decrypting Financial Data...',
    'error': 'Connection Failed'
  };

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-canvas/80 backdrop-blur-xl"
    >
      <div className="flex flex-col items-center gap-6 p-8 rounded-2xl bg-surface/50 border border-white/5 shadow-2xl">
        {loadingStage === 'error' ? (
          <div className="text-red-500 text-6xl mb-2">⚠️</div>
        ) : (
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            {messages[loadingStage] || 'Loading...'}
          </h2>
          {error && (
            <p className="text-sm text-red-400 max-w-xs px-4 py-2 bg-red-500/10 rounded-lg border border-red-500/20">
              {error}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};


function App() {
  const [isLocked, setIsLocked] = useState(false);

  const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  useEffect(() => {
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

  useEffect(() => {
    const handleSharedContent = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedText = urlParams.get('text') || urlParams.get('title') || '';

      if (sharedText && urlParams.get('share') === 'true') {
        const parsed = parseSMS(sharedText);
        if (parsed) {
          const transaction = formatParsedTransaction(parsed, []);
          if (transaction && !pendingTransactionsService.isDuplicate(transaction.amount, transaction.date)) {
            pendingTransactionsService.add(transaction);
          }
        }
        window.history.replaceState({}, '', window.location.pathname);
      }
    };

    handleSharedContent();
  }, []);

  // Listen for Android SMS notifications
  useEffect(() => {
    // Handle incoming SMS from Android bridge
    const handleAndroidSMS = (smsText) => {
      console.log('[LAKSH] Received SMS from Android:', smsText?.substring(0, 50));
      if (!smsText) return;

      const parsed = parseSMS(smsText);
      if (parsed) {
        const transaction = formatParsedTransaction(parsed, []);
        if (transaction && !pendingTransactionsService.isDuplicate(transaction.amount, transaction.date)) {
          transaction.source = 'sms_android';
          transaction.rawText = smsText;
          pendingTransactionsService.add(transaction);
          console.log('[LAKSH] Added pending transaction from Android SMS');
        }
      }
    };

    // Expose to global for Android bridge
    window.onNewSMS = handleAndroidSMS;
    window.handleSMS = handleAndroidSMS; // Alias

    // Also check for pending transactions from bridge on focus
    const handleFocus = () => {
      if (window.AndroidBridge && typeof window.AndroidBridge.getPendingTransactions === 'function') {
        try {
          const pendingJson = window.AndroidBridge.getPendingTransactions();
          if (pendingJson && pendingJson !== '[]') {
            const pending = JSON.parse(pendingJson);
            if (Array.isArray(pending) && pending.length > 0) {
              console.log('[LAKSH] Found pending transactions on focus:', pending.length);
              pending.forEach(txn => {
                if (txn.amount && !pendingTransactionsService.isDuplicate(Math.abs(txn.amount), txn.date || new Date().toISOString().split('T')[0])) {
                  pendingTransactionsService.add({
                    ...txn,
                    id: txn.id || `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    source: 'sms_android',
                  });
                }
              });
              // Clear after processing
              if (typeof window.AndroidBridge.clearPendingTransactions === 'function') {
                window.AndroidBridge.clearPendingTransactions();
              }
            }
          }
        } catch (e) {
          console.log('[LAKSH] Bridge check error:', e.message);
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    // Also check on visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        handleFocus();
      }
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
      delete window.onNewSMS;
      delete window.handleSMS;
    };
  }, []);

  const handleUnlock = () => {
    setIsLocked(false);
  };

  return (
    <ErrorBoundary>
      {/* Immersive Global Background (TypeGPU + Glass) */}
      <AnimatePresence mode="wait">
        {!isLocked && <GlobalLoading key="global-loader" />}
      </AnimatePresence>

      <TypeGPUBackground intensity="medium" />
      <div className="fixed inset-0 pointer-events-none z-0 mix-blend-overlay opacity-20">
        <AnimatedBackground variant="finance" intensity="low" />
      </div>


      {isLocked ? (
        <LockScreen onUnlock={handleUnlock} />
      ) : (
        <>
          <ScrollToTop />
          <PendingTransactionsBadge />
          <SmartAnalytics />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/welcome" element={<Welcome />} />
              <Route path="/oauth-callback" element={<OAuthCallback />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
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
        </>
      )}
    </ErrorBoundary>
  );
}


export default App;