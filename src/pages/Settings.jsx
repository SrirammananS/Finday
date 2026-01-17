import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { usePWA } from '../hooks/usePWA';
import { useTheme } from '../context/ThemeContext';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sun, Moon, Cloud, WifiOff, Save, Trash2, Database, Lock, Fingerprint, KeyRound } from 'lucide-react';
import { biometricAuth } from '../services/biometricAuth';

// Security Section Component
const SecuritySection = () => {
    const [lockEnabled, setLockEnabled] = useState(biometricAuth.isLockEnabled());
    const [showPinSetup, setShowPinSetup] = useState(false);
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [pinError, setPinError] = useState('');

    // Check if running as PWA
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;

    const handleToggleLock = () => {
        if (lockEnabled) {
            biometricAuth.disableLock();
            setLockEnabled(false);
        } else {
            // Need to set up PIN first
            setShowPinSetup(true);
        }
    };

    const handleSetPin = () => {
        if (pin.length < 4) {
            setPinError('PIN must be at least 4 digits');
            return;
        }
        if (pin !== confirmPin) {
            setPinError('PINs do not match');
            return;
        }
        biometricAuth.setPIN(pin);
        biometricAuth.enableLock();
        setLockEnabled(true);
        setShowPinSetup(false);
        setPin('');
        setConfirmPin('');
    };

    // Show different content based on PWA vs browser
    if (!isPWA) {
        return (
            <section className="mb-8">
                <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-4 ml-2">Security</h3>
                <div className="modern-card p-6 md:p-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-canvas-subtle flex items-center justify-center text-text-muted">
                            <Lock size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-text-main">App Lock</h3>
                            <p className="text-xs text-text-muted">
                                Install as PWA to enable app lock protection
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="mb-8">
            <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-4 ml-2">Security</h3>
            <div className="modern-card p-6 md:p-8 space-y-6">
                {/* App Lock Toggle */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${lockEnabled ? 'bg-primary text-primary-foreground' : 'bg-canvas-subtle text-text-muted'}`}>
                            {biometricAuth.isSupported ? <Fingerprint size={24} /> : <Lock size={24} />}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-text-main">App Lock</h3>
                            <p className="text-xs text-text-muted">
                                {biometricAuth.isSupported ? 'Fingerprint/Face ID + PIN' : 'PIN protection'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleToggleLock}
                        className={`w-12 h-6 rounded-full p-1 transition-colors ${lockEnabled ? 'bg-primary' : 'bg-card-border'}`}
                    >
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${lockEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                </div>

                {/* PIN Setup */}
                {showPinSetup && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="space-y-4 pt-4 border-t border-card-border"
                    >
                        <p className="text-xs text-text-muted">Set a PIN for unlocking the app:</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                                <input
                                    type="password"
                                    value={pin}
                                    onChange={(e) => { setPin(e.target.value); setPinError(''); }}
                                    placeholder="Enter PIN"
                                    maxLength={6}
                                    className="w-full bg-canvas-subtle border border-card-border py-3 pl-10 pr-4 rounded-xl outline-none focus:border-primary text-text-main font-bold"
                                />
                            </div>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                                <input
                                    type="password"
                                    value={confirmPin}
                                    onChange={(e) => { setConfirmPin(e.target.value); setPinError(''); }}
                                    placeholder="Confirm PIN"
                                    maxLength={6}
                                    className="w-full bg-canvas-subtle border border-card-border py-3 pl-10 pr-4 rounded-xl outline-none focus:border-primary text-text-main font-bold"
                                />
                            </div>
                        </div>
                        {pinError && <p className="text-xs text-destructive">{pinError}</p>}
                        <div className="flex gap-3">
                            <button
                                onClick={handleSetPin}
                                className="modern-btn modern-btn-primary px-6 py-3 text-xs"
                            >
                                Enable Lock
                            </button>
                            <button
                                onClick={() => { setShowPinSetup(false); setPin(''); setConfirmPin(''); }}
                                className="px-6 py-3 text-xs text-text-muted hover:text-text-main"
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>
        </section>
    );
};

const Settings = () => {
    const { config, isConnected, connect, disconnect, lastSyncTime, isLoading, updateConfig, forceRefresh, getCacheInfo } = useFinance();
    const { supportsPWA, installPWA, isInstalled } = usePWA();
    const { theme, toggleTheme } = useTheme();

    const [clientId, setClientId] = useState(config.clientId || '');
    const [spreadsheetId, setSpreadsheetId] = useState(config.spreadsheetId || '');
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionError, setConnectionError] = useState('');
    const [notifyEnabled, setNotifyEnabled] = useState(localStorage.getItem('finday_notify_enabled') === 'true');
    const [notifyDays, setNotifyDays] = useState(localStorage.getItem('finday_notify_days') || 5);

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
                    <div className="flex items-center gap-3">
                        {isConnected && (
                            <>
                                <button
                                    onClick={forceRefresh}
                                    className="text-xs font-bold text-primary hover:text-primary/80 uppercase tracking-wider px-4 py-2 border border-primary/20 rounded-full hover:bg-primary/10 transition-all"
                                    title="Clear cache and re-sync from cloud"
                                >
                                    Force Refresh
                                </button>
                                <button onClick={disconnect} className="text-xs font-bold text-destructive hover:text-red-400 uppercase tracking-wider px-4 py-2 border border-destructive/20 rounded-full hover:bg-destructive/10 transition-all">
                                    Disconnect
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* Offline Cache Info */}
            {isConnected && (
                <section className="mb-8">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-4 ml-2">Offline Access</h3>
                    <div className="modern-card p-6 md:p-8">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-canvas-subtle flex items-center justify-center text-primary">
                                <Database size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-text-main">Data Cached Locally</h3>
                                <p className="text-xs text-text-muted">
                                    Your data is saved for offline access. Syncs automatically when online.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Notification Preferences */}
            <section className="mb-8">
                <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-4 ml-2">Notifications</h3>
                <div className="modern-card p-6 md:p-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-text-main">Bill Reminders</h3>
                            <p className="text-xs text-text-muted">Get notified when bills are due.</p>
                        </div>
                        <button
                            onClick={() => {
                                const newState = !notifyEnabled;
                                if (newState) {
                                    Notification.requestPermission().then(perm => {
                                        if (perm === 'granted') {
                                            localStorage.setItem('finday_notify_enabled', 'true');
                                            setNotifyEnabled(true);
                                            // Force Context to pick up change?
                                            // Ideally we expose a function in Context.
                                            // For now, since Context reads on run, we might need a soft trigger.
                                            // But basic toggle state is local. Context effect runs on 'bills' change or mount.
                                            // We will modify Context to listen to an event or expose a setter.
                                            window.dispatchEvent(new Event('storage')); // Trigger storage event for cross-tab or listeners
                                        } else {
                                            alert("Permission needed to enable notifications.");
                                        }
                                    });
                                } else {
                                    localStorage.setItem('finday_notify_enabled', 'false');
                                    setNotifyEnabled(false);
                                    window.dispatchEvent(new Event('storage'));
                                }
                            }}
                            className={`w-12 h-6 rounded-full p-1 transition-colors ${notifyEnabled ? 'bg-primary' : 'bg-card-border'}`}
                        >
                            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${notifyEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    {notifyEnabled && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-xs font-bold text-text-muted uppercase tracking-widest">
                                <span>Notify me</span>
                                <span className="text-primary">{notifyDays} days before</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="7"
                                step="1"
                                value={notifyDays}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    setNotifyDays(val);
                                    localStorage.setItem('finday_notify_days', val);
                                    window.dispatchEvent(new Event('storage'));
                                }}
                                className="w-full h-2 bg-canvas-subtle rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                        </div>
                    )}
                </div>
            </section>

            {/* Security */}
            <SecuritySection />

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
                    {!isInstalled && (
                        <div className="mt-3">
                            {supportsPWA ? (
                                <button onClick={installPWA} className="w-full text-[10px] font-bold text-primary border border-primary/20 py-2 rounded-lg hover:bg-primary hover:text-black transition-all">
                                    Install App
                                </button>
                            ) : (
                                <p className="text-[9px] text-text-muted leading-tight">
                                    To install: Tap <span className="font-bold">Share</span> → <span className="font-bold">Add to Home Screen</span> (iOS) or use Browser Menu.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted/30 text-center mt-20">Finday v2.1.0 (PWA Optimized)</p>
        </motion.div>
    );
};

export default Settings;
