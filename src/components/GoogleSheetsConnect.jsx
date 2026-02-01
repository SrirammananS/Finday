import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, Plus, FileSpreadsheet, Check, Loader2, RefreshCw, X, Smartphone, ExternalLink } from 'lucide-react';
import { sheetsService } from '../services/sheets';
import { cloudBackup } from '../services/cloudBackup';

// Detect if running in Android WebView
const isAndroidWebView = () => {
    const ua = navigator.userAgent || '';
    return ua.includes('wv') || // Android WebView
           (ua.includes('Android') && ua.includes('Version/')) ||
           window.AndroidBridge !== undefined;
};

export default function GoogleSheetsConnect({ onConnect, onDisconnect, isConnected, createFinanceSheet }) {
    const [step, setStep] = useState(isConnected ? 'connected' : 'start');
    const [isWebView] = useState(isAndroidWebView());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [spreadsheets, setSpreadsheets] = useState([]);
    const [selectedSheet, setSelectedSheet] = useState(null);
    const isMountedRef = useRef(true);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Sign in with Google
    const handleSignIn = async () => {
        if (!isMountedRef.current) return;
        setIsLoading(true);
        setError('');
        try {
            // Use cloudBackup for OAuth session
            if (!cloudBackup.isSignedIn()) {
                await cloudBackup.signIn();
            }
            if (!isMountedRef.current) return;
            // Load user's spreadsheets
            await sheetsService.init(); // No clientId needed
            if (!isMountedRef.current) return;
            const sheets = await sheetsService.listSpreadsheets();
            if (!isMountedRef.current) return;
            setSpreadsheets(sheets);
            setStep('select');
        } catch (err) {
            console.error('Sign in failed:', err);
            if (isMountedRef.current) {
                setError(err.message || 'Sign in failed. Please try again.');
            }
        } finally {
            if (isMountedRef.current) {
                setIsLoading(false);
            }
        }
    };

    // Select an existing spreadsheet
    const handleSelectSheet = async (sheet) => {
        if (!isMountedRef.current) return;
        setIsLoading(true);
        setError('');
        setSelectedSheet(sheet);
        try {
            // Check if it's a LAKSH sheet
            const isLaksh = await sheetsService.isLakshSheet(sheet.id);
            if (!isMountedRef.current) return;
            if (!isLaksh) {
                if (!confirm(`"${sheet.name}" doesn't appear to be a LAKSH finance sheet. Use it anyway? This will add the required sheets.`)) {
                    if (isMountedRef.current) {
                        setSelectedSheet(null);
                        setIsLoading(false);
                    }
                    return;
                }
            }
            // Connect to the sheet (no clientId needed)
            const success = onConnect ? await onConnect(sheet.id) : true;
            if (!isMountedRef.current) return;
            if (success) {
                setStep('connected');
            } else {
                setError('Failed to connect to sheet');
            }
        } catch (err) {
            if (isMountedRef.current) {
                setError(err.message || 'Connection failed');
            }
        } finally {
            if (isMountedRef.current) {
                setIsLoading(false);
            }
        }
    };

    // Create a new LAKSH spreadsheet
    const handleCreateNew = async () => {
        if (!isMountedRef.current) return;
        setIsLoading(true);
        setError('');
        
        try {
            await createFinanceSheet();
            if (!isMountedRef.current) return;
            setStep('connected');
        } catch (err) {
            if (isMountedRef.current) {
                setError(err.message || 'Failed to create spreadsheet');
            }
        } finally {
            if (isMountedRef.current) {
                setIsLoading(false);
            }
        }
    };

    // Refresh spreadsheet list
    const handleRefreshList = async () => {
        if (!isMountedRef.current) return;
        setIsLoading(true);
        try {
            const sheets = await sheetsService.listSpreadsheets();
            if (!isMountedRef.current) return;
            setSpreadsheets(sheets);
        } catch (err) {
            if (isMountedRef.current) {
                setError('Failed to refresh list');
            }
        } finally {
            if (isMountedRef.current) {
                setIsLoading(false);
            }
        }
    };

    // Disconnect
    const handleDisconnect = () => {
        onDisconnect();
        setStep('start');
        setSpreadsheets([]);
        setSelectedSheet(null);
    };

    if (isConnected && step !== 'connected') {
        setStep('connected');
    }

    // In WebView, show a note but allow sign-in (external browser flow handled internally)
    const webViewBanner = (
        <div className="p-3 mb-4 bg-canvas-subtle rounded-xl flex items-center gap-3">
            <Smartphone size={18} className="text-orange-500" />
            <p className="text-xs text-text-muted">
                On Android, sign-in opens Chrome briefly to complete OAuth.
            </p>
        </div>
    );

    return (
        <section className="mb-8">
            <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-4 ml-2">
                Google Sheets Sync
            </h3>
            
            <div className="modern-card p-6 md:p-8">
                {isWebView && !isConnected && webViewBanner}
                <AnimatePresence mode="wait">
                    {/* Step 1: Start / Sign In */}
                    {step === 'start' && (
                        <motion.div
                            key="start"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-4"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-14 h-14 rounded-2xl bg-canvas-subtle flex items-center justify-center">
                                    <Cloud size={28} className="text-text-muted" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-text-main">Connect to Google Sheets</h3>
                                    <p className="text-xs text-text-muted">Sync your data across devices</p>
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={handleSignIn}
                                disabled={isLoading}
                                className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <Loader2 size={20} className="animate-spin" />
                                ) : (
                                    <Cloud size={20} />
                                )}
                                {isLoading ? 'Signing in...' : 'Sign in with Google'}
                            </button>

                        </motion.div>
                    )}

                    {/* Step 2: Select Spreadsheet */}
                    {step === 'select' && (
                        <motion.div
                            key="select"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-4"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-bold text-text-main">Choose a Spreadsheet</h3>
                                <button
                                    onClick={handleRefreshList}
                                    disabled={isLoading}
                                    className="p-2 text-text-muted hover:text-primary rounded-lg"
                                >
                                    <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                                </button>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Create New Option */}
                            <button
                                onClick={handleCreateNew}
                                disabled={isLoading}
                                className="w-full p-4 border-2 border-dashed border-primary/30 rounded-xl flex items-center gap-3 hover:bg-primary/5 transition-all group"
                            >
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                                    <Plus size={20} className="text-primary group-hover:text-white" />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-text-main">Create New Spreadsheet</p>
                                    <p className="text-xs text-text-muted">Start fresh with a new LAKSH ledger</p>
                                </div>
                            </button>

                            {/* Existing Spreadsheets */}
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {spreadsheets.length === 0 ? (
                                    <p className="text-center text-text-muted py-4 text-sm">
                                        No spreadsheets found. Create a new one above.
                                    </p>
                                ) : (
                                    spreadsheets.map((sheet) => (
                                        <button
                                            key={sheet.id}
                                            onClick={() => handleSelectSheet(sheet)}
                                            disabled={isLoading}
                                            className={`w-full p-4 rounded-xl flex items-center gap-3 transition-all text-left ${
                                                selectedSheet?.id === sheet.id
                                                    ? 'bg-primary/10 border-2 border-primary'
                                                    : 'bg-canvas-subtle hover:bg-canvas-subtle/80 border-2 border-transparent'
                                            }`}
                                        >
                                            <FileSpreadsheet size={24} className="text-green-500 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-text-main truncate">{sheet.name}</p>
                                                <p className="text-xs text-text-muted">
                                                    Modified: {new Date(sheet.modifiedTime).toLocaleDateString()}
                                                </p>
                                            </div>
                                            {selectedSheet?.id === sheet.id && isLoading && (
                                                <Loader2 size={18} className="animate-spin text-primary" />
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>

                            <button
                                onClick={() => setStep('start')}
                                className="w-full py-2 text-text-muted text-sm hover:text-text-main"
                            >
                                ← Back
                            </button>
                        </motion.div>
                    )}

                    {/* Step 3: Connected */}
                    {step === 'connected' && (
                        <motion.div
                            key="connected"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center">
                                        <Check size={28} className="text-green-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-text-main">Connected</h3>
                                        <p className="text-xs text-text-muted">Your data syncs automatically</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleDisconnect}
                                    className="px-4 py-2 text-red-400 text-sm font-medium border border-red-500/20 rounded-xl hover:bg-red-500/10 transition-all"
                                >
                                    Disconnect
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </section>
    );
}
