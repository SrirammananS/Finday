import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useFinance } from '../context/FinanceContext';
import { useFeedback } from '../context/FeedbackContext';
import { motion, AnimatePresence } from 'framer-motion';
import { animations, genZEffects } from '../utils/gsapAnimations';
import { X, Calendar, Wallet, Mic, Users, Plus, Sparkles, TrendingUp, Check, Cloud, CloudOff, AlertTriangle } from 'lucide-react';
import { smartAI } from '../services/smartAI';
import { formatCurrency, formatNumber } from '../utils/formatUtils';

const TransactionForm = ({ onClose, editTransaction }) => {
    const { addTransaction, updateTransaction, accounts, categories, categoriesByUsage, bills, billPayments, creditCards = [], creditCardPayments = [], updateCreditCardPayment, updateCreditCard, transactions, friends, addFriend } = useFinance();
    const { toast } = useFeedback();
    const [form, setForm] = useState({
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: '',
        category: categories[0]?.name || 'Other',
        accountId: accounts[0]?.id || '',
        type: 'expense',
        isBillPayment: false,
        billId: '',
        paymentType: 'recurring',
        linkedAccountId: '',
        creditCardPaymentId: '',
        friend: ''
    });

    const [suggestedCategory, setSuggestedCategory] = useState(null);
    const [spendingInsight, setSpendingInsight] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [syncResult, setSyncResult] = useState(null); // null | 'synced' | 'local' | 'error'
    const [showAddFriend, setShowAddFriend] = useState(false);
    const [newFriendName, setNewFriendName] = useState('');
    const amountRef = useRef(null);
    const submitBtnRef = useRef(null);
    const modalRef = useRef(null);

    // Focus trap and Escape handler
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                if (!isSubmitting) onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);

        // Delayed focus to trigger keyboard after mount animation on mobile
        const focusTimer = setTimeout(() => {
            if (amountRef.current) {
                amountRef.current.focus();
                amountRef.current.click();
            }
        }, 400);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            clearTimeout(focusTimer);
        };
    }, [onClose, isSubmitting]);

    // Apply GSAP button press effect
    useEffect(() => {
        if (submitBtnRef.current) {
            return genZEffects.buttonPress(submitBtnRef.current);
        }
    }, []);

    // Friends loaded from Context now

    const handleVoiceInput = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Voice input not supported in this browser.");
            return;
        }

        const recognition = new window.webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-IN';

        setIsListening(true);

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.toLowerCase();
            const numbers = transcript.match(/\d+/);
            if (numbers) {
                setForm(f => ({ ...f, amount: numbers[0] }));
            }
            let desc = transcript.replace(/\d+/g, '').replace(/(for|rupees|rs)/g, '').trim();
            if (desc) {
                setForm(f => ({ ...f, description: desc.charAt(0).toUpperCase() + desc.slice(1) }));
            }
            setIsListening(false);
        };

        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognition.start();
    };

    useEffect(() => {
        if (editTransaction) {
            setForm({
                ...editTransaction,
                amount: Math.abs(editTransaction.amount).toString(),
                type: editTransaction.amount > 0 ? 'income' : 'expense'
            });
        }
    }, [editTransaction]);

    // Update category when categories load from sheet (use first from usage-ordered list)
    useEffect(() => {
        const ordered = categoriesByUsage?.length ? categoriesByUsage : categories;
        if (ordered.length > 0 && !form.category) {
            setForm(f => ({ ...f, category: ordered[0].name }));
        }
    }, [categories, categoriesByUsage, form.category]);

    // AI Suggestions & Insights
    useEffect(() => {
        if (!form.description) {
            setSuggestedCategory(null);
            return;
        }

        // Predict category
        const prediction = smartAI.predictCategory(form.description, parseFloat(form.amount) || 0);
        if (prediction.confidence > 0.4) {
            setSuggestedCategory(prediction.category);
        } else {
            setSuggestedCategory(null);
        }

        // Calculate insight
        const currentCategory = form.category;
        const now = new Date();
        const startOfMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);

        const monthlyTotal = (transactions || [])
            .filter(t => t.category === currentCategory && new Date(t.date) >= startOfMonthDate && (t.type === 'expense' || t.amount < 0))
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        setSpendingInsight(monthlyTotal);
    }, [form.description, form.category, form.amount, transactions]);

    const handleSubmit = async (e) => {
        e?.preventDefault();
        const amountNum = parseFloat(form.amount);
        if (isNaN(amountNum)) return;
        const finalAmount = form.type === 'expense' ? -Math.abs(amountNum) : Math.abs(amountNum);

        setIsSubmitting(true);
        setSyncResult(null);
        try {
            let result;
            if (editTransaction) {
                result = await updateTransaction({ ...form, id: editTransaction.id, amount: finalAmount });
            } else {
                result = await addTransaction({ ...form, amount: finalAmount });
            }

            if (result?.id && form.creditCardPaymentId) {
                const payment = (creditCardPayments || []).find(p => p.id === form.creditCardPaymentId);
                if (payment) {
                    try {
                        const paidDate = form.date ? new Date(form.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
                        await updateCreditCardPayment(payment.id, { transactionId: result.id, status: 'paid', paidDate });
                        await updateCreditCard(payment.creditCardId, { status: 'closed' });
                    } catch (ccErr) {
                        console.warn('CC close failed:', ccErr);
                    }
                }
            }

            const wasSynced = result?.synced === true;
            setSyncResult(wasSynced ? 'synced' : 'local');
            setIsSubmitting(false);

            const cat = categories.find(c => c.name === form.category);
            const fallbackEmoji = form.type === 'income' ? '💰' : '💸';
            const subtype = (form.isBillPayment && form.paymentType === 'cc') ? 'cc' : form.type;

            // Fire after paint so EmojiBurst can run on web/PWA/mobile
            const detail = { type: subtype, emoji: cat?.icon || fallbackEmoji, amount: finalAmount };
            requestAnimationFrame(() => {
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('transaction-saved', { detail }));
                }, 150);
            });

            setTimeout(() => onClose(), 2500);
        } catch (err) {
            console.error('Transaction save failed:', err);
            setSyncResult('error');
            setIsSubmitting(false);
        }
    };

    const creditAccounts = accounts.filter(a => a.type === 'credit');
    const creditAccountIds = new Set(creditAccounts.map(a => a.id));
    const recurringBills = (bills || []).filter(b => b.billType !== 'credit_card' && !creditAccountIds.has(b.accountId));

    const pendingCCPayments = React.useMemo(() => {
        const openCardIds = new Set((creditCards || []).filter(c => c.status !== 'closed').map(c => c.id));
        return (creditCardPayments || []).filter(p => p.status === 'pending' && openCardIds.has(p.creditCardId));
    }, [creditCards, creditCardPayments]);

    const modalContent = (
        <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="transaction-form-title"
            className="fixed inset-0 z-[10000] flex items-end md:items-center justify-center md:p-6 overflow-hidden" data-modal-overlay
        >
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />

            <motion.div
                layoutId="form-sheet"
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="form-sheet relative w-full max-w-lg bg-card border border-card-border rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col max-h-[95dvh] md:max-h-[90dvh] overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header - Enhanced */}
                <header className="flex justify-between items-center p-4 md:p-6 pb-3 md:pb-4 border-b border-card-border bg-gradient-to-r from-primary/5 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                            <Plus size={20} className="text-primary" />
                        </div>
                        <div>
                            <h2 id="transaction-form-title" className="text-xl font-black tracking-tight text-text-main">
                                {editTransaction ? 'Edit Transaction' : 'New Entry'}
                            </h2>
                            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-0.5">
                                {editTransaction ? 'Update Details' : 'Quick Add'}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        aria-label="Close"
                        disabled={isSubmitting}
                        className="w-10 h-10 rounded-full border border-card-border flex items-center justify-center text-text-muted hover:text-text-main hover:bg-canvas-subtle transition-all hover:scale-110 disabled:opacity-50"
                    >
                        <X size={20} />
                    </button>
                </header>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 md:space-y-6">
                    {/* Amount Entry - Enhanced */}
                    <div className="text-center space-y-4">
                        <div className="inline-flex items-center gap-2 justify-center">
                            <span className="text-3xl font-bold text-text-muted">₹</span>
                            <input
                                type="number"
                                ref={amountRef}
                                value={form.amount}
                                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                                className="w-48 text-5xl font-black text-center outline-none bg-transparent caret-primary text-text-main placeholder-text-muted/20"
                                placeholder="0"
                                inputMode="decimal"
                                required
                            />
                        </div>

                        {/* Type Toggle */}
                        <div className="mt-6 flex justify-center">
                            <div className="bg-canvas-subtle p-1 rounded-full flex gap-1 border border-card-border">
                                {['expense', 'income'].map(type => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, type, isBillPayment: false }))}
                                        className={`px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${form.type === type
                                            ? 'bg-primary text-primary-foreground shadow-md'
                                            : 'text-text-muted hover:text-text-main'
                                            }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Bill Payment Checkbox - Only for expenses */}
                        {form.type === 'expense' && (
                            <div className="mt-5">
                                <label className="inline-flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.isBillPayment}
                                        onChange={e => setForm(f => ({
                                            ...f,
                                            isBillPayment: e.target.checked,
                                            billId: '',
                                            linkedAccountId: '',
                                            creditCardPaymentId: ''
                                        }))}
                                        className="w-5 h-5 accent-primary rounded"
                                    />
                                    <span className="text-sm font-bold text-text-muted">Is this a Bill Payment?</span>
                                </label>

                                <AnimatePresence>
                                    {form.isBillPayment && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="mt-4 p-4 bg-canvas-subtle rounded-2xl border border-card-border space-y-4">
                                                {/* Payment Type Toggle */}
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setForm(f => ({ ...f, paymentType: 'recurring', linkedAccountId: '', creditCardPaymentId: '' }))}
                                                        className={`py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${form.paymentType !== 'cc'
                                                            ? 'bg-primary text-primary-foreground'
                                                            : 'bg-canvas border border-card-border text-text-muted'}`}
                                                    >
                                                        Recurring Bill
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setForm(f => ({ ...f, paymentType: 'cc', linkedAccountId: '', creditCardPaymentId: '' }))}
                                                        className={`py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${form.paymentType === 'cc'
                                                            ? 'bg-primary text-primary-foreground'
                                                            : 'bg-canvas border border-card-border text-text-muted'}`}
                                                    >
                                                        Credit Card
                                                    </button>
                                                </div>

                                                {form.paymentType === 'cc' ? (
                                                    <div className="text-left space-y-2">
                                                        <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted ml-1 mb-2 block">Credit card payment? Select cycle to close</label>
                                                        {pendingCCPayments.length > 0 ? (
                                                            <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide">
                                                                {pendingCCPayments.map(p => {
                                                                    const card = (creditCards || []).find(c => c.id === p.creditCardId);
                                                                    const cardName = card?.name || p.name || 'Card';
                                                                    const isSelected = form.creditCardPaymentId === p.id;
                                                                    return (
                                                                        <button
                                                                            key={p.id}
                                                                            type="button"
                                                                            onClick={() => setForm(f => ({ ...f, creditCardPaymentId: p.id, amount: String(Math.abs(Number(p.amount)) || ''), description: `${cardName} – Payment` }))}
                                                                            className={`w-full p-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-all ${isSelected ? 'bg-primary/10 border-primary/40 ring-1 ring-primary/30' : 'bg-canvas border-card-border hover:border-primary/20'}`}
                                                                        >
                                                                            <div className="flex items-center gap-3 min-w-0">
                                                                                <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center text-base shrink-0">💳</div>
                                                                                <div className="min-w-0">
                                                                                    <span className="text-sm font-bold text-text-main block truncate">{p.name || cardName}</span>
                                                                                    <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">{p.dueDate ? `Due ${p.dueDate}` : 'Due –'}</span>
                                                                                </div>
                                                                            </div>
                                                                            <span className="text-sm font-black tabular-nums whitespace-nowrap text-rose-400">
                                                                                {formatCurrency(p.amount)}
                                                                            </span>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <div className="p-3 text-xs text-text-muted bg-canvas rounded-xl border border-card-border/50">
                                                                No pending credit card cycles. Spend on a card to generate a cycle, or link payment in Credit Card Manager.
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="text-left space-y-2">
                                                        <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted ml-1 mb-2 block">Select Subscription</label>
                                                        {recurringBills.length > 0 ? (
                                                            <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide">
                                                                {recurringBills.map(b => {
                                                                    const isSelected = form.billId === b.id;
                                                                    return (
                                                                        <button
                                                                            key={b.id}
                                                                            type="button"
                                                                            onClick={() => setForm(f => ({ ...f, billId: b.id, amount: b.amount.toString(), description: `Paid ${b.name}` }))}
                                                                            className={`w-full p-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-all ${isSelected ? 'bg-primary/10 border-primary/40 ring-1 ring-primary/30' : 'bg-canvas border-card-border hover:border-primary/20'}`}
                                                                        >
                                                                            <div className="flex items-center gap-3 min-w-0">
                                                                                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-base shrink-0">📅</div>
                                                                                <div className="min-w-0">
                                                                                    <span className="text-sm font-bold text-text-main block truncate">{b.name}</span>
                                                                                    <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">{b.category || 'Bill'}</span>
                                                                                </div>
                                                                            </div>
                                                                            <span className="text-sm font-black tabular-nums whitespace-nowrap text-text-main">
                                                                                {formatCurrency(b.amount)}
                                                                            </span>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <div className="p-3 text-xs text-text-muted bg-canvas rounded-xl border border-card-border/50">
                                                                No recurring bills found. Add one in Bills tab.
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                    {/* Description with Mic */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted ml-1">Description</label>
                            <AnimatePresence>
                                {suggestedCategory && suggestedCategory !== form.category && (
                                    <motion.button
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, category: suggestedCategory }))}
                                        className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 text-primary border border-primary/20 rounded-lg text-[10px] font-bold"
                                    >
                                        <Sparkles size={10} />
                                        Suggest: {suggestedCategory}
                                    </motion.button>
                                )}
                            </AnimatePresence>
                        </div>
                        <div className="relative">
                            <input
                                type="text"
                                value={form.description}
                                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                placeholder="What's this for?"
                                className="w-full bg-canvas-subtle border border-card-border py-3.5 px-5 rounded-xl font-bold text-sm outline-none focus:border-primary transition-all text-text-main placeholder:text-text-muted/40 pr-14"
                                required
                            />
                            <button
                                type="button"
                                onClick={handleVoiceInput}
                                className={`absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-red-500 text-white animate-pulse scale-110' : 'bg-canvas-subtle text-text-muted hover:text-primary hover:bg-primary/10'}`}
                                title="Voice Input"
                            >
                                <Mic size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Category - Horizontal Scroll */}
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted ml-1">Category</label>
                            {spendingInsight !== null && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-text-muted">
                                    <TrendingUp size={10} />
                                    Spent ₹{formatNumber(spendingInsight)} this month
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-1 px-1">
                            {(() => {
                                const displayCats = categoriesByUsage?.length ? categoriesByUsage : categories;
                                return displayCats.length > 0 ? displayCats.map(c => (
                                <button
                                    key={c.name}
                                    type="button"
                                    onClick={(e) => {
                                        setForm(f => ({ ...f, category: c.name }));
                                        animations.jelly(e.currentTarget);
                                    }}
                                    className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${form.category === c.name
                                        ? 'bg-primary text-primary-foreground border-primary shadow-lg scale-105'
                                        : 'bg-canvas-subtle border-card-border text-text-muted hover:border-text-muted/50'}`}
                                >
                                    <span className="text-lg">{c.icon}</span>
                                    <span className="text-xs font-bold whitespace-nowrap">{c.name}</span>
                                </button>
                            )) : (
                                <p className="text-xs text-text-muted">Loading categories...</p>
                            );
                            })()}
                        </div>
                    </div>

                    {/* Quick Fields Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted ml-1 mb-2 block">Date</label>
                            <div className="relative group">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none size-4 group-focus-within:text-primary transition-colors" size={16} />
                                <input
                                    type="date"
                                    value={form.date}
                                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                    className="w-full bg-canvas-subtle border border-card-border py-3.5 pl-11 pr-10 rounded-2xl font-semibold text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-text-main [color-scheme:inherit] min-h-[44px]"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted ml-1 mb-2 block">Account</label>
                            <div className="relative">
                                <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none size-4" size={16} />
                                <select
                                    value={form.accountId}
                                    onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}
                                    className="w-full bg-canvas-subtle border border-card-border py-3.5 pl-11 pr-4 rounded-2xl font-semibold text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all appearance-none text-text-main min-h-[44px]"
                                    required
                                >
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Friend Dropdown */}
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted ml-1 mb-2 block">Split with Friend (Optional)</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                                <select
                                    value={form.friend || ''}
                                    onChange={e => setForm(f => ({ ...f, friend: e.target.value }))}
                                    className="w-full bg-canvas-subtle border border-card-border py-3.5 pl-11 pr-4 rounded-xl font-bold text-sm outline-none focus:border-primary transition-all appearance-none text-text-main"
                                >
                                    <option value="">-- No Friend --</option>
                                    {friends.map(f => (
                                        <option key={f.id} value={f.name}>{f.name}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAddFriend(true)}
                                className="w-12 h-12 bg-canvas-subtle border border-card-border rounded-xl flex items-center justify-center text-text-muted hover:text-primary hover:border-primary transition-all"
                                title="Add new friend"
                            >
                                <Plus size={20} />
                            </button>
                        </div>

                        {/* Add Friend Inline */}
                        <AnimatePresence>
                            {showAddFriend && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="mt-3 flex gap-2">
                                        <input
                                            type="text"
                                            value={newFriendName}
                                            onChange={e => setNewFriendName(e.target.value)}
                                            placeholder="Friend's name"
                                            className="flex-1 bg-canvas-subtle border border-card-border py-3 px-4 rounded-xl font-bold text-sm outline-none focus:border-primary text-text-main placeholder:text-text-muted/40"
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (newFriendName.trim()) {
                                                    const added = addFriend(newFriendName);
                                                    if (added) {
                                                        setForm(f => ({ ...f, friend: added.name }));
                                                    }
                                                }
                                                setNewFriendName('');
                                                setShowAddFriend(false);
                                            }}
                                            className="px-4 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm"
                                        >
                                            Add
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setNewFriendName('');
                                                setShowAddFriend(false);
                                            }}
                                            className="px-3 py-3 border border-card-border rounded-xl text-text-muted"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Sync Result Overlay */}
                <AnimatePresence>
                    {syncResult && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-card/95 backdrop-blur-sm rounded-2xl"
                        >
                            {syncResult === 'synced' && (
                                <motion.div
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                                    className="flex flex-col items-center gap-4"
                                >
                                    <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                                        <Cloud size={28} className="text-primary" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg font-black text-text-main">Synced to Cloud</p>
                                        <p className="text-xs font-bold text-text-muted mt-1">Saved to Google Sheets</p>
                                    </div>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: '100%' }}
                                        transition={{ duration: 1.2, ease: 'linear' }}
                                        className="h-0.5 bg-primary rounded-full max-w-[120px]"
                                    />
                                </motion.div>
                            )}
                            {syncResult === 'local' && (
                                <motion.div
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                                    className="flex flex-col items-center gap-4"
                                >
                                    <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center">
                                        <CloudOff size={28} className="text-amber-500" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg font-black text-text-main">Saved Locally</p>
                                        <p className="text-xs font-bold text-text-muted mt-1">Will sync when connected</p>
                                    </div>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: '100%' }}
                                        transition={{ duration: 2, ease: 'linear' }}
                                        className="h-0.5 bg-amber-500 rounded-full max-w-[120px]"
                                    />
                                </motion.div>
                            )}
                            {syncResult === 'error' && (
                                <motion.div
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                                    className="flex flex-col items-center gap-4"
                                >
                                    <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center">
                                        <AlertTriangle size={28} className="text-rose-500" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg font-black text-text-main">Save Failed</p>
                                        <p className="text-xs font-bold text-text-muted mt-1">Please try again</p>
                                    </div>
                                    <div className="flex gap-3 mt-2">
                                        <button
                                            onClick={() => { setSyncResult(null); }}
                                            className="px-5 py-2.5 rounded-xl border border-card-border text-sm font-bold text-text-muted hover:text-text-main transition-all"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={handleSubmit}
                                            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold"
                                        >
                                            Retry
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Sticky Footer */}
                <div className="p-4 md:p-6 pt-3 md:pt-4 border-t border-card-border bg-card">
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={isSubmitting || syncResult === 'synced' || syncResult === 'local'}
                            className="px-6 py-4 rounded-xl border border-card-border text-text-muted hover:text-text-main hover:border-primary/30 transition-all text-sm font-bold uppercase disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            ref={submitBtnRef}
                            disabled={isSubmitting || !!syncResult || !form.amount || !form.description}
                            className="flex-1 modern-btn modern-btn-primary py-4 text-base font-bold uppercase tracking-wider shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full"
                                    />
                                    Syncing...
                                </>
                            ) : (
                                <>
                                    <Check size={18} />
                                    {editTransaction ? 'Update Entry' : 'Add Transaction'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );

    return ReactDOM.createPortal(modalContent, document.body);
};

export default TransactionForm;
