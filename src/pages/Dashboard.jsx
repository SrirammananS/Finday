import React, { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

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
        return { total, income, expense, recent: transactions.slice(0, 5) };
    }, [transactions, accounts]);

    return (
        <motion.main
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 py-8 md:px-6 md:py-16 max-w-4xl mx-auto min-h-screen pb-40"
        >
            {/* Compact Header */}
            <header className="flex justify-between items-center mb-8 md:mb-12">
                <div>
                    <h2 className="text-[9px] font-black uppercase tracking-[0.4em] text-toxic-lime mb-1">Status_Live</h2>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none text-white">Finday<span className="text-toxic-lime">.</span></h1>
                </div>
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={refreshData}
                    className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-toxic-lime/10 border border-toxic-lime/20 flex items-center justify-center text-lg group"
                >
                    <span className={`${isSyncing ? 'animate-spin' : ''}`}>
                        {isSyncing ? '🌀' : '⚡'}
                    </span>
                </motion.button>
            </header>

            {/* Compact Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 md:mb-12">
                <motion.div
                    className="genz-card md:col-span-3 p-7 md:p-8 flex flex-col justify-end min-h-[220px] md:min-h-[300px] group"
                >
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50 mb-2">Net_Authority</p>
                    <h2 className="text-4xl md:text-7xl font-black tracking-tighter leading-none text-white break-all">
                        {formatCurrency(metrics.total)}
                    </h2>

                    <div className="mt-6 md:mt-8 flex gap-6 border-t border-white/10 pt-6">
                        <div>
                            <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Inflow</p>
                            <p className="text-lg md:text-2xl font-black text-toxic-lime">{formatCurrency(metrics.income)}</p>
                        </div>
                        <div>
                            <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Outflow</p>
                            <p className="text-lg md:text-2xl font-black text-white">{formatCurrency(metrics.expense)}</p>
                        </div>
                    </div>
                </motion.div>

                <div className="md:col-span-1 p-6 genz-card flex items-center justify-between">
                    <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-white/40">Efficiency</p>
                        <p className="text-base font-bold text-white">Neural_Optimal</p>
                    </div>
                    <span className="text-2xl">🔥</span>
                </div>

                <div className="md:col-span-2 p-6 genz-card flex items-center justify-between">
                    <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-white/40">Security</p>
                        <p className="text-base font-bold text-white">Quantum_Link_Active</p>
                    </div>
                    <span className="text-2xl text-toxic-lime">🔐</span>
                </div>
            </div>

            {/* List Activity */}
            <section className="mb-10">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-white/50">Flux_Activity</h3>
                    <Link to="/transactions" className="text-[9px] font-black text-toxic-lime uppercase tracking-widest">History</Link>
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
                                className="genz-card p-4 flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex-shrink-0 flex items-center justify-center text-xl group-hover:bg-toxic-lime group-hover:text-black transition-all">
                                        {cat?.icon || '⚡'}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-black text-white group-hover:text-toxic-lime transition-colors truncate">{t.description}</p>
                                        <p className="text-[8px] font-black uppercase text-white/40 truncate">{t.category}</p>
                                    </div>
                                </div>
                                <div className="text-right ml-4">
                                    <p className={`text-base font-black ${t.amount > 0 ? 'text-toxic-lime' : 'text-white'}`}>
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
