import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { motion, AnimatePresence } from 'framer-motion';
import TransactionForm from '../components/TransactionForm';

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Math.abs(amount) || 0);
};

const Transactions = () => {
    const { transactions = [], categories = [], deleteTransaction, isLoading } = useFinance();
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState('');

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
            <div className="w-8 h-8 border-3 border-toxic-lime border-t-transparent rounded-full animate-spin" />
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/40">Syncing</p>
        </div>
    );

    const filtered = transactions.filter(t =>
        t.description?.toLowerCase().includes(search.toLowerCase()) ||
        t.category?.toLowerCase().includes(search.toLowerCase())
    );

    const grouped = filtered.reduce((acc, t) => {
        if (!t.date) return acc;
        const date = new Date(t.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
        if (!acc[date]) acc[date] = [];
        acc[date].push(t);
        return acc;
    }, {});

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 py-8 md:px-6 md:py-16 max-w-4xl mx-auto min-h-screen pb-40"
        >
            <header className="mb-8 md:mb-12">
                <motion.h2
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="text-[9px] font-black uppercase tracking-[0.4em] text-white/50 mb-1"
                >
                    Ledger_Entries
                </motion.h2>
                <motion.h1
                    initial={{ y: 15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-4xl md:text-6xl font-black tracking-tighter leading-none"
                >
                    Terminal<span className="text-toxic-lime">.</span>
                </motion.h1>
            </header>

            {/* Search Hub */}
            <div className="mb-8 relative">
                <input
                    type="text"
                    placeholder="SEARCH_STREAM..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-soft-zinc border border-white/5 py-5 md:py-6 px-7 md:px-8 rounded-2xl md:rounded-3xl font-bold text-base md:text-lg outline-none focus:border-toxic-lime transition-all placeholder:text-white/10"
                />
                <div className="absolute right-7 md:right-8 top-1/2 -translate-y-1/2 text-toxic-lime text-xs md:text-sm font-black opacity-60">{filtered.length}</div>
            </div>

            {/* Timelined Logs */}
            <div className="space-y-12">
                {Object.entries(grouped).map(([date, items], gIdx) => (
                    <div key={date}>
                        <div className="flex items-center gap-3 mb-5 overflow-hidden">
                            <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-white/60 whitespace-nowrap">{date}</h3>
                            <div className="h-px bg-white/10 w-full" />
                        </div>

                        <div className="space-y-3">
                            {items.map((t, iIdx) => {
                                const cat = categories.find(c => c.name === t.category);
                                return (
                                    <motion.div
                                        key={String(t.id)}
                                        initial={{ x: -15, opacity: 0 }}
                                        whileInView={{ x: 0, opacity: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: 0.03 * iIdx }}
                                        onClick={() => { setEditing(t); setShowForm(true); }}
                                        className="genz-card p-4 md:p-5 flex items-center justify-between group cursor-pointer"
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white text-black flex-shrink-0 flex items-center justify-center text-xl md:text-2xl group-hover:bg-toxic-lime transition-all">
                                                {cat?.icon || '📦'}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm md:text-base font-black text-white group-hover:text-toxic-lime transition-colors truncate">{t.description}</p>
                                                <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-white/40 mt-0.5 truncate">{t.category}</p>
                                            </div>
                                        </div>
                                        <div className="text-right ml-4">
                                            <p className={`text-base md:text-xl font-black ${t.amount > 0 ? 'text-toxic-lime' : 'text-white'}`}>
                                                {t.amount > 0 ? '+' : ''}{formatCurrency(t.amount)}
                                            </p>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); if (confirm('Purge?')) deleteTransaction(t); }}
                                                className="mt-1 text-[8px] font-black text-rose-500/40 hover:text-rose-500 uppercase tracking-widest"
                                            >
                                                [PURGE]
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                ))}

                {filtered.length === 0 && (
                    <div className="py-24 text-center">
                        <p className="text-3xl mb-4 grayscale opacity-10">🌫️</p>
                        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/10">Null_Result</p>
                    </div>
                )}
            </div>

            {showForm && <TransactionForm onClose={() => { setShowForm(false); setEditing(null); }} editTransaction={editing} />}
        </motion.div>
    );
};

export default Transactions;
