import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import SkeletonDashboard from './skeletons/SkeletonDashboard';

const ProtectedRoute = ({ children }) => {
    const { isConnected, isLoading } = useFinance();
    const location = useLocation();
    const [waitTimeout, setWaitTimeout] = useState(false);

    // Add a timeout to prevent infinite loading
    useEffect(() => {
        const timeout = setTimeout(() => {
            setWaitTimeout(true);
        }, 8000); // 8 second max wait

        return () => clearTimeout(timeout);
    }, []);

    // While the connection status is being determined, show a loader
    // But only for a maximum of 8 seconds
    if (isLoading && !waitTimeout) {
        return <SkeletonDashboard />;
    }

    // If timeout happened but we have credentials, try to proceed
    if (waitTimeout && !isConnected) {
        const hasSpreadsheetId = localStorage.getItem('laksh_spreadsheet_id') ||
            localStorage.getItem('finday_spreadsheet_id');
        const hasToken = localStorage.getItem('google_access_token');

        if (hasSpreadsheetId && hasToken) {
            // Force proceed with cached credentials
            console.log('[ProtectedRoute] Timeout reached, proceeding with cached credentials');
            return children;
        }
    }

    // If the user is not connected, redirect them to the welcome page
    if (!isConnected) {
        return <Navigate to="/welcome" state={{ from: location }} replace />;
    }

    // If connected, render the requested component
    return children;
};

export default ProtectedRoute;
