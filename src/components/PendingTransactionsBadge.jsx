/**
 * Pending Transactions Badge - Shows notification for detected transactions (SMS/Parsing)
 * UI: Floating pill that opens a bottom sheet
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Check, Edit3, Trash2, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { pendingTransactionsService } from '../services/pendingTransactions';
import { useFinance } from '../context/FinanceContext';
import { useFeedback } from '../context/FeedbackContext';
import { useLocation } from 'react-router-dom';

const PendingTransactionsBadge = () => {
    const { addTransaction, accounts, categories, categoriesByUsage } = useFinance();
    const displayCategories = categoriesByUsage?.length ? categoriesByUsage : categories;
    const { toast } = useFeedback();
    const location = useLocation();
    const [pending, setPending] = useState([]);
    const [showSheet, setShowSheet] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [editMode, setEditMode] = useState(false);
    const [editForm, setEditForm] = useState({});

    // Load and subscribe to pending transactions
    useEffect(() => {
        const loadPending = () => {
            setPending(pendingTransactionsService.getAll());
        };
        loadPending();
        const unsubscribe = pendingTransactionsService.subscribe((newPending) => {
            setPending(newPending);
            if (newPending.length > pending.length) {
                setShowSheet(true);
                setCurrentIndex(0);
            }
        });
        return () => unsubscribe();
    }, [pending.length]);

    // Handle SMS/Share Intent
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const sharedText = params.get('text');
        if (params.get('share') && sharedText) {
            import('../services/smsParser').then(({ parseSMS, formatParsedTransaction }) => {
                const parsed = parseSMS(sharedText);
                if (parsed) {
                    const transaction = formatParsedTransaction(parsed, categories);
                    if (transaction && !pendingTransactionsService.isDuplicate(transaction.amount, transaction.date)) {
                        pendingTransactionsService.add(transaction);
                        toast('SMS Parsed! Review transaction.', 'success');
                        setShowSheet(true);
                    }
                }
            });
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [categories, toast]);

    const currentTransaction = pending[currentIndex];

    // Initialize edit form when opening or switching transaction
    useEffect(() => {
        if (currentTransaction) {
            setEditForm({
                description: currentTransaction.description,
                amount: currentTransaction.amount,
                type: currentTransaction.type,
                category: currentTransaction.category,
                accountId: accounts[0]?.id || '',
                date: currentTransaction.date
            });
        }
    }, [currentTransaction, accounts]);

    const handleConfirm = async () => {
        if (!currentTransaction) return;

        try {
            const data = editMode ? editForm : currentTransaction;
            // Ensure amount has correct sign based on type
            const finalAmount = data.type === 'expense' ? -Math.abs(data.amount) : Math.abs(data.amount);

            await addTransaction({
                description: data.description,
                amount: finalAmount,
                category: data.category,
                accountId: data.accountId || accounts[0]?.id,
                date: data.date || new Date().toISOString().split('T')[0],
                type: data.type,
            });

            pendingTransactionsService.remove(currentTransaction.id);
            toast('Transaction added ✓');

            const newPending = pendingTransactionsService.getAll();
            setPending(newPending);
            if (newPending.length === 0) setShowSheet(false);
            else setCurrentIndex(0); // Reset to first available
            setEditMode(false);
        } catch (e) {
            console.error(e);
            toast('Failed to save', 'error');
        }
    };

    const handleDelete = () => {
        if (!currentTransaction) return;
        pendingTransactionsService.remove(currentTransaction.id);
        const newPending = pendingTransactionsService.getAll();
        setPending(newPending);
        if (newPending.length === 0) setShowSheet(false);
        else setCurrentIndex(0);
        setEditMode(false);
        toast('Ignored transaction');
    };

    // Don't show on welcome page
    if (location.pathname === '/welcome' || pending.length === 0) return null;

    return (
        <>
            {/* Floating Pill - Bottom Center */}
            <AnimatePresence>
                {!showSheet && pending.length > 0 && (
                    <motion.button
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        onClick={() => setShowSheet(true)}
                        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 bg-primary text-primary-foreground px-5 py-3 rounded-full shadow-lg shadow-primary/25 flex items-center gap-3 font-bold"
                    >
                        <Sparkles size={18} />
                        <span>{pending.length} New Transaction{pending.length > 1 ? 's' : ''}</span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Bottom Sheet Modal */}
            <AnimatePresence>
                {showSheet && currentTransaction && (
                    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center bg-black/60 backdrop-blur-sm p-4" data-modal-overlay>
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            className="w-full max-w-md bg-card border border-card-border rounded-3xl overflow-hidden shadow-2xl"
                        >
                            {/* Header - Enhanced */}
                            <div className="p-4 border-b border-card-border flex justify-between items-center bg-gradient-to-r from-primary/10 to-transparent">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                                        <MessageSquare size={18} className="text-primary" />
                                    </div>
                                    <div>
                                        <span className="font-black uppercase text-xs tracking-widest text-primary block">
                                            SMS Detected
                                        </span>
                                        <span className="text-[10px] font-bold text-text-muted">
                                            {currentIndex + 1} of {pending.length} transaction{pending.length > 1 ? 's' : ''}
                                        </span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setShowSheet(false)} 
                                    className="p-2 hover:bg-white/5 rounded-full transition-all hover:scale-110"
                                >
                                    <X size={18} className="text-text-muted" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 max-h-[60vh] overflow-y-auto">
                                {editMode ? (
                                    <div className="space-y-4">
                                        {/* Amount - Large Display */}
                                        <div className="text-center space-y-2">
                                            <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider block">Amount</label>
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="text-2xl font-bold text-text-muted">₹</span>
                                                <input
                                                    type="number"
                                                    value={Math.abs(editForm.amount)}
                                                    onChange={e => setEditForm({ ...editForm, amount: parseFloat(e.target.value) || 0 })}
                                                    className="w-32 text-3xl font-black text-center bg-transparent border-b-2 border-primary/30 focus:border-primary outline-none text-text-main"
                                                    autoFocus
                                                />
                                            </div>
                                            {/* Type Toggle */}
                                            <div className="flex justify-center gap-2 mt-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditForm({ ...editForm, type: 'expense' })}
                                                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${editForm.type === 'expense' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-canvas-subtle text-text-muted border border-card-border'}`}
                                                >
                                                    Expense
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditForm({ ...editForm, type: 'income' })}
                                                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${editForm.type === 'income' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-canvas-subtle text-text-muted border border-card-border'}`}
                                                >
                                                    Income
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider">Description</label>
                                            <input
                                                value={editForm.description}
                                                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                                className="w-full bg-canvas-subtle rounded-xl p-3.5 text-sm font-bold border border-card-border focus:border-primary outline-none text-text-main"
                                                placeholder="What's this for?"
                                            />
                                        </div>

                                        {/* Category - Visual Pills */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider block">Category</label>
                                            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                                                {displayCategories.map(c => (
                                                    <button
                                                        key={c.name}
                                                        type="button"
                                                        onClick={() => setEditForm({ ...editForm, category: c.name })}
                                                        className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${editForm.category === c.name
                                                            ? 'bg-primary text-primary-foreground border-primary shadow-lg'
                                                            : 'bg-canvas-subtle border-card-border text-text-muted hover:border-primary/30'
                                                            }`}
                                                    >
                                                        <span className="text-base">{c.icon}</span>
                                                        <span className="text-xs font-bold whitespace-nowrap">{c.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Account Selection */}
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider">Account</label>
                                            <select
                                                value={editForm.accountId}
                                                onChange={e => setEditForm({ ...editForm, accountId: e.target.value })}
                                                className="w-full bg-canvas-subtle rounded-xl p-3.5 text-sm font-bold border border-card-border focus:border-primary outline-none text-text-main"
                                            >
                                                {accounts.map(acc => (
                                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Date */}
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider">Date</label>
                                            <input
                                                type="date"
                                                value={editForm.date}
                                                onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                                                className="w-full bg-canvas-subtle rounded-xl p-3.5 text-sm font-bold border border-card-border focus:border-primary outline-none text-text-main"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center space-y-6">
                                        {/* Amount Display - Enhanced */}
                                        <div className="flex flex-col items-center space-y-2">
                                            <div className={`text-5xl font-black tracking-tighter ${currentTransaction.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {currentTransaction.type === 'income' ? '+' : '-'}₹{Math.abs(currentTransaction.amount).toLocaleString()}
                                            </div>
                                            <div className="text-base font-bold text-text-main mt-2 px-4 py-2 bg-canvas-subtle rounded-xl border border-card-border">
                                                {currentTransaction.description}
                                            </div>
                                        </div>

                                        {/* Info Card - Enhanced */}
                                        <div className="bg-gradient-to-br from-card to-canvas-subtle rounded-2xl p-5 border border-card-border space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl">
                                                        {displayCategories.find(c => c.name === currentTransaction.category)?.icon || '📦'}
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-sm font-black text-text-main uppercase">{currentTransaction.category}</p>
                                                        <p className="text-[10px] font-bold text-text-muted mt-0.5">{new Date(currentTransaction.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setEditMode(true)}
                                                    className="p-3 text-primary hover:bg-primary/10 rounded-xl transition-all border border-primary/20 hover:border-primary/40"
                                                >
                                                    <Edit3 size={18} />
                                                </button>
                                            </div>

                                            {/* SMS Preview - Enhanced */}
                                            {currentTransaction.rawText && (
                                                <div className="mt-4 pt-4 border-t border-card-border">
                                                    <p className="text-[9px] font-bold uppercase text-text-muted tracking-widest mb-2">SMS Preview</p>
                                                    <div className="text-xs text-text-muted/70 font-mono bg-black/30 p-3 rounded-xl break-words border border-card-border">
                                                        {currentTransaction.rawText}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Quick Actions */}
                                        {pending.length > 1 && (
                                            <div className="flex items-center justify-center gap-2 pt-2">
                                                <button
                                                    onClick={() => setCurrentIndex(prev => prev > 0 ? prev - 1 : pending.length - 1)}
                                                    className="p-2 rounded-xl bg-canvas-subtle border border-card-border text-text-muted hover:text-primary hover:border-primary/30 transition-all"
                                                >
                                                    ←
                                                </button>
                                                <span className="text-xs font-bold text-text-muted px-3">
                                                    {currentIndex + 1} of {pending.length}
                                                </span>
                                                <button
                                                    onClick={() => setCurrentIndex(prev => prev < pending.length - 1 ? prev + 1 : 0)}
                                                    className="p-2 rounded-xl bg-canvas-subtle border border-card-border text-text-muted hover:text-primary hover:border-primary/30 transition-all"
                                                >
                                                    →
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Actions - Enhanced */}
                            <div className="p-4 bg-canvas-subtle border-t border-card-border flex gap-3">
                                <button
                                    onClick={handleDelete}
                                    className="p-4 rounded-xl bg-card border border-card-border text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all group"
                                    title="Ignore this transaction"
                                >
                                    <Trash2 size={20} className="group-hover:scale-110 transition-transform" />
                                </button>
                                {editMode && (
                                    <button
                                        onClick={() => setEditMode(false)}
                                        className="px-4 rounded-xl bg-card border border-card-border text-text-muted hover:text-text-main hover:border-primary/30 transition-all text-xs font-bold uppercase"
                                    >
                                        Cancel
                                    </button>
                                )}
                                <button
                                    onClick={handleConfirm}
                                    className="flex-1 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
                                >
                                    <Check size={18} />
                                    {editMode ? 'Save & Add' : 'Approve Transaction'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default PendingTransactionsBadge;
