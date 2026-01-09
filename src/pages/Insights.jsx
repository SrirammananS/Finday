import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Math.abs(amount));
};

const TIME_FILTERS = [
    { label: '30D', value: 'month' },
    { label: 'PREV', value: 'last-month' },
    { label: 'YEAR', value: 'year' },
    { label: 'ALL', value: 'all' },
];

const Insights = () => {
    const { transactions = [], categories = [], isLoading } = useFinance();
    const [categoryFilter, setCategoryFilter] = useState(null);
    const [timeFilter, setTimeFilter] = useState('month');

    if (isLoading) return <div className="p-10 text-center uppercase tracking-[0.3em] opacity-50 text-[10px] text-text-muted">Analyzing...</div>;

    const now = new Date();
    let filtered = transactions.filter(t => {
        if (!t.date) return false;
        const d = new Date(t.date);
        if (timeFilter === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        if (timeFilter === 'last-month') {
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
        }
        if (timeFilter === 'year') return d.getFullYear() === now.getFullYear();
        return true;
    });

    if (categoryFilter) filtered = filtered.filter(t => t.category === categoryFilter);

    const expenses = filtered.filter(t => t.amount < 0 && !t.description?.toLowerCase().includes('cc bill'));
    const income = filtered.filter(t => t.amount > 0);
    const totalExpenses = expenses.reduce((s, t) => s + Math.abs(parseFloat(t.amount) || 0), 0);
    const totalIncome = income.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

    const categoryBreakdown = expenses.reduce((acc, t) => {
        const catName = t.category || 'Other';
        acc[catName] = (acc[catName] || 0) + Math.abs(parseFloat(t.amount) || 0);
        return acc;
    }, {});

    const sortedCategories = Object.entries(categoryBreakdown)
        .sort((a, b) => b[1] - a[1])
        .map(([name, amount]) => ({
            name,
            amount,
            percent: totalExpenses > 0 ? (amount / totalExpenses * 100).toFixed(0) : 0,
            icon: categories.find(c => c.name === name)?.icon || '📦',
            color: categories.find(c => c.name === name)?.color || '#3b82f6'
        }));

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 py-8 md:px-6 md:py-16 max-w-4xl mx-auto min-h-screen pb-40"
        >
            <header className="mb-8 md:mb-12">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.5em] text-text-muted mb-1">Analytics</h2>
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none text-text-main">Insights<span className="text-primary">.</span></h1>
            </header>

            {/* Compact Time Filters */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar">
                {TIME_FILTERS.map(f => (
                    <button
                        key={f.value}
                        onClick={() => { setTimeFilter(f.value); setCategoryFilter(null); }}
                        className={`px-5 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-[0.1em] transition-all border shrink-0
                        ${timeFilter === f.value
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-canvas-subtle text-text-muted border-card-border hover:border-text-muted/30'}`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Inflow vs Outflow Bento */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 mb-10">
                <div className="modern-card p-5 md:p-7 flex flex-col justify-between group">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-text-muted">Flux.IN</p>
                    <div className="mt-4">
                        <h3 className="text-xl md:text-3xl font-black text-emerald-500 group-hover:scale-105 transition-transform origin-left">{formatCurrency(totalIncome)}</h3>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-text-muted/50 mt-1">{income.length} Signals</p>
                    </div>
                </div>
                <div className="modern-card p-5 md:p-7 flex flex-col justify-between group">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-text-muted">Flux.OUT</p>
                    <div className="mt-4">
                        <h3 className="text-xl md:text-3xl font-black text-rose-500 group-hover:scale-105 transition-transform origin-left">{formatCurrency(totalExpenses)}</h3>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-text-muted/50 mt-1">{expenses.length} Signals</p>
                    </div>
                </div>
            </div>

            {/* Allocation Matrix */}
            <div className="mb-10">
                <div className="flex justify-between items-end mb-4 ml-1">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-muted">By Category</h3>
                    {categoryFilter && (
                        <button onClick={() => setCategoryFilter(null)} className="text-[9px] font-bold text-primary uppercase tracking-widest">[RESET]</button>
                    )}
                </div>

                <div className="modern-card overflow-hidden">
                    {sortedCategories.length > 0 ? (
                        <div className="divide-y divide-card-border">
                            {sortedCategories.map((cat, idx) => (
                                <motion.div
                                    key={cat.name}
                                    initial={{ x: -10, opacity: 0 }}
                                    whileInView={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.03 * idx }}
                                    viewport={{ once: true }}
                                    className={`flex items-center gap-4 p-5 md:p-6 transition-all cursor-pointer group hover:bg-canvas-subtle 
                                    ${categoryFilter === cat.name ? 'bg-primary/5' : ''}`}
                                    onClick={() => setCategoryFilter(cat.name === categoryFilter ? null : cat.name)}
                                >
                                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-canvas border border-card-border flex items-center justify-center text-xl md:text-2xl group-hover:border-primary transition-all">
                                        {cat.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between mb-2">
                                            <p className="text-sm md:text-lg font-bold text-text-main truncate mr-2">{cat.name}</p>
                                            <p className="text-sm md:text-lg font-bold tabular-nums text-text-main">{formatCurrency(cat.amount)}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 h-1.5 bg-canvas-subtle rounded-full overflow-hidden border border-card-border">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    whileInView={{ width: `${cat.percent}%` }}
                                                    viewport={{ once: true }}
                                                    transition={{ duration: 1, ease: 'circOut' }}
                                                    className="h-full bg-primary"
                                                />
                                            </div>
                                            <span className="text-[9px] font-bold text-text-muted w-7 text-right">{cat.percent}%</span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 text-center opacity-40">
                            <span className="text-4xl block mb-4 text-text-muted">🕸️</span>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">No data yet</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Filtered Stream */}
            <AnimatePresence>
                {categoryFilter && (
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 15 }}
                        className="mb-10"
                    >
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-4 ml-1">Transactions in {categoryFilter}</h3>
                        <div className="space-y-2">
                            {expenses.filter(e => e.category === categoryFilter).map((t, idx) => (
                                <motion.div
                                    key={String(t.id)}
                                    initial={{ x: -10, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.02 * idx }}
                                    className="modern-card p-4 flex justify-between items-center"
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-text-main truncate">{t.description}</p>
                                        <p className="text-[9px] font-bold text-text-muted uppercase mt-0.5">TR_ID: {String(t.id).slice(0, 6)}</p>
                                    </div>
                                    <p className="text-sm font-bold text-rose-500">{formatCurrency(t.amount)}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Savings Summary */}
            <div className="modern-card p-6 md:p-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                        {totalIncome >= totalExpenses ? '✨' : '⚡'}
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Net Savings</p>
                        <p className={`text-2xl font-black ${totalIncome >= totalExpenses ? 'text-primary' : 'text-rose-500'}`}>
                            {totalIncome >= totalExpenses ? '+' : '-'}₹{Math.abs(totalIncome - totalExpenses).toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>

            <p className="text-[9px] font-bold uppercase tracking-widest text-text-muted/30 text-center mt-12">Finday Analytics</p>
        </motion.div>
    );
};

export default Insights;
