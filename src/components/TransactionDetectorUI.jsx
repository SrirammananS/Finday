/**
 * Transaction Detector UI Component
 * Shows detected transactions and allows user to confirm/dismiss them
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, X, ChevronDown, ChevronUp, MessageSquare, Clipboard, Edit3 } from 'lucide-react';
import { transactionDetector } from '../services/transactionDetector';
import { useFinance } from '../context/FinanceContext';
import { useFeedback } from '../context/FeedbackContext';

const TransactionDetectorUI = () => {
    const { addTransaction, accounts, categories } = useFinance();
    const { toast } = useFeedback();
    const [pendingTransactions, setPendingTransactions] = useState([]);
    const [expanded, setExpanded] = useState(true);
    const [showInput, setShowInput] = useState(false);
    const [manualText, setManualText] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});

    // Load pending transactions
    useEffect(() => {
        setPendingTransactions(transactionDetector.getPending());

        // Subscribe to new detections
        const unsubscribe = transactionDetector.subscribe((transaction) => {
            setPendingTransactions(transactionDetector.getPending());
            toast('New transaction detected!');
        });

        return () => unsubscribe();
    }, [toast]);

    // Handle clipboard paste
    const handlePasteFromClipboard = async () => {
        const detected = await transactionDetector.processClipboard();
        if (detected) {
            toast(`Detected: ₹${detected.amount} ${detected.type}`);
        } else {
            toast('No transaction found in clipboard', 'error');
        }
        setPendingTransactions(transactionDetector.getPending());
    };

    // Handle manual text input
    const handleManualInput = () => {
        if (!manualText.trim()) return;
        
        const detected = transactionDetector.processManualInput(manualText);
        if (detected) {
            toast(`Detected: ₹${detected.amount} ${detected.type}`);
            setManualText('');
            setShowInput(false);
        } else {
            toast('Could not detect transaction from text', 'error');
        }
        setPendingTransactions(transactionDetector.getPending());
    };

    // Confirm and add transaction
    const handleConfirm = async (transaction) => {
        try {
            // Use edit form if editing, otherwise use detected values
            const data = editingId === transaction.id ? editForm : transaction;
            
            await addTransaction({
                description: data.description,
                amount: data.type === 'expense' ? -Math.abs(data.amount) : Math.abs(data.amount),
                category: data.category,
                accountId: data.accountId || accounts[0]?.id,
                date: new Date().toISOString().split('T')[0],
                type: data.type,
            });

            transactionDetector.confirmTransaction(transaction.id);
            setPendingTransactions(transactionDetector.getPending());
            setEditingId(null);
            toast('Transaction added ✓');
        } catch (e) {
            toast('Failed to add transaction', 'error');
        }
    };

    // Dismiss transaction
    const handleDismiss = (id) => {
        transactionDetector.dismissTransaction(id);
        setPendingTransactions(transactionDetector.getPending());
    };

    // Start editing
    const handleEdit = (transaction) => {
        setEditingId(transaction.id);
        setEditForm({
            description: transaction.description,
            amount: transaction.amount,
            type: transaction.type,
            category: transaction.category,
            accountId: accounts[0]?.id,
        });
    };

    if (pendingTransactions.length === 0 && !showInput) {
        return (
            <div className="mb-6">
                <button
                    onClick={() => setShowInput(true)}
                    className="w-full modern-card p-4 flex items-center justify-center gap-2 text-text-muted hover:text-primary hover:border-primary transition-all"
                >
                    <Sparkles size={18} />
                    <span className="text-xs font-bold uppercase tracking-wider">Paste SMS/Text to Detect Transaction</span>
                </button>
            </div>
        );
    }

    return (
        <div className="mb-6">
            <div className="modern-card overflow-hidden">
                {/* Header */}
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="w-full p-4 flex items-center justify-between bg-primary/10 border-b border-card-border"
                >
                    <div className="flex items-center gap-2">
                        <Sparkles size={18} className="text-primary" />
                        <span className="text-sm font-bold text-text-main">
                            {pendingTransactions.length > 0 
                                ? `${pendingTransactions.length} Detected Transaction${pendingTransactions.length > 1 ? 's' : ''}`
                                : 'Detect Transactions'
                            }
                        </span>
                    </div>
                    {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>

                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            {/* Input Section */}
                            <div className="p-4 border-b border-card-border bg-canvas-subtle">
                                <div className="flex gap-2 mb-3">
                                    <button
                                        onClick={handlePasteFromClipboard}
                                        className="flex-1 py-2 px-3 rounded-lg bg-card border border-card-border text-xs font-bold flex items-center justify-center gap-2 hover:border-primary transition-all"
                                    >
                                        <Clipboard size={14} />
                                        Paste from Clipboard
                                    </button>
                                    <button
                                        onClick={() => setShowInput(!showInput)}
                                        className="flex-1 py-2 px-3 rounded-lg bg-card border border-card-border text-xs font-bold flex items-center justify-center gap-2 hover:border-primary transition-all"
                                    >
                                        <MessageSquare size={14} />
                                        Enter Text
                                    </button>
                                </div>

                                {showInput && (
                                    <div className="space-y-2">
                                        <textarea
                                            value={manualText}
                                            onChange={(e) => setManualText(e.target.value)}
                                            placeholder="Paste bank SMS or notification text here..."
                                            className="w-full p-3 rounded-lg bg-card border border-card-border text-sm resize-none h-24 focus:border-primary outline-none"
                                        />
                                        <button
                                            onClick={handleManualInput}
                                            disabled={!manualText.trim()}
                                            className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50"
                                        >
                                            Detect Transaction
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Pending Transactions */}
                            <div className="divide-y divide-card-border">
                                {pendingTransactions.map((t) => (
                                    <div key={t.id} className="p-4">
                                        {editingId === t.id ? (
                                            // Edit Mode
                                            <div className="space-y-3">
                                                <input
                                                    type="text"
                                                    value={editForm.description}
                                                    onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                                                    placeholder="Description"
                                                    className="w-full p-2 rounded-lg bg-canvas-subtle border border-card-border text-sm"
                                                />
                                                <div className="grid grid-cols-2 gap-2">
                                                    <input
                                                        type="number"
                                                        value={editForm.amount}
                                                        onChange={(e) => setEditForm({...editForm, amount: parseFloat(e.target.value) || 0})}
                                                        placeholder="Amount"
                                                        className="p-2 rounded-lg bg-canvas-subtle border border-card-border text-sm"
                                                    />
                                                    <select
                                                        value={editForm.type}
                                                        onChange={(e) => setEditForm({...editForm, type: e.target.value})}
                                                        className="p-2 rounded-lg bg-canvas-subtle border border-card-border text-sm"
                                                    >
                                                        <option value="expense">Expense</option>
                                                        <option value="income">Income</option>
                                                    </select>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <select
                                                        value={editForm.category}
                                                        onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                                                        className="p-2 rounded-lg bg-canvas-subtle border border-card-border text-sm"
                                                    >
                                                        {categories.map(c => (
                                                            <option key={c.name} value={c.name}>{c.name}</option>
                                                        ))}
                                                    </select>
                                                    <select
                                                        value={editForm.accountId}
                                                        onChange={(e) => setEditForm({...editForm, accountId: e.target.value})}
                                                        className="p-2 rounded-lg bg-canvas-subtle border border-card-border text-sm"
                                                    >
                                                        {accounts.map(a => (
                                                            <option key={a.id} value={a.id}>{a.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleConfirm(t)}
                                                        className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold"
                                                    >
                                                        Save & Add
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingId(null)}
                                                        className="px-4 py-2 rounded-lg bg-card border border-card-border text-xs font-bold"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            // View Mode
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`text-lg font-black ${t.type === 'expense' ? 'text-red-500' : 'text-green-500'}`}>
                                                            {t.type === 'expense' ? '-' : '+'}₹{t.amount.toLocaleString()}
                                                        </span>
                                                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                                            t.type === 'expense' ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'
                                                        }`}>
                                                            {t.type}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-text-main truncate">{t.description}</p>
                                                    <p className="text-[10px] text-text-muted mt-1">
                                                        {t.category} • via {t.source}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1 ml-2">
                                                    <button
                                                        onClick={() => handleEdit(t)}
                                                        className="w-9 h-9 rounded-full bg-canvas-subtle flex items-center justify-center hover:bg-primary/20 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit3 size={16} className="text-text-muted" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleConfirm(t)}
                                                        className="w-9 h-9 rounded-full bg-green-500/20 flex items-center justify-center hover:bg-green-500/30 transition-colors"
                                                        title="Confirm"
                                                    >
                                                        <Check size={16} className="text-green-500" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDismiss(t.id)}
                                                        className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center hover:bg-red-500/30 transition-colors"
                                                        title="Dismiss"
                                                    >
                                                        <X size={16} className="text-red-500" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default TransactionDetectorUI;
