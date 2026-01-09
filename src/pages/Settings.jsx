import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { usePWA } from '../hooks/usePWA';
import { useTheme } from '../context/ThemeContext'; // Import Theme Hook
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sun, Moon, Cloud, WifiOff, Save, Trash2, Database } from 'lucide-react';

const Settings = () => {
    const { config, isConnected, connect, disconnect, lastSyncTime, isLoading, updateConfig } = useFinance();
    const { supportsPWA, installPWA, isInstalled } = usePWA();
    const { theme, toggleTheme } = useTheme();

    const [clientId, setClientId] = useState(config.clientId || '');
    const [spreadsheetId, setSpreadsheetId] = useState(config.spreadsheetId || '');
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionError, setConnectionError] = useState('');

    if (isLoading) return <div className="p-10 text-center opacity-50 text-xs uppercase tracking-widest">Loading Configuration...</div>;

    const handleConnect = async (e) => {
        e.preventDefault();
        if (!clientId || !spreadsheetId) return;
        setIsConnecting(true);
        setConnectionError('');
        try {
            const success = await connect(clientId, spreadsheetId);
            if (!success) setConnectionError('Connection Denied: Check credentials');
        } catch (err) {
            setConnectionError(err.message || 'Connection Error');
        } finally {
            setIsConnecting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 py-8 md:px-6 md:py-12 max-w-3xl mx-auto min-h-screen pb-40"
        >
            <header className="mb-10 md:mb-16 flex items-end justify-between">
                <div>
                    <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted mb-2">System</h2>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight text-text-main">Settings<span className="text-primary">.</span></h1>
                </div>

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="w-12 h-12 rounded-full bg-card border border-card-border flex items-center justify-center text-text-main hover:border-primary active:scale-95 transition-all"
                    title="Toggle Theme"
                >
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>
            </header>

            {/* Cloud Status */}
            <section className="mb-8">
                <div className={`modern-card p-6 md:p-8 flex items-center justify-between group ${isConnected ? 'border-primary/30' : ''}`}>
                    <div className="flex items-center gap-6">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${isConnected ? 'bg-primary text-primary-foreground' : 'bg-canvas-subtle text-text-muted'}`}>
                            {isConnected ? <Cloud size={24} /> : <WifiOff size={24} />}
                        </div>
                        <div>
                            <h3 className={`text-xl font-bold tracking-tight ${isConnected ? 'text-text-main' : 'text-text-muted'}`}>
                                {isConnected ? 'Cloud Sync Active' : 'Disconnected'}
                            </h3>
                            {lastSyncTime && (
                                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mt-1">
                                    Last Sync: {new Date(lastSyncTime).toLocaleTimeString()}
                                </p>
                            )}
                        </div>
                    </div>
                    {isConnected && (
                        <button onClick={disconnect} className="text-xs font-bold text-destructive hover:text-red-400 uppercase tracking-wider px-4 py-2 border border-destructive/20 rounded-full hover:bg-destructive/10 transition-all">
                            Disconnect
                        </button>
                    )}
                </div>
            </section>

            {/* Connection Form */}
            {!isConnected && (
                <section className="mb-12">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-4 ml-2">Google Sheets Connection</h3>
                    <div className="modern-card p-8 bg-card/50">
                        <form onSubmit={handleConnect} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted ml-1">OAuth Client ID</label>
                                <input
                                    type="password"
                                    value={clientId}
                                    onChange={e => setClientId(e.target.value)}
                                    placeholder="Enter Client ID"
                                    className="w-full bg-canvas border border-card-border p-4 rounded-xl font-mono text-xs outline-none focus:border-primary transition-all text-text-main"
                                    required
                                />
                                <p className="text-[9px] text-text-muted/60 pl-1 leading-tight">
                                    Required for Google Security. We do not store this on any server; it stays in your browser.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted ml-1">Spreadsheet ID</label>
                                <input
                                    type="text"
                                    value={spreadsheetId}
                                    onChange={e => setSpreadsheetId(e.target.value)}
                                    placeholder="Enter Sheet ID"
                                    className="w-full bg-canvas border border-card-border p-4 rounded-xl font-mono text-xs outline-none focus:border-primary transition-all text-text-main"
                                    required
                                />
                            </div>

                            {connectionError && (
                                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold text-center">
                                    {connectionError}
                                </div>
                            )}

                            <button type="submit" className="modern-btn modern-btn-primary w-full py-4 text-sm" disabled={isConnecting}>
                                {isConnecting ? 'Connecting...' : 'Connect to Wallet'}
                            </button>

                            <div className="relative flex items-center gap-4 py-2">
                                <div className="h-px bg-card-border flex-1"></div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">OR</span>
                                <div className="h-px bg-card-border flex-1"></div>
                            </div>

                            <button
                                type="button"
                                onClick={async () => {
                                    if (!clientId) return alert("Please enter Client ID first");
                                    setIsConnecting(true);
                                    try {
                                        // Connect without checking sheet (pass empty/dummy)
                                        const success = await connect(clientId, null);
                                        if (success) {
                                            await createFinanceSheet();
                                        } else {
                                            setConnectionError("Auth Failed. Check Client ID.");
                                        }
                                    } catch (err) {
                                        setConnectionError(err.message);
                                    } finally {
                                        setIsConnecting(false);
                                    }
                                }}
                                className="modern-btn modern-btn-ghost w-full py-4 text-xs"
                                disabled={isConnecting}
                            >
                                {isConnecting ? 'Creating...' : '✨ Create New Wallet'}
                            </button>
                        </form>
                    </div>
                </section>
            )}

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-4 md:gap-6 mb-12">
                <Link to="/categories" className="modern-card p-6 flex flex-col justify-between group no-underline min-h-[160px]">
                    <span className="text-3xl grayscale group-hover:grayscale-0 transition-all duration-300">🏷️</span>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Manage</p>
                        <p className="text-lg font-bold text-text-main group-hover:text-primary transition-colors">Categories</p>
                    </div>
                </Link>

                <div className="modern-card p-6 flex flex-col justify-between group min-h-[160px]">
                    <span className="text-3xl transition-all duration-300 transform group-hover:scale-110">{isInstalled ? '📱' : '🚀'}</span>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">App Status</p>
                        <p className="text-lg font-bold text-text-main">{isInstalled ? 'Installed' : 'Web Version'}</p>
                    </div>
                    {!isInstalled && supportsPWA && (
                        <button onClick={installPWA} className="mt-3 text-[10px] font-bold text-primary border border-primary/20 py-2 rounded-lg hover:bg-primary hover:text-black transition-all">
                            Install App
                        </button>
                    )}
                </div>
            </div>

            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted/30 text-center mt-20">Finday v2.0.0</p>
        </motion.div>
    );
};

export default Settings;
