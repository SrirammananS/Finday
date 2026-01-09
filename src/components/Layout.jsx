import React from 'react';
import { Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DynamicIsland from './DynamicIsland';
import { useTheme } from '../context/ThemeContext';

const Layout = () => {
    return (
        <div className="bg-canvas min-h-screen text-text-main overflow-hidden selection:bg-primary selection:text-primary-foreground transition-colors duration-500">
            {/* Immersive Background Elements */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] transition-colors duration-500" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] transition-colors duration-500" />
            </div>

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
        </div>
    );
};

export default Layout;
