import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, TrendingUp, TrendingDown, Wallet, Filter, Calendar, ChevronLeft, ChevronRight, CreditCard, Edit3, ShieldCheck, Activity, Globe, Info } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import TransactionForm from '../components/TransactionForm';

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Math.abs(amount) || 0);
};

const AccountDetail = () => {
    const { accountId } = useParams();
    const { accounts = [], transactions = [], categories = [], isLoading } = useFinance();
    const [selectedStatement, setSelectedStatement] = useState(new Date());
    const [showEditForm, setShowEditForm] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);

    const account = accounts.find(a => a.id === accountId);
    const isCreditCard = account?.type === 'credit';
    const billingDay = parseInt(account?.billingDay) || 1;

    // For credit cards, calculate statement period
    const statementPeriod = useMemo(() => {
        if (!isCreditCard) return null;
        const currentMonth = selectedStatement.getMonth();
        const currentYear = selectedStatement.getFullYear();
        const statementEnd = new Date(currentYear, currentMonth, billingDay);
        const statementStart = new Date(currentYear, currentMonth - 1, billingDay + 1);
        return { start: statementStart, end: statementEnd };
    }, [isCreditCard, selectedStatement, billingDay]);

    // Filter transactions
    const accountTransactions = useMemo(() => {
        let txList = transactions.filter(t => t.accountId === accountId);
        if (isCreditCard && statementPeriod) {
            txList = txList.filter(t => {
                const txDate = new Date(t.date);
                return txDate > statementPeriod.start && txDate <= statementPeriod.end;
            });
        }
        return txList.sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [transactions, accountId, isCreditCard, statementPeriod]);

    const stats = useMemo(() => {
        const income = accountTransactions.filter(t => t.type === 'income' || t.amount > 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const expenses = accountTransactions.filter(t => t.type === 'expense' || t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
        return { income, expenses, count: accountTransactions.length };
    }, [accountTransactions]);

    const handleEditTransaction = (transaction) => {
        setEditingTransaction(transaction);
        setShowEditForm(true);
    };

    const handleCloseEdit = () => {
        setShowEditForm(false);
        setEditingTransaction(null);
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
        </div>
    );

    if (!account) return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
            <Info size={40} className="text-text-muted mb-6" />
            <h1 className="text-2xl font-black uppercase tracking-tighter text-white">Node Not Found</h1>
            <Link to="/accounts" className="mt-8 text-primary font-black uppercase text-xs tracking-widest border border-primary/20 px-8 py-4 rounded-2xl hover:bg-primary hover:text-black transition-all">← Back to Records</Link>
        </div>
    );

    return (
        <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-black">
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

            <motion.main
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative px-5 py-12 md:px-8 md:py-20 max-w-5xl mx-auto pb-40"
            >
                {/* Navigation and Top Bar */}
                <header className="mb-16">
                    <Link
                        to="/accounts"
                        className="group inline-flex items-center gap-3 text-text-muted hover:text-primary transition-all mb-12 text-[10px] font-black uppercase tracking-[0.3em]"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> TERMINAL RETURN
                    </Link>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center text-4xl shadow-2xl">
                                {account.type === 'bank' ? '🏦' : account.type === 'credit' ? '💳' : '💵'}
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-black tracking-tighter leading-none text-white uppercase">{account.name}</h1>
                                <div className="flex items-center gap-3 mt-3">
                                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted opacity-60">
                                        NODE: {account.type} architecture
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                            <div className="p-6 rounded-[2rem] bg-white/[0.03] border border-white/5 flex flex-col justify-between">
                                <span className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-2">VECTOR COUNT</span>
                                <span className="text-2xl font-black tabular-nums">{stats.count}</span>
                            </div>
                            <div className="p-6 rounded-[2rem] bg-white/[0.03] border border-white/5 flex flex-col justify-between">
                                <span className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-2">SYSTEM LINK</span>
                                <Globe size={16} className="text-primary opacity-60" />
                            </div>
                        </div>
                    </div>
                </header>

                {/* Primary Valuation Bento */}
                <div className="group relative mb-8">
                    <div className="absolute -inset-[1px] bg-gradient-to-br from-primary/30 to-transparent rounded-[3.5rem] opacity-0 group-hover:opacity-100 transition-all duration-700" />
                    <div className="relative p-10 md:p-14 rounded-[3.5rem] bg-[#050505] border border-white/10 overflow-hidden">
                        <div className="absolute top-0 right-0 p-16 opacity-[0.02] -rotate-12 pointer-events-none group-hover:scale-110 transition-transform">
                            <Activity size={300} />
                        </div>

                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted mb-4 opacity-70">
                                    {isCreditCard ? 'OUTSTANDING LOAD' : 'LIQUID MOMENTUM'}
                                </p>
                                <h2 className={`text-4xl md:text-5xl font-black tabular-nums tracking-tighter leading-none ${account.balance >= 0 ? 'text-white' : 'text-rose-500'}`}>
                                    {formatCurrency(account.balance)}
                                </h2>
                            </div>

                            {isCreditCard && account.dueDay && (
                                <div className="text-right flex flex-col items-end">
                                    <div className="px-4 py-2 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-widest mb-4">
                                        PAYMENT LOCK: {account.dueDay}TH
                                    </div>
                                    {account.billingDay && (
                                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest opacity-40">
                                            STATEMENT CYCLE: {account.billingDay}TH
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Progress visual for Credit (simulated limit or use) */}
                        {isCreditCard && (
                            <div className="mt-12 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: '45%' }}
                                    transition={{ duration: 1.5, ease: 'circOut' }}
                                    className="h-full bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Secondary Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mb-16">
                    <div className="p-8 rounded-[2.5rem] bg-emerald-500/[0.03] border border-emerald-500/10 flex items-center justify-between group hover:bg-emerald-500/[0.05] transition-all">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/60 block mb-2">{isCreditCard ? 'PAYMENTS' : 'INFLOW'}</span>
                            <h4 className="text-2xl md:text-3xl font-black text-emerald-400 tabular-nums tracking-tighter">{formatCurrency(stats.income)}</h4>
                        </div>
                        <TrendingUp size={24} className="text-emerald-500/40 group-hover:scale-125 transition-transform" />
                    </div>
                    <div className="p-8 rounded-[2.5rem] bg-rose-500/[0.03] border border-rose-500/10 flex items-center justify-between group hover:bg-rose-500/[0.05] transition-all">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-rose-500/60 block mb-2">{isCreditCard ? 'CHARGES' : 'OUTFLOW'}</span>
                            <h4 className="text-2xl md:text-3xl font-black text-rose-400 tabular-nums tracking-tighter">{formatCurrency(stats.expenses)}</h4>
                        </div>
                        <TrendingDown size={24} className="text-rose-500/40 group-hover:scale-125 transition-transform" />
                    </div>
                </div>

                {/* Chrono Selector for Statement Period */}
                {isCreditCard && (
                    <div className="mb-12 p-3 rounded-[2.2rem] bg-white/[0.03] border border-white/5 flex items-center justify-between">
                        <button
                            onClick={() => setSelectedStatement(prev => subMonths(prev, 1))}
                            className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all text-text-muted"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="text-center">
                            <div className="flex items-center gap-3 justify-center mb-1">
                                <Calendar size={14} className="text-primary opacity-60" />
                                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">
                                    {format(selectedStatement, 'MMMM yyyy')} CYCLE
                                </h3>
                            </div>
                            {statementPeriod && (
                                <p className="text-[9px] font-black text-text-muted opacity-40 uppercase tracking-widest">
                                    {format(statementPeriod.start, 'MMM d')} - {format(statementPeriod.end, 'MMM d')}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={() => setSelectedStatement(prev => addMonths(prev, 1))}
                            className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all text-text-muted"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}

                {/* Signals History */}
                <section>
                    <div className="flex justify-between items-end mb-8 px-4">
                        <div>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted mb-2">SIGNAL LOGS</h3>
                            <p className="text-xs font-black text-primary uppercase tracking-widest">TRACE ANALYSIS</p>
                        </div>
                    </div>

                    {accountTransactions.length === 0 ? (
                        <div className="py-32 rounded-[3.5rem] bg-white/[0.02] border border-dashed border-white/10 text-center flex flex-col items-center justify-center">
                            <Filter size={40} className="text-text-muted/10 mb-6" />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted/40">
                                {isCreditCard ? 'NO SIGNALS DETECTED IN THIS CYCLE' : 'NO ACCOUNT HISTORY TRACED'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {accountTransactions.map((t, idx) => {
                                const cat = categories.find(c => c.name === t.category);
                                const isExpense = t.type === 'expense' || t.amount < 0;
                                return (
                                    <motion.div
                                        key={t.id}
                                        initial={{ x: -20, opacity: 0 }}
                                        whileInView={{ x: 0, opacity: 1 }}
                                        transition={{ delay: idx * 0.02 }}
                                        viewport={{ once: true }}
                                        onClick={() => handleEditTransaction(t)}
                                        className="group relative p-6 rounded-[2rem] bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/10 transition-all cursor-pointer flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className="w-14 h-14 rounded-2xl bg-[#080808] border border-white/10 flex items-center justify-center text-2xl group-hover:border-primary/30 transition-all">
                                                {cat?.icon || '📦'}
                                            </div>
                                            <div>
                                                <p className="text-lg font-black uppercase tracking-tighter text-white/80 group-hover:text-white transition-colors">{t.description || t.category}</p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-text-muted opacity-50">
                                                        {format(new Date(t.date), 'dd MMM yyyy')}
                                                    </span>
                                                    <div className="w-1 h-1 rounded-full bg-white/10" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-primary/40">
                                                        {t.category}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <p className={`text-2xl font-black tabular-nums tracking-tighter ${isExpense ? 'text-white alpha-80' : 'text-primary'}`}>
                                                {formatCurrency(t.amount).replace('₹', '')}<span className="text-xl ml-1 text-primary opacity-60">₹</span>
                                            </p>
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 opacity-0 group-hover:opacity-100 transition-all">
                                                <Edit3 size={16} className="text-text-muted group-hover:text-primary" />
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </section>

                <AnimatePresence>
                    {showEditForm && (
                        <TransactionForm
                            onClose={handleCloseEdit}
                            editTransaction={editingTransaction}
                            prefilledAccountId={accountId}
                        />
                    )}
                </AnimatePresence>

                <p className="text-[9px] font-black uppercase tracking-[0.5em] text-text-muted/20 text-center mt-20 italic">DEEP_DIVE STATUS: COMPLETED</p>
            </motion.main>
        </div>
    );
};

export default AccountDetail;
