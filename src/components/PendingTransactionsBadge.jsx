/**
 * Pending Transactions Badge - Shows notification for detected transactions
 * Appears as a small floating badge that users can tap to review
 * Can be minimized to not block content
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Check, Edit3, ChevronDown, ChevronUp, Minimize2 } from 'lucide-react';
import { pendingTransactionsService } from '../services/pendingTransactions';
import { useFinance } from '../context/FinanceContext';
import { useFeedback } from '../context/FeedbackContext';
import { useNavigate, useLocation } from 'react-router-dom';

const PendingTransactionsBadge = () => {
    const { addTransaction, accounts, categories } = useFinance();
    const { toast } = useFeedback();
    const navigate = useNavigate();
    const location = useLocation();
    const [pending, setPending] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [editMode, setEditMode] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [isMinimized, setIsMinimized] = useState(false);

    // Load and subscribe to pending transactions
    useEffect(() => {
        const loadPending = () => {
            setPending(pendingTransactionsService.getAll());
        };

        loadPending();

        const unsubscribe = pendingTransactionsService.subscribe((newPending) => {
            setPending(newPending);
            // Auto-show modal when new transaction detected (but not if minimized)
            if (newPending.length > pending.length && !isMinimized) {
                setShowModal(true);
                setCurrentIndex(0);
            }
        });

        return () => unsubscribe();
    }, [isMinimized]);

    // Handle URL params for share target
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const sharedText = params.get('text');
        const isShare = params.get('share');

        if (isShare && sharedText) {
            import('../services/smsParser').then(({ parseSMS, formatParsedTransaction }) => {
                const parsed = parseSMS(sharedText);
                if (parsed) {
                    const transaction = formatParsedTransaction(parsed, categories);
                    if (transaction && !pendingTransactionsService.isDuplicate(transaction.amount, transaction.date)) {
                        pendingTransactionsService.add(transaction);
                        toast('Transaction detected from shared text!');
                        setShowModal(true);
                    }
                }
            });
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [toast, categories]);

    const currentTransaction = pending[currentIndex];

    const handleConfirm = async () => {
        if (!currentTransaction) return;

        try {
            const data = editMode ? editForm : currentTransaction;

            await addTransaction({
                description: data.description,
                amount: data.type === 'expense' ? -Math.abs(data.amount) : Math.abs(data.amount),
                category: data.category,
                accountId: data.accountId || accounts[0]?.id,
                date: data.date || new Date().toISOString().split('T')[0],
                type: data.type,
            });

            pendingTransactionsService.remove(currentTransaction.id);
            toast('Transaction added ✓');

            const newPending = pendingTransactionsService.getAll();
            setPending(newPending);

            if (newPending.length === 0) {
                setShowModal(false);
            } else {
                setCurrentIndex(Math.min(currentIndex, newPending.length - 1));
            }
            setEditMode(false);
        } catch (e) {
            console.error('[PendingBadge] Failed to add transaction:', e);
            toast('Failed to add transaction', 'error');
        }
    };

    const handleDismiss = () => {
        if (!currentTransaction) return;
        pendingTransactionsService.remove(currentTransaction.id);

        const newPending = pendingTransactionsService.getAll();
        setPending(newPending);

        if (newPending.length === 0) {
            setShowModal(false);
        } else {
            setCurrentIndex(Math.min(currentIndex, newPending.length - 1));
        }
        setEditMode(false);
    };

    const startEdit = () => {
        setEditForm({
            description: currentTransaction.description,
            amount: currentTransaction.amount,
            type: currentTransaction.type,
            category: currentTransaction.category,
            accountId: accounts[0]?.id,
        });
        setEditMode(true);
    };

    // Don't show on welcome page
    if (location.pathname === '/welcome') return null;
    if (pending.length === 0) return null;

    return (
        <>
            {/* Floating Badge - Compact and minimizable */}
            <AnimatePresence>
                {!showModal && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="fixed bottom-20 right-3 z-40 flex flex-col items-end gap-1"
                    >
                        {/* Minimize toggle */}
                        {!isMinimized && (
                            <button
                                onClick={() => setIsMinimized(true)}
                                className="p-1.5 bg-canvas-subtle/90 rounded-full text-text-muted hover:text-text-main transition-colors"
                            >
                                <Minimize2 size={12} />
                            </button>
                        )}

                        {/* Main badge */}
                        <motion.button
                            layout
                            onClick={() => {
                                if (isMinimized) {
                                    setIsMinimized(false);
                                } else {
                                    setShowModal(true);
                                }
                            }}
                            className={`flex items-center gap-2 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/20 transition-all ${isMinimized ? 'px-2 py-2' : 'px-3 py-2.5'
                                }`}
                        >
                            <Sparkles size={isMinimized ? 14 : 16} />
                            {!isMinimized && (
                                <span className="font-bold text-xs">{pending.length}</span>
                            )}
                            {isMinimized && pending.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center">
                                    {pending.length}
                                </span>
                            )}
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Quick Action Modal */}
            <AnimatePresence>
                {showModal && currentTransaction && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25 }}
                            onClick={e => e.stopPropagation()}
                            className="fixed bottom-0 left-0 right-0 w-full max-w-lg mx-auto bg-card border-t border-card-border rounded-t-3xl overflow-hidden max-h-[80vh] overflow-y-auto"
                        >
                            {/* Header */}
                            <div className="p-3 bg-primary/10 flex items-center justify-between sticky top-0 z-10">
                                <div className="flex items-center gap-2">
                                    <Sparkles size={18} className="text-primary" />
                                    <span className="font-bold text-sm text-text-main">
                                        Transaction {currentIndex + 1}/{pending.length}
                                    </span>
                                </div>
                                <button onClick={() => setShowModal(false)} className="p-1">
                                    <X size={18} className="text-text-muted" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-4">
                                {editMode ? (
                                    // Edit Form
                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            value={editForm.description}
                                            onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                            className="w-full p-3 bg-canvas-subtle rounded-xl text-text-main border border-card-border focus:border-primary outline-none text-sm"
                                            placeholder="Description"
                                        />
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                value={editForm.amount}
                                                onChange={e => setEditForm({ ...editForm, amount: parseFloat(e.target.value) || 0 })}
                                                className="flex-1 p-3 bg-canvas-subtle rounded-xl text-text-main border border-card-border focus:border-primary outline-none text-sm"
                                                placeholder="Amount"
                                            />
                                            <select
                                                value={editForm.type}
                                                onChange={e => setEditForm({ ...editForm, type: e.target.value })}
                                                className="p-3 bg-canvas-subtle rounded-xl text-text-main border border-card-border focus:border-primary outline-none text-sm"
                                            >
                                                <option value="expense">Expense</option>
                                                <option value="income">Income</option>
                                            </select>
                                        </div>
                                        <select
                                            value={editForm.category}
                                            onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                                            className="w-full p-3 bg-canvas-subtle rounded-xl text-text-main border border-card-border focus:border-primary outline-none text-sm"
                                        >
                                            {categories.map(cat => (
                                                <option key={cat.name} value={cat.name}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    // Display Mode
                                    <div className="space-y-3">
                                        {/* Amount - prominent */}
                                        <div className="text-center">
                                            <span className={`text-3xl font-black ${currentTransaction.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                                                {currentTransaction.type === 'income' ? '+' : '-'}₹{Math.abs(currentTransaction.amount).toLocaleString()}
                                            </span>
                                        </div>

                                        {/* Details */}
                                        <div className="bg-canvas-subtle rounded-xl p-3 space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-text-muted">Description</span>
                                                <span className="text-text-main font-medium truncate max-w-[60%]">{currentTransaction.description}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-text-muted">Category</span>
                                                <span className="text-text-main font-medium">{currentTransaction.category}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-text-muted">Date</span>
                                                <span className="text-text-main font-medium">{currentTransaction.date}</span>
                                            </div>
                                            {currentTransaction.rawText && (
                                                <div className="pt-2 border-t border-card-border">
                                                    <p className="text-[10px] text-text-muted/60 line-clamp-2">{currentTransaction.rawText}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2 mt-4">
                                    <button
                                        onClick={handleDismiss}
                                        className="flex-1 py-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 font-bold flex items-center justify-center gap-2 text-sm transition-colors border border-red-500/20"
                                    >
                                        <X size={16} />
                                        Skip
                                    </button>
                                    {!editMode && (
                                        <button
                                            onClick={startEdit}
                                            className="py-3 px-4 rounded-xl bg-canvas-subtle border border-card-border font-bold flex items-center justify-center text-text-muted hover:text-primary transition-colors"
                                        >
                                            <Edit3 size={16} />
                                        </button>
                                    )}
                                    <button
                                        onClick={handleConfirm}
                                        className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                    >
                                        <Check size={16} />
                                        {editMode ? 'Save' : 'Add'}
                                    </button>
                                </div>

                                {/* Navigation dots */}
                                {pending.length > 1 && (
                                    <div className="flex justify-center gap-2 mt-3 pb-4">
                                        {pending.map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => { setCurrentIndex(i); setEditMode(false); }}
                                                className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-primary w-5' : 'bg-card-border'}`}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default PendingTransactionsBadge;
