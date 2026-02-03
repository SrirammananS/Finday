import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import SkeletonDashboard from './skeletons/SkeletonDashboard';

const ProtectedRoute = ({ children }) => {
    const { isConnected, isLoading } = useFinance();
    const location = useLocation();
    const [waitTimeout, setWaitTimeout] = useState(false);
    const [hasCheckedStorage, setHasCheckedStorage] = useState(false);

    // Check localStorage for credentials immediately
    const checkStorage = () => {
        const hasSpreadsheetId = localStorage.getItem('laksh_spreadsheet_id') ||
            localStorage.getItem('finday_spreadsheet_id');
        const hasToken = localStorage.getItem('google_access_token');
        const isGuestMode = localStorage.getItem('laksh_guest_mode') === 'true';
        const everConnected = localStorage.getItem('laksh_ever_connected') === 'true';

        return (hasSpreadsheetId && hasToken) || isGuestMode || (everConnected && hasSpreadsheetId);
    };

    // Immediate check on mount
    useEffect(() => {
        setHasCheckedStorage(checkStorage());
    }, []);

    // Add a timeout to prevent infinite loading
    useEffect(() => {
        const timeout = setTimeout(() => {
            setWaitTimeout(true);
        }, 5000); // 5 second max wait (reduced from 8)

        return () => clearTimeout(timeout);
    }, []);

    // PRIORITY 1: If we have valid credentials in storage, proceed immediately
    // This handles the case right after sheet selection
    if (checkStorage() && !isLoading) {
        console.log('[ProtectedRoute] Valid credentials found in storage, proceeding');
        return children;
    }

    // PRIORITY 2: If context says connected, proceed
    if (isConnected && !isLoading) {
        return children;
    }

    // PRIORITY 3: While loading, show skeleton (but check storage first)
    if (isLoading && !waitTimeout) {
        // Even while loading, if we have storage credentials, show children
        if (hasCheckedStorage) {
            console.log('[ProtectedRoute] Loading but has credentials, showing content');
            return children;
        }
        return <SkeletonDashboard />;
    }

    // PRIORITY 4: Timeout reached - final check
    if (waitTimeout) {
        if (checkStorage()) {
            console.log('[ProtectedRoute] Timeout reached, proceeding with cached credentials');
            return children;
        }
    }

    // No valid session - redirect to welcome
    if (!isConnected && !isLoading) {
        console.log('[ProtectedRoute] No valid session, redirecting to welcome');
        return <Navigate to="/welcome" state={{ from: location }} replace />;
    }

    // Default: show skeleton while determining
    return <SkeletonDashboard />;
};

export default ProtectedRoute;
