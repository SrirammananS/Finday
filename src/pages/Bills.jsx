import React, { useState, useEffect, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Plus, Bell, Trash2, CheckCircle2, X, ChevronLeft, ChevronRight, Zap, Brain, TrendingUp, Calendar, List, Layers, Activity } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth } from 'date-fns';
import { billManager } from '../services/billManager';
import { smartAI } from '../services/smartAI';

const Bills = () => {
    const { bills = [], addBill, deleteBill, isLoading, transactions = [] } = useFinance();
    const [showModal, setShowModal] = useState(false);
    const [viewMode, setViewMode] = useState('list');
    const [form, setForm] = useState({ name: '', amount: '', dueDay: '1', category: 'Utilities/Bills', cycle: 'monthly' });
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [detectedBills, setDetectedBills] = useState([]);
    const [showDetected, setShowDetected] = useState(false);

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

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
        </div>
    );

    const totalMonthly = bills.reduce((acc, bill) => acc + (parseFloat(bill.amount) || 0), 0);
    const today = new Date();
    const calendarDays = eachDayOfInterval({ start: startOfMonth(selectedMonth), end: endOfMonth(selectedMonth) });

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(Math.abs(amount) || 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.amount) return;
        await addBill(form);
        setForm({ name: '', amount: '', dueDay: '1', category: 'Utilities/Bills', cycle: 'monthly' });
        setShowModal(false);
    };

    return (
        <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-black">
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

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
                        <h1 className="text-xl font-black tracking-[-0.04em] leading-none mb-1 transition-all text-white uppercase">
                            Bills
                        </h1>
                        <p className="text-[8px] font-semibold text-text-muted uppercase tracking-[0.4em] opacity-60">Recurring Commitments</p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-text-muted opacity-40">Monthly Total</span>
                        <h3 className="text-3xl font-black text-white tabular-nums tracking-tighter leading-none">{formatCurrency(totalMonthly)}</h3>
                        <p className="text-[9px] font-black uppercase tracking-widest text-primary/40">Total Bills</p>
                    </div>
                </header>

                {/* Controls and AI Hub */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
                    <div className="flex items-center gap-2 p-1.5 bg-white/5 border border-white/10 rounded-2xl">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`h-11 px-8 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-primary text-black shadow-lg' : 'text-text-muted hover:text-white'}`}
                        >
                            <List size={14} strokeWidth={3} /> LIST VIEW
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`h-11 px-8 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'calendar' ? 'bg-primary text-black shadow-lg' : 'text-text-muted hover:text-white'}`}
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
                                                    <p className="text-lg font-black uppercase tracking-tighter text-white">{detected.name}</p>
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
                    <div className="grid grid-cols-1 gap-4">
                        <button
                            onClick={() => setShowModal(true)}
                            className="group h-32 rounded-[2.5rem] border-2 border-dashed border-white/10 hover:border-primary/50 hover:bg-primary/[0.02] transition-all flex items-center justify-center gap-4 mb-2"
                        >
                            <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-muted group-hover:bg-primary group-hover:text-black transition-all">
                                <Plus size={28} strokeWidth={3} />
                            </div>
                            <span className="text-lg font-black uppercase tracking-tighter text-text-muted group-hover:text-white">Add New Bill</span>
                        </button>

                        {bills.map((bill, idx) => {
                            const isPaid = bill.status === 'paid';
                            return (
                                <motion.div
                                    key={bill.id}
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.05 * idx }}
                                    className="group relative"
                                >
                                    <div className="absolute -inset-[1px] bg-gradient-to-br from-white/10 to-transparent rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-all duration-500" />
                                    <div className={`relative p-6 md:p-8 rounded-[1.8rem] md:rounded-[2.5rem] bg-[#050505] border border-white/5 flex flex-col md:flex-row justify-between md:items-center gap-6 overflow-hidden transition-all hover:bg-[#080808] ${isPaid ? 'opacity-40 grayscale-[0.5]' : ''}`}>
                                        <div className="flex items-center gap-6">
                                            <div className={`w-20 h-20 rounded-[1.8rem] flex items-center justify-center font-black text-2xl transition-all ${isPaid ? 'bg-green-500/20 text-green-500' : 'bg-white/5 border border-white/10 text-white'}`}>
                                                {isPaid ? <CheckCircle2 size={32} /> : bill.dueDay}
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-1">{bill.name}</h3>
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isPaid ? 'text-green-500' : 'text-text-muted'}`}>
                                                        {isPaid ? 'SIGNAL RESOLVED ✓' : `CYCLE DUE: ${bill.dueDay}TH`}
                                                    </span>
                                                    {!isPaid && (
                                                        <div className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[8px] font-black uppercase tracking-widest text-text-muted/40">
                                                            {bill.category}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between md:justify-end gap-10 pl-26 md:pl-0">
                                            <div className="text-right">
                                                <div className="text-2xl font-black tabular-nums tracking-tighter">{formatCurrency(bill.amount)}</div>
                                                <div className="text-[9px] font-black uppercase tracking-widest text-text-muted/40 mt-1">MONTHLY BURNOUT</div>
                                            </div>
                                            <button
                                                onClick={() => { if (confirm('Purge vector?')) deleteBill(bill.id); }}
                                                className="w-12 h-12 rounded-full flex items-center justify-center text-text-muted/20 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-6 md:p-8 rounded-[2.2rem] md:rounded-[3rem] bg-[#050505] border border-white/10 shadow-3xl">
                        {/* Month Header */}
                        <div className="flex items-center justify-between mb-12">
                            <button
                                onClick={() => setSelectedMonth(prev => subMonths(prev, 1))}
                                className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-text-muted"
                            >
                                <ChevronLeft size={24} />
                            </button>
                            <div className="text-center">
                                <h3 className="text-2xl font-black uppercase tracking-tighter text-white tabular-nums">{format(selectedMonth, 'MMMM yyyy')}</h3>
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
                                className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-text-muted"
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
                                            ${isToday ? 'bg-primary border-primary shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)] z-10' : 'bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05]'}
                                            ${hasBill && !allPaid && !isToday ? 'border-rose-500/40 bg-rose-500/[0.05]' : ''}
                                            ${hasBill && allPaid && !isToday ? 'border-green-500/40 opacity-40' : ''}
                                        `}
                                    >
                                        <span className={`text-base font-black tabular-nums ${isToday ? 'text-black' : isPast ? 'text-text-muted/20' : 'text-white/60'}`}>
                                            {dayNum}
                                        </span>
                                        {hasBill && (
                                            <div className={`absolute bottom-3 w-1.5 h-1.5 rounded-full ${isToday ? 'bg-black' : allPaid ? 'bg-green-500' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)] animate-pulse'}`} />
                                        )}
                                        {hasBill && (
                                            <div className="absolute inset-0 opacity-0 group-hover/day:opacity-100 transition-opacity bg-black/95 z-20 rounded-2xl p-3 flex flex-col justify-center text-center pointer-events-none">
                                                <p className="text-[8px] font-black uppercase text-primary mb-1">NODE DETECTED</p>
                                                <p className="text-[10px] font-black text-white uppercase truncate">{dayBills[0].name}</p>
                                                <p className="text-[12px] font-black text-white mt-1">{formatCurrency(dayBills[0].amount)}</p>
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
                            className="relative bg-[#050505] border border-white/10 p-8 md:p-16 rounded-t-[3rem] md:rounded-[4rem] w-full max-w-2xl shadow-3xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-12">
                                <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white uppercase">Initialize Signal</h2>
                                <button onClick={() => setShowModal(false)} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-10">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted ml-4 block">Signal Identity</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. NETFLIX PREMIUM"
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        className="w-full h-20 bg-white/5 border border-white/10 px-8 rounded-3xl outline-none focus:border-primary transition-all font-black text-xl text-white uppercase"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted ml-4 block">Burn Rate</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={form.amount}
                                            onChange={e => setForm({ ...form, amount: e.target.value })}
                                            className="w-full h-20 bg-white/5 border border-white/10 px-8 rounded-3xl outline-none focus:border-primary transition-all font-black text-2xl tabular-nums text-white"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted ml-4 block">Node Day</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="31"
                                            value={form.dueDay}
                                            onChange={e => setForm({ ...form, dueDay: e.target.value })}
                                            className="w-full h-20 bg-white/5 border border-white/10 px-8 rounded-3xl outline-none focus:border-primary transition-all font-black text-2xl tabular-nums text-white"
                                            required
                                        />
                                    </div>
                                </div>

                                <button type="submit" className="h-20 bg-primary text-black w-full rounded-3xl font-black text-lg uppercase tracking-widest shadow-[0_0_50px_rgba(16,185,129,0.3)] hover:shadow-[0_0_60px_rgba(16,185,129,0.5)] transition-all">
                                    MAP RECURRENCE
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Bills;
