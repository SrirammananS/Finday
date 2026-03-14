import { useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { sheetsService } from '../services/sheets';
import { localDB } from '../services/localDB';
import { logger } from '../utils/logger';

import { generateShortId } from '../utils/generateId';

const generateId = () => generateShortId();

/**
 * Bill CRUD actions. Extracted from FinanceContext for modularity.
 */
export function useBillActions({
    bills,
    billPayments,
    transactions,
    accounts,
    categories,
    config,
    setBills,
    setBillPayments,
    setIsSyncing,
    setLastSyncTime
}) {
    const addBill = useCallback(async (data) => {
        const bill = { id: generateId(), ...data };
        const newBills = [bill, ...bills];
        setBills(newBills);
        localDB.saveData({ transactions, accounts, categories, bills: newBills });

        if (!config.spreadsheetId) return bill;

        setIsSyncing(true);
        try {
            await sheetsService.addBill(config.spreadsheetId, bill);
            setLastSyncTime(new Date());
            return bill;
        } catch (err) {
            setBills(prev => prev.filter(b => b.id !== bill.id));
            throw err;
        } finally {
            setIsSyncing(false);
        }
    }, [bills, transactions, accounts, categories, config, setBills, setIsSyncing, setLastSyncTime]);

    const updateBill = useCallback(async (billId, updates) => {
        const newBills = bills.map(b => b.id === billId ? { ...b, ...updates } : b);

        const newPayments = billPayments.map(p => {
            if (p.billId === billId && p.status === 'pending') {
                const meshDate = parseISO(p.dueDate);
                return {
                    ...p,
                    amount: updates.amount !== undefined ? parseFloat(updates.amount) : p.amount,
                    name: updates.name !== undefined ? `${updates.name} - ${format(meshDate, 'MMM yy')}` : p.name
                };
            }
            return p;
        });

        setBills(newBills);
        setBillPayments(newPayments);
        localDB.saveData({ transactions, accounts, categories, bills: newBills, billPayments: newPayments });

        if (!config.spreadsheetId) return;

        setIsSyncing(true);
        try {
            await sheetsService.updateBill(config.spreadsheetId, billId, updates);

            for (const p of newPayments.filter(p => p.billId === billId && p.status === 'pending')) {
                await sheetsService.updateBillPayment(config.spreadsheetId, p.id, {
                    amount: p.amount,
                    name: p.name
                });
            }

            setLastSyncTime(new Date());
        } catch (err) {
            logger.error('updateBill failed:', err);
        } finally {
            setIsSyncing(false);
        }
    }, [
        bills, billPayments, transactions, accounts, categories, config,
        setBills, setBillPayments, setIsSyncing, setLastSyncTime
    ]);

    const updateBillPayment = useCallback(async (paymentId, updates, paymentsOverride) => {
        const base = paymentsOverride ?? billPayments;
        const newPayments = base.map(p => p.id === paymentId ? { ...p, ...updates } : p);
        setBillPayments(newPayments);
        localDB.saveData({ transactions, accounts, categories, bills, billPayments: newPayments });

        if (!config.spreadsheetId) return;

        setIsSyncing(true);
        try {
            await sheetsService.updateBillPayment(config.spreadsheetId, paymentId, updates);
            setLastSyncTime(new Date());
        } catch (err) {
            logger.error('updateBillPayment failed:', err);
            throw err;
        } finally {
            setIsSyncing(false);
        }
    }, [billPayments, config.spreadsheetId, transactions, accounts, categories, bills, setBillPayments, setIsSyncing, setLastSyncTime]);

    const deleteBill = useCallback(async (billId) => {
        const bill = bills.find(b => b.id === billId);
        const newBills = bills.filter(b => b.id !== billId);

        const paymentsToDelete = billPayments.filter(p => p.billId === billId && p.status === 'pending');
        const newPayments = billPayments.filter(p => !(p.billId === billId && p.status === 'pending'));

        setBills(newBills);
        setBillPayments(newPayments);
        localDB.saveData({ transactions, accounts, categories, bills: newBills, billPayments: newPayments });

        if (!config.spreadsheetId) return;

        setIsSyncing(true);
        try {
            await sheetsService.deleteBill(config.spreadsheetId, billId);

            for (const p of paymentsToDelete) {
                await sheetsService.deleteBillPayment(config.spreadsheetId, p.id);
            }

            setLastSyncTime(new Date());
        } catch (err) {
            logger.error('deleteBill failed:', err);
            setBills(prev => [...prev, bill]);
        } finally {
            setIsSyncing(false);
        }
    }, [
        bills, billPayments, transactions, accounts, categories, config,
        setBills, setBillPayments, setIsSyncing, setLastSyncTime
    ]);

    const repairBills = useCallback(async () => {
        if (!config.spreadsheetId) return { fixed: 0 };

        const creditAccountIds = new Set(
            accounts.filter(a => a.type === 'credit').map(a => a.id)
        );
        let fixedCount = 0;

        setIsSyncing(true);
        try {
            const repairedBills = bills.map(b => {
                const shouldBeCC = creditAccountIds.has(b.accountId);
                const isCC = b.billType === 'credit_card';
                if (shouldBeCC && !isCC) {
                    fixedCount++;
                    return { ...b, billType: 'credit_card' };
                }
                if (!shouldBeCC && isCC && !b.accountId) {
                    fixedCount++;
                    return { ...b, billType: 'recurring' };
                }
                return b;
            });

            if (fixedCount > 0) {
                setBills(repairedBills);
                localDB.saveData({ transactions, accounts, categories, bills: repairedBills, billPayments });

                for (const b of repairedBills) {
                    const orig = bills.find(o => o.id === b.id);
                    if (orig && orig.billType !== b.billType) {
                        await sheetsService.updateBill(config.spreadsheetId, b.id, { billType: b.billType });
                    }
                }
                setLastSyncTime(new Date());
            }

            return { fixed: fixedCount };
        } catch (err) {
            logger.error('repairBills failed:', err);
            return { fixed: 0, error: err.message };
        } finally {
            setIsSyncing(false);
        }
    }, [bills, accounts, billPayments, transactions, categories, config, setBills, setIsSyncing, setLastSyncTime]);

    return { addBill, updateBill, updateBillPayment, deleteBill, repairBills };
}
