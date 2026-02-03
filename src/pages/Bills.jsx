import React, { useState, useEffect, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Plus, Bell, Trash2, CheckCircle2, X, ChevronLeft, ChevronRight, Zap, Brain, TrendingUp, Calendar, List, Layers, Activity, Link2, Check } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isSameYear, parseISO, subDays, addDays } from 'date-fns';
import { billManager } from '../services/billManager';
import { smartAI } from '../services/smartAI';

const Bills = () => {
    const {
        bills = [],
        billPayments = [],
        addBill,
        updateBill,
        deleteBill,
        updateBillPayment,
        isLoading,
        transactions = []
    } = useFinance();
    const [showModal, setShowModal] = useState(false);
    const [viewMode, setViewMode] = useState('list');
    const [form, setForm] = useState({
        name: '',
        amount: '',
        dueDay: '1',
        billingDay: '1', // For CC bills - when statement is generated
        category: 'Utilities/Bills',
        cycle: 'monthly',
        billType: 'recurring' // 'recurring' or 'credit_card'
    });
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [detectedBills, setDetectedBills] = useState([]);
    const [showDetected, setShowDetected] = useState(false);
    const [showMarkPaidModal, setShowMarkPaidModal] = useState(null); // Holds the payment instance being marked as paid
    const [selectedTransactionId, setSelectedTransactionId] = useState(null);

    useEffect(() => {
        if (transactions.length > 5) {
            const detected = billManager.detectBillsFromTransactions(transactions, smartAI);
            const newDetected = detected.filter(d =>
                !bills.some(b => b.name?.toLowerCase() === d.name?.toLowerCase())
            );
            setDetectedBills(newDetected);
        }
    }, [transactions, bills]);

    React.useEffect(() => {
        if (showModal) document.body.classList.add('overflow-hidden');
        else document.body.classList.remove('overflow-hidden');
    }, [showModal]);

    // Filter payments for the current month/view
    const visibleBills = useMemo(() => {
        const selectedMonthKey = format(selectedMonth, 'yyyy-MM');
        return billPayments.filter(p => {
            // Check if this payment is relevant for the selected view
            // High priority: The cycle matches (e.g., 2026-02)
            if (p.cycle === selectedMonthKey) return true;

            // Fallback: The due date is in the selected month
            try {
                return isSameMonth(parseISO(p.dueDate), selectedMonth);
            } catch (e) {
                return false;
            }
        }).sort((a, b) => {
            try {
                return parseISO(a.dueDate) - parseISO(b.dueDate);
            } catch (e) {
                return 0;
            }
        });
    }, [billPayments, selectedMonth]);

    const today = new Date();

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-canvas">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
        </div>
    );

    const totalMonthly = bills.reduce((acc, bill) => acc + (parseFloat(bill.amount) || 0), 0);
    const calendarDays = eachDayOfInterval({ start: startOfMonth(selectedMonth), end: endOfMonth(selectedMonth) });

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(Math.abs(amount) || 0);
    };

    // Helper functions for the UI
    const isPaid = (payment) => payment.status === 'paid';

    const getLinkedTransaction = (payment) => {
        if (payment.transactionId) return transactions.find(t => t.id === payment.transactionId);
        return null;
    };

    const getMatchingTransactions = (payment) => {
        if (!payment) return [];
        const pDate = parseISO(payment.dueDate);
        // Expand window: 15 days before due date, 20 days after
        const start = subDays(pDate, 15);
        const end = addDays(pDate, 20);

        const matches = transactions.filter(t => {
            const txDate = parseISO(t.date);
            const inRange = txDate >= start && txDate <= end;
            const isExpense = parseFloat(t.amount) < 0;
            const txAmt = Math.abs(parseFloat(t.amount));
            const pAmt = parseFloat(payment.amount);

            const amtMatch = Math.abs(txAmt - pAmt) <= (pAmt || 1) * 0.15; // 15% tolerance
            const nameMatch = t.description?.toLowerCase().includes(payment.name?.toLowerCase().split(' ')[0]);

            return inRange && isExpense && (amtMatch || nameMatch);
        });

        // If no smart matches, return the 5 most recent transactions in that month
        if (matches.length === 0) {
            return transactions
                .filter(t => isSameMonth(parseISO(t.date), pDate) && parseFloat(t.amount) < 0)
                .sort((a, b) => parseISO(b.date) - parseISO(a.date))
                .slice(0, 5);
        }

        return matches.sort((a, b) => parseISO(b.date) - parseISO(a.date));
    };

    const handleMarkPaid = async (payment, transactionId = null) => {
        console.log(`[LAKSH] Marking ${payment.name} as paid. TxID:`, transactionId);
        await updateBillPayment(payment.id, {
            status: 'paid',
            paidDate: new Date().toISOString(),
            transactionId: transactionId
        });
        setShowMarkPaidModal(null);
        setSelectedTransactionId(null);
    };

    const handleUnmarkPaid = async (payment) => {
        await updateBillPayment(payment.id, {
            status: 'pending',
            paidDate: null,
            transactionId: null
        });
    };

    const paidCount = visibleBills.filter(isPaid).length;
    const unpaidCount = visibleBills.length - paidCount;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.amount) return;
        await addBill(form);
        setForm({
            name: '',
            amount: '',
            dueDay: '1',
            billingDay: '1',
            category: 'Utilities/Bills',
            cycle: 'monthly',
            billType: 'recurring'
        });
        setShowModal(false);
    };

    return (
        <div className="min-h-screen text-text-main selection:bg-primary selection:text-black">
            {/* Background handled by Layout */}

            <motion.main
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative px-5 py-12 md:px-8 md:py-24 max-w-5xl mx-auto pb-40"
            >
                {/* Header Layer */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
                                <Activity size={24} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-text-muted">Bill Management</span>
                        </div>
                        <h1 className="text-xl font-black tracking-[-0.04em] leading-none mb-1 transition-all text-text-main uppercase">
                            Bills • {format(today, 'MMM yyyy')}
                        </h1>
                        <p className="text-[8px] font-semibold text-text-muted uppercase tracking-[0.4em] opacity-60">Recurring Commitments</p>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Paid/Unpaid Stats */}
                        <div className="flex items-center gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-black text-emerald-500 tabular-nums">{paidCount}</div>
                                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500/60">PAID</span>
                            </div>
                            <div className="w-px h-10 bg-card-border" />
                            <div className="text-center">
                                <div className="text-2xl font-black text-rose-500 tabular-nums">{unpaidCount}</div>
                                <span className="text-[8px] font-black uppercase tracking-widest text-rose-500/60">PENDING</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-text-muted opacity-40">Monthly Total</span>
                            <h3 className="text-3xl font-black text-text-main tabular-nums tracking-tighter leading-none">{formatCurrency(totalMonthly)}</h3>
                        </div>
                    </div>
                </header>

                {/* Controls and AI Hub */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
                    <div className="flex items-center gap-2 p-1.5 bg-canvas-subtle border border-card-border rounded-2xl">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`h-11 px-8 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-primary text-black shadow-lg' : 'text-text-muted hover:text-text-main'}`}
                        >
                            <List size={14} strokeWidth={3} /> LIST VIEW
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`h-11 px-8 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'calendar' ? 'bg-primary text-black shadow-lg' : 'text-text-muted hover:text-text-main'}`}
                        >
                            <Calendar size={14} strokeWidth={3} /> CHRONO MAP
                        </button>
                    </div>

                    {detectedBills.length > 0 && (
                        <button
                            onClick={() => setShowDetected(!showDetected)}
                            className="h-14 px-8 rounded-[1.8rem] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center gap-3 hover:bg-indigo-500/20 transition-all group"
                        >
                            <Brain size={18} className="group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">NEURAL DETECTED ({detectedBills.length})</span>
                        </button>
                    )}
                </div>

                {/* AI Detection Overlay */}
                <AnimatePresence>
                    {showDetected && detectedBills.length > 0 && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mb-12 overflow-hidden"
                        >
                            <div className="p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] bg-gradient-to-br from-indigo-500/20 to-transparent border border-indigo-500/30">
                                <div className="p-8 space-y-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xl font-black uppercase tracking-tighter text-indigo-300">Neural Sync Suggestions</h3>
                                        <button onClick={() => setShowDetected(false)} className="text-indigo-500/50 hover:text-indigo-400"><X size={20} /></button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {detectedBills.map((detected, idx) => (
                                            <div key={idx} className="p-6 rounded-[2rem] bg-white/[0.03] border border-white/5 flex items-center justify-between group hover:bg-white/[0.06] transition-all">
                                                <div>
                                                    <p className="text-lg font-black uppercase tracking-tighter text-text-main">{detected.name}</p>
                                                    <p className="text-[9px] font-black text-indigo-400/60 uppercase tracking-widest mt-1">{detected.cycle} • {detected.category}</p>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <span className="text-xl font-black tabular-nums">{formatCurrency(detected.amount)}</span>
                                                    <button
                                                        onClick={() => {
                                                            addBill({ ...detected, dueDay: detected.dueDay || '1' });
                                                            setDetectedBills(prev => prev.filter((_, i) => i !== idx));
                                                        }}
                                                        className="w-12 h-12 rounded-full bg-indigo-500 text-white flex items-center justify-center hover:scale-110 transition-transform"
                                                    >
                                                        <Plus size={20} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {viewMode === 'list' ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        <button
                            onClick={() => setShowModal(true)}
                            className="group rounded-[1.8rem] border-2 border-dashed border-white/10 hover:border-primary/50 hover:bg-primary/[0.02] transition-all flex flex-col items-center justify-center gap-3 min-h-[120px] h-full"
                        >
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-text-muted group-hover:bg-primary group-hover:text-black transition-all">
                                <Plus size={20} strokeWidth={3} />
                            </div>
                            <span className="text-xs font-black uppercase tracking-tighter text-text-muted group-hover:text-text-main">Add Bill</span>
                        </button>

                        {visibleBills.map((payment, idx) => {
                            const paid = isPaid(payment);
                            const linkedTx = getLinkedTransaction(payment);
                            const template = payment.template || {};
                            const isCC = template.billType === 'credit_card';
                            const dueDt = parseISO(payment.dueDate);

                            return (
                                <motion.div
                                    key={payment.id}
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.05 * idx }}
                                    className="group relative"
                                >
                                    <div className="absolute -inset-[1px] bg-gradient-to-br from-white/10 to-transparent rounded-[2rem] opacity-0 group-hover:opacity-100 transition-all duration-500" />
                                    <div className={`relative p-4 rounded-[1.8rem] bg-card border flex flex-col justify-between gap-3 overflow-hidden transition-all hover:bg-canvas-elevated h-full min-h-[150px] ${paid ? 'border-emerald-500/30 bg-emerald-500/5' : isCC ? 'border-amber-500/30' : 'border-card-border'}`}>
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs transition-all shrink-0 ${paid ? 'bg-emerald-500/20 text-emerald-500' : isCC ? 'bg-amber-500/20 text-amber-500' : 'bg-canvas-subtle border border-card-border text-text-main'}`}>
                                                    {paid ? <CheckCircle2 size={14} /> : format(dueDt, 'dd')}
                                                </div>
                                                {isCC && (
                                                    <span className="text-[7px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded">CC</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {paid ? (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleUnmarkPaid(payment); }}
                                                        className="w-6 h-6 rounded-full flex items-center justify-center text-amber-500/50 hover:text-amber-500 hover:bg-amber-500/10 transition-all"
                                                        title="Undo payment"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setShowMarkPaidModal(payment); }}
                                                        className="w-6 h-6 rounded-full flex items-center justify-center text-emerald-500/50 hover:text-emerald-500 hover:bg-emerald-500/10 transition-all"
                                                        title="Mark as paid"
                                                    >
                                                        <Check size={12} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); if (confirm('Delete this signal instance?')) deleteBill(payment.billId); }}
                                                    className="w-6 h-6 rounded-full flex items-center justify-center text-text-muted/20 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mt-1">
                                            <h3 className="text-xs font-black uppercase tracking-tight text-text-main mb-0.5 line-clamp-1 leading-tight">{payment.name}</h3>
                                            <div className="flex items-center gap-1.5 mb-2">
                                                <span className={`text-[7px] font-black uppercase tracking-widest ${paid ? 'text-emerald-500' : 'text-text-muted'}`}>
                                                    {paid
                                                        ? (isCC ? 'CC CYCLE SETTLED' : 'PAID THIS MONTH')
                                                        : (isCC ? `CYCLE: ${payment.cycle} • DUE: ${format(dueDt, 'do MMM')}` : `DUE: ${format(dueDt, 'do MMM')}`)}
                                                </span>
                                            </div>

                                            {paid && linkedTx && (
                                                <div className="flex items-center gap-1 mb-2 p-1.5 bg-emerald-500/10 rounded-lg">
                                                    <Link2 size={10} className="text-emerald-500" />
                                                    <span className="text-[8px] font-bold text-emerald-600 truncate">{format(parseISO(linkedTx.date), 'dd MMM')}</span>
                                                </div>
                                            )}

                                            <div className="pt-2 border-t border-card-border">
                                                <div className="text-base font-black tabular-nums tracking-tighter leading-none">{formatCurrency(payment.amount)}</div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-6 md:p-8 rounded-[2.2rem] md:rounded-[3rem] bg-card border border-card-border shadow-3xl">
                        {/* Month Header */}
                        <div className="flex items-center justify-between mb-12">
                            <button
                                onClick={() => setSelectedMonth(prev => subMonths(prev, 1))}
                                className="w-14 h-14 rounded-full bg-canvas-subtle border border-card-border flex items-center justify-center hover:bg-canvas-elevated transition-all text-text-muted"
                            >
                                <ChevronLeft size={24} />
                            </button>
                            <div className="text-center">
                                <h3 className="text-2xl font-black uppercase tracking-tighter text-text-main tabular-nums">{format(selectedMonth, 'MMMM yyyy')}</h3>
                                {!isSameMonth(selectedMonth, today) && (
                                    <button
                                        onClick={() => setSelectedMonth(new Date())}
                                        className="text-[10px] text-primary font-black uppercase tracking-[0.3em] mt-3 hover:opacity-100 opacity-60 transition-opacity"
                                    >
                                        SYNC TO NOW
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => setSelectedMonth(prev => addMonths(prev, 1))}
                                className="w-14 h-14 rounded-full bg-canvas-subtle border border-card-border flex items-center justify-center hover:bg-canvas-elevated transition-all text-text-muted"
                            >
                                <ChevronRight size={24} />
                            </button>
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-3 mb-8">
                            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
                                <div key={d} className="text-center text-[10px] font-black text-text-muted opacity-30 tracking-widest pb-4">{d}</div>
                            ))}

                            {Array.from({ length: startOfMonth(selectedMonth).getDay() }).map((_, i) => (
                                <div key={`empty-${i}`} className="aspect-square" />
                            ))}

                            {calendarDays.map(day => {
                                const dayNum = day.getDate();
                                const dayBills = bills.filter(b => parseInt(b.dueDay) === dayNum);
                                const hasBill = dayBills.length > 0;
                                const isToday = isSameDay(day, today);
                                const isPast = day < today && !isToday;
                                const allPaid = hasBill && dayBills.every(b => b.status === 'paid');

                                return (
                                    <div
                                        key={day.toISOString()}
                                        className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center transition-all group/day
                                            ${isToday ? 'bg-primary border-primary shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)] z-10' : 'bg-canvas-subtle border border-card-border hover:bg-canvas-elevated'}
                                            ${hasBill && !allPaid && !isToday ? 'border-rose-500/40 bg-rose-500/[0.05]' : ''}
                                            ${hasBill && allPaid && !isToday ? 'border-green-500/40 opacity-40' : ''}
                                        `}
                                    >
                                        <span className={`text-base font-black tabular-nums ${isToday ? 'text-black' : isPast ? 'text-text-muted/20' : 'text-text-main/60'}`}>
                                            {dayNum}
                                        </span>
                                        {hasBill && (
                                            <div className={`absolute bottom-3 w-1.5 h-1.5 rounded-full ${isToday ? 'bg-black' : allPaid ? 'bg-green-500' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)] animate-pulse'}`} />
                                        )}
                                        {hasBill && (
                                            <div className="absolute inset-0 opacity-0 group-hover/day:opacity-100 transition-opacity bg-card/95 dark:bg-black/95 z-20 rounded-2xl p-3 flex flex-col justify-center text-center pointer-events-none border border-primary/20 shadow-xl">
                                                <p className="text-[8px] font-black uppercase text-primary mb-1">NODE DETECTED</p>
                                                <p className="text-[10px] font-black text-text-main uppercase truncate">{dayBills[0].name}</p>
                                                <p className="text-[12px] font-black text-text-main mt-1">{formatCurrency(dayBills[0].amount)}</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </motion.main>

            {/* Modal Overlay */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[10001] flex items-end md:items-center justify-center p-0 md:p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowModal(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            className="relative bg-card border border-card-border p-8 md:p-16 rounded-t-[3rem] md:rounded-[4rem] w-full max-w-2xl shadow-3xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-12">
                                <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-text-main uppercase">Initialize Signal</h2>
                                <button onClick={() => setShowModal(false)} className="w-12 h-12 rounded-full bg-canvas-subtle border border-card-border flex items-center justify-center hover:bg-canvas-elevated transition-all">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-8">
                                {/* Bill Type Toggle */}
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted ml-4 block">Bill Type</label>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, billType: 'recurring' })}
                                            className={`flex-1 h-14 rounded-2xl font-black text-sm uppercase tracking-wider transition-all border ${form.billType === 'recurring'
                                                ? 'bg-primary text-black border-primary'
                                                : 'bg-canvas-subtle border-card-border text-text-muted hover:border-primary/30'
                                                }`}
                                        >
                                            📅 Recurring
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, billType: 'credit_card' })}
                                            className={`flex-1 h-14 rounded-2xl font-black text-sm uppercase tracking-wider transition-all border ${form.billType === 'credit_card'
                                                ? 'bg-amber-500 text-black border-amber-500'
                                                : 'bg-canvas-subtle border-card-border text-text-muted hover:border-amber-500/30'
                                                }`}
                                        >
                                            💳 Credit Card
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted ml-4 block">Bill Name</label>
                                    <input
                                        type="text"
                                        placeholder={form.billType === 'credit_card' ? "e.g. HDFC Credit Card" : "e.g. NETFLIX PREMIUM"}
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        className="w-full h-16 bg-canvas-subtle border border-card-border px-6 rounded-2xl outline-none focus:border-primary transition-all font-black text-lg text-text-main uppercase"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted ml-4 block">Amount</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={form.amount}
                                            onChange={e => setForm({ ...form, amount: e.target.value })}
                                            className="w-full h-16 bg-canvas-subtle border border-card-border px-6 rounded-2xl outline-none focus:border-primary transition-all font-black text-xl tabular-nums text-text-main"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted ml-4 block">Due Day</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="31"
                                            value={form.dueDay}
                                            onChange={e => setForm({ ...form, dueDay: e.target.value })}
                                            className="w-full h-16 bg-canvas-subtle border border-card-border px-6 rounded-2xl outline-none focus:border-primary transition-all font-black text-xl tabular-nums text-text-main"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Billing Day - Only for Credit Card */}
                                {form.billType === 'credit_card' && (
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted ml-4 block">Billing Day (Statement Date)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="31"
                                            value={form.billingDay}
                                            onChange={e => setForm({ ...form, billingDay: e.target.value })}
                                            className="w-full h-16 bg-canvas-subtle border border-card-border px-6 rounded-2xl outline-none focus:border-amber-500 transition-all font-black text-xl tabular-nums text-text-main"
                                            required
                                        />
                                        <p className="text-[9px] text-text-muted ml-4">The day your credit card statement is generated. Bill will appear after this date.</p>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className={`h-16 w-full rounded-2xl font-black text-lg uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${form.billType === 'credit_card'
                                        ? 'bg-amber-500 text-black shadow-[0_0_50px_rgba(245,158,11,0.3)] hover:shadow-[0_0_60px_rgba(245,158,11,0.5)]'
                                        : 'bg-primary text-black shadow-[0_0_50px_rgba(16,185,129,0.3)] hover:shadow-[0_0_60px_rgba(16,185,129,0.5)]'
                                        }`}
                                >
                                    {form.billType === 'credit_card' ? '💳 Add Credit Card Bill' : '📅 Add Recurring Bill'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Mark as Paid Modal */}
            <AnimatePresence>
                {showMarkPaidModal && (
                    <div className="fixed inset-0 z-[10001] flex items-end md:items-center justify-center p-0 md:p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => { setShowMarkPaidModal(null); setSelectedTransactionId(null); }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            className="relative bg-card border border-card-border p-6 md:p-10 rounded-t-[3rem] md:rounded-[3rem] w-full max-w-md shadow-3xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h2 className="text-xl font-black tracking-tighter text-text-main uppercase">Mark as Paid</h2>
                                    <p className="text-xs text-text-muted mt-1">{showMarkPaidModal.name} • {formatCurrency(showMarkPaidModal.amount)}</p>
                                </div>
                                <button onClick={() => { setShowMarkPaidModal(null); setSelectedTransactionId(null); }} className="w-10 h-10 rounded-full bg-canvas-subtle border border-card-border flex items-center justify-center hover:bg-canvas-elevated transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-text-muted">Link to Transaction</h3>
                                    <p className="text-[10px] text-primary font-bold">Select one to attach ID</p>
                                </div>

                                {getMatchingTransactions(showMarkPaidModal).length > 0 ? (
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                        {getMatchingTransactions(showMarkPaidModal).map(tx => (
                                            <button
                                                key={tx.id}
                                                onClick={() => setSelectedTransactionId(selectedTransactionId === tx.id ? null : tx.id)}
                                                className={`w-full p-4 rounded-2xl border text-left transition-all ${selectedTransactionId === tx.id
                                                    ? 'border-primary bg-primary/10'
                                                    : 'border-card-border bg-canvas-subtle hover:border-primary/30'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-black text-text-main line-clamp-1">{tx.description}</p>
                                                        <p className="text-[10px] text-text-muted uppercase">{format(new Date(tx.date), 'dd MMM yyyy')}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-black text-rose-500">{formatCurrency(Math.abs(tx.amount))}</p>
                                                        {selectedTransactionId === tx.id && (
                                                            <CheckCircle2 size={14} className="text-primary ml-auto mt-1" />
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-text-muted text-center py-4 bg-canvas-subtle rounded-2xl">No matching transactions found for this month</p>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setShowMarkPaidModal(null); setSelectedTransactionId(null); }}
                                    className="flex-1 h-14 border border-card-border rounded-2xl font-black uppercase text-xs tracking-widest text-text-muted hover:bg-canvas-subtle transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleMarkPaid(showMarkPaidModal, selectedTransactionId)}
                                    className="flex-1 h-14 bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                                >
                                    <Check size={16} />
                                    Mark Paid
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Bills;
