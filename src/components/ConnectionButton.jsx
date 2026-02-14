import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useFinance } from '../context/FinanceContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Cloud, CloudOff, Loader2, Wifi, WifiOff, Shield,
    Database, FileSpreadsheet, X, CheckCircle2, AlertCircle
} from 'lucide-react';
import { storage, STORAGE_KEYS } from '../services/storage';

export default function ConnectionButton() {
    const {
        isConnected,
        isSyncing,
        isLoading,
        lastSyncTime,
        error,
        config,
        forceRefresh
    } = useFinance();

    const [showModal, setShowModal] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [diagnostics, setDiagnostics] = useState({});

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

    // Diagnostics runner
    useEffect(() => {
        if (!showModal) return;

        const runDiagnostics = async () => {
            const diag = {
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
                    lastSync: lastSyncTime
                },
                api: {
                    gapiLoaded: typeof window.gapi !== 'undefined',
                    androidBridge: !!window.AndroidBridge,
                    pendingQueue: 0
                }
            };

            // Check token validity
            if (diag.auth.tokenExpiry) {
                diag.auth.tokenValid = Date.now() < parseInt(diag.auth.tokenExpiry);
            }

            // Check local data
            try {
                const { localDB } = await import('../services/localDB');
                const localData = await localDB.getAllData();
                diag.storage.hasLocalData = localData.hasData;
            } catch (e) {
                console.warn('Diag error:', e);
            }

            // Check queue
            const queueData = localStorage.getItem('laksh_write_queue');
            if (queueData) {
                diag.api.pendingQueue = JSON.parse(queueData).length;
            }

            setDiagnostics(diag);
        };

        runDiagnostics();
        const interval = setInterval(runDiagnostics, 2000);
        return () => clearInterval(interval);
    }, [showModal, lastSyncTime, config]);

    return (
        <>
            <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowModal(true)}
                className={`relative flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-2xl border transition-all ${!isOnline ? 'bg-red-500/10 border-red-500/30 text-red-500' :
                    isSyncing ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' :
                        isConnected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' :
                            'bg-card border-card-border text-text-muted'
                    }`}
            >
                {/* Status Dot */}
                <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${!isOnline ? 'bg-red-500' :
                    isSyncing ? 'bg-yellow-500 animate-pulse' :
                        isConnected ? 'bg-emerald-500' :
                            'bg-text-muted'
                    }`} />

                {isSyncing ? (
                    <Loader2 size={20} className="animate-spin" />
                ) : !isOnline ? (
                    <WifiOff size={20} />
                ) : isConnected ? (
                    <Cloud size={20} />
                ) : (
                    <CloudOff size={20} />
                )}
            </motion.button>

            {/* Diagnostics Modal */}
            {ReactDOM.createPortal(
                <AnimatePresence>
                    {showModal && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowModal(false)}>
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={e => e.stopPropagation()}
                                className="bg-card border border-card-border w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
                            >
                                <div className="p-4 border-b border-card-border flex justify-between items-center bg-canvas-subtle">
                                    <h3 className="font-black text-sm uppercase tracking-widest text-text-main flex items-center gap-2">
                                        <Cloud size={16} className="text-primary" />
                                        Connection Status
                                    </h3>
                                    <button onClick={() => setShowModal(false)} className="p-1 rounded-full hover:bg-white/10 text-text-muted">
                                        <X size={18} />
                                    </button>
                                </div>

                                <div className="p-5 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-text-muted uppercase">Status</span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${isSyncing ? 'bg-yellow-500/20 text-yellow-500' :
                                            isConnected ? 'bg-emerald-500/20 text-emerald-500' :
                                                'bg-red-500/20 text-red-500'
                                            }`}>
                                            {isSyncing ? 'Syncing...' : isConnected ? 'Connected' : 'Disconnected'}
                                        </span>
                                    </div>

                                    {/* Diagnostics List */}
                                    <div className="space-y-2 bg-canvas-subtle rounded-xl p-3">
                                        <DiagRow
                                            label="Network"
                                            value={isOnline ? 'Online' : 'Offline'}
                                            good={isOnline}
                                            icon={<Wifi size={12} />}
                                        />
                                        <DiagRow
                                            label="Auth Token"
                                            value={diagnostics.auth?.hasToken ? diagnostics.auth.tokenType : 'Missing'}
                                            good={diagnostics.auth?.hasToken}
                                            icon={<Shield size={12} />}
                                        />
                                        <DiagRow
                                            label="Local Data"
                                            value={diagnostics.storage?.hasLocalData ? 'Available' : 'Empty'}
                                            good={diagnostics.storage?.hasLocalData}
                                            icon={<Database size={12} />}
                                        />
                                        <DiagRow
                                            label="Environment"
                                            value={diagnostics.api?.androidBridge ? 'Android Bridge' : 'Web Standard'}
                                            good={true}
                                            icon={<FileSpreadsheet size={12} />}
                                        />
                                        {diagnostics.auth && (
                                            <>
                                                <DiagRow
                                                    label="Token Valid"
                                                    value={diagnostics.auth.tokenValid ? 'Active' : 'Expired'}
                                                    good={diagnostics.auth.tokenValid}
                                                    icon={<Shield size={12} />}
                                                />
                                                <DiagRow
                                                    label="Sheet ID"
                                                    value={diagnostics.auth.hasSpreadsheetId ? 'Linked' : 'Missing'}
                                                    good={diagnostics.auth.hasSpreadsheetId}
                                                    icon={<Database size={12} />}
                                                />
                                            </>
                                        )}
                                        <DiagRow
                                            label="Sync Queue"
                                            value={diagnostics.api?.pendingQueue > 0 ? `${diagnostics.api.pendingQueue} Pending` : 'Clear'}
                                            good={diagnostics.api?.pendingQueue === 0}
                                            icon={<Loader2 size={12} />}
                                        />
                                    </div>

                                    {error && (
                                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-medium flex gap-2 items-start">
                                            <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                            {error}
                                        </div>
                                    )}

                                    <button
                                        onClick={() => {
                                            forceRefresh();
                                            setShowModal(false);
                                        }}
                                        className="w-full py-4 bg-primary text-primary-foreground font-black uppercase tracking-widest rounded-xl hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                    >
                                        <Loader2 size={16} className={isSyncing ? "animate-spin" : ""} />
                                        {isSyncing ? 'Syncing...' : 'Force Refresh'}
                                    </button>

                                    <p className="text-[10px] text-center text-text-muted/50 font-mono">
                                        Last Sync: {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : 'Never'}
                                    </p>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}

const DiagRow = ({ label, value, good, icon }) => (
    <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-text-muted">
            {icon}
            <span>{label}</span>
        </div>
        <div className={`flex items-center gap-1.5 font-bold ${good ? 'text-emerald-400' : 'text-rose-400'}`}>
            <span>{value}</span>
            {good ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
        </div>
    </div>
);
