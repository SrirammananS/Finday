import { useCallback } from 'react';
import { sheetsService } from '../services/sheets';
import { localDB } from '../services/localDB';
import { logger } from '../utils/logger';
import { generateShortId } from '../utils/generateId';
import { detectTransactionSource } from '../utils/detectSource';

/**
 * Transaction CRUD actions. Extracted from FinanceContext for modularity.
 * @param {Object} params - State and setters from FinanceProvider
 */
export function useTransactionActions({
    transactions,
    accounts,
    categories,
    bills,
    closedPeriods,
    config,
    setTransactions,
    setAccounts,
    setBills,
    setIsSyncing,
    setLastSyncTime,
    setError,
    toast,
    ensureSheetsReady
}) {
    const addTransaction = useCallback(async (data) => {
        const periodKey = data.date.substring(0, 7);
        if (closedPeriods.includes(periodKey)) {
            toast('This period is closed. Further modifications are not allowed.', 'error');
            return null;
        }

        const transaction = {
            id: generateShortId(),
            ...data,
            amount: data.type === 'income' ? Math.abs(data.amount) : -Math.abs(data.amount),
            source: ['pwa', 'mobile', 'web'].includes(data?.source) ? data.source : detectTransactionSource()
        };

        const newTransactions = [{ ...transaction, synced: false }, ...transactions];
        setTransactions(newTransactions);

        let newAccounts = [...accounts];
        if (data.accountId) {
            newAccounts = newAccounts.map(a => {
                if (a.id === data.accountId) {
                    return { ...a, balance: a.balance + transaction.amount };
                }
                return a;
            });
            setAccounts(newAccounts);
        }

        try {
            await localDB.saveData({
                transactions: newTransactions,
                accounts: newAccounts,
                categories,
                bills
            });
        } catch (e) {
            logger.warn('Local save failed:', e);
        }

        if (!config.spreadsheetId) {
            toast('Transaction saved locally. Connect Sheet to sync.', 'info');
            return transaction;
        }

        setIsSyncing(true);
        try {
        let lastError;
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                await ensureSheetsReady();
                await sheetsService.addTransaction(config.spreadsheetId, transaction);
                setTransactions(prev => prev.map(t => t.id === transaction.id ? { ...t, synced: true } : t));
                setLastSyncTime(new Date());

                if (data.accountId) {
                    const account = accounts.find(a => a.id === data.accountId);
                    if (account) {
                    const newBalance = account.balance + transaction.amount;
                    try {
                        await sheetsService.updateAccount(config.spreadsheetId, data.accountId, { balance: newBalance });
                    } catch (accError) {
                        logger.warn('Failed to sync account balance, will retry on next sync', accError);
                    }

                    if (data.billId) {
                        const matchedBill = bills.find(b => b.id === data.billId);
                        if (matchedBill) {
                            await sheetsService.updateBill(config.spreadsheetId, data.billId, { status: 'paid' });
                            setBills(prev => prev.map(b => b.id === data.billId ? { ...b, status: 'paid' } : b));
                            toast(`Bill "${matchedBill.name}" marked as paid ✓`);
                        }
                    }

                    if (data.linkedAccountId) {
                        const ccAccount = accounts.find(a => a.id === data.linkedAccountId);
                        if (ccAccount && ccAccount.type === 'credit') {
                            const newCCBalance = ccAccount.balance + Math.abs(transaction.amount);
                            await sheetsService.updateAccount(config.spreadsheetId, ccAccount.id, { balance: newCCBalance });
                            setAccounts(prev => prev.map(a => a.id === ccAccount.id ? { ...a, balance: newCCBalance } : a));
                            toast(`Updated ${ccAccount.name} balance`);

                            const ccBill = bills.find(b =>
                                (b.accountId === ccAccount.id || b.billAccountId === ccAccount.id) &&
                                b.status !== 'paid' &&
                                Math.abs(parseFloat(b.amount) - Math.abs(transaction.amount)) < 100
                            );
                            if (ccBill) {
                                await sheetsService.updateBill(config.spreadsheetId, ccBill.id, { status: 'paid' });
                                setBills(prev => prev.map(b => b.id === ccBill.id ? { ...b, status: 'paid' } : b));
                                toast(`Linked Bill "${ccBill.name}" marked as paid ✓`);
                            }
                        }
                    }

                    if (!data.billId && !data.linkedAccountId) {
                        if (transaction.type === 'expense') {
                            const txAmount = Math.abs(transaction.amount);
                            const txDesc = transaction.description.toLowerCase();
                            const matchedBill = bills.find(b => {
                                if (b.status === 'paid') return false;
                                const billAmount = parseFloat(b.amount);
                                const amountMatch = Math.abs(billAmount - txAmount) < 2;
                                const nameMatch = txDesc.includes(b.name.toLowerCase());
                                return amountMatch && nameMatch;
                            });
                            if (matchedBill) {
                                try {
                                    await sheetsService.updateBill(config.spreadsheetId, matchedBill.id, { status: 'paid' });
                                    setBills(prev => prev.map(b => b.id === matchedBill.id ? { ...b, status: 'paid' } : b));
                                    toast(`Auto-marked Bill "${matchedBill.name}" as paid ✓`);
                                } catch (e) {
                                    logger.warn('Failed to auto-mark bill', e);
                                }
                            }
                        }

                        const isCCPayment =
                            (transaction.type === 'expense' || transaction.type === 'transfer') &&
                            (transaction.description.toLowerCase().includes('card') || transaction.description.toLowerCase().includes('bill'));
                        if (isCCPayment) {
                            const ccAccount = accounts.find(a => a.type === 'credit' && transaction.description.toLowerCase().includes(a.name.toLowerCase()));
                            if (ccAccount && ccAccount.id !== data.accountId) {
                                const newCCBalance = ccAccount.balance + Math.abs(transaction.amount);
                                await sheetsService.updateAccount(config.spreadsheetId, ccAccount.id, { balance: newCCBalance });
                                setAccounts(prev => prev.map(a => a.id === ccAccount.id ? { ...a, balance: newCCBalance } : a));
                                toast(`Auto-detected CC Payment: Updated ${ccAccount.name}`);
                            }
                        }
                    }
                }
            }

            setLastSyncTime(new Date());
            toast('Record posted to cloud');
            return { ...transaction, synced: true };
            } catch (err) {
                lastError = err;
                const isAuth = err?.message?.includes('Authentication') || err?.message?.includes('expired') || err?.message?.includes('401');
                if (isAuth && attempt === 0 && localStorage.getItem('google_refresh_token')) {
                    try {
                        const refreshed = await sheetsService.refreshToken();
                        if (refreshed) continue;
                    } catch (refreshErr) {
                        logger.warn('Token refresh failed:', refreshErr);
                    }
                }
                break;
            }
        }

        if (lastError) {
            logger.error('Add transaction failed:', lastError);
            setError(lastError.message);
            const msg = lastError?.message?.includes('Authentication') || lastError?.message?.includes('expired')
                ? 'Saved locally. Sign in again to sync.'
                : 'Saved locally. Will sync when connected.';
            toast(msg, 'info');
            return { ...transaction, synced: false };
        }
        } finally {
            setIsSyncing(false);
        }
    }, [
        transactions, accounts, categories, bills, closedPeriods, config,
        setTransactions, setAccounts, setBills, setIsSyncing, setLastSyncTime, setError,
        toast, ensureSheetsReady
    ]);

    const updateTransaction = useCallback(async (transaction) => {
        const originalTransaction = transactions.find(t => t.id === transaction.id);
        if (!originalTransaction) {
            logger.error('Original transaction not found');
            return transaction;
        }

        const accountChanged = originalTransaction.accountId !== transaction.accountId;
        const amountChanged = originalTransaction.amount !== transaction.amount;

        const updatedTransactions = transactions.map(t => t.id === transaction.id ? { ...transaction, synced: false } : t);
        setTransactions(updatedTransactions);

        try {
            await localDB.saveData({
                transactions: updatedTransactions,
                accounts,
                categories,
                bills
            });
        } catch (e) {
            logger.warn('Local save failed:', e);
        }

        if (!config.spreadsheetId) return transaction;

        setIsSyncing(true);
        try {
        let lastErr;
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                await ensureSheetsReady();
                await sheetsService.updateTransaction(config.spreadsheetId, transaction);

                if (accountChanged) {
                    const oldAccount = accounts.find(a => a.id === originalTransaction.accountId);
                    const newAccount = accounts.find(a => a.id === transaction.accountId);
                    if (oldAccount) {
                        const oldNewBalance = oldAccount.balance - originalTransaction.amount;
                        await sheetsService.updateAccount(config.spreadsheetId, oldAccount.id, { balance: oldNewBalance });
                        setAccounts(prev => prev.map(a => a.id === oldAccount.id ? { ...a, balance: oldNewBalance } : a));
                    }
                    if (newAccount) {
                        const newNewBalance = newAccount.balance + transaction.amount;
                        await sheetsService.updateAccount(config.spreadsheetId, newAccount.id, { balance: newNewBalance });
                        setAccounts(prev => prev.map(a => a.id === newAccount.id ? { ...a, balance: newNewBalance } : a));
                    }
                } else if (amountChanged) {
                    const account = accounts.find(a => a.id === transaction.accountId);
                    if (account) {
                        const amountDiff = transaction.amount - originalTransaction.amount;
                        const newBalance = account.balance + amountDiff;
                        await sheetsService.updateAccount(config.spreadsheetId, account.id, { balance: newBalance });
                        setAccounts(prev => prev.map(a => a.id === account.id ? { ...a, balance: newBalance } : a));
                    }
                }

                if (transaction.billId) {
                    const matchedBill = bills.find(b => b.id === transaction.billId);
                    if (matchedBill && matchedBill.status !== 'paid') {
                        await sheetsService.updateBill(config.spreadsheetId, transaction.billId, { status: 'paid' });
                        setBills(prev => prev.map(b => b.id === transaction.billId ? { ...b, status: 'paid' } : b));
                        toast(`Bill "${matchedBill.name}" marked as paid ✓`);
                    }
                }

                setTransactions(prev => prev.map(t => t.id === transaction.id ? { ...t, synced: true } : t));
                setLastSyncTime(new Date());
                toast('Record modified successfully');
                return { ...transaction, synced: true };
            } catch (err) {
                lastErr = err;
                const isAuth = err?.message?.includes('Authentication') || err?.message?.includes('expired') || err?.message?.includes('401');
                if (isAuth && attempt === 0 && localStorage.getItem('google_refresh_token')) {
                    try {
                        if (await sheetsService.refreshToken()) continue;
                    } catch (refreshErr) {
                        logger.warn('Token refresh failed:', refreshErr);
                    }
                }
                break;
            }
        }
        if (lastErr) {
            logger.error('Update transaction failed:', lastErr);
            toast('Failed to update record', 'error');
            throw lastErr;
        }
        } finally {
            setIsSyncing(false);
        }
    }, [
        transactions, accounts, categories, bills, config,
        setTransactions, setAccounts, setBills, setIsSyncing, setLastSyncTime,
        toast, ensureSheetsReady
    ]);

    const deleteTransaction = useCallback(async (transaction) => {
        const newTransactions = transactions.filter(t => t.id !== transaction.id);
        setTransactions(newTransactions);
        localDB.saveData({ transactions: newTransactions, accounts, categories, bills });

        if (!config.spreadsheetId) return;

        setIsSyncing(true);
        try {
            await ensureSheetsReady();
            await sheetsService.deleteTransaction(config.spreadsheetId, transaction.id, transaction.date);
            setLastSyncTime(new Date());
            toast('Entry removed from ledger');
        } catch (err) {
            logger.error('Delete transaction failed:', err);
            setTransactions(transactions);
            localDB.saveData({ transactions, accounts, categories, bills });
            toast('Removal failed. Please sync.', 'error');
            throw err;
        } finally {
            setIsSyncing(false);
        }
    }, [
        transactions, accounts, categories, bills, config,
        setTransactions, setIsSyncing, setLastSyncTime,
        toast, ensureSheetsReady
    ]);

    return { addTransaction, updateTransaction, deleteTransaction };
}
