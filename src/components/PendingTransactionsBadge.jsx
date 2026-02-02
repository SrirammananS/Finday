/**
 * Pending Transactions Badge - Shows notification for detected transactions
 * Appears as a floating badge that users can tap to review
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Check, Edit3, ChevronRight } from 'lucide-react';
import { pendingTransactionsService } from '../services/pendingTransactions';
import { useFinance } from '../context/FinanceContext';
import { useFeedback } from '../context/FeedbackContext';
import { useNavigate } from 'react-router-dom';

const PendingTransactionsBadge = () => {
    const { addTransaction, accounts, categories } = useFinance();
    const { toast } = useFeedback();
    const navigate = useNavigate();
    const [pending, setPending] = useState([]);
    const [showModal, setShowModal] = useState(false);
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
            // Auto-show modal when new transaction detected
            if (newPending.length > pending.length) {
                setShowModal(true);
                setCurrentIndex(0);
            }
        });

        return () => unsubscribe();
    }, []);

    // Handle URL params for share target
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const sharedText = params.get('text');
        const isShare = params.get('share');

        if (isShare && sharedText) {
            // Process shared text - import smsParser for parsing
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
            // Clear URL params
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

            // Move to next or close
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

    if (pending.length === 0) return null;

    return (
        <>
            {/* Floating Badge */}
            <motion.button
                initial={{ scale: 0, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0, y: 50 }}
                onClick={() => setShowModal(true)}
                className="fixed bottom-24 right-4 z-40 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-full shadow-lg shadow-primary/30"
            >
                <Sparkles size={18} />
                <span className="font-bold text-sm">{pending.length} New</span>
            </motion.button>

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
                            <div className="p-4 bg-primary/10 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Sparkles size={20} className="text-primary" />
                                    <span className="font-bold text-text-main">
                                        Detected Transaction ({currentIndex + 1}/{pending.length})
                                    </span>
                                </div>
                                <button onClick={() => setShowModal(false)} className="p-1">
                                    <X size={20} className="text-text-muted" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                {editMode ? (
                                    // Edit Form
                                    <div className="space-y-4">
                                        <input
                                            type="text"
                                            value={editForm.description}
                                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                            placeholder="Description"
                                            className="w-full p-3 rounded-xl bg-canvas-subtle border border-card-border text-text-main"
                                        />
                                        <div className="grid grid-cols-2 gap-3">
                                            <input
                                                type="number"
                                                value={editForm.amount}
                                                onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) || 0 })}
                                                placeholder="Amount"
                                                className="p-3 rounded-xl bg-canvas-subtle border border-card-border text-text-main"
                                            />
                                            <select
                                                value={editForm.type}
                                                onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                                                className="p-3 rounded-xl bg-canvas-subtle border border-card-border text-text-main"
                                            >
                                                <option value="expense">Expense</option>
                                                <option value="income">Income</option>
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <select
                                                value={editForm.category}
                                                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                                                className="p-3 rounded-xl bg-canvas-subtle border border-card-border text-text-main"
                                            >
                                                {categories.map(c => (
                                                    <option key={c.name} value={c.name}>{c.name}</option>
                                                ))}
                                            </select>
                                            <select
                                                value={editForm.accountId}
                                                onChange={(e) => setEditForm({ ...editForm, accountId: e.target.value })}
                                                className="p-3 rounded-xl bg-canvas-subtle border border-card-border text-text-main"
                                            >
                                                {accounts.map(a => (
                                                    <option key={a.id} value={a.id}>{a.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                ) : (
                                    // View Mode
                                    <div className="text-center">
                                        <div className={`text-5xl font-black mb-2 ${currentTransaction.type === 'expense' ? 'text-red-500' : 'text-green-500'
                                            }`}>
                                            {currentTransaction.type === 'expense' ? '-' : '+'}₹{currentTransaction.amount.toLocaleString()}
                                        </div>
                                        <p className="text-lg text-text-main font-bold mb-1">{currentTransaction.description}</p>
                                        <p className="text-sm text-text-muted">
                                            {currentTransaction.category} • via {currentTransaction.source}
                                        </p>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={handleDismiss}
                                        className="flex-1 py-4 rounded-xl bg-red-500/20 text-red-500 font-bold flex items-center justify-center gap-2"
                                    >
                                        <X size={20} />
                                        Skip
                                    </button>
                                    {!editMode && (
                                        <button
                                            onClick={startEdit}
                                            className="py-4 px-6 rounded-xl bg-canvas-subtle border border-card-border font-bold flex items-center justify-center gap-2"
                                        >
                                            <Edit3 size={20} />
                                        </button>
                                    )}
                                    <button
                                        onClick={handleConfirm}
                                        className="flex-1 py-4 rounded-xl bg-green-500 text-white font-bold flex items-center justify-center gap-2"
                                    >
                                        <Check size={20} />
                                        {editMode ? 'Save' : 'Add'}
                                    </button>
                                </div>

                                {/* Navigation dots */}
                                {pending.length > 1 && (
                                    <div className="flex justify-center gap-2 mt-4">
                                        {pending.map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => { setCurrentIndex(i); setEditMode(false); }}
                                                className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-primary w-6' : 'bg-card-border'
                                                    }`}
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
