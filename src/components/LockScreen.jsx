import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Fingerprint, Lock, KeyRound } from 'lucide-react';
import { biometricAuth } from '../services/biometricAuth';

const LockScreen = ({ onUnlock }) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [showPinInput, setShowPinInput] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    useEffect(() => {
        // Try biometric on mount if supported
        if (biometricAuth.isSupported && !showPinInput) {
            handleBiometricAuth();
        } else {
            setShowPinInput(true);
        }
    }, []);

    const handleBiometricAuth = async () => {
        setIsAuthenticating(true);
        const result = await biometricAuth.authenticate();
        setIsAuthenticating(false);

        if (result.success) {
            onUnlock();
        } else if (result.requirePin || !biometricAuth.isSupported) {
            setShowPinInput(true);
        } else {
            setError(result.reason || 'Authentication failed');
        }
    };

    const handlePinSubmit = (e) => {
        e.preventDefault();
        if (biometricAuth.verifyPIN(pin)) {
            onUnlock();
        } else {
            setError('Incorrect PIN');
            setPin('');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[99999] bg-canvas flex flex-col items-center justify-center p-6"
        >
            <div className="text-center max-w-xs">
                {/* Logo */}
                <h1 className="text-4xl font-black tracking-tighter text-text-main mb-2">
                    FinDay<span className="text-primary">.</span>
                </h1>
                <p className="text-xs text-text-muted uppercase tracking-widest mb-12">App Locked</p>

                {/* Lock Icon */}
                <div className="w-24 h-24 rounded-full bg-canvas-subtle border border-card-border flex items-center justify-center mx-auto mb-8">
                    <Lock size={40} className="text-text-muted" />
                </div>

                {showPinInput ? (
                    <form onSubmit={handlePinSubmit} className="space-y-4">
                        <div className="relative">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
                            <input
                                type="password"
                                value={pin}
                                onChange={(e) => { setPin(e.target.value); setError(''); }}
                                placeholder="Enter PIN"
                                maxLength={6}
                                autoFocus
                                className="w-full bg-canvas-subtle border border-card-border py-4 pl-12 pr-4 rounded-2xl text-center text-2xl font-bold tracking-[0.5em] outline-none focus:border-primary text-text-main"
                            />
                        </div>
                        {error && <p className="text-xs text-destructive">{error}</p>}
                        <button
                            type="submit"
                            className="w-full modern-btn modern-btn-primary py-4"
                        >
                            Unlock
                        </button>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <button
                            onClick={handleBiometricAuth}
                            disabled={isAuthenticating}
                            className="w-full bg-canvas-subtle border border-card-border py-6 rounded-2xl flex flex-col items-center gap-3 hover:border-primary transition-all"
                        >
                            <Fingerprint size={32} className={isAuthenticating ? 'text-primary animate-pulse' : 'text-text-muted'} />
                            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                                {isAuthenticating ? 'Authenticating...' : 'Tap to Unlock'}
                            </span>
                        </button>
                        {biometricAuth.hasPIN() && (
                            <button
                                onClick={() => setShowPinInput(true)}
                                className="text-xs text-text-muted hover:text-primary transition-colors"
                            >
                                Use PIN instead
                            </button>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default LockScreen;
