import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DynamicIsland from './DynamicIsland';
import SyncIndicator from './SyncIndicator';
import GlobalSyncOverlay from './GlobalSyncOverlay';
import ConnectionStatus from './ConnectionStatus';
import { useTheme } from '../context/ThemeContext';
import { useFinance } from '../context/FinanceContext';

import TypeGPUBackground from './ui/TypeGPUBackground';
import AnimatedBackground, { GrainOverlay } from './ui/AnimatedBackground';

const Layout = () => {
    const { forceRefresh } = useFinance();

    return (
        <div className="bg-canvas min-h-screen text-text-main overflow-hidden selection:bg-primary selection:text-primary-foreground transition-colors duration-500 relative">
            {/* Sync Status - Removed (Handled by ConnectionButton) */}
            {/* <div className="fixed top-4 right-4 z-50">
                <SyncIndicator />
            </div> */}

            {/* Connection Status moved to Dashboard Header */}
            {/* <ConnectionStatus onRefresh={forceRefresh} /> */}

            {/* Global Sync Overlay */}
            <GlobalSyncOverlay />

            {/* Background moved to App.jsx for global consistency */}

            <main className="relative z-10 w-full min-h-screen">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={window.location.pathname}
                        initial={{ opacity: 0, scale: 0.99, filter: 'blur(5px)' }}
                        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, scale: 1.01, filter: 'blur(5px)' }}
                        transition={{
                            duration: 0.4,
                            ease: [0.23, 1, 0.32, 1] // Ease Spring
                        }}
                    >
                        <Outlet />
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Global Dynamic Hub */}
            <DynamicIsland />

            {/* Footer with Version */}
            <footer className="fixed bottom-4 right-4 z-50 text-xs text-text-muted/50 font-mono">
                v{import.meta.env.VITE_APP_VERSION}
            </footer>
        </div>
    );
};

export default Layout;
