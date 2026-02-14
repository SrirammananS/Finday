/**
 * Pending Transactions Badge - Shows notification for detected transactions (SMS/Parsing)
 * UI: Floating pill that opens a bottom sheet
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Check, Edit3, Trash2 } from 'lucide-react';
import { pendingTransactionsService } from '../services/pendingTransactions';
import { useFinance } from '../context/FinanceContext';
import { useFeedback } from '../context/FeedbackContext';
import { useNavigate, useLocation } from 'react-router-dom';

const PendingTransactionsBadge = () => {
    const { addTransaction, accounts, categories } = useFinance();
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
    }, [categories]);

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
                    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center bg-black/60 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            className="w-full max-w-md bg-card border border-card-border rounded-3xl overflow-hidden shadow-2xl"
                        >
                            {/* Header */}
                            <div className="p-4 border-b border-card-border flex justify-between items-center bg-canvas-subtle">
                                <div className="flex items-center gap-2">
                                    <Sparkles size={16} className="text-primary" />
                                    <span className="font-black uppercase text-xs tracking-widest text-text-muted">
                                        Detecting ({currentIndex + 1}/{pending.length})
                                    </span>
                                </div>
                                <button onClick={() => setShowSheet(false)} className="p-2 hover:bg-white/5 rounded-full">
                                    <X size={18} className="text-text-muted" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                {editMode ? (
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider">Description</label>
                                            <input
                                                value={editForm.description}
                                                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                                className="w-full bg-input rounded-xl p-3 text-sm font-medium border border-input-border focus:border-primary outline-none"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider">Amount</label>
                                                <input
                                                    type="number"
                                                    value={editForm.amount}
                                                    onChange={e => setEditForm({ ...editForm, amount: parseFloat(e.target.value) })}
                                                    className="w-full bg-input rounded-xl p-3 text-sm font-medium border border-input-border focus:border-primary outline-none"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider">Type</label>
                                                <select
                                                    value={editForm.type}
                                                    onChange={e => setEditForm({ ...editForm, type: e.target.value })}
                                                    className="w-full bg-input rounded-xl p-3 text-sm font-medium border border-input-border focus:border-primary outline-none appearance-none"
                                                >
                                                    <option value="expense">Expense</option>
                                                    <option value="income">Income</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider">Category</label>
                                            <select
                                                value={editForm.category}
                                                onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                                                className="w-full bg-input rounded-xl p-3 text-sm font-medium border border-input-border focus:border-primary outline-none appearance-none"
                                            >
                                                {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center space-y-4">
                                        <div className="flex flex-col items-center">
                                            <span className={`text-4xl font-black tracking-tighter ${currentTransaction.type === 'income' ? 'text-emerald-400' : 'text-text-main'}`}>
                                                {currentTransaction.type === 'income' ? '+' : '-'}₹{Math.abs(currentTransaction.amount)}
                                            </span>
                                            <span className="text-sm font-medium text-text-muted mt-1">{currentTransaction.description}</span>
                                        </div>

                                        <div className="bg-canvas-subtle rounded-2xl p-4 flex justify-between items-center border border-card-border">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-card border border-card-border flex items-center justify-center text-xl">
                                                    {categories.find(c => c.name === currentTransaction.category)?.icon || '📦'}
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-xs font-bold text-text-main">{currentTransaction.category}</p>
                                                    <p className="text-[10px] font-medium text-text-muted">{currentTransaction.date}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setEditMode(true)}
                                                className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                            >
                                                <Edit3 size={18} />
                                            </button>
                                        </div>

                                        {currentTransaction.rawText && (
                                            <div className="text-[10px] text-text-muted/50 font-mono bg-black/20 p-2 rounded-lg break-words">
                                                "{currentTransaction.rawText.slice(0, 80)}..."
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="p-4 bg-canvas-subtle border-t border-card-border flex gap-3">
                                <button
                                    onClick={handleDelete}
                                    className="p-4 rounded-xl bg-card border border-card-border text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all"
                                >
                                    <Trash2 size={20} />
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    className="flex-1 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    <Check size={18} />
                                    {editMode ? 'Save Changes' : 'Approve'}
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
