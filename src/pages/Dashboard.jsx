import React, { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, RefreshCw, Layers, Users, PieChart as PieIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount || 0);
};

const Dashboard = () => {
    const { transactions, accounts, categories, isSyncing, refreshData } = useFinance();

    const metrics = useMemo(() => {
        const total = accounts.reduce((s, a) => s + (parseFloat(a.balance) || 0), 0);
        const thisMonth = transactions.filter(t => t.date && new Date(t.date).getMonth() === new Date().getMonth());
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

        // Friend Balances
        const friendBalances = transactions.reduce((acc, t) => {
            if (!t.friend) return acc;
            const f = t.friend.trim();
            const impact = t.type === 'expense' ? Math.abs(t.amount) : -Math.abs(t.amount);
            acc[f] = (acc[f] || 0) + impact;
            return acc;
        }, {});

        const totalOwedToYou = Object.values(friendBalances).filter(b => b > 0).reduce((s, b) => s + b, 0);
        const totalYouOwe = Object.values(friendBalances).filter(b => b < 0).reduce((s, b) => s + Math.abs(b), 0);

        return { total, income, expense, recent: transactions.slice(0, 5), chartData, totalOwedToYou, totalYouOwe };
    }, [transactions, accounts, categories]);

    return (
        <motion.main
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 py-8 md:px-6 md:py-16 max-w-4xl mx-auto min-h-screen pb-40"
        >
            <header className="flex justify-between items-end mb-8 md:mb-12">
                <div>
                    <h2 className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Financial Overview</h2>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none text-text-main">Finday<span className="text-primary">.</span></h1>
                </div>
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={refreshData}
                    className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-canvas-subtle border border-card-border flex items-center justify-center text-text-main hover:border-primary transition-all group"
                    title="Refresh Data"
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
            <section className="mb-10">
                <div className="flex justify-between items-center mb-4 ml-1">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-muted">My Accounts</h3>
                    <Link to="/accounts" className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">Manage</Link>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                    {/* Friends Net Balance Card */}
                    {(metrics.totalOwedToYou > 0 || metrics.totalYouOwe > 0) && (
                        <motion.div
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="flex-shrink-0 w-48 p-5 modern-card border-card-border hover:border-primary transition-all cursor-pointer group"
                        >
                            <Link to="/friends" className="block h-full">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3 text-lg text-primary">
                                    <Users size={16} />
                                </div>
                                <p className="text-xs font-bold text-text-muted uppercase truncate mb-1">Friends Net</p>
                                <p className={`text-xl font-black truncate ${metrics.totalOwedToYou >= metrics.totalYouOwe ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {metrics.totalOwedToYou >= metrics.totalYouOwe
                                        ? `+${formatCurrency(metrics.totalOwedToYou - metrics.totalYouOwe)}`
                                        : `-${formatCurrency(metrics.totalYouOwe - metrics.totalOwedToYou)}`
                                    }
                                </p>
                            </Link>
                        </motion.div>
                    )}

                    {accounts.map((acc, idx) => (
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
                    <Link to="/accounts" className="flex-shrink-0 w-16 flex items-center justify-center rounded-2xl border border-dashed border-card-border text-text-muted hover:text-primary hover:border-primary transition-all">
                        <Layers size={20} />
                    </Link>
                </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                {/* Spending Chart */}
                <div className="modern-card p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Monthly Spend</h3>
                        <PieIcon size={16} className="text-text-muted" />
                    </div>
                    <div className="h-[200px] w-full relative">
                        {metrics.chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={metrics.chartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
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
                            <span className="text-2xl font-black text-text-main">{metrics.chartData.length}</span>
                            <span className="text-[8px] font-bold uppercase tracking-widest text-text-muted">Cats</span>
                        </div>
                    </div>
                </div>

                {/* Friends Summary */}
                <div className="modern-card p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Friends Activity</h3>
                            <Users size={16} className="text-text-muted" />
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-text-muted">Owes You</span>
                                <span className="text-lg font-black text-emerald-500">{formatCurrency(metrics.totalOwedToYou)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-4 border-t border-card-border">
                                <span className="text-xs font-bold text-text-muted">You Owe</span>
                                <span className="text-lg font-black text-rose-500">{formatCurrency(metrics.totalYouOwe)}</span>
                            </div>
                        </div>
                    </div>
                    <Link to="/friends" className="mt-6 w-full py-3 rounded-xl bg-canvas-subtle text-xs font-bold uppercase tracking-wider text-text-main text-center hover:bg-primary hover:text-primary-foreground transition-all">
                        View Details
                    </Link>
                </div>
            </div>

            {/* Recent Activity */}
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
    );
};

export default Dashboard;
