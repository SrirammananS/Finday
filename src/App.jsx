import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { FinanceProvider } from './context/FinanceContext';
import { FeedbackProvider } from './context/FeedbackContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import SplashScreen from './components/SplashScreen';

import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Accounts from './pages/Accounts';
import Categories from './pages/Categories';
import Insights from './pages/Insights';
import Settings from './pages/Settings';
import Bills from './pages/Bills';
import Friends from './pages/Friends';

import Lenis from 'lenis';
import { AnimatePresence } from 'framer-motion';

function App() {
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const lenis = new Lenis();
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }, []);

  return (
    <FeedbackProvider>
      <ThemeProvider>
        <FinanceProvider>
          {loading ? (
            <SplashScreen onComplete={() => setLoading(false)} />
          ) : (
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="transactions" element={<Transactions />} />
                  <Route path="accounts" element={<Accounts />} />
                  <Route path="categories" element={<Categories />} />
                  <Route path="insights" element={<Insights />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="bills" element={<Bills />} />
                  <Route path="friends" element={<Friends />} />
                </Route>
              </Routes>
            </BrowserRouter>
          )}
        </FinanceProvider>
      </ThemeProvider>
    </FeedbackProvider>
  );
}

export default App;
