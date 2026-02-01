import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X, Check, AlertCircle } from 'lucide-react';
import smsParser from '../services/smsParser';

const BankAccountMapper = ({ isOpen, onClose, detectedBank, accounts, onMappingComplete }) => {
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [rememberChoice, setRememberChoice] = useState(true);

    const handleSave = () => {
        if (selectedAccountId && rememberChoice) {
            smsParser.saveBankAccountMapping(detectedBank, selectedAccountId);
        }
        
        const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);
        onMappingComplete(selectedAccount, rememberChoice);
        onClose();
    };

    const handleSkip = () => {
        onMappingComplete(null, false);
        onClose();
    };

    if (!isOpen || !detectedBank) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
                onClick={(e) => e.target === e.currentTarget && onClose()}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="w-full max-w-md bg-card-bg/95 backdrop-blur-md border border-card-border rounded-2xl shadow-2xl overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 border-b border-card-border bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                                    <MapPin size={20} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-text-main">Bank Account Mapping</h2>
                                    <p className="text-sm text-text-muted">SMS from {detectedBank}</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full bg-card-border/50 hover:bg-card-border transition-colors flex items-center justify-center"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4">
                        <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                            <AlertCircle size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                                    Smart SMS Mapping
                                </p>
                                <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-1">
                                    Which account should be used for future {detectedBank} transactions?
                                </p>
                            </div>
                        </div>

                        {/* Account Selection */}
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-text-main">Select Account</label>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {accounts.map((account) => (
                                    <label
                                        key={account.id}
                                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                            selectedAccountId === account.id
                                                ? 'border-primary bg-primary/10'
                                                : 'border-card-border hover:border-card-border/60'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="account"
                                            value={account.id}
                                            checked={selectedAccountId === account.id}
                                            onChange={(e) => setSelectedAccountId(e.target.value)}
                                            className="sr-only"
                                        />
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                            selectedAccountId === account.id
                                                ? 'border-primary bg-primary'
                                                : 'border-card-border'
                                        }`}>
                                            {selectedAccountId === account.id && (
                                                <div className="w-2 h-2 rounded-full bg-white" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <p className="font-semibold text-text-main">{account.name}</p>
                                                <span className="text-sm font-bold text-text-muted">
                                                    ₹{parseFloat(account.balance).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-xs text-text-muted capitalize">{account.type} Account</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Remember Choice */}
                        <label className="flex items-center gap-3 p-3 bg-canvas-subtle rounded-xl cursor-pointer">
                            <input
                                type="checkbox"
                                checked={rememberChoice}
                                onChange={(e) => setRememberChoice(e.target.checked)}
                                className="w-4 h-4 rounded border-card-border text-primary focus:ring-primary"
                            />
                            <div>
                                <p className="text-sm font-semibold text-text-main">Remember this choice</p>
                                <p className="text-xs text-text-muted">Automatically use this account for {detectedBank} SMS in the future</p>
                            </div>
                        </label>
                    </div>

                    {/* Actions */}
                    <div className="p-6 border-t border-card-border bg-canvas-subtle/50">
                        <div className="flex gap-3">
                            <button
                                onClick={handleSkip}
                                className="flex-1 px-4 py-3 bg-card-bg border border-card-border text-text-main rounded-xl font-semibold hover:bg-canvas-subtle transition-colors"
                            >
                                Skip
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!selectedAccountId}
                                className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <Check size={16} />
                                {rememberChoice ? 'Save & Remember' : 'Use Once'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default BankAccountMapper;