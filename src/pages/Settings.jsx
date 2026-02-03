import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { usePWA } from '../hooks/usePWA';
import { useTheme } from '../context/ThemeContext';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Cloud, WifiOff, Save, Trash2, Database, Lock as LockIcon, Fingerprint, KeyRound, Download, Smartphone, FileSpreadsheet, RefreshCw, Loader2, Plus, Check, Shield, Bell, Cpu, Zap, ChevronRight, X, User } from 'lucide-react';
import { biometricAuth } from '../services/biometricAuth';
import { storage, STORAGE_KEYS } from '../services/storage';
import { sheetsService } from '../services/sheets';
import SMSRulesManager from '../components/SMSRulesManager';
import GoogleSheetsConnect from '../components/GoogleSheetsConnect';
import JellySwitch from '../components/ui/JellySwitch';

const SecuritySection = () => {
    const [lockEnabled, setLockEnabled] = useState(biometricAuth.isLockEnabled());
    const [showPinSetup, setShowPinSetup] = useState(false);
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [pinError, setPinError] = useState('');
    const [isSettingPin, setIsSettingPin] = useState(false);

    const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

    const handleToggleLock = () => {
        if (lockEnabled) {
            biometricAuth.disableLock();
            setLockEnabled(false);
        } else {
            setShowPinSetup(true);
        }
    };

    const handleSetPin = async () => {
        if (pin.length < 4) {
            setPinError('PIN must be at least 4 digits');
            return;
        }
        if (pin !== confirmPin) {
            setPinError('PINs do not match');
            return;
        }
        setIsSettingPin(true);
        try {
            await biometricAuth.setPIN(pin);
            biometricAuth.enableLock();
            setLockEnabled(true);
            setShowPinSetup(false);
            setPin('');
            setConfirmPin('');
        } catch (err) {
            setPinError('Failed to set PIN');
        } finally {
            setIsSettingPin(false);
        }
    };

    return (
        <section className="mb-12">
            <div className="flex items-center gap-3 mb-6 px-4">
                <Shield size={16} className="text-primary" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">Security Protocol</h3>
            </div>

            <div className={`p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border transition-all ${lockEnabled ? 'bg-primary/[0.03] border-primary/20' : 'bg-white/[0.02] border-white/5'}`}>
                {!isPWA ? (
                    <div className="flex items-center gap-6 opacity-60">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-white/5 flex items-center justify-center text-text-muted">
                            <LockIcon size={28} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tighter text-text-main">App Lock Disabled</h3>
                            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mt-1">INSTALL AS PWA TO ACTIVATE ENCRYPTION</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all ${lockEnabled ? 'bg-primary text-black' : 'bg-white/5 text-text-muted'}`}>
                                    {biometricAuth.isSupported ? <Fingerprint size={28} /> : <LockIcon size={28} />}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tighter text-text-main">Neural Lock</h3>
                                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mt-1">
                                        {biometricAuth.isSupported ? 'PHASE ID + PIN PARITY' : 'STATIC PIN AUTH'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleToggleLock}
                                className={`w-14 h-8 rounded-full p-1 transition-all ${lockEnabled ? 'bg-primary' : 'bg-white/10'}`}
                            >
                                <div className={`w-6 h-6 rounded-full bg-white shadow-xl transform transition-transform ${lockEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        {showPinSetup && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="pt-8 border-t border-white/5 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="password"
                                        placeholder="NEW PIN"
                                        value={pin}
                                        onChange={(e) => { setPin(e.target.value); setPinError(''); }}
                                        maxLength={6}
                                        className="h-16 bg-text-main/5 border border-card-border rounded-2xl px-6 outline-none focus:border-primary font-black text-xl tracking-widest text-text-main text-center"
                                    />
                                    <input
                                        type="password"
                                        placeholder="CONFIRM"
                                        value={confirmPin}
                                        onChange={(e) => { setConfirmPin(e.target.value); setPinError(''); }}
                                        maxLength={6}
                                        className="h-16 bg-text-main/5 border border-card-border rounded-2xl px-6 outline-none focus:border-primary font-black text-xl tracking-widest text-text-main text-center"
                                    />
                                </div>
                                {pinError && <p className="text-[10px] font-black text-rose-500 text-center uppercase tracking-widest">{pinError}</p>}
                                <div className="flex gap-4">
                                    <button onClick={handleSetPin} disabled={isSettingPin} className="h-16 flex-1 bg-primary text-primary-foreground rounded-2xl font-black uppercase text-xs tracking-widest hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] transition-all">
                                        {isSettingPin ? 'ENCRYPTING...' : 'ACTIVATE LOCK'}
                                    </button>
                                    <button onClick={() => setShowPinSetup(false)} className="h-16 px-8 border border-card-border rounded-2xl font-black uppercase text-[10px] tracking-widest text-text-muted">CANCEL</button>
                                </div>
                            </motion.div>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
};

const Settings = () => {
    const navigate = useNavigate();
    const { config, isConnected, disconnect, lastSyncTime, isLoading, forceRefresh, transactions = [], accounts = [], categories = [], bills = [], restoreFromBackup, createFinanceSheet, exportData, importData, isGuest } = useFinance();
    const { supportsPWA, installPWA, isInstalled } = usePWA();
    const { theme, toggleTheme } = useTheme();
    const [notifyEnabled, setNotifyEnabled] = useState(storage.getBool(STORAGE_KEYS.NOTIFY_ENABLED));
    const [notifyDays, setNotifyDays] = useState(storage.getNumber(STORAGE_KEYS.NOTIFY_DAYS, 5));
    const [currentSheetName, setCurrentSheetName] = useState(storage.get(STORAGE_KEYS.SPREADSHEET_NAME) || 'Primary Wallet');
    const [spreadsheets, setSpreadsheets] = useState([]);
    const [loadingSheets, setLoadingSheets] = useState(false);
    const [showSheetList, setShowSheetList] = useState(false);
    const [showSMSRules, setShowSMSRules] = useState(false);

    useEffect(() => {
        biometricAuth.migrateInsecurePIN();
    }, []);

    const fetchSheets = async () => {
        setLoadingSheets(true);
        try {
            const list = await sheetsService.listSpreadsheets();
            const tagged = await Promise.all(list.map(async s => ({
                ...s,
                isLaksh: await sheetsService.isLakshSheet(s.id)
            })));
            setSpreadsheets(tagged);
        } catch (err) {
            console.error('Failed to fetch sheets:', err);
        } finally {
            setLoadingSheets(false);
        }
    };

    const handleSelectSheet = (sheet) => {
        if (window.confirm(`Switch terminal to "${sheet.name}"?`)) {
            storage.set(STORAGE_KEYS.SPREADSHEET_ID, sheet.id);
            storage.set(STORAGE_KEYS.SPREADSHEET_NAME, sheet.name);
            storage.set(STORAGE_KEYS.EVER_CONNECTED, 'true');
            window.location.reload();
        }
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
        </div>
    );

    return (
        <div className="min-h-screen text-text-main selection:bg-primary selection:text-black">
            {/* Background handled by Layout */}

            <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative px-5 py-12 md:px-8 md:py-24 max-w-7xl mx-auto pb-40">
                {/* Header Section */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-card border border-card-border overflow-hidden p-0.5">
                                <img src="/mascot.png" alt="Laksh AI" className="w-full h-full object-cover" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-text-muted">Settings</span>
                        </div>
                        <h1 className="text-xl font-black tracking-[-0.04em] leading-none mb-1 transition-all text-text-main uppercase">
                            Settings
                        </h1>
                        <p className="text-[8px] font-semibold text-text-muted uppercase tracking-[0.4em] opacity-60">System Preferences</p>
                    </div>

                    <button
                        onClick={toggleTheme}
                        className="w-16 h-16 rounded-[1.8rem] bg-canvas-subtle border border-card-border flex items-center justify-center text-text-main hover:border-primary hover:text-primary transition-all group"
                    >
                        {theme === 'dark' ? <Sun size={24} className="group-hover:rotate-90 transition-transform duration-500" /> : <Moon size={24} />}
                    </button>
                </header>

                {/* Active Wallet / Identity Hub */}
                <section className="mb-12">
                    <div className="flex items-center gap-3 mb-6 px-4">
                        <Database size={16} className="text-primary" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">{isGuest ? 'Identity Status' : 'Google Spreadsheet'}</h3>
                    </div>

                    {isGuest ? (
                        <div className="p-6 md:p-8 rounded-[2.2rem] md:rounded-[3rem] bg-card border border-violet-500/20 shadow-3xl relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 to-indigo-600/10 opacity-50" />
                            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                                <div className="flex items-center gap-6">
                                    <div className="w-20 h-20 rounded-[2rem] bg-card border border-card-border overflow-hidden p-1">
                                        <img src="/mascot.png" alt="Laksh AI" className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black uppercase tracking-tighter text-text-main">Guest Identity</h3>
                                        <p className="text-[10px] font-black text-violet-300 uppercase tracking-[0.2em] opacity-80 mt-1">Local Storage Mode • Not Synced</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        if (window.confirm("Switching to cloud checks out guest session. Continue?")) {
                                            storage.remove(STORAGE_KEYS.GUEST_MODE);
                                            storage.remove(STORAGE_KEYS.EVER_CONNECTED);
                                            localStorage.removeItem('laksh_guest_mode');
                                            localStorage.removeItem('laksh_ever_connected');
                                            navigate('/welcome');
                                        }
                                    }}
                                    className="h-14 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border shrink-0 bg-violet-600 text-white border-violet-500 hover:bg-violet-700 hover:scale-105 shadow-lg shadow-violet-600/20"
                                >
                                    SIGN IN / SYNC
                                </button>
                            </div>
                        </div>
                    ) : (
                        isConnected && (
                            <div className="p-6 md:p-8 rounded-[2.2rem] md:rounded-[3rem] bg-card border border-card-border shadow-3xl">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                                    <div className="flex items-center gap-6">
                                        <div className="w-20 h-20 rounded-[2rem] bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                                            <FileSpreadsheet size={32} strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black uppercase tracking-tighter text-text-main">{currentSheetName}</h3>
                                            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] opacity-40 mt-1 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">ID: {config.spreadsheetId}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { setShowSheetList(!showSheetList); if (!showSheetList && spreadsheets.length === 0) fetchSheets(); }}
                                        className={`h-14 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border shrink-0
                                        ${showSheetList ? 'bg-primary border-primary text-black' : 'bg-canvas-subtle text-text-muted border-card-border hover:border-primary hover:text-text-main'}`}
                                    >
                                        {showSheetList ? 'CLOSE' : 'SWITCH SPREADSHEET'}
                                    </button>
                                </div>

                                <AnimatePresence>
                                    {showSheetList && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-12 pt-8 border-t border-card-border overflow-hidden">
                                            <div className="flex items-center justify-between mb-6">
                                                <span className="text-[9px] font-black text-text-muted uppercase tracking-[0.3em]">AVAILABLE SPREADSHEETS</span>
                                                <button onClick={fetchSheets} className="text-primary hover:scale-110 transition-transform"><RefreshCw size={14} className={loadingSheets ? 'animate-spin' : ''} /></button>
                                            </div>

                                            <div className="grid gap-3 max-h-80 overflow-y-auto no-scrollbar pb-6">
                                                {spreadsheets.map(sheet => (
                                                    <button
                                                        key={sheet.id}
                                                        onClick={() => handleSelectSheet(sheet)}
                                                        className={`p-6 rounded-[1.8rem] border flex items-center justify-between text-left transition-all
                                                        ${sheet.id === config.spreadsheetId ? 'bg-primary/5 border-primary/40' : 'bg-canvas-subtle border-card-border hover:border-card-border'}`}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${sheet.isLaksh ? 'bg-primary/20 text-primary' : 'bg-text-main/10 text-text-muted'}`}>
                                                                {sheet.isLaksh ? <Check size={20} /> : <FileSpreadsheet size={18} />}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black uppercase text-text-main tracking-tight">{sheet.name}</p>
                                                                <p className="text-[8px] font-black text-text-muted uppercase tracking-widest">{sheet.isLaksh ? 'LAKSH PRIMARY' : 'GOOGLE DRIVE FILE'}</p>
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                                <button onClick={createFinanceSheet} className="p-6 rounded-[1.8rem] border-2 border-dashed border-card-border text-text-muted hover:border-primary/50 hover:text-primary transition-all flex items-center justify-center gap-3">
                                                    <Plus size={20} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">CONNECT NEW SPREADSHEET</span>
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )
                    )}
                </section>

                {/* Automation & UI Layer */}
                <div className="grid grid-cols-2 gap-3 mb-12">
                    <button onClick={() => setShowSMSRules(true)} className="p-5 md:p-6 rounded-[1.8rem] md:rounded-[2.2rem] bg-card border border-card-border flex flex-col justify-between min-h-[120px] hover:border-card-border transition-all text-left">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-3">
                            <Zap size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-black uppercase tracking-tighter text-text-main">Smart Rules</h3>
                            <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mt-0.5">SMS ENGINE</p>
                        </div>
                    </button>

                    <Link to="/categories" className="p-5 md:p-6 rounded-[1.8rem] md:rounded-[2.2rem] bg-card border border-card-border flex flex-col justify-between min-h-[120px] hover:border-card-border transition-all">
                        <div className="w-10 h-10 rounded-xl bg-text-main/5 border border-card-border flex items-center justify-center text-text-main mb-3">
                            <User size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-black uppercase tracking-tighter text-text-main">Categories</h3>
                            <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mt-0.5">MANAGE</p>
                        </div>
                    </Link>
                </div>

                {/* Security and Cloud */}
                <SecuritySection />

                <section className="mb-12">
                    <div className="flex items-center gap-3 mb-6 px-4">
                        <Cloud size={16} className="text-primary" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">Cloud Bridge</h3>
                    </div>
                    <div className="p-6 rounded-[2.2rem] bg-card border border-card-border flex flex-col md:flex-row justify-between gap-6 group">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center transition-all ${isConnected ? 'bg-primary text-black' : 'bg-rose-500/10 text-rose-500'}`}>
                                {isConnected ? <Cloud size={20} /> : <WifiOff size={20} />}
                            </div>
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tighter text-text-main">{isGuest ? 'LOCAL' : isConnected ? 'SYNCED' : 'OFFLINE'}</h3>
                                {lastSyncTime && <p className="text-[8px] font-black text-text-muted uppercase tracking-[0.2em] mt-0.5">SAVED: {new Date(lastSyncTime).toLocaleTimeString()}</p>}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {isConnected ? (
                                <>
                                    <button onClick={forceRefresh} className="h-10 px-4 rounded-xl border border-card-border text-[9px] font-black uppercase tracking-widest text-text-muted hover:bg-canvas-subtle">SYNC</button>
                                    <button onClick={disconnect} className="h-10 px-4 rounded-xl border border-rose-500/20 text-rose-400 text-[9px] font-black uppercase tracking-widest hover:bg-rose-500/10">STOP</button>
                                </>
                            ) : (
                                <Link to="/welcome" className="h-10 px-6 rounded-xl bg-primary text-black text-[9px] font-black uppercase tracking-widest flex items-center justify-center shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]">CONNECT</Link>
                            )}
                        </div>
                    </div>
                </section>

                {/* Notifications & Data Management */}
                <div className="mb-20">
                    {/* Section Header moved outside the grid for cleaner look */}
                    <div className="flex items-center gap-3 mb-6 px-4">
                        <Database size={16} className="text-primary" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">Data Protocol</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {/* Broadcasts Card */}
                        <div className="p-5 rounded-[1.8rem] bg-card border border-card-border flex flex-col justify-between h-auto min-h-[160px]">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 rounded-2xl bg-primary/10 text-primary w-fit">
                                    <Bell size={20} />
                                </div>
                                <JellySwitch
                                    isOn={notifyEnabled}
                                    onToggle={() => {
                                        const newState = !notifyEnabled;
                                        if (newState) {
                                            if (!('Notification' in window)) {
                                                alert('Notifications are not supported by this browser.');
                                                return;
                                            }
                                            Notification.requestPermission().then(p => {
                                                if (p === 'granted') {
                                                    storage.set(STORAGE_KEYS.NOTIFY_ENABLED, 'true');
                                                    setNotifyEnabled(true);
                                                    window.dispatchEvent(new Event('storage'));
                                                    new Notification('LAKSH Ready', { body: 'Notifications activated successfully!', icon: '/mascot.png' });
                                                } else {
                                                    alert('Please enable notifications in your browser settings to use this feature.');
                                                    setNotifyEnabled(false);
                                                }
                                            });
                                        } else {
                                            storage.set(STORAGE_KEYS.NOTIFY_ENABLED, 'false');
                                            setNotifyEnabled(false);
                                            window.dispatchEvent(new Event('storage'));
                                        }
                                    }}
                                />
                            </div>

                            <div className="mb-4">
                                <h3 className="text-sm font-black uppercase text-text-main leading-tight mb-1">Bill Reminders</h3>
                                <p className="text-[8px] font-black uppercase text-text-muted tracking-wide opacity-60">Temporal Alerts</p>
                            </div>

                            {notifyEnabled && (
                                <div className="space-y-3 pt-3 border-t border-card-border mt-auto">
                                    <div className="flex justify-between text-[7px] font-black uppercase tracking-widest text-text-muted">
                                        <span>Notice</span>
                                        <span className="text-primary">{notifyDays} DAYS</span>
                                    </div>
                                    <input type="range" min="1" max="14" value={notifyDays} onChange={e => {
                                        const val = parseInt(e.target.value); setNotifyDays(val); storage.set(STORAGE_KEYS.NOTIFY_DAYS, val); window.dispatchEvent(new Event('storage'));
                                    }} className="w-full h-1 bg-white/10 appearance-none cursor-pointer accent-primary rounded-full transition-all" />
                                </div>
                            )}
                        </div>

                        {/* Vault Storage Card */}
                        <div className="p-5 rounded-[1.8rem] bg-card border border-card-border flex flex-col justify-between h-auto min-h-[160px]">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 rounded-2xl bg-text-main/5 text-text-main w-fit border border-card-border">
                                    <Save size={20} />
                                </div>
                            </div>

                            <div className="flex flex-col gap-6 flex-1">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-black uppercase text-text-main leading-none">Backup</h3>
                                        <p className="text-[7px] font-black text-text-muted uppercase tracking-widest mt-1">JSON</p>
                                    </div>
                                    <button onClick={exportData} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-primary hover:bg-primary hover:text-black transition-all">
                                        <Download size={16} />
                                    </button>
                                </div>

                                <div className="h-px bg-card-border w-full" />

                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-black uppercase text-text-main leading-none">Restore</h3>
                                        <p className="text-[7px] font-black text-text-muted uppercase tracking-widest mt-1">Recover</p>
                                    </div>
                                    <label className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary cursor-pointer hover:bg-primary hover:text-black transition-all">
                                        <Plus size={16} />
                                        <input type="file" accept=".json" className="hidden" onChange={async e => {
                                            const file = e.target.files[0]; if (!file) return;
                                            const reader = new FileReader(); reader.onload = async event => {
                                                if (await importData(event.target.result)) { alert('System Restored'); window.location.reload(); }
                                            }; reader.readAsText(file);
                                        }} />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Trace */}
                <div className="text-center pt-20">
                    <p className="text-[9px] font-black uppercase tracking-[1em] text-text-muted/20">LAKSH_OS_CORE_V{import.meta.env.VITE_APP_VERSION || '2.5.0'}</p>
                </div>
            </motion.main>

            <SMSRulesManager isOpen={showSMSRules} onClose={() => setShowSMSRules(false)} />
        </div>
    );
};

export default Settings;
