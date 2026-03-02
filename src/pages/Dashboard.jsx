import React, { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageLayout from '../components/PageLayout';
import { RefreshCw, ArrowRight, TrendingUp, TrendingDown, Zap, Wallet, PieChart as PieChartIcon } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';
import { ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import PullToRefresh from '../components/PullToRefresh';
import SkeletonDashboard from '../components/skeletons/SkeletonDashboard';
import WalletCard from '../components/WalletCard';
import ConnectionButton from '../components/ConnectionButton';
import StatCard from '../components/ui/StatCard';
import SectionCard from '../components/ui/SectionCard';
import ScrollReveal from '../components/ui/ScrollReveal';
import ParticleField from '../components/ui/ParticleField';

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
  const {
    accounts = [],
    transactions = [],
    categories = [],
    isLoading,
    isSyncing,
    forceSync,
    refreshData,
    friends = [],
    secretUnlocked,
  } = useFinance();

  const [chartRangeDays, setChartRangeDays] = useState(30);
  const isMobile = useIsMobile();
  const [heroExpanded, setHeroExpanded] = useState(false);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [nodesExpanded, setNodesExpanded] = useState(false);
  const [spendingExpanded, setSpendingExpanded] = useState(false);
  const [cashFlowExpanded, setCashFlowExpanded] = useState(false);

  const formatCurrency = (value) => {
    if (typeof value !== 'number') return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

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
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const thisMonthTxs = visibleTransactions.filter((t) => t.date >= thisMonthStart && t.date <= thisMonthEnd);
    const incomeThisMonth = thisMonthTxs.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const expenseThisMonth = Math.abs(thisMonthTxs.filter((t) => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));

    const totalIncome = visibleTransactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = Math.abs(visibleTransactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));
    const total = visibleAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const totalAssets = visibleAccounts.filter((a) => a.type !== 'credit').reduce((sum, a) => sum + a.balance, 0);
    const totalDebt = visibleAccounts.filter((a) => a.type === 'credit').reduce((sum, a) => sum + a.balance, 0);

    const recent = [...visibleTransactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);

    const chartDays = Math.min(Math.max(chartRangeDays, 7), 30);
    const dateRange = [...Array(chartDays)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (chartDays - 1 - i));
      return d.toISOString().split('T')[0];
    });

    const fluxPulse = dateRange.map((date) => {
      const dayTxs = visibleTransactions.filter((t) => t.date === date);
      const dayIn = dayTxs.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
      const dayOut = Math.abs(dayTxs.filter((t) => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));
      return {
        name: new Date(date).toLocaleDateString('en-IN', { day: 'numeric' }),
        income: dayIn,
        expense: dayOut,
      };
    });

    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100).toFixed(0) : 0;
    const catSpend = {};
    thisMonthTxs.filter((t) => t.amount < 0).forEach((t) => {
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
    const catSpendByDate = dateRange.map((date) => {
      const dayTxs = visibleTransactions.filter((t) => t.date === date && t.amount < 0);
      const row = { name: new Date(date).toLocaleDateString('en-IN', { day: 'numeric' }), date };
      dayTxs.forEach((t) => {
        const cat = t.category || 'Other';
        row[cat] = (row[cat] || 0) + Math.abs(t.amount);
      });
      return row;
    });
    const categoryKeys = [...new Set(catSpendByDate.flatMap((r) => Object.keys(r).filter((k) => k !== 'name' && k !== 'date')))].slice(0, 6);

    return {
      incomeThisMonth,
      expenseThisMonth,
      netThisMonth: incomeThisMonth - expenseThisMonth,
      total,
      totalAssets,
      totalDebt,
      recent: recentLimited,
      fluxPulse,
      totalOwedToYou,
      totalYouOwe,
      savingsRate,
      topCategory,
      dailyBurn,
      catSpendSorted,
      catSpendByDate,
      categoryKeys,
    };
  }, [visibleTransactions, visibleAccounts, friends, chartRangeDays]);

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
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">Net Worth</span>
                  <h1 className="text-2xl md:text-3xl font-black tabular-nums text-text-main">
                    <span className="text-primary">₹</span>
                    {formatCurrency(metrics.total).replace('₹', '')}
                  </h1>
                  {/* Aggregate drill-down: Assets | Debt - hidden on mobile when collapsed */}
                  {(!isMobile || heroExpanded) && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs font-bold">
                      <span className="text-primary">Assets {formatCurrency(metrics.totalAssets)}</span>
                      <span className="text-rose-500">Debt {formatCurrency(metrics.totalDebt)}</span>
                    </div>
                  )}
                  <p className="text-sm font-bold text-text-muted mt-1">
                    {parseFloat(metrics.savingsRate) >= 20
                      ? "You're on track"
                      : metrics.expenseThisMonth > 0 && metrics.incomeThisMonth > 0
                        ? `Spend is ${Math.round((metrics.expenseThisMonth / metrics.incomeThisMonth) * 100)}% of income this month`
                        : 'Add transactions to see insights'}
                  </p>
                  {isMobile && (
                    <button
                      type="button"
                      onClick={() => setHeroExpanded((e) => !e)}
                      className="flex items-center gap-1 mt-2 text-xs font-bold text-primary"
                    >
                      {heroExpanded ? 'Details ▲' : 'Details ▼'}
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

          {/* Quick Stats - This month at a glance */}
          <ScrollReveal variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, staggerChildren: 0.06 } } }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard
              label="Income (This Month)"
              value={formatCurrency(metrics.incomeThisMonth)}
              icon={TrendingUp}
              variant="income"
            />
            <StatCard
              label="Expense (This Month)"
              value={formatCurrency(metrics.expenseThisMonth)}
              icon={TrendingDown}
              variant="expense"
            />
            {(!isMobile || statsExpanded) && (
              <>
                <StatCard
                  label="Net Flow"
                  value={`${metrics.netThisMonth >= 0 ? '+' : ''}${formatCurrency(metrics.netThisMonth)}`}
                  subtext="This month"
                  icon={Wallet}
                  variant={metrics.netThisMonth >= 0 ? 'primary' : 'expense'}
                />
                <StatCard
                  label="High Expense Categories"
                  value={metrics.catSpendSorted[0]?.name || '—'}
                  subtext={metrics.catSpendSorted[0] ? `${formatCurrency(metrics.catSpendSorted[0].value)}` : 'Add transactions'}
                  icon={PieChartIcon}
                  variant="neutral"
                />
              </>
            )}
            </div>
            {isMobile && (
              <button
                type="button"
                onClick={() => setStatsExpanded((e) => !e)}
                className="text-xs font-bold text-primary mb-6"
              >
                {statsExpanded ? 'Show less' : 'Show more'}
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
                    <span className="text-text-main">{formatCurrency(metrics.total)} net</span>
                  </span>
                  <span className="text-text-muted">›</span>
                </button>
              ) : (
                <>
                  {isMobile && nodesExpanded && (
                    <button
                      type="button"
                      onClick={() => setNodesExpanded(false)}
                      className="flex items-center gap-1 mb-2 text-xs font-bold text-primary"
                    >
                      ▲ Collapse
                    </button>
                  )}
                  {/* Always horizontal scroll for 15+ wallets — sorted by latest transaction */}
                  <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 scroll-snap-x px-1">
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
                    {sortedAccounts.map((acc) => (
                      <div key={acc.id} className="flex-none scroll-snap-start">
                        <WalletCard account={acc} transactions={visibleTransactions} />
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
                </>
              )}
            </ScrollReveal>

            {/* Spending by Category — horizontal bar chart. Mobile: collapsed by default */}
            <ScrollReveal>
            {isMobile && !spendingExpanded ? (
              <button
                type="button"
                onClick={() => setSpendingExpanded(true)}
                className="w-full p-4 rounded-2xl border border-card-border bg-card/80 flex justify-between items-center text-left hover:border-primary/40 transition-all"
              >
                <span className="text-sm font-bold">Spending by Category</span>
                <span className="text-xs text-text-muted">Tap to expand</span>
              </button>
            ) : (
            <SectionCard
              title="Spending by Category"
              subtitle="Category spend over time"
              action={isMobile ? <button type="button" onClick={() => setSpendingExpanded(false)} className="text-xs text-primary font-bold">▲ Collapse</button> : undefined}
            >
              {metrics.catSpendByDate?.length > 0 && metrics.categoryKeys?.length > 0 ? (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-3">
                    Category spend over last {chartRangeDays} days
                  </p>
                  <div className="min-h-[280px]" aria-label="Spending by category over time">
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={metrics.catSpendByDate} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" opacity={0.5} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 12, fontWeight: 600, fill: 'var(--text-muted)' }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 12, fontWeight: 600, fill: 'var(--text-muted)' }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
                        />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null;
                            return (
                              <div className="px-4 py-3 rounded-xl bg-black/90 backdrop-blur-md border border-primary/20 shadow-xl" role="tooltip">
                                <p className="text-xs font-bold text-white/80 mb-2">Day {label}</p>
                                {payload.map((p, i) => (
                                  <p key={p.dataKey} className="text-sm font-bold text-white flex gap-2">
                                    <span style={{ color: p.color }}>●</span> {p.name}: {formatCurrency(p.value)}
                                  </p>
                                ))}
                              </div>
                            );
                          }}
                        />
                        {metrics.categoryKeys.map((key, idx) => (
                          <Line
                            key={key}
                            type="monotone"
                            dataKey={key}
                            name={key}
                            stroke={['#00E676', '#f43f5e', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'][idx % 6]}
                            strokeWidth={2}
                            dot={false}
                            connectNulls
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="py-12 px-4 rounded-2xl bg-canvas-subtle/30 border border-dashed border-card-border text-center">
                  <PieChartIcon size={32} className="mx-auto text-text-muted/30 mb-3" aria-hidden />
                  <p className="text-sm font-bold text-text-muted mb-4">Add transactions to see breakdown</p>
                  <Link
                    to="/transactions"
                    className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
                  >
                    Add Transaction
                  </Link>
                </div>
              )}
            </SectionCard>
            )}
            </ScrollReveal>

            {/* Cash Flow Chart - Mobile: collapsed by default */}
            <ScrollReveal>
            {isMobile && !cashFlowExpanded ? (
              <button
                type="button"
                onClick={() => setCashFlowExpanded(true)}
                className="w-full p-4 rounded-2xl border border-card-border bg-card/80 flex justify-between items-center text-left hover:border-primary/40 transition-all"
              >
                <span className="text-sm font-bold">Cash Flow</span>
                <span className="text-xs text-text-muted">Tap to expand</span>
              </button>
            ) : (
            <SectionCard
              title="Cash Flow"
              action={
                <div className="flex items-center gap-2">
                  {isMobile && <button type="button" onClick={() => setCashFlowExpanded(false)} className="text-xs text-primary font-bold mr-2">▲</button>}
                  <div className="flex items-center gap-2">
                  {[7, 14, 30].map((d) => (
                    <button
                      key={d}
                      onClick={() => setChartRangeDays(d)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                        chartRangeDays === d ? 'bg-primary text-primary-foreground' : 'bg-canvas-subtle text-text-muted hover:text-text-main'
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                  <div className="flex gap-2 ml-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      In
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-500">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      Out
                    </div>
                  </div>
                  </div>
                </div>
              }
            >
              <div className="h-44 md:h-64 -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.fluxPulse}>
                    <defs>
                      <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00E676" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#00E676" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }} />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.9)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(0,230,118,0.2)',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                      itemStyle={{ color: '#fff' }}
                      labelStyle={{ color: 'rgba(255,255,255,0.8)' }}
                    />
                    <Area type="monotone" dataKey="income" stroke="#00E676" strokeWidth={2} fillOpacity={1} fill="url(#colorIn)" />
                    <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorOut)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
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
                  return (
                    <motion.div
                      key={String(t.id)}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.03 * idx }}
                      className="flex items-center justify-between gap-4 p-3 rounded-xl bg-canvas-subtle/30 border border-transparent hover:border-primary/15 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center text-lg shrink-0">
                          {cat?.icon || '📦'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-text-main truncate">{t.description}</p>
                          <p className="text-[10px] font-semibold text-text-muted uppercase">{t.category}</p>
                        </div>
                      </div>
                      <p
                        className={`text-sm font-black tabular-nums shrink-0 ${
                          t.amount > 0 ? 'text-primary' : 'text-text-main'
                        }`}
                      >
                        {t.amount > 0 ? '+' : ''}
                        {formatCurrency(t.amount)}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            </SectionCard>
            </ScrollReveal>
          </div>
        </PageLayout>
      </PullToRefresh>
    </>
  );
};

export default Dashboard;
