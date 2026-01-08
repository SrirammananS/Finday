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

    if (isLoading) return <div className="p-10 text-center uppercase tracking-[0.3em] opacity-20 text-[9px]">Analyzing...</div>;

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
                <h2 className="text-[9px] font-black uppercase tracking-[0.5em] text-white/50 mb-1">Analysis_Matrix</h2>
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none text-white">Insights<span className="text-toxic-lime">.</span></h1>
            </header>

            {/* Compact Time Filters */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar">
                {TIME_FILTERS.map(f => (
                    <button
                        key={f.value}
                        onClick={() => { setTimeFilter(f.value); setCategoryFilter(null); }}
                        className={`px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-[0.1em] transition-all border shrink-0
                        ${timeFilter === f.value
                                ? 'bg-toxic-lime text-black border-toxic-lime'
                                : 'bg-soft-zinc text-white/60 border-white/10 hover:border-white/20'}`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Inflow vs Outflow Bento */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 mb-10">
                <div className="genz-card p-5 md:p-7 flex flex-col justify-between group">
                    <p className="text-[8px] font-black uppercase tracking-widest text-white/40">Flux.IN</p>
                    <div className="mt-4">
                        <h3 className="text-xl md:text-3xl font-black text-toxic-lime group-hover:scale-105 transition-transform origin-left">{formatCurrency(totalIncome)}</h3>
                        <p className="text-[8px] font-black uppercase tracking-widest text-white/20 mt-1">{income.length} Signals</p>
                    </div>
                </div>
                <div className="genz-card p-5 md:p-7 flex flex-col justify-between group">
                    <p className="text-[8px] font-black uppercase tracking-widest text-white/40">Flux.OUT</p>
                    <div className="mt-4">
                        <h3 className="text-xl md:text-3xl font-black text-white group-hover:scale-105 transition-transform origin-left">{formatCurrency(totalExpenses)}</h3>
                        <p className="text-[8px] font-black uppercase tracking-widest text-white/20 mt-1">{expenses.length} Signals</p>
                    </div>
                </div>
            </div>

            {/* Allocation Matrix */}
            <div className="mb-10">
                <div className="flex justify-between items-end mb-4 ml-1">
                    <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-white/40">Topology_Map</h3>
                    {categoryFilter && (
                        <button onClick={() => setCategoryFilter(null)} className="text-[9px] font-black text-toxic-lime uppercase tracking-widest">[RESET]</button>
                    )}
                </div>

                <div className="genz-card overflow-hidden">
                    {sortedCategories.length > 0 ? (
                        <div className="divide-y divide-white/5">
                            {sortedCategories.map((cat, idx) => (
                                <motion.div
                                    key={cat.name}
                                    initial={{ x: -10, opacity: 0 }}
                                    whileInView={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.03 * idx }}
                                    viewport={{ once: true }}
                                    className={`flex items-center gap-4 p-5 md:p-6 transition-all cursor-pointer group hover:bg-white/5 
                                    ${categoryFilter === cat.name ? 'bg-white/5' : ''}`}
                                    onClick={() => setCategoryFilter(cat.name === categoryFilter ? null : cat.name)}
                                >
                                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center text-xl md:text-2xl group-hover:bg-toxic-lime group-hover:text-black transition-all">
                                        {cat.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between mb-2">
                                            <p className="text-sm md:text-lg font-black text-white truncate mr-2">{cat.name}</p>
                                            <p className="text-sm md:text-lg font-black tabular-nums">{formatCurrency(cat.amount)}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    whileInView={{ width: `${cat.percent}%` }}
                                                    viewport={{ once: true }}
                                                    transition={{ duration: 1, ease: 'circOut' }}
                                                    className="h-full bg-toxic-lime shadow-toxic"
                                                />
                                            </div>
                                            <span className="text-[8px] font-black text-white/40 w-7 text-right">{cat.percent}%</span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 text-center opacity-10">
                            <span className="text-4xl block mb-4">🕸️</span>
                            <p className="text-[9px] font-black uppercase tracking-[0.4em]">Null_Void</p>
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
                        <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-white/40 mb-4 ml-1">Segment_Trace_{categoryFilter}</h3>
                        <div className="space-y-2">
                            {expenses.filter(e => e.category === categoryFilter).map((t, idx) => (
                                <motion.div
                                    key={String(t.id)}
                                    initial={{ x: -10, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.02 * idx }}
                                    className="genz-card p-4 flex justify-between items-center"
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-black text-white truncate">{t.description}</p>
                                        <p className="text-[8px] font-black text-white/30 uppercase mt-0.5">TR_ID: {String(t.id).slice(0, 6)}</p>
                                    </div>
                                    <p className="text-sm font-black text-rose-400">{formatCurrency(t.amount)}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Smart Status */}
            <div className="genz-card p-7 md:p-8 bg-toxic-lime/5 border-toxic-lime/20 flex items-center justify-between group">
                <div className="flex items-center gap-5">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-toxic-lime flex items-center justify-center text-xl md:text-2xl text-black animate-pulse shadow-toxic">🎯</div>
                    <div>
                        <h4 className="text-[8px] font-black uppercase tracking-[0.2em] text-white/50 mb-0.5">Stability_Index</h4>
                        <p className={`text-xl md:text-2xl font-black ${totalIncome >= totalExpenses ? 'text-toxic-lime' : 'text-rose-500'}`}>
                            {totalIncome >= totalExpenses ? 'OPTIMAL' : 'DEFICIT'}
                        </p>
                    </div>
                </div>
            </div>

            <p className="text-[8px] font-black uppercase tracking-[0.5em] text-white/5 text-center mt-16">Antigravity.Analysis.Core.v2.5</p>
        </motion.div>
    );
};

export default Insights;
