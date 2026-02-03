import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Wallet,
    Cloud,
    FileSpreadsheet,
    Sparkles,
    Loader2,
    ArrowRight,
    Smartphone,
    RefreshCw,
    Save,
    Plus,
    Check,
    Cpu,
    Shield,
    Activity,
    Globe,
    ExternalLink
} from 'lucide-react';
import { sheetsService } from '../services/sheets';
import { useFinance } from '../context/FinanceContext';
import { storage, STORAGE_KEYS } from '../services/storage';

const Welcome = () => {
    const navigate = useNavigate();
    const { isConnected, isLoading: contextLoading, updateConfig, createFinanceSheet, setGuestMode, forceRefresh, refreshData, config } = useFinance();
    const [step, setStep] = useState('welcome');
    const [spreadsheets, setSpreadsheets] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [hasCredentials, setHasCredentials] = useState(false);
    const [redirectAttempted, setRedirectAttempted] = useState(false);
    const [copyStatus, setCopyStatus] = useState('');
    const [showUrl, setShowUrl] = useState(false);
    const [successUrl, setSuccessUrl] = useState('');

    const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    const isAndroidWebView = () => {
        const ua = navigator.userAgent;
        return /Android/i.test(ua) && /wv/i.test(ua);
    };

    useEffect(() => {
        // Check if OAuth callback requires refresh
        const checkOAuthRefresh = async () => {
            const refreshRequired = localStorage.getItem('oauth_refresh_required');
            if (refreshRequired === 'true' && config?.spreadsheetId) {
                console.log('[Welcome] OAuth refresh detected, triggering data load...');
                localStorage.removeItem('oauth_refresh_required');
                try {
                    await refreshData(config.spreadsheetId, true);
                } catch (err) {
                    console.error('[Welcome] OAuth refresh failed:', err);
                }
            }
        };

        const preInit = async () => {
            await checkOAuthRefresh();
            const savedId = storage.get(STORAGE_KEYS.SPREADSHEET_ID);
            const savedToken = localStorage.getItem('google_access_token');
            const everConnected = localStorage.getItem('laksh_ever_connected');

            if (savedId && savedToken && everConnected === 'true' && !redirectAttempted) {
                setHasCredentials(true);
                setRedirectAttempted(true);
                navigate('/', { replace: true });
                return;
            }

            if (savedToken && !savedId && !isLoading && step === 'welcome') {
                setIsLoading(true);
                try {
                    await sheetsService.init();
                    const sheets = await sheetsService.listSpreadsheets();
                    if (isMountedRef.current) {
                        setSpreadsheets(sheets);
                        setStep('select');
                    }
                } catch (err) {
                    console.error('[LAKSH] Auto-load sheets failed:', err);
                } finally {
                    if (isMountedRef.current) setIsLoading(false);
                }
            }
        };
        preInit();
    }, [navigate, redirectAttempted, isLoading]);

    const handleSignIn = async () => {
        if (!CLIENT_ID) {
            setError('Google Client ID not configured.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            await sheetsService.signIn();
            if (!isMountedRef.current) return;
            await sheetsService.init();
            const sheets = await sheetsService.listSpreadsheets();
            if (isMountedRef.current) {
                setSpreadsheets(sheets);
                setStep('select');
            }
        } catch (err) {
            if (isMountedRef.current) {
                setError(err.message || 'Sign in failed.');
                setStep('welcome');
            }
        } finally {
            if (isMountedRef.current) setIsLoading(false);
        }
    };

    const handleSelectSheet = async (sheet) => {
        setIsLoading(true);
        setError('');
        try {
            // Save credentials first
            storage.set(STORAGE_KEYS.SPREADSHEET_ID, sheet.id);
            storage.set(STORAGE_KEYS.SPREADSHEET_NAME, sheet.name);
            localStorage.setItem('laksh_spreadsheet_id', sheet.id);
            localStorage.setItem('laksh_ever_connected', 'true');

            // Update context
            updateConfig({ spreadsheetId: sheet.id });
            if (setGuestMode) setGuestMode(false);
            storage.remove(STORAGE_KEYS.GUEST_MODE);
            localStorage.removeItem('laksh_guest_mode');

            // Trigger data refresh before navigating
            console.log('[Welcome] Sheet selected, triggering refresh...');
            if (forceRefresh) {
                // Don't await - let it load in background
                forceRefresh().catch(e => console.log('[Welcome] Background refresh error:', e));
            }

            // Navigate immediately - ProtectedRoute will show content
            navigate('/', { replace: true });
        } catch (err) {
            if (isMountedRef.current) setError('Failed to connect.');
        } finally {
            if (isMountedRef.current) setIsLoading(false);
        }
    };

    const handleCreateNew = async () => {
        setIsLoading(true);
        setError('');
        try {
            const sheet = await createFinanceSheet();
            if (sheet && isMountedRef.current) {
                storage.set(STORAGE_KEYS.SPREADSHEET_ID, sheet.id);
                storage.set(STORAGE_KEYS.SPREADSHEET_NAME, sheet.name);
                localStorage.setItem('laksh_ever_connected', 'true');
                if (setGuestMode) setGuestMode(false);
                storage.remove(STORAGE_KEYS.GUEST_MODE);
                navigate('/', { replace: true });
            }
        } catch (err) {
            if (isMountedRef.current) {
                setError(err.message || 'Creation failed.');
                setStep('select');
            }
        } finally {
            if (isMountedRef.current) setIsLoading(false);
        }
    };

    const handleRefreshList = async () => {
        setIsLoading(true);
        setError('');
        try {
            await sheetsService.init();
            const sheets = await sheetsService.listSpreadsheets();
            if (isMountedRef.current) {
                setSpreadsheets(sheets);
            }
        } catch (err) {
            if (isMountedRef.current) setError('Failed to refresh list.');
        } finally {
            if (isMountedRef.current) setIsLoading(false);
        }
    };

    const handleProcessSuccessUrl = async (url) => {
        if (!url || !url.includes('access_token=')) {
            setError('Paste the FULL URL from Chrome.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const hashPart = url.includes('#') ? url.split('#')[1] : (url.includes('?') ? url.split('?')[1] : url);
            const params = new URLSearchParams(hashPart);
            const token = params.get('access_token');
            const expiresIn = params.get('expires_in');
            if (!token) throw new Error('Token not found');
            sheetsService.setAccessToken(token);
            localStorage.setItem('google_access_token', token);
            localStorage.setItem('google_token_expiry', String(Date.now() + (parseInt(expiresIn || '3600') * 1000)));
            await sheetsService.init();
            const sheets = await sheetsService.listSpreadsheets();
            setSpreadsheets(sheets);
            setStep('select');
        } catch (err) {
            setError('Bridge failed. Check URL.');
        } finally {
            setIsLoading(false);
        }
    };

    if (contextLoading || (hasCredentials && !redirectAttempted)) {
        return (
            <div className="min-h-screen bg-canvas flex items-center justify-center">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen text-text-main selection:bg-primary selection:text-black overflow-hidden relative">
            {/* Background handled by Layout */}

            <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6 md:p-12">
                <AnimatePresence mode="wait">
                    {/* Welcome Screen */}
                    {step === 'welcome' && (
                        <motion.div
                            key="welcome"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, y: -40 }}
                            className="w-full max-w-xl text-center"
                        >
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="mb-12"
                            >
                                <div className="w-32 h-32 mx-auto rounded-[3rem] bg-card border border-card-border flex items-center justify-center shadow-3xl relative group overflow-hidden">
                                    <div className="absolute inset-0 rounded-[3rem] bg-primary/20 blur group-hover:blur-xl transition-all opacity-0 group-hover:opacity-100" />
                                    <img src="/mascot.png" alt="Laksh Mascot" className="w-full h-full object-cover relative z-10 p-1" />
                                </div>
                                <h1 className="text-4xl md:text-5xl font-extrabold tracking-[-0.04em] mt-10 leading-none text-text-main">
                                    LAKSH
                                </h1>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.6em] text-text-muted mt-4 opacity-50">FINANCE MANAGER</p>
                            </motion.div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-12">
                                {[
                                    { icon: <Sparkles size={18} />, label: 'AI ENGINE' },
                                    { icon: <Globe size={18} />, label: 'CLOUD SYNC' },
                                    { icon: <Shield size={18} />, label: 'ZERO TRUST' }
                                ].map((feature, i) => (
                                    <div key={i} className="p-6 rounded-3xl bg-canvas-subtle border border-card-border flex flex-col items-center gap-3">
                                        <div className="text-primary">{feature.icon}</div>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-text-muted">{feature.label}</span>
                                    </div>
                                ))}
                            </div>

                            {error && <p className="mb-6 text-rose-500 text-[10px] font-black uppercase tracking-widest">{error}</p>}

                            <div className="space-y-4">
                                {isAndroidWebView() ? (
                                    <div className="space-y-6">
                                        <button onClick={handleSignIn} disabled={isLoading} className="w-full h-20 bg-primary text-black rounded-[2rem] font-black uppercase tracking-widest text-lg shadow-[0_0_50px_rgba(var(--primary-rgb),0.3)] flex items-center justify-center gap-4">
                                            {isLoading ? <Loader2 className="animate-spin" /> : <Cloud />}
                                            {isLoading ? 'INITIATING...' : 'SYNC GOOGLE ACCOUNT'}
                                        </button>
                                        <div className="p-8 rounded-[2.5rem] bg-canvas-subtle border border-card-border text-left">
                                            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-4">Manual Connection</h4>
                                            <p className="text-[10px] text-text-muted leading-relaxed uppercase font-black opacity-40 mb-6">If automatic handshake fails, copy the auth signal from Chrome mirror:</p>
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button onClick={async () => { if (await sheetsService.handleCopyLink()) { setCopyStatus('COPIED'); setTimeout(() => setCopyStatus(''), 2000); } else setShowUrl(true); }} className="h-14 rounded-2xl border border-card-border bg-canvas-subtle text-[9px] font-black uppercase tracking-widest hover:border-primary transition-all">
                                                        {copyStatus || 'COPY LINK'}
                                                    </button>
                                                    <a href={sheetsService.getAuthUrl().replace('https://', 'intent://') + '#Intent;scheme=https;action=android.intent.action.VIEW;package=com.android.chrome;end'} className="h-14 rounded-2xl border border-card-border bg-canvas-subtle text-[9px] font-black uppercase tracking-widest hover:border-primary transition-all flex items-center justify-center gap-2 text-text-main">
                                                        CHROME <ExternalLink size={12} />
                                                    </a>
                                                </div>
                                                <div className="relative">
                                                    <input type="text" value={successUrl} onChange={e => setSuccessUrl(e.target.value)} placeholder="PASTE URL HERE..." className="w-full h-16 bg-black border border-white/10 rounded-2xl px-6 text-[10px] font-black uppercase tracking-widest focus:border-primary outline-none text-white" />
                                                    <button onClick={() => handleProcessSuccessUrl(successUrl)} disabled={!successUrl || isLoading} className="mt-3 w-full h-14 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">CONNECT ACCOUNT</button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Guest Mode for Android - More Prominent */}
                                        <div className="mt-6 pt-6 border-t border-white/10">
                                            <p className="text-center text-[10px] text-text-muted/60 uppercase tracking-widest mb-4">
                                                Or continue without account
                                            </p>
                                            <button
                                                onClick={() => {
                                                    storage.set(STORAGE_KEYS.GUEST_MODE, 'true');
                                                    storage.set(STORAGE_KEYS.EVER_CONNECTED, 'true');
                                                    localStorage.setItem('laksh_ever_connected', 'true');
                                                    localStorage.setItem('laksh_guest_mode', 'true');
                                                    if (setGuestMode) setGuestMode(true);
                                                    navigate('/', { replace: true });
                                                }}
                                                className="w-full h-16 bg-gradient-to-r from-violet-600/20 to-purple-600/20 border border-violet-500/30 rounded-[1.8rem] text-sm font-black uppercase tracking-widest text-violet-300 hover:border-violet-500/50 hover:from-violet-600/30 hover:to-purple-600/30 transition-all flex items-center justify-center gap-3"
                                            >
                                                <span className="text-lg">👤</span>
                                                GUEST MODE
                                            </button>
                                            <p className="text-center text-[9px] text-text-muted/40 mt-2">
                                                Track expenses locally • No sign-in required
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <button onClick={handleSignIn} disabled={isLoading} className="w-full h-20 bg-primary text-black rounded-[2rem] font-black uppercase tracking-widest text-lg shadow-[0_0_50px_rgba(var(--primary-rgb),0.3)] flex items-center justify-center gap-4 transition-all hover:scale-[1.02]">
                                            <Cloud strokeWidth={3} />
                                            SYNC GOOGLE CLOUD
                                        </button>

                                        {/* Guest Mode */}
                                        <div className="pt-4 border-t border-card-border">
                                            <button
                                                onClick={() => {
                                                    storage.set(STORAGE_KEYS.GUEST_MODE, 'true');
                                                    storage.set(STORAGE_KEYS.EVER_CONNECTED, 'true');
                                                    localStorage.setItem('laksh_guest_mode', 'true');
                                                    localStorage.setItem('laksh_ever_connected', 'true');
                                                    if (setGuestMode) setGuestMode(true);
                                                    navigate('/', { replace: true });
                                                }}
                                                className="w-full h-16 bg-gradient-to-r from-violet-600/20 to-purple-600/20 border border-violet-500/30 rounded-[1.8rem] text-sm font-black uppercase tracking-widest text-violet-300 hover:border-violet-500/50 transition-all flex items-center justify-center gap-3"
                                            >
                                                <span className="text-lg">👤</span>
                                                GUEST MODE
                                            </button>
                                            <p className="text-center text-[9px] text-text-muted/40 mt-2">
                                                Track expenses locally • No sign-in required
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* Select Spreadsheet Screen */}
                    {step === 'select' && (
                        <motion.div
                            key="select"
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -40 }}
                            className="w-full max-w-2xl"
                        >
                            <div className="flex justify-between items-end mb-12 px-4">
                                <div>
                                    <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-text-main leading-none">Records.</h3>
                                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-text-muted mt-2">LINKED_STORAGE_NODES</p>
                                </div>
                                <button onClick={handleRefreshList} disabled={isLoading} className="w-14 h-14 rounded-2xl bg-canvas-subtle border border-card-border flex items-center justify-center text-primary">
                                    <RefreshCw size={24} className={isLoading ? 'animate-spin' : ''} />
                                </button>
                            </div>

                            <div className="grid gap-4 max-h-[50vh] overflow-y-auto no-scrollbar pb-10">
                                {spreadsheets.map((sheet, idx) => (
                                    <motion.button
                                        key={sheet.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        onClick={() => handleSelectSheet(sheet)}
                                        className="p-8 rounded-[2.5rem] bg-card border border-card-border hover:border-primary/50 text-left transition-all flex items-center justify-between group"
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className="w-16 h-16 rounded-[1.5rem] bg-canvas-subtle border border-card-border flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-all">
                                                <FileSpreadsheet size={28} />
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-black uppercase tracking-tighter text-text-main group-hover:text-primary transition-colors">{sheet.name}</h4>
                                                <p className="text-[8px] font-black text-text-muted uppercase tracking-[0.3em] mt-1 opacity-40">NODE_ID: {sheet.id.substring(0, 20)}...</p>
                                            </div>
                                        </div>
                                        <ArrowRight className="text-text-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all" />
                                    </motion.button>
                                ))}

                                {spreadsheets.length === 0 && (
                                    <div className="py-20 text-center border-2 border-dashed border-card-border rounded-[2.5rem]">
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">NO SPREADSHEETS FOUND</p>
                                    </div>
                                )}
                            </div>

                            <div className="pt-10 flex flex-col gap-4">
                                <button onClick={handleCreateNew} disabled={isLoading} className="h-20 bg-canvas-subtle border-2 border-dashed border-card-border rounded-[2.5rem] flex items-center justify-center gap-4 text-text-main hover:border-primary/50 hover:bg-primary/5 transition-all">
                                    {isLoading ? <Loader2 className="animate-spin text-primary" /> : <Plus className="text-primary" />}
                                    <span className="text-lg font-black uppercase tracking-tighter">Create New Spreadsheet</span>
                                </button>
                                <button onClick={() => setStep('welcome')} className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted hover:text-text-main transition-colors">BACK</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="absolute bottom-10 text-[9px] font-black uppercase tracking-[1em] text-text-muted/20"
                >
                    COMPLIANCE_LEVEL_A1
                </motion.div>
            </div>
        </div>
    );
};

export default Welcome;
