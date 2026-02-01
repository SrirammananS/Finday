import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { motion, AnimatePresence } from 'framer-motion';
import TransactionForm from '../components/TransactionForm';
import { Search, Trash2, Filter, Plus, Download, FileText, ChevronDown, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { exportTransactions, generateFinancialReport, downloadFile } from '../utils/exportUtils';

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Math.abs(amount) || 0);
};

const Transactions = () => {
    const { transactions = [], categories = [], accounts = [], deleteTransaction, isLoading } = useFinance();
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [dateRange, setDateRange] = useState('all');
    const [sortBy, setSortBy] = useState('date');
    const [showExportMenu, setShowExportMenu] = useState(false);

    const handleExportCSV = () => { exportTransactions(filteredAndSorted, accounts, categories, 'csv'); setShowExportMenu(false); };
    const handleExportJSON = () => { exportTransactions(filteredAndSorted, accounts, categories, 'json'); setShowExportMenu(false); };
    const handleGenerateReport = () => {
        const report = generateFinancialReport(transactions, accounts, categories);
        downloadFile(JSON.stringify(report, null, 2), `financial-report-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
        setShowExportMenu(false);
    };

    React.useEffect(() => {
        if (showForm) document.body.classList.add('overflow-hidden');
        else document.body.classList.remove('overflow-hidden');
    }, [showForm]);

    const filteredAndSorted = useMemo(() => {
        let filtered = transactions.filter(t => {
            const desc = (t.description || '').toLowerCase();
            const cat = (t.category || '').toLowerCase();
            const acc = (accounts.find(a => a.id === t.accountId)?.name || '').toLowerCase();
            const q = search.toLowerCase();

            const searchMatch = !search || desc.includes(q) || cat.includes(q) || acc.includes(q);
            const categoryMatch = !selectedCategory || t.category === selectedCategory;

            let dateMatch = true;
            if (dateRange !== 'all' && t.date) {
                const diff = (new Date() - new Date(t.date)) / (1000 * 60 * 60 * 24);
                if (dateRange === 'week') dateMatch = diff <= 7;
                if (dateRange === 'month') dateMatch = diff <= 30;
                if (dateRange === 'quarter') dateMatch = diff <= 90;
            }
            return searchMatch && categoryMatch && dateMatch;
        });

        const sorters = {
            amount: (a, b) => Math.abs(b.amount) - Math.abs(a.amount),
            category: (a, b) => (a.category || '').localeCompare(b.category || ''),
            description: (a, b) => (a.description || '').localeCompare(b.description || ''),
            date: (a, b) => new Date(b.date) - new Date(a.date)
        };
        return filtered.sort(sorters[sortBy] || sorters.date);
    }, [transactions, search, selectedCategory, dateRange, sortBy, accounts]);

    const grouped = filteredAndSorted.reduce((acc, t) => {
        if (!t.date) return acc;
        const date = new Date(t.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
        if (!acc[date]) acc[date] = [];
        acc[date].push(t);
        return acc;
    }, {});

    const sortedGroupedEntries = Object.entries(grouped).sort(([d1], [d2]) => new Date(d2) - new Date(d1));

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]" />
        </div>
    );

    return (
        <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-black">
            {/* Background Grain/Noise Effect */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

            <motion.main
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative px-5 py-12 md:px-8 md:py-20 max-w-5xl mx-auto pb-40"
            >
                {/* Header Section */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(var(--primary-rgb),1)]" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted">Ledger Protocol</span>
                        </div>
                        <h1 className="text-xl font-black tracking-[-0.04em] leading-none mb-1 transition-all text-white uppercase">
                            Ledger
                        </h1>
                        <p className="text-[8px] font-semibold text-text-muted uppercase tracking-[0.4em] opacity-60">Complete history across all nodes.</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                className="h-14 px-6 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/40 transition-all flex items-center gap-3 group"
                            >
                                <Download size={20} className="text-text-muted group-hover:text-primary transition-colors" />
                                <span className="text-xs font-black uppercase tracking-widest">Export</span>
                            </motion.button>

                            <AnimatePresence>
                                {showExportMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                        className="absolute top-16 right-0 w-56 bg-black/90 border border-white/10 rounded-2xl backdrop-blur-2xl shadow-3xl p-2 z-50 overflow-hidden"
                                    >
                                        {[
                                            { label: 'Export CSV', icon: <FileText size={16} />, action: handleExportCSV },
                                            { label: 'Export JSON', icon: <FileText size={16} />, action: handleExportJSON },
                                            { label: 'Neural Report', icon: <FileText size={16} />, action: handleGenerateReport },
                                        ].map((item, i) => (
                                            <button
                                                key={i}
                                                onClick={item.action}
                                                className="w-full px-4 py-3 text-left hover:bg-white/5 rounded-xl transition-colors flex items-center gap-3 text-xs font-bold"
                                            >
                                                <span className="text-text-muted">{item.icon}</span>
                                                {item.label}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowForm(true)}
                            className="h-14 px-8 rounded-2xl bg-primary text-black flex items-center gap-3 hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.4)] transition-all font-black"
                        >
                            <Plus size={20} strokeWidth={3} />
                            <span className="text-xs uppercase tracking-widest">Signal</span>
                        </motion.button>
                    </div>
                </header>

                {/* Search & Intelligence Hub */}
                <div className="mb-12 space-y-6">
                    <div className="relative group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" size={24} />
                        <input
                            type="text"
                            placeholder="Trace signals..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full h-16 bg-white/5 border border-white/10 pl-14 pr-8 rounded-[1.5rem] font-black text-base outline-none focus:border-primary/50 focus:bg-white/[0.08] transition-all placeholder:text-white/10"
                        />
                        <div className="absolute right-8 top-1/2 -translate-y-1/2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-tighter border border-primary/20">
                            {filteredAndSorted.length} DATA NODES
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {/* Custom Selects with Gen Z feel */}
                        <div className="relative flex-1 min-w-[160px]">
                            <Filter size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full h-12 pl-10 pr-10 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest outline-none appearance-none hover:bg-white/10 transition-all cursor-pointer"
                            >
                                <option value="">All Streams</option>
                                {categories.map(cat => (
                                    <option key={cat.name} value={cat.name}>{cat.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                        </div>

                        <div className="relative flex-1 min-w-[160px]">
                            <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                            <select
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value)}
                                className="w-full h-12 pl-10 pr-10 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest outline-none appearance-none hover:bg-white/10 transition-all cursor-pointer"
                            >
                                <option value="all">Infinite Loop</option>
                                <option value="week">Past Week</option>
                                <option value="month">Past Month</option>
                                <option value="quarter">Fiscal Quarter</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                        </div>

                        {(search || selectedCategory || dateRange !== 'all') && (
                            <button
                                onClick={() => { setSearch(''); setSelectedCategory(''); setDateRange('all'); }}
                                className="h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 transition-all"
                            >
                                Reset Terminal
                            </button>
                        )}
                    </div>
                </div>

                {/* Timeline Section */}
                <div className="space-y-16">
                    {sortedGroupedEntries.map(([date, items], gIdx) => (
                        <div key={date} className="relative">
                            <div className="sticky top-2 z-30 mb-8">
                                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-black/80 backdrop-blur-xl border border-white/10">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-text-main">{date}</span>
                                </div>
                            </div>

                            <div className="space-y-4 ml-2 pl-6 border-l border-white/[0.05]">
                                {items.map((t, iIdx) => {
                                    const cat = categories.find(c => c.name === t.category);
                                    const isIncome = t.amount > 0;
                                    const account = accounts.find(a => a.id === t.accountId);
                                    const accountName = account ? account.name : 'Unknown Node';

                                    return (
                                        <motion.div
                                            key={`${t.id}-${t.date}`}
                                            initial={{ x: -20, opacity: 0 }}
                                            whileInView={{ x: 0, opacity: 1 }}
                                            viewport={{ once: true }}
                                            transition={{ delay: 0.05 * iIdx }}
                                            onClick={() => { setEditing(t); setShowForm(true); }}
                                            className="group relative p-4 md:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.05] grid grid-cols-[auto_1fr_auto] items-center gap-4 group-hover:bg-white/[0.07] group-hover:border-white/20 transition-all cursor-pointer overflow-hidden"
                                        >
                                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-black border border-white/10 flex items-center justify-center text-2xl md:text-3xl shrink-0 group-hover:scale-110 transition-transform">
                                                {cat?.icon || '📦'}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm md:text-base font-bold text-white uppercase tracking-tight truncate leading-tight">
                                                    {t.description}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[8px] md:text-[9px] font-medium text-text-muted uppercase tracking-widest">{t.category}</span>
                                                    <span className="w-1 h-1 rounded-full bg-white/20" />
                                                    <span className="text-[8px] md:text-[9px] font-medium text-text-muted uppercase tracking-widest">{accountName}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <p className={`text-base md:text-lg font-black tabular-nums tracking-tighter flex items-center gap-1 md:gap-2 ${isIncome ? 'text-emerald-400' : 'text-white'}`}>
                                                    {isIncome ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                                                    {formatCurrency(t.amount)}
                                                </p>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); if (confirm('Purge signal?')) deleteTransaction(t); }}
                                                    className="text-[9px] font-black text-rose-500/50 hover:text-rose-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all mt-1"
                                                >
                                                    Purge
                                                </button>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {filteredAndSorted.length === 0 && (
                        <div className="py-32 text-center">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="mb-6 inline-flex w-24 h-24 rounded-full bg-white/5 items-center justify-center opacity-20"
                            >
                                <Search size={40} />
                            </motion.div>
                            <p className="text-xl font-black uppercase tracking-widest text-text-muted">No Signals Detected</p>
                            <p className="text-sm text-text-muted/40 font-bold mt-2">The frequency is clear. Try a different trace.</p>
                        </div>
                    )}
                </div>

                {showForm && <TransactionForm onClose={() => { setShowForm(false); setEditing(null); }} editTransaction={editing} />}
            </motion.main>
        </div>
    );
};

export default Transactions;
