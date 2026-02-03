import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, X, History, TrendingUp, TrendingDown, Activity, BrainCircuit, Globe, PieChart, Info, Lock as LockIcon, Calendar, Filter, Layers, ChevronLeft, ChevronRight, Check, List } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isWithinInterval, addMonths, subMonths, parseISO, startOfDay, endOfDay } from 'date-fns';

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Math.abs(amount) || 0);
};

// --- GLASS CALENDAR COMPONENT ---
const GlassCalendar = ({ selection, onSelect, onClose }) => {
    const [viewDate, setViewDate] = useState(selection.start || new Date());
    const [mode, setMode] = useState(selection.mode || 'month'); // 'month' or 'range'
    const [tempSelection, setTempSelection] = useState(selection);

    const daysInMonth = eachDayOfInterval({
        start: startOfMonth(viewDate),
        end: endOfMonth(viewDate)
    });

    const handleDayClick = (day) => {
        if (mode === 'month') {
            const start = startOfMonth(day);
            const end = endOfMonth(day);
            setTempSelection({ start, end, mode: 'month' });
        } else {
            // Range logic: Set start, thence end
            if (!tempSelection.start || (tempSelection.start && tempSelection.end) || isSameDay(day, tempSelection.start)) {
                setTempSelection({ start: day, end: null, mode: 'range' });
            } else {
                let s = tempSelection.start;
                let e = day;
                if (e < s) [s, e] = [e, s]; // Swap if backwards
                setTempSelection({ start: startOfDay(s), end: endOfDay(e), mode: 'range' });
            }
        }
    };

    const confirmSelection = () => {
        onSelect(tempSelection);
        onClose();
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-14 left-0 z-50 p-4 md:p-6 bg-card/95 backdrop-blur-2xl border border-primary/20 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl w-[300px] md:w-[340px]"
        >
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
                <button onClick={() => setViewDate(subMonths(viewDate, 1))} className="p-2 hover:bg-text-main/10 rounded-full transition-colors text-text-main"><ChevronLeft size={16} /></button>
                <div className="text-center">
                    <h3 className="text-lg font-black uppercase tracking-widest text-text-main">{format(viewDate, 'MMMM')}</h3>
                    <span className="text-xs font-bold text-primary">{format(viewDate, 'yyyy')}</span>
                </div>
                <button onClick={() => setViewDate(addMonths(viewDate, 1))} className="p-2 hover:bg-text-main/10 rounded-full transition-colors text-text-main"><ChevronRight size={16} /></button>
            </div>

            {/* Mode Toggle */}
            <div className="flex bg-canvas-subtle rounded-xl p-1 mb-4 border border-card-border">
                <button
                    onClick={() => { setMode('month'); setTempSelection({ ...tempSelection, mode: 'month' }); }}
                    className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${mode === 'month' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-text-muted hover:text-text-main'}`}
                >
                    Month View
                </button>
                <button
                    onClick={() => { setMode('range'); setTempSelection({ mode: 'range', start: null, end: null }); }}
                    className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${mode === 'range' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-text-muted hover:text-text-main'}`}
                >
                    Custom Range
                </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-1 mb-6">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                    <span key={d} className="text-center text-[9px] font-black text-text-muted py-2">{d}</span>
                ))}

                {/* Empty slots for start of month */}
                {Array.from({ length: startOfMonth(viewDate).getDay() }).map((_, i) => <div key={`empty-${i}`} />)}

                {daysInMonth.map(day => {
                    const isSelected = mode === 'month'
                        ? isSameMonth(day, tempSelection.start)
                        : (tempSelection.start && isSameDay(day, tempSelection.start)) || (tempSelection.end && isSameDay(day, tempSelection.end));

                    const isInRange = mode === 'range' && tempSelection.start && tempSelection.end && isWithinInterval(day, { start: tempSelection.start, end: tempSelection.end });

                    return (
                        <button
                            key={day.toString()}
                            onClick={() => handleDayClick(day)}
                            className={`
                                relative h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold transition-all
                                ${isSelected ? 'bg-primary text-primary-foreground shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)] z-10' : ''}
                                ${isInRange && !isSelected ? 'bg-primary/20 text-text-main' : ''}
                                ${!isSelected && !isInRange ? 'hover:bg-text-main/10 text-text-main' : ''}
                            `}
                        >
                            {format(day, 'd')}
                        </button>
                    );
                })}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-card-border">
                <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase text-text-muted tracking-widest">Selected</span>
                    <span className="text-[10px] font-bold text-primary truncate max-w-[150px]">
                        {tempSelection.start ? format(tempSelection.start, 'MMM d') : '...'}
                        {tempSelection.end && ` - ${format(tempSelection.end, 'MMM d')}`}
                    </span>
                </div>
                <button
                    onClick={confirmSelection}
                    className="h-10 px-6 bg-primary text-primary-foreground rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 flex items-center gap-2"
                >
                    Apply <Check size={14} />
                </button>
            </div>
        </motion.div>
    );
};

const Insights = () => {
    const { transactions = [], categories = [], isLoading, closePeriod, closedPeriods = [], smartQuery } = useFinance();

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState(''); // Text search
    const [searchResultAI, setSearchResultAI] = useState(null); // AI results
    const [isThinking, setIsThinking] = useState(false);

    // Date Selection State: Default to current month
    const [dateSelection, setDateSelection] = useState({
        start: startOfMonth(new Date()),
        end: endOfMonth(new Date()),
        mode: 'month'
    });
    const [showCalendar, setShowCalendar] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [showSealInfo, setShowSealInfo] = useState(false);

    const handleAISearch = async (e) => {
        e?.preventDefault();
        if (!searchQuery.trim()) return;
        setIsThinking(true);
        const result = await smartQuery(searchQuery);
        setSearchResultAI(result);
        setIsThinking(false);
    };

    // Filtering Logic
    const filteredData = useMemo(() => {
        return transactions.filter(t => {
            if (!t.date) return false;
            const tDate = parseISO(t.date);

            // 1. Date Filter
            if (dateSelection.start && dateSelection.end) {
                if (!isWithinInterval(tDate, { start: startOfDay(dateSelection.start), end: endOfDay(dateSelection.end) })) {
                    return false;
                }
            }

            // 2. Category Filter
            if (selectedCategory !== 'All') {
                if (t.category !== selectedCategory) return false;
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
    }, [transactions, dateSelection, selectedCategory, searchQuery]);

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
        </div>
    );

    // Check if the currently selected MONTH is closed (only applicable in month mode)
    const activeMonthKey = dateSelection.mode === 'month' ? format(dateSelection.start, 'yyyy-MM') : null;
    const isPeriodClosed = activeMonthKey ? closedPeriods.includes(activeMonthKey) : false;

    // Calculations for Filtered Data
    const expenses = filteredData.filter(t => t.amount < 0 && !t.description?.toLowerCase().includes('cc bill'));
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
            percent: totalExpenses > 0 ? (amount / totalExpenses * 100).toFixed(0) : 0,
            icon: categories.find(c => c.name === name)?.icon || '📦',
        }));

    return (
        <div className="min-h-screen text-text-main selection:bg-primary selection:text-black overflow-x-hidden">
            <motion.main
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative px-4 py-6 md:px-8 md:py-24 max-w-5xl mx-auto pb-32"
            >
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-8 mb-6 md:mb-12">
                    <div>
                        <div className="flex items-center gap-2 mb-3 md:mb-6">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-card border border-card-border overflow-hidden p-0.5">
                                <img src="/mascot.png" alt="Laksh AI" className="w-full h-full object-cover" />
                            </div>
                            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] md:tracking-[0.5em] text-text-muted">Analytics</span>
                        </div>
                        <h1 className="text-lg md:text-xl font-black tracking-[-0.04em] leading-none mb-0.5 transition-all text-text-main uppercase">
                            Insights
                        </h1>
                        <p className="text-[7px] md:text-[8px] font-semibold text-text-muted uppercase tracking-[0.3em] opacity-60">Deep Data Exploration</p>
                    </div>

                    <div className="flex flex-col items-end gap-2 relative">
                        {dateSelection.mode === 'month' && activeMonthKey && (
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
                </header>

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

                    {/* 2. Filters Row (Month & Category) */}
                    <div className="grid grid-cols-2 gap-2 md:gap-4 relative z-40">
                        {/* Month/Calendar Picker */}
                        <div className="relative">
                            <button
                                onClick={() => setShowCalendar(!showCalendar)}
                                className="w-full p-3 md:p-4 rounded-[1.2rem] md:rounded-[1.8rem] bg-canvas-subtle border border-card-border flex items-center gap-2 md:gap-4 hover:bg-canvas-elevated transition-all text-left"
                            >
                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-card flex items-center justify-center text-primary shrink-0">
                                    <Calendar size={14} className="md:w-[18px] md:h-[18px]" />
                                </div>
                                <div className="flex-1 overflow-hidden min-w-0">
                                    <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-text-muted block mb-0.5">Period</span>
                                    <span className="text-xs md:text-lg font-black uppercase text-text-main block truncate">
                                        {dateSelection.mode === 'month'
                                            ? format(dateSelection.start, 'MMM yy')
                                            : `${format(dateSelection.start, 'M/d')} - ${format(dateSelection.end, 'M/d')}`
                                        }
                                    </span>
                                </div>
                            </button>

                            <AnimatePresence>
                                {showCalendar && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowCalendar(false)} />
                                        <GlassCalendar
                                            selection={dateSelection}
                                            onSelect={setDateSelection}
                                            onClose={() => setShowCalendar(false)}
                                        />
                                    </>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Category Selector */}
                        <div className="relative p-3 md:p-4 rounded-[1.2rem] md:rounded-[1.8rem] bg-canvas-subtle border border-card-border flex items-center gap-2 md:gap-4">
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-card flex items-center justify-center text-primary">
                                <Layers size={14} className="md:w-[18px] md:h-[18px]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-text-muted block mb-0.5">Sector</span>
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="bg-transparent border-none p-0 text-xs md:text-lg font-black uppercase text-text-main outline-none w-full appearance-none tracking-tight cursor-pointer"
                                >
                                    <option value="All">All</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.name}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <Filter size={12} className="md:w-4 md:h-4 text-text-muted pointer-events-none shrink-0" />
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
                </div>

                {/* Filtered Results Summary Cards */}
                <div className="grid grid-cols-2 gap-2 mb-6 md:mb-8">
                    <div className="p-4 md:p-6 rounded-[1.2rem] md:rounded-[2rem] bg-emerald-500/[0.03] border border-emerald-500/10 flex flex-col justify-between group min-h-[100px] md:min-h-[140px]">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-2 md:mb-4">
                            <TrendingUp size={14} className="md:w-[18px] md:h-[18px]" />
                        </div>
                        <div>
                            <span className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-emerald-500/60 block mb-0.5">Inflow</span>
                            <h3 className="text-lg md:text-2xl font-black text-emerald-400 tabular-nums tracking-tighter leading-none">{formatCurrency(totalIncome)}</h3>
                        </div>
                    </div>

                    <div className="p-4 md:p-6 rounded-[1.2rem] md:rounded-[2rem] bg-rose-500/[0.03] border border-rose-500/10 flex flex-col justify-between group min-h-[100px] md:min-h-[140px]">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-2 md:mb-4">
                            <TrendingDown size={14} className="md:w-[18px] md:h-[18px]" />
                        </div>
                        <div>
                            <span className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-rose-500/60 block mb-0.5">Outflow</span>
                            <h3 className="text-lg md:text-2xl font-black text-rose-400 tabular-nums tracking-tighter leading-none">{formatCurrency(totalExpenses)}</h3>
                        </div>
                    </div>

                    {/* Total Search Value - Replaces Financial Health */}
                    <div className="col-span-2 p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] bg-card border border-card-border relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 md:p-16 opacity-[0.03] -rotate-12 group-hover:scale-110 transition-transform">
                            <PieChart size={120} className="md:w-[200px] md:h-[200px]" />
                        </div>
                        <div className="relative z-10 flex flex-row items-center justify-between gap-4">
                            <div className="text-left">
                                <h3 className="text-[9px] md:text-sm font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-text-muted mb-1">Search Volume</h3>
                                <p className={`text-3xl md:text-5xl font-black tabular-nums tracking-tighter ${netValue >= 0 ? 'text-primary' : 'text-rose-500'}`}>
                                    {netValue >= 0 ? '+' : ''}{formatCurrency(netValue)}
                                </p>
                            </div>
                            <div className="flex items-center bg-canvas-subtle p-2 md:p-3 rounded-xl md:rounded-2xl border border-card-border">
                                <div className="text-center px-1 md:px-2">
                                    <span className="text-[6px] md:text-[8px] font-black uppercase tracking-widest text-text-muted/60 block">Count</span>
                                    <span className="text-lg md:text-xl font-black text-text-main tabular-nums">{filteredData.length}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Categories List */}
                <div className="mb-10 md:mb-16">
                    <div className="flex justify-between items-end mb-4 md:mb-8 px-2 md:px-4">
                        <div>
                            <h3 className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] md:tracking-[0.4em] text-text-muted mb-1">Breakdown</h3>
                            <p className="text-[10px] md:text-xs font-black uppercase text-primary tracking-widest">By Category</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-3">
                        {sortedCategories.length > 0 ? (
                            sortedCategories.map((cat, idx) => (
                                <motion.div
                                    key={cat.name}
                                    initial={{ x: -10, opacity: 0.5 }}
                                    whileInView={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.02 * idx, duration: 0.2 }}
                                    viewport={{ once: true }}
                                    className="p-3 md:p-4 rounded-[1.2rem] md:rounded-[2rem] bg-card border border-card-border flex items-center justify-between group hover:bg-canvas-elevated hover:border-primary/20 transition-all"
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
                            ))
                        ) : (
                            <div className="col-span-2 py-12 md:py-20 rounded-[2rem] md:rounded-[3rem] bg-card border border-dashed border-card-border text-center">
                                <Info size={24} className="md:w-8 md:h-8 mx-auto text-text-muted/20 mb-3" />
                                <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">No data found for this filter.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Transaction List with Dates */}
                {filteredData.length > 0 && (
                    <div className="mb-10 md:mb-16">
                        <div className="flex justify-between items-end mb-4 md:mb-6 px-2 md:px-4">
                            <div>
                                <h3 className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] md:tracking-[0.4em] text-text-muted mb-1">Transactions</h3>
                                <p className="text-[10px] md:text-xs font-black uppercase text-primary tracking-widest">Detailed View</p>
                            </div>
                            <span className="text-[10px] font-bold text-text-muted bg-canvas-subtle px-3 py-1 rounded-full">{filteredData.length} items</span>
                        </div>

                        <div className="space-y-2">
                            {filteredData.slice(0, 20).map((tx, idx) => {
                                const isExpense = parseFloat(tx.amount) < 0;
                                return (
                                    <motion.div
                                        key={tx.id || idx}
                                        initial={{ x: -20, opacity: 0 }}
                                        whileInView={{ x: 0, opacity: 1 }}
                                        transition={{ delay: 0.02 * idx }}
                                        viewport={{ once: true }}
                                        className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-card border border-card-border flex items-center justify-between gap-3 hover:bg-canvas-elevated hover:border-primary/20 transition-all"
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className={`w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center text-lg shrink-0 ${isExpense ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'
                                                }`}>
                                                {categories.find(c => c.name === tx.category)?.icon || (isExpense ? '💸' : '💰')}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-xs md:text-sm font-bold text-text-main line-clamp-1">{tx.description || 'No description'}</h4>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] md:text-xs font-black text-primary uppercase">{format(new Date(tx.date), 'dd MMM yyyy')}</span>
                                                    <span className="w-1 h-1 rounded-full bg-card-border" />
                                                    <span className="text-[10px] font-bold text-text-muted truncate">{tx.category || 'Other'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <span className={`text-sm md:text-base font-black tabular-nums whitespace-nowrap ${isExpense ? 'text-rose-500' : 'text-emerald-500'}`}>
                                            {isExpense ? '-' : '+'}{formatCurrency(Math.abs(tx.amount))}
                                        </span>
                                    </motion.div>
                                );
                            })}

                            {filteredData.length > 20 && (
                                <div className="text-center py-4">
                                    <p className="text-[10px] font-bold text-text-muted">Showing first 20 of {filteredData.length} transactions</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <p className="text-[9px] font-black uppercase tracking-[0.5em] text-text-muted/20 text-center mt-20">LAKSH ANALYTICS V3.1</p>
            </motion.main>
        </div>
    );
};

export default Insights;
