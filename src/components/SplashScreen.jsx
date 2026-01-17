import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SplashScreen = ({ onComplete }) => {
    useEffect(() => {
        // Check if session is cached - skip long splash animation
        const hasCachedSession = localStorage.getItem('finday_gapi_token') &&
            localStorage.getItem('finday_spreadsheet_id');

        const timer = setTimeout(() => {
            onComplete();
        }, hasCachedSession ? 800 : 2500); // Faster for returning users

        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <motion.div
            className="fixed inset-0 z-[99999] bg-canvas flex flex-col items-center justify-center overflow-hidden"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
        >
            <div className="relative">
                {/* Glow Effect */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/20 rounded-full blur-[100px] animate-pulse-slow" />

                {/* Mascot with backdrop for light mode visibility */}
                <div className="relative z-10 w-56 h-56 md:w-72 md:h-72 flex items-center justify-center">
                    {/* Dark backdrop to make mascot visible in Light Mode (since mascot has black bg) */}
                    <div className="absolute inset-4 rounded-full bg-black/20 blur-xl dark:opacity-0 transition-opacity duration-500" />

                    <motion.img
                        src="/mascot.png"
                        alt="FinDay Mascot"
                        className="w-full h-full object-cover rounded-full relative z-20 drop-shadow-2xl"
                        initial={{ scale: 0.8, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        transition={{
                            duration: 1.2,
                            type: "spring",
                            bounce: 0.5
                        }}
                    />
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="mt-8 text-center"
            >
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-main mb-2">
                    LAKSH<span className="text-primary">.</span>
                </h1>
                <div className="h-1 w-32 bg-card-border rounded-full mx-auto overflow-hidden">
                    <motion.div
                        className="h-full bg-primary"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 2, ease: "easeInOut", delay: 1 }}
                    />
                </div>
            </motion.div>
        </motion.div>
    );
};

export default SplashScreen;
