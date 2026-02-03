import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Target, Calendar, PieChart } from 'lucide-react';

const TransactionInsights = ({ transactions, categories }) => {
    const insights = useMemo(() => {
        if (!transactions.length) return null;

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        // This month vs last month
        const thisMonthTxns = transactions.filter(t => {
            const date = new Date(t.date);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });

        const lastMonthTxns = transactions.filter(t => {
            const date = new Date(t.date);
            return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
        });

        const thisMonthExpenses = thisMonthTxns
            .filter(t => t.amount < 0)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const lastMonthExpenses = lastMonthTxns
            .filter(t => t.amount < 0)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const expenseChange = lastMonthExpenses === 0 ? 0 :
            ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100;

        // Most frequent category
        const categoryCount = thisMonthTxns.reduce((acc, t) => {
            if (t.category) {
                acc[t.category] = (acc[t.category] || 0) + 1;
            }
            return acc;
        }, {});

        const topCategory = Object.entries(categoryCount)
            .sort(([, a], [, b]) => b - a)[0];

        // Average transaction amount
        const avgTransaction = thisMonthTxns.length > 0 ?
            thisMonthTxns.reduce((sum, t) => sum + Math.abs(t.amount), 0) / thisMonthTxns.length : 0;

        // Biggest expense this month
        const biggestExpense = thisMonthTxns
            .filter(t => t.amount < 0)
            .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))[0];

        return {
            expenseChange,
            thisMonthExpenses,
            lastMonthExpenses,
            topCategory: topCategory ? {
                name: topCategory[0],
                count: topCategory[1],
                icon: categories.find(c => c.name === topCategory[0])?.icon || '📦'
            } : null,
            avgTransaction,
            biggestExpense,
            transactionCount: thisMonthTxns.length
        };
    }, [transactions, categories]);

    if (!insights) return null;

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(Math.abs(amount) || 0);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-6">
                <PieChart size={20} className="text-primary" />
                <h3 className="text-lg font-bold text-text-main">Monthly Insights</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Spending Trend */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="modern-card p-4 border-card-border bg-card/80 backdrop-blur-sm hover:bg-card transition-all"
                >
                    <div className="flex items-center gap-3 mb-2">
                        {insights.expenseChange >= 0 ? (
                            <TrendingUp size={16} className="text-red-500" />
                        ) : (
                            <TrendingDown size={16} className="text-green-500" />
                        )}
                        <span className="text-xs font-bold uppercase tracking-widest text-text-muted/90">
                            Spending Trend
                        </span>
                    </div>
                    <p className={`text-xl font-black ${insights.expenseChange >= 0 ? 'text-red-500' : 'text-green-500'
                        }`}>
                        {insights.expenseChange >= 0 ? '+' : ''}{insights.expenseChange.toFixed(1)}%
                    </p>
                    <p className="text-xs text-text-muted/80 mt-1">
                        vs last month
                    </p>
                </motion.div>

                {/* Top Category */}
                {insights.topCategory && (
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="modern-card p-4 border-card-border bg-card/80 backdrop-blur-sm hover:bg-card transition-all"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-lg">{insights.topCategory.icon}</span>
                            <span className="text-xs font-bold uppercase tracking-widest text-text-muted/90">
                                Top Category
                            </span>
                        </div>
                        <p className="text-base font-black text-text-main truncate">
                            {insights.topCategory.name}
                        </p>
                        <p className="text-xs text-text-muted/80 mt-1">
                            {insights.topCategory.count} transactions
                        </p>
                    </motion.div>
                )}

                {/* Average Transaction */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="modern-card p-4 border-card-border bg-card/80 backdrop-blur-sm hover:bg-card transition-all"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <Target size={16} className="text-primary" />
                        <span className="text-xs font-bold uppercase tracking-widest text-text-muted/90">
                            Avg Transaction
                        </span>
                    </div>
                    <p className="text-lg font-black text-text-main">
                        {formatCurrency(insights.avgTransaction)}
                    </p>
                    <p className="text-xs text-text-muted/80 mt-1">
                        {insights.transactionCount} this month
                    </p>
                </motion.div>

                {/* Biggest Expense */}
                {insights.biggestExpense && (
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="modern-card p-4 border-card-border bg-card/80 backdrop-blur-sm hover:bg-card transition-all"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <Calendar size={16} className="text-destructive" />
                            <span className="text-xs font-bold uppercase tracking-widest text-text-muted/90">
                                Biggest Expense
                            </span>
                        </div>
                        <p className="text-lg font-black text-destructive">
                            {formatCurrency(insights.biggestExpense.amount)}
                        </p>
                        <p className="text-xs text-text-muted/80 mt-1 truncate">
                            {insights.biggestExpense.description}
                        </p>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default TransactionInsights;