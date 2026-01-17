import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import usePullToRefresh from '../hooks/usePullToRefresh';

/**
 * Pull-to-Refresh Wrapper Component
 * Wraps content and provides pull-to-refresh gesture
 */
const PullToRefresh = ({ children, onRefresh, disabled = false }) => {
    const {
        handlers,
        isPulling,
        isRefreshing,
        pullProgress,
        shouldTrigger,
    } = usePullToRefresh(onRefresh, { disabled });

    return (
        <div {...handlers} className="relative">
            {/* Pull Indicator */}
            <AnimatePresence>
                {(isPulling || isRefreshing) && (
                    <motion.div
                        initial={{ opacity: 0, y: -40 }}
                        animate={{
                            opacity: 1,
                            y: 0,
                            scale: shouldTrigger ? 1 : pullProgress
                        }}
                        exit={{ opacity: 0, y: -40 }}
                        className="absolute left-1/2 -translate-x-1/2 z-50 -top-2"
                        style={{ top: `${Math.min(pullProgress * 60, 60)}px` }}
                    >
                        <div className={`
                            w-10 h-10 rounded-full 
                            flex items-center justify-center
                            bg-card border border-card-border shadow-lg
                            ${shouldTrigger ? 'bg-primary border-primary' : ''}
                        `}>
                            <RefreshCw
                                size={18}
                                className={`
                                    transition-colors
                                    ${shouldTrigger ? 'text-primary-foreground' : 'text-text-muted'}
                                    ${isRefreshing ? 'animate-spin' : ''}
                                `}
                                style={{
                                    transform: isRefreshing ? 'none' : `rotate(${pullProgress * 360}deg)`
                                }}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Content */}
            <motion.div
                animate={{
                    y: isPulling ? pullProgress * 30 : 0
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
                {children}
            </motion.div>
        </div>
    );
};

export default PullToRefresh;
