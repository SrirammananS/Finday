import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Fingerprint, Lock, KeyRound } from 'lucide-react';
import { biometricAuth } from '../services/biometricAuth';

const LockScreen = ({ onUnlock }) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [showPinInput, setShowPinInput] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const isMountedRef = useRef(true);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        // Try biometric on mount if supported
        if (biometricAuth.isSupported && !showPinInput) {
            handleBiometricAuth();
        } else {
            setShowPinInput(true);
        }
    }, []);

    const handleBiometricAuth = async () => {
        if (!isMountedRef.current) return;
        setIsAuthenticating(true);
        const result = await biometricAuth.authenticate();
        if (!isMountedRef.current) return;
        setIsAuthenticating(false);

        if (result.success) {
            onUnlock();
        } else if (result.requirePin || !biometricAuth.isSupported) {
            setShowPinInput(true);
        } else {
            setError(result.reason || 'Authentication failed');
        }
    };

    const handlePinSubmit = async (e) => {
        e.preventDefault();
        if (!isMountedRef.current) return;
        setIsAuthenticating(true);
        try {
            const isValid = await biometricAuth.verifyPIN(pin);
            if (!isMountedRef.current) return;
            if (isValid) {
                onUnlock();
            } else {
                setError('Incorrect PIN');
                setPin('');
            }
        } catch (err) {
            if (isMountedRef.current) {
                setError('Verification failed');
                setPin('');
            }
        } finally {
            if (isMountedRef.current) {
                setIsAuthenticating(false);
            }
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[99999] flex flex-col items-center justify-center p-6"
        >
            <div className="w-full max-w-[320px] p-8 rounded-[3rem] bg-card backdrop-blur-xl border border-card-border shadow-3xl text-center relative overflow-hidden">
                {/* Logo */}
                <h1 className="text-4xl font-black tracking-[-0.05em] text-text-main mb-2">
                    LAKSH
                </h1>
                <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.4em] mb-12 opacity-60">Identity Verification</p>

                {/* Lock Icon */}
                <div className="w-24 h-24 rounded-[2rem] bg-canvas-subtle border border-card-border flex items-center justify-center mx-auto mb-10 shadow-inner">
                    <Lock size={32} className="text-text-muted" />
                </div>

                {showPinInput ? (
                    <form onSubmit={handlePinSubmit} className="space-y-6">
                        <div className="relative">
                            <KeyRound className="absolute left-6 top-1/2 -translate-y-1/2 text-text-muted opacity-50" size={20} />
                            <input
                                type="password"
                                value={pin}
                                onChange={(e) => { setPin(e.target.value); setError(''); }}
                                placeholder="******"
                                maxLength={6}
                                autoFocus
                                className="w-full bg-canvas-subtle border border-card-border py-5 pl-14 pr-6 rounded-2xl text-center text-3xl font-black tracking-[0.5em] outline-none focus:border-primary text-text-main placeholder:text-text-muted/10 transition-all"
                            />
                        </div>
                        {error && <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">{error}</p>}
                        <button
                            type="submit"
                            className="w-full h-16 bg-primary text-black rounded-2xl font-black uppercase tracking-widest text-xs hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.5)] transition-all"
                        >
                            Authorise
                        </button>
                    </form>
                ) : (
                    <div className="space-y-6">
                        <button
                            onClick={handleBiometricAuth}
                            disabled={isAuthenticating}
                            className="w-full bg-canvas-subtle border border-card-border py-8 rounded-[2.5rem] flex flex-col items-center gap-4 hover:bg-canvas-elevated hover:border-primary/50 transition-all group"
                        >
                            <Fingerprint size={48} className={`transition-all ${isAuthenticating ? 'text-primary animate-pulse scale-110' : 'text-text-muted group-hover:text-text-main group-hover:scale-110'}`} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted group-hover:text-text-main">
                                {isAuthenticating ? 'SCANNING...' : 'TAP TO SCAN'}
                            </span>
                        </button>
                        {biometricAuth.hasPIN() && (
                            <button
                                onClick={() => setShowPinInput(true)}
                                className="text-[9px] font-black text-text-muted uppercase tracking-widest hover:text-text-main transition-colors"
                            >
                                Switch to PIN Entry
                            </button>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default LockScreen;
