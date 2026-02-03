import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Cloud, AlertTriangle, RefreshCw } from 'lucide-react';

const GlobalSyncOverlay = () => {
    let isSyncing = false;
    let loadingStatus = { message: 'Syncing...' };

    try {
        const finance = useFinance();
        isSyncing = finance?.isSyncing ?? false;
        loadingStatus = finance?.loadingStatus ?? { message: 'Syncing...' };
    } catch (e) {
        // Context not ready
    }

    return (
        <AnimatePresence>
            {isSyncing && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 50, scale: 0.9 }}
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                    className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[10000] pointer-events-none"
                >
                    <div className="bg-[#050505]/90 backdrop-blur-2xl border border-primary/20 p-5 pr-8 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] flex items-center gap-5 min-w-[320px]">
                        <div className="relative flex items-center justify-center w-12 h-12">
                            <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                            <div className="absolute inset-0 rounded-full border-2 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                            <RefreshCw size={18} className="text-primary animate-pulse" />
                        </div>

                        <div className="flex flex-col gap-1">
                            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(var(--primary-rgb),0.8)]" />
                                Syncing with Cloud
                            </h3>
                            <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">
                                {loadingStatus?.message || 'Updating Ledger...'}
                            </p>
                            <p className="text-[9px] text-rose-400 font-black uppercase tracking-[0.2em] mt-1 flex items-center gap-1">
                                <AlertTriangle size={10} />
                                DO NOT CLOSE APP
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default GlobalSyncOverlay;
