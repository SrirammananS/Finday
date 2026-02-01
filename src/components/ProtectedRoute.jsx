import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import SkeletonDashboard from './skeletons/SkeletonDashboard';

const ProtectedRoute = ({ children }) => {
    const { isConnected, isLoading } = useFinance();
    const location = useLocation();

    // While the connection status is being determined, show a loader
    if (isLoading) {
        return <SkeletonDashboard />;
    }

    // If the user is not connected, redirect them to the welcome page
    if (!isConnected) {
        return <Navigate to="/welcome" state={{ from: location }} replace />;
    }

    // If connected, render the requested component
    return children;
};

export default ProtectedRoute;
