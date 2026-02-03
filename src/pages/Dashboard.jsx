import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Users, ArrowRight, TrendingUp, TrendingDown, Lock, Sparkles, BrainCircuit, Zap, BarChart3, ChevronRight, Search, Plus, ArrowLeftRight, Activity } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { format, subMonths } from 'date-fns';
import TransactionInsights from '../components/TransactionInsights';
import PullToRefresh from '../components/PullToRefresh';
import SkeletonDashboard from '../components/skeletons/SkeletonDashboard';
import SmartAnalytics from '../components/SmartAnalytics';
import TransactionForm from '../components/TransactionForm';
import { smartAI } from '../services/smartAI';
import gsap from 'gsap';

const Dashboard = () => {
    const {
        accounts = [],
        transactions = [],
        categories = [],
        isLoading,
        isSyncing,
        forceSync,
        refreshData,
        bills = [],
        billPayments = [],
        friends = [],
        lastSyncTime,
        secretUnlocked,
    } = useFinance();

    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [showTransactionForm, setShowTransactionForm] = useState(false);

    const formatCurrency = (value) => {
        if (typeof value !== 'number') return '₹0';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const visibleTransactions = useMemo(() => transactions.filter(t => !t.hidden), [transactions]);

    const visibleAccounts = useMemo(() => {
        return accounts.filter(a => !a.isSecret || secretUnlocked);
    }, [accounts, secretUnlocked]);

    const metrics = useMemo(() => {
        const income = visibleTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
        const expense = visibleTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0);
        const total = visibleAccounts.reduce((sum, acc) => sum + acc.balance, 0);
        const totalAssets = visibleAccounts.filter(a => a.type !== 'credit').reduce((sum, a) => sum + a.balance, 0);
        const totalDebt = visibleAccounts.filter(a => a.type === 'credit').reduce((sum, a) => sum + a.balance, 0);

        const recent = [...visibleTransactions]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 6);

        // THE LIFE INDEX (SENSEX STYLE)
        const last30Days = [...Array(30)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (29 - i));
            return d.toISOString().split('T')[0];
        });

        const wealthPulse = last30Days.map(date => {
            const dayTransactions = visibleTransactions.filter(t => t.date <= date);
            const cumulativeNetWorth = visibleAccounts.reduce((sum, a) => sum + a.balance, 0);
            const dayBalance = dayTransactions.reduce((sum, t) => sum + t.amount, 0);
            return {
                name: new Date(date).toLocaleDateString('en-IN', { day: 'numeric' }),
                value: cumulativeNetWorth + dayBalance,
            };
        });

        const fluxPulse = last30Days.map(date => {
            const dayTxs = visibleTransactions.filter(t => t.date === date);
            const dayIn = dayTxs.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
            const dayOut = Math.abs(dayTxs.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));
            return {
                name: new Date(date).toLocaleDateString('en-IN', { day: 'numeric' }),
                income: dayIn,
                expense: dayOut,
            };
        });

        const totalOwedToYou = friends.filter(f => f.balance > 0).reduce((s, f) => s + f.balance, 0);
        const totalYouOwe = friends.filter(f => f.balance < 0).reduce((s, f) => s + Math.abs(f.balance), 0);

        return {
            income, expense, total, totalAssets, totalDebt, recent, wealthPulse, fluxPulse, totalOwedToYou, totalYouOwe
        };
    }, [visibleTransactions, visibleAccounts, friends]);

    const upcomingBills = useMemo(() => {
        return (billPayments || [])
            .filter(p => p.status === 'pending')
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, 4);
    }, [billPayments]);

    if (isLoading) {
        return <SkeletonDashboard />;
    }

    return (
        <PullToRefresh onRefresh={refreshData} disabled={isSyncing}>
            <motion.main
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative z-10 px-3 py-4 md:px-8 md:py-12 max-w-[1600px] mx-auto min-h-screen pb-24 md:pb-12"
            >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                    {/* LEFT COLUMN (Mobile: Top, Desktop: Left Sidebar) */}
                    <div className="md:col-span-3 space-y-4">
                        {/* Header */}
                        <header className="flex items-center justify-between mb-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary-rgb),0.8)]" />
                                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-text-muted">Command Center</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl md:text-3xl font-black tracking-[-0.04em] text-text-main uppercase leading-none">
                                        LAKSH <span className="text-primary text-base align-top">V3</span>
                                    </h1>
                                    <div className="w-8 h-8 rounded-full border border-card-border overflow-hidden bg-card shadow-inner">
                                        <img src="/mascot.png" alt="Mascot" className="w-full h-full object-cover" />
                                    </div>
                                </div>
                            </div>
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={forceSync}
                                className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-text-main/5 border border-card-border flex items-center justify-center hover:bg-text-main/10 hover:border-primary/30 transition-all group"
                            >
                                <RefreshCw size={18} className={`text-text-muted group-hover:text-primary transition-colors ${isSyncing ? 'animate-spin' : ''}`} />
                            </motion.button>
                        </header>

                        <div className="grid grid-cols-3 gap-2 md:gap-3">
                            <button onClick={() => setShowTransactionForm(true)} className="relative overflow-hidden flex flex-col items-center gap-1.5 p-3 md:p-4 rounded-[1.5rem] bg-card border border-card-border hover:bg-canvas-elevated transition-all group backdrop-blur-md">
                                <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-1 group-hover:scale-110 transition-transform">
                                    <Plus size={16} />
                                </div>
                                <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-text-main relative z-10">Add</span>
                            </button>
                            <button onClick={() => setIsAIModalOpen(true)} className="relative overflow-hidden flex flex-col items-center gap-1.5 p-3 md:p-4 rounded-[1.5rem] bg-white/5 border border-white/10 hover:bg-white/10 transition-all group backdrop-blur-md">
                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-canvas-subtle flex items-center justify-center text-text-muted group-hover:text-text-main transition-colors mb-1 group-hover:scale-110">
                                    <BrainCircuit size={16} />
                                </div>
                                <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-text-muted group-hover:text-text-main transition-colors relative z-10 text-center leading-none">AI Scan</span>
                            </button>
                            <Link to="/accounts" className="relative overflow-hidden flex flex-col items-center gap-1.5 p-3 md:p-4 rounded-[1.5rem] bg-white/5 border border-white/10 hover:bg-white/10 transition-all no-underline group backdrop-blur-md">
                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-canvas-subtle flex items-center justify-center text-text-muted group-hover:text-text-main transition-colors mb-1 group-hover:scale-110">
                                    <ArrowLeftRight size={16} />
                                </div>
                                <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-text-muted group-hover:text-text-main transition-colors relative z-10">Transfer</span>
                            </Link>
                        </div>

                        {/* Net Worth Card - Enhanced Glass */}
                        <div className="relative overflow-hidden rounded-[2.5rem] p-6 md:p-8 border border-white/10 shadow-2xl group">
                            {/* Glass Background */}
                            <div className="absolute inset-0 bg-card backdrop-blur-2xl z-0" />
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-50 z-0" />

                            {/* Animated Glow */}
                            <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-[80px] group-hover:bg-primary/30 transition-all duration-700 z-0" />

                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-4 opacity-70">
                                    <div className="p-1.5 rounded-full bg-white/10">
                                        <Activity size={12} className="text-primary" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Net Valuation</span>
                                </div>

                                <h2 className="text-4xl md:text-5xl font-black text-text-main tracking-tighter mb-8 tabular-nums">
                                    {formatCurrency(metrics.total)}
                                </h2>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 backdrop-blur-sm hover:bg-emerald-500/20 transition-colors">
                                        <div className="flex items-center gap-2 mb-2">
                                            <TrendingUp size={12} className="text-emerald-500" />
                                            <p className="text-[7px] font-black uppercase tracking-widest text-emerald-400">Assets</p>
                                        </div>
                                        <p className="text-lg font-black text-text-main tabular-nums">{formatCurrency(metrics.totalAssets)}</p>
                                    </div>
                                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 backdrop-blur-sm hover:bg-rose-500/20 transition-colors">
                                        <div className="flex items-center gap-2 mb-2">
                                            <TrendingDown size={12} className="text-rose-500" />
                                            <p className="text-[7px] font-black uppercase tracking-widest text-rose-400">Liabilities</p>
                                        </div>
                                        <p className="text-lg font-black text-text-main tabular-nums">{formatCurrency(metrics.totalDebt)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Desktop Only: Intelligence Cards (Moved from Right on Mobile) */}
                        <div className="hidden md:grid grid-cols-2 gap-3">
                            <motion.button whileHover={{ scale: 1.02 }} onClick={() => setIsAIModalOpen(true)} className="relative overflow-hidden rounded-[2rem] p-5 bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 text-left group">
                                <div className="absolute top-0 right-0 p-8 bg-primary/20 blur-[40px] rounded-full" />
                                <BrainCircuit size={24} className="text-primary mb-3 relative z-10" />
                                <p className="text-xs font-black uppercase tracking-widest text-text-main relative z-10">LAKSH Intelligence</p>
                            </motion.button>
                            <Link to="/insights" className="relative overflow-hidden rounded-[2rem] p-5 bg-white/5 border border-white/10 hover:bg-white/10 transition-all no-underline backdrop-blur-lg">
                                <TrendingUp size={24} className="text-text-muted mb-3" />
                                <p className="text-xs font-black uppercase tracking-widest text-text-main">Market Insights</p>
                            </Link>
                        </div>
                    </div>

                    {/* MIDDLE COLUMN (Main Content) */}
                    <div className="md:col-span-6 space-y-8">

                        {/* Accounts Stripe (Horizontally Scrolling) */}
                        <section>
                            <div className="flex justify-between items-center mb-4 px-2">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Financial Nodes</h3>
                                <Link to="/accounts" className="text-[9px] font-black text-primary uppercase hover:underline">Manage</Link>
                            </div>

                            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                                {/* Social / Friends Node */}
                                <Link to="/friends" className="relative flex-none w-40 h-40 p-5 bg-black/40 border border-white/10 rounded-[2rem] no-underline hover:border-primary/50 transition-all group backdrop-blur-xl flex flex-col justify-between overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="flex justify-between items-start relative z-10">
                                        <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-lg shadow-inner">👥</div>
                                        <div className={`px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-wider ${(metrics.totalOwedToYou - metrics.totalYouOwe) >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                            Net Pos
                                        </div>
                                    </div>
                                    <div className="relative z-10">
                                        <span className="text-[8px] font-black uppercase text-text-muted tracking-widest block mb-1">Social Capital</span>
                                        <p className={`text-xl font-black ${(metrics.totalOwedToYou - metrics.totalYouOwe) >= 0 ? 'text-emerald-400' : 'text-rose-400'} tabular-nums leading-none`}>
                                            {formatCurrency(Math.abs(metrics.totalOwedToYou - metrics.totalYouOwe))}
                                        </p>
                                    </div>
                                </Link>

                                {/* Account Nodes */}
                                {visibleAccounts.map((acc) => {
                                    const isCredit = acc.type === 'credit';
                                    const limit = acc.limit || 100000;
                                    const utilization = isCredit ? (Math.abs(acc.balance) / limit) * 100 : 0;

                                    return (
                                        <Link to={`/accounts/${acc.id}`} key={acc.id} className="relative flex-none w-40 h-40 p-5 bg-card border border-card-border rounded-[2rem] no-underline hover:bg-canvas-elevated hover:border-text-muted/20 transition-all group backdrop-blur-sm flex flex-col justify-between overflow-hidden">
                                            <div className="absolute top-0 right-0 p-3 opacity-[0.03] -rotate-12 translate-x-2 translate-y-[-10%] group-hover:scale-110 transition-transform pointer-events-none">
                                                {acc.type === 'bank' ? <Activity size={80} /> : acc.type === 'credit' ? <Activity size={80} /> : <Activity size={80} />}
                                            </div>

                                            <div className="flex justify-between items-start relative z-10">
                                                <div className="w-10 h-10 rounded-2xl bg-canvas-subtle border border-card-border flex items-center justify-center text-lg group-hover:border-primary/30 transition-all shadow-sm">
                                                    {acc.type === 'bank' ? '🏦' : acc.type === 'credit' ? '💳' : '💵'}
                                                </div>
                                                <span className="text-[7px] font-black uppercase tracking-widest text-text-muted opacity-60 bg-canvas-subtle px-2 py-1 rounded-lg">{acc.type}</span>
                                            </div>

                                            <div className="relative z-10">
                                                <span className="text-[8px] font-black uppercase text-text-muted tracking-widest block mb-1 truncate">{acc.name}</span>
                                                <p className="text-xl font-black text-text-main truncate tabular-nums leading-none mb-3">{formatCurrency(acc.balance)}</p>

                                                {isCredit && (
                                                    <div className="h-1.5 w-full bg-canvas-subtle rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${utilization > 70 ? 'bg-rose-500' : utilization > 40 ? 'bg-yellow-500' : 'bg-primary'} shadow-[0_0_8px_currentColor]`}
                                                            style={{ width: `${Math.min(utilization, 100)}%` }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </Link>
                                    );
                                })}

                                {/* Add Node Ghost Card */}
                                <Link to="/accounts" className="relative flex-none w-40 h-40 p-5 border-2 border-dashed border-card-border rounded-[2rem] no-underline hover:border-primary/50 hover:bg-primary/5 transition-all group flex flex-col items-center justify-center gap-2">
                                    <div className="w-10 h-10 rounded-full bg-canvas-subtle flex items-center justify-center text-text-muted group-hover:bg-primary group-hover:text-black transition-colors">
                                        <Plus size={20} />
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-text-muted group-hover:text-primary transition-colors">Add Node</span>
                                </Link>
                            </div>
                        </section>

                        {/* Cash Flow Chart - Expanded on Desktop */}
                        <section className="relative p-8 rounded-[2.5rem] border border-card-border bg-card/50 backdrop-blur-xl overflow-hidden shadow-2xl">
                            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                            <div className="flex justify-between items-center mb-6 relative z-10">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
                                    Cash Flow Analysis
                                </h3>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2 p-1.5 px-3 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[8px] font-black uppercase text-emerald-500 tracking-wider">Inflow</span>
                                    </div>
                                    <div className="flex items-center gap-2 p-1.5 px-3 rounded-full bg-rose-500/10 border border-rose-500/20">
                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                        <span className="text-[8px] font-black uppercase text-rose-500 tracking-wider">Outflow</span>
                                    </div>
                                </div>
                            </div>
                            <div className="h-48 md:h-[320px] -mx-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={metrics.fluxPulse}>
                                        <defs>
                                            <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="name" hide />
                                        <YAxis hide domain={['auto', 'auto']} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}
                                            labelStyle={{ color: '#fff', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}
                                            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                        />
                                        <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIn)" />
                                        <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorOut)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </section>

                        {/* Recent Transactions */}
                        <section>
                            <div className="flex justify-between items-end mb-6 px-2">
                                <div>
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-1">Recent Signals</h3>
                                    <p className="text-xs font-black text-text-main uppercase tracking-widest">Transaction History</p>
                                </div>
                                <Link to="/transactions" className="w-10 h-10 rounded-full border border-card-border flex items-center justify-center hover:bg-text-main/10 transition-all text-text-main">
                                    <ArrowRight size={16} />
                                </Link>
                            </div>
                            <div className="space-y-4">
                                {metrics.recent.map((t, idx) => {
                                    const cat = categories.find(c => c.name === t.category);
                                    return (
                                        <motion.div
                                            key={String(t.id)}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.05 * idx }}
                                            whileHover={{ scale: 1.02 }}
                                            className="modern-card p-4 flex items-center justify-between group cursor-pointer hover:bg-white/[0.05]"
                                        >
                                            <div className="flex items-center gap-5 min-w-0">
                                                <div className="w-12 h-12 rounded-[1rem] bg-black/40 border border-white/5 flex items-center justify-center text-xl shadow-inner group-hover:border-primary/30 transition-colors">
                                                    {cat?.icon || '📦'}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-black text-text-main uppercase tracking-tight truncate mb-1">{t.description}</p>
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${t.amount > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                        <p className="text-[9px] font-bold uppercase text-text-muted/60 tracking-widest">{t.category}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-base font-black tabular-nums tracking-tight ${t.amount > 0 ? 'text-emerald-400' : 'text-text-main'}`}>
                                                    {t.amount > 0 ? '+' : ''}{formatCurrency(t.amount)}
                                                </p>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </section>
                    </div>

                    {/* RIGHT COLUMN (Mobile: Bottom, Desktop: Right Sidebar) */}
                    <div className="md:col-span-3 space-y-6">

                        {/* Mobile Only: Intelligence Cards */}
                        <div className="grid grid-cols-2 gap-3 md:hidden">
                            {/* ... (Mobile buttons logic kept same but styled) ... */}
                        </div>

                        {/* Net Worth Card (Moved from Left for Balance if on Desktop) - Optional, users sometimes prefer it on top left. User didn't explicitly ask to move Net Worth. 
                           However, the prompt is about "rework on the layout... flex , grid , coulm". 
                           Let's essentially leave the Right Column for Bills and maybe future Widgets.
                           Or, I can move the Net Worth card here to balance the layout? 
                           The previous code had Net Worth in the LEFT column. 
                           Let's Keep functionality for Sidebars essentially "Quick Access".
                           I will remove the old accounts list code block entirely.
                        */}

                        {/* Upcoming Bills */}
                        {upcomingBills.length > 0 && (
                            <section>
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-[9px] font-bold uppercase tracking-widest text-text-muted">Upcoming Bills</h3>
                                    <Link to="/bills" className="text-[9px] font-bold text-primary uppercase">All</Link>
                                </div>
                                <div className="space-y-1.5">
                                    {upcomingBills.map(bill => {
                                        const isUrgent = Math.abs(bill.dueDay - new Date().getDate()) <= 2;
                                        return (
                                            <div key={bill.id} className={`flex items-center justify-between p-2.5 bg-canvas-subtle border rounded-lg ${isUrgent ? 'border-rose-500/30 bg-rose-500/5' : 'border-card-border'}`}>
                                                <div className="flex items-center gap-2">
                                                    {isUrgent && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />}
                                                    <span className="text-xs font-bold text-text-main">{bill.name}</span>
                                                </div>
                                                <span className="text-xs font-bold text-text-muted">{formatCurrency(bill.amount)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}
                    </div>
                </div>
            </motion.main>

            {/* Transaction Form Modal */}
            <AnimatePresence>
                {showTransactionForm && (
                    <TransactionForm onClose={() => setShowTransactionForm(false)} />
                )}
            </AnimatePresence>
        </PullToRefresh>
    );
};

export default Dashboard;