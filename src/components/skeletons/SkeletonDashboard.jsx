import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cloud, Database, RefreshCw, CheckCircle, AlertCircle, Wifi } from 'lucide-react';

import { useFinance } from '../../context/FinanceContext';

const loadingSteps = [
    { id: 0, text: 'Checking credentials...', icon: Wifi },
    { id: 1, text: 'Loading local data...', icon: Database },
    { id: 2, text: 'Connecting to Google...', icon: Cloud },
    { id: 3, text: 'Fetching your data...', icon: RefreshCw },
    { id: 4, text: 'Ready!', icon: CheckCircle },
];

const SkeletonDashboard = () => {
    const { loadingStatus, isSyncing } = useFinance();

    // Fallback: animated progress when context not ready
    const [fallbackStep, setFallbackStep] = useState(0);
    const [fallbackProgress, setFallbackProgress] = useState(0);

    useEffect(() => {
        if (loadingStatus) return; // Don't run fallback if we have real status

        const stepInterval = setInterval(() => {
            setFallbackStep(prev => {
                if (prev < loadingSteps.length - 2) {
                    return prev + 1;
                }
                return prev;
            });
        }, 1500);

        const progressInterval = setInterval(() => {
            setFallbackProgress(prev => {
                if (prev < 85) {
                    return prev + Math.random() * 8;
                }
                return prev;
            });
        }, 400);

        return () => {
            clearInterval(stepInterval);
            clearInterval(progressInterval);
        };
    }, [loadingStatus]);

    // Use actual status from context, fallback to animated progress
    const currentStep = loadingStatus?.step ?? fallbackStep;
    const statusMessage = loadingStatus?.message || loadingSteps[fallbackStep]?.text || 'Loading...';
    const hasError = !!loadingStatus?.error;

    // Calculate progress based on actual step or fallback
    const progress = loadingStatus
        ? Math.min((currentStep / 4) * 100, 100)
        : fallbackProgress;

    const CurrentIcon = hasError ? AlertCircle : (loadingSteps[currentStep]?.icon || Cloud);

    return (
        <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6">
            {/* Main Loading Container */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center max-w-sm w-full"
            >
                {/* Logo/Icon */}
                <motion.div
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ repeat: Infinity, duration: 3 }}
                    className="relative w-24 h-24 mx-auto mb-8"
                >
                    <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                    <div className="relative w-24 h-24 rounded-3xl bg-card border border-card-border overflow-hidden shadow-2xl">
                        <img src="/mascot.png" alt="Laksh AI" className="w-full h-full object-cover" />
                    </div>

                    {/* Step Icon Badge */}
                    <motion.div
                        key={currentStep}
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className={`absolute -bottom-2 -right-2 w-10 h-10 rounded-xl flex items-center justify-center border shadow-xl z-20 ${hasError ? 'bg-rose-500 border-rose-400 text-white' : 'bg-primary border-primary/20 text-black'
                            }`}
                    >
                        <CurrentIcon size={20} className={isSyncing ? 'animate-spin' : ''} />
                    </motion.div>
                </motion.div>

                {/* App Name */}
                <h1 className="text-3xl font-black text-text-main mb-2 tracking-tight">LAKSH</h1>

                {/* Current Step - showing actual status */}
                <motion.p
                    key={statusMessage}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`text-sm mb-2 ${hasError ? 'text-red-400' : 'text-text-muted'}`}
                >
                    {statusMessage}
                </motion.p>

                {/* Error details if any */}
                {hasError && loadingStatus?.error && (
                    <p className="text-xs text-red-400/60 mb-6 max-w-xs mx-auto">
                        {loadingStatus.error}
                    </p>
                )}

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-card-border/30 rounded-full overflow-hidden mb-6 mt-4">
                    <motion.div
                        className={`h-full rounded-full ${hasError
                            ? 'bg-gradient-to-r from-red-500 to-red-400'
                            : 'bg-gradient-to-r from-primary to-primary/60'
                            }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ ease: 'easeOut', duration: 0.5 }}
                    />
                </div>

                {/* Step Indicators */}
                <div className="flex justify-center gap-2">
                    {loadingSteps.slice(0, 5).map((step, index) => (
                        <motion.div
                            key={step.id}
                            className={`w-2 h-2 rounded-full transition-colors duration-300 ${index <= currentStep
                                ? (hasError && index === currentStep ? 'bg-red-500' : 'bg-primary')
                                : 'bg-card-border/50'
                                }`}
                            animate={index === currentStep ? { scale: [1, 1.3, 1] } : {}}
                            transition={{ repeat: Infinity, duration: 1 }}
                        />
                    ))}
                </div>

                {/* Connection Status */}
                <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-text-muted/50">
                    <div className={`w-1.5 h-1.5 rounded-full ${hasError ? 'bg-red-500' : currentStep >= 2 ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
                        }`} />
                    <span>
                        {hasError ? 'Connection issue' : currentStep >= 3 ? 'Connected' : 'Connecting...'}
                    </span>
                </div>

                {/* Tip */}
                <p className="text-[10px] text-text-muted/50 mt-4">
                    {hasError
                        ? 'Check your internet connection and refresh'
                        : 'Syncing your financial data securely'
                    }
                </p>
            </motion.div>
        </div>
    );
};

export default SkeletonDashboard;
