import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SplashScreen = ({ onComplete }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onComplete();
        }, 3000);
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

                {/* Mascot - improved blending for black bg */}
                <motion.img
                    src="/mascot.png"
                    alt="FinDay Mascot"
                    className="w-56 h-56 md:w-72 md:h-72 object-contain relative z-10 drop-shadow-2xl mix-blend-screen"
                    initial={{ scale: 0.8, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{
                        duration: 1.2,
                        type: "spring",
                        bounce: 0.5
                    }}
                />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="mt-8 text-center"
            >
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-main mb-2">
                    FinDay<span className="text-primary">.</span>
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
