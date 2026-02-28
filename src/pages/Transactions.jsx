import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { motion, AnimatePresence } from 'framer-motion';
import TransactionForm from '../components/TransactionForm';
import PageLayout from '../components/PageLayout';
import PageHeader from '../components/PageHeader';
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
    const [sortBy, _setSortBy] = useState('date');
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
        <div className="min-h-screen text-text-main selection:bg-primary selection:text-black">
            <PageLayout>
                <PageHeader
                    badge="Ledger"
                    title="Transactions"
                    subtitle="Complete history across all nodes"
                    icon={FileText}
                    actions={
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                className="h-14 px-6 rounded-2xl bg-canvas-subtle border border-card-border hover:border-primary/40 transition-all flex items-center gap-3 group"
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
                                        className="absolute top-16 right-0 w-56 bg-card border border-card-border rounded-2xl backdrop-blur-2xl shadow-3xl p-2 z-50 overflow-hidden"
                                    >
                                        {[
                                            { label: 'Export CSV', icon: <FileText size={16} />, action: handleExportCSV },
                                            { label: 'Export JSON', icon: <FileText size={16} />, action: handleExportJSON },
                                            { label: 'Neural Report', icon: <FileText size={16} />, action: handleGenerateReport },
                                        ].map((item, i) => (
                                            <button
                                                key={i}
                                                onClick={item.action}
                                                className="w-full px-4 py-3 text-left hover:bg-canvas-elevated rounded-xl transition-colors flex items-center gap-3 text-xs font-bold"
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
                    }
                />

                {/* Search & Filters - Minimal, informative */}
                <div className="mb-8 space-y-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Search transactions..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full h-12 bg-canvas-subtle border border-card-border pl-12 pr-24 rounded-xl font-semibold text-sm outline-none focus:border-primary/50 transition-all placeholder:text-text-muted/50 text-text-main"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-text-muted">
                            {filteredAndSorted.length} results
                        </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <div className="relative flex-1 min-w-[140px]">
                            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full h-10 pl-9 pr-8 rounded-xl bg-canvas-subtle border border-card-border text-[10px] font-semibold outline-none appearance-none hover:bg-canvas-elevated transition-all cursor-pointer text-text-main"
                            >
                                <option value="">All Categories</option>
                                {categories.map(cat => (
                                    <option key={cat.name} value={cat.name}>{cat.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                        </div>

                        <div className="relative flex-1 min-w-[140px]">
                            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                            <select
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value)}
                                className="w-full h-10 pl-9 pr-8 rounded-xl bg-canvas-subtle border border-card-border text-[10px] font-semibold outline-none appearance-none hover:bg-canvas-elevated transition-all cursor-pointer text-text-main"
                            >
                                <option value="all">All Time</option>
                                <option value="week">Past Week</option>
                                <option value="month">Past Month</option>
                                <option value="quarter">Past Quarter</option>
                            </select>
                            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                        </div>

                        {(search || selectedCategory || dateRange !== 'all') && (
                            <button
                                onClick={() => { setSearch(''); setSelectedCategory(''); setDateRange('all'); }}
                                className="h-10 px-4 rounded-xl text-[10px] font-bold text-primary hover:bg-primary/5 transition-all"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </div>

                {/* Timeline - Clean, minimal */}
                <div className="space-y-6">
                    {sortedGroupedEntries.map(([date, items]) => (
                        <div key={date} className="relative">
                            <div className="sticky top-2 z-30 mb-3">
                                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-card-border text-[10px] font-bold uppercase text-text-muted">
                                    {date}
                                </span>
                            </div>
                            <div className="space-y-3">
                                {items.map((t, iIdx) => {
                                    const cat = categories.find(c => c.name === t.category);
                                    const isIncome = t.amount > 0;
                                    const account = accounts.find(a => a.id === t.accountId);
                                    const accountName = account ? account.name : '—';

                                    return (
                                        <motion.div
                                            key={`${t.id}-${t.date}`}
                                            initial={{ x: -10, opacity: 0 }}
                                            whileInView={{ x: 0, opacity: 1 }}
                                            viewport={{ once: true }}
                                            transition={{ delay: 0.03 * iIdx }}
                                            onClick={() => { setEditing(t); setShowForm(true); }}
                                            className="group p-4 md:p-6 rounded-2xl bg-card border border-card-border flex items-center gap-4 cursor-pointer hover:border-primary/20 transition-all"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-canvas-subtle flex items-center justify-center text-xl shrink-0">
                                                {cat?.icon || '📦'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-text-main truncate">{t.description}</p>
                                                <p className="text-[10px] font-semibold text-text-muted">{t.category} · {accountName}</p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <p className={`text-sm font-black tabular-nums ${isIncome ? 'text-emerald-400' : 'text-text-main'}`}>
                                                    {isIncome ? <ArrowUpRight size={14} className="inline" /> : <ArrowDownRight size={14} className="inline" />}{' '}
                                                    {formatCurrency(t.amount)}
                                                </p>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); if (confirm('Delete this transaction?')) deleteTransaction(t); }}
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all"
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

                    {filteredAndSorted.length === 0 && (
                        <div className="py-16 md:py-20 text-center rounded-2xl bg-card border border-dashed border-card-border p-6">
                            <Search size={40} className="mx-auto text-text-muted/30 mb-4" />
                            <p className="text-base font-bold text-text-muted">No transactions found</p>
                            <p className="text-sm text-text-muted/60 mt-1 mb-4">Try adjusting your filters or add your first transaction</p>
                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setShowForm(true)}
                                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold uppercase tracking-wider"
                            >
                                Add Transaction
                            </motion.button>
                        </div>
                    )}
                </div>

                {showForm && <TransactionForm onClose={() => { setShowForm(false); setEditing(null); }} editTransaction={editing} />}
            </PageLayout>
        </div>
    );
};

export default Transactions;
