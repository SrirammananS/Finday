import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { sheetsService } from '../services/sheets';

import { useFeedback } from './FeedbackContext';

const FinanceContext = createContext();

export const useFinance = () => {
    const context = useContext(FinanceContext);
    if (!context) {
        throw new Error('useFinance must be used within a FinanceProvider');
    }
    return context;
};

const generateId = () => crypto.randomUUID();

export const FinanceProvider = ({ children }) => {
    const { toast } = useFeedback();
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState(null);
    const [error, setError] = useState(null);

    const [transactions, setTransactions] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [bills, setBills] = useState([]);
    const [config, setConfig] = useState({
        spreadsheetId: localStorage.getItem('finday_spreadsheet_id') || '',
        clientId: localStorage.getItem('finday_client_id') || '',
        currency: 'INR'
    });

    // ===== INITIALIZATION =====

    const connect = useCallback(async (clientId, spreadsheetId) => {
        setIsLoading(true);
        setError(null);

        try {
            await sheetsService.init(clientId);

            localStorage.setItem('finday_client_id', clientId);
            localStorage.setItem('finday_spreadsheet_id', spreadsheetId);

            setConfig(prev => ({ ...prev, clientId, spreadsheetId }));
            setIsConnected(true);

            await refreshData(spreadsheetId);
            return true;
        } catch (err) {
            console.error('Connection failed:', err);
            setError(err.message);
            setIsConnected(false);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const refreshData = useCallback(async (sheetId) => {
        const spreadsheetId = sheetId || config.spreadsheetId;
        if (!spreadsheetId) return;

        setIsSyncing(true);
        try {
            const [fetchedTransactions, fetchedAccounts, fetchedCategories, fetchedBills, fetchedConfig] = await Promise.all([
                sheetsService.getTransactions(spreadsheetId, 6),
                sheetsService.getAccounts(spreadsheetId),
                sheetsService.getCategories(spreadsheetId),
                sheetsService.getBills(spreadsheetId),
                sheetsService.getConfig(spreadsheetId)
            ]);

            setTransactions(fetchedTransactions);
            setAccounts(fetchedAccounts);
            setCategories(fetchedCategories);
            setBills(fetchedBills);

            setLastSyncTime(new Date());
        } catch (err) {
            console.error('Refresh failed:', err);
            setError(err.message);
        } finally {
            setIsSyncing(false);
        }
    }, [config.spreadsheetId]);

    // Auto-connect on mount
    useEffect(() => {
        const autoConnect = async () => {
            const clientId = localStorage.getItem('finday_client_id');
            const spreadsheetId = localStorage.getItem('finday_spreadsheet_id');
            const storedToken = localStorage.getItem('finday_gapi_token');

            if (clientId && spreadsheetId && storedToken) {
                try {
                    await connect(clientId, spreadsheetId);
                } catch (e) {
                    console.log('Auto-connect failed:', e);
                    setIsLoading(false);
                }
            } else {
                setIsLoading(false);
            }
        };

        // Delay to ensure scripts are loaded
        setTimeout(autoConnect, 500);
    }, []);

    // ===== TRANSACTIONS CRUD =====

    const addTransaction = async (data) => {
        const transaction = {
            id: generateId(),
            ...data,
            amount: data.type === 'income' ? Math.abs(data.amount) : -Math.abs(data.amount)
        };

        // Optimistic update
        setTransactions(prev => [{ ...transaction, synced: false }, ...prev]);

        if (!config.spreadsheetId) return transaction;

        setIsSyncing(true);
        try {
            await sheetsService.addTransaction(config.spreadsheetId, transaction);
            setTransactions(prev => prev.map(t => t.id === transaction.id ? { ...t, synced: true } : t));
            setLastSyncTime(new Date());

            // Update account balance
            if (data.accountId) {
                const account = accounts.find(a => a.id === data.accountId);
                if (account) {
                    const newBalance = account.balance + transaction.amount;
                    await sheetsService.updateAccount(config.spreadsheetId, data.accountId, { balance: newBalance });
                    setAccounts(prev => prev.map(a => a.id === data.accountId ? { ...a, balance: newBalance } : a));

                    // SMART LOGIC: If this is a CC Bill Payment
                    // Detect if description mentions "CC Bill" or "Credit Card Bill" and a destination account is implied
                    const isCCPayment = transaction.description.toLowerCase().includes('cc bill') ||
                        transaction.description.toLowerCase().includes('credit card bill');

                    if (isCCPayment) {
                        // Find the credit card account mentioned in description or just the first credit account
                        const ccAccount = accounts.find(a => a.type === 'credit' && transaction.description.toLowerCase().includes(a.name.toLowerCase())) ||
                            accounts.find(a => a.type === 'credit');

                        if (ccAccount && ccAccount.id !== data.accountId) {
                            // Paying CC bill means REDUCING the credit card balance (it's usually negative/positive depending on how user tracks)
                            // In this app, balance seems to be positive for debt if they use simple tracking, or we just follow the math.
                            // Usually: Bank -1000, CC Balance -1000.
                            const ccUpdates = { balance: ccAccount.balance - Math.abs(transaction.amount) };
                            await sheetsService.updateAccount(config.spreadsheetId, ccAccount.id, ccUpdates);
                            setAccounts(prev => prev.map(a => a.id === ccAccount.id ? { ...a, ...ccUpdates } : a));
                        }
                    }
                }
            }

            setLastSyncTime(new Date());
            toast('Record posted to cloud');
            return { ...transaction, synced: true };
        } catch (err) {
            console.error('Add transaction failed:', err);
            setError(err.message);
            toast('Connection timeout. Retrying...', 'error');
            throw err;
        } finally {
            setIsSyncing(false);
        }
    };

    const updateTransaction = async (transaction) => {
        setTransactions(prev => prev.map(t => t.id === transaction.id ? { ...transaction, synced: false } : t));

        if (!config.spreadsheetId) return transaction;

        setIsSyncing(true);
        try {
            await sheetsService.updateTransaction(config.spreadsheetId, transaction);
            setTransactions(prev => prev.map(t => t.id === transaction.id ? { ...t, synced: true } : t));
            setLastSyncTime(new Date());
            toast('Record modified successfully');
            return { ...transaction, synced: true };
        } catch (err) {
            console.error('Update transaction failed:', err);
            toast('Failed to update record', 'error');
            throw err;
        } finally {
            setIsSyncing(false);
        }
    };

    const deleteTransaction = async (transaction) => {
        setTransactions(prev => prev.filter(t => t.id !== transaction.id));

        if (!config.spreadsheetId) return;

        setIsSyncing(true);
        try {
            await sheetsService.deleteTransaction(config.spreadsheetId, transaction.id, transaction.date);
            setLastSyncTime(new Date());
            toast('Entry removed from ledger');
        } catch (err) {
            console.error('Delete transaction failed:', err);
            // Revert
            setTransactions(prev => [...prev, transaction]);
            toast('Removal failed. Please sync.', 'error');
            throw err;
        } finally {
            setIsSyncing(false);
        }
    };

    // ===== ACCOUNTS CRUD =====

    const addAccount = async (data) => {
        const account = { id: generateId(), ...data };
        setAccounts(prev => [...prev, account]);

        if (!config.spreadsheetId) return account;

        setIsSyncing(true);
        try {
            await sheetsService.addAccount(config.spreadsheetId, account);
            setLastSyncTime(new Date());
            toast('Wallet established successfully');
            return account;
        } catch (err) {
            setAccounts(prev => prev.filter(a => a.id !== account.id));
            toast('Failed to create wallet', 'error');
            throw err;
        } finally {
            setIsSyncing(false);
        }
    };

    const updateAccount = async (accountId, updates) => {
        setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, ...updates } : a));

        if (!config.spreadsheetId) return;

        setIsSyncing(true);
        try {
            await sheetsService.updateAccount(config.spreadsheetId, accountId, updates);
            setLastSyncTime(new Date());
        } catch (err) {
            console.error('Update account failed:', err);
            throw err;
        } finally {
            setIsSyncing(false);
        }
    };

    const deleteAccount = async (accountId) => {
        const account = accounts.find(a => a.id === accountId);
        setAccounts(prev => prev.filter(a => a.id !== accountId));

        if (!config.spreadsheetId) return;

        setIsSyncing(true);
        try {
            await sheetsService.deleteAccount(config.spreadsheetId, accountId);
            setLastSyncTime(new Date());
        } catch (err) {
            setAccounts(prev => [...prev, account]);
            throw err;
        } finally {
            setIsSyncing(false);
        }
    };

    // ===== CATEGORIES CRUD =====

    const addCategory = async (category) => {
        setCategories(prev => [...prev, category]);

        if (!config.spreadsheetId) return category;

        setIsSyncing(true);
        try {
            await sheetsService.addCategory(config.spreadsheetId, category);
            setLastSyncTime(new Date());
            return category;
        } catch (err) {
            setCategories(prev => prev.filter(c => c.name !== category.name));
            throw err;
        } finally {
            setIsSyncing(false);
        }
    };

    const updateCategory = async (oldName, category) => {
        setCategories(prev => prev.map(c => c.name === oldName ? category : c));

        if (!config.spreadsheetId) return;

        setIsSyncing(true);
        try {
            await sheetsService.updateCategory(config.spreadsheetId, oldName, category);
            setLastSyncTime(new Date());
        } catch (err) {
            throw err;
        } finally {
            setIsSyncing(false);
        }
    };

    const deleteCategory = async (categoryName) => {
        const category = categories.find(c => c.name === categoryName);
        setCategories(prev => prev.filter(c => c.name !== categoryName));

        if (!config.spreadsheetId) return;

        setIsSyncing(true);
        try {
            await sheetsService.deleteCategory(config.spreadsheetId, categoryName);
            setLastSyncTime(new Date());
        } catch (err) {
            setCategories(prev => [...prev, category]);
            throw err;
        } finally {
            setIsSyncing(false);
        }
    };

    // ===== BILLS CRUD =====

    const addBill = async (data) => {
        const bill = { id: generateId(), ...data };
        setBills(prev => [bill, ...prev]);

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
    };

    const updateBill = async (billId, updates) => {
        setBills(prev => prev.map(b => b.id === billId ? { ...b, ...updates } : b));

        if (!config.spreadsheetId) return;

        setIsSyncing(true);
        try {
            await sheetsService.updateBill(config.spreadsheetId, billId, updates);
            setLastSyncTime(new Date());
        } catch (err) {
            throw err;
        } finally {
            setIsSyncing(false);
        }
    };

    const deleteBill = async (billId) => {
        const bill = bills.find(b => b.id === billId);
        setBills(prev => prev.filter(b => b.id !== billId));

        if (!config.spreadsheetId) return;

        setIsSyncing(true);
        try {
            await sheetsService.deleteBill(config.spreadsheetId, billId);
            setLastSyncTime(new Date());
        } catch (err) {
            setBills(prev => [...prev, bill]);
            throw err;
        } finally {
            setIsSyncing(false);
        }
    };

    // ===== SMART QUERY =====

    const smartQuery = async (query) => {
        if (!config.spreadsheetId) {
            return { error: 'Not connected to Google Sheets' };
        }

        try {
            return await sheetsService.smartQuery(config.spreadsheetId, query);
        } catch (err) {
            return { error: err.message };
        }
    };

    // ===== AUTO CATEGORIZE =====

    const autoCategorize = (description) => {
        const descLower = description.toLowerCase();

        for (const cat of categories) {
            const keywords = cat.keywords?.split(',').map(k => k.trim().toLowerCase()).filter(Boolean) || [];
            for (const kw of keywords) {
                if (descLower.includes(kw)) {
                    return cat.name;
                }
            }
        }

        return 'Other';
    };

    const updateConfig = useCallback(async (key, value) => {
        const spreadsheetId = config.spreadsheetId;
        if (!spreadsheetId) return;

        try {
            await sheetsService.setConfig(spreadsheetId, key, value);
            setConfig(prev => ({ ...prev, [key]: value }));
        } catch (err) {
            console.error('Config update failed:', err);
        }
    }, [config.spreadsheetId]);

    const disconnect = useCallback(() => {
        sheetsService.signOut();
        localStorage.removeItem('finday_client_id');
        localStorage.removeItem('finday_spreadsheet_id');
        localStorage.removeItem('finday_gapi_token');
        setIsConnected(false);
        setTransactions([]);
        setAccounts([]);
        setCategories([]);
        setConfig({ spreadsheetId: '', clientId: '', currency: 'INR' });
    }, []);

    const value = {
        isConnected,
        isLoading,
        isSyncing,
        lastSyncTime,
        error,
        transactions,
        accounts,
        categories,
        bills,
        config,

        connect,
        disconnect,
        refreshData,

        addTransaction,
        updateTransaction,
        deleteTransaction,

        addAccount,
        updateAccount,
        deleteAccount,

        addCategory,
        updateCategory,
        deleteCategory,

        addBill,
        updateBill,
        deleteBill,

        smartQuery,
        autoCategorize,
        updateConfig,

        // CC Helpers
        getCCBillInfo: (accountId) => {
            const acc = accounts.find(a => a.id === accountId);
            if (!acc || acc.type !== 'credit') return null;

            const now = new Date();
            const billingDay = acc.billingCycleStart || 1;
            const dueDay = acc.dueDate || 15;

            // Current Statement Logic
            let statementDate = new Date(now.getFullYear(), now.getMonth(), billingDay);
            if (now.getDate() < billingDay) {
                statementDate.setMonth(statementDate.getMonth() - 1);
            }

            const dueDate = new Date(statementDate.getFullYear(), statementDate.getMonth() + 1, dueDay);

            const accTransactions = transactions.filter(t => t.accountId === accountId);

            const statementBalance = accTransactions
                .filter(t => new Date(t.date) < statementDate)
                .reduce((s, t) => s + Math.abs(parseFloat(t.amount) || 0), 0);

            const unbilledBalance = accTransactions
                .filter(t => new Date(t.date) >= statementDate)
                .reduce((s, t) => s + Math.abs(parseFloat(t.amount) || 0), 0);

            return {
                statementDate,
                dueDate,
                statementBalance,
                unbilledBalance,
                isGenerated: now >= statementDate,
                daysToDue: Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24))
            };
        }
    };

    return (
        <FinanceContext.Provider value={value}>
            {children}
        </FinanceContext.Provider>
    );
};
