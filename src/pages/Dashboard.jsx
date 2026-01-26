import React, { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, RefreshCw, Layers, Users, PieChart as PieIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

import PullToRefresh from '../components/PullToRefresh';
import SkeletonDashboard from '../components/skeletons/SkeletonDashboard';

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount || 0);
};

const Dashboard = () => {
    const { accounts = [], transactions = [], bills = [], categories, isSyncing, isLoading, refreshData, forceSync, secretUnlocked } = useFinance();
    const navigate = useNavigate();

    // Show Skeleton while loading initial data
    if (isLoading) {
        return <SkeletonDashboard />;
    }

    // Get IDs of secret accounts (for filtering transactions)
    const secretAccountIds = useMemo(() => {
        return accounts.filter(a => a.isSecret && !secretUnlocked).map(a => a.id);
    }, [accounts, secretUnlocked]);

    // Filter visible accounts (exclude locked secret accounts)
    const visibleAccounts = useMemo(() => {
        return accounts.filter(a => !a.isSecret || secretUnlocked);
    }, [accounts, secretUnlocked]);

    // Filter visible transactions (exclude transactions from secret accounts)
    const visibleTransactions = useMemo(() => {
        return transactions.filter(t => !secretAccountIds.includes(t.accountId));
    }, [transactions, secretAccountIds]);

    // Calculate Financial Health Metrics
    const metrics = useMemo(() => {
        const total = visibleAccounts.reduce((s, a) => s + (parseFloat(a.balance) || 0), 0);
        const thisMonth = visibleTransactions.filter(t => t.date && new Date(t.date).getMonth() === new Date().getMonth());
        const income = thisMonth.filter(t => t.amount > 0).reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
        const expense = thisMonth.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(parseFloat(t.amount) || 0), 0);

        // Category Breakdown for Pie Chart
        const catBreakdown = thisMonth.filter(t => t.amount < 0).reduce((acc, t) => {
            const cat = t.category || 'Other';
            acc[cat] = (acc[cat] || 0) + Math.abs(t.amount);
            return acc;
        }, {});

        const chartData = Object.entries(catBreakdown).map(([name, value]) => ({
            name, value, color: categories.find(c => c.name === name)?.color || '#8884d8'
        })).sort((a, b) => b.value - a.value);

        // Friend Balances (use visible transactions only)
        const friendBalances = visibleTransactions.reduce((acc, t) => {
            if (!t.friend) return acc;
            const f = t.friend.trim();
            const impact = t.type === 'expense' ? Math.abs(t.amount) : -Math.abs(t.amount);
            acc[f] = (acc[f] || 0) + impact;
            return acc;
        }, {});

        const totalOwedToYou = Object.values(friendBalances).filter(b => b > 0).reduce((s, b) => s + b, 0);
        const totalYouOwe = Object.values(friendBalances).filter(b => b < 0).reduce((s, b) => s + Math.abs(b), 0);

        return { total, income, expense, recent: visibleTransactions.slice(0, 5), chartData, totalOwedToYou, totalYouOwe };
    }, [visibleTransactions, visibleAccounts, categories]);

    const upcomingBills = useMemo(() => {
        if (!bills || bills.length === 0) return [];
        return bills.filter(b => {
            // Simple upcoming logic: due day is close to today
            const today = new Date().getDate();
            const dueDay = parseInt(b.dueDay);
            return dueDay >= today && dueDay <= today + 7;
        });
    }, [bills]);

    return (
        <PullToRefresh onRefresh={refreshData} disabled={isSyncing}>
            <motion.main
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-4 py-8 md:px-6 md:py-16 max-w-4xl mx-auto min-h-screen pb-40"
            >
                <header className="flex justify-between items-end mb-8 md:mb-12">
                    <div>
                        <h2 className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Financial Overview</h2>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none text-text-main">LAKSH<span className="text-primary">.</span></h1>
                    </div>
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={forceSync}
                        className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-canvas-subtle border border-card-border flex items-center justify-center text-text-main hover:border-primary transition-all group"
                        title="Force Sync"
                    >
                        <RefreshCw size={20} className={`text-text-muted group-hover:text-primary transition-colors ${isSyncing ? 'animate-spin' : ''}`} />
                    </motion.button>
                </header>

                {/* Main Balance */}
                <div className="modern-card p-7 md:p-8 mb-8 md:mb-10">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">Total Net Worth</p>
                    <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-none text-text-main break-all">
                        {formatCurrency(metrics.total)}
                    </h2>
                    <div className="mt-8 flex gap-8 border-t border-card-border pt-6">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <TrendingUp size={14} className="text-emerald-500" />
                                <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Inflow</p>
                            </div>
                            <p className="text-lg md:text-2xl font-black text-text-main">{formatCurrency(metrics.income)}</p>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <TrendingDown size={14} className="text-rose-500" />
                                <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Outflow</p>
                            </div>
                            <p className="text-lg md:text-2xl font-black text-text-main">{formatCurrency(metrics.expense)}</p>
                        </div>
                    </div>
                </div>

                {/* Accounts Ribbon */}
                <section className="mb-8">
                    <div className="flex justify-between items-center mb-4 ml-1">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-muted">My Accounts</h3>
                        <Link to="/accounts" className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">Manage</Link>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                        {/* Friends Net Chip */}
                        <Link to="/friends" className="flex-shrink-0 w-48 p-5 modern-card border-card-border hover:border-primary transition-all flex flex-col justify-between group no-underline">
                            <div className="flex justify-between items-start">
                                <div className="w-8 h-8 rounded-lg bg-canvas-subtle flex items-center justify-center text-lg">
                                    👥
                                </div>
                                {(metrics.totalOwedToYou - metrics.totalYouOwe) !== 0 && (
                                    <div className={`text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${(metrics.totalOwedToYou - metrics.totalYouOwe) > 0
                                        ? 'bg-emerald-500/20 text-emerald-500'
                                        : 'bg-red-500/20 text-red-500'
                                        }`}>
                                        {(metrics.totalOwedToYou - metrics.totalYouOwe) > 0 ? 'Owed' : 'Debt'}
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Friends Net</p>
                                <p className={`text-xl font-black truncate ${(metrics.totalOwedToYou - metrics.totalYouOwe) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {formatCurrency(Math.abs(metrics.totalOwedToYou - metrics.totalYouOwe))}
                                </p>
                            </div>
                        </Link>

                        {visibleAccounts.map((acc, idx) => (
                            <motion.div
                                key={acc.id}
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                className="flex-shrink-0 w-48 p-5 modern-card border-card-border hover:border-text-muted/30 transition-all"
                            >
                                <div className="w-8 h-8 rounded-lg bg-canvas-subtle flex items-center justify-center mb-3 text-lg">
                                    {acc.type === 'bank' ? '🏦' : acc.type === 'credit' ? '💳' : '💵'}
                                </div>
                                <p className="text-xs font-bold text-text-muted uppercase truncate mb-1">{acc.name}</p>
                                <p className="text-xl font-black text-text-main truncate">{formatCurrency(acc.balance)}</p>
                            </motion.div>
                        ))}
                    </div>

                </section>
                {/* Upcoming Bills Section - New */}
                < section className="mb-8" >
                    <div className="flex justify-between items-center mb-4 ml-1">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Upcoming Bills (Next 7 Days)</h3>
                        <Link to="/bills" className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">Manage Bills</Link>
                    </div>
                    {
                        upcomingBills.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {upcomingBills.map(bill => (
                                    <div key={bill.id} className="modern-card p-4 flex justify-between items-center border-l-4 border-l-primary">
                                        <div>
                                            <p className="font-bold text-text-main">{bill.name}</p>
                                            <p className="text-xs text-text-muted">Due: Day {bill.dueDay}</p>
                                        </div>
                                        <p className="font-bold text-text-main">{formatCurrency(bill.amount)}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="modern-card p-6 text-center">
                                <p className="text-xs font-bold text-text-muted">No upcoming bills for this week. 🎉</p>
                            </div>
                        )
                    }
                </section >

                {/* Spending Chart */}
                < section className="mb-8" >
                    <div className="flex justify-between items-center mb-4 ml-1">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Monthly Spending</h3>
                    </div>
                    <div className="modern-card p-6">
                        <div className="h-[250px] w-full relative">
                            {metrics.chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={metrics.chartData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {metrics.chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value) => formatCurrency(value)}
                                            contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border-card)', color: 'var(--text-main)', fontSize: '12px', fontWeight: 'bold' }}
                                            itemStyle={{ color: 'var(--text-main)' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-text-muted/50">
                                    No Data
                                </div>
                            )}
                            {/* Center Text */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-3xl font-black text-text-main">{metrics.chartData.length}</span>
                                <span className="text-[8px] font-bold uppercase tracking-widest text-text-muted">Categories</span>
                            </div>
                        </div>
                        {/* Legend */}
                        <div className="flex flex-wrap gap-3 justify-center mt-6">
                            {metrics.chartData.slice(0, 5).map(d => (
                                <div key={d.name} className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                                    <span className="text-[10px] font-bold text-text-muted uppercase">{d.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section >

                {/* Recent Activity */}
                < section className="mb-10" >
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
                </section >
            </motion.main >
        </PullToRefresh>
    );
};

export default Dashboard;
