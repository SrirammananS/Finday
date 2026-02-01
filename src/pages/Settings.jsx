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
                            <h3 className="text-xl font-black uppercase tracking-tighter text-white">App Lock Disabled</h3>
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
                                    <h3 className="text-xl font-black uppercase tracking-tighter text-white">Neural Lock</h3>
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
                                        className="h-16 bg-white/5 border border-white/10 rounded-2xl px-6 outline-none focus:border-primary font-black text-xl tracking-widest text-white text-center"
                                    />
                                    <input
                                        type="password"
                                        placeholder="CONFIRM"
                                        value={confirmPin}
                                        onChange={(e) => { setConfirmPin(e.target.value); setPinError(''); }}
                                        maxLength={6}
                                        className="h-16 bg-white/5 border border-white/10 rounded-2xl px-6 outline-none focus:border-primary font-black text-xl tracking-widest text-white text-center"
                                    />
                                </div>
                                {pinError && <p className="text-[10px] font-black text-rose-500 text-center uppercase tracking-widest">{pinError}</p>}
                                <div className="flex gap-4">
                                    <button onClick={handleSetPin} disabled={isSettingPin} className="h-16 flex-1 bg-primary text-black rounded-2xl font-black uppercase text-xs tracking-widest hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] transition-all">
                                        {isSettingPin ? 'ENCRYPTING...' : 'ACTIVATE LOCK'}
                                    </button>
                                    <button onClick={() => setShowPinSetup(false)} className="h-16 px-8 border border-white/10 rounded-2xl font-black uppercase text-[10px] tracking-widest text-text-muted">CANCEL</button>
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
        <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-black">
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

            <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative px-5 py-12 md:px-8 md:py-24 max-w-4xl mx-auto pb-40">
                {/* Header Section */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
                                <Cpu size={24} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-text-muted">Settings</span>
                        </div>
                        <h1 className="text-xl font-black tracking-[-0.04em] leading-none mb-1 transition-all text-white uppercase">
                            Settings
                        </h1>
                        <p className="text-[8px] font-semibold text-text-muted uppercase tracking-[0.4em] opacity-60">System Preferences</p>
                    </div>

                    <button
                        onClick={toggleTheme}
                        className="w-16 h-16 rounded-[1.8rem] bg-white/5 border border-white/10 flex items-center justify-center text-white hover:border-primary hover:text-primary transition-all group"
                    >
                        {theme === 'dark' ? <Sun size={24} className="group-hover:rotate-90 transition-transform duration-500" /> : <Moon size={24} />}
                    </button>
                </header>

                {/* Active Wallet Hub */}
                {isConnected && (
                    <section className="mb-12">
                        <div className="flex items-center gap-3 mb-6 px-4">
                            <Database size={16} className="text-primary" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">Google Spreadsheet</h3>
                        </div>
                        <div className="p-6 md:p-8 rounded-[2.2rem] md:rounded-[3rem] bg-[#050505] border border-white/10 shadow-3xl">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                                <div className="flex items-center gap-6">
                                    <div className="w-20 h-20 rounded-[2rem] bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                                        <FileSpreadsheet size={32} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black uppercase tracking-tighter text-white">{currentSheetName}</h3>
                                        <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] opacity-40 mt-1 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">ID: {config.spreadsheetId}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setShowSheetList(!showSheetList); if (!showSheetList && spreadsheets.length === 0) fetchSheets(); }}
                                    className={`h-14 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border shrink-0
                                    ${showSheetList ? 'bg-primary border-primary text-black' : 'bg-white/5 text-text-muted border-white/10 hover:border-primary hover:text-white'}`}
                                >
                                    {showSheetList ? 'CLOSE' : 'SWITCH SPREADSHEET'}
                                </button>
                            </div>

                            <AnimatePresence>
                                {showSheetList && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-12 pt-8 border-t border-white/5 overflow-hidden">
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
                                                    ${sheet.id === config.spreadsheetId ? 'bg-primary/5 border-primary/40' : 'bg-white/[0.03] border-white/5 hover:border-white/20'}`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${sheet.isLaksh ? 'bg-primary/20 text-primary' : 'bg-white/10 text-white/40'}`}>
                                                            {sheet.isLaksh ? <Check size={20} /> : <FileSpreadsheet size={18} />}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black uppercase text-white tracking-tight">{sheet.name}</p>
                                                            <p className="text-[8px] font-black text-text-muted uppercase tracking-widest">{sheet.isLaksh ? 'LAKSH PRIMARY' : 'GOOGLE DRIVE FILE'}</p>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                            <button onClick={createFinanceSheet} className="p-6 rounded-[1.8rem] border-2 border-dashed border-white/10 text-text-muted hover:border-primary/50 hover:text-primary transition-all flex items-center justify-center gap-3">
                                                <Plus size={20} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">CONNECT NEW SPREADSHEET</span>
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </section>
                )}

                {/* Automation & UI Layer */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    <button onClick={() => setShowSMSRules(true)} className="p-6 md:p-8 rounded-[1.8rem] md:rounded-[2.5rem] bg-[#050505] border border-white/5 flex flex-col justify-between min-h-[160px] hover:border-white/20 transition-all text-left">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                            <Zap size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tighter text-white">Smart Rules</h3>
                            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mt-1">SMS AUTO DETECTION ENGINE</p>
                        </div>
                    </button>

                    <Link to="/categories" className="p-6 md:p-8 rounded-[1.8rem] md:rounded-[2.5rem] bg-[#050505] border border-white/5 flex flex-col justify-between min-h-[160px] hover:border-white/20 transition-all">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white mb-4">
                            <User size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tighter text-white">Categories</h3>
                            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mt-1">MANAGE CATEGORIES</p>
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
                    <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 flex flex-col md:flex-row justify-between md:items-center gap-8 group">
                        <div className="flex items-center gap-6">
                            <div className={`w-16 h-16 rounded-[1.8rem] flex items-center justify-center transition-all ${isConnected ? 'bg-primary text-black' : 'bg-rose-500/10 text-rose-500'}`}>
                                {isConnected ? <Cloud size={28} /> : <WifiOff size={28} />}
                            </div>
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tighter text-white">{isGuest ? 'LOCAL_ISOLATION_ACTIVE' : isConnected ? 'SYNCHRONIZED' : 'CONNECTION_OFFLINE'}</h3>
                                {lastSyncTime && <p className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em] mt-1">LAST_SYNC: {new Date(lastSyncTime).toLocaleTimeString()}</p>}
                            </div>
                        </div>
                        <div className="flex gap-3">
                            {isConnected ? (
                                <>
                                    <button onClick={forceRefresh} className="h-12 px-6 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-text-muted hover:bg-white/5">FORCE_REFRESH</button>
                                    <button onClick={disconnect} className="h-12 px-6 rounded-xl border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/10">DISCONNECT</button>
                                </>
                            ) : (
                                <Link to="/welcome" className="h-12 px-10 rounded-xl bg-primary text-black text-[10px] font-black uppercase tracking-widest flex items-center justify-center shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]">INITIALIZE_SYNC</Link>
                            )}
                        </div>
                    </div>
                </section>

                {/* Notifications & Data Management */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
                    <section>
                        <div className="flex items-center gap-3 mb-6 px-4">
                            <Bell size={16} className="text-primary" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">Broadcasts</h3>
                        </div>
                        <div className="p-8 rounded-[2.5rem] bg-[#050505] border border-white/5 h-full">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-lg font-black uppercase text-white">Bill Reminders</h3>
                                    <p className="text-[9px] font-black uppercase text-text-muted tracking-widest mt-1">TEMPORAL PROXIMITY ALERTS</p>
                                </div>
                                <button onClick={() => {
                                    const newState = !notifyEnabled;
                                    if (newState) Notification.requestPermission().then(p => { if (p === 'granted') { storage.set(STORAGE_KEYS.NOTIFY_ENABLED, 'true'); setNotifyEnabled(true); window.dispatchEvent(new Event('storage')); } });
                                    else { storage.set(STORAGE_KEYS.NOTIFY_ENABLED, 'false'); setNotifyEnabled(false); window.dispatchEvent(new Event('storage')); }
                                }} className={`w-14 h-8 rounded-full p-1 transition-all ${notifyEnabled ? 'bg-primary' : 'bg-white/10'}`}>
                                    <div className={`w-6 h-6 rounded-full bg-white transform transition-transform ${notifyEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            </div>
                            {notifyEnabled && (
                                <div className="space-y-6 pt-6 border-t border-white/5">
                                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-text-muted">
                                        <span>THRESHOLD</span>
                                        <span className="text-primary">{notifyDays} DAYS</span>
                                    </div>
                                    <input type="range" min="1" max="14" value={notifyDays} onChange={e => {
                                        const val = parseInt(e.target.value); setNotifyDays(val); storage.set(STORAGE_KEYS.NOTIFY_DAYS, val); window.dispatchEvent(new Event('storage'));
                                    }} className="w-full h-1 bg-white/10 appearance-none cursor-pointer accent-primary rounded-full transition-all" />
                                </div>
                            )}
                        </div>
                    </section>

                    <section>
                        <div className="flex items-center gap-3 mb-6 px-4">
                            <Save size={16} className="text-primary" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">Vault Storage</h3>
                        </div>
                        <div className="p-8 rounded-[2.5rem] bg-[#050505] border border-white/5 h-full space-y-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-black uppercase text-white">Full Backup</h3>
                                    <p className="text-[9px] font-black uppercase text-text-muted tracking-widest mt-1">JSON PERSISTENCE LAYER</p>
                                </div>
                                <button onClick={exportData} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-all"><Download size={20} /></button>
                            </div>
                            <div className="flex items-center justify-between pt-8 border-t border-white/5">
                                <div>
                                    <h3 className="text-lg font-black uppercase text-white">Restore Point</h3>
                                    <p className="text-[9px] font-black uppercase text-text-muted tracking-widest mt-1">RECOVER FROM FILE</p>
                                </div>
                                <label className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary cursor-pointer hover:bg-white/10 transition-all">
                                    <Plus size={20} />
                                    <input type="file" accept=".json" className="hidden" onChange={async e => {
                                        const file = e.target.files[0]; if (!file) return;
                                        const reader = new FileReader(); reader.onload = async event => {
                                            if (await importData(event.target.result)) { alert('System Restored'); window.location.reload(); }
                                        }; reader.readAsText(file);
                                    }} />
                                </label>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Footer Trace */}
                <div className="text-center pt-20">
                    <p className="text-[9px] font-black uppercase tracking-[1em] text-text-muted/20">LAKSH_OS_CORE_V2.5.0</p>
                </div>
            </motion.main>

            <SMSRulesManager isOpen={showSMSRules} onClose={() => setShowSMSRules(false)} />
        </div>
    );
};

export default Settings;
