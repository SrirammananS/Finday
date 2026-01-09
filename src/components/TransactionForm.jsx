import React, { useState, useEffect, useRef } from 'react';
import { useFinance } from '../context/FinanceContext';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { X, Calendar, Wallet, Mic } from 'lucide-react';

const TransactionForm = ({ onClose, editTransaction }) => {
    const { addTransaction, updateTransaction, accounts, categories, bills, isSyncing } = useFinance();
    const [form, setForm] = useState({
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: '',
        category: categories[0]?.name || 'Other',
        accountId: accounts[0]?.id || '',
        type: 'expense',
        isBillPayment: false,
        billId: '',
        linkedAccountId: '',
        friend: ''
    });

    const [isListening, setIsListening] = useState(false);
    const amountRef = useRef(null);

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

    // Update category when categories load from sheet
    useEffect(() => {
        if (categories.length > 0 && !form.category) {
            setForm(f => ({ ...f, category: categories[0].name }));
        }
    }, [categories]);

    const handleSubmit = async (e) => {
        e?.preventDefault();
        const amountNum = parseFloat(form.amount);
        if (isNaN(amountNum)) return;
        const finalAmount = form.type === 'expense' ? -Math.abs(amountNum) : Math.abs(amountNum);

        gsap.to('.form-sheet', { scale: 0.95, opacity: 0, duration: 0.4, onComplete: onClose });

        if (editTransaction) {
            await updateTransaction({ ...form, id: editTransaction.id, amount: finalAmount });
        } else {
            await addTransaction({ ...form, amount: finalAmount });
        }
    };

    const creditCards = accounts.filter(a => a.type === 'credit');

    return (
        <div className="fixed inset-0 z-[10000] flex items-end md:items-center justify-center">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />

            <motion.div
                layoutId="form-sheet"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="form-sheet relative w-full max-w-lg bg-card border border-card-border rounded-t-[2rem] md:rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <header className="flex justify-between items-center p-6 pb-4 border-b border-card-border">
                    <div>
                        <h2 className="text-2xl font-black tracking-tight text-text-main">
                            {editTransaction ? 'Edit' : 'New'} Transaction
                        </h2>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full border border-card-border flex items-center justify-center text-text-muted hover:text-text-main hover:bg-canvas-subtle transition-all">
                        <X size={20} />
                    </button>
                </header>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Amount Entry */}
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 justify-center">
                            <span className="text-2xl font-bold text-text-muted">₹</span>
                            <input
                                type="number"
                                ref={amountRef}
                                value={form.amount}
                                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                                className="w-48 text-5xl font-black text-center outline-none bg-transparent caret-primary text-text-main placeholder-text-muted/20"
                                placeholder="0"
                                autoFocus
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
                        {form.type === 'expense' && (bills?.length > 0 || creditCards.length > 0) && (
                            <div className="mt-5">
                                <label className="inline-flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.isBillPayment}
                                        onChange={e => setForm(f => ({
                                            ...f,
                                            isBillPayment: e.target.checked,
                                            billId: '',
                                            linkedAccountId: ''
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
                                                        onClick={() => setForm(f => ({ ...f, paymentType: 'recurring', linkedAccountId: '' }))}
                                                        className={`py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${form.paymentType !== 'cc'
                                                            ? 'bg-primary text-primary-foreground'
                                                            : 'bg-canvas border border-card-border text-text-muted'}`}
                                                    >
                                                        Recurring Bill
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setForm(f => ({ ...f, paymentType: 'cc', billId: '' }))}
                                                        className={`py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${form.paymentType === 'cc'
                                                            ? 'bg-primary text-primary-foreground'
                                                            : 'bg-canvas border border-card-border text-text-muted'}`}
                                                    >
                                                        Credit Card
                                                    </button>
                                                </div>

                                                {form.paymentType === 'cc' ? (
                                                    <div className="text-left">
                                                        <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted ml-1 mb-2 block">Select Credit Card</label>
                                                        <select
                                                            value={form.linkedAccountId}
                                                            onChange={e => setForm(f => ({ ...f, linkedAccountId: e.target.value }))}
                                                            className="w-full bg-canvas-subtle border border-card-border py-3 px-4 rounded-xl text-sm font-bold text-text-main outline-none focus:border-primary cursor-pointer"
                                                        >
                                                            <option value="">-- Choose Card --</option>
                                                            {creditCards.map(a => (
                                                                <option key={a.id} value={a.id}>{a.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                ) : (
                                                    <div className="text-left">
                                                        <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted ml-1 mb-2 block">Select Subscription</label>
                                                        <select
                                                            value={form.billId}
                                                            onChange={e => {
                                                                const bill = bills?.find(b => b.id === e.target.value);
                                                                setForm(f => ({
                                                                    ...f,
                                                                    billId: e.target.value,
                                                                    amount: bill ? bill.amount.toString() : f.amount,
                                                                    description: bill ? `Paid ${bill.name}` : f.description
                                                                }));
                                                            }}
                                                            className="w-full bg-canvas-subtle border border-card-border py-3 px-4 rounded-xl text-sm font-bold text-text-main outline-none focus:border-primary cursor-pointer"
                                                        >
                                                            <option value="">-- Choose Bill --</option>
                                                            {bills?.map(b => (
                                                                <option key={b.id} value={b.id}>{b.name} (₹{b.amount})</option>
                                                            ))}
                                                        </select>
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
                        <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted ml-1 mb-2 block">Description</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={form.description}
                                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                placeholder="What's this for?"
                                className="w-full bg-canvas-subtle border border-card-border py-4 px-5 rounded-2xl font-bold text-base outline-none focus:border-primary transition-all text-text-main placeholder:text-text-muted/40 pr-14"
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

                    {/* Category - Horizontal Scroll (fetched from sheet) */}
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted ml-1 mb-3 block">Category</label>
                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-1 px-1">
                            {categories.length > 0 ? categories.map(c => (
                                <button
                                    key={c.name}
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, category: c.name }))}
                                    className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${form.category === c.name
                                        ? 'bg-primary text-primary-foreground border-primary shadow-lg scale-105'
                                        : 'bg-canvas-subtle border-card-border text-text-muted hover:border-text-muted/50'}`}
                                >
                                    <span className="text-lg">{c.icon}</span>
                                    <span className="text-xs font-bold whitespace-nowrap">{c.name}</span>
                                </button>
                            )) : (
                                <p className="text-xs text-text-muted">Loading categories...</p>
                            )}
                        </div>
                    </div>

                    {/* Quick Fields Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted ml-1 mb-2 block">Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                                <input
                                    type="date"
                                    value={form.date}
                                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                    className="w-full bg-canvas-subtle border border-card-border py-3.5 pl-11 pr-4 rounded-xl font-bold text-sm outline-none focus:border-primary transition-all text-text-main"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted ml-1 mb-2 block">Account</label>
                            <div className="relative">
                                <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                                <select
                                    value={form.accountId}
                                    onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}
                                    className="w-full bg-canvas-subtle border border-card-border py-3.5 pl-11 pr-4 rounded-xl font-bold text-sm outline-none focus:border-primary transition-all appearance-none text-text-main"
                                    required
                                >
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Friend Tag */}
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted ml-1 mb-2 block">Split with Friend (Optional)</label>
                        <input
                            type="text"
                            value={form.friend || ''}
                            onChange={e => setForm(f => ({ ...f, friend: e.target.value }))}
                            placeholder="Friend's name"
                            className="w-full bg-canvas-subtle border border-card-border py-3.5 px-4 rounded-xl font-bold text-sm outline-none focus:border-primary transition-all text-text-main placeholder:text-text-muted/40"
                        />
                    </div>
                </div>

                {/* Sticky Footer */}
                <div className="p-6 pt-4 border-t border-card-border bg-card">
                    <button
                        onClick={handleSubmit}
                        type="button"
                        disabled={isSyncing || !form.amount}
                        className="modern-btn modern-btn-primary w-full py-4 text-base font-bold uppercase tracking-wider shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSyncing ? 'Saving...' : (editTransaction ? 'Update' : 'Save Transaction')}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default TransactionForm;
