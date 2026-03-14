import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, X } from 'lucide-react';

const VaultPinModal = ({ isOpen, onClose, hasVaultMpin, onUnlock, onCreateAndUnlock }) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isCreate = !hasVaultMpin;
  const canSubmit = isCreate
    ? pin.length >= 4 && pin === confirmPin
    : pin.length >= 4;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!canSubmit) return;
    setLoading(true);
    try {
      const result = isCreate
        ? await onCreateAndUnlock(pin)
        : await onUnlock(pin);
      if (result.success) {
        setPin('');
        setConfirmPin('');
        onClose();
      } else {
        setError(result.error || 'Failed');
      }
    } catch (err) {
      setError(err?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPin('');
    setConfirmPin('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-2xl bg-card border border-card-border shadow-xl overflow-hidden"
        >
          <div className="p-6 border-b border-card-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center">
                <Lock size={20} className="text-primary" />
              </div>
              <div>
                <h2 className="text-base font-black text-text-main uppercase tracking-tight">
                  Vault {isCreate ? 'Set MPIN' : 'Enter MPIN'}
                </h2>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-0.5">
                  {isCreate ? 'Create a 4–8 digit code' : 'Unlock secret nodes'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-white/10 text-text-muted"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <p className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted block mb-2">
                MPIN
              </label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete={isCreate ? 'new-password' : 'off'}
                  maxLength={8}
                  value={pin}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '');
                    setPin(v);
                    setError('');
                  }}
                  placeholder="••••"
                  className="w-full bg-canvas border border-card-border rounded-xl py-3 px-4 pr-12 text-text-main font-mono text-lg tracking-[0.4em] placeholder:text-text-muted/50 focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPin((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main p-1"
                  aria-label={showPin ? 'Hide' : 'Show'}
                >
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {isCreate && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted block mb-2">
                  Confirm MPIN
                </label>
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="new-password"
                  maxLength={8}
                  value={confirmPin}
                  onChange={(e) => {
                    setConfirmPin(e.target.value.replace(/\D/g, ''));
                    setError('');
                  }}
                  placeholder="••••"
                  className="w-full bg-canvas border border-card-border rounded-xl py-3 px-4 text-text-main font-mono text-lg tracking-[0.4em] placeholder:text-text-muted/50 focus:outline-none focus:border-primary"
                />
                {confirmPin && pin !== confirmPin && (
                  <p className="text-[10px] font-bold text-rose-400 mt-1">Does not match</p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '…' : isCreate ? 'Set & Unlock' : 'Unlock'}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VaultPinModal;
