import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { FinanceProvider } from './context/FinanceContext';
import { FeedbackProvider } from './context/FeedbackContext';
import Layout from './components/Layout';

import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Accounts from './pages/Accounts';
import Categories from './pages/Categories';
import Insights from './pages/Insights';
import Settings from './pages/Settings';
import Bills from './pages/Bills';

import Lenis from 'lenis';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
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
      <FinanceProvider>
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
            </Route>
          </Routes>
        </BrowserRouter>
      </FinanceProvider>
    </FeedbackProvider>
  );
}

export default App;
