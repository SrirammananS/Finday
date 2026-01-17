import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { motion } from 'framer-motion';
import { ArrowLeft, TrendingUp, TrendingDown, Wallet, Filter, Calendar, ChevronLeft, ChevronRight, CreditCard } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';

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

    const account = accounts.find(a => a.id === accountId);
    const isCreditCard = account?.type === 'credit';
    const billingDay = parseInt(account?.billingDay) || 1;

    // For credit cards, calculate statement period
    const statementPeriod = useMemo(() => {
        if (!isCreditCard) return null;

        const currentMonth = selectedStatement.getMonth();
        const currentYear = selectedStatement.getFullYear();

        // Statement end: billing day of selected month
        const statementEnd = new Date(currentYear, currentMonth, billingDay);
        // Statement start: billing day of previous month + 1 day
        const statementStart = new Date(currentYear, currentMonth - 1, billingDay + 1);

        return { start: statementStart, end: statementEnd };
    }, [isCreditCard, selectedStatement, billingDay]);

    // Filter transactions based on account and period
    const accountTransactions = useMemo(() => {
        let txList = transactions.filter(t => t.accountId === accountId);

        // For credit cards, filter by statement period
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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!account) {
        return (
            <div className="px-4 py-12 max-w-4xl mx-auto text-center">
                <p className="text-text-muted">Account not found</p>
                <Link to="/accounts" className="text-primary mt-4 inline-block">← Back to Accounts</Link>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 py-8 md:px-6 md:py-12 max-w-4xl mx-auto min-h-screen pb-40"
        >
            {/* Back Button & Header */}
            <header className="mb-8">
                <Link
                    to="/accounts"
                    className="inline-flex items-center gap-2 text-text-muted hover:text-primary transition-colors mb-4 text-sm font-bold uppercase tracking-wider"
                >
                    <ArrowLeft size={16} /> Back to Wallets
                </Link>

                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-canvas-subtle flex items-center justify-center text-3xl border border-card-border">
                        {account.type === 'bank' ? '🏦' : account.type === 'credit' ? '💳' : '💵'}
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-text-main">{account.name}</h1>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mt-1">
                            {account.type === 'credit' ? 'Credit Card' : account.type === 'bank' ? 'Bank Account' : 'Cash'}
                        </p>
                    </div>
                </div>

                {/* Balance Card */}
                <div className="mt-6 p-6 modern-card">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-2">
                                {isCreditCard ? 'Outstanding Balance' : 'Current Balance'}
                            </p>
                            <p className={`text-4xl font-black ${account.balance >= 0 ? 'text-text-main' : 'text-rose-500'}`}>
                                {formatCurrency(account.balance)}
                            </p>
                        </div>
                        {isCreditCard && account.dueDay && (
                            <div className="text-right">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Due Date</p>
                                <p className="text-lg font-black text-primary">{account.dueDay}th</p>
                            </div>
                        )}
                    </div>
                    {isCreditCard && (
                        <div className="mt-4 pt-4 border-t border-card-border text-xs text-text-muted">
                            Statement Date: <span className="font-bold text-text-main">{billingDay}th of every month</span>
                        </div>
                    )}
                </div>
            </header>

            {/* Statement Period Selector (Credit Cards Only) */}
            {isCreditCard && (
                <div className="modern-card p-4 mb-6">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setSelectedStatement(prev => subMonths(prev, 1))}
                            className="p-2 hover:bg-canvas-subtle rounded-full transition-colors"
                        >
                            <ChevronLeft size={20} className="text-text-muted" />
                        </button>
                        <div className="text-center">
                            <div className="flex items-center gap-2 justify-center">
                                <Calendar size={16} className="text-primary" />
                                <h3 className="text-sm font-black text-text-main">
                                    {format(selectedStatement, 'MMMM yyyy')} Statement
                                </h3>
                            </div>
                            {statementPeriod && (
                                <p className="text-[10px] text-text-muted mt-1">
                                    {format(statementPeriod.start, 'MMM d')} - {format(statementPeriod.end, 'MMM d, yyyy')}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={() => setSelectedStatement(prev => addMonths(prev, 1))}
                            className="p-2 hover:bg-canvas-subtle rounded-full transition-colors"
                        >
                            <ChevronRight size={20} className="text-text-muted" />
                        </button>
                    </div>
                </div>
            )}

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="modern-card p-4 text-center">
                    <TrendingUp className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
                    <p className="text-lg font-black text-emerald-500">{formatCurrency(stats.income)}</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-text-muted">
                        {isCreditCard ? 'Payments' : 'Income'}
                    </p>
                </div>
                <div className="modern-card p-4 text-center">
                    <TrendingDown className="w-5 h-5 text-rose-500 mx-auto mb-2" />
                    <p className="text-lg font-black text-rose-500">{formatCurrency(stats.expenses)}</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-text-muted">
                        {isCreditCard ? 'Charges' : 'Expenses'}
                    </p>
                </div>
                <div className="modern-card p-4 text-center">
                    <Wallet className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="text-lg font-black text-text-main">{stats.count}</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-text-muted">Transactions</p>
                </div>
            </div>

            {/* Credit Card Statement Summary */}
            {isCreditCard && accountTransactions.length > 0 && (
                <div className="modern-card p-6 mb-6 border-l-4 border-l-primary">
                    <div className="flex items-center gap-3 mb-4">
                        <CreditCard className="text-primary" size={20} />
                        <h3 className="font-black text-text-main">Statement Summary</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-text-muted text-xs mb-1">Total Charges</p>
                            <p className="font-black text-rose-500">{formatCurrency(stats.expenses)}</p>
                        </div>
                        <div>
                            <p className="text-text-muted text-xs mb-1">Payments Received</p>
                            <p className="font-black text-emerald-500">{formatCurrency(stats.income)}</p>
                        </div>
                        <div className="col-span-2 pt-3 border-t border-card-border">
                            <p className="text-text-muted text-xs mb-1">Statement Balance</p>
                            <p className="font-black text-xl text-text-main">
                                {formatCurrency(stats.expenses - stats.income)}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Transactions List */}
            <section>
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-4 ml-1">
                    {isCreditCard ? 'Statement Transactions' : 'Transaction History'}
                </h2>

                {accountTransactions.length === 0 ? (
                    <div className="py-16 text-center modern-card">
                        <Filter className="w-10 h-10 text-text-muted mx-auto mb-3 opacity-30" />
                        <p className="text-text-muted text-sm">
                            {isCreditCard
                                ? 'No transactions in this statement period.'
                                : 'No transactions for this account yet.'}
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
                                    initial={{ x: -10, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: idx * 0.03 }}
                                    className="modern-card p-4 flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-canvas-subtle flex items-center justify-center text-lg border border-card-border">
                                            {cat?.icon || '📦'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-text-main">{t.description || t.category}</p>
                                            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">
                                                {new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                            </p>
                                        </div>
                                    </div>
                                    <p className={`font-black ${isExpense ? 'text-text-main' : 'text-emerald-500'}`}>
                                        {isExpense ? '-' : '+'}{formatCurrency(t.amount)}
                                    </p>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </section>
        </motion.div>
    );
};

export default AccountDetail;
