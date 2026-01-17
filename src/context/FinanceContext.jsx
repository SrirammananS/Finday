import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { sheetsService } from '../services/sheets';
import { localDB } from '../services/localDB';
import { recurringService } from '../services/recurringService';

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
    const [secretUnlocked, setSecretUnlocked] = useState(false);
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
            if (spreadsheetId) {
                localStorage.setItem('finday_spreadsheet_id', spreadsheetId);
            }

            setConfig(prev => ({ ...prev, clientId, spreadsheetId: spreadsheetId || '' }));
            setIsConnected(true);

            if (spreadsheetId) {
                await refreshData(spreadsheetId);
            }
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

            // Cache data locally for offline access
            await localDB.saveData({
                transactions: fetchedTransactions,
                accounts: fetchedAccounts,
                categories: fetchedCategories,
                bills: fetchedBills
            });

            setLastSyncTime(new Date());
        } catch (err) {
            console.error('[LAKSH] Refresh failed:', err);
            setError(err.message);
        } finally {
            setIsSyncing(false);
        }
    }, [config.spreadsheetId]);

    // --- One-Click Setup Logic ---
    const createFinanceSheet = async () => {
        setIsLoading(true);
        try {
            if (!gapi.client.sheets) throw new Error("Google Sheets API not loaded");

            // 1. Create Spreadsheet
            const createResponse = await gapi.client.sheets.spreadsheets.create({
                resource: {
                    properties: { title: "Finday Ledger" },
                    sheets: [
                        { properties: { title: "Transactions" } },
                        { properties: { title: "Accounts" } },
                        { properties: { title: "Categories" } },
                        { properties: { title: "Bills" } },
                        { properties: { title: "Config" } }
                    ]
                }
            });

            const newSpreadsheetId = createResponse.result.spreadsheetId;
            setConfig(prev => ({ ...prev, spreadsheetId: newSpreadsheetId }));
            localStorage.setItem('finday_spreadsheet_id', newSpreadsheetId);

            // 2. Populate Headers & Defaults
            await gapi.client.sheets.spreadsheets.values.batchUpdate({
                spreadsheetId: newSpreadsheetId,
                resource: {
                    valueInputOption: "USER_ENTERED",
                    data: [
                        {
                            range: "Transactions!A1:G1",
                            values: [["ID", "Date", "Amount", "Type", "Category", "Account", "Description"]]
                        },
                        {
                            range: "Accounts!A1:G1",
                            values: [
                                ["ID", "Name", "Type", "Balance", "BillingDay", "DueDay", "CreatedAt"]
                            ]
                        },
                        {
                            range: "Categories!A1:F6",
                            values: [
                                ["Name", "Type", "Keywords", "Target", "Icon", "Color"],
                                ["Food", "expense", "food,groceries", "", "🍔", "#FF5733"],
                                ["Transport", "expense", "uber,train,bus", "", "🚗", "#33FF57"],
                                ["Shopping", "expense", "amazon,clothes", "", "🛍️", "#3357FF"],
                                ["Salary", "income", "salary,paycheck", "", "💰", "#F1C40F"],
                                ["Bills", "expense", "bill,utility", "", "📄", "#E74C3C"]
                            ]
                        },
                        {
                            range: "Bills!A1:H1",
                            values: [["ID", "Name", "Amount", "DueDay", "Category", "Status", "AccountID", "CreatedAt"]]
                        }
                    ]
                }
            });

            // Reload to fetch fresh data
            window.location.reload();

        } catch (error) {
            console.error("Error creating sheet:", error);
            alert("Failed to create spreadsheet. See console.");
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-connect on mount - Stale-while-revalidate pattern
    useEffect(() => {
        const autoConnect = async () => {
            const clientId = localStorage.getItem('finday_client_id');
            const spreadsheetId = localStorage.getItem('finday_spreadsheet_id');
            const storedToken = localStorage.getItem('finday_gapi_token');

            // 1. Load cached data immediately (no network) - unblocks UI fast
            try {
                const cachedData = await localDB.getAllData();
                if (cachedData.hasData) {
                    setTransactions(cachedData.transactions);
                    setAccounts(cachedData.accounts || []);
                    setCategories(cachedData.categories || []);
                    setBills(cachedData.bills || []);
                    if (cachedData.lastSyncTime) {
                        setLastSyncTime(new Date(cachedData.lastSyncTime));
                    }
                    setIsLoading(false); // Unblock UI immediately with cached data
                    console.log('[LAKSH] UI loaded from cache', cachedData.isStale ? '(stale)' : '(fresh)');
                }
            } catch (e) {
                console.log('[LAKSH] Cache read failed:', e);
            }

            // 2. Background sync if credentials exist
            if (clientId && spreadsheetId && storedToken) {
                try {
                    await connect(clientId, spreadsheetId);
                    toast('Synced from cloud ✓');
                } catch (e) {
                    console.log('[LAKSH] Background sync failed, using cached data:', e);
                    setIsLoading(false);
                }
            } else {
                setIsLoading(false);
            }
        };

        // No artificial delay - start immediately
        autoConnect();
    }, []);

    // ===== NOTIFICATIONS =====
    useEffect(() => {
        const checkBills = async () => {
            if (bills.length === 0 || !('Notification' in window)) return;

            if (Notification.permission === 'default') {
                Notification.requestPermission();
            }

            if (Notification.permission === 'granted') {
                const notifyDays = parseInt(localStorage.getItem('finday_notify_days') || '5');
                const today = new Date().getDate();
                const upcoming = bills.filter(b => {
                    const due = parseInt(b.dueDay);
                    return due >= today && due <= today + notifyDays;
                });

                if (upcoming.length > 0) {
                    const lastNotified = localStorage.getItem('finday_last_notification');
                    const todayStr = new Date().toDateString();

                    // Notify max once per day
                    if (lastNotified !== todayStr) {
                        // Use service worker for mobile PWA, fallback to regular Notification
                        try {
                            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                                const reg = await navigator.serviceWorker.ready;
                                await reg.showNotification('LAKSH: Upcoming Bills', {
                                    body: `You have ${upcoming.length} bill${upcoming.length > 1 ? 's' : ''} due in the next ${notifyDays} days!`,
                                    icon: '/mascot.png'
                                });
                            } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                                new Notification('LAKSH: Upcoming Bills', {
                                    body: `You have ${upcoming.length} bill${upcoming.length > 1 ? 's' : ''} due in the next ${notifyDays} days!`,
                                    icon: '/mascot.png'
                                });
                            }
                        } catch (e) {
                            console.log('[LAKSH] Notification failed:', e);
                        }
                        localStorage.setItem('finday_last_notification', todayStr);
                    }
                }
            }
        };

        if (bills.length > 0) {
            checkBills();
        }

        // Listen for internal settings changes
        const handleStorageChange = () => checkBills();
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [bills]);

    // ===== AUTO CC BILL GENERATION =====
    // Calculate bill from transactions in the billing cycle
    const createdBillsRef = React.useRef(new Set());

    useEffect(() => {
        const generateCCBills = async () => {
            // Only run if we have data and not currently syncing
            if (accounts.length === 0 || transactions.length === 0 || !lastSyncTime || isSyncing) return;

            // Lock to prevent concurrent execution
            const lockKey = 'finday_cc_bill_lock';
            const lock = localStorage.getItem(lockKey);
            if (lock && Date.now() - parseInt(lock) < 30000) {
                return;
            }
            localStorage.setItem(lockKey, Date.now().toString());

            const creditAccounts = accounts.filter(a => a.type === 'credit');
            const today = new Date();
            const currentDay = today.getDate();
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();

            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

            for (const acc of creditAccounts) {
                if (!acc.billingDay) continue;

                const billingDay = parseInt(acc.billingDay);
                const dueDay = parseInt(acc.dueDay) || billingDay + 20;

                // Check if we are past the billing day for this month
                if (currentDay >= billingDay) {
                    // Billing Cycle: 
                    // Start: Billing Day of Previous Month
                    // End: Billing Day of Current Month

                    // Note: JS Months are 0-indexed. 
                    // new Date(2024, 0, 15) -> Jan 15, 2024

                    const currentStatementDate = new Date(currentYear, currentMonth, billingDay);
                    // Use a safe way to get previous month logic
                    const prevStatementDate = new Date(currentYear, currentMonth - 1, billingDay);

                    // Formatting for Unique Key: YYYY-MM-DD
                    const cycleStartStr = prevStatementDate.toISOString().split('T')[0];
                    const cycleEndStr = currentStatementDate.toISOString().split('T')[0];

                    const billName = `${acc.name} Bill - ${monthNames[currentMonth]} ${currentYear}`;

                    // --- ROBUST DEDUPLICATION ---
                    // 1. Check by Cycle Dates + Account ID (Most reliable)
                    const existingBillByCycle = bills.find(b =>
                        (b.accountId === acc.id || b.billAccountId === acc.id) &&
                        b.cycleStart === cycleStartStr &&
                        b.cycleEnd === cycleEndStr
                    );

                    // 2. Check by Name + Account ID (Fallback for legacy)
                    const existingBillByName = bills.find(b =>
                        b.name === billName &&
                        (b.accountId === acc.id || b.billAccountId === acc.id)
                    );

                    const existingBill = existingBillByCycle || existingBillByName;

                    // Check ephemeral lock for this specific bill (session scope)
                    const billLockKey = `finday_bill_created_${acc.id}_${currentMonth}_${currentYear}`;
                    const sessionLock = localStorage.getItem(billLockKey);

                    if (!existingBill && !sessionLock) {
                        // Calculate total spent
                        const cycleTransactions = transactions.filter(t => {
                            if (t.accountId !== acc.id) return false;
                            const txDate = new Date(t.date);
                            // Include transactions > prevStatementDate AND <= currentStatementDate
                            return txDate > prevStatementDate && txDate <= currentStatementDate;
                        });

                        const totalFromTx = cycleTransactions.reduce((sum, t) => {
                            if (t.type === 'expense' || t.amount < 0) {
                                return sum + Math.abs(t.amount);
                            }
                            return sum;
                        }, 0);

                        // If no transactions, check if negative balance exists (debt)
                        // If balance is -5000, debt is 5000.
                        const debt = acc.balance < 0 ? Math.abs(acc.balance) : 0;
                        const totalSpent = totalFromTx > 0 ? totalFromTx : debt;

                        console.log(`[Finday CC] ${acc.name}: Cycle ${cycleStartStr} to ${cycleEndStr}. TxTotal: ${totalFromTx}, Debt: ${debt}`);

                        if (totalSpent > 0 || totalFromTx > 0) {
                            createdBillsRef.current.add(billLockKey);
                            localStorage.setItem(billLockKey, 'true');

                            const newBill = {
                                name: billName,
                                amount: totalSpent,
                                dueDay: dueDay,
                                category: 'Bills',
                                status: 'due',
                                accountId: '',
                                billAccountId: acc.id,
                                cycleStart: cycleStartStr,
                                cycleEnd: cycleEndStr
                            };

                            console.log(`[Finday CC] GENERATING BILL: ${billName} - ${totalSpent}`);
                            await addBill(newBill);

                            if (Notification.permission === 'granted') {
                                new Notification('Statement Ready', {
                                    body: `${acc.name}: ₹${totalSpent.toLocaleString()}`,
                                    icon: '/mascot.png'
                                });
                            }
                        }
                    }
                }
            }

            // Release lock
            localStorage.removeItem(lockKey);
        };

        const timer = setTimeout(generateCCBills, 5000);
        return () => clearTimeout(timer);
    }, [accounts, transactions, lastSyncTime, bills]);

    // ===== TRANSACTIONS CRUD =====

    const addTransaction = async (data) => {
        const transaction = {
            id: generateId(),
            ...data,
            amount: data.type === 'income' ? Math.abs(data.amount) : -Math.abs(data.amount)
        };

        // Optimistic update
        const newTransactions = [{ ...transaction, synced: false }, ...transactions];
        setTransactions(newTransactions);

        // Save immediately to localDB
        localDB.saveData({
            transactions: newTransactions,
            accounts,
            categories,
            bills
        }).catch(e => console.warn('[LAKSH] Local save failed:', e));

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

                    // --- EXPLICIT PAYMENT LOGIC ---

                    // 1. Explicit Bill Payment (from Form)
                    if (data.billId) {
                        const matchedBill = bills.find(b => b.id === data.billId);
                        if (matchedBill) {
                            // Mark bill as paid in sheets and local state
                            await sheetsService.updateBill(config.spreadsheetId, data.billId, { status: 'paid' });
                            setBills(prev => prev.map(b => b.id === data.billId ? { ...b, status: 'paid' } : b));
                            toast(`Bill "${matchedBill.name}" marked as paid ✓`);
                        }
                    }

                    // 2. Explicit Credit Card Payment (from Form)
                    if (data.linkedAccountId) {
                        const ccAccount = accounts.find(a => a.id === data.linkedAccountId);
                        if (ccAccount && ccAccount.type === 'credit') {
                            // Paying a CC increases its balance (reduces negative debt)
                            // e.g. Balance -5000 + Paid 1000 = -4000
                            const newCCBalance = ccAccount.balance + Math.abs(transaction.amount);
                            await sheetsService.updateAccount(config.spreadsheetId, ccAccount.id, { balance: newCCBalance });
                            setAccounts(prev => prev.map(a => a.id === ccAccount.id ? { ...a, balance: newCCBalance } : a));
                            toast(`Updated ${ccAccount.name} balance`);
                        }
                    }

                    // --- FALLBACK SMART LOGIC (for imports/legacy) ---
                    // Only run if NO explicit data was provided
                    if (!data.billId && !data.linkedAccountId) {
                        // ... (Existing smart logic for auto-detection if desired, or remove if we want to be strict)
                        // Keeping it minimal as fallback:
                        const isCCPayment =
                            (transaction.type === 'expense' || transaction.type === 'transfer') &&
                            (transaction.description.toLowerCase().includes('card') || transaction.description.toLowerCase().includes('bill'));

                        if (isCCPayment) {
                            // Try to find a CC account mentioned
                            const ccAccount = accounts.find(a => a.type === 'credit' && transaction.description.toLowerCase().includes(a.name.toLowerCase()));
                            if (ccAccount && ccAccount.id !== data.accountId) {
                                // Auto-Apply payment to CC
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
            console.error('Add transaction failed:', err);
            setError(err.message);
            toast('Connection timeout. Retrying...', 'error');
            throw err;
        } finally {
            setIsSyncing(false);
        }
    };

    const updateTransaction = async (transaction) => {
        // Find the original transaction
        const originalTransaction = transactions.find(t => t.id === transaction.id);

        if (!originalTransaction) {
            console.error('Original transaction not found');
            return transaction;
        }

        const accountChanged = originalTransaction.accountId !== transaction.accountId;
        const amountChanged = originalTransaction.amount !== transaction.amount;

        // Optimistic UI update
        const updatedTransactions = transactions.map(t => t.id === transaction.id ? { ...transaction, synced: false } : t);
        setTransactions(updatedTransactions);

        // Save immediately to localDB
        localDB.saveData({
            transactions: updatedTransactions,
            accounts,
            categories,
            bills
        }).catch(e => console.warn('[LAKSH] Local save failed:', e));

        if (!config.spreadsheetId) return transaction;

        setIsSyncing(true);
        try {
            // 1. Update the transaction in the sheet
            await sheetsService.updateTransaction(config.spreadsheetId, transaction);

            // 2. Handle balance updates
            if (accountChanged) {
                // Account changed: revert from old account, apply to new account
                const oldAccount = accounts.find(a => a.id === originalTransaction.accountId);
                const newAccount = accounts.find(a => a.id === transaction.accountId);

                if (oldAccount) {
                    // Remove original amount from old account
                    const oldNewBalance = oldAccount.balance - originalTransaction.amount;
                    await sheetsService.updateAccount(config.spreadsheetId, oldAccount.id, { balance: oldNewBalance });
                    setAccounts(prev => prev.map(a => a.id === oldAccount.id ? { ...a, balance: oldNewBalance } : a));
                    console.log(`[Finday] Old account ${oldAccount.name}: ${oldAccount.balance} -> ${oldNewBalance}`);
                }

                if (newAccount) {
                    // Add new amount to new account
                    const newNewBalance = newAccount.balance + transaction.amount;
                    await sheetsService.updateAccount(config.spreadsheetId, newAccount.id, { balance: newNewBalance });
                    setAccounts(prev => prev.map(a => a.id === newAccount.id ? { ...a, balance: newNewBalance } : a));
                    console.log(`[Finday] New account ${newAccount.name}: ${newAccount.balance} -> ${newNewBalance}`);
                }
            } else if (amountChanged) {
                // Same account, amount changed: just apply the difference
                const account = accounts.find(a => a.id === transaction.accountId);
                if (account) {
                    const amountDiff = transaction.amount - originalTransaction.amount;
                    const newBalance = account.balance + amountDiff;
                    await sheetsService.updateAccount(config.spreadsheetId, account.id, { balance: newBalance });
                    setAccounts(prev => prev.map(a => a.id === account.id ? { ...a, balance: newBalance } : a));
                    console.log(`[Finday] Account ${account.name}: ${account.balance} -> ${newBalance} (diff: ${amountDiff})`);
                }
            }

            // 3. Mark bill as paid if billId is provided
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
            console.error('Update transaction failed:', err);
            toast('Failed to update record', 'error');
            throw err;
        } finally {
            setIsSyncing(false);
        }
    };

    const deleteTransaction = async (transaction) => {
        const newTransactions = transactions.filter(t => t.id !== transaction.id);
        setTransactions(newTransactions);
        localDB.saveData({ transactions: newTransactions, accounts, categories, bills });

        if (!config.spreadsheetId) return;

        setIsSyncing(true);
        try {
            await sheetsService.deleteTransaction(config.spreadsheetId, transaction.id, transaction.date);
            setLastSyncTime(new Date());
            toast('Entry removed from ledger');
        } catch (err) {
            console.error('Delete transaction failed:', err);
            // Revert
            const reverted = [...transactions, transaction];
            setTransactions(reverted);
            localDB.saveData({ transactions: reverted, accounts, categories, bills });

            toast('Removal failed. Please sync.', 'error');
            throw err;
        } finally {
            setIsSyncing(false);
        }
    };

    // ===== ACCOUNTS CRUD =====

    const addAccount = async (data) => {
        const account = { id: generateId(), ...data };
        const newAccounts = [account, ...accounts];
        setAccounts(newAccounts);
        localDB.saveData({ transactions, accounts: newAccounts, categories, bills });

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
        const newAccounts = accounts.map(a => a.id === accountId ? { ...a, ...updates } : a);
        setAccounts(newAccounts);
        localDB.saveData({ transactions, accounts: newAccounts, categories, bills });

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
        const newAccounts = accounts.filter(a => a.id !== accountId);
        setAccounts(newAccounts);
        localDB.saveData({ transactions, accounts: newAccounts, categories, bills });

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
        const newCategories = [...categories, category];
        setCategories(newCategories);
        localDB.saveData({ transactions, accounts, categories: newCategories, bills });

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
        const newCategories = categories.map(c => c.name === oldName ? category : c);
        setCategories(newCategories);
        localDB.saveData({ transactions, accounts, categories: newCategories, bills });

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
        const newCategories = categories.filter(c => c.name !== categoryName);
        setCategories(newCategories);
        localDB.saveData({ transactions, accounts, categories: newCategories, bills });

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
    };

    const updateBill = async (billId, updates) => {
        const newBills = bills.map(b => b.id === billId ? { ...b, ...updates } : b);
        setBills(newBills);
        localDB.saveData({ transactions, accounts, categories, bills: newBills });

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
        const newBills = bills.filter(b => b.id !== billId);
        setBills(newBills);
        localDB.saveData({ transactions, accounts, categories, bills: newBills });

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

    const disconnect = useCallback(async () => {
        sheetsService.signOut();
        localStorage.removeItem('finday_client_id');
        localStorage.removeItem('finday_spreadsheet_id');
        localStorage.removeItem('finday_gapi_token');
        localStorage.removeItem('finday_token_expiry');

        // Clear cached data
        await localDB.clearAll();

        setIsConnected(false);
        setTransactions([]);
        setAccounts([]);
        setCategories([]);
        setBills([]);
        setConfig({ spreadsheetId: '', clientId: '', currency: 'INR' });
    }, []);

    // Force refresh - clears cache and re-syncs
    const forceRefresh = useCallback(async () => {
        await localDB.clearAll();
        toast('Cache cleared');
        await refreshData();
    }, [refreshData]);

    // Get cached time for display
    const getCacheInfo = useCallback(async () => {
        const lastSync = await localDB.getLastSyncTime();
        return lastSync;
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
        secretUnlocked,

        connect,
        disconnect,
        refreshData,
        forceRefresh,
        getCacheInfo,
        createFinanceSheet,

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

        // Secret Accounts
        toggleSecretUnlock: () => setSecretUnlocked(prev => !prev),
        lockSecrets: () => setSecretUnlocked(false),
        unlockSecrets: () => setSecretUnlocked(true),

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
