import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, TrendingUp, TrendingDown, Wallet, Filter, Calendar, ChevronLeft, ChevronRight, CreditCard, Edit3, ShieldCheck, Activity, Globe, Info, ExternalLink } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import TransactionForm from '../components/TransactionForm';
import { useWalletChartData, getCycleRange } from '../hooks/useWalletChartData';
import { formatCurrency } from '../utils/formatUtils';
import { getAccountIcon } from '../utils/accountUtils';
import { expenseOnlyTransactions, getLinkedCCPaymentTransactionIds, getLinkedCCPaymentDisplay } from '../utils/transactionUtils';

const AccountDetail = () => {
    const { accountId } = useParams();
    const { accounts = [], transactions = [], categories = [], bills = [], billPayments = [], creditCards = [], creditCardPayments = [], isLoading } = useFinance();
    const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
    const [viewCycleOffset, setViewCycleOffset] = useState(0); // 0 = current, -1 = previous, etc. (credit card only)
    const [showEditForm, setShowEditForm] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);

    const account = accounts.find(a => a.id === accountId);
    const isCreditCard = account?.type === 'credit';
    const useCycleView = isCreditCard && account?.billingDay;
    const billingDay = parseInt(account?.billingDay, 10) || 1;

    const now = new Date();
    const currentMonthStart = startOfMonth(now);

    // For credit card: cycle range; for others: month range
    const viewRange = useMemo(() => {
        if (useCycleView) return getCycleRange(billingDay, viewCycleOffset);
        return { start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) };
    }, [useCycleView, billingDay, viewCycleOffset, viewMonth]);

    const canGoNextMonth = viewMonth.getTime() < currentMonthStart.getTime();
    const canGoNextCycle = viewCycleOffset < 1;

    // Filter transactions by selected view range (cycle for CC, month for others)
    const accountTransactions = useMemo(() => {
        let txList = transactions.filter(t => t.accountId === accountId);
        txList = txList.filter(t => {
            const txDate = new Date(t.date);
            return isWithinInterval(txDate, { start: viewRange.start, end: viewRange.end });
        });
        return txList.sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [transactions, accountId, viewRange]);

    const linkedCCPaymentTxnIds = useMemo(() => getLinkedCCPaymentTransactionIds(billPayments, bills, creditCardPayments), [billPayments, bills, creditCardPayments]);
    const stats = useMemo(() => {
        const income = accountTransactions.filter(t => t.type === 'income' || t.amount > 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const expenseTxns = expenseOnlyTransactions(accountTransactions, linkedCCPaymentTxnIds);
        const expenses = expenseTxns.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        return { income, expenses, count: accountTransactions.length };
    }, [accountTransactions, linkedCCPaymentTxnIds]);

    // Chart: cycle dateRange for CC, month view for others (excludes linked CC payments from expense)
    const accountChartData = useWalletChartData(
        transactions,
        accountId,
        30,
        useCycleView ? null : viewMonth,
        useCycleView ? viewRange : null,
        linkedCCPaymentTxnIds
    );

    // Current cycle/month paid bill payment(s) for this account (for tab under graph)
    const cycleKey = useCycleView ? format(viewRange.start, 'yyyy-MM') : format(viewMonth, 'yyyy-MM');
    const currentCyclePayment = useMemo(() => {
        const legacy = (billPayments || []).filter(
            (p) =>
                p.cycle === cycleKey &&
                p.status === 'paid' &&
                (p.accountId === accountId || (bills || []).some((b) => b.id === p.billId && b.accountId === accountId))
        );
        const ccPayments = (creditCardPayments || []).filter((p) => {
            const card = (creditCards || []).find((c) => c.id === p.creditCardId);
            if (!card || card.accountId !== accountId) return false;
            if (p.status !== 'paid' && p.status !== 'closed') return false;
            return p.cycle === cycleKey || (p.cycle && (String(p.cycle).startsWith(cycleKey + '-') || String(p.cycle).includes(cycleKey)));
        });
        return [...legacy, ...ccPayments];
    }, [billPayments, bills, accountId, cycleKey, creditCardPayments, creditCards]);

    const handleEditTransaction = (transaction) => {
        setEditingTransaction(transaction);
        setShowEditForm(true);
    };

    const handleCloseEdit = () => {
        setShowEditForm(false);
        setEditingTransaction(null);
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-canvas">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
        </div>
    );

    if (!account) return (
        <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-8 text-center">
            <Info size={40} className="text-text-muted mb-6" />
            <h1 className="text-2xl font-black uppercase tracking-tighter text-text-main">Node Not Found</h1>
            <Link to="/accounts" className="mt-8 text-primary font-black uppercase text-xs tracking-widest border border-primary/20 px-8 py-4 rounded-2xl hover:bg-primary hover:text-black transition-all">← Back to Records</Link>
        </div>
    );

    return (
        <div className="min-h-screen text-text-main selection:bg-primary selection:text-black">
            {/* Background handled by Layout */}

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
                            <div className="w-20 h-20 rounded-[2rem] bg-canvas-subtle border border-card-border flex items-center justify-center text-4xl shadow-2xl">
                                {getAccountIcon(account)}
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-black tracking-tighter leading-none text-text-main uppercase">{account.name}</h1>
                                <div className="flex items-center gap-3 mt-3">
                                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted opacity-60">
                                        NODE: {account.type} architecture
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                            <div className="p-6 rounded-[2rem] bg-canvas-subtle border border-card-border flex flex-col justify-between">
                                <span className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-2">VECTOR COUNT</span>
                                <span className="text-2xl font-black tabular-nums">{stats.count}</span>
                            </div>
                            <div className="p-6 rounded-[2rem] bg-canvas-subtle border border-card-border flex flex-col justify-between">
                                <span className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-2">SYSTEM LINK</span>
                                <Globe size={16} className="text-primary opacity-60" />
                            </div>
                        </div>
                    </div>
                </header>

                {/* Primary Valuation Bento */}
                <div className="group relative mb-8">
                    <div className="absolute -inset-[1px] bg-gradient-to-br from-primary/30 to-transparent rounded-[3.5rem] opacity-0 group-hover:opacity-100 transition-all duration-700" />
                    <div className="relative p-10 md:p-14 rounded-[3.5rem] bg-card border border-card-border overflow-hidden">
                        <div className="absolute top-0 right-0 p-16 opacity-[0.02] -rotate-12 pointer-events-none group-hover:scale-110 transition-transform">
                            <Activity size={300} />
                        </div>

                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted mb-4 opacity-70">
                                    {isCreditCard ? 'OUTSTANDING LOAD' : 'LIQUID MOMENTUM'}
                                </p>
                                <h2 className={`text-4xl md:text-5xl font-black tabular-nums tracking-tighter leading-none ${account.balance >= 0 ? 'text-text-main' : 'text-rose-500'}`}>
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
                            <div className="mt-12 h-1 w-full bg-canvas-subtle rounded-full overflow-hidden">
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
                <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mb-8">
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

                {/* Period navigation: cycle for credit card, month for others */}
                <div className="mb-6 p-3 rounded-[2.2rem] bg-card border border-card-border flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => useCycleView ? setViewCycleOffset((o) => o - 1) : setViewMonth((prev) => subMonths(prev, 1))}
                        className="w-14 h-14 rounded-2xl bg-canvas-subtle flex items-center justify-center hover:bg-canvas-elevated transition-all text-text-muted hover:text-text-main"
                        aria-label={useCycleView ? 'Previous cycle' : 'Previous month'}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="text-center">
                        <div className="flex items-center gap-3 justify-center mb-1">
                            <Calendar size={14} className="text-primary opacity-60" />
                            <h3 className="text-[10px] font-black text-text-main uppercase tracking-[0.2em]">
                                {useCycleView
                                    ? `${format(viewRange.start, 'd MMM')} – ${format(viewRange.end, 'd MMM yyyy')}`
                                    : format(viewMonth, 'MMMM yyyy')}
                            </h3>
                        </div>
                        <p className="text-[9px] font-black text-text-muted opacity-40 uppercase tracking-widest">
                            {useCycleView ? 'Graph &amp; history by statement cycle' : 'Graph &amp; history for this month'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => useCycleView ? setViewCycleOffset((o) => o + 1) : setViewMonth((prev) => addMonths(prev, 1))}
                        disabled={useCycleView ? !canGoNextCycle : !canGoNextMonth}
                        className="w-14 h-14 rounded-2xl bg-canvas-subtle flex items-center justify-center hover:bg-canvas-elevated transition-all text-text-muted hover:text-text-main disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label={useCycleView ? 'Next cycle' : 'Next month'}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* Income/Expense Trend Chart */}
                <div className="p-6 md:p-8 rounded-[2.5rem] bg-card border border-card-border mb-12 overflow-hidden">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-4">
                        Activity trend — {useCycleView ? `${format(viewRange.start, 'd MMM')} – ${format(viewRange.end, 'd MMM yyyy')}` : format(viewMonth, 'MMMM yyyy')}
                    </h3>
                    <div className="h-48 md:h-56 -mx-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={accountChartData}>
                                <defs>
                                    <linearGradient id="accIn" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="accOut" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)', angle: -90, textAnchor: 'end' }}
                                    interval="preserveStartEnd"
                                    height={56}
                                />
                                <YAxis hide domain={['auto', 'auto']} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(0,0,0,0.9)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px',
                                        color: '#fff',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                    }}
                                    itemStyle={{ color: '#fff' }}
                                    labelStyle={{ color: 'rgba(255,255,255,0.8)' }}
                                    formatter={(value, name) => [formatCurrency(Number(value)), name === 'Inflow' ? 'Inflow' : 'Outflow']}
                                    labelFormatter={(label) => label}
                                />
                                <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fill="url(#accIn)" name="Inflow" />
                                <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2} fill="url(#accOut)" name="Outflow" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Current cycle payment paid date + link to transaction/insights */}
                    {currentCyclePayment.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-card-border/50 flex flex-wrap items-center gap-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">
                                {useCycleView ? 'Cycle payment' : 'This month'}
                            </span>
                            {currentCyclePayment.map((p) => {
                                const linkedTx = p.transactionId ? transactions.find((t) => t.id === p.transactionId) : null;
                                const fromAcc = linkedTx?.accountId ? accounts.find((a) => a.id === linkedTx.accountId) : null;
                                const fromName = fromAcc?.name || null;
                                const dateForLink = linkedTx?.date || (p.paidDate ? format(new Date(p.paidDate), 'yyyy-MM-dd') : null);
                                const paidDateStr = p.paidDate ? format(new Date(p.paidDate), 'dd MMM yyyy') : '—';
                                return (
                                    <div key={p.id} className="flex items-center gap-3 flex-wrap">
                                        <span className="text-xs font-bold text-emerald-500/90">
                                            {fromName ? `From ${fromName} → paid ${paidDateStr}. Settled` : `Paid ${paidDateStr}`}
                                            {p.name && !fromName && ` · ${p.name}`}
                                            {p.amount ? ` · ${formatCurrency(Math.abs(p.amount))}` : ''}
                                        </span>
                                        {dateForLink && (
                                            <>
                                                <Link
                                                    to={`/insights?view=expense&date=${dateForLink}`}
                                                    className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary hover:underline"
                                                >
                                                    <ExternalLink size={12} />
                                                    Insights
                                                </Link>
                                                <Link
                                                    to={`/transactions?date=${dateForLink}`}
                                                    className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted hover:text-primary hover:underline"
                                                >
                                                    <ExternalLink size={12} />
                                                    Transactions
                                                </Link>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Signals History */}
                <section>
                    <div className="flex justify-between items-end mb-8 px-4">
                        <div>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted mb-2">SIGNAL LOGS</h3>
                            <p className="text-xs font-black text-primary uppercase tracking-widest">TRACE ANALYSIS</p>
                        </div>
                    </div>

                    {accountTransactions.length === 0 ? (
                        <div className="py-32 rounded-[3.5rem] bg-card border border-dashed border-card-border text-center flex flex-col items-center justify-center">
                            <Filter size={40} className="text-text-muted/10 mb-6" />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted/40">
                                {useCycleView ? 'NO TRANSACTIONS THIS CYCLE' : 'NO TRANSACTIONS THIS MONTH'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {accountTransactions.map((t, idx) => {
                                const cat = categories.find(c => c.name === t.category);
                                const isExpense = t.type === 'expense' || t.amount < 0;
                                const ccDisplay = getLinkedCCPaymentDisplay(t.id, billPayments, bills, accounts, creditCardPayments, creditCards, { transaction: t });
                                return (
                                    <motion.div
                                        key={t.id}
                                        initial={{ x: -20, opacity: 0 }}
                                        whileInView={{ x: 0, opacity: 1 }}
                                        transition={{ delay: idx * 0.02 }}
                                        viewport={{ once: true }}
                                        onClick={() => handleEditTransaction(t)}
                                        className="group relative p-6 rounded-[2rem] bg-card border border-card-border hover:bg-canvas-elevated hover:border-text-muted/20 transition-all cursor-pointer flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className="w-14 h-14 rounded-2xl bg-canvas-subtle border border-card-border flex items-center justify-center text-2xl group-hover:border-primary/30 transition-all">
                                                {(ccDisplay ? '💳' : (cat?.icon || '📦'))}
                                            </div>
                                            <div>
                                                <p className="text-lg font-black uppercase tracking-tighter text-text-main group-hover:text-text-main transition-colors" title={ccDisplay ? t.description : undefined}>{ccDisplay?.label ?? (t.description || t.category)}</p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-text-muted opacity-50">
                                                        {format(new Date(t.date), 'dd MMM yyyy')}
                                                    </span>
                                                    <div className="w-1 h-1 rounded-full bg-text-muted/20" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-primary/40">
                                                        {t.category}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <p className={`text-2xl font-black tabular-nums tracking-tighter ${isExpense ? 'text-text-main alpha-80' : 'text-primary'}`}>
                                                {formatCurrency(t.amount).replace('₹', '')}<span className="text-xl ml-1 text-primary opacity-60">₹</span>
                                            </p>
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-canvas-subtle opacity-0 group-hover:opacity-100 transition-all">
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
