import React from 'react';
import { motion } from 'framer-motion';

/**
 * Unified page layout wrapper - ensures consistent padding, max-width, and spacing
 * across all tabs (Dashboard, Transactions, Accounts, Bills, Settings, etc.)
 */
const PageLayout = ({ children, className = '', maxWidth = 'max-w-5xl' }) => {
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`page-layout relative px-4 py-6 md:px-6 md:py-8 mx-auto pb-nav min-h-screen ${maxWidth} ${className}`}
    >
      {children}
    </motion.main>
  );
};

export default PageLayout;
