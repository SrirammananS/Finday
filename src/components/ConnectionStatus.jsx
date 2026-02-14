import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Wifi, WifiOff, Cloud, CloudOff, AlertCircle, CheckCircle2,
    RefreshCw, Loader2, X, ChevronDown, ChevronUp, Database,
    Globe, Shield, Clock, FileSpreadsheet
} from 'lucide-react';
import { storage, STORAGE_KEYS } from '../services/storage';

/**
 * Connection Status Diagnostic Component
 * Shows detailed connection information for troubleshooting
 */
export default function ConnectionStatus({ onRefresh }) {
    const {
        isConnected,
        isSyncing,
        isLoading,
        lastSyncTime,
        error,
        config,
        isGuest
    } = useFinance();

    const [isExpanded, setIsExpanded] = useState(false);
    const [diagnostics, setDiagnostics] = useState({});
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        const runDiagnostics = async () => {
            const diag = {
                timestamp: new Date().toISOString(),
                network: {
                    online: navigator.onLine,
                    connectionType: navigator.connection?.effectiveType || 'unknown'
                },
                auth: {
                    hasToken: !!(localStorage.getItem('laksh_access_token') || localStorage.getItem('google_access_token')),
                    tokenType: localStorage.getItem('laksh_access_token') ? 'LAKSH' : (localStorage.getItem('google_access_token') ? 'GOOGLE' : 'NONE'),
                    tokenExpiry: localStorage.getItem('google_token_expiry'),
                    tokenValid: false,
                    hasSpreadsheetId: !!(config?.spreadsheetId || storage.get(STORAGE_KEYS.SPREADSHEET_ID)),
                    spreadsheetId: config?.spreadsheetId || storage.get(STORAGE_KEYS.SPREADSHEET_ID) || 'Not set'
                },
                storage: {
                    hasLocalData: false,
                    lastSync: lastSyncTime ? new Date(lastSyncTime).toISOString() : 'Never'
                },
                api: {
                    gapiLoaded: typeof window.gapi !== 'undefined',
                    googleLoaded: typeof window.google !== 'undefined',
                    sheetsInitialized: false,
                    pendingQueue: 0
                }
            };

            // Check token validity
            const tokenExpiry = localStorage.getItem('google_token_expiry');
            if (tokenExpiry) {
                diag.auth.tokenValid = Date.now() < parseInt(tokenExpiry);
            }

            // Check local data
            try {
                const { localDB } = await import('../services/localDB');
                const localData = await localDB.getAllData();
                diag.storage.hasLocalData = localData.hasData;
            } catch (e) {
                console.warn('[ConnectionStatus] Could not check local data:', e);
            }

            // Check sheets service
            try {
                const { sheetsService } = await import('../services/sheets');
                diag.api.sheetsInitialized = sheetsService.isInitialized;
                const queueData = localStorage.getItem('laksh_write_queue');
                if (queueData) {
                    diag.api.pendingQueue = JSON.parse(queueData).length;
                }
            } catch (e) {
                console.warn('[ConnectionStatus] Could not check sheets service:', e);
            }

            setDiagnostics(diag);
        };

        runDiagnostics();
        const interval = setInterval(runDiagnostics, 5000);
        return () => clearInterval(interval);
    }, [config, lastSyncTime]);

    const getStatusColor = () => {
        if (!isOnline) return 'bg-red-500';
        if (isSyncing) return 'bg-yellow-500';
        if (isConnected) return 'bg-green-500';
        return 'bg-gray-500';
    };

    const getStatusText = () => {
        if (!isOnline) return 'OFFLINE';
        if (isGuest) return 'GUEST MODE';
        if (isSyncing) return 'SYNCING';
        if (isConnected) return 'CONNECTED';
        return 'DISCONNECTED';
    };

    const getStatusIcon = () => {
        if (!isOnline) return WifiOff;
        if (isSyncing) return Loader2;
        if (isConnected) return Cloud;
        return CloudOff;
    };

    const StatusIcon = getStatusIcon();

    return (
        <div className="fixed top-20 left-4 z-50 max-w-sm">
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-card border border-card-border rounded-2xl shadow-2xl overflow-hidden"
            >
                {/* Status Header */}
                <div
                    className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-canvas-subtle transition-colors"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor()} ${isSyncing ? 'animate-pulse' : ''}`} />
                        <StatusIcon
                            size={16}
                            className={`text-text-muted ${isSyncing ? 'animate-spin' : ''}`}
                        />
                        <span className="text-xs font-black uppercase tracking-widest text-text-main">
                            {getStatusText()}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {error && (
                            <AlertCircle size={14} className="text-red-500" />
                        )}
                        {isExpanded ? (
                            <ChevronUp size={14} className="text-text-muted" />
                        ) : (
                            <ChevronDown size={14} className="text-text-muted" />
                        )}
                    </div>
                </div>

                {/* Expanded Diagnostics */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="px-4 py-3 space-y-4 border-t border-card-border bg-canvas-subtle/50">
                                {/* Error Message */}
                                {error && (
                                    <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                                        <p className="text-xs text-red-400 font-medium">{error}</p>
                                    </div>
                                )}

                                {/* Network Status */}
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Globe size={12} className="text-text-muted" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                                            NETWORK
                                        </span>
                                    </div>
                                    <div className="space-y-1 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-text-muted">Status:</span>
                                            <span className={isOnline ? 'text-green-400' : 'text-red-400'}>
                                                {isOnline ? 'Online' : 'Offline'}
                                            </span>
                                        </div>
                                        {diagnostics.network && (
                                            <div className="flex justify-between">
                                                <span className="text-text-muted">Connection:</span>
                                                <span className="text-text-main">
                                                    {diagnostics.network.connectionType}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Auth Status */}
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Shield size={12} className="text-text-muted" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                                            AUTHENTICATION
                                        </span>
                                    </div>
                                    <div className="space-y-1 text-xs">
                                        {diagnostics.auth && (
                                            <>
                                                <div className="flex justify-between">
                                                    <span className="text-text-muted">Token:</span>
                                                    <span className={diagnostics.auth.hasToken ? 'text-green-400' : 'text-red-400'}>
                                                        {diagnostics.auth.hasToken ? 'Present' : 'Missing'}
                                                    </span>
                                                </div>
                                                {diagnostics.auth.hasToken && (
                                                    <div className="flex justify-between">
                                                        <span className="text-text-muted">Valid:</span>
                                                        <span className={diagnostics.auth.tokenValid ? 'text-green-400' : 'text-red-400'}>
                                                            {diagnostics.auth.tokenValid ? 'Yes' : 'Expired'}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between">
                                                    <span className="text-text-muted">Sheet ID:</span>
                                                    <span className={diagnostics.auth.hasSpreadsheetId ? 'text-green-400' : 'text-red-400'}>
                                                        {diagnostics.auth.hasSpreadsheetId
                                                            ? `${diagnostics.auth.spreadsheetId.substring(0, 8)}...`
                                                            : 'Not set'}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Data Status */}
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Database size={12} className="text-text-muted" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                                            DATA
                                        </span>
                                    </div>
                                    <div className="space-y-1 text-xs">
                                        {diagnostics.storage && (
                                            <>
                                                <div className="flex justify-between">
                                                    <span className="text-text-muted">Local Data:</span>
                                                    <span className={diagnostics.storage.hasLocalData ? 'text-green-400' : 'text-yellow-400'}>
                                                        {diagnostics.storage.hasLocalData ? 'Available' : 'Empty'}
                                                    </span>
                                                </div>
                                                {lastSyncTime && (
                                                    <div className="flex justify-between">
                                                        <span className="text-text-muted">Last Sync:</span>
                                                        <span className="text-text-main">
                                                            {new Date(lastSyncTime).toLocaleTimeString()}
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* API Status */}
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <FileSpreadsheet size={12} className="text-text-muted" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                                            API
                                        </span>
                                    </div>
                                    <div className="space-y-1 text-xs">
                                        {diagnostics.api && (
                                            <>
                                                <div className="flex justify-between">
                                                    <span className="text-text-muted">GAPI:</span>
                                                    <span className={diagnostics.api.gapiLoaded ? 'text-green-400' : 'text-red-400'}>
                                                        {diagnostics.api.gapiLoaded ? 'Loaded' : 'Not loaded'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-text-muted">Google:</span>
                                                    <span className={diagnostics.api.googleLoaded ? 'text-green-400' : 'text-red-400'}>
                                                        {diagnostics.api.googleLoaded ? 'Loaded' : 'Not loaded'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-text-muted">Sheets:</span>
                                                    <span className={diagnostics.api.sheetsInitialized ? 'text-green-400' : 'text-yellow-400'}>
                                                        {diagnostics.api.sheetsInitialized ? 'Ready' : 'Not ready'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-text-muted">Sync Queue:</span>
                                                    <span className={diagnostics.api.pendingQueue > 0 ? 'text-yellow-400 font-bold' : 'text-green-400'}>
                                                        {diagnostics.api.pendingQueue > 0 ? `${diagnostics.api.pendingQueue} Pending` : 'Clear'}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="pt-2 border-t border-card-border">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onRefresh) onRefresh();
                                        }}
                                        disabled={isSyncing || isLoading}
                                        className="w-full py-2 px-3 bg-primary text-primary-foreground rounded-lg text-xs font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isSyncing || isLoading ? (
                                            <>
                                                <Loader2 size={12} className="animate-spin" />
                                                SYNCING...
                                            </>
                                        ) : (
                                            <>
                                                <RefreshCw size={12} />
                                                REFRESH
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
