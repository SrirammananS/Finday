import { useMemo } from 'react';
import { subDays, format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns';
import { expenseOnlyTransactions } from '../utils/transactionUtils';

/**
 * Computes income/expense trend data for a specific account or all accounts.
 * Excludes CC payment transactions from expense so wallet history graph does not double-count.
 * @param {Array} transactions - All transactions (filtered by visibility)
 * @param {string|null} accountId - Account ID to filter, or null for aggregate
 * @param {number} days - Number of days when using rolling window (default 14)
 * @param {Date|null} monthView - If set, return daily data for this calendar month
 * @param {{ start: Date, end: Date }|null} dateRange - If set, return daily data for this range (overrides monthView/days); used for CC bill cycle
 * @param {Set|undefined} linkedCCPaymentTxnIds - Optional. Transaction ids linked to CC bill payment (excluded from expense).
 * @returns {Array} Chart data: [{ name, date, income, expense, net }]
 */
export function useWalletChartData(transactions, accountId = null, days = 14, monthView = null, dateRange = null, linkedCCPaymentTxnIds = null) {
    return useMemo(() => {
        const filtered = !transactions?.length
            ? []
            : accountId
                ? transactions.filter((t) => t.accountId === accountId)
                : transactions;

        const toDayData = (start, end) => {
            const dayRange = eachDayOfInterval({ start, end });
            return dayRange.map((d) => {
                const dateStr = format(d, 'yyyy-MM-dd');
                const dayTxns = filtered.filter((t) => t.date === dateStr);
                const income = dayTxns.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
                const expenseTxns = expenseOnlyTransactions(dayTxns, linkedCCPaymentTxnIds);
                const expense = Math.abs(expenseTxns.reduce((sum, t) => sum + t.amount, 0));
                return {
                    name: format(d, 'd MMM'),
                    date: dateStr,
                    income,
                    expense,
                    net: income - expense,
                };
            });
        };

        if (dateRange?.start && dateRange?.end) {
            return toDayData(dateRange.start, dateRange.end);
        }
        if (monthView) {
            return toDayData(startOfMonth(monthView), endOfMonth(monthView));
        }

        const today = new Date();
        const emptyData = [];
        for (let i = days - 1; i >= 0; i--) {
            const d = subDays(today, i);
            emptyData.push({
                name: format(d, 'd MMM'),
                date: format(d, 'yyyy-MM-dd'),
                income: 0,
                expense: 0,
                net: 0,
            });
        }
        if (!filtered.length) return emptyData;

        return emptyData.map((row) => {
            const dayTxns = filtered.filter((t) => t.date === row.date);
            const income = dayTxns.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
            const expenseTxns = expenseOnlyTransactions(dayTxns, linkedCCPaymentTxnIds);
            const expense = Math.abs(expenseTxns.reduce((sum, t) => sum + t.amount, 0));
            return { ...row, income, expense, net: income - expense };
        });
    }, [transactions, accountId, days, monthView ? format(monthView, 'yyyy-MM') : null, dateRange ? format(dateRange.start, 'yyyy-MM-dd') + format(dateRange.end, 'yyyy-MM-dd') : null, linkedCCPaymentTxnIds]);
}

/**
 * Returns { start, end } for the credit card statement cycle that contains today, then applies offset.
 * Interval logic: cycle ends the day before next statement. In short months (e.g. Feb), statement day
 * is capped to last day of that month so 31 Jan → 28/29 Feb → 31 Mar doesn't break.
 * @param {number} billingDay - Statement date (1–31)
 * @param {number} cycleOffset - 0 = current cycle, -1 = previous, 1 = next
 */
export function getCycleRange(billingDay, cycleOffset = 0) {
    const day = Math.min(Math.max(1, parseInt(billingDay, 10) || 1), 31);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const lastDayThisMonth = new Date(year, month + 1, 0).getDate();
    const effectiveDayThisMonth = Math.min(day, lastDayThisMonth);
    let cycleStart;
    if (now.getDate() >= effectiveDayThisMonth) {
        cycleStart = new Date(year, month, effectiveDayThisMonth);
    } else {
        cycleStart = new Date(year, month - 1, day);
        if (cycleStart.getMonth() !== month - 1) {
            cycleStart = new Date(year, month, 0);
        }
    }
    if (cycleOffset !== 0) {
        cycleStart = addMonths(cycleStart, cycleOffset);
    }
    const cycleEnd = subDays(addMonths(cycleStart, 1), 1);
    return { start: cycleStart, end: cycleEnd };
}
