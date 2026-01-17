import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, CloudOff, Loader2 } from 'lucide-react';

/**
 * Sync Status Indicator
 * Shows current sync state: 🟢 Synced / 🟡 Syncing / 🔴 Offline
 */
const SyncIndicator = () => {
    // Safely get context - may be null during initial render
    let isConnected = false;
    let isSyncing = false;

    try {
        const finance = useFinance();
        isConnected = finance?.isConnected ?? false;
        isSyncing = finance?.isSyncing ?? false;
    } catch (e) {
        // Context not available yet
    }

    const [isOnline, setIsOnline] = React.useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

    React.useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Determine status
    let status = 'offline';
    let color = 'bg-red-500';
    let Icon = CloudOff;
    let label = 'Offline';

    if (!isOnline) {
        status = 'offline';
        color = 'bg-red-500';
        Icon = CloudOff;
        label = 'Offline';
    } else if (isSyncing) {
        status = 'syncing';
        color = 'bg-yellow-500';
        Icon = Loader2;
        label = 'Syncing';
    } else if (isConnected) {
        status = 'synced';
        color = 'bg-green-500';
        Icon = Cloud;
        label = 'Synced';
    } else {
        status = 'disconnected';
        color = 'bg-gray-400';
        Icon = CloudOff;
        label = 'Not Connected';
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-card-border"
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={status}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="relative"
                >
                    <div className={`w-2 h-2 rounded-full ${color}`} />
                    {isSyncing && (
                        <motion.div
                            className={`absolute inset-0 w-2 h-2 rounded-full ${color}`}
                            animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                            transition={{ repeat: Infinity, duration: 1 }}
                        />
                    )}
                </motion.div>
            </AnimatePresence>
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                {label}
            </span>
            <Icon
                size={14}
                className={`text-text-muted ${isSyncing ? 'animate-spin' : ''}`}
            />
        </motion.div>
    );
};

export default SyncIndicator;
