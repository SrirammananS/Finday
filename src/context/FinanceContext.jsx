import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { sheetsService } from '../services/sheets';
import { transactionDetector } from '../services/transactionDetector';
import { localDB } from '../services/localDB';
import { recurringService } from '../services/recurringService';
import { storage, STORAGE_KEYS } from '../services/storage';
import { importWithRetry } from '../utils/lazyRetry';
import { enrichTransaction } from '../services/smsParser';
import { friendsService } from '../services/friendsService';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO, subDays, addDays } from 'date-fns';

const FinanceContext = createContext();

export const useFinance = () => {
    const context = useContext(FinanceContext);
    if (!context) {
        throw new Error('useFinance must be used within a FinanceProvider');
    }
    return context;
};

const generateId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Detect if running in Android WebView
const isAndroidWebView = () => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    return /Android/i.test(userAgent) && /wv/i.test(userAgent);
};

export const FinanceProvider = ({ children }) => {
    const isMountedRef = useRef(true);
    const generatedBuffer = useRef(new Set());
    const [isGuest, setIsGuest] = useState(() => {
        const hasSheet = !!(storage.get(STORAGE_KEYS.SPREADSHEET_ID) || localStorage.getItem('finday_spreadsheet_id'));
        return storage.getBool(STORAGE_KEYS.GUEST_MODE) && !hasSheet;
    });
    const [isConnected, setIsConnected] = useState(!!(storage.get(STORAGE_KEYS.SPREADSHEET_ID) || localStorage.getItem('finday_spreadsheet_id')) || storage.getBool(STORAGE_KEYS.GUEST_MODE));
    const [isLoading, setIsLoading] = useState(true);
    const [loadingStatus, setLoadingStatus] = useState({ step: 0, message: 'Initializing...', error: null });
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState(null);
    const [error, setError] = useState(null);

    // Simple toast function without dependencies
    const toast = useCallback((message, type = 'success') => {
        console.log(`${type.toUpperCase()}: ${message}`);
        // Components can handle UI feedback themselves
    }, []);

    const [transactions, setTransactions] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [bills, setBills] = useState([]);
    const [billPayments, setBillPayments] = useState([]);
    const [closedPeriods, setClosedPeriods] = useState(storage.getJSON(STORAGE_KEYS.CLOSED_PERIODS) || []);
    const [secretUnlocked, setSecretUnlocked] = useState(false);
    const [config, setConfig] = useState({
        spreadsheetId: storage.get(STORAGE_KEYS.SPREADSHEET_ID) || localStorage.getItem('finday_spreadsheet_id') || '',
        clientId: storage.get(STORAGE_KEYS.CLIENT_ID) || '',
        currency: 'INR',
        isGuest: storage.getBool(STORAGE_KEYS.GUEST_MODE) && !(storage.get(STORAGE_KEYS.SPREADSHEET_ID) || localStorage.getItem('finday_spreadsheet_id'))
    });

    // Valid friends state initialized from local service
    const [friends, setFriends] = useState(friendsService.getAll());

    // Sync friends when transactions change (e.g. after sync or add)
    useEffect(() => {
        if (transactions.length > 0) {
            friendsService.syncFromTransactions(transactions);
            setFriends(friendsService.getAll());
        }
    }, [transactions]);

    // Calculate dynamic balances for friends based on transactions
    const friendsWithBalance = useMemo(() => {
        const balances = {};
        friends.forEach(f => balances[f.name] = 0);

        transactions.filter(t => !t.hidden && t.friend).forEach(t => {
            const name = t.friend.trim();
            if (balances[name] === undefined) balances[name] = 0;
            // Formula: Expense (negative amount) means I paid -> Friend owes me (+).
            // Income (positive amount) means Friend paid me -> Friend owes me less (-).
            // Therefore: Balance -= Amount
            balances[name] -= t.amount;
        });

        return friends.map(f => ({
            ...f,
            balance: balances[f.name] || 0
        }));
    }, [friends, transactions]);

    const toggleSecretUnlock = useCallback(() => {
        setSecretUnlocked(prev => !prev);
    }, []);

    // ===== INITIALIZATION =====
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Helper function to ensure sheets service is ready
    const ensureSheetsReady = async () => {
        const { cloudBackup } = await importWithRetry(() => import('../services/cloudBackup'));
        await cloudBackup.init();
        if (!sheetsService.isInitialized || !cloudBackup.isSignedIn()) {
            await sheetsService.init();
        }
    };
    const generateBillInstances = async (billsList, paymentsList, txnsList, spreadsheetId) => {
        if (!spreadsheetId || billsList.length === 0) return;

        const today = new Date();
        const currentMonthKey = format(today, 'yyyy-MM');
        const newPayments = [];

        // Load persistent flags to avoid re-generating for the same cycle
        const existingCycles = new Set(paymentsList.map(p => `${p.billId}:${p.cycle}`));

        console.log(`[LAKSH] Running Smart Bill Audit (Cycle: ${currentMonthKey})...`);

        // Phase 1: Status Sync (Auto-detect payments for EXISTING bills)
        for (const payment of paymentsList.filter(p => p.status === 'pending')) {
            const bill = billsList.find(b => b.id === payment.billId);
            if (!bill) continue;

            const pDate = parseISO(payment.dueDate);
            const searchStart = subDays(pDate, 15);
            const searchEnd = addDays(pDate, 20);

            const match = txnsList.find(t => {
                const txDate = parseISO(t.date);
                const isExpense = parseFloat(t.amount) < 0;
                const txAmt = Math.abs(parseFloat(t.amount));
                const pAmt = parseFloat(payment.amount);

                // Allow 10% variance or exact name match
                const amtMatch = Math.abs(txAmt - pAmt) <= (pAmt || 1) * 0.1;
                const nameMatch = t.description?.toLowerCase().includes(bill.name?.toLowerCase().split(' ')[0]);

                return txDate >= searchStart && txDate <= searchEnd && isExpense && (amtMatch || nameMatch);
            });

            if (match) {
                console.log(`[LAKSH] Auto-detected payment for ${payment.name}! Linking TxID: ${match.id}`);
                await updateBillPayment(payment.id, {
                    status: 'paid',
                    paidDate: match.date,
                    transactionId: match.id
                });
            }
        }

        // Phase 2: Signal Generation (Create new cycles)
        for (const bill of billsList) {
            try {
                let cycleKey;
                let dueDate;
                let calculationStart;
                let calculationEnd;

                if (bill.billType === 'credit_card') {
                    const billingDay = parseInt(bill.billingDay) || 1;
                    const dueDay = parseInt(bill.dueDay) || 1;
                    const todayDay = today.getDate();

                    if (todayDay >= billingDay) {
                        cycleKey = format(new Date(today.getFullYear(), today.getMonth(), billingDay), 'yyyy-MM');
                        const dueMonth = (dueDay < billingDay) ? today.getMonth() + 1 : today.getMonth();
                        dueDate = format(new Date(today.getFullYear(), dueMonth, dueDay), 'yyyy-MM-dd');

                        calculationEnd = new Date(today.getFullYear(), today.getMonth(), billingDay);
                        calculationStart = subMonths(calculationEnd, 1);
                    } else {
                        const lastMonth = subMonths(today, 1);
                        cycleKey = format(new Date(lastMonth.getFullYear(), lastMonth.getMonth(), billingDay), 'yyyy-MM');
                        const dueMonth = (dueDay < billingDay) ? lastMonth.getMonth() + 1 : lastMonth.getMonth();
                        dueDate = format(new Date(lastMonth.getFullYear(), dueMonth, dueDay), 'yyyy-MM-dd');

                        calculationEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), billingDay);
                        calculationStart = subMonths(calculationEnd, 1);
                    }
                } else {
                    cycleKey = currentMonthKey;
                    const dueDay = parseInt(bill.dueDay) || 1;
                    dueDate = format(new Date(today.getFullYear(), today.getMonth(), dueDay), 'yyyy-MM-dd');
                }

                const uniqueKey = `${bill.id}:${cycleKey}`;
                if (existingCycles.has(uniqueKey) || generatedBuffer.current.has(uniqueKey)) {
                    continue;
                }

                // Smart CC Amount Logic
                let amount = parseFloat(bill.amount) || 0;
                if (bill.billType === 'credit_card' && calculationStart && calculationEnd) {
                    const cardTag = bill.name.toLowerCase().split(' ')[0];
                    const cardTxns = txnsList.filter(t => {
                        const amt = parseFloat(t.amount);
                        if (amt >= 0) return false;
                        const dt = parseISO(t.date);
                        return dt >= calculationStart && dt < calculationEnd &&
                            t.description?.toLowerCase().includes(cardTag);
                    });

                    amount = Math.abs(cardTxns.reduce((sum, t) => sum + parseFloat(t.amount), 0));
                    // Skip if no spending detected for CC unless it's a fixed bill
                    if (amount === 0 && bill.billType === 'credit_card') continue;
                }

                const meshDate = parseISO(dueDate);
                const instanceName = `${bill.name} - ${format(meshDate, 'MMM yy')}`;

                const newPayment = {
                    id: generateId(),
                    billId: bill.id,
                    name: instanceName,
                    cycle: cycleKey,
                    amount: amount,
                    dueDate: dueDate,
                    status: 'pending'
                };

                try {
                    await sheetsService.addBillPayment(spreadsheetId, newPayment);
                    newPayments.push(newPayment);
                    generatedBuffer.current.add(uniqueKey);
                } catch (sheetsErr) {
                    console.error(`[LAKSH] Smart generate fail for ${bill.name}:`, sheetsErr);
                }
            } catch (err) {
                console.error(`[LAKSH] Generation error for ${bill.name}:`, err);
            }
        }

        if (newPayments.length > 0) {
            setBillPayments(prev => [...prev, ...newPayments]);
            toast(`Smart Brain: Detected ${newPayments.length} new bill signals`);
        }

        // Store flag in _Config to mark this check as complete
        try {
            await sheetsService.setConfig(spreadsheetId, 'last_bill_audit', new Date().toISOString());
        } catch (e) {
            console.warn('[LAKSH] Failed to update bill audit flag in cloud');
        }
    };

    // Deprecated: connect function using clientId/spreadsheetId
    // All authentication/session restoration is now handled by OAuth (cloudBackup)

    const refreshData = useCallback(async (sheetId, forceRefresh = false) => {
        // If sheetId is passed, we proceed regardless of isGuest (used during login transition)
        if (isGuest && !sheetId) {
            console.log('[LAKSH] Guest mode active, skipping cloud refresh');
            setIsLoading(false);
            return;
        }

        const spreadsheetId = sheetId || config.spreadsheetId;
        if (!spreadsheetId) {
            console.warn('[LAKSH] refreshData called without spreadsheetId');
            return;
        }

        console.log(`[LAKSH] Starting data refresh for sheet: ${spreadsheetId.substring(0, 10)}...`);

        // Clear cache if force refresh requested
        if (forceRefresh) {
            sheetsService.clearCache();
        }

        setIsSyncing(true);
        setError(null);

        try {
            // Ensure sheets service is initialized before fetching
            console.log('[LAKSH] Ensuring sheets service is initialized...');
            if (!sheetsService.isInitialized) {
                await sheetsService.init();
            }
            
            // Double-check token is loaded
            sheetsService.ensureTokenLoaded();
            
            if (!sheetsService.accessToken && !isGuest) {
                throw new Error('Authentication required. Please sign in again.');
            }

            // Fetch all data in parallel with retry
            console.log('[LAKSH] Fetching transactions, accounts, categories, bills, billPayments, config...');
            const [fetchedTransactions, fetchedAccounts, fetchedCategories, fetchedBills, fetchedBillPayments, fetchedConfig] = await Promise.all([
                sheetsService.getTransactions(spreadsheetId, 12), // Get more months for bill detection
                sheetsService.getAccounts(spreadsheetId),
                sheetsService.getCategories(spreadsheetId),
                sheetsService.getBills(spreadsheetId),
                sheetsService.getBillPayments(spreadsheetId),
                sheetsService.getConfig(spreadsheetId)
            ]);

            console.log('[LAKSH] Fetch results:', {
                transactions: fetchedTransactions?.length || 0,
                accounts: fetchedAccounts?.length || 0,
                categories: fetchedCategories?.length || 0,
                bills: fetchedBills?.length || 0,
                billPayments: fetchedBillPayments?.length || 0,
                configKeys: Object.keys(fetchedConfig || {})
            });

            // Update state
            setTransactions(fetchedTransactions);
            setAccounts(fetchedAccounts);
            setCategories(fetchedCategories);
            setBills(fetchedBills);
            setBillPayments(fetchedBillPayments);

            // Smart Bill Instance Generation (Logic to reduce client-side manual work)
            await generateBillInstances(fetchedBills, fetchedBillPayments, fetchedTransactions, spreadsheetId);

            // Cache data locally for offline access
            await localDB.saveData({
                transactions: fetchedTransactions,
                accounts: fetchedAccounts,
                categories: fetchedCategories,
                bills: fetchedBills,
                billPayments: fetchedBillPayments
            });

            setLastSyncTime(new Date());
            setLoadingStatus({ step: 4, message: 'Ready!', error: null });
            console.log('[LAKSH] Sync complete!');
        } catch (err) {
            console.error('[LAKSH] Refresh failed:', err);
            const errorMessage = err.message || 'Unknown error occurred';
            setError(errorMessage);
            setLoadingStatus({ step: 3, message: 'Sync failed', error: errorMessage });

            // Provide more specific error messages
            if (err.message?.includes('401') || err.message?.includes('auth') || err.message?.includes('Authentication')) {
                const detailedError = 'Authentication failed. Your session may have expired. Please sign in again from Settings.';
                setError(detailedError);
                toast('Session expired. Please sign in again.', 'error');
            } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
                const detailedError = 'Network error. Please check your internet connection and try again.';
                setError(detailedError);
                toast('Connection failed. Check your internet.', 'error');
            } else if (err.message?.includes('403') || err.message?.includes('permission')) {
                const detailedError = 'Permission denied. Please ensure the app has access to your Google Sheets.';
                setError(detailedError);
                toast('Permission denied. Check app access.', 'error');
            } else {
                toast(`Sync failed: ${errorMessage}. Using cached data if available.`, 'error');
            }
        } finally {
            setIsSyncing(false);
            setIsLoading(false); // Ensure loading state is cleared
        }
    }, [config.spreadsheetId, isGuest, toast]);

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
                        { properties: { title: "Transactions" } }, // Keep Transactions generic
                        { properties: { title: "_Accounts" } },
                        { properties: { title: "_Categories" } },
                        { properties: { title: "_Bills" } },
                        { properties: { title: "_Config" } }
                    ]
                }
            });

            const newSpreadsheetId = createResponse.result.spreadsheetId;
            setConfig(prev => ({ ...prev, spreadsheetId: newSpreadsheetId }));
            storage.set(STORAGE_KEYS.SPREADSHEET_ID, newSpreadsheetId);
            storage.set(STORAGE_KEYS.SPREADSHEET_NAME, 'LAKSH Finance');
            storage.set(STORAGE_KEYS.EVER_CONNECTED, 'true');

            // 2. Populate Headers & Defaults
            await gapi.client.sheets.spreadsheets.values.batchUpdate({
                spreadsheetId: newSpreadsheetId,
                resource: {
                    valueInputOption: "USER_ENTERED",
                    data: [
                        {
                            range: "Transactions!A1:I1",
                            values: [["ID", "Date", "Description", "Amount", "Category", "AccountID", "Type", "CreatedAt", "Friend"]]
                        },
                        {
                            range: "_Accounts!A1:H1",
                            values: [
                                ["ID", "Name", "Type", "Balance", "BillingDay", "DueDay", "CreatedAt", "IsSecret"]
                            ]
                        },
                        {
                            range: "_Categories!A1:D11",
                            values: [
                                ["Name", "Keywords", "Color", "Icon"],
                                ["Groceries", "walmart,kroger,grocery,supermarket", "#22c55e", "🛒"],
                                ["Dining", "restaurant,cafe,mcdonalds,starbucks,pizza", "#f59e0b", "🍕"],
                                ["Transportation", "uber,lyft,gas,petrol,shell,parking", "#3b82f6", "🚗"],
                                ["Entertainment", "netflix,spotify,movie,cinema,game", "#8b5cf6", "🎬"],
                                ["Utilities", "electric,water,internet,phone,bill", "#64748b", "💡"],
                                ["Healthcare", "pharmacy,doctor,hospital,medical", "#ef4444", "🏥"],
                                ["Shopping", "amazon,target,mall,store", "#ec4899", "🛍️"],
                                ["Subscriptions", "subscription,monthly,annual", "#06b6d4", "📱"],
                                ["Income", "salary,payment,deposit,transfer in", "#10b981", "💰"],
                                ["Other", "", "#94a3b8", "📦"]
                            ]
                        },
                        {
                            range: "_Bills!A1:J1",
                            values: [["ID", "Name", "Amount", "DueDay", "BillingDay", "Category", "Status", "BillType", "Cycle", "CreatedAt"]]
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

    // New: Auto-connect using OAuth session (cloudBackup)
    useEffect(() => {
        const autoConnect = async () => {
            if (!isMountedRef.current) return;

            setLoadingStatus({ step: 0, message: 'Checking credentials...', error: null });

            // Skip auto-connect if already connected - prevents blinking on navigation
            const savedId = storage.get(STORAGE_KEYS.SPREADSHEET_ID) || localStorage.getItem('finday_spreadsheet_id');
            const savedToken = localStorage.getItem('google_access_token');
            const tokenExpiry = localStorage.getItem('google_token_expiry');
            const isTokenValid = savedToken && tokenExpiry && Date.now() < parseInt(tokenExpiry);

            if (savedId && isTokenValid && isConnected) {
                console.log('[LAKSH] Already connected, skipping autoConnect');
                setLoadingStatus({ step: 4, message: 'Ready!', error: null });
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            let hasCachedData = false;

            // Check for guest mode first
            const isGuestMode = storage.getBool(STORAGE_KEYS.GUEST_MODE);
            if (isGuestMode) {
                console.log('[LAKSH] Guest mode detected, loading local data');
                setLoadingStatus({ step: 1, message: 'Loading local data...', error: null });
                try {
                    const cachedData = await localDB.getAllData();
                    if (cachedData.hasData) {
                        setTransactions(cachedData.transactions || []);
                        setAccounts(cachedData.accounts || []);
                        setCategories(cachedData.categories || []);
                        setBills(cachedData.bills || []);
                    } else {
                        await initializeDefaultData();
                    }
                    setIsConnected(true);
                    setLoadingStatus({ step: 4, message: 'Ready!', error: null });
                    setIsLoading(false);
                    return;
                } catch (e) {
                    console.error('[LAKSH] Guest mode init failed:', e);
                    await initializeDefaultData();
                    setIsConnected(true);
                    setLoadingStatus({ step: 4, message: 'Ready!', error: null });
                    setIsLoading(false);
                    return;
                }
            }

            // Special handling for Android WebView - but respect first-time setup
            if (isAndroidWebView()) {
                console.log('[LAKSH] Detected Android WebView');
                setLoadingStatus({ step: 1, message: 'Checking local storage...', error: null });

                // Check if user has ever connected to Google Sheets
                const hasEverConnected = storage.get(STORAGE_KEYS.SPREADSHEET_ID) ||
                    localStorage.getItem('finday_spreadsheet_id') ||
                    storage.get(STORAGE_KEYS.EVER_CONNECTED);

                if (!hasEverConnected) {
                    console.log('[LAKSH] Fresh install - needs Google Sheets setup');
                    setIsConnected(false);
                    setIsLoading(false);
                    setLoadingStatus({ step: 0, message: 'Setup required', error: null });
                    return;
                }

                console.log('[LAKSH] Previously connected - initializing offline mode');
                setLoadingStatus({ step: 2, message: 'Loading cached data...', error: null });
                try {
                    const cachedData = await localDB.getAllData();
                    if (!isMountedRef.current) return;

                    if (cachedData.hasData) {
                        console.log('[LAKSH] Loading cached data for WebView');
                        setTransactions(cachedData.transactions || []);
                        setAccounts(cachedData.accounts || []);
                        setCategories(cachedData.categories || []);
                        setBills(cachedData.bills || []);
                        setBillPayments(cachedData.billPayments || []);
                        if (cachedData.lastSyncTime) {
                            setLastSyncTime(new Date(cachedData.lastSyncTime));
                        }
                        hasCachedData = true;
                    } else {
                        console.log('[LAKSH] No cached data - initializing with defaults');
                        await initializeDefaultData();
                    }

                    // Handle Android bridge for SMS transactions
                    if (window.AndroidBridge && typeof window.AndroidBridge.getPendingTransactions === 'function') {
                        try {
                            const pendingJson = window.AndroidBridge.getPendingTransactions();
                            if (pendingJson && pendingJson !== '[]') {
                                const pendingTxns = JSON.parse(pendingJson);
                                if (Array.isArray(pendingTxns) && pendingTxns.length > 0) {
                                    console.log('[LAKSH] Found pending Android transactions:', pendingTxns.length);

                                    // Queue for approval instead of auto-adding
                                    let addedCount = 0;
                                    for (const txn of pendingTxns) {
                                        // Ensure basic fields
                                        const pending = {
                                            ...txn,
                                            id: txn.id || Date.now() + Math.random().toString(),
                                            status: 'pending', // Explicitly mark as pending
                                            source: 'sms_android'
                                        };
                                        const enriched = enrichTransaction(pending);
                                        const added = transactionDetector.addPending(enriched);
                                        if (added) addedCount++;
                                    }

                                    if (addedCount > 0) {
                                        toast(`${addedCount} new transaction(s) detected! Review them in the badge.`, 'info');
                                    }

                                    if (typeof window.AndroidBridge.clearPendingTransactions === 'function') {
                                        window.AndroidBridge.clearPendingTransactions();
                                    }
                                }
                            }
                        } catch (e) {
                            console.log('[LAKSH] Bridge error (safe to ignore):', e.message);
                        }
                    }

                    // Set as connected in offline mode only after previous connection
                    console.log('[LAKSH] WebView offline mode activated');
                    setIsConnected(true);

                    // Show toast to indicate data loaded
                    // toast('Loaded local data', 'info');

                    // Proceed to cloud sync (Real Sync Up) instead of returning
                    // logic continues below...

                } catch (e) {
                    console.error('[LAKSH] Failed to initialize WebView data:', e);
                    await initializeDefaultData();
                }
            }

            // Web version logic (existing code)
            const bridge = window.AndroidBridge;
            if (bridge && typeof bridge.getPendingTransactions === 'function') {
                try {
                    const pendingJson = bridge.getPendingTransactions();
                    if (pendingJson && pendingJson !== '[]') {
                        const pendingTxns = JSON.parse(pendingJson);
                        if (Array.isArray(pendingTxns) && pendingTxns.length > 0) {
                            console.log('[LAKSH] Processing bridge transactions:', pendingTxns.length);

                            let addedCount = 0;
                            for (const txn of pendingTxns) {
                                // Important: If native app already marked as approved, we can auto-add
                                // However, for now, we follow the "Review Everything" policy
                                const pending = {
                                    ...txn,
                                    id: txn.id || generateId(),
                                    status: 'pending',
                                    detectedAt: txn.detectedAt || new Date().toISOString(),
                                    source: 'sms_android'
                                };
                                const enriched = enrichTransaction(pending);
                                const added = transactionDetector.addPending(enriched);
                                if (added) addedCount++;
                            }

                            if (addedCount > 0) {
                                toast(`${addedCount} new transaction(s) detected! Review them in the badge.`, 'info');
                            }

                            // Clear pending on device to prevent multiple injections
                            if (typeof bridge.clearPendingTransactions === 'function') {
                                bridge.clearPendingTransactions();
                            }
                        }
                    }
                } catch (e) {
                    console.warn('[LAKSH] Bridge sync error:', e.message);
                }
            }

            if (!isMountedRef.current) return;

            setLoadingStatus({ step: 2, message: 'Connecting to Google...', error: null });

            // Use cloudBackup for session restoration
            const { cloudBackup } = await importWithRetry(() => import('../services/cloudBackup'));

            // Initialize cloudBackup first to check for existing sessions
            try {
                await cloudBackup.init();
                console.log('[FinanceContext] CloudBackup initialized successfully');
                setLoadingStatus({ step: 3, message: 'Fetching your data...', error: null });
            } catch (error) {
                console.log('[FinanceContext] CloudBackup init error, continuing with offline mode:', error);
                setLoadingStatus({ step: 2, message: 'Using offline mode...', error: error.message });
            }

            if (!isMountedRef.current) return;

            // Check if user has selected a spreadsheet (from Welcome page)
            const savedSpreadsheetId = storage.get(STORAGE_KEYS.SPREADSHEET_ID) || localStorage.getItem('finday_spreadsheet_id');

            // Check for token directly in localStorage (important for Android WebView)
            const directToken = localStorage.getItem('google_access_token');
            const directExpiry = localStorage.getItem('google_token_expiry');
            const hasValidDirectToken = directToken && directExpiry && Date.now() < parseInt(directExpiry);

            console.log('[LAKSH] Auth check:', {
                savedSpreadsheetId: !!savedSpreadsheetId,
                cloudBackupSignedIn: cloudBackup.isSignedIn(),
                cloudBackupToken: !!cloudBackup.accessToken,
                hasValidDirectToken,
                hasCachedData
            });

            // If we have a spreadsheet ID and some form of authentication, proceed
            if (savedSpreadsheetId && (cloudBackup.isSignedIn() || cloudBackup.accessToken || hasValidDirectToken || hasCachedData)) {
                if (isMountedRef.current) {
                    setConfig(prev => ({ ...prev, spreadsheetId: savedSpreadsheetId }));
                }

                // Try to get user info, but don't fail if it's not available
                let user = cloudBackup.getUser();
                if (!user && (cloudBackup.accessToken || hasValidDirectToken)) {
                    // We have a token but no user info, that's okay for now
                    user = { id: 'temp_user' };
                } else if (!user && hasCachedData) {
                    // We have cached data but no user info, create temporary user
                    user = { id: 'offline_user', name: 'Offline User' };
                }

                if (user || hasCachedData) {
                    if (user && isMountedRef.current) {
                        setConfig(prev => ({ ...prev, user }));
                    }
                    if (isMountedRef.current) {
                        setIsConnected(true);
                        // If we have a sheet and token, we are definitely NOT a guest
                        if (isGuest) {
                            setIsGuest(false);
                            storage.set(STORAGE_KEYS.GUEST_MODE, 'false');
                        }
                        // Trigger initial sync if we have any valid token
                        if (cloudBackup.isSignedIn() || cloudBackup.accessToken || hasValidDirectToken) {
                            console.log('[LAKSH] Triggering data refresh after login...');
                            setLoadingStatus({ step: 3, message: 'Fetching your data...', error: null });
                            try {
                                // Ensure sheets service is initialized before refresh
                                await ensureSheetsReady();
                                await refreshData(savedSpreadsheetId, true); // Force refresh after login
                            } catch (refreshError) {
                                console.error('[LAKSH] Refresh after login failed:', refreshError);
                                setError(refreshError.message || 'Failed to load data after login');
                                setLoadingStatus({ step: 3, message: 'Failed to load data', error: refreshError.message });
                                // Still show as connected if we have cached data
                                if (hasCachedData) {
                                    console.log('[LAKSH] Using cached data due to refresh failure');
                                }
                            }
                        } else {
                            console.log('[LAKSH] No valid token, skipping refresh');
                            setIsLoading(false);
                        }
                    }
                } else {
                    if (isMountedRef.current) {
                        setIsLoading(false);
                        setIsConnected(false);
                    }
                    return;
                }
            } else if (hasCachedData) {
                // If we have cached data but no spreadsheet ID, still show as connected for offline use
                if (isMountedRef.current) {
                    setConfig(prev => ({ ...prev, user: { id: 'offline_user', name: 'Offline User' } }));
                    setIsConnected(true);
                    setIsLoading(false);
                }
            } else {
                if (isMountedRef.current) {
                    setIsLoading(false);
                    setIsConnected(false);
                }
                return;
            }

            // SLM: Smart Ledger Management (deduplication, reconciliation)
            if (isMountedRef.current) {
                setTransactions(prev => {
                    // Deduplicate by id/date/amount
                    const seen = new Set();
                    const deduped = [];
                    for (const t of prev) {
                        const key = (t.id || '') + (t.date || '') + (t.amount || '');
                        if (!seen.has(key)) {
                            seen.add(key);
                            deduped.push(t);
                        }
                    }
                    return deduped;
                });
                // Placeholder: Add advanced reconciliation logic here (e.g., match cloud vs SMS vs manual, resolve conflicts)
                setIsSyncing(false);
            }
        };

        autoConnect().catch(error => {
            console.error('[FinanceContext] AutoConnect error:', error);
            if (isMountedRef.current) {
                setIsLoading(false);
                setIsConnected(false);
                setError('Failed to initialize app');
            }
        });

    }, []);

    // ===== POLL FOR TOKEN (WebView Fix) =====
    useEffect(() => {
        if (isConnected) return;

        const interval = setInterval(() => {
            const token = localStorage.getItem('google_access_token');
            const refreshRequired = localStorage.getItem('oauth_refresh_required');
            // Ensure we don't reload if we are already in the process of connecting
            if (token && !isConnected && !isLoading) {
                console.log('[LAKSH] Token detected via polling, reloading to initialize...');
                window.location.reload();
            }
            // Check if OAuth callback set refresh flag
            if (refreshRequired === 'true' && config.spreadsheetId && !isSyncing) {
                console.log('[LAKSH] OAuth refresh required, triggering data refresh...');
                localStorage.removeItem('oauth_refresh_required');
                refreshData(config.spreadsheetId, true).catch(err => {
                    console.error('[LAKSH] OAuth refresh failed:', err);
                });
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [isConnected, isLoading, config.spreadsheetId, isSyncing, refreshData]);

    // ===== NOTIFICATIONS =====
    useEffect(() => {
        const checkBills = async () => {
            if (bills.length === 0 || !('Notification' in window)) return;

            // Only check permission, don't request it without user gesture
            if (Notification.permission === 'default') {
                // Don't request permission here - it needs a user gesture.
                // The user can enable notifications from the Settings page.
                return;
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
            console.log('[Finday CC] generateCCBills triggered. Checking conditions...');
            // Only run if we have data and not currently syncing
            if (accounts.length === 0 && transactions.length === 0) {
                console.log('[Finday CC] Skipping: No accounts/transactions loaded yet.');
                return;
            }
            if (isSyncing) {
                console.log('[Finday CC] Skipping: Currently syncing.');
                return;
            }
            // Relaxing lastSyncTime check since cached data is enough to generate bills
            // if (!lastSyncTime) ...

            // Lock to prevent concurrent execution
            const lockKey = 'finday_cc_bill_lock';
            const lock = localStorage.getItem(lockKey);
            if (lock && Date.now() - parseInt(lock) < 30000) {
                console.log('[Finday CC] Skipping: Locked (ran recently).');
                return;
            }
            localStorage.setItem(lockKey, Date.now().toString());

            const creditAccounts = accounts.filter(a => a.type === 'credit');
            console.log(`[Finday CC] Found ${creditAccounts.length} credit accounts.`);

            const today = new Date();
            const currentDay = today.getDate();
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();

            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

            for (const acc of creditAccounts) {
                if (!acc.billingDay) continue;

                const billingDay = parseInt(acc.billingDay);
                const dueDay = parseInt(acc.dueDay) || billingDay + 20;

                console.log(`[Finday CC] Checking ${acc.name}. BillingDay: ${billingDay}, CurrentDay: ${currentDay}`);

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

                    // 2. Check by Name + Account ID (Fallback)
                    // Also check vaguely for same month/year to prevent duplicates if names vary slightly
                    const existingBillByName = bills.find(b => {
                        // STRICT NAME MATCH (Most common case for duplicates)
                        if (b.name === billName) return true;

                        // LOOSE MATCH: Same Month/Year tag + Account ID match
                        // Only enforce AccountID match if the existing bill HAS an account ID.
                        // If existing bill has no account ID (legacy), we can't safely dedupe by it so we rely largely on name.
                        const nameMatches = b.name.includes(monthNames[currentMonth]) && b.name.includes(currentYear.toString());
                        const accountMatches = b.accountId ? (b.accountId === acc.id) : true;

                        return nameMatches && accountMatches;
                    });

                    const existingBill = existingBillByCycle || existingBillByName;
                    if (existingBill) {
                        console.log(`[Finday CC] Skipping ${acc.name}: Bill already exists (${existingBill.name})`);
                    }

                    // Check ephemeral lock for this specific bill (session scope)
                    const billLockKey = `finday_bill_created_${acc.id}_${currentMonth}_${currentYear}`;
                    const inMemoryLock = createdBillsRef.current.has(billLockKey);

                    if (inMemoryLock) {
                        console.log(`[Finday CC] Skipping ${acc.name}: In-memory lock active.`);
                    }

                    if (!existingBill && !inMemoryLock) {
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
                        const debt = acc.balance < 0 ? Math.abs(acc.balance) : 0;
                        const totalSpent = totalFromTx > 0 ? totalFromTx : debt;

                        console.log(`[Finday CC] ${acc.name}: Cycle ${cycleStartStr} to ${cycleEndStr}. TxTotal: ${totalFromTx}, Debt: ${debt}, TotalSpent: ${totalSpent}`);

                        if (totalSpent > 0 || totalFromTx > 0) {
                            createdBillsRef.current.add(billLockKey);
                            // REMOVED: localStorage.setItem(billLockKey, 'true'); -> This was preventing regeneration after delete

                            const newBill = {
                                name: billName,
                                amount: totalSpent,
                                dueDay: dueDay,
                                category: 'Bills',
                                status: 'due',
                                accountId: acc.id, // Linked Account ID
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

    // ===== MOBILE APP INITIALIZATION =====
    const initializeDefaultData = async () => {
        try {
            // Initialize with default accounts and categories for mobile users
            const defaultAccounts = [
                {
                    id: generateId(),
                    name: 'Cash',
                    type: 'cash',
                    balance: 0,
                    currency: 'INR',
                    isActive: true
                },
                {
                    id: generateId(),
                    name: 'Bank Account',
                    type: 'bank',
                    balance: 0,
                    currency: 'INR',
                    isActive: true
                }
            ];

            const defaultCategories = [
                { id: generateId(), name: 'Food & Dining', color: '#FF6B6B', type: 'expense', icon: '🍽️' },
                { id: generateId(), name: 'Transportation', color: '#4ECDC4', type: 'expense', icon: '🚗' },
                { id: generateId(), name: 'Shopping', color: '#45B7D1', type: 'expense', icon: '🛍️' },
                { id: generateId(), name: 'Entertainment', color: '#96CEB4', type: 'expense', icon: '🎬' },
                { id: generateId(), name: 'Salary', color: '#FECA57', type: 'income', icon: '💰' },
                { id: generateId(), name: 'Other Income', color: '#48CAE4', type: 'income', icon: '💵' }
            ];

            setAccounts(defaultAccounts);
            setCategories(defaultCategories);
            setTransactions([]);
            setBills([]);

            // Save to local database
            await localDB.saveData({
                accounts: defaultAccounts,
                categories: defaultCategories,
                transactions: [],
                bills: []
            });

            console.log('[LAKSH] Mobile app initialized with default data');
        } catch (error) {
            console.error('Failed to initialize default data:', error);
        }
    };

    // ===== TRANSACTIONS CRUD =====

    const addTransaction = async (data) => {
        // Check if period is closed
        const periodKey = data.date.substring(0, 7); // YYYY-MM
        if (closedPeriods.includes(periodKey)) {
            toast('This period is closed. Further modifications are not allowed.', 'error');
            return null;
        }

        const transaction = {
            id: generateId(),
            ...data,
            amount: data.type === 'income' ? Math.abs(data.amount) : -Math.abs(data.amount)
        };

        // Optimistic update for Transaction
        const newTransactions = [{ ...transaction, synced: false }, ...transactions];
        setTransactions(newTransactions);

        // Optimistic update for Account Balance
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

        // Save immediately to localDB
        localDB.saveData({
            transactions: newTransactions,
            accounts: newAccounts,
            categories,
            bills
        }).catch(e => console.warn('[LAKSH] Local save failed:', e));

        if (!config.spreadsheetId) {
            toast('Transaction saved locally. Connect Sheet to sync.', 'info');
            return transaction;
        }

        setIsSyncing(true);
        try {
            // Ensure sheets service is ready
            await ensureSheetsReady();

            await sheetsService.addTransaction(config.spreadsheetId, transaction);
            setTransactions(prev => prev.map(t => t.id === transaction.id ? { ...t, synced: true } : t));
            setLastSyncTime(new Date());

            // Sync account balance to cloud
            if (data.accountId) {
                const account = accounts.find(a => a.id === data.accountId);
                if (account) {
                    const newBalance = account.balance + transaction.amount;
                    try {
                        await sheetsService.updateAccount(config.spreadsheetId, data.accountId, { balance: newBalance });
                    } catch (accError) {
                        console.warn('[LAKSH] Failed to sync account balance, will retry on next sync', accError);
                    }
                    // State already updated optimistically above
                    // State already updated optimistically above


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

                            // Auto-Mark CC Bill as Paid
                            // Find an outstanding bill for this CC account
                            const ccBill = bills.find(b =>
                                (b.accountId === ccAccount.id || b.billAccountId === ccAccount.id) &&
                                b.status !== 'paid' &&
                                // Optional: Match amount loosely (within 10 rupees) to ensure we pay the right bill
                                // If user pays partial, maybe we shouldn't mark as full paid? 
                                // For now, let's assume if they select the card pay, they intend to settle the statement.
                                Math.abs(parseFloat(b.amount) - Math.abs(transaction.amount)) < 100
                            );

                            if (ccBill) {
                                await sheetsService.updateBill(config.spreadsheetId, ccBill.id, { status: 'paid' });
                                setBills(prev => prev.map(b => b.id === ccBill.id ? { ...b, status: 'paid' } : b));
                                toast(`Linked Bill "${ccBill.name}" marked as paid ✓`);
                            }
                        }
                    }

                    // --- FALLBACK SMART LOGIC (for imports/legacy) ---
                    // Only run if NO explicit data was provided
                    if (!data.billId && !data.linkedAccountId) {
                        // 1. Auto-Match Utility/Regular Bills
                        if (transaction.type === 'expense') {
                            const txAmount = Math.abs(transaction.amount);
                            const txDesc = transaction.description.toLowerCase();

                            // Find a due bill that matches amount and description keywords
                            const matchedBill = bills.find(b => {
                                if (b.status === 'paid') return false;
                                const billAmount = parseFloat(b.amount);
                                // Amount match (exact for bills usually, but allow tiny variance)
                                const amountMatch = Math.abs(billAmount - txAmount) < 2;

                                // Name match: check if bill name is in transaction description
                                const nameMatch = txDesc.includes(b.name.toLowerCase());

                                return amountMatch && nameMatch;
                            });

                            if (matchedBill) {
                                try {
                                    await sheetsService.updateBill(config.spreadsheetId, matchedBill.id, { status: 'paid' });
                                    setBills(prev => prev.map(b => b.id === matchedBill.id ? { ...b, status: 'paid' } : b));
                                    toast(`Auto-marked Bill "${matchedBill.name}" as paid ✓`);
                                } catch (e) {
                                    console.warn('Failed to auto-mark bill', e);
                                }
                            }
                        }

                        // 2. Auto-Match CC Payments (Existing Logic)
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
            // Ensure sheets service is properly initialized
            await ensureSheetsReady();

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
            await ensureSheetsReady();
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

        // Smart Propagation: If bill details change, update all PENDING payments for this bill
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

            // Push payment updates to cloud too
            for (const p of newPayments.filter(p => p.billId === billId && p.status === 'pending')) {
                await sheetsService.updateBillPayment(config.spreadsheetId, p.id, {
                    amount: p.amount,
                    name: p.name
                });
            }

            setLastSyncTime(new Date());
        } catch (err) {
            console.error('[LAKSH] updateBill failed:', err);
        } finally {
            setIsSyncing(false);
        }
    };

    const updateBillPayment = async (paymentId, updates) => {
        const newPayments = billPayments.map(p => p.id === paymentId ? { ...p, ...updates } : p);
        setBillPayments(newPayments);
        localDB.saveData({ transactions, accounts, categories, bills, billPayments: newPayments });

        if (!config.spreadsheetId) return;

        setIsSyncing(true);
        try {
            await sheetsService.updateBillPayment(config.spreadsheetId, paymentId, updates);
            setLastSyncTime(new Date());
        } catch (err) {
            console.error('[LAKSH] updateBillPayment failed:', err);
            throw err;
        } finally {
            setIsSyncing(false);
        }
    };

    const deleteBill = async (billId) => {
        const bill = bills.find(b => b.id === billId);
        const newBills = bills.filter(b => b.id !== billId);

        // Smart Cleanup: Delete all PENDING payments associated with this bill
        const paymentsToDelete = billPayments.filter(p => p.billId === billId && p.status === 'pending');
        const newPayments = billPayments.filter(p => !(p.billId === billId && p.status === 'pending'));

        setBills(newBills);
        setBillPayments(newPayments);
        localDB.saveData({ transactions, accounts, categories, bills: newBills, billPayments: newPayments });

        if (!config.spreadsheetId) return;

        setIsSyncing(true);
        try {
            await sheetsService.deleteBill(config.spreadsheetId, billId);

            // Clean up cloud payments
            for (const p of paymentsToDelete) {
                await sheetsService.deleteBillPayment(config.spreadsheetId, p.id);
            }

            setLastSyncTime(new Date());
        } catch (err) {
            console.error('[LAKSH] deleteBill failed:', err);
            // Restore local state on failure
            setBills(prev => [...prev, bill]);
        } finally {
            setIsSyncing(false);
        }
    };

    // ===== SMART QUERY =====

    const smartQuery = async (query) => {
        const queryLower = query.toLowerCase();

        // Local Smart Query (Enhanced Offline engine)
        const localQuery = () => {
            let results = [...transactions];
            let summary = '';

            const q = queryLower.trim();

            // 1. Time Extraction
            const now = new Date();
            let timeFiltered = false;

            if (q.includes('this month')) {
                results = results.filter(t => new Date(t.date).getMonth() === now.getMonth() && new Date(t.date).getFullYear() === now.getFullYear());
                timeFiltered = true;
            } else if (q.includes('last month')) {
                const lm = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
                const ly = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
                results = results.filter(t => new Date(t.date).getMonth() === lm && new Date(t.date).getFullYear() === ly);
                timeFiltered = true;
            } else if (q.includes('this year')) {
                results = results.filter(t => new Date(t.date).getFullYear() === now.getFullYear());
                timeFiltered = true;
            }

            // 2. Category Extraction
            const cats = categories.filter(c => q.includes(c.name.toLowerCase()));
            if (cats.length > 0) {
                results = results.filter(t => cats.some(c => t.category === c.name));
            }

            // 3. Amount/Query Logic
            const total = results.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

            if (results.length === 0) {
                summary = "I couldn't find any transactions matching that.";
            } else {
                summary = `Spent ₹${Math.abs(total).toLocaleString()} across ${results.length} signals${cats.length > 0 ? ` in ${cats.map(c => c.name).join(', ')}` : ''}.`;
            }

            return {
                summary,
                transactions: results.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10),
                total: Math.abs(total)
            };
        };

        if (!config.spreadsheetId || isGuest) {
            return localQuery();
        }

        try {
            return await sheetsService.smartQuery(config.spreadsheetId, query);
        } catch (err) {
            console.warn('Sheets smartQuery failed, falling back to local:', err);
            return localQuery();
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
        // Handle object-based updates (e.g. { spreadsheetId: '...' })
        if (typeof key === 'object' && key !== null) {
            const updates = key;
            setConfig(prev => {
                const newConfig = { ...prev, ...updates };
                // If spreadsheetId is being set, also update isConnected and trigger refresh
                if (updates.spreadsheetId) {
                    setIsConnected(true);
                    setIsGuest(false);
                    storage.set(STORAGE_KEYS.GUEST_MODE, 'false');
                    storage.set(STORAGE_KEYS.SPREADSHEET_ID, updates.spreadsheetId);
                    // Standard trigger for refreshData
                    refreshData(updates.spreadsheetId);
                }
                return newConfig;
            });
            return;
        }

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
        // Special handling for Android WebView
        if (isAndroidWebView()) {
            console.log('[LAKSH] Disconnecting in WebView mode');

            // Clear all local data including "ever connected" flag
            await localDB.clearAll();
            localStorage.removeItem('laksh_ever_connected');
            localStorage.removeItem('finday_spreadsheet_id');

            // Reset state
            setIsConnected(false);
            setTransactions([]);
            setAccounts([]);
            setCategories([]);
            setBills([]);
            setConfig({ spreadsheetId: '', clientId: '', currency: 'INR' });

            toast('Disconnected - all data cleared', 'info');
            return;
        }

        // Web version disconnect logic
        sheetsService.signOut();

        // Clear session data using unified storage
        storage.remove(STORAGE_KEYS.CLIENT_ID);
        storage.remove(STORAGE_KEYS.SPREADSHEET_ID);
        storage.clearSession();

        // Clear cached data and ever connected flag
        await localDB.clearAll();
        localStorage.removeItem('laksh_ever_connected');
        localStorage.removeItem('finday_spreadsheet_id');

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

    // Restore data from cloud backup
    const restoreFromBackup = useCallback(async (data) => {
        if (!data) return;

        try {
            // Update state with restored data
            if (data.transactions) setTransactions(data.transactions);
            if (data.accounts) setAccounts(data.accounts);
            if (data.categories) setCategories(data.categories);
            if (data.bills) setBills(data.bills);

            // Save to local cache
            await localDB.saveData({
                transactions: data.transactions || [],
                accounts: data.accounts || [],
                categories: data.categories || [],
                bills: data.bills || []
            });

            toast('Data restored from backup ✓');
            console.log('[LAKSH] Restored from backup:', {
                transactions: data.transactions?.length || 0,
                accounts: data.accounts?.length || 0,
                categories: data.categories?.length || 0,
                bills: data.bills?.length || 0
            });

            return true;
        } catch (error) {
            console.error('[LAKSH] Restore failed:', error);
            toast('Failed to restore data', 'error');
            return false;
        }
    }, [toast]);

    const value = {
        isGuest,
        isConnected,
        isLoading,
        loadingStatus,
        isSyncing,
        lastSyncTime,
        error,
        transactions,
        accounts,
        categories,
        bills,
        friends: friendsWithBalance,
        config,
        secretUnlocked,
        toggleSecretUnlock,
        // Actions
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addAccount,
        updateAccount,
        deleteAccount,
        addCategory,
        updateCategory,
        deleteCategory,
        billPayments,
        addBill,
        updateBill,
        deleteBill,
        updateBillPayment,
        smartQuery,
        autoCategorize,
        updateConfig,
        disconnect,
        forceRefresh,
        getCacheInfo,
        restoreFromBackup,
        exportData: async () => {
            const data = {
                transactions,
                accounts,
                categories,
                bills,
                closedPeriods,
                exportDate: new Date().toISOString(),
                version: '3.0.0'
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `laksh_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        },
        importData: async (jsonData) => {
            try {
                const data = JSON.parse(jsonData);
                if (data.transactions) setTransactions(data.transactions);
                if (data.accounts) setAccounts(data.accounts);
                if (data.categories) setCategories(data.categories);
                if (data.bills) setBills(data.bills);
                if (data.billPayments) setBillPayments(data.billPayments);
                if (data.closedPeriods) {
                    setClosedPeriods(data.closedPeriods);
                    storage.setJSON(STORAGE_KEYS.CLOSED_PERIODS, data.closedPeriods);
                }

                await localDB.saveData({
                    transactions: data.transactions || [],
                    accounts: data.accounts || [],
                    categories: data.categories || [],
                    bills: data.bills || [],
                    billPayments: data.billPayments || []
                });
                return true;
            } catch (e) {
                console.error('Import failed:', e);
                return false;
            }
        },
        setGuestMode: (enabled) => {
            setIsGuest(enabled);
            setIsConnected(enabled || !!config.spreadsheetId);
            storage.set(STORAGE_KEYS.GUEST_MODE, enabled);
            setConfig(prev => ({ ...prev, isGuest: enabled }));
        },
        closePeriod: (periodKey) => {
            if (!closedPeriods.includes(periodKey)) {
                const newPeriods = [...closedPeriods, periodKey];
                setClosedPeriods(newPeriods);
                storage.setJSON(STORAGE_KEYS.CLOSED_PERIODS, newPeriods);
                toast(`Period ${periodKey} closed successfully.`);
            }
        },
        createFinanceSheet,
        addFriend: (name) => {
            const result = friendsService.add(name);
            if (result) {
                setFriends(friendsService.getAll());
            }
            return result;
        }
    };

    return (
        <FinanceContext.Provider value={value}>
            {children}
        </FinanceContext.Provider>
    );
};
