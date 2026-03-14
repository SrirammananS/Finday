import React, { useState, useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DynamicIsland from './DynamicIsland';
import GlobalSyncOverlay from './GlobalSyncOverlay';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import TransactionForm from './TransactionForm';
import SMSManager from './SMSManager';
import EmojiBurst from './ui/EmojiBurst';

const Layout = () => {
    const [showTransactionForm, setShowTransactionForm] = useState(false);
    const [showSMSModal, setShowSMSModal] = useState(false);
    const welcomeFired = useRef(false);

    useEffect(() => {
        if (welcomeFired.current) return;
        welcomeFired.current = true;
        const t = setTimeout(() => {
            window.dispatchEvent(new CustomEvent('welcome-burst'));
        }, 700);
        return () => clearTimeout(t);
    }, []);

    return (
        <div className="bg-canvas min-h-screen text-text-main overflow-hidden selection:bg-primary selection:text-primary-foreground transition-colors duration-500 relative">
            <GlobalSyncOverlay />

            {/* 3-Panel Shell: Fixed Left | Scrollable Center | Fixed Right */}
            <div className="flex h-screen w-full">
                {/* LEFT SIDEBAR - Fixed, prominent border */}
                <LeftSidebar />

                {/* CENTER - Scrollable (left/right in sidebars). Native scroll - no Lenis. */}
                <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden pb-nav overscroll-contain scroll-smooth" style={{ WebkitOverflowScrolling: 'touch' }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={window.location.pathname}
                            initial={{ opacity: 0, scale: 0.99, filter: 'blur(5px)' }}
                            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, scale: 1.01, filter: 'blur(5px)' }}
                            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                            className="relative z-10"
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </main>

                {/* RIGHT SIDEBAR - Fixed, prominent border */}
                <RightSidebar />
            </div>

            {/* Global Dynamic Hub */}
            <DynamicIsland />

            {/* Modals */}
            <AnimatePresence>
                {showTransactionForm && <TransactionForm onClose={() => setShowTransactionForm(false)} />}
            </AnimatePresence>
            <AnimatePresence>
                {showSMSModal && <SMSManager isOpen={showSMSModal} onClose={() => setShowSMSModal(false)} />}
            </AnimatePresence>

            {/* Emoji burst effect on transaction save */}
            <EmojiBurst />

            {/* Version - sits above DynamicIsland on mobile */}
            <footer className="fixed bottom-14 right-4 z-40 text-[10px] text-text-muted/40 font-mono pointer-events-none md:bottom-4 md:z-[999] md:text-text-muted/50">
                v{import.meta.env.VITE_APP_VERSION}
            </footer>
        </div>
    );
};

export default Layout;
