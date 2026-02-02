import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cloud, Database, RefreshCw, CheckCircle } from 'lucide-react';

const loadingSteps = [
    { id: 1, text: 'Connecting to Google...', icon: Cloud },
    { id: 2, text: 'Loading your accounts...', icon: Database },
    { id: 3, text: 'Fetching transactions...', icon: RefreshCw },
    { id: 4, text: 'Almost ready...', icon: CheckCircle },
];

const SkeletonDashboard = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Animate through steps
        const stepInterval = setInterval(() => {
            setCurrentStep(prev => {
                if (prev < loadingSteps.length - 1) {
                    return prev + 1;
                }
                return prev;
            });
        }, 1500);

        // Animate progress bar
        const progressInterval = setInterval(() => {
            setProgress(prev => {
                if (prev < 90) {
                    return prev + Math.random() * 10;
                }
                return prev;
            });
        }, 500);

        return () => {
            clearInterval(stepInterval);
            clearInterval(progressInterval);
        };
    }, []);

    const CurrentIcon = loadingSteps[currentStep]?.icon || Cloud;

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
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="w-20 h-20 mx-auto mb-8 bg-primary/10 rounded-full flex items-center justify-center"
                >
                    <motion.div
                        key={currentStep}
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', damping: 15 }}
                    >
                        <CurrentIcon size={32} className="text-primary" />
                    </motion.div>
                </motion.div>

                {/* App Name */}
                <h1 className="text-3xl font-black text-text-main mb-2 tracking-tight">LAKSH</h1>

                {/* Current Step */}
                <motion.p
                    key={currentStep}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-text-muted mb-8"
                >
                    {loadingSteps[currentStep]?.text}
                </motion.p>

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-card-border/30 rounded-full overflow-hidden mb-6">
                    <motion.div
                        className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(progress, 95)}%` }}
                        transition={{ ease: 'easeOut' }}
                    />
                </div>

                {/* Step Indicators */}
                <div className="flex justify-center gap-2">
                    {loadingSteps.map((step, index) => (
                        <motion.div
                            key={step.id}
                            className={`w-2 h-2 rounded-full transition-colors duration-300 ${index <= currentStep ? 'bg-primary' : 'bg-card-border/50'
                                }`}
                            animate={index === currentStep ? { scale: [1, 1.3, 1] } : {}}
                            transition={{ repeat: Infinity, duration: 1 }}
                        />
                    ))}
                </div>

                {/* Tip */}
                <p className="text-[10px] text-text-muted/50 mt-8">
                    Syncing your financial data securely
                </p>
            </motion.div>
        </div>
    );
};

export default SkeletonDashboard;
