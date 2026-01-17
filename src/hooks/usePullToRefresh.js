import { useState, useCallback, useRef } from 'react';

/**
 * Pull-to-Refresh Hook
 * Provides touch gesture detection for mobile pull-to-refresh
 */
export const usePullToRefresh = (onRefresh, { threshold = 80, disabled = false } = {}) => {
    const [isPulling, setIsPulling] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const startY = useRef(0);
    const currentY = useRef(0);

    const handleTouchStart = useCallback((e) => {
        if (disabled || isRefreshing) return;

        // Only trigger at top of scroll
        if (window.scrollY === 0) {
            startY.current = e.touches[0].clientY;
            setIsPulling(true);
        }
    }, [disabled, isRefreshing]);

    const handleTouchMove = useCallback((e) => {
        if (!isPulling || disabled || isRefreshing) return;

        currentY.current = e.touches[0].clientY;
        const distance = Math.max(0, currentY.current - startY.current);

        // Apply resistance for over-pull
        const resistedDistance = Math.min(distance * 0.5, threshold * 1.5);
        setPullDistance(resistedDistance);
    }, [isPulling, disabled, isRefreshing, threshold]);

    const handleTouchEnd = useCallback(async () => {
        if (!isPulling || disabled) return;

        if (pullDistance >= threshold && onRefresh) {
            setIsRefreshing(true);
            setPullDistance(threshold); // Keep at threshold during refresh

            try {
                await onRefresh();
            } finally {
                setIsRefreshing(false);
            }
        }

        setIsPulling(false);
        setPullDistance(0);
        startY.current = 0;
        currentY.current = 0;
    }, [isPulling, pullDistance, threshold, onRefresh, disabled]);

    const pullProgress = Math.min(pullDistance / threshold, 1);
    const shouldTrigger = pullDistance >= threshold;

    return {
        handlers: {
            onTouchStart: handleTouchStart,
            onTouchMove: handleTouchMove,
            onTouchEnd: handleTouchEnd,
        },
        isPulling,
        isRefreshing,
        pullDistance,
        pullProgress,
        shouldTrigger,
    };
};

export default usePullToRefresh;
