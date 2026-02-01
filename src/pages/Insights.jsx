import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, X, History, TrendingUp, TrendingDown, Activity, BrainCircuit, Globe, PieChart, Info, Lock as LockIcon } from 'lucide-react';

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Math.abs(amount) || 0);
};

const TIME_FILTERS = [
    { label: '30D', value: 'month' },
    { label: 'PREV', value: 'last-month' },
    { label: 'YEAR', value: 'year' },
    { label: 'ALL', value: 'all' },
];

const Insights = () => {
    const { transactions = [], categories = [], isLoading, closePeriod, closedPeriods = [], smartQuery } = useFinance();
    const [categoryFilter, setCategoryFilter] = useState(null);
    const [timeFilter, setTimeFilter] = useState('month');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async (e) => {
        e?.preventDefault();
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        const result = await smartQuery(searchQuery);
        setSearchResults(result);
        setIsSearching(false);
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
        </div>
    );

    const now = new Date();
    let activePeriodKey = '';
    if (timeFilter === 'month') activePeriodKey = now.toISOString().substring(0, 7);
    else if (timeFilter === 'last-month') {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        activePeriodKey = lastMonth.toISOString().substring(0, 7);
    }
    const isPeriodClosed = closedPeriods.includes(activePeriodKey);

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
    const incomeList = filtered.filter(t => t.amount > 0);
    const totalExpenses = expenses.reduce((s, t) => s + Math.abs(parseFloat(t.amount) || 0), 0);
    const totalIncome = incomeList.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

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
        }));

    return (
        <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-black overflow-x-hidden">
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

            <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

            <motion.main
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative px-5 py-12 md:px-8 md:py-24 max-w-5xl mx-auto pb-40"
            >
                {/* Header Layer */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-primary">
                                <Activity size={24} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-text-muted">Analysis</span>
                        </div>
                        <h1 className="text-xl font-black tracking-[-0.04em] leading-none mb-1 transition-all text-white uppercase">
                            Insights
                        </h1>
                        <p className="text-[8px] font-semibold text-text-muted uppercase tracking-[0.4em] opacity-60">Behavioral Analytics</p>
                    </div>

                    <div className="flex flex-col items-end gap-4">
                        {activePeriodKey && (
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                disabled={isPeriodClosed}
                                onClick={() => { if (window.confirm(`Seal period ${activePeriodKey}?`)) closePeriod(activePeriodKey); }}
                                className={`h-14 px-8 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all flex items-center gap-3
                                ${isPeriodClosed ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-white/5 text-text-muted border-white/10 hover:border-primary hover:text-primary'}`}
                            >
                                {isPeriodClosed ? <Globe size={16} /> : <LockIcon size={16} />}
                                {isPeriodClosed ? 'PERIOD SEALED' : 'SEAL PERIOD'}
                            </motion.button>
                        )}
                    </div>
                </header>

                <div className="space-y-6 mb-12">
                    <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                        {TIME_FILTERS.map(f => (
                            <button
                                key={f.value}
                                onClick={() => { setTimeFilter(f.value); setCategoryFilter(null); }}
                                className={`h-12 px-8 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border shrink-0
                                ${timeFilter === f.value ? 'bg-primary border-primary text-black shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]' : 'bg-white/5 text-text-muted border-white/10 hover:bg-white/10'}`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    <div className="relative group">
                        <form onSubmit={handleSearch} className="relative group">
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-primary">
                                <BrainCircuit size={24} className="animate-pulse" />
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="ASK AI SEARCH..."
                                className="w-full h-24 bg-white/5 border border-white/10 pl-16 pr-32 rounded-[2.5rem] font-black text-xl outline-none focus:border-primary/50 focus:bg-white/[0.08] transition-all placeholder:text-white/10 text-white"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => { setSearchQuery(''); setSearchResults(null); }}
                                        className="w-10 h-10 flex items-center justify-center text-text-muted hover:text-white transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={isSearching || !searchQuery.trim()}
                                    className="h-16 px-8 rounded-[1.8rem] bg-primary text-black font-black uppercase text-xs tracking-widest hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.5)] transition-all disabled:opacity-20"
                                >
                                    {isSearching ? '...' : 'EXECUTE'}
                                </button>
                            </div>
                        </form>

                        <AnimatePresence>
                            {searchResults && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="mt-6 p-10 rounded-[3rem] border border-white/10 bg-[#0a0a0a] shadow-3xl relative overflow-hidden group/modal"
                                >
                                    <div className="absolute top-0 right-0 p-10 opacity-[0.02] -rotate-12 group-hover/modal:scale-110 transition-transform">
                                        <Sparkles size={160} className="text-primary" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-6">
                                            <Sparkles size={18} className="text-primary animate-pulse" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Analysis Successful</span>
                                        </div>
                                        <p className="text-xl font-black text-white leading-tight mb-8 uppercase tracking-tighter">
                                            {searchResults.summary}
                                        </p>

                                        {searchResults.transactions?.length > 0 && (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/5 w-fit rounded-full">
                                                    <History size={12} className="text-text-muted" />
                                                    <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Related Transactions ({searchResults.transactions.length})</span>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {searchResults.transactions.map((t, idx) => (
                                                        <div key={idx} className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 flex justify-between items-center group/item hover:bg-white/[0.06] transition-all">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-black text-white uppercase tracking-tight truncate max-w-[150px]">{t.description}</span>
                                                                <span className="text-[9px] font-black text-text-muted uppercase tracking-widest mt-1">{new Date(t.date).toLocaleDateString([], { day: '2-digit', month: 'short' })}</span>
                                                            </div>
                                                            <span className={`text-lg font-black tabular-nums ${t.amount > 0 ? 'text-emerald-500' : 'text-white alpha-80'}`}>
                                                                {formatCurrency(t.amount)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-10 items-stretch">
                    <div className="p-4 rounded-2xl bg-emerald-500/[0.03] border border-emerald-500/10 flex flex-col justify-between group transition-all hover:bg-emerald-500/[0.05]">
                        <div className="flex justify-between items-start">
                            <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-emerald-500/60">INFLOW</span>
                            <TrendingUp size={14} className="text-emerald-500 group-hover:scale-125 transition-transform" />
                        </div>
                        <div>
                            <h3 className="text-lg font-extrabold text-emerald-400 tabular-nums tracking-tight leading-none">{formatCurrency(totalIncome)}</h3>
                            <p className="text-[7px] font-bold uppercase tracking-widest text-emerald-500/30 mt-1">{incomeList.length} STREAMS</p>
                        </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-rose-500/[0.03] border border-rose-500/10 flex flex-col justify-between group transition-all hover:bg-rose-500/[0.05]">
                        <div className="flex justify-between items-start">
                            <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-rose-500/60">OUTFLOW</span>
                            <TrendingDown size={14} className="text-rose-500 group-hover:scale-125 transition-transform" />
                        </div>
                        <div>
                            <h3 className="text-lg font-extrabold text-rose-400 tabular-nums tracking-tight leading-none">{formatCurrency(totalExpenses)}</h3>
                            <p className="text-[7px] font-bold uppercase tracking-widest text-rose-500/30 mt-1">{expenses.length} STREAMS</p>
                        </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-primary/[0.03] border border-primary/10 flex flex-col justify-between group transition-all hover:bg-primary/[0.05]">
                        <div className="flex justify-between items-start">
                            <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-primary/60">NET</span>
                            <PieChart size={14} className="text-primary group-hover:scale-125 transition-transform" />
                        </div>
                        <div>
                            <h3 className={`text-lg font-extrabold tabular-nums tracking-tight leading-none ${totalIncome >= totalExpenses ? 'text-primary' : 'text-rose-400'}`}>
                                {totalIncome >= totalExpenses ? '+' : '-'}{formatCurrency(Math.abs(totalIncome - totalExpenses))}
                            </h3>
                            <p className="text-[7px] font-bold uppercase tracking-widest text-primary/30 mt-1">TOTAL</p>
                        </div>
                    </div>
                </div>

                <div className="mb-16">
                    <div className="flex justify-between items-end mb-8 px-4">
                        <div>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted mb-2">SPENDING BREAKDOWN</h3>
                            <p className="text-xs font-black uppercase text-primary tracking-widest">BY CATEGORY</p>
                        </div>
                        {categoryFilter && (
                            <button onClick={() => setCategoryFilter(null)} className="h-10 px-6 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest hover:border-primary transition-all">DE-FILTER</button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {sortedCategories.length > 0 ? (
                            sortedCategories.map((cat, idx) => (
                                <motion.div
                                    key={cat.name}
                                    initial={{ x: -20, opacity: 0 }}
                                    whileInView={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.05 * idx }}
                                    viewport={{ once: true }}
                                    onClick={() => setCategoryFilter(cat.name === categoryFilter ? null : cat.name)}
                                    className={`group relative p-6 rounded-[2.2rem] transition-all cursor-pointer border ${categoryFilter === cat.name ? 'bg-primary shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)] border-primary' : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05] hover:border-white/20'}`}
                                >
                                    <div className="flex items-center gap-6 relative z-10">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl transition-all ${categoryFilter === cat.name ? 'bg-black text-white' : 'bg-[#080808] border border-white/10 text-white'}`}>
                                            {cat.icon}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-end mb-4 pr-2">
                                                <h4 className={`text-xl font-black uppercase tracking-tighter ${categoryFilter === cat.name ? 'text-black' : 'text-white'}`}>{cat.name}</h4>
                                                <div className="flex flex-col items-end">
                                                    <span className={`text-2xl font-black tabular-nums tracking-tighter ${categoryFilter === cat.name ? 'text-black' : 'text-white'}`}>{formatCurrency(cat.amount)}</span>
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${categoryFilter === cat.name ? 'text-black/40' : 'text-text-muted'}`}>{cat.percent}% OF TOTAL</span>
                                                </div>
                                            </div>
                                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    whileInView={{ width: `${cat.percent}%` }}
                                                    viewport={{ once: true }}
                                                    transition={{ duration: 1.5, ease: 'circOut' }}
                                                    className={`h-full ${categoryFilter === cat.name ? 'bg-black' : 'bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]'}`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    {categoryFilter === cat.name && (
                                        <div className="mt-8 pt-8 border-t border-black/10 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                                            {expenses.filter(e => e.category === categoryFilter).slice(0, 5).map((t, tIdx) => (
                                                <div key={tIdx} className="flex justify-between items-center px-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black text-black uppercase tracking-tighter truncate max-w-[200px]">{t.description}</span>
                                                        <span className="text-[8px] font-black text-black/40 uppercase tracking-widest">{new Date(t.date).toLocaleDateString()}</span>
                                                    </div>
                                                    <span className="text-lg font-black text-black tabular-nums">{formatCurrency(t.amount)}</span>
                                                </div>
                                            ))}
                                            {expenses.filter(e => e.category === categoryFilter).length > 5 && (
                                                <p className="text-[9px] font-black text-black/60 uppercase tracking-widest text-center">+ {expenses.filter(e => e.category === categoryFilter).length - 5} MORE SIGNALS</p>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            ))
                        ) : (
                            <div className="py-32 rounded-[3rem] bg-white/[0.02] border border-dashed border-white/10 text-center">
                                <Info size={40} className="mx-auto text-text-muted/20 mb-4" />
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted">No behavioral data in this cycle.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-10 rounded-[3.5rem] bg-gradient-to-br from-[#0a0a0a] to-[#010101] border border-white/[0.05] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-16 opacity-[0.02] -rotate-12 group-hover:scale-110 transition-transform">
                        <Activity size={200} />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                        <div className="text-center md:text-left">
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-white mb-2">Financial Health</h3>
                            <p className="text-xs font-black text-text-muted uppercase tracking-[0.3em]">Overall metabolic financial health.</p>
                        </div>
                        <div className="flex gap-8">
                            <div className="text-center">
                                <span className="text-[10px] font-black uppercase tracking-widest text-text-muted block mb-2">SURPLUS</span>
                                <span className={`text-3xl font-black tabular-nums tracking-tighter ${totalIncome >= totalExpenses ? 'text-primary' : 'text-rose-500'}`}>
                                    {Math.abs(totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0).toFixed(0)}%
                                </span>
                            </div>
                            <div className="w-px h-16 bg-white/5" />
                            <div className="text-center">
                                <span className="text-[10px] font-black uppercase tracking-widest text-text-muted block mb-2">LOAD</span>
                                <span className="text-3xl font-black tabular-nums tracking-tighter text-white">
                                    {(totalIncome > 0 ? (totalExpenses / totalIncome) : 0).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <p className="text-[9px] font-black uppercase tracking-[0.5em] text-text-muted/20 text-center mt-20">PROTOCOL LAKSH ANALYTICS ENGINE V2.0.4</p>
            </motion.main>
        </div>
    );
};

export default Insights;
