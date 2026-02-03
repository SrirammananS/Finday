import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, X, Edit2, ChevronDown, ChevronUp, Sparkles, Clipboard, MessageSquare } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { pendingTransactionsService } from '../services/pendingTransactions';
import { parseSMS, formatParsedTransaction } from '../services/smsParser';
import { useFeedback } from '../context/FeedbackContext';

const PendingTransactionsFeed = () => {
    const { accounts, categories, addTransaction } = useFinance();
    const { toast } = useFeedback();
    const [pending, setPending] = useState([]);
    const [expanded, setExpanded] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState(null);
    const [showInput, setShowInput] = useState(false);
    const [manualText, setManualText] = useState('');
    const hasProcessedApproved = useRef(false);

    useEffect(() => {
        const allPending = pendingTransactionsService.getAll();

        // Auto-process approved transactions from Android notification
        if (!hasProcessedApproved.current) {
            const approved = allPending.filter(t => t.status === 'approved');
            if (approved.length > 0) {
                hasProcessedApproved.current = true;
                console.log('[PWA] Auto-processing', approved.length, 'approved transactions from Android');

                approved.forEach(async (item) => {
                    try {
                        const amount = item.type === 'expense' ? -Math.abs(item.amount) : Math.abs(item.amount);
                        await addTransaction({
                            date: item.date || new Date().toISOString().split('T')[0],
                            description: item.description,
                            amount: amount,
                            category: item.category,
                            accountId: item.accountId || accounts[0]?.id,
                            type: item.type,
                            friend: ''
                        });
                        pendingTransactionsService.remove(item.id);
                        console.log('[PWA] Auto-saved approved transaction:', item.description);
                    } catch (err) {
                        console.error('[PWA] Failed to auto-save approved transaction:', err);
                    }
                });
            }
        }

        // Set only non-approved pending for display
        setPending(allPending.filter(t => t.status !== 'approved'));

        const unsubscribe = pendingTransactionsService.subscribe((newPending) => {
            setPending(newPending.filter(t => t.status !== 'approved'));
        });
        return unsubscribe;
    }, [accounts, addTransaction]);

    const handleApprove = async (item) => {
        try {
            // Ensure expense amounts are negative and income amounts are positive
            const amount = item.type === 'expense' ? -Math.abs(item.amount) : Math.abs(item.amount);

            await addTransaction({
                date: item.date || new Date().toISOString().split('T')[0],
                description: item.description,
                amount: amount,
                category: item.category,
                accountId: item.accountId || accounts[0]?.id,
                type: item.type,
                friend: item.friend || ''
            });
            pendingTransactionsService.remove(item.id);
        } catch (err) {
            console.error('[PendingFeed] Failed to add transaction:', err);
        }
    };

    const handleDismiss = (id) => {
        pendingTransactionsService.remove(id);
    };

    const handleEdit = (item) => {
        setEditingId(item.id);
        setEditForm({ ...item });
    };

    const handleSaveEdit = async () => {
        if (!editForm) return;
        try {
            await addTransaction({
                date: editForm.date,
                description: editForm.description,
                amount: editForm.type === 'expense' ? -Math.abs(editForm.amount) : Math.abs(editForm.amount),
                category: editForm.category,
                accountId: editForm.accountId || accounts[0]?.id,
                type: editForm.type,
                friend: editForm.friend || ''
            });
            pendingTransactionsService.remove(editForm.id);
            setEditingId(null);
            setEditForm(null);
        } catch (err) {
            console.error('Failed to save:', err);
        }
    };

    // Handle paste from clipboard
    const handlePasteFromClipboard = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                processManualInput(text);
            } else {
                toast('Clipboard is empty', 'error');
            }
        } catch (e) {
            toast('Could not access clipboard', 'error');
        }
    };

    // Process manual SMS text input
    const processManualInput = (text) => {
        if (!text || !text.trim()) {
            toast('Please enter SMS text', 'error');
            return;
        }

        const parsed = parseSMS(text);
        if (parsed && parsed.amount) {
            const transaction = formatParsedTransaction(parsed, accounts);
            if (transaction) {
                // Add date if missing
                transaction.date = transaction.date || new Date().toISOString().split('T')[0];
                transaction.rawText = text.slice(0, 200);
                transaction.source = 'manual';

                const added = pendingTransactionsService.add(transaction);
                if (added) {
                    toast(`Detected: ₹${Math.abs(transaction.amount)} ${transaction.type}`);
                    setManualText('');
                    setShowInput(false);
                } else {
                    toast('Duplicate transaction detected', 'error');
                }
            } else {
                toast('Could not parse transaction', 'error');
            }
        } else {
            toast('No transaction found in text', 'error');
        }
    };

    // Show input section even when no pending transactions
    if (pending.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
            >
                <button
                    onClick={() => setShowInput(!showInput)}
                    className="w-full modern-card p-4 flex items-center justify-center gap-2 text-text-muted hover:text-primary hover:border-primary transition-all"
                >
                    <Sparkles size={18} />
                    <span className="text-xs font-bold uppercase tracking-wider">Paste SMS/Text to Detect Transaction</span>
                </button>

                <AnimatePresence>
                    {showInput && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="mt-3 p-4 modern-card space-y-3">
                                <div className="flex gap-2">
                                    <button
                                        onClick={handlePasteFromClipboard}
                                        className="flex-1 py-2 px-3 rounded-lg bg-canvas-subtle border border-card-border text-xs font-bold flex items-center justify-center gap-2 hover:border-primary transition-all"
                                    >
                                        <Clipboard size={14} />
                                        Paste from Clipboard
                                    </button>
                                </div>
                                <textarea
                                    value={manualText}
                                    onChange={(e) => setManualText(e.target.value)}
                                    placeholder="Or paste/type bank SMS here..."
                                    className="w-full p-3 rounded-lg bg-canvas-subtle border border-card-border text-sm resize-none h-24 focus:border-primary outline-none text-text-main"
                                />
                                <button
                                    onClick={() => processManualInput(manualText)}
                                    disabled={!manualText.trim()}
                                    className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50"
                                >
                                    Detect Transaction
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
        >
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/30 rounded-2xl mb-2"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <Sparkles size={20} className="text-primary" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-sm font-black text-text-main">
                            {pending.length} Detected Transaction{pending.length > 1 ? 's' : ''}
                        </h3>
                        <p className="text-[10px] text-text-muted">From SMS • Tap to review</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                        {pending.length}
                    </span>
                    {expanded ? <ChevronUp size={20} className="text-text-muted" /> : <ChevronDown size={20} className="text-text-muted" />}
                </div>
            </button>

            {/* Pending Items */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-2 overflow-hidden"
                    >
                        {pending.map(item => (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: 20, opacity: 0 }}
                                className="bg-card border border-card-border rounded-xl overflow-hidden"
                            >
                                {editingId === item.id ? (
                                    /* Edit Mode */
                                    <div className="p-4 space-y-3">
                                        <input
                                            type="text"
                                            value={editForm?.description || ''}
                                            onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                                            className="w-full bg-canvas-subtle border border-card-border py-2 px-3 rounded-lg text-sm font-bold text-text-main outline-none"
                                            placeholder="Description"
                                        />
                                        <div className="grid grid-cols-2 gap-2">
                                            <input
                                                type="number"
                                                value={Math.abs(editForm?.amount || 0)}
                                                onChange={e => setEditForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                                                className="bg-canvas-subtle border border-card-border py-2 px-3 rounded-lg text-sm font-bold text-text-main outline-none"
                                                placeholder="Amount"
                                            />
                                            <select
                                                value={editForm?.category || ''}
                                                onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                                                className="bg-canvas-subtle border border-card-border py-2 px-3 rounded-lg text-sm font-bold text-text-main outline-none"
                                            >
                                                {categories.map(c => (
                                                    <option key={c.name} value={c.name}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <select
                                                value={editForm?.accountId || ''}
                                                onChange={e => setEditForm(f => ({ ...f, accountId: e.target.value }))}
                                                className="bg-canvas-subtle border border-card-border py-2 px-3 rounded-lg text-sm font-bold text-text-main outline-none"
                                            >
                                                {accounts.map(a => (
                                                    <option key={a.id} value={a.id}>{a.name}</option>
                                                ))}
                                            </select>
                                            <input
                                                type="date"
                                                value={editForm?.date || ''}
                                                onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                                                className="bg-canvas-subtle border border-card-border py-2 px-3 rounded-lg text-sm font-bold text-text-main outline-none"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => { setEditingId(null); setEditForm(null); }}
                                                className="flex-1 py-2 border border-card-border rounded-lg text-xs font-bold text-text-muted"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSaveEdit}
                                                className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold"
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* View Mode */
                                    <div className="p-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-text-main truncate">{item.description}</p>
                                                <p className="text-[10px] text-text-muted">
                                                    {item.date} • {item.category}
                                                </p>
                                            </div>
                                            <div className={`text-lg font-black ${item.type === 'expense' ? 'text-red-500' : 'text-primary'}`}>
                                                {item.type === 'expense' ? '-' : '+'}₹{Math.abs(item.amount).toLocaleString()}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleDismiss(item.id)}
                                                className="flex-1 py-2.5 border border-card-border rounded-xl text-xs font-bold text-text-muted flex items-center justify-center gap-1 hover:border-red-500 hover:text-red-500 transition-colors"
                                            >
                                                <X size={14} /> Dismiss
                                            </button>
                                            <button
                                                onClick={() => handleEdit(item)}
                                                className="flex-1 py-2.5 border border-card-border rounded-xl text-xs font-bold text-text-muted flex items-center justify-center gap-1 hover:border-primary hover:text-primary transition-colors"
                                            >
                                                <Edit2 size={14} /> Edit
                                            </button>
                                            <button
                                                onClick={() => handleApprove(item)}
                                                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                                            >
                                                <Check size={14} /> Add
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ))}

                        {/* Clear All */}
                        {pending.length > 1 && (
                            <button
                                onClick={() => pendingTransactionsService.clear()}
                                className="w-full py-2 text-xs font-bold text-text-muted hover:text-red-500 transition-colors"
                            >
                                Dismiss All
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default PendingTransactionsFeed;
