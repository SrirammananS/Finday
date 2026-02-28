import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';

const formatCurrency = (value) => {
    if (typeof value !== 'number') return '₹0';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

const RightSidebar = () => {
    const { billPayments = [] } = useFinance();

    const upcomingBills = useMemo(() => {
        return (billPayments || [])
            .filter(p => p.status === 'pending')
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, 5);
    }, [billPayments]);

    return (
        <aside className="hidden lg:flex flex-col w-[280px] xl:w-[300px] shrink-0 border-l-2 border-card-border bg-card/60 backdrop-blur-xl overflow-y-auto shadow-[-4px_0_24px_rgba(0,0,0,0.15)]">
            <div className="p-4 md:p-6 border-b border-card-border">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Upcoming</span>
                    <Link to="/bills" className="text-[10px] font-black text-primary uppercase hover:underline">All</Link>
                </div>
            </div>
            <div className="p-4 md:p-6 space-y-3 flex-1 min-h-0">
                {upcomingBills.length > 0 ? (
                    upcomingBills.map(bill => {
                        const dueDay = bill.dueDate ? new Date(bill.dueDate).getDate() : 0;
                        const isUrgent = Math.abs(dueDay - new Date().getDate()) <= 2;
                        return (
                            <div
                                key={bill.id}
                                className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${
                                    isUrgent ? 'border-rose-500/30 bg-rose-500/5' : 'border-card-border bg-canvas-subtle/50 hover:border-primary/20'
                                }`}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    {isUrgent && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />}
                                    <span className="text-sm font-bold text-text-main truncate">{bill.name}</span>
                                </div>
                                <span className="text-sm font-bold text-[var(--accent-gold)] shrink-0 ml-2">{formatCurrency(bill.amount)}</span>
                            </div>
                        );
                    })
                ) : (
                    <p className="text-xs text-text-muted py-4 text-center">No upcoming bills</p>
                )}
            </div>
        </aside>
    );
};

export default RightSidebar;
