import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { motion, AnimatePresence } from 'framer-motion';
import PageLayout from '../components/PageLayout';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/ui/SectionCard';
import { Search, Sparkles, X, TrendingUp, TrendingDown, PieChart, Info, Lock as LockIcon, Calendar, Filter, Layers, Globe, BrainCircuit, Wallet, CreditCard, BarChart3, LineChart, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval, subMonths, subDays, parseISO, startOfDay, endOfDay } from 'date-fns';
import { expenseOnlyTransactions, getLinkedCCPaymentTransactionIds } from '../utils/transactionUtils';
import { BarChart, Bar, LineChart as RechartsLine, Line, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { formatCurrency } from '../utils/formatUtils';
import { getAccountIcon } from '../utils/accountUtils';
import { getLinkedCCPaymentDisplay } from '../utils/transactionUtils';

/** Valid view presets when opening Insights from Dashboard (e.g. /insights?view=income) */
const VIEW_PRESETS = ['income', 'expense', 'net', 'assets', 'debt', 'categories'];

const TX_LIST_PAGE_SIZE = 20;


/** Compact filter dropdown: multi-select via checkbox list. Use compact=true for inline strip style. */
function MultiSelectFilterCard({ label, Icon, options, selectedSet, onChange, allLabel = 'All', countLabel, compact = false }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        if (!open) return;
        const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [open]);
    const isAll = selectedSet === null || selectedSet.size === 0 || selectedSet.size === options.length;
    const summary = isAll ? allLabel : selectedSet.size === 1
        ? (options.find(o => o.value === [...selectedSet][0])?.label ?? allLabel)
        : (countLabel ? `${selectedSet.size} ${countLabel}` : `${selectedSet.size} selected`);
    const dropdown = (
        <>
            {open && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-card-border bg-card shadow-xl overflow-hidden max-h-64 overflow-y-auto">
                    <label className="flex items-center gap-2 cursor-pointer px-3 py-2 hover:bg-canvas-subtle border-b border-card-border">
                        <input
                            type="checkbox"
                            checked={isAll}
                            onChange={() => onChange(null)}
                            className="w-3.5 h-3.5 rounded border-card-border bg-canvas text-primary focus:ring-primary"
                        />
                        <span className="text-xs font-medium text-text-main">{allLabel}</span>
                    </label>
                    {options.map((opt) => {
                        const checked = isAll || (selectedSet && selectedSet.has(opt.value));
                        return (
                            <label key={opt.value} className="flex items-center gap-2 cursor-pointer px-3 py-2 hover:bg-canvas-subtle">
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                        if (selectedSet === null) {
                                            onChange(new Set(options.filter(o => o.value !== opt.value).map(o => o.value)));
                                        } else {
                                            const next = new Set(selectedSet);
                                            if (next.has(opt.value)) {
                                                next.delete(opt.value);
                                                onChange(next.size === 0 ? null : next);
                                            } else {
                                                next.add(opt.value);
                                                onChange(next.size === options.length ? null : next);
                                            }
                                        }
                                    }}
                                    className="w-3.5 h-3.5 rounded border-card-border bg-canvas text-primary focus:ring-primary"
                                />
                                {opt.icon != null && <span className="text-sm leading-none">{opt.icon}</span>}
                                <span className="text-xs font-medium text-text-muted truncate">{opt.label}</span>
                            </label>
                        );
                    })}
                </div>
            )}
        </>
    );
    if (compact) {
        return (
            <div className="relative flex items-center gap-1.5 min-w-0" ref={ref}>
                {Icon && <Icon size={12} className="text-text-muted shrink-0" />}
                <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    className="flex items-center gap-1.5 min-h-[28px] px-2 py-1 rounded-md text-left hover:bg-canvas-elevated/80 transition-colors touch-manipulation"
                >
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted shrink-0">{label}</span>
                    <span className="text-xs font-medium text-text-main truncate max-w-[120px] md:max-w-[140px]">{summary}</span>
                    <ChevronDown size={12} className={`shrink-0 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {dropdown}
            </div>
        );
    }
    return (
        <div className="relative p-3 md:p-4 rounded-xl md:rounded-2xl bg-canvas-subtle border border-card-border flex items-center gap-2 md:gap-4 w-full md:min-w-0 md:flex-1" ref={ref}>
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-card flex items-center justify-center text-primary shrink-0">
                <Icon size={14} className="md:w-[18px] md:h-[18px]" />
            </div>
            <div className="flex-1 min-w-0">
                <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-text-muted block mb-0.5">{label}</span>
                <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    className="w-full min-h-[2.75rem] flex items-center justify-between gap-2 bg-transparent border-none p-0 text-sm font-bold uppercase text-text-main outline-none cursor-pointer tracking-tight text-left hover:opacity-80 touch-manipulation"
                >
                    <span className="truncate">{summary}</span>
                    <ChevronDown size={14} className={`shrink-0 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
            </div>
            <Filter size={12} className="md:w-4 md:h-4 text-text-muted pointer-events-none shrink-0" />
            {dropdown}
        </div>
    );
}

const DATE_PRESETS = [
    { key: '7d', label: 'Last 7 days' },
    { key: '30d', label: 'Last 30 days' },
    { key: '90d', label: 'Last 90 days' },
    { key: 'this_month', label: 'This month' },
    { key: 'last_month', label: 'Last month' },
    { key: 'custom', label: 'Custom' },
];

function getRangeFromPreset(presetKey, customStart, customEnd) {
    const now = new Date();
    if (presetKey === 'custom' && customStart && customEnd) {
        return { start: startOfDay(parseISO(customStart)), end: endOfDay(parseISO(customEnd)) };
    }
    switch (presetKey) {
        case '7d':
            return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
        case '30d':
            return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
        case '90d':
            return { start: startOfDay(subDays(now, 89)), end: endOfDay(now) };
        case 'this_month':
            return { start: startOfMonth(now), end: endOfMonth(now) };
        case 'last_month': {
            const last = subMonths(now, 1);
            return { start: startOfMonth(last), end: endOfMonth(last) };
        }
        default:
            return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
    }
}

const Insights = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const viewPreset = VIEW_PRESETS.includes(searchParams.get('view') || '') ? searchParams.get('view') : null;

    const { transactions = [], categories = [], accounts = [], bills = [], billPayments = [], creditCards = [], creditCardPayments = [], isLoading, closePeriod, closedPeriods = [], smartQuery } = useFinance();
    const linkedCCPaymentTxnIds = useMemo(() => getLinkedCCPaymentTransactionIds(billPayments, bills, creditCardPayments), [billPayments, bills, creditCardPayments]);

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState(''); // Text search
    const [searchResultAI, setSearchResultAI] = useState(null); // AI results
    const [isThinking, setIsThinking] = useState(false);

    const now = new Date();
    const [datePreset, setDatePreset] = useState('30d');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const dateSelection = useMemo(
        () => getRangeFromPreset(datePreset, customStart, customEnd),
        [datePreset, customStart, customEnd]
    );

    useEffect(() => {
        if (datePreset === 'custom' && !customStart && !customEnd) {
            setCustomStart(format(subDays(now, 29), 'yyyy-MM-dd'));
            setCustomEnd(format(now, 'yyyy-MM-dd'));
        }
    }, [datePreset]);
    /** Category filter: null = All; Set of category names = only those */
    const [selectedCategoryNames, setSelectedCategoryNames] = useState(null);
    /** Account filter: null = All; Set of account ids = only those */
    const [selectedAccountIds, setSelectedAccountIds] = useState(null);
    const [showSealInfo, setShowSealInfo] = useState(false);
    /** Multi-option graph view for current filter: list | bar | line | pie */
    const [graphView, setGraphView] = useState('list');
    /** Transaction list pagination (1-based) */
    const [txListPage, setTxListPage] = useState(1);

    const visibleAccounts = useMemo(() => (accounts || []).filter(a => !a.hidden), [accounts]);

    // When opening with ?view=income (etc), search is "already loaded" – show that slice only
    const viewLabel = viewPreset ? { income: 'Income', expense: 'Expense', net: 'Net flow', assets: 'Assets', debt: 'Debt', categories: 'Expense by category' }[viewPreset] : null;

    useEffect(() => {
        const dateParam = searchParams.get('date');
        const categoryParam = searchParams.get('category');
        if (dateParam) {
            try {
                const d = parseISO(dateParam);
                const dayStr = format(d, 'yyyy-MM-dd');
                setDatePreset('custom');
                setCustomStart(dayStr);
                setCustomEnd(dayStr);
            } catch (_) { /* ignore */ }
        }
        if (categoryParam != null && categoryParam !== '') {
            setSelectedCategoryNames(new Set([decodeURIComponent(categoryParam)]));
        }
    }, [searchParams]);

    const handleAISearch = async (e) => {
        e?.preventDefault();
        if (!searchQuery.trim()) return;
        setIsThinking(true);
        const result = await smartQuery(searchQuery);
        setSearchResultAI(result);
        setIsThinking(false);
    };

    // Filtering Logic (date, category, search) + view preset (income / expense / net / categories)
    const filteredData = useMemo(() => {
        let list = transactions.filter(t => {
            if (!t.date) return false;
            const tDate = parseISO(t.date);

            // 1. Date Filter
            if (dateSelection.start && dateSelection.end) {
                if (!isWithinInterval(tDate, { start: startOfDay(dateSelection.start), end: endOfDay(dateSelection.end) })) {
                    return false;
                }
            }

            // 2. Category Filter (multi-select)
            if (selectedCategoryNames && selectedCategoryNames.size > 0) {
                if (!t.category || !selectedCategoryNames.has(t.category)) return false;
            }

            // 2b. Account / Wallet filter (multi-select)
            if (selectedAccountIds && selectedAccountIds.size > 0) {
                if (!t.accountId || !selectedAccountIds.has(t.accountId)) return false;
            }

            // 3. Text Search (Word Wise)
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchDesc = t.description?.toLowerCase().includes(query);
                const matchCat = t.category?.toLowerCase().includes(query);
                const matchAmount = t.amount?.toString().includes(query);
                if (!matchDesc && !matchCat && !matchAmount) return false;
            }

            return true;
        });

        // 4. View preset from Dashboard link: show only that slice (income means income, etc.)
        if (viewPreset === 'income') {
            list = list.filter(t => parseFloat(t.amount) > 0);
        } else if (viewPreset === 'expense' || viewPreset === 'categories') {
            list = list.filter(t => parseFloat(t.amount) < 0);
        }
        // net / assets / debt: no extra transaction filter (assets/debt use accounts below)

        return list;
    }, [transactions, dateSelection, selectedCategoryNames, selectedAccountIds, searchQuery, viewPreset]);

    const totalTxPages = useMemo(() => Math.max(1, Math.ceil(filteredData.length / TX_LIST_PAGE_SIZE)), [filteredData.length]);
    const paginatedTxs = useMemo(
        () => filteredData.slice((txListPage - 1) * TX_LIST_PAGE_SIZE, txListPage * TX_LIST_PAGE_SIZE),
        [filteredData, txListPage]
    );

    useEffect(() => {
        setTxListPage(1);
    }, [filteredData.length]);

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
        </div>
    );

    const activeMonthKey = datePreset === 'this_month' ? format(now, 'yyyy-MM') : datePreset === 'last_month' ? format(subMonths(now, 1), 'yyyy-MM') : null;
    const isPeriodClosed = activeMonthKey ? closedPeriods.includes(activeMonthKey) : false;

    // Calculations for Filtered Data (exclude CC payment/settlement + linked CC bill payments)
    const expenses = expenseOnlyTransactions(filteredData, linkedCCPaymentTxnIds);
    const incomeList = filteredData.filter(t => t.amount > 0);
    const totalExpenses = expenses.reduce((s, t) => s + Math.abs(parseFloat(t.amount) || 0), 0);
    const totalIncome = incomeList.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    const netValue = totalIncome - totalExpenses;

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
            value: amount,
            percent: totalExpenses > 0 ? (amount / totalExpenses * 100).toFixed(0) : 0,
            icon: categories.find(c => c.name === name)?.icon || '📦',
        }));

    /** For line chart: daily expense totals in selected range */
    const dailyExpenseData = useMemo(() => {
        if (!dateSelection.start || !dateSelection.end) return [];
        const byDate = {};
        expenses.forEach((t) => {
            const d = format(parseISO(t.date), 'yyyy-MM-dd');
            byDate[d] = (byDate[d] || 0) + Math.abs(parseFloat(t.amount) || 0);
        });
        const days = eachDayOfInterval({ start: dateSelection.start, end: dateSelection.end });
        return days.map((day) => {
            const d = format(day, 'yyyy-MM-dd');
            const label = format(day, 'd MMM');
            return { name: label, date: d, value: byDate[d] || 0 };
        });
    }, [expenses, dateSelection.start, dateSelection.end]);

    const CHART_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#6366f1', '#a855f7', '#ec4899', '#14b8a6'];

    return (
        <div className="min-h-screen text-text-main selection:bg-primary selection:text-black overflow-x-hidden">
            <PageLayout>
                <PageHeader
                    badge="Analytics"
                    title="Insights"
                    subtitle="Deep data exploration"
                    icon={PieChart}
                    actions={
                    <div className="flex flex-col items-end gap-2 relative">
                        {activeMonthKey && (
                            <>
                                <motion.div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setShowSealInfo(!showSealInfo)}
                                        className="w-6 h-6 rounded-full border border-card-border flex items-center justify-center text-text-muted hover:text-text-main"
                                    >
                                        <Info size={12} />
                                    </button>
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        disabled={isPeriodClosed}
                                        onClick={() => { if (window.confirm(`Seal period ${activeMonthKey}? This prevents future edits.`)) closePeriod(activeMonthKey); }}
                                        className={`h-12 px-6 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] border transition-all flex items-center gap-3
                                        ${isPeriodClosed ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-canvas-subtle text-text-muted border-card-border hover:border-primary hover:text-primary'}`}
                                    >
                                        {isPeriodClosed ? <Globe size={14} /> : <LockIcon size={14} />}
                                        {isPeriodClosed ? 'SEALED' : 'SEAL PERIOD'}
                                    </motion.button>
                                </motion.div>
                                <AnimatePresence>
                                    {showSealInfo && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                            className="absolute top-14 right-0 w-64 p-4 bg-card/90 backdrop-blur-xl border border-primary/20 rounded-xl shadow-2xl z-50 hover:bg-card-hover"
                                        >
                                            <p className="text-[10px] text-text-muted leading-relaxed">
                                                <strong className="text-primary block mb-1">About Sealing</strong>
                                                Sealing a period "locks" all transactions within it. This is useful for closing your books at the end of a month. Sealed periods cannot be edited.
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </>
                        )}
                    </div>
                    }
                />

                {/* ADVANCED SEARCH & FILTER SECTION */}
                <div className="space-y-3 md:space-y-6 mb-8 md:mb-16">

                    {/* 1. Main Search Bar (Word Wise + AI) */}
                    <div className="relative group max-w-full">
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-primary/5 to-primary/20 rounded-[1.5rem] md:rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500" />
                        <div className="relative flex items-center p-1.5 md:p-2 bg-card border border-card-border rounded-[1.2rem] md:rounded-[2rem] shadow-xl backdrop-blur-xl group-focus-within:border-primary/50 transition-colors">
                            <div className="w-9 h-9 md:w-12 md:h-12 rounded-full bg-canvas-subtle flex items-center justify-center shrink-0 ml-1">
                                <Search size={16} className="md:w-5 md:h-5 text-text-muted group-focus-within:text-primary transition-colors" />
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="SEARCH..."
                                className="w-full h-10 md:h-14 bg-transparent border-none pl-3 pr-2 font-black text-xs md:text-lg text-text-main placeholder:text-text-muted/40 focus:ring-0 outline-none uppercase tracking-wide"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => { setSearchQuery(''); setSearchResultAI(null); }}
                                    className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-text-muted hover:text-text-main transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            )}
                            <button
                                onClick={handleAISearch}
                                disabled={isThinking || !searchQuery.trim()}
                                className="h-9 md:h-12 px-3 md:px-6 rounded-xl md:rounded-[1.5rem] bg-canvas-subtle text-text-muted font-black uppercase text-[8px] md:text-[10px] tracking-[0.15em] hover:bg-primary hover:text-primary-foreground transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50 mx-0.5"
                            >
                                {isThinking ? <Sparkles size={12} className="animate-spin" /> : <span>AI</span>}
                            </button>
                        </div>
                    </div>

                    {/* 2. Filters: single strip — Period | Sector | Wallet */}
                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-0 rounded-xl border border-card-border bg-canvas-subtle/60 px-3 py-2.5 md:py-2">
                        {/* Period — compact pills */}
                        <div className="flex flex-wrap items-center gap-1.5 md:gap-2 md:pr-4">
                            <Calendar size={12} className="text-text-muted shrink-0 hidden md:block" />
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted shrink-0 mr-0.5">Period</span>
                            <div className="flex flex-wrap gap-1">
                                {DATE_PRESETS.map(({ key, label }) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setDatePreset(key)}
                                        className={`min-h-[26px] px-2.5 py-1 rounded-md text-[11px] font-medium transition-all touch-manipulation ${
                                            datePreset === key
                                                ? 'bg-primary text-primary-foreground'
                                                : 'text-text-muted hover:bg-canvas-elevated hover:text-text-main'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            {datePreset === 'custom' && (
                                <div className="flex items-center gap-1.5 ml-1 pl-1 border-l border-card-border">
                                    <input
                                        type="date"
                                        value={customStart}
                                        onChange={(e) => setCustomStart(e.target.value)}
                                        className="h-7 px-2 rounded bg-canvas border border-card-border text-[11px] text-text-main outline-none focus:border-primary touch-manipulation w-[110px]"
                                    />
                                    <span className="text-text-muted text-[10px]">→</span>
                                    <input
                                        type="date"
                                        value={customEnd}
                                        onChange={(e) => setCustomEnd(e.target.value)}
                                        className="h-7 px-2 rounded bg-canvas border border-card-border text-[11px] text-text-main outline-none focus:border-primary touch-manipulation w-[110px]"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="hidden md:block w-px h-5 bg-card-border shrink-0" aria-hidden />
                        <div className="md:hidden w-full h-px bg-card-border shrink-0" aria-hidden />

                        <div className="flex flex-wrap items-center gap-2 md:gap-4 md:pl-4 md:flex-1 md:min-w-0">
                            <MultiSelectFilterCard
                                compact
                                label="Sector"
                                Icon={Layers}
                                options={categories.map((c) => ({ value: c.name, label: c.name }))}
                                selectedSet={selectedCategoryNames}
                                onChange={setSelectedCategoryNames}
                                allLabel="All"
                                countLabel="sectors"
                            />
                            <MultiSelectFilterCard
                                compact
                                label="Wallet"
                                Icon={Wallet}
                                options={visibleAccounts.map((a) => ({ value: a.id, label: a.name, icon: getAccountIcon(a) }))}
                                selectedSet={selectedAccountIds}
                                onChange={setSelectedAccountIds}
                                allLabel="All"
                                countLabel="wallets"
                            />
                        </div>
                    </div>

                    {/* AI Results Area */}
                    <AnimatePresence>
                        {searchResultAI && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="p-6 rounded-[2rem] bg-card border border-primary/20 bg-primary/5">
                                    <div className="flex items-center gap-2 mb-3 text-primary">
                                        <BrainCircuit size={16} />
                                        <span className="text-[9px] font-black uppercase tracking-[0.3em]">AI Analysis</span>
                                    </div>
                                    <p className="text-base font-bold text-text-main leading-relaxed">{searchResultAI.summary}</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* View preset chip when opened from Dashboard (e.g. ?view=income) */}
                    {viewLabel && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Showing:</span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/15 border border-primary/30 text-primary text-xs font-black uppercase tracking-wide">
                                {viewLabel}
                            </span>
                            <button
                                type="button"
                                onClick={() => setSearchParams((prev) => { const next = new URLSearchParams(prev); next.delete('view'); return next; })}
                                className="text-[10px] font-bold text-text-muted hover:text-text-main transition-colors"
                            >
                                Clear filter
                            </button>
                        </div>
                    )}
                </div>

                {/* Assets / Debt section when view=assets or view=debt */}
                {(viewPreset === 'assets' || viewPreset === 'debt') && (
                    <SectionCard
                        title={viewPreset === 'assets' ? 'Assets' : 'Debt'}
                        subtitle={viewPreset === 'assets' ? 'Accounts (excluding credit)' : 'Credit accounts'}
                        className="mb-6 md:mb-8"
                    >
                        {(() => {
                            const relevantAccounts = viewPreset === 'assets'
                                ? (accounts || []).filter(a => a.type !== 'credit' && !a.hidden)
                                : (accounts || []).filter(a => a.type === 'credit' && !a.hidden);
                            const total = relevantAccounts.reduce((s, a) => s + (parseFloat(a.balance) || 0), 0);
                            return (
                                <div className="space-y-3">
                                    <p className="text-lg font-black tabular-nums text-text-main">
                                        {viewPreset === 'assets' ? formatCurrency(total) : formatCurrency(Math.abs(total))}
                                    </p>
                                    <div className="grid gap-2">
                                        {relevantAccounts.map((acc) => (
                                            <div
                                                key={acc.id}
                                                className="p-3 rounded-xl bg-canvas-subtle/30 border border-card-border flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center">
                                                        {viewPreset === 'assets' ? <Wallet size={18} className="text-primary" /> : <CreditCard size={18} className="text-rose-500" />}
                                                    </div>
                                                    <span className="font-bold text-text-main">{acc.name}</span>
                                                </div>
                                                <span className={`font-black tabular-nums ${viewPreset === 'debt' ? 'text-rose-500' : 'text-text-main'}`}>
                                                    {formatCurrency(acc.balance)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    {relevantAccounts.length === 0 && (
                                        <p className="text-sm text-text-muted">No {viewPreset === 'assets' ? 'asset' : 'credit'} accounts. Add them in Accounts.</p>
                                    )}
                                </div>
                            );
                        })()}
                    </SectionCard>
                )}

                {/* Summary — compact strip (matches filter bar) */}
                <div className="grid grid-cols-2 md:flex md:flex-row md:items-center gap-2 md:gap-0 rounded-xl border border-card-border bg-canvas-subtle/60 px-3 py-2.5 md:py-2 mb-6 md:mb-8">
                    <div className="flex items-center gap-2 min-w-0 p-1 md:p-0 md:flex-1 md:min-w-0 md:pr-4">
                        <TrendingUp size={14} className="text-emerald-500 shrink-0" />
                        <div className="min-w-0">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted block">Inflow</span>
                            <span className="text-sm font-black tabular-nums text-emerald-400 truncate block">{formatCurrency(totalIncome)}</span>
                        </div>
                    </div>
                    <div className="hidden md:block w-px h-8 bg-card-border shrink-0" aria-hidden />
                    <div className="flex items-center gap-2 min-w-0 p-1 md:p-0 md:flex-1 md:min-w-0 md:px-4">
                        <TrendingDown size={14} className="text-rose-500 shrink-0" />
                        <div className="min-w-0">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted block">Outflow</span>
                            <span className="text-sm font-black tabular-nums text-rose-400 truncate block">{formatCurrency(totalExpenses)}</span>
                        </div>
                    </div>
                    <div className="hidden md:block w-px h-8 bg-card-border shrink-0" aria-hidden />
                    <div className="flex items-center gap-2 min-w-0 p-1 md:p-0 md:flex-1 md:min-w-0 md:px-4">
                        <PieChart size={14} className={`shrink-0 ${netValue >= 0 ? 'text-primary' : 'text-rose-500'}`} />
                        <div className="min-w-0">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted block">Net</span>
                            <span className={`text-sm font-black tabular-nums truncate block ${netValue >= 0 ? 'text-primary' : 'text-rose-400'}`}>
                                {netValue >= 0 ? '+' : ''}{formatCurrency(netValue)}
                            </span>
                        </div>
                    </div>
                    <div className="hidden md:block w-px h-8 bg-card-border shrink-0" aria-hidden />
                    <div className="flex items-center gap-2 min-w-0 p-1 md:p-0 md:flex-1 md:min-w-0 md:pl-4">
                        <BarChart3 size={14} className="text-text-muted shrink-0" />
                        <div className="min-w-0">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted block">Transactions</span>
                            <span className="text-sm font-black tabular-nums text-text-main">{filteredData.length}</span>
                        </div>
                    </div>
                </div>

                {/* Breakdown: multi-option graph view for current filter */}
                <SectionCard
                    title="Breakdown"
                    subtitle="By category · switch view"
                    className="mb-6 md:mb-8"
                    action={
                        <div className="flex items-center gap-1 flex-wrap">
                            {[
                                { id: 'list', label: 'List', Icon: Layers },
                                { id: 'bar', label: 'Bar', Icon: BarChart3 },
                                { id: 'line', label: 'Line', Icon: LineChart },
                                { id: 'pie', label: 'Pie', Icon: PieChart },
                            ].map(({ id, label, Icon }) => (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => setGraphView(id)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${graphView === id ? 'bg-primary text-primary-foreground' : 'bg-canvas-subtle text-text-muted hover:text-text-main'}`}
                                >
                                    <Icon size={12} />
                                    {label}
                                </button>
                            ))}
                        </div>
                    }
                >
                    {sortedCategories.length > 0 || dailyExpenseData.some((d) => d.value > 0) ? (
                        <>
                            {graphView === 'list' && (
                                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-3">
                                    {sortedCategories.map((cat, idx) => (
                                        <motion.div
                                            key={cat.name}
                                            initial={{ x: 0, opacity: 1 }}
                                            whileInView={{ x: 0, opacity: 1 }}
                                            transition={{ delay: 0.02 * idx }}
                                            viewport={{ once: true }}
                                            className="p-3 rounded-xl bg-canvas-subtle/30 border border-transparent flex items-center justify-between hover:border-primary/15 transition-all"
                                        >
                                            <div className="flex items-center gap-3 md:gap-4">
                                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-canvas-subtle border border-card-border flex items-center justify-center text-lg md:text-xl">
                                                    {cat.icon}
                                                </div>
                                                <div>
                                                    <h4 className="text-[10px] md:text-xs font-black uppercase tracking-tight text-text-main">{cat.name}</h4>
                                                    <div className="flex items-center gap-1.5 md:gap-2 mt-0.5 md:mt-1">
                                                        <div className="h-1.5 w-12 md:w-16 bg-card-border rounded-full overflow-hidden">
                                                            <div className="h-full bg-primary rounded-full" style={{ width: `${cat.percent}%` }} />
                                                        </div>
                                                        <span className="text-[8px] md:text-[9px] font-black text-text-muted">{cat.percent}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-base md:text-lg font-black text-text-main tabular-nums tracking-tighter">{formatCurrency(cat.amount)}</span>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                            {graphView === 'bar' && sortedCategories.length > 0 && (
                                <div className="h-[320px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart layout="vertical" data={sortedCategories} margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
                                            <CartesianGrid strokeDasharray="2 2" horizontal={false} stroke="rgba(255,255,255,0.06)" />
                                            <XAxis type="number" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }} tickFormatter={(v) => (v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
                                            <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.6)' }} />
                                            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.06)' }} formatter={(value) => [formatCurrency(value), 'Spend']} contentStyle={{ borderRadius: 12, border: '1px solid var(--card-border)' }} />
                                            <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={400}>
                                                {sortedCategories.map((_, idx) => (
                                                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                            {graphView === 'line' && dailyExpenseData.length > 0 && (
                                <div className="h-[280px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RechartsLine data={dailyExpenseData} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
                                            <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.06)" />
                                            <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.5)' }} interval="preserveStartEnd" />
                                            <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.5)' }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
                                            <Tooltip formatter={(value) => [formatCurrency(value), 'Expense']} contentStyle={{ borderRadius: 12, border: '1px solid var(--card-border)' }} />
                                            <Line type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} isAnimationActive animationDuration={400} />
                                        </RechartsLine>
                                    </ResponsiveContainer>
                                </div>
                            )}
                            {graphView === 'pie' && sortedCategories.length > 0 && (
                                <div className="h-[320px] w-full max-w-md mx-auto">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RechartsPie>
                                            <Pie
                                                data={sortedCategories}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius="40%"
                                                outerRadius="75%"
                                                paddingAngle={2}
                                                isAnimationActive
                                                animationDuration={400}
                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                            >
                                                {sortedCategories.map((_, idx) => (
                                                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: 12, border: '1px solid var(--card-border)' }} />
                                        </RechartsPie>
                                    </ResponsiveContainer>
                                </div>
                            )}
                            {graphView === 'line' && !dailyExpenseData.some((d) => d.value > 0) && (
                                <div className="py-12 rounded-2xl bg-canvas-subtle/30 border border-dashed border-card-border text-center p-6">
                                    <p className="text-sm font-bold text-text-muted">No daily expense in range</p>
                                    <p className="text-xs text-text-muted/60 mt-1">Switch to List, Bar or Pie for category breakdown</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="py-12 rounded-2xl bg-canvas-subtle/30 border border-dashed border-card-border text-center p-6">
                            <Info size={32} className="mx-auto text-text-muted/30 mb-3" />
                            <p className="text-sm font-bold text-text-muted">No data for this filter</p>
                            <p className="text-xs text-text-muted/60 mt-1">Try a different date range or category</p>
                        </div>
                    )}
                </SectionCard>

                {/* Transaction List */}
                {filteredData.length > 0 && (
                    <SectionCard title="Transactions" subtitle={`${filteredData.length} items`} className="mb-6">
                        <div className="space-y-2">
                            {paginatedTxs.map((tx, idx) => {
                                const isExpense = parseFloat(tx.amount) < 0;
                                const account = tx.accountId ? (accounts || []).find(a => a.id === tx.accountId) : null;
                                const ccDisplay = getLinkedCCPaymentDisplay(tx.id, billPayments, bills, accounts, creditCardPayments, creditCards, { transaction: tx });
                                const displayDescription = ccDisplay ? ccDisplay.label : (tx.description || 'No description');
                                return (
                                    <motion.div
                                        key={tx.id || idx}
                                        initial={{ x: 0, opacity: 1 }}
                                        whileInView={{ x: 0, opacity: 1 }}
                                        transition={{ delay: 0.02 * idx }}
                                        viewport={{ once: true }}
                                        className="p-3 rounded-xl bg-canvas-subtle/30 border border-transparent flex items-center justify-between gap-3 hover:border-primary/15 transition-all"
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className={`w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center text-lg shrink-0 ${isExpense ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'
                                                }`}>
                                                {ccDisplay ? '💳' : (categories.find(c => c.name === tx.category)?.icon || (isExpense ? '💸' : '💰'))}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-xs md:text-sm font-bold text-text-main line-clamp-1" title={ccDisplay ? tx.description : undefined}>{displayDescription}</h4>
                                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                    <span className="text-[10px] md:text-xs font-black text-primary uppercase">{format(new Date(tx.date), 'dd MMM yyyy')}</span>
                                                    <span className="w-1 h-1 rounded-full bg-card-border" />
                                                    <span className="text-[10px] font-bold text-text-muted truncate">{tx.category || 'Other'}</span>
                                                    {tx.accountId && (
                                                        <>
                                                            <span className="w-1 h-1 rounded-full bg-card-border" />
                                                            <span className="text-[10px] font-bold text-text-muted truncate inline-flex items-center gap-1">
                                                                <span title={account?.name}>{getAccountIcon(account)}</span>
                                                                {account?.name ?? '—'}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <span className={`text-sm md:text-base font-black tabular-nums whitespace-nowrap ${isExpense ? 'text-rose-500' : 'text-emerald-500'}`}>
                                            {isExpense ? '-' : '+'}{formatCurrency(Math.abs(tx.amount))}
                                        </span>
                                    </motion.div>
                                );
                            })}

                            {totalTxPages > 1 && (
                                <div className="flex items-center justify-center gap-2 pt-3 pb-1">
                                    <button
                                        type="button"
                                        onClick={() => setTxListPage(p => Math.max(1, p - 1))}
                                        disabled={txListPage <= 1}
                                        className="p-2 rounded-lg border border-card-border bg-canvas-subtle/50 text-text-muted hover:text-text-main hover:border-primary/30 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                                        aria-label="Previous page"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <span className="text-[10px] md:text-xs font-semibold text-text-muted tabular-nums">
                                        {txListPage} / {totalTxPages}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setTxListPage(p => Math.min(totalTxPages, p + 1))}
                                        disabled={txListPage >= totalTxPages}
                                        className="p-2 rounded-lg border border-card-border bg-canvas-subtle/50 text-text-muted hover:text-text-main hover:border-primary/30 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                                        aria-label="Next page"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </SectionCard>
                )}
            </PageLayout>
        </div>
    );
};

export default Insights;
