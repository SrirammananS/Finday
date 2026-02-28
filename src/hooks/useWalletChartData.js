import { useMemo } from 'react';
import { subDays, format } from 'date-fns';

/**
 * Computes income/expense trend data for a specific account or all accounts.
 * Memoized for performance - only recomputes when transactions or accountId changes.
 * @param {Array} transactions - All transactions (filtered by visibility)
 * @param {string|null} accountId - Account ID to filter, or null for aggregate
 * @param {number} days - Number of days to include (default 14)
 * @returns {Array} Chart data: [{ name, date, income, expense, net }]
 */
export function useWalletChartData(transactions, accountId = null, days = 14) {
    return useMemo(() => {
        if (!transactions || transactions.length === 0) {
            const emptyData = [];
            const today = new Date();
            for (let i = days - 1; i >= 0; i--) {
                const d = subDays(today, i);
                emptyData.push({
                    name: format(d, 'd'),
                    date: format(d, 'yyyy-MM-dd'),
                    income: 0,
                    expense: 0,
                    net: 0,
                });
            }
            return emptyData;
        }

        const filtered = accountId
            ? transactions.filter((t) => t.accountId === accountId)
            : transactions;

        const chartData = [];

        for (let i = days - 1; i >= 0; i--) {
            const d = subDays(new Date(), i);
            const dateStr = format(d, 'yyyy-MM-dd');
            const dayTxns = filtered.filter((t) => t.date === dateStr);

            const income = dayTxns
                .filter((t) => t.amount > 0)
                .reduce((sum, t) => sum + t.amount, 0);
            const expense = Math.abs(
                dayTxns
                    .filter((t) => t.amount < 0)
                    .reduce((sum, t) => sum + t.amount, 0)
            );

            chartData.push({
                name: format(d, 'd'),
                date: dateStr,
                income,
                expense,
                net: income - expense,
            });
        }

        return chartData;
    }, [transactions, accountId, days]);
}
