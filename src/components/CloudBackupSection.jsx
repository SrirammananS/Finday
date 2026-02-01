// Cloud Backup Section - WhatsApp-style One-Touch Backup UI
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, CloudOff, RefreshCw, Download, Upload, User, LogOut, Shield, CheckCircle2, AlertCircle, Smartphone, ExternalLink } from 'lucide-react';
import { cloudBackup } from '../services/cloudBackup';
import { useFeedback } from '../context/FeedbackContext';


// Detect if running in Android WebView
const isAndroidWebView = () => {
    const ua = navigator.userAgent || '';
    return ua.includes('wv') || 
           (ua.includes('Android') && ua.includes('Version/')) ||
           window.AndroidBridge !== undefined;
};

const CloudBackupSection = ({ onDataRestored, getData }) => {
    const [isWebView] = useState(isAndroidWebView());
    const { toast } = useFeedback();
    const isMountedRef = useRef(true);
    const timeoutRefs = useRef([]);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [backupStatus, setBackupStatus] = useState('idle'); // idle, backing_up, restoring, success, error
    const [lastBackupTime, setLastBackupTime] = useState(null);
    const [backupInfo, setBackupInfo] = useState(null);
    const [error, setError] = useState(null);

    // Cleanup function for timeouts
    const addTimeout = (timeoutId) => {
        timeoutRefs.current.push(timeoutId);
    };

    const clearAllTimeouts = () => {
        timeoutRefs.current.forEach(clearTimeout);
        timeoutRefs.current = [];
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            clearAllTimeouts();
        };
    }, []);

    // Initialize cloud backup service
    useEffect(() => {
        const init = async () => {
            try {
                await cloudBackup.init();
                setIsInitialized(true);
                if (cloudBackup.isSignedIn()) {
                    setIsSignedIn(true);
                    setUser(cloudBackup.getUser());
                    setLastBackupTime(cloudBackup.getLastBackupTime());
                    // Fetch backup info
                    const info = await cloudBackup.getBackupInfo();
                    setBackupInfo(info);
                }
            } catch (e) {
                console.error('[CloudBackup] Init failed:', e);
                setError('Failed to initialize backup service');
            } finally {
                setIsLoading(false);
            }
        };
        init();

        // Subscribe to backup status changes
        const unsubscribe = cloudBackup.subscribe((status) => {
            switch (status.type) {
                case 'signed_in':
                    setIsSignedIn(true);
                    setUser(status.user);
                    toast('Signed in successfully');
                    break;
                case 'signed_out':
                    setIsSignedIn(false);
                    setUser(null);
                    setBackupInfo(null);
                    break;
                case 'backup_started':
                    setBackupStatus('backing_up');
                    break;
                case 'backup_completed':
                    if (!isMountedRef.current) return;
                    setBackupStatus('success');
                    setLastBackupTime(status.timestamp);
                    toast('Backup completed');
                    const timeout1 = setTimeout(() => {
                        if (isMountedRef.current) setBackupStatus('idle');
                    }, 3000);
                    addTimeout(timeout1);
                    break;
                case 'backup_failed':
                    if (!isMountedRef.current) return;
                    setBackupStatus('error');
                    setError(status.error);
                    toast('Backup failed', 'error');
                    const timeout2 = setTimeout(() => {
                        if (isMountedRef.current) setBackupStatus('idle');
                    }, 3000);
                    addTimeout(timeout2);
                    break;
                case 'restore_started':
                    setBackupStatus('restoring');
                    break;
                case 'restore_completed':
                    if (!isMountedRef.current) return;
                    setBackupStatus('success');
                    if (status.data && onDataRestored) {
                        onDataRestored(status.data);
                        toast('Data restored from backup');
                    }
                    const timeout3 = setTimeout(() => {
                        if (isMountedRef.current) setBackupStatus('idle');
                    }, 3000);
                    addTimeout(timeout3);
                    break;
                case 'restore_failed':
                    if (!isMountedRef.current) return;
                    setBackupStatus('error');
                    setError(status.error);
                    toast('Restore failed', 'error');
                    const timeout4 = setTimeout(() => {
                        if (isMountedRef.current) setBackupStatus('idle');
                    }, 3000);
                    addTimeout(timeout4);
                    break;
            }
        });

        return () => unsubscribe();
    }, [toast, onDataRestored]);

    const handleSignIn = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const userInfo = await cloudBackup.signIn();
            setUser(userInfo);
            setIsSignedIn(true);

            // Check for existing backup
            const info = await cloudBackup.getBackupInfo();
            setBackupInfo(info);
        } catch (e) {
            setError(e.message || 'Sign in failed');
            toast('Sign in failed', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignOut = () => {
        cloudBackup.signOut();
        setIsSignedIn(false);
        setUser(null);
        setBackupInfo(null);
        setLastBackupTime(null);
    };

    const handleBackup = async () => {
        if (!getData) return;
        setError(null);
        try {
            const data = await getData();
            await cloudBackup.createBackup(data);
            const info = await cloudBackup.getBackupInfo();
            setBackupInfo(info);
        } catch (e) {
            setError(e.message || 'Backup failed');
        }
    };

    const handleRestore = async () => {
        setError(null);
        try {
            await cloudBackup.restoreBackup();
        } catch (e) {
            setError(e.message || 'Restore failed');
        }
    };

    const formatDate = (date) => {
        if (!date) return 'Never';
        return new Date(date).toLocaleString();
    };

    const formatSize = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Show WebView-specific UI - Google Sign-In doesn't work in WebView
    if (isWebView) {
        return (
            <section className="mb-8">
                <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-4 ml-2">Cloud Backup</h3>
                <div className="modern-card p-6 md:p-8">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-orange-500/20 flex items-center justify-center">
                            <Smartphone size={28} className="text-orange-500" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-text-main">Cloud Backup</h3>
                            <p className="text-xs text-text-muted">Not available in native app</p>
                        </div>
                    </div>
                    <div className="p-4 bg-canvas-subtle rounded-xl space-y-3">
                        <p className="text-sm text-text-muted">
                            Google Sign-In requires a browser. To backup your data:
                        </p>
                        <ol className="text-sm text-text-muted list-decimal list-inside space-y-1">
                            <li>Open <strong className="text-text-main">finma-ea199.web.app</strong> in Chrome</li>
                            <li>Go to Settings → Cloud Backup</li>
                            <li>Sign in and create a backup</li>
                        </ol>
                        <a
                            href="https://finma-ea199.web.app/settings"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2"
                        >
                            <ExternalLink size={18} />
                            Open in Browser
                        </a>
                    </div>
                    <p className="text-xs text-text-muted mt-3 text-center">
                        💡 Your SMS transactions are stored locally on this device
                    </p>
                </div>
            </section>
        );
    }

    // No OAuth Client ID configured - show setup instructions
    if (!OAUTH_CLIENT_ID) {
        return (
            <section className="mb-8">
                <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-4 ml-2">Cloud Backup</h3>
                <div className="modern-card p-6 md:p-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-canvas-subtle flex items-center justify-center text-text-muted">
                            <CloudOff size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-text-main">Backup Not Configured</h3>
                            <p className="text-xs text-text-muted">
                                Cloud backup requires configuration. Contact support.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    // Loading state
    if (isLoading && !isInitialized) {
        return (
            <section className="mb-8">
                <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-4 ml-2">Cloud Backup</h3>
                <div className="modern-card p-6 md:p-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-canvas-subtle flex items-center justify-center">
                            <RefreshCw size={24} className="text-text-muted animate-spin" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-text-main">Initializing...</h3>
                            <p className="text-xs text-text-muted">Setting up cloud backup</p>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    // Not signed in - show sign in button
    if (!isSignedIn) {
        return (
            <section className="mb-8">
                <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-4 ml-2">Cloud Backup</h3>
                <div className="modern-card p-6 md:p-8">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-canvas-subtle flex items-center justify-center text-text-muted">
                            <Cloud size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-text-main">One-Touch Cloud Backup</h3>
                            <p className="text-xs text-text-muted">
                                Sign in with Google to enable automatic encrypted backups
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-start gap-3 text-xs text-text-muted">
                            <Shield size={16} className="text-primary mt-0.5 flex-shrink-0" />
                            <span>Your data is encrypted before leaving your device. Only you can read your backups.</span>
                        </div>

                        <button
                            onClick={handleSignIn}
                            disabled={isLoading}
                            className="w-full modern-btn modern-btn-primary py-4 flex items-center justify-center gap-3"
                        >
                            {isLoading ? (
                                <RefreshCw size={20} className="animate-spin" />
                            ) : (
                                <>
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                    </svg>
                                    Sign in with Google
                                </>
                            )}
                        </button>

                        {error && (
                            <p className="text-xs text-destructive text-center">{error}</p>
                        )}
                    </div>
                </div>
            </section>
        );
    }

    // Signed in - show backup controls
    return (
        <section className="mb-8">
            <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-4 ml-2">Cloud Backup</h3>
            <div className="modern-card p-6 md:p-8 space-y-6">
                {/* User info */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {user?.picture ? (
                            <img
                                src={user.picture}
                                alt={user.name}
                                className="w-12 h-12 rounded-2xl"
                            />
                        ) : (
                            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground">
                                <User size={24} />
                            </div>
                        )}
                        <div>
                            <h3 className="text-lg font-bold text-text-main">{user?.name || 'Signed In'}</h3>
                            <p className="text-xs text-text-muted">{user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="p-2 text-text-muted hover:text-destructive transition-colors"
                        title="Sign out"
                    >
                        <LogOut size={20} />
                    </button>
                </div>

                {/* Backup status */}
                <div className="bg-canvas-subtle rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-text-muted">Last Backup</span>
                        <AnimatePresence mode="wait">
                            {backupStatus === 'success' && (
                                <motion.span
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex items-center gap-1 text-xs text-green-500"
                                >
                                    <CheckCircle2 size={14} />
                                    Success
                                </motion.span>
                            )}
                            {backupStatus === 'error' && (
                                <motion.span
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex items-center gap-1 text-xs text-destructive"
                                >
                                    <AlertCircle size={14} />
                                    Failed
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </div>
                    <p className="text-lg font-bold text-text-main">
                        {backupInfo?.lastModified ? formatDate(backupInfo.lastModified) : (lastBackupTime ? formatDate(lastBackupTime) : 'Never')}
                    </p>
                    {backupInfo?.size && (
                        <p className="text-xs text-text-muted mt-1">Size: {formatSize(backupInfo.size)}</p>
                    )}
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={handleBackup}
                        disabled={backupStatus === 'backing_up' || backupStatus === 'restoring'}
                        className="modern-btn modern-btn-primary py-4 flex items-center justify-center gap-2"
                    >
                        {backupStatus === 'backing_up' ? (
                            <>
                                <RefreshCw size={18} className="animate-spin" />
                                Backing up...
                            </>
                        ) : (
                            <>
                                <Upload size={18} />
                                Backup Now
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleRestore}
                        disabled={backupStatus === 'backing_up' || backupStatus === 'restoring' || !backupInfo}
                        className="modern-btn modern-btn-ghost py-4 flex items-center justify-center gap-2"
                    >
                        {backupStatus === 'restoring' ? (
                            <>
                                <RefreshCw size={18} className="animate-spin" />
                                Restoring...
                            </>
                        ) : (
                            <>
                                <Download size={18} />
                                Restore
                            </>
                        )}
                    </button>
                </div>

                {/* Security notice */}
                <div className="flex items-start gap-3 text-xs text-text-muted bg-canvas-subtle rounded-xl p-4">
                    <Shield size={16} className="text-primary mt-0.5 flex-shrink-0" />
                    <span>
                        Your backups are encrypted with a key derived from your Google account. 
                        Only this device can decrypt your data.
                    </span>
                </div>

                {error && (
                    <p className="text-xs text-destructive text-center">{error}</p>
                )}
            </div>
        </section>
    );
};

export default CloudBackupSection;
