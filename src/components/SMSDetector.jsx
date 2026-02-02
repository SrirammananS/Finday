import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Check, X, Edit2, Sparkles, AlertCircle } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { parseSMS, formatParsedTransaction, detectBank, getSuggestedAccount } from '../services/smsParser';
import BankAccountMapper from './BankAccountMapper';

const SMSDetector = ({ smsText, onClose, onSuccess }) => {
    const { accounts, categories, addTransaction } = useFinance();
    const [parsed, setParsed] = useState(null);
    const [form, setForm] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [showBankMapper, setShowBankMapper] = useState(false);
    const [detectedBank, setDetectedBank] = useState(null);

    useEffect(() => {
        if (smsText) {
            const result = parseSMS(smsText, accounts);
            setParsed(result);

            if (result) {
                // Check if we need bank mapping
                if (result.needsBankMapping) {
                    setDetectedBank(result.detectedBank);
                    setShowBankMapper(true);
                } else {
                    const formatted = formatParsedTransaction(result, accounts);
                    setForm(formatted);
                }
            }
        }
    }, [smsText, accounts]);

    const handleBankMapping = (selectedAccount, remembered) => {
        if (selectedAccount && parsed) {
            // Update the parsed result with selected account
            const updatedParsed = { ...parsed, accountId: selectedAccount.id };
            const formatted = formatParsedTransaction(updatedParsed, accounts);
            setForm(formatted);
            setShowBankMapper(false);
        } else {
            // User skipped mapping, use parsed data as-is
            const formatted = formatParsedTransaction(parsed, accounts);
            setForm(formatted);
            setShowBankMapper(false);
        }
    };

    const handleSave = async () => {
        if (!form) return;
        setIsSaving(true);
        setError(null);

        try {
            await addTransaction({
                date: form.date,
                description: form.description,
                amount: form.amount,
                category: form.category,
                accountId: form.accountId,
                type: form.type,
                friend: form.friend || ''
            });
            onSuccess?.();
            onClose();
        } catch (err) {
            setError('Failed to save transaction');
            setIsSaving(false);
        }
    };

    if (!parsed || !form) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    onClick={e => e.stopPropagation()}
                    className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-card-border rounded-2xl p-6 text-center mx-4"
                >
                    <AlertCircle size={48} className="mx-auto mb-4 text-text-muted" />
                    <h3 className="text-lg font-bold text-text-main mb-2">No Transaction Detected</h3>
                    <p className="text-sm text-text-muted mb-6">
                        Could not find transaction details in this message.
                    </p>
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-canvas-subtle border border-card-border rounded-xl font-bold text-text-muted"
                    >
                        Close
                    </button>
                </motion.div>
            </motion.div>
        );
    }

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md"
                onClick={onClose}
            >
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    onClick={e => e.stopPropagation()}
                    className="fixed bottom-0 left-0 right-0 w-full max-w-lg mx-auto bg-card border border-card-border rounded-t-3xl md:rounded-2xl overflow-hidden max-h-[85vh] overflow-y-auto md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-card-border bg-gradient-to-r from-primary/10 to-transparent">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                <Sparkles size={20} className="text-primary" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-text-main">Transaction Detected</h3>
                                <p className="text-xs text-text-muted">
                                    Confidence: {parsed.confidence}% • {form.type === 'expense' ? 'Expense' : 'Income'}
                                </p>
                            </div>
                        </div>

                        {/* Original SMS */}
                        <div className="bg-canvas-subtle/50 rounded-xl p-3 mt-4">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Original SMS</p>
                            <p className="text-xs text-text-muted line-clamp-3">{smsText}</p>
                        </div>
                    </div>

                    {/* Transaction Details */}
                    <div className="p-6 space-y-4">
                        {/* Amount Display */}
                        <div className="text-center py-4">
                            <p className={`text-5xl font-black ${form.type === 'expense' ? 'text-red-500' : 'text-primary'}`}>
                                {form.type === 'expense' ? '-' : '+'}₹{Math.abs(form.amount).toLocaleString()}
                            </p>
                        </div>

                        {isEditing ? (
                            /* Edit Mode */
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1 block">Description</label>
                                    <input
                                        type="text"
                                        value={form.description}
                                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                        className="w-full bg-canvas-subtle border border-card-border py-3 px-4 rounded-xl text-sm font-bold text-text-main outline-none focus:border-primary"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1 block">Category</label>
                                        <select
                                            value={form.category}
                                            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                            className="w-full bg-canvas-subtle border border-card-border py-3 px-4 rounded-xl text-sm font-bold text-text-main outline-none focus:border-primary"
                                        >
                                            {categories.map(c => (
                                                <option key={c.name} value={c.name}>{c.icon} {c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1 block">Account</label>
                                        <select
                                            value={form.accountId}
                                            onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}
                                            className="w-full bg-canvas-subtle border border-card-border py-3 px-4 rounded-xl text-sm font-bold text-text-main outline-none focus:border-primary"
                                        >
                                            {accounts.map(a => (
                                                <option key={a.id} value={a.id}>{a.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1 block">Date</label>
                                    <input
                                        type="date"
                                        value={form.date}
                                        onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                        className="w-full bg-canvas-subtle border border-card-border py-3 px-4 rounded-xl text-sm font-bold text-text-main outline-none focus:border-primary"
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="flex-1 py-3 border border-card-border rounded-xl text-text-muted font-bold"
                                    >
                                        Done Editing
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* View Mode */
                            <div className="space-y-3">
                                <div className="flex justify-between items-center p-3 bg-canvas-subtle rounded-xl">
                                    <span className="text-xs font-bold text-text-muted">Description</span>
                                    <span className="text-sm font-bold text-text-main">{form.description}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-canvas-subtle rounded-xl">
                                    <span className="text-xs font-bold text-text-muted">Category</span>
                                    <span className="text-sm font-bold text-text-main">
                                        {categories.find(c => c.name === form.category)?.icon} {form.category}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-canvas-subtle rounded-xl">
                                    <span className="text-xs font-bold text-text-muted">Account</span>
                                    <span className="text-sm font-bold text-text-main">
                                        {accounts.find(a => a.id === form.accountId)?.name || 'Select Account'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-canvas-subtle rounded-xl">
                                    <span className="text-xs font-bold text-text-muted">Date</span>
                                    <span className="text-sm font-bold text-text-main">{form.date}</span>
                                </div>

                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="w-full py-2 text-xs font-bold text-primary flex items-center justify-center gap-2"
                                >
                                    <Edit2 size={14} /> Edit Details
                                </button>
                            </div>
                        )}

                        {error && (
                            <p className="text-sm text-red-500 text-center">{error}</p>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="p-6 pt-0 flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 border border-card-border rounded-xl font-bold text-text-muted flex items-center justify-center gap-2"
                        >
                            <X size={18} /> Dismiss
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !form.accountId}
                            className="flex-1 py-4 bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <Check size={18} /> {isSaving ? 'Saving...' : 'Add Transaction'}
                        </button>
                    </div>
                </motion.div>
            </motion.div>

            {/* Bank Account Mapper Modal */}
            <BankAccountMapper
                isOpen={showBankMapper}
                onClose={() => setShowBankMapper(false)}
                detectedBank={detectedBank}
                accounts={accounts}
                onMappingComplete={handleBankMapping}
            />
        </>
    );
};

export default SMSDetector;
