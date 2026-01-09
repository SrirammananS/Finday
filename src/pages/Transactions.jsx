import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { motion, AnimatePresence } from 'framer-motion';
import TransactionForm from '../components/TransactionForm';
import { Search, Trash2, Filter } from 'lucide-react';

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
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Loading...</p>
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
                    className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1"
                >
                    History
                </motion.h2>
                <motion.h1
                    initial={{ y: 15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-4xl md:text-6xl font-black tracking-tighter leading-none text-text-main"
                >
                    Transactions<span className="text-primary">.</span>
                </motion.h1>
            </header>

            {/* Search Hub */}
            <div className="mb-8 relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
                <input
                    type="text"
                    placeholder="Search transactions..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-canvas-subtle border border-card-border py-4 pl-14 pr-6 rounded-2xl md:rounded-3xl font-bold text-base md:text-lg outline-none focus:border-primary transition-all text-text-main placeholder:text-text-muted/40"
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-primary text-xs font-bold opacity-80">{filtered.length} entries</div>
            </div>

            {/* Timelined Logs */}
            <div className="space-y-10">
                {Object.entries(grouped).map(([date, items], gIdx) => (
                    <div key={date}>
                        <div className="flex items-center gap-4 mb-4">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-muted whitespace-nowrap">{date}</h3>
                            <div className="h-px bg-card-border w-full" />
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
                                        className="modern-card p-4 md:p-5 flex items-center justify-between group cursor-pointer"
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-canvas text-text-main flex-shrink-0 flex items-center justify-center text-xl md:text-2xl border border-card-border">
                                                {cat?.icon || '📦'}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm md:text-base font-bold text-text-main group-hover:text-primary transition-colors truncate">{t.description}</p>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mt-1 truncate">{t.category}</p>
                                            </div>
                                        </div>
                                        <div className="text-right ml-4">
                                            <p className={`text-base md:text-lg font-black ${t.amount > 0 ? 'text-emerald-500' : 'text-text-main'}`}>
                                                {t.amount > 0 ? '+' : ''}{formatCurrency(t.amount)}
                                            </p>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); if (confirm('Delete transaction?')) deleteTransaction(t); }}
                                                className="mt-1 text-text-muted hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={14} />
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
                        <Filter className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-20" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">No transactions found</p>
                    </div>
                )}
            </div>

            {showForm && <TransactionForm onClose={() => { setShowForm(false); setEditing(null); }} editTransaction={editing} />}
        </motion.div>
    );
};

export default Transactions;
