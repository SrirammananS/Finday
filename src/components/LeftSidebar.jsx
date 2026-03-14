import React, { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useFinance } from '../context/FinanceContext';
import { Activity, TrendingUp, TrendingDown, LayoutDashboard, FileText, Wallet, Users, CalendarClock, Tag, PieChart, Settings, CreditCard } from 'lucide-react';

const links = [
    { to: '/', icon: LayoutDashboard, label: 'Home' },
    { to: '/transactions', icon: FileText, label: 'Ledger' },
    { to: '/accounts', icon: Wallet, label: 'Wallets' },
    { to: '/credit-cards', icon: CreditCard, label: 'Cards' },
    { to: '/friends', icon: Users, label: 'Friends' },
    { to: '/bills', icon: CalendarClock, label: 'Recurring' },
    { to: '/categories', icon: Tag, label: 'Tags' },
    { to: '/insights', icon: PieChart, label: 'Insights' },
    { to: '/settings', icon: Settings, label: 'Settings' },
];

const formatCurrency = (value) => {
    if (typeof value !== 'number') return '₹0';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

const LeftSidebar = () => {
    const { accounts = [], secretUnlocked } = useFinance();

    const visibleAccounts = useMemo(() => accounts.filter(a => !a.isSecret || secretUnlocked), [accounts, secretUnlocked]);
    const totalAssets = useMemo(() => visibleAccounts.filter(a => a.type !== 'credit').reduce((s, a) => s + a.balance, 0), [visibleAccounts]);
    const totalDebt = useMemo(() => visibleAccounts.filter(a => a.type === 'credit').reduce((s, a) => s + Math.abs(a.balance), 0), [visibleAccounts]);

    return (
        <aside className="hidden lg:flex flex-col w-[260px] xl:w-[280px] shrink-0 border-r-2 border-card-border bg-card/60 backdrop-blur-xl shadow-[4px_0_24px_rgba(0,0,0,0.15)]">
            {/* Logo + Net Worth */}
            <div className="p-5 border-b border-card-border">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-primary/30 bg-black">
                        <img src="/logo192.png" alt="LAKSH" className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-text-main leading-none tracking-tight">LAKSH</h2>
                        <p className="text-[8px] font-bold text-text-muted uppercase tracking-[0.2em] mt-0.5 opacity-70">V3</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-widest text-text-muted">Net</span>
                    <span className="text-xl font-black tabular-nums text-text-main">
                        <span className="text-[var(--accent-gold)]">₹</span>
                        {formatCurrency(visibleAccounts.reduce((s, a) => s + a.balance, 0)).replace('₹', '')}
                    </span>
                </div>
            </div>

            {/* Portfolio */}
            <div className="p-3 border-t border-card-border">
                <div className="flex items-center gap-2 mb-2 opacity-80">
                    <Activity size={12} className="text-primary" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-text-muted">Portfolio</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-xl bg-primary/10 border border-primary/25">
                        <div className="flex items-center gap-1 mb-1">
                            <TrendingUp size={10} className="text-primary" />
                            <span className="text-xs font-black uppercase text-primary/90">Assets</span>
                        </div>
                        <p className="text-sm font-black text-text-main tabular-nums truncate" title={formatCurrency(totalAssets)}>{formatCurrency(totalAssets)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25">
                        <div className="flex items-center gap-1 mb-1">
                            <TrendingDown size={10} className="text-rose-500" />
                            <span className="text-xs font-black uppercase text-rose-400">Debt</span>
                        </div>
                        <p className="text-sm font-black text-text-main tabular-nums truncate" title={formatCurrency(totalDebt)}>{formatCurrency(totalDebt)}</p>
                    </div>
                </div>
            </div>

            {/* Navigation — Friends only when vault revealed (same as wallet hide) */}
            <nav className="flex flex-col gap-0.5 flex-1 overflow-y-auto p-3 min-h-0">
                {links.filter(link => link.to !== '/friends' || secretUnlocked).map(link => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) =>
                            `flex items-center gap-2.5 py-3 px-3 rounded-xl transition-all no-underline text-sm min-h-[44px]
                            ${isActive ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-canvas-subtle hover:text-text-main'}`
                        }
                    >
                        {({ isActive }) => {
                            const Icon = link.icon;
                            return (
                                <>
                                    <span className="w-[18px] h-[18px] flex items-center justify-center shrink-0">
                                        <Icon size={18} strokeWidth={2} />
                                    </span>
                                    <span className={`font-semibold tracking-tight flex-1 ${isActive ? 'text-primary' : ''}`}>{link.label}</span>
                                    {isActive && <motion.div layoutId="sidebar-dot" className="w-1.5 h-1.5 bg-primary rounded-full shrink-0" />}
                                </>
                            );
                        }}
                    </NavLink>
                ))}
            </nav>

            {/* Footer */}
            <div className="p-3 border-t border-card-border">
                <div className="flex items-center gap-2 px-3 py-2 bg-canvas-subtle/50 rounded-xl border border-card-border">
                    <div className="w-8 h-8 rounded-full bg-primary text-black flex items-center justify-center text-xs font-bold">PRO</div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold text-text-main truncate">Standard v1.2</p>
                        <p className="text-[8px] font-bold text-text-muted uppercase tracking-wider">Connected</p>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default LeftSidebar;
