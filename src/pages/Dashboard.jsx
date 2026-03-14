import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useFinance } from '../context/FinanceContext';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PageLayout from '../components/PageLayout';
import { RefreshCw, ArrowRight, TrendingUp, TrendingDown, Zap, Wallet, PieChart as PieChartIcon, ChevronDown, Maximize2, X, CreditCard, Link2 } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';
import { ResponsiveContainer, Tooltip, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ReferenceLine, AreaChart, Area, BarChart, Bar, LineChart as RechartsLineChart, Line } from 'recharts';
import PullToRefresh from '../components/PullToRefresh';
import { expenseOnlyTransactions, getLinkedCCPaymentTransactionIds, getLinkedCCPaymentDisplay } from '../utils/transactionUtils';
import { formatCurrency } from '../utils/formatUtils';
import SkeletonDashboard from '../components/skeletons/SkeletonDashboard';
import WalletCard from '../components/WalletCard';
import ConnectionButton from '../components/ConnectionButton';
import StatCard from '../components/ui/StatCard';
import SectionCard from '../components/ui/SectionCard';
import ScrollReveal from '../components/ui/ScrollReveal';
import ParticleField from '../components/ui/ParticleField';

const ChartZoomModal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-lg flex flex-col"
        onClick={onClose}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10" onClick={e => e.stopPropagation()}>
          <h3 className="text-sm font-black text-white uppercase tracking-wider">{title}</h3>
          <button type="button" onClick={onClose} className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4" onClick={e => e.stopPropagation()}>
          <div className="h-full min-h-[60vh]">
            {children}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

/* Progress Ring for infographic stat display */
const ProgressRing = ({ value, size = 56, strokeWidth = 4, color = 'var(--primary)' }) => {
  const normalized = Math.min(100, Math.max(0, Number(value) || 0));
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (normalized / 100) * circumference;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const {
    accounts = [],
    transactions = [],
    categories = [],
    bills = [],
    billPayments = [],
    creditCards = [],
    creditCardPayments = [],
    isLoading,
    isSyncing,
    forceSync,
    refreshData,
    friends = [],
    secretUnlocked,
  } = useFinance();

  const linkedCCPaymentTxnIds = useMemo(() => getLinkedCCPaymentTransactionIds(billPayments, bills, creditCardPayments), [billPayments, bills, creditCardPayments]);

  const unpaidCCPayments = useMemo(() => {
    return (creditCardPayments || [])
      .filter(p => p.status !== 'paid' && p.status !== 'closed')
      .sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0))
      .slice(0, 3);
  }, [creditCardPayments]);

  /** Financial Pulse range: 1 = 1 day, 7 = 1 week, 365 = 1 year, 0 = max (all time). Default 30 days. */
  const [chartRangeDays, setChartRangeDays] = useState(30);
  const pulseScrollRef = useRef(null);
  const PULSE_RANGES = [
    { value: 30, label: '30D' },
    { value: 1, label: '1D' },
    { value: 7, label: '1W' },
    { value: 90, label: '3M' },
    { value: 150, label: '5M' },
    { value: 365, label: '1Y' },
    { value: 0, label: 'Max' },
  ];
  const isMobile = useIsMobile();
  const pulseClickRef = useRef({ date: null, time: 0 });
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  const handlePulseDayOpen = useCallback((e) => {
    const p = e?.activePayload?.[0]?.payload;
    const date = p?.date ?? pulseClickRef.current.date;
    const now = Date.now();
    if (isTouchDevice) {
      if (date) navigate(`/insights?view=expense&date=${date}`);
      return;
    }
    if (date && pulseClickRef.current.date === date && now - pulseClickRef.current.time < 500) {
      navigate(`/insights?view=expense&date=${date}`);
      pulseClickRef.current = { date: null, time: 0 };
    } else if (date) {
      pulseClickRef.current = { date, time: now };
    }
  }, [navigate, isTouchDevice]);

  const [heroExpanded, setHeroExpanded] = useState(true);
  const [statsExpanded, setStatsExpanded] = useState(true);
  const [nodesExpanded, setNodesExpanded] = useState(true);
  const [pulseExpanded, setPulseExpanded] = useState(true);
  const [pulseMode, setPulseMode] = useState('categories');
  /** Pulse chart view: 'lines' = Income vs Expense (two lines, default), 'balance' = running balance area */
  const [pulseChartView, setPulseChartView] = useState('lines');
  const [zoomChart, setZoomChart] = useState(null);
  const [hiddenCashFlowCats, setHiddenCashFlowCats] = useState(new Set());
  const [showCFFilter, setShowCFFilter] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedCat, setSelectedCat] = useState(null);

  const visibleTransactions = useMemo(() => transactions.filter((t) => !t.hidden), [transactions]);
  const visibleAccounts = useMemo(() => accounts.filter((a) => !a.isSecret || secretUnlocked), [accounts, secretUnlocked]);

  /** Accounts sorted by latest transaction (most recent first) for horizontal scroll */
  const sortedAccounts = useMemo(() => {
    const accLatest = {};
    visibleTransactions.forEach((t) => {
      const aid = t.accountId;
      if (!aid) return;
      const d = t.date;
      if (!accLatest[aid] || d > accLatest[aid]) accLatest[aid] = d;
    });
    return [...visibleAccounts].sort((a, b) => {
      const da = accLatest[a.id] || '';
      const db = accLatest[b.id] || '';
      return db.localeCompare(da);
    });
  }, [visibleAccounts, visibleTransactions]);

  const metrics = useMemo(() => {
    const now = new Date();
    const toLocalDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const thisMonthStart = toLocalDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
    const thisMonthEnd = toLocalDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    const last30End = toLocalDateStr(now);
    const last30Start = toLocalDateStr(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000));

    const thisMonthTxs = visibleTransactions.filter((t) => t.date >= thisMonthStart && t.date <= thisMonthEnd);
    const last30Txs = visibleTransactions.filter((t) => t.date >= last30Start && t.date <= last30End);
    const incomeThisMonth = thisMonthTxs.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const expenseThisMonth = Math.abs(expenseOnlyTransactions(thisMonthTxs, linkedCCPaymentTxnIds).reduce((sum, t) => sum + t.amount, 0));
    const incomeLast30 = last30Txs.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const expenseLast30 = Math.abs(expenseOnlyTransactions(last30Txs, linkedCCPaymentTxnIds).reduce((sum, t) => sum + t.amount, 0));
    const netLast30 = incomeLast30 - expenseLast30;

    const totalIncome = visibleTransactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = Math.abs(expenseOnlyTransactions(visibleTransactions, linkedCCPaymentTxnIds).reduce((sum, t) => sum + t.amount, 0));
    const total = visibleAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const totalAssets = visibleAccounts.filter((a) => a.type !== 'credit').reduce((sum, a) => sum + a.balance, 0);
    const totalDebt = visibleAccounts.filter((a) => a.type === 'credit').reduce((sum, a) => sum + a.balance, 0);

    const recent = [...visibleTransactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);

    const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const todayStr = toLocalDateStr(now);
    let dateRange;
    if (chartRangeDays === 0) {
      const txDates = visibleTransactions.map((t) => t.date).filter(Boolean);
      if (txDates.length === 0) {
        dateRange = [todayStr];
      } else {
        const sorted = [...new Set(txDates)].sort();
        const minStr = sorted[0];
        const minD = new Date(minStr);
        const endD = new Date(todayStr);
        dateRange = [];
        const curr = new Date(minD);
        while (curr <= endD) {
          dateRange.push(toLocalDateStr(curr));
          curr.setDate(curr.getDate() + 1);
        }
      }
    } else {
      const n = chartRangeDays;
      dateRange = [...Array(n)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (n - 1 - i));
        return toLocalDateStr(d);
      });
    }

    /** Short date e.g. 2 Feb for X-axis */
    const toShortDate = (ymd) => {
      const [, mo, d] = ymd.split('-').map(Number);
      return `${d} ${MONTH_SHORT[mo - 1]}`;
    };
    const fluxPulse = dateRange.map((date) => {
      const dayTxs = visibleTransactions.filter((t) => t.date === date);
      const dayIn = dayTxs.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
      const dayOut = Math.abs(expenseOnlyTransactions(dayTxs, linkedCCPaymentTxnIds).reduce((sum, t) => sum + t.amount, 0));
      return {
        name: toShortDate(date),
        income: dayIn,
        expense: dayOut,
        date,
      };
    });

    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100).toFixed(0) : 0;
    const catSpend = {};
    expenseOnlyTransactions(thisMonthTxs, linkedCCPaymentTxnIds).forEach((t) => {
      const cat = t.category || 'Other';
      catSpend[cat] = (catSpend[cat] || 0) + Math.abs(t.amount);
    });
    const topCategory = Object.entries(catSpend).sort((a, b) => b[1] - a[1])[0];
    const dailyBurn = totalExpense / 30;

    const totalOwedToYou = friends.filter((f) => f.balance > 0).reduce((s, f) => s + f.balance, 0);
    const totalYouOwe = friends.filter((f) => f.balance < 0).reduce((s, f) => s + Math.abs(f.balance), 0);

    const recentLimited = recent.slice(0, 5);
    const catSpendSorted = Object.entries(catSpend)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, amount]) => ({ name, value: amount }));

    /** Multi-line: category spend by date for Spending by Category chart */
    const catSpendByDate = dateRange.map((date, idx) => {
      const dayTxs = expenseOnlyTransactions(visibleTransactions.filter((t) => t.date === date), linkedCCPaymentTxnIds);
      const [, m, d] = date.split('-').map(Number);
      const showMonth = idx === 0 || d === 1;
      const row = { name: showMonth ? `${d} ${MONTH_SHORT[m - 1]}` : `${d}`, date };
      dayTxs.forEach((t) => {
        const cat = t.category || 'Other';
        row[cat] = (row[cat] || 0) + Math.abs(t.amount);
      });
      return row;
    });
    const allCatKeys = [...new Set(catSpendByDate.flatMap((r) => Object.keys(r).filter((k) => k !== 'name' && k !== 'date')))];
    const catTotals = {};
    allCatKeys.forEach(k => { catTotals[k] = catSpendByDate.reduce((s, r) => s + (r[k] || 0), 0); });
    const categoryKeys = allCatKeys.filter(k => catTotals[k] > 0).sort((a, b) => catTotals[b] - catTotals[a]);
    categoryKeys.forEach(k => { catSpendByDate.forEach(row => { if (row[k] === undefined) row[k] = 0; }); });

    const running = {};
    categoryKeys.forEach(k => { running[k] = 0; });
    const catSpendCumulative = catSpendByDate.map(row => {
      const cumRow = { name: row.name, date: row.date };
      categoryKeys.forEach(k => {
        running[k] += (row[k] || 0);
        cumRow[k] = running[k];
      });
      return cumRow;
    });

    const allExpenseCategories = [...new Set(
      expenseOnlyTransactions(visibleTransactions, linkedCCPaymentTxnIds).map(t => t.category || 'Other')
    )].sort();

    const allIncomeCategories = [...new Set(
      visibleTransactions.filter(t => t.amount > 0).map(t => t.category || 'Other')
    )].sort();

    const rangeIncome = fluxPulse.reduce((s, d) => s + d.income, 0);
    const rangeExpense = fluxPulse.reduce((s, d) => s + d.expense, 0);

    /** Category spend in selected range (all categories, for Financial Pulse) */
    const rangeCatSpend = {};
    expenseOnlyTransactions(visibleTransactions.filter((t) => dateRange.includes(t.date)), linkedCCPaymentTxnIds).forEach((t) => {
      const cat = t.category || 'Other';
      rangeCatSpend[cat] = (rangeCatSpend[cat] || 0) + Math.abs(t.amount);
    });
    const rangeCatSpendSorted = Object.entries(rangeCatSpend)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    return {
      incomeThisMonth,
      expenseThisMonth,
      netThisMonth: incomeThisMonth - expenseThisMonth,
      incomeLast30,
      expenseLast30,
      netLast30,
      total,
      totalAssets,
      totalDebt,
      totalIncome,
      totalExpense,
      rangeIncome,
      rangeExpense,
      recent: recentLimited,
      fluxPulse,
      dateRange,
      totalOwedToYou,
      totalYouOwe,
      savingsRate,
      topCategory,
      dailyBurn,
      catSpendSorted,
      rangeCatSpendSorted,
      catSpendByDate,
      catSpendCumulative,
      categoryKeys,
      allExpenseCategories,
      allIncomeCategories,
    };
  }, [visibleTransactions, visibleAccounts, friends, chartRangeDays, linkedCCPaymentTxnIds]);

  const filteredFluxPulse = useMemo(() => {
    if (hiddenCashFlowCats.size === 0) return metrics.fluxPulse;
    const MS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const toShortDate = (ymd) => {
      const [, mo, d] = ymd.split('-').map(Number);
      return `${d} ${MS[mo - 1]}`;
    };
    return (metrics.dateRange || []).map((date) => {
      const dayTxs = visibleTransactions.filter((t) => {
        if (t.date !== date) return false;
        const cat = t.category || 'Other';
        if (t.amount < 0 && hiddenCashFlowCats.has(cat)) return false;
        if (t.amount > 0 && hiddenCashFlowCats.has(`income:${cat}`)) return false;
        return true;
      });
      const dayIn = dayTxs.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
      const dayOut = Math.abs(expenseOnlyTransactions(dayTxs, linkedCCPaymentTxnIds).reduce((sum, t) => sum + t.amount, 0));
      return { name: toShortDate(date), income: dayIn, expense: dayOut, date };
    });
  }, [metrics.fluxPulse, metrics.dateRange, hiddenCashFlowCats, visibleTransactions, linkedCCPaymentTxnIds]);

  /* Gen-Z infographic palette: green = income, red = expense, 24 category tints */
  const INCOME_GREEN = '#22c55e';
  const EXPENSE_RED = '#ef4444';
  const CAT_COLORS = [
    '#ef4444', '#f43f5e', '#f97316', '#e11d48', '#dc2626', '#fb7185', '#b91c1c', '#f87171',
    '#ea580c', '#be123c', '#c2410c', '#ea4335', '#fbbf24', '#f59e0b', '#d97706', '#b45309',
    '#84cc16', '#65a30d', '#4d7c0f', '#a855f7', '#9333ea', '#7c3aed', '#6366f1', '#4f46e5',
  ];

  const drillDownTxs = useMemo(() => {
    if (!selectedDay && !selectedCat) return [];
    const range = metrics.dateRange || [];
    let txs = visibleTransactions.filter((t) => range.includes(t.date));
    if (selectedDay) txs = txs.filter((t) => t.date === selectedDay);
    if (selectedCat) txs = txs.filter((t) => (t.category || 'Other') === selectedCat);
    return txs.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20);
  }, [selectedDay, selectedCat, visibleTransactions, metrics.dateRange]);

  /** Pulse chart: running balance anchored to current net worth (value at last day = total) */
  const pulseChartData = useMemo(() => {
    const pulse = metrics.fluxPulse || [];
    if (pulse.length === 0) return [];
    const rangeNetFlow = pulse.reduce((s, d) => s + ((d.income || 0) - (d.expense || 0)), 0);
    const startBalance = (metrics.total ?? 0) - rangeNetFlow;
    let running = startBalance;
    return pulse.map((d) => {
      const income = d.income || 0;
      const expense = d.expense || 0;
      const net = income - expense;
      running += net;
      return {
        name: d.name,
        date: d.date,
        value: running,
        income,
        expense,
        net,
        isUp: running >= 0,
      };
    });
  }, [metrics.fluxPulse, metrics.total]);

  /** Scroll pulse chart to end (today) when data loads */
  useEffect(() => {
    if (pulseChartData.length > 0 && pulseScrollRef.current) {
      pulseScrollRef.current.scrollLeft = pulseScrollRef.current.scrollWidth;
    }
  }, [pulseChartData.length]);

  const handleCatLegendClick = (cat) => {
    setSelectedCat(prev => prev === cat ? null : cat);
    setSelectedDay(null);
  };

  if (isLoading) {
    return <SkeletonDashboard />;
  }

  return (
    <>
      <PullToRefresh onRefresh={refreshData} disabled={isSyncing}>
        <PageLayout maxWidth="max-w-[1600px]" className="!px-4 !py-6 md:!px-6 md:!py-8">
          {/* Control Center - Net worth + aggregate + quick actions */}
          <header className="mb-6 relative">
            <div className="absolute inset-0 rounded-2xl overflow-hidden opacity-40">
              <ParticleField count={50} intensity={0.25} />
            </div>
            <div className="relative rounded-2xl border border-card-border bg-card/80 backdrop-blur-xl p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">Net Worth</span>
                  <h1 className={`text-2xl md:text-3xl font-black tabular-nums ${(metrics.total ?? 0) < 0 ? 'text-rose-500' : 'text-primary'}`}>
                    <span className={(metrics.total ?? 0) < 0 ? 'text-rose-500' : 'text-primary'}>₹</span>
                    {formatCurrency(metrics.total ?? 0, { useAbs: false }).replace('₹', '')}
                  </h1>
                  {(!isMobile || heroExpanded) && (
                    <>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs font-bold">
                        <Link to="/insights?view=assets" className="text-primary hover:underline focus:outline-none focus:underline">Assets {formatCurrency(metrics.totalAssets)}</Link>
                        <Link to="/insights?view=debt" className="text-rose-500 hover:underline focus:outline-none focus:underline">Debt {formatCurrency(metrics.totalDebt ?? 0, { useAbs: false })}</Link>
                      </div>
                    </>
                  )}
                  {isMobile && (
                    <button
                      type="button"
                      onClick={() => setHeroExpanded((e) => !e)}
                      className="flex items-center gap-1.5 mt-2 text-xs font-bold text-primary"
                    >
                      <ChevronDown size={14} className={`transition-transform duration-200 ${heroExpanded ? 'rotate-180' : ''}`} />
                      {heroExpanded ? 'Less' : 'Details'}
                    </button>
                  )}
                </div>
                {/* Quick actions - Connection + Sync only (Add/Accounts removed from hero) */}
                {(!isMobile || heroExpanded) && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <ConnectionButton />
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={forceSync}
                      className="w-10 h-10 rounded-xl bg-canvas-subtle border border-card-border flex items-center justify-center hover:border-primary/40 transition-all group"
                    >
                      <RefreshCw size={18} className={`text-text-muted group-hover:text-primary ${isSyncing ? 'animate-spin' : ''}`} />
                    </motion.button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Quick Stats - This month at a glance; click opens Insights with that view loaded */}
          <ScrollReveal variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, staggerChildren: 0.06 } } }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Link to="/insights?view=income" className="block rounded-2xl hover:ring-2 hover:ring-primary/30 transition-all focus:outline-none focus:ring-2 focus:ring-primary/40">
              <StatCard
                label="Income"
                value={formatCurrency(metrics.incomeLast30)}
                subtext="Last 30 days"
                icon={TrendingUp}
                variant="income"
              />
            </Link>
            <Link to="/insights?view=expense" className="block rounded-2xl hover:ring-2 hover:ring-primary/30 transition-all focus:outline-none focus:ring-2 focus:ring-primary/40">
              <StatCard
                label="Expense"
                value={formatCurrency(metrics.expenseLast30)}
                subtext="Last 30 days"
                icon={TrendingDown}
                variant="expense"
              />
            </Link>
            {(!isMobile || statsExpanded) && (
              <>
                <Link to="/insights?view=net" className="block rounded-2xl hover:ring-2 hover:ring-primary/30 transition-all focus:outline-none focus:ring-2 focus:ring-primary/40">
                  <StatCard
                    label="Net Flow"
                    value={`${(metrics.netLast30 ?? 0) >= 0 ? '+' : ''}${formatCurrency(metrics.netLast30 ?? 0, { useAbs: false })}`}
                    subtext="Last 30 days"
                    icon={Wallet}
                    variant={(metrics.netLast30 ?? 0) >= 0 ? 'primary' : 'expense'}
                  />
                </Link>
                <Link to="/insights?view=categories" className="block rounded-2xl hover:ring-2 hover:ring-primary/30 transition-all focus:outline-none focus:ring-2 focus:ring-primary/40">
                  <StatCard
                    label="High Expense Categories"
                    value={metrics.catSpendSorted[0]?.name || '—'}
                    subtext={metrics.catSpendSorted[0] ? `${formatCurrency(metrics.catSpendSorted[0].value)}` : 'Add transactions'}
                    icon={PieChartIcon}
                    variant="neutral"
                  />
                </Link>
              </>
            )}
            </div>
            {isMobile && (
              <button
                type="button"
                onClick={() => setStatsExpanded((e) => !e)}
                className="flex items-center gap-1.5 text-xs font-bold text-primary mb-6"
              >
                <ChevronDown size={14} className={`transition-transform duration-200 ${statsExpanded ? 'rotate-180' : ''}`} />
                {statsExpanded ? 'Less' : 'More stats'}
              </button>
            )}
          </ScrollReveal>

          <div className="space-y-6">
            {/* Financial Nodes - Mobile: summary + expand. Desktop: grid or scroll */}
            <ScrollReveal as="section">
              <div className="flex justify-between items-center mb-3 px-1">
                <h3 className="section-label">Financial Nodes</h3>
                <Link to="/accounts" className="text-[10px] font-bold text-primary uppercase hover:underline">
                  Manage
                </Link>
              </div>
              {isMobile && !nodesExpanded ? (
                <button
                  type="button"
                  onClick={() => setNodesExpanded(true)}
                  className="w-full p-4 rounded-2xl border border-card-border bg-card/80 flex justify-between items-center text-left hover:border-primary/40 transition-all"
                >
                  <span className="text-sm font-bold">
                    <span className="text-primary">{visibleAccounts.length + 1} accounts</span>
                    {' · '}
                    <span className={(metrics.total ?? 0) < 0 ? 'text-rose-500' : 'text-primary'}>{formatCurrency(metrics.total ?? 0, { useAbs: false })} net</span>
                  </span>
                  <ChevronDown size={16} className="text-text-muted" />
                </button>
              ) : (
                <>
                  {isMobile && nodesExpanded && (
                    <button
                      type="button"
                      onClick={() => setNodesExpanded(false)}
                      className="flex items-center gap-1.5 mb-2 text-xs font-bold text-primary"
                    >
                      <ChevronDown size={14} className="rotate-180 transition-transform duration-200" />
                      Less
                    </button>
                  )}
                  {/* Always horizontal scroll for 15+ wallets — sorted by latest transaction. Friends (Social Capital) only when vault revealed. */}
                  <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 scroll-snap-x px-1">
                    {secretUnlocked && (
                      <Link
                        to="/friends"
                        className={`relative flex-none w-36 h-48 p-4 rounded-2xl border bg-card no-underline transition-all group flex flex-col justify-between scroll-snap-start ${
                          metrics.totalOwedToYou - metrics.totalYouOwe >= 0
                            ? 'border-primary/20 hover:border-primary/40'
                            : 'border-rose-500/20 hover:border-rose-500/40'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-lg">👥</div>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-text-muted block">Social Capital</span>
                          <p
                            className={`text-lg font-black tabular-nums ${
                              metrics.totalOwedToYou - metrics.totalYouOwe >= 0 ? 'text-primary' : 'text-rose-400'
                            }`}
                          >
                            {formatCurrency(Math.abs(metrics.totalOwedToYou - metrics.totalYouOwe))}
                          </p>
                        </div>
                      </Link>
                    )}
                    {sortedAccounts.map((acc) => (
                      <div key={acc.id} className="flex-none scroll-snap-start">
                        <WalletCard account={acc} transactions={visibleTransactions} linkedCCPaymentTxnIds={linkedCCPaymentTxnIds} />
                      </div>
                    ))}
                    <Link
                      to="/accounts"
                      className="flex-none w-36 h-48 p-4 border-2 border-dashed border-card-border rounded-2xl no-underline hover:border-primary/40 hover:bg-primary/5 flex flex-col items-center justify-center gap-2 transition-all scroll-snap-start"
                    >
                      <span className="w-9 h-9 rounded-full bg-canvas-subtle flex items-center justify-center text-text-muted text-lg">+</span>
                      <span className="text-[10px] font-bold uppercase text-text-muted">Add Node</span>
                    </Link>
                  </div>

                  {unpaidCCPayments.length > 0 && (
                    <Link
                      to="/credit-cards"
                      className="mt-4 flex items-center justify-between gap-3 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50 transition-all no-underline"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500">
                          <CreditCard size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase text-text-main">Credit card payment{unpaidCCPayments.length > 1 ? 's' : ''} due</p>
                          <p className="text-[10px] text-text-muted">{unpaidCCPayments.length} unpaid • Link payment</p>
                        </div>
                      </div>
                      <span className="text-amber-500 shrink-0"><Link2 size={18} /></span>
                    </Link>
                  )}
                </>
              )}
            </ScrollReveal>

            {/* Financial Pulse - Unified chart with mode toggle and drill-down */}
            <ScrollReveal>
            {isMobile && !pulseExpanded ? (
              <button type="button" onClick={() => setPulseExpanded(true)} className="w-full p-4 rounded-2xl border border-card-border bg-card/80 flex justify-between items-center text-left hover:border-primary/40 transition-all">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-sm font-bold">Financial Pulse</span>
                </div>
                <ChevronDown size={16} className="text-text-muted" />
              </button>
            ) : (
            <SectionCard
              title="Financial Pulse"
              subtitle="In vs out · by category"
              action={
                <div className="flex items-center gap-1.5 flex-wrap">
                  {isMobile && <button type="button" onClick={() => setPulseExpanded(false)} className="flex items-center gap-1 text-xs text-primary font-bold mr-1"><ChevronDown size={14} className="rotate-180" /></button>}
                  {PULSE_RANGES.map(({ value, label }) => (
                    <button key={value === 0 ? 'max' : value} type="button" onClick={() => { setChartRangeDays(value); setSelectedDay(null); setSelectedCat(null); }} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${chartRangeDays === value ? 'bg-primary text-primary-foreground' : 'bg-canvas-subtle text-text-muted hover:text-text-main'}`}>{label}</button>
                  ))}
                  <button type="button" onClick={() => setZoomChart('pulse')} className="w-7 h-7 rounded-lg bg-canvas-subtle flex items-center justify-center text-text-muted hover:text-primary transition-colors" aria-label="Maximize chart">
                    <Maximize2 size={12} />
                  </button>
                </div>
              }
            >
              {/* ─── PULSE ONLY: Spend by category (scrollable 20+) + Income vs Expense donut ─── */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-6">
                {/* Spend by category – horizontal bar chart (15+ categories); click bar → Insights filtered */}
                <div className="md:col-span-3 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-3">Spend by category (tap bar → Insights)</p>
                  {metrics.rangeCatSpendSorted?.length > 0 ? (
                    <div className="h-[280px] md:h-[320px] min-h-[200px] rounded-2xl bg-canvas-subtle/40 border border-card-border/50 p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={metrics.rangeCatSpendSorted} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="2 2" horizontal={false} stroke="rgba(255,255,255,0.06)" />
                          <XAxis type="number" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.5)' }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} tickFormatter={(v) => (v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
                          <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.6)' }} tickLine={false} axisLine={false} />
                          <Tooltip
                            cursor={{ fill: 'rgba(255,255,255,0.06)' }}
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const p = payload[0]?.payload;
                              const total = metrics.rangeCatSpendSorted?.reduce((s, d) => s + d.value, 0) || 1;
                              const pct = total > 0 ? ((p?.value ?? 0) / total * 100).toFixed(0) : 0;
                              return (
                                <div className="px-3 py-2.5 rounded-xl bg-card border-2 border-card-border shadow-xl">
                                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{p?.name}</p>
                                  <p className="text-sm font-black tabular-nums text-text-main">{formatCurrency(p?.value ?? 0)} <span className="text-xs font-bold text-text-muted">({pct}%)</span></p>
                                  <p className="text-[9px] font-bold text-primary mt-1">Tap to open in Insights</p>
                                </div>
                              );
                            }}
                          />
                          <Bar
                            dataKey="value"
                            radius={[0, 4, 4, 0]}
                            isAnimationActive={true}
                            animationDuration={500}
                            animationEasing="ease-out"
                            onClick={(data) => { if (data?.payload?.name) navigate(`/insights?view=categories&category=${encodeURIComponent(data.payload.name)}`); }}
                          >
                            {metrics.rangeCatSpendSorted.map((entry, idx) => (
                              <Cell key={entry.name} fill={CAT_COLORS[idx % CAT_COLORS.length]} className="cursor-pointer" />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-32 rounded-2xl bg-canvas-subtle/40 border border-card-border/50 flex items-center justify-center text-xs font-bold text-text-muted uppercase tracking-wider">No spend in range</div>
                  )}
                </div>

                {/* Income vs Expense – donut */}
                <div className="md:col-span-2 flex flex-col items-center justify-center min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-3">Income vs Expense</p>
                  {((metrics.rangeIncome || 0) + (metrics.rangeExpense || 0)) > 0 ? (
                    <div className="w-full max-w-[200px] aspect-square min-h-[160px] min-w-[140px] relative">
                      <ResponsiveContainer width="100%" height="100%" minWidth={120} minHeight={120}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Income', value: metrics.rangeIncome || 0 },
                              { name: 'Expense', value: metrics.rangeExpense || 0 },
                            ].filter((d) => d.value > 0)}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius="48%"
                            outerRadius="88%"
                            paddingAngle={3}
                            stroke="rgba(0,0,0,0.2)"
                            strokeWidth={2}
                            isAnimationActive={true}
                            animationDuration={500}
                          >
                            {[
                              { name: 'Income', value: metrics.rangeIncome || 0 },
                              { name: 'Expense', value: metrics.rangeExpense || 0 },
                            ].filter((d) => d.value > 0).map((d) => (
                              <Cell key={d.name} fill={d.name === 'Income' ? INCOME_GREEN : EXPENSE_RED} />
                            ))}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const p = payload[0]?.payload;
                              const total = (metrics.rangeIncome || 0) + (metrics.rangeExpense || 0);
                              const pct = total > 0 ? ((p?.value ?? 0) / total * 100).toFixed(1) : 0;
                              return (
                                <div className="px-3 py-2.5 rounded-xl bg-card border-2 border-card-border shadow-xl" role="tooltip">
                                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{p?.name}</p>
                                  <p className={`text-base font-black ${p?.name === 'Income' ? 'text-emerald-500' : 'text-rose-500'}`}>{formatCurrency(p?.value ?? 0)} <span className="text-xs font-bold text-text-muted">({pct}%)</span></p>
                                </div>
                              );
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">In vs Out</span>
                        <span className="text-lg font-black text-text-main tabular-nums">
                          {formatCurrency((metrics.rangeIncome || 0) - (metrics.rangeExpense || 0))}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-36 rounded-2xl bg-canvas-subtle/40 border border-card-border/50 flex items-center justify-center text-xs font-bold text-text-muted uppercase tracking-wider">No data</div>
                  )}
                </div>
              </div>

              {/* Pulse: Chart view toggle (Income vs Expense lines = default, or Running balance area) */}
              {pulseChartData.length > 0 && (
                <div className="mt-4 pt-4 border-t border-card-border/50">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">
                      Pulse · {pulseChartView === 'lines' ? 'Income vs Expense' : 'Running balance'} (tap or double‑click day → Insights)
                    </p>
                    <div className="flex rounded-lg bg-canvas-subtle/60 border border-card-border/50 p-0.5">
                      <button type="button" onClick={() => setPulseChartView('lines')} className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${pulseChartView === 'lines' ? 'bg-primary text-primary-foreground' : 'text-text-muted hover:text-text-main'}`}>In vs Out</button>
                      <button type="button" onClick={() => setPulseChartView('balance')} className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${pulseChartView === 'balance' ? 'bg-primary text-primary-foreground' : 'text-text-muted hover:text-text-main'}`}>Balance</button>
                    </div>
                  </div>
                  <div ref={pulseScrollRef} className="overflow-x-auto overflow-y-hidden scrollbar-hide rounded-2xl bg-canvas-subtle/40 border border-card-border/50 p-2" style={{ maxWidth: '100%' }}>
                    <div className="h-40 md:h-48 min-h-[140px]" style={{ minWidth: Math.max(pulseChartData.length * 24, 320), width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%" minWidth={320} minHeight={120}>
                        {pulseChartView === 'lines' ? (
                          <RechartsLineChart data={pulseChartData} margin={{ top: 8, right: 8, left: 4, bottom: 4 }} onClick={handlePulseDayOpen}>
                            <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="rgba(255,255,255,0.06)" />
                            <XAxis dataKey="name" tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.5)', angle: -90, textAnchor: 'end' }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} interval="preserveStartEnd" />
                            <YAxis tickCount={8} tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.5)' }} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} width={40} />
                            <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                            <Tooltip content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const p = payload[0]?.payload;
                              if (!p) return null;
                              return (
                                <div className="px-3 py-3 rounded-2xl bg-card border-2 border-card-border shadow-xl min-w-[160px]">
                                  <p className="text-[10px] font-black uppercase tracking-wider text-text-muted mb-2">{p.name}</p>
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="text-[10px] font-bold text-text-muted">Income</span>
                                      <span className="text-sm font-black tabular-nums text-emerald-500">+{formatCurrency(p.income)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="text-[10px] font-bold text-text-muted">Expense</span>
                                      <span className="text-sm font-black tabular-nums text-rose-500">−{formatCurrency(p.expense)}</span>
                                    </div>
                                  </div>
                                  <p className="text-[9px] font-bold text-primary mt-2">Tap or double‑click to open day</p>
                                </div>
                              );
                            }} />
                            <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} dot={false} name="Income" isAnimationActive={true} animationDuration={400} />
                            <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} dot={false} name="Expense" isAnimationActive={true} animationDuration={400} />
                          </RechartsLineChart>
                        ) : (
                          <AreaChart data={pulseChartData} margin={{ top: 8, right: 8, left: 4, bottom: 4 }} onClick={handlePulseDayOpen}>
                            <defs>
                              <linearGradient id="pulseGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.9} />
                                <stop offset="50%" stopColor="rgba(255,255,255,0.15)" stopOpacity={0.4} />
                                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.9} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="rgba(255,255,255,0.06)" />
                            <XAxis dataKey="name" tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.5)', angle: -90, textAnchor: 'end' }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} interval="preserveStartEnd" />
                            <YAxis tickCount={8} tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.5)' }} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} width={40} />
                            <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                            <Tooltip content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const p = payload[0]?.payload;
                              if (!p) return null;
                              return (
                                <div className="px-3 py-3 rounded-2xl bg-card border-2 border-card-border shadow-xl min-w-[160px]">
                                  <p className="text-[10px] font-black uppercase tracking-wider text-text-muted mb-2">{p.name}</p>
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="text-[10px] font-bold text-text-muted">Income</span>
                                      <span className="text-sm font-black tabular-nums text-emerald-500">+{formatCurrency(p.income)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="text-[10px] font-bold text-text-muted">Expense</span>
                                      <span className="text-sm font-black tabular-nums text-rose-500">−{formatCurrency(p.expense)}</span>
                                    </div>
                                  </div>
                                  <p className={`text-[10px] font-bold mt-2 pt-2 border-t border-card-border/50 ${p.isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    Net {p.isUp ? '+' : ''}{formatCurrency(p.net)} · Balance {formatCurrency(p.value)}
                                  </p>
                                  <p className="text-[9px] font-bold text-primary mt-1">Tap or double‑click to open day</p>
                                </div>
                              );
                            }} />
                            <Area type="monotone" dataKey="value" stroke="rgba(255,255,255,0.35)" strokeWidth={2} fill="url(#pulseGradient)" isAnimationActive={true} animationDuration={400} />
                          </AreaChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* Drill-Down Transaction List */}
              <AnimatePresence>
                {(selectedDay || selectedCat) && drillDownTxs.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 pt-3 border-t border-card-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">
                          {selectedDay && `Transactions on ${selectedDay.split('-').reverse().join('/')}`}
                          {selectedCat && `${selectedCat} transactions`}
                          {selectedDay && selectedCat && ` · ${selectedCat}`}
                        </p>
                        <button type="button" onClick={() => { setSelectedDay(null); setSelectedCat(null); }} className="text-[9px] font-bold text-primary uppercase">Clear</button>
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-hide">
                        {drillDownTxs.map((t, idx) => {
                          const cat = categories.find(c => c.name === t.category);
                          const catIdx = metrics.categoryKeys?.indexOf(t.category || 'Other') ?? -1;
                          const ccDisplay = getLinkedCCPaymentDisplay(t.id, billPayments, bills, accounts, creditCardPayments, creditCards, { transaction: t });
                          const displayDesc = ccDisplay ? ccDisplay.label : t.description;
                          return (
                            <motion.div
                              key={t.id}
                              initial={{ opacity: 1, x: 0 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.2 }}
                              className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-canvas-subtle/30 border border-transparent hover:border-primary/15 transition-all"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: catIdx >= 0 ? CAT_COLORS[catIdx % CAT_COLORS.length] : 'rgba(255,255,255,0.2)' }} />
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-text-main truncate" title={ccDisplay ? t.description : undefined}>{displayDesc}</p>
                                  <p className="text-[9px] font-semibold text-text-muted">{t.category}{!selectedDay && ` · ${t.date.split('-').reverse().join('/')}`}</p>
                                </div>
                              </div>
                              <span className={`text-xs font-black tabular-nums shrink-0 ${t.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {t.amount > 0 ? '+' : ''}{formatCurrency(t.amount)}
                              </span>
                              <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center text-sm shrink-0">{ccDisplay ? '💳' : (cat?.icon || '📦')}</div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </SectionCard>
            )}
            </ScrollReveal>

            {/* Insights Strip - Compact single row. Hidden on mobile for minimalism */}
            {!isMobile && (metrics.topCategory || metrics.dailyBurn > 0) && (
              <ScrollReveal>
              <div className="p-4 md:p-6 rounded-2xl bg-card border border-card-border flex flex-wrap items-center gap-4 md:gap-6">
                {metrics.topCategory && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
                      <TrendingDown size={18} className="text-rose-500" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase text-text-muted block">Top Spend</span>
                      <span className="text-sm font-black text-text-main truncate block">{metrics.topCategory[0]}</span>
                      <span className="text-xs font-bold text-primary">{formatCurrency(metrics.topCategory[1])}</span>
                    </div>
                  </div>
                )}
                {metrics.dailyBurn > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                      <Zap size={18} className="text-amber-500" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-text-muted block">Daily Burn</span>
                      <span className="text-base font-black text-text-main tabular-nums">{formatCurrency(metrics.dailyBurn)}</span>
                    </div>
                  </div>
                )}
              </div>
              </ScrollReveal>
            )}

            {/* Recent Activity */}
            <ScrollReveal>
            <SectionCard
              title="Recent Activity"
              subtitle="Latest transactions"
              action={
                <Link
                  to="/transactions"
                  className="w-9 h-9 rounded-lg border border-card-border flex items-center justify-center hover:bg-canvas-subtle transition-all text-text-main"
                >
                  <ArrowRight size={16} />
                </Link>
              }
            >
              <div className="space-y-3">
                {(isMobile ? metrics.recent.slice(0, 3) : metrics.recent).map((t, idx) => {
                  const cat = categories.find((c) => c.name === t.category);
                  const ccDisplay = getLinkedCCPaymentDisplay(t.id, billPayments, bills, accounts, creditCardPayments, creditCards, { transaction: t });
                  const displayDesc = ccDisplay ? ccDisplay.label : t.description;
                  return (
                    <motion.div
                      key={String(t.id)}
                      initial={{ opacity: 1, x: 0 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center justify-between gap-4 p-3 rounded-xl bg-canvas-subtle/30 border border-transparent hover:border-primary/15 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-text-main truncate" title={ccDisplay ? t.description : undefined}>{displayDesc}</p>
                          <p className="text-[10px] font-semibold text-text-muted uppercase">{t.category}</p>
                        </div>
                      </div>
                      <p
                        className={`text-sm font-black tabular-nums shrink-0 ${
                          t.amount > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {t.amount > 0 ? '+' : ''}
                        {formatCurrency(t.amount)}
                      </p>
                      <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center text-lg shrink-0">
                        {ccDisplay ? '💳' : (cat?.icon || '📦')}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </SectionCard>
            </ScrollReveal>
          </div>
        </PageLayout>
      </PullToRefresh>

      {/* Unified Pulse Zoom Modal */}
      <ChartZoomModal open={zoomChart === 'pulse'} onClose={() => { setZoomChart(null); setSelectedDay(null); setSelectedCat(null); }} title="Financial Pulse">
        <div className="h-full flex flex-col">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-6 mb-4">
            <div className="md:col-span-3 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-3">Spend by category</p>
              {metrics.rangeCatSpendSorted?.length > 0 ? (
                <div className="max-h-[320px] overflow-y-auto overflow-x-hidden scrollbar-hide rounded-2xl bg-white/5 border border-white/10 p-2 space-y-1.5">
                  {(() => {
                    const total = metrics.rangeCatSpendSorted.reduce((s, d) => s + d.value, 0);
                    const maxVal = Math.max(...metrics.rangeCatSpendSorted.map((d) => d.value), 1);
                    return metrics.rangeCatSpendSorted.map((item, idx) => {
                      const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0;
                      const barPct = maxVal > 0 ? (item.value / maxVal) * 100 : 0;
                      const cat = categories.find((c) => c.name === item.name);
                      const isSelected = selectedCat === item.name;
                      return (
                        <motion.button
                          key={item.name}
                          type="button"
                          initial={{ opacity: 1, x: 0 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2 }}
                          onClick={() => handleCatLegendClick(item.name)}
                          className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all border-2 ${isSelected ? 'border-primary bg-primary/20' : 'border-transparent bg-white/5 hover:bg-white/10'}`}
                        >
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0" style={{ backgroundColor: `${CAT_COLORS[idx % CAT_COLORS.length]}33`, border: `2px solid ${CAT_COLORS[idx % CAT_COLORS.length]}` }}>
                            {cat?.icon || '📦'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-black text-white truncate uppercase tracking-wide">{item.name}</p>
                            <div className="h-2 mt-1 rounded-full bg-white/10 overflow-hidden">
                              <motion.div className="h-full rounded-full" style={{ backgroundColor: CAT_COLORS[idx % CAT_COLORS.length] }} initial={{ width: 0 }} animate={{ width: `${barPct}%` }} transition={{ duration: 0.5, delay: idx * 0.03, ease: [0.22, 1, 0.36, 1] }} />
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-black tabular-nums text-white">{formatCurrency(item.value)}</p>
                            <p className="text-[10px] font-bold text-white/50">{pct}%</p>
                          </div>
                        </motion.button>
                      );
                    });
                  })()}
                </div>
              ) : <div className="h-32 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-white/40 uppercase tracking-wider">No spend in range</div>}
            </div>
            <div className="md:col-span-2 flex flex-col items-center justify-center">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-3">Income vs Expense</p>
              {((metrics.rangeIncome || 0) + (metrics.rangeExpense || 0)) > 0 ? (
                <div className="w-full max-w-[220px] aspect-square min-h-[180px] min-w-[140px] relative">
                  <ResponsiveContainer width="100%" height="100%" minWidth={120} minHeight={120}>
                    <PieChart>
                      <Pie data={[{ name: 'Income', value: metrics.rangeIncome || 0 }, { name: 'Expense', value: metrics.rangeExpense || 0 }].filter((d) => d.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="48%" outerRadius="88%" paddingAngle={3} stroke="rgba(0,0,0,0.3)" strokeWidth={2}>
                        {[{ name: 'Income', value: metrics.rangeIncome || 0 }, { name: 'Expense', value: metrics.rangeExpense || 0 }].filter((d) => d.value > 0).map((d) => (
                          <Cell key={d.name} fill={d.name === 'Income' ? INCOME_GREEN : EXPENSE_RED} />
                        ))}
                      </Pie>
                      <Tooltip content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const p = payload[0]?.payload;
                        const total = (metrics.rangeIncome || 0) + (metrics.rangeExpense || 0);
                        const pct = total > 0 ? ((p?.value ?? 0) / total * 100).toFixed(1) : 0;
                        return (
                          <div className="px-3 py-2.5 rounded-xl bg-white/10 border border-white/20">
                            <p className="text-[10px] font-bold text-white/60 uppercase">{p?.name}</p>
                            <p className={`text-base font-black ${p?.name === 'Income' ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(p?.value ?? 0)} <span className="text-xs text-white/50">({pct}%)</span></p>
                          </div>
                        );
                      }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/50">In vs Out</span>
                    <span className="text-xl font-black text-white tabular-nums">{formatCurrency((metrics.rangeIncome || 0) - (metrics.rangeExpense || 0))}</span>
                  </div>
                </div>
              ) : <div className="h-36 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-white/40 uppercase">No data</div>}
            </div>
          </div>

          {/* Pulse chart in modal – same view toggle (lines vs balance) */}
          {pulseChartData.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
                  Pulse · {pulseChartView === 'lines' ? 'Income vs Expense' : 'Running balance'}
                </p>
                <div className="flex rounded-lg bg-white/10 border border-white/20 p-0.5">
                  <button type="button" onClick={() => setPulseChartView('lines')} className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${pulseChartView === 'lines' ? 'bg-primary text-primary-foreground' : 'text-white/60 hover:text-white'}`}>In vs Out</button>
                  <button type="button" onClick={() => setPulseChartView('balance')} className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${pulseChartView === 'balance' ? 'bg-primary text-primary-foreground' : 'text-white/60 hover:text-white'}`}>Balance</button>
                </div>
              </div>
              <div className="overflow-x-auto overflow-y-hidden scrollbar-hide rounded-2xl bg-white/5 border border-white/10 p-2" style={{ maxWidth: '100%' }}>
                <div className="h-48 min-h-[160px]" style={{ minWidth: Math.max(pulseChartData.length * 24, 320), width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={320} minHeight={140}>
                    {pulseChartView === 'lines' ? (
                      <RechartsLineChart data={pulseChartData} margin={{ top: 8, right: 8, left: 4, bottom: 4 }} onClick={handlePulseDayOpen}>
                        <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="name" tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.55)', angle: -90, textAnchor: 'end' }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} interval="preserveStartEnd" />
                        <YAxis tickCount={8} tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.5)' }} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} width={42} />
                        <ReferenceLine y={0} stroke="rgba(255,255,255,0.25)" strokeDasharray="3 3" />
                        <Tooltip content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const p = payload[0]?.payload;
                          if (!p) return null;
                          return (
                            <div className="px-3 py-3 rounded-2xl bg-white/10 border-2 border-white/20 shadow-xl min-w-[160px]">
                              <p className="text-[10px] font-black uppercase tracking-wider text-white/60 mb-2">{p.name}</p>
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-[10px] font-bold text-white/60">Income</span>
                                  <span className="text-sm font-black tabular-nums text-emerald-400">+{formatCurrency(p.income)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-[10px] font-bold text-white/60">Expense</span>
                                  <span className="text-sm font-black tabular-nums text-rose-400">−{formatCurrency(p.expense)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        }} />
                        <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} dot={false} name="Income" isAnimationActive={true} animationDuration={400} />
                        <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} dot={false} name="Expense" isAnimationActive={true} animationDuration={400} />
                      </RechartsLineChart>
                    ) : (
                      <AreaChart data={pulseChartData} margin={{ top: 8, right: 8, left: 4, bottom: 4 }} onClick={handlePulseDayOpen}>
                        <defs>
                          <linearGradient id="pulseGradientModal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22c55e" stopOpacity={0.9} />
                            <stop offset="50%" stopColor="rgba(255,255,255,0.2)" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.9} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="name" tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.55)', angle: -90, textAnchor: 'end' }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} interval="preserveStartEnd" />
                        <YAxis tickCount={8} tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.5)' }} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} width={42} />
                        <ReferenceLine y={0} stroke="rgba(255,255,255,0.25)" strokeDasharray="3 3" />
                        <Tooltip content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const p = payload[0]?.payload;
                          if (!p) return null;
                          return (
                            <div className="px-3 py-3 rounded-2xl bg-white/10 border-2 border-white/20 shadow-xl min-w-[160px]">
                              <p className="text-[10px] font-black uppercase tracking-wider text-white/60 mb-2">{p.name}</p>
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-[10px] font-bold text-white/60">Income</span>
                                  <span className="text-sm font-black tabular-nums text-emerald-400">+{formatCurrency(p.income)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-[10px] font-bold text-white/60">Expense</span>
                                  <span className="text-sm font-black tabular-nums text-rose-400">−{formatCurrency(p.expense)}</span>
                                </div>
                              </div>
                              <p className={`text-[10px] font-bold mt-2 pt-2 border-t border-white/10 ${p.isUp ? 'text-emerald-400' : 'text-rose-400'}`}>Net {p.isUp ? '+' : ''}{formatCurrency(p.net)} · Balance {formatCurrency(p.value)}</p>
                            </div>
                          );
                        }} />
                        <Area type="monotone" dataKey="value" stroke="rgba(255,255,255,0.4)" strokeWidth={2} fill="url(#pulseGradientModal)" isAnimationActive={true} animationDuration={400} />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Zoom Drill-Down */}
          <AnimatePresence>
            {(selectedDay || selectedCat) && drillDownTxs.length > 0 && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-white/50">
                      {selectedDay && `Transactions on ${selectedDay.split('-').reverse().join('/')}`}
                      {selectedCat && !selectedDay && `${selectedCat} transactions`}
                      {selectedDay && selectedCat && ` · ${selectedCat}`}
                    </p>
                    <button type="button" onClick={() => { setSelectedDay(null); setSelectedCat(null); }} className="text-[9px] font-bold text-primary uppercase">Clear</button>
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-hide">
                    {drillDownTxs.map((t, idx) => {
                      const cat = categories.find(c => c.name === t.category);
                      const catIdx = metrics.categoryKeys?.indexOf(t.category || 'Other') ?? -1;
                      const ccDisplay = getLinkedCCPaymentDisplay(t.id, billPayments, bills, accounts, creditCardPayments, creditCards, { transaction: t });
                      const displayDesc = ccDisplay ? ccDisplay.label : t.description;
                      return (
                        <motion.div key={t.id} initial={{ opacity: 1, x: 0 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white/5 border border-transparent hover:border-primary/15 transition-all">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: catIdx >= 0 ? CAT_COLORS[catIdx % CAT_COLORS.length] : 'rgba(255,255,255,0.2)' }} />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate" title={ccDisplay ? t.description : undefined}>{displayDesc}</p>
                              <p className="text-[9px] font-semibold text-white/40">{t.category}{!selectedDay && ` · ${t.date.split('-').reverse().join('/')}`}</p>
                            </div>
                          </div>
                          <span className={`text-xs font-black tabular-nums shrink-0 ${t.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{t.amount > 0 ? '+' : ''}{formatCurrency(t.amount)}</span>
                          <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center text-sm shrink-0">{ccDisplay ? '💳' : (cat?.icon || '📦')}</div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ChartZoomModal>
    </>
  );
};

export default Dashboard;
