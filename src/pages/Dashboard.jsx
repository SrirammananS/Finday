import React, { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Users, ArrowRight, TrendingUp, TrendingDown, Lock, Sparkles, BrainCircuit, Zap, BarChart3, ChevronRight, Search, Plus, ArrowLeftRight, Activity } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import TransactionInsights from '../components/TransactionInsights';
import PullToRefresh from '../components/PullToRefresh';
import SkeletonDashboard from '../components/skeletons/SkeletonDashboard';
import TransactionDetectorUI from '../components/TransactionDetectorUI';
import PendingTransactionsFeed from '../components/PendingTransactionsFeed';
import SmartAnalytics from '../components/SmartAnalytics';
import TransactionForm from '../components/TransactionForm';
import { smartAI } from '../services/smartAI';

const Dashboard = () => {
    const {
        accounts = [],
        transactions = [],
        categories = [],
        loading,
        isSyncing,
        forceSync,
        refreshData,
        bills = [],
        friends = [],
        lastSyncTime,
        secretUnlocked,
    } = useFinance();

    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [showTransactionForm, setShowTransactionForm] = useState(false);

    const formatCurrency = (value) => {
        if (typeof value !== 'number') return '₹0.00';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    };

    const visibleTransactions = useMemo(() => transactions.filter(t => !t.hidden), [transactions]);

    const visibleAccounts = useMemo(() => {
        return accounts.filter(a => !a.isSecret || secretUnlocked);
    }, [accounts, secretUnlocked]);

    const hiddenAccountsCount = useMemo(() => {
        return accounts.filter(a => a.isSecret && !secretUnlocked).length;
    }, [accounts, secretUnlocked]);

    const metrics = useMemo(() => {
        const income = visibleTransactions
            .filter(t => t.amount > 0)
            .reduce((sum, t) => sum + t.amount, 0);

        const expense = visibleTransactions
            .filter(t => t.amount < 0)
            .reduce((sum, t) => sum + t.amount, 0);

        const total = visibleAccounts.reduce((sum, acc) => sum + acc.balance, 0);
        const totalAssets = visibleAccounts.filter(a => a.type !== 'credit').reduce((sum, a) => sum + a.balance, 0);
        const totalDebt = visibleAccounts.filter(a => a.type === 'credit').reduce((sum, a) => sum + a.balance, 0);

        const recent = [...visibleTransactions]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);

        const spendingByCategory = visibleTransactions
            .filter(t => t.amount < 0)
            .reduce((acc, t) => {
                const category = t.category || 'Uncategorized';
                if (!acc[category]) {
                    acc[category] = 0;
                }
                acc[category] += Math.abs(t.amount);
                return acc;
            }, {});

        const categoryColors = categories.reduce((acc, cat) => {
            acc[cat.name] = cat.color;
            return acc;
        }, {});

        const chartData = Object.entries(spendingByCategory)
            .map(([name, value]) => ({
                name,
                value,
                color: categoryColors[name] || '#cccccc',
            }))
            .sort((a, b) => b.value - a.value);

        // THE LIFE INDEX (SENSEX STYLE)
        // Back-calculate Net Worth and Flow for each of the last 30 days
        const last30Days = [...Array(30)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (29 - i));
            return d.toISOString().split('T')[0];
        });

        const wealthPulse = [];
        const fluxPulse = [];
        let rollingWealth = total;

        for (let i = 29; i >= 0; i--) {
            const dateIndicator = last30Days[i];

            const dayIncome = visibleTransactions
                .filter(t => t.date.startsWith(dateIndicator) && t.amount > 0)
                .reduce((sum, t) => sum + t.amount, 0);

            const dayExpense = visibleTransactions
                .filter(t => t.date.startsWith(dateIndicator) && t.amount < 0)
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);

            wealthPulse.unshift({
                name: new Date(dateIndicator).toLocaleDateString([], { day: '2-digit', month: 'short' }),
                value: rollingWealth,
                date: dateIndicator
            });

            fluxPulse.unshift({
                name: new Date(dateIndicator).toLocaleDateString([], { day: '2-digit', month: 'short' }),
                income: dayIncome,
                expense: dayExpense,
                date: dateIndicator
            });

            rollingWealth -= (dayIncome - dayExpense);
        }

        const totalOwedToYou = friends.reduce((sum, f) => sum + f.owedToYou, 0);
        const totalYouOwe = friends.reduce((sum, f) => sum + f.youOwe, 0);

        return { income, expense, total, totalAssets, totalDebt, recent, chartData, totalOwedToYou, totalYouOwe, wealthPulse, fluxPulse };
    }, [visibleTransactions, visibleAccounts, categories, friends]);

    const upcomingBills = useMemo(() => {
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);

        return bills.filter(bill => {
            const dueDate = new Date(today.getFullYear(), today.getMonth(), bill.dueDay);
            if (dueDate < today) {
                dueDate.setMonth(dueDate.getMonth() + 1);
            }
            return dueDate >= today && dueDate <= nextWeek;
        }).sort((a, b) => a.dueDay - b.dueDay);
    }, [bills]);

    if (loading) {
        return <SkeletonDashboard />;
    }

    return (
        <PullToRefresh onRefresh={refreshData} disabled={isSyncing}>
            <motion.main
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-4 py-8 md:px-6 md:py-16 max-w-4xl mx-auto min-h-screen pb-40"
            >
                <header className="flex items-center justify-between mb-8">
                    <div className="flex flex-col">
                        <h1 className="text-xl font-black tracking-[-0.04em] leading-none transition-all text-white">
                            LAKSH
                        </h1>
                        <p className="text-[8px] font-semibold text-text-muted uppercase tracking-[0.4em] opacity-60">System Dashboard</p>
                    </div>
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={forceSync}
                        className="w-11 h-11 rounded-2xl bg-canvas-subtle border border-card-border flex items-center justify-center text-text-main hover:border-primary transition-all shadow-lg group relative overflow-hidden"
                    >
                        {isSyncing && <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="absolute inset-0 bg-primary/5" />}
                        <RefreshCw size={20} className={`text-text-muted group-hover:text-primary transition-colors ${isSyncing ? 'animate-spin' : ''}`} />
                    </motion.button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                    <PendingTransactionsFeed />
                    <TransactionDetectorUI />
                </div>

                <div className="grid grid-cols-3 gap-2 mb-6 items-start">
                    <button onClick={() => setShowTransactionForm(true)} className="flex flex-col items-center gap-1.5 group w-full">
                        <div className="w-full aspect-square md:w-16 md:h-16 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center shadow-lg hover:scale-105 transition-transform border border-secondary">
                            <Plus size={20} strokeWidth={2.5} />
                        </div>
                        <span className="text-[8px] font-bold uppercase tracking-widest text-text-muted text-center">NEW</span>
                    </button>
                    <button onClick={() => setIsAIModalOpen(true)} className="flex flex-col items-center gap-1.5 group w-full">
                        <div className="w-full aspect-square md:w-16 md:h-16 rounded-2xl bg-canvas-subtle border border-card-border flex items-center justify-center group-hover:border-primary transition-all group-hover:scale-105">
                            <Search size={20} className="text-primary" />
                        </div>
                        <span className="text-[8px] font-bold uppercase tracking-widest text-text-muted text-center">SCAN</span>
                    </button>
                    <Link to="/accounts" className="flex flex-col items-center gap-1.5 group no-underline w-full">
                        <div className="w-full aspect-square md:w-16 md:h-16 rounded-2xl bg-canvas-subtle border border-card-border flex items-center justify-center group-hover:border-primary transition-all group-hover:scale-105">
                            <ArrowLeftRight size={20} className="text-text-main" />
                        </div>
                        <span className="text-[8px] font-bold uppercase tracking-widest text-text-muted text-center">TRANSFER</span>
                    </Link>
                </div>

                {/* Net Worth Glass Bento */}
                <div className="relative mb-6 group">
                    <div className="absolute -inset-[1px] bg-gradient-to-r from-primary to-purple-600 rounded-[2rem] opacity-10 group-hover:opacity-20 transition duration-500"></div>
                    <div className="relative modern-card p-6 md:p-10 bg-black/80 backdrop-blur-3xl border border-white/10 overflow-hidden rounded-[2rem] shadow-2xl">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] -rotate-12 translate-x-8 translate-y-[-20%] pointer-events-none">
                            <Zap size={300} className="text-primary fill-primary" />
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-6">
                                <Activity size={14} className="text-primary" />
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted">Net Worth</p>
                            </div>
                            <h2 className="text-3xl md:text-4xl font-black tracking-tighter leading-none text-white mb-8 flex flex-wrap items-baseline gap-2 overflow-hidden">
                                {formatCurrency(metrics.total).replace('₹', '')}<span className="text-primary text-xl md:text-2xl">₹</span>
                            </h2>

                            <div className="flex flex-wrap gap-2 mb-8">
                                <div className="bg-white/5 border border-white/10 px-3 py-2.5 rounded-xl backdrop-blur-xl group/asset flex-1">
                                    <p className="text-[7px] font-black text-emerald-400/50 uppercase tracking-[0.2em] mb-0.5">Assets</p>
                                    <p className="text-sm font-black text-white">{formatCurrency(metrics.totalAssets)}</p>
                                </div>
                                <div className="bg-white/5 border border-white/10 px-3 py-2.5 rounded-xl backdrop-blur-xl group/debt flex-1">
                                    <p className="text-[7px] font-black text-rose-400/50 uppercase tracking-[0.2em] mb-0.5">Debt</p>
                                    <p className="text-sm font-black text-white">{formatCurrency(metrics.totalDebt)}</p>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[8px] font-black text-emerald-500/50 uppercase tracking-[0.3em] mb-1">Income</p>
                                    <p className="text-base font-black text-white tabular-nums">{formatCurrency(metrics.income)}</p>
                                </div>
                                <div className="relative">
                                    <p className="text-[8px] font-black text-rose-500/50 uppercase tracking-[0.3em] mb-1">Expense</p>
                                    <p className={`text-base font-black tabular-nums transition-colors ${Math.abs(metrics.expense) > metrics.income ? 'text-rose-400 opacity-90' : 'text-white'}`}>
                                        {formatCurrency(metrics.expense)}
                                    </p>
                                    {Math.abs(metrics.expense) > metrics.income && (
                                        <div className="absolute -top-8 right-0 bg-rose-500/20 text-rose-400 text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-tighter border border-rose-500/30">
                                            High Velocity
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Intelligence Layer */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                    <motion.div
                        whileHover={{ y: -2 }}
                        onClick={() => setIsAIModalOpen(true)}
                        className="modern-card p-6 bg-gradient-to-br from-primary/10 to-transparent border-primary/20 cursor-pointer overflow-hidden relative group"
                    >
                        <div className="absolute -right-8 -bottom-8 opacity-[0.05] group-hover:scale-110 transition-transform">
                            <BrainCircuit size={160} className="text-primary" />
                        </div>
                        <div className="relative z-10 flex flex-col justify-between h-full min-h-[140px]">
                            <div>
                                <h3 className="text-lg font-black text-text-main flex items-center gap-2 mb-1">
                                    LAKSH AI <span className="bg-primary text-white text-[7px] px-1.5 py-0.5 rounded-full font-black">PRO</span>
                                </h3>
                                <p className="text-[11px] text-text-muted font-bold leading-relaxed">AI analysis active on {accounts.length} accounts.</p>
                            </div>
                            <div className="flex gap-2 mt-4">
                                <div className="bg-canvas-subtle/50 backdrop-blur-md p-3 rounded-xl border border-card-border flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Zap size={12} className="text-yellow-500" />
                                        <span className="text-[8px] font-black uppercase text-text-muted">Smart Logic</span>
                                    </div>
                                    <p className="text-[10px] font-black text-text-main truncate">Audit Subscriptions</p>
                                </div>
                                <div className="bg-canvas-subtle/50 backdrop-blur-md p-3 rounded-xl border border-card-border w-16 text-center">
                                    <span className="text-primary font-black text-base truncate">98%</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <Link to="/insights" className="modern-card p-6 border-card-border bg-canvas-subtle/30 overflow-hidden relative hover:bg-canvas-subtle/50 transition-all group">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Capital Signal</h3>
                            <div className="w-8 h-8 rounded-full border border-card-border flex items-center justify-center group-hover:border-primary group-hover:text-primary transition-all">
                                <ChevronRight size={16} />
                            </div>
                        </div>
                        <div className="space-y-5">
                            <div className="flex justify-between items-center border-b border-card-border/50 pb-3">
                                <div>
                                    <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1 opacity-60">Avg Pulse</p>
                                    <p className="text-lg font-black text-text-main">{formatCurrency(metrics.expense / (transactions.length || 1))}</p>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                    <TrendingUp size={20} />
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex -space-x-2">
                                    {categories.slice(0, 3).map((c, i) => (
                                        <div key={i} className="w-8 h-8 rounded-full border-2 border-canvas bg-canvas-subtle flex items-center justify-center text-xs" title={c.name}>
                                            {c.icon}
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[9px] font-black text-text-muted uppercase tracking-widest text-right">Most Active<br /><span className="text-primary">Categories</span></p>
                            </div>
                        </div>
                    </Link>
                </div>

                <SmartAnalytics isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} />

                <section className="mb-8">
                    <div className="flex justify-between items-center mb-4 ml-1">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-muted">My Accounts</h3>
                        <Link to="/accounts" className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">Manage</Link>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <Link to="/friends" className="p-5 modern-card border-card-border hover:border-primary transition-all flex flex-col justify-between group no-underline">
                            <div className="flex justify-between items-start">
                                <div className="w-8 h-8 rounded-lg bg-canvas-subtle flex items-center justify-center text-lg">👥</div>
                                {(metrics.totalOwedToYou - metrics.totalYouOwe) !== 0 && (
                                    <div className={`text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${(metrics.totalOwedToYou - metrics.totalYouOwe) > 0 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                                        {(metrics.totalOwedToYou - metrics.totalYouOwe) > 0 ? 'Owed' : 'Debt'}
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Friends Net</p>
                                <p className={`text-xl font-black truncate ${(metrics.totalOwedToYou - metrics.totalYouOwe) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{formatCurrency(Math.abs(metrics.totalOwedToYou - metrics.totalYouOwe))}</p>
                            </div>
                        </Link>

                        {visibleAccounts.map((acc) => {
                            const accountTransactions = visibleTransactions.filter(t => t.accountId === acc.id);
                            const transactionCount = accountTransactions.length;
                            const icon = acc.type === 'bank' ? '🏦' : acc.type === 'credit' ? '💳' : acc.type === 'cash' ? '💵' : '💰';
                            const isCredit = acc.type === 'credit';
                            const limit = acc.limit || 100000; // Mock limit for design demo
                            const utilization = isCredit ? (Math.abs(acc.balance) / limit) * 100 : 0;

                            return (
                                <Link to={`/accounts/${acc.id}`} key={acc.id} className="p-4 modern-card border-card-border hover:border-primary transition-all flex flex-col justify-between group no-underline min-h-[120px]">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="w-7 h-7 rounded-lg bg-canvas-subtle flex items-center justify-center text-base">{icon}</div>
                                        {isCredit && utilization > 30 && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-bold uppercase tracking-widest text-text-muted mb-0.5 truncate">{acc.name}</p>
                                        <p className="text-lg font-bold text-text-main truncate mb-1.5">{formatCurrency(acc.balance)}</p>

                                        {isCredit && (
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-[6px] font-bold uppercase tracking-[0.1em] text-text-muted">
                                                    <span>Velocity</span>
                                                    <span className={utilization > 70 ? 'text-rose-400' : 'text-primary'}>{utilization.toFixed(0)}%</span>
                                                </div>
                                                <div className="h-0.5 w-full bg-canvas rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${Math.min(utilization, 100)}%` }}
                                                        className={`h-full ${utilization > 70 ? 'bg-rose-500' : utilization > 40 ? 'bg-yellow-500' : 'bg-primary'}`}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            );
                        })}

                        {hiddenAccountsCount > 0 && (
                            <Link to="/accounts" className="p-5 modern-card border-dashed border-2 border-card-border hover:border-primary transition-all flex flex-col items-center justify-center group no-underline text-center">
                                <Lock size={20} className="text-text-muted mb-2" />
                                <p className="text-xs font-bold text-text-main">{hiddenAccountsCount} Secret Account{hiddenAccountsCount > 1 ? 's' : ''}</p>
                                <p className="text-[10px] text-text-muted mt-1">Click to manage</p>
                            </Link>
                        )}
                    </div>
                </section>

                <section className="mb-8">
                    <div className="flex justify-between items-center mb-4 ml-1">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Upcoming Bills (Next 7 Days)</h3>
                        <Link to="/bills" className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">Manage Bills</Link>
                    </div>
                    {
                        upcomingBills.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {upcomingBills.map(bill => {
                                    const diff = Math.abs(bill.dueDay - new Date().getDate());
                                    const isUrgent = diff <= 2;
                                    return (
                                        <div key={bill.id} className={`modern-card p-4 flex justify-between items-center border-l-4 ${isUrgent ? 'border-l-rose-500 bg-rose-500/5' : 'border-l-primary'}`}>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-text-main">{bill.name}</p>
                                                    {isUrgent && <span className="text-[7px] font-black bg-rose-500 text-white px-1.5 py-0.5 rounded-full uppercase">Urgent</span>}
                                                </div>
                                                <p className="text-xs text-text-muted">Due: Day {bill.dueDay}</p>
                                            </div>
                                            <p className="font-bold text-text-main">{formatCurrency(bill.amount)}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="modern-card p-6 text-center">
                                <p className="text-xs font-bold text-text-muted">No upcoming bills for this week. 🎉</p>
                            </div>
                        )
                    }
                </section>

                <section className="mb-10">
                    <div className="flex justify-between items-end mb-4 ml-1">
                        <div className="flex flex-col">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-muted">Cash Flow</h3>
                            <p className="text-[7px] font-semibold text-text-muted/60 uppercase tracking-widest mt-0.5">30 Day Performance Index</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                                <span className="text-[8px] font-bold text-text-muted uppercase">Inflow</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.5)]" />
                                <span className="text-[8px] font-bold text-text-muted uppercase">Outflow</span>
                            </div>
                        </div>
                    </div>
                    <div className="modern-card p-4 overflow-hidden bg-[#050505] border-white/[0.03]">
                        <div className="h-[220px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={metrics.fluxPulse}>
                                    <defs>
                                        <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.02)" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 8, fill: 'var(--text-muted)', fontWeight: 800 }}
                                        interval={6}
                                    />
                                    <YAxis hide domain={['auto', 'auto']} />
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="bg-black border border-white/10 p-4 rounded-3xl backdrop-blur-2xl shadow-3xl">
                                                        <p className="text-[9px] font-black text-text-muted uppercase mb-2 border-b border-white/5 pb-2">{payload[0].payload.name}</p>
                                                        <div className="space-y-2">
                                                            <div className="flex items-center justify-between gap-6">
                                                                <span className="text-[8px] font-black text-emerald-400 uppercase">Inflow</span>
                                                                <span className="text-xs font-black text-white">{formatCurrency(payload[0].payload.income)}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between gap-6">
                                                                <span className="text-[8px] font-black text-rose-400 uppercase">Outflow</span>
                                                                <span className="text-xs font-black text-white">{formatCurrency(payload[0].payload.expense)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="income"
                                        stroke="#10b981"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorIn)"
                                        animationDuration={1500}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="expense"
                                        stroke="#f43f5e"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorOut)"
                                        animationDuration={1500}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-2 gap-4">
                        <div className="modern-card p-5 bg-emerald-500/[0.02] border-emerald-500/10">
                            <h4 className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Growth</h4>
                            <div className="flex items-end justify-between">
                                <span className="text-2xl font-black text-white">
                                    {Math.abs(((metrics.wealthPulse[metrics.wealthPulse.length - 1].value - metrics.wealthPulse[0].value) / (Math.abs(metrics.wealthPulse[0].value) || 1)) * 100).toFixed(1)}%
                                </span>
                                <TrendingUp size={16} className={`mb-1 ${metrics.wealthPulse[metrics.wealthPulse.length - 1].value >= metrics.wealthPulse[0].value ? 'text-emerald-500' : 'text-rose-500'}`} />
                            </div>
                        </div>
                        <div className="modern-card p-5 bg-primary/[0.02] border-primary/10">
                            <h4 className="text-[9px] font-black text-primary uppercase tracking-widest mb-1">Savings Rate</h4>
                            <div className="flex items-end justify-between">
                                <span className="text-2xl font-black text-white">
                                    {metrics.income > 0 ? ((1 - (metrics.expense / metrics.income)) * 100).toFixed(0) : 0}%
                                </span>
                                <Activity size={16} className="text-primary mb-1" />
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mb-10">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Recent Activity</h3>
                        <Link to="/transactions" className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">View All</Link>
                    </div>

                    <div className="space-y-3">
                        {metrics.recent.map((t, idx) => {
                            const cat = categories.find(c => c.name === t.category);
                            return (
                                <motion.div
                                    key={String(t.id)}
                                    initial={{ x: -10, opacity: 0 }}
                                    whileInView={{ x: 0, opacity: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.04 * idx }}
                                    className="modern-card p-4 flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-canvas-subtle flex-shrink-0 flex items-center justify-center text-xl border border-card-border">
                                            {cat?.icon || '📦'}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-text-main truncate">{t.description}</p>
                                            <p className="text-[10px] font-bold uppercase text-text-muted truncate mt-0.5">{t.category}</p>
                                        </div>
                                    </div>
                                    <div className="text-right ml-4">
                                        <p className={`text-base font-black ${t.amount > 0 ? 'text-emerald-500' : 'text-text-main'}`}>
                                            {t.amount > 0 ? '+' : ''}{formatCurrency(t.amount)}
                                        </p>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </section>
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