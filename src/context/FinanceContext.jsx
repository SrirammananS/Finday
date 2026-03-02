import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { sheetsService } from '../services/sheets';
import { transactionDetector } from '../services/transactionDetector';
import { localDB } from '../services/localDB';
import { storage, STORAGE_KEYS } from '../services/storage';
import { generateBillInstances as generateBillInstancesService } from '../services/billInstanceGenerator';
import { importWithRetry } from '../utils/lazyRetry';
import { logger } from '../utils/logger';
import { enrichTransaction } from '../services/smsParser';
import { friendsService } from '../services/friendsService';
import { useFriendsWithBalance } from '../hooks/useFriendsWithBalance';
import { useTransactionActions } from '../hooks/useTransactionActions';
import { useBillActions } from '../hooks/useBillActions';
import { AuthProvider, useAuth } from './AuthContext';
import { generateShortId } from '../utils/generateId';

const FinanceContext = createContext();

export const useFinance = () => {
    const context = useContext(FinanceContext);
    if (!context) {
        throw new Error('useFinance must be used within a FinanceProvider');
    }
    return context;
};

const generateId = () => generateShortId();

// Detect if running in Android WebView
const isAndroidWebView = () => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    return /Android/i.test(userAgent) && /wv/i.test(userAgent);
};

function FinanceProviderInner({ children, isLoading, setIsLoading }) {
    const auth = useAuth();
    const { config, setConfig, isConnected, setIsConnected, isGuest, setIsGuest, createFinanceSheet: authCreateFinanceSheet, setGuestMode } = auth;

    const isMountedRef = useRef(true);
    const mountTimeRef = useRef(Date.now());
    const generatedBuffer = useRef(new Set());
    const [loadingStage, setLoadingStage] = useState('init'); // init | auth | fetch | ready | error
    const [loadingStatus, setLoadingStatus] = useState({ step: 0, message: 'Initializing...', error: null });
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState(null);
    const [error, setError] = useState(null);

    // Simple toast function without dependencies
    const toast = useCallback((message, type = 'success') => {
        logger.info(`${type.toUpperCase()}: ${message}`);
        // Components can handle UI feedback themselves
    }, []);

    const [transactions, setTransactions] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [bills, setBills] = useState([]);
    const [billPayments, setBillPayments] = useState([]);
    const [closedPeriods, setClosedPeriods] = useState(storage.getJSON(STORAGE_KEYS.CLOSED_PERIODS) || []);
    const [secretUnlocked, setSecretUnlocked] = useState(false);

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
    const friendsWithBalance = useFriendsWithBalance(friends, transactions);

    const toggleSecretUnlock = useCallback(() => {
        setSecretUnlocked(prev => !prev);
    }, []);

    // ===== INITIALIZATION =====
    useEffect(() => {
        isMountedRef.current = true;

        // Poll sheets service for loading stage updates
        const interval = setInterval(() => {
            const stage = sheetsService.getLoadingStage();
            setLoadingStage(prev => {
                if (prev !== stage) return stage;
                return prev;
            });
        }, 100);

        return () => {
            isMountedRef.current = false;
            clearInterval(interval);
        };
    }, []);

    // Helper function to ensure sheets service is ready (with token refresh for mobile)
    const ensureSheetsReady = async () => {
        const { cloudBackup } = await importWithRetry(() => import('../services/cloudBackup'));
        await cloudBackup.init();
        if (!sheetsService.isInitialized || !cloudBackup.isSignedIn()) {
            await sheetsService.init();
        }
        // Proactively refresh token if expired (SMS add, etc. often fails when app was backgrounded)
        const tokenExpiry = localStorage.getItem('google_token_expiry');
        const refreshToken = localStorage.getItem('google_refresh_token');
        if (refreshToken && (!tokenExpiry || Date.now() >= parseInt(tokenExpiry))) {
            try {
                await sheetsService.refreshToken();
            } catch (e) {
                logger.warn('ensureSheetsReady refresh:', e?.message);
            }
        }
    };
    // Bill actions (needed by generateBillInstances)
    const billActions = useBillActions({
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
    });
    const { addBill, updateBill, updateBillPayment, deleteBill } = billActions;

    const generateBillInstances = useCallback(async (billsList, paymentsList, txnsList, spreadsheetId) => {
        await generateBillInstancesService({
            billsList,
            paymentsList,
            txnsList,
            spreadsheetId,
            updateBillPayment,
            setBillPayments,
            toast,
            generatedBuffer,
            sheetsService,
        });
    }, [updateBillPayment, toast]);

    // Deprecated: connect function using clientId/spreadsheetId
    // All authentication/session restoration is now handled by OAuth (cloudBackup)

    const refreshData = useCallback(async (sheetId, forceRefresh = false) => {
        // If sheetId is passed, we proceed regardless of isGuest (used during login transition)
        if (isGuest && !sheetId) {
            logger.info('Guest mode active, skipping cloud refresh');
            setIsLoading(false);
            return;
        }

        const spreadsheetId = sheetId || config.spreadsheetId;
        if (!spreadsheetId) {
            logger.warn('refreshData called without spreadsheetId');
            return;
        }

        logger.info(`Starting data refresh for sheet: ${spreadsheetId.substring(0, 10)}...`);

        // Clear cache if force refresh requested
        if (forceRefresh) {
            sheetsService.clearCache();
        }

        setIsSyncing(true);
        setError(null);

        try {
            // Ensure sheets service is initialized before fetching
            logger.info('Ensuring sheets service is initialized...');
            if (!sheetsService.isInitialized) {
                await sheetsService.init();
            }

            // Proactively refresh token if expired (mobile/PWA often has stale token after background)
            const tokenExpiry = localStorage.getItem('google_token_expiry');
            const refreshToken = localStorage.getItem('google_refresh_token');
            const isTokenExpired = !tokenExpiry || Date.now() >= parseInt(tokenExpiry);
            if (!isGuest && isTokenExpired && refreshToken) {
                logger.info('Token expired, attempting refresh before sync...');
                try {
                    const refreshed = await sheetsService.refreshToken();
                    if (refreshed) {
                        logger.info('Token refreshed successfully');
                        localStorage.removeItem('laksh_connection_failed');
                    }
                } catch (refreshErr) {
                    logger.warn('Pre-sync token refresh failed:', refreshErr?.message);
                }
            }

            // Double-check token is loaded
            sheetsService.ensureTokenLoaded();

            if (!sheetsService.accessToken && !isGuest) {
                throw new Error('Authentication required. Please sign in again.');
            }
            // Fetch all data in parallel with retry
            logger.info(`Fetching data for sheet: ${spreadsheetId}`);
            const [fetchedTransactions, fetchedAccounts, fetchedCategories, fetchedBills, fetchedBillPayments, fetchedConfig] = await Promise.all([
                sheetsService.getTransactions(spreadsheetId, 12), // Get more months for bill detection
                sheetsService.getAccounts(spreadsheetId),
                sheetsService.getCategories(spreadsheetId),
                sheetsService.getBills(spreadsheetId),
                sheetsService.getBillPayments(spreadsheetId),
                sheetsService.getConfig(spreadsheetId)
            ]);

            logger.info('Fetch results:', {
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
            localStorage.removeItem('laksh_connection_failed');

            // Background: Flush any pending offline writes
            sheetsService.flushQueue().catch(e => logger.info('Post-refresh flush background:', e));

            logger.info('Sync complete!');
        } catch (err) {
            logger.error('Refresh failed:', err);
            const errorMessage = err.message || 'Unknown error occurred';
            setError(errorMessage);
            setLoadingStatus({ step: 3, message: 'Sync failed', error: errorMessage });

            // Provide more specific error messages
            if (err.message?.includes('401') || err.message?.includes('auth') || err.message?.includes('Authentication')) {
                const detailedError = 'Authentication failed. Your session may have expired. Please sign in again from Settings.';
                setError(detailedError);
                toast('Session expired. Please sign in again.', 'error');
                setIsConnected(false);
                localStorage.setItem('laksh_connection_failed', 'true');
            } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
                const detailedError = 'Network error. Please check your internet connection and try again.';
                setError(detailedError);
                toast('Connection failed. Check your internet.', 'error');
                // Keep connected state for offline mode
            } else if (err.message?.includes('403') || err.message?.includes('permission')) {
                const detailedError = 'Permission denied. Please ensure the app has access to your Google Sheets.';
                setError(detailedError);
                toast('Permission denied. Check app access.', 'error');
            } else {
                toast(`Sync failed: ${errorMessage}. Using cached data if available.`, 'error');
            }
            
            // FIXED: Always ensure loading state is cleared, even if error occurs
            setIsLoading(false);
        } finally {
            setIsSyncing(false);
            // Double-check loading state is cleared
            if (isMountedRef.current) {
                setIsLoading(false);
            }
        }
    }, [config.spreadsheetId, isGuest, toast, generateBillInstances, setIsConnected, setIsLoading]);

    // createFinanceSheet comes from AuthContext (useAuth)

    // New: Auto-connect using OAuth session (cloudBackup)
    useEffect(() => {
        const autoConnect = async () => {
            if (!isMountedRef.current) return;

            localStorage.removeItem('laksh_connection_failed');
            setLoadingStatus({ step: 0, message: 'Checking credentials...', error: null });

            // Skip auto-connect if already connected - prevents blinking on navigation
            const savedId = storage.get(STORAGE_KEYS.SPREADSHEET_ID) || localStorage.getItem('finday_spreadsheet_id');
            const savedToken = localStorage.getItem('google_access_token');
            const tokenExpiry = localStorage.getItem('google_token_expiry');
            const isTokenValid = savedToken && tokenExpiry && Date.now() < parseInt(tokenExpiry);

            if (savedId && isTokenValid && isConnected) {
                logger.info('Already connected, loading cache + triggering background sync...');
                setLoadingStatus({ step: 3, message: 'Loading cached data...', error: null });

                // 1. Load cached data immediately for fast UI
                try {
                    const cachedData = await localDB.getAllData();
                    if (cachedData.hasData) {
                        setTransactions(cachedData.transactions || []);
                        setAccounts(cachedData.accounts || []);
                        setCategories(cachedData.categories || []);
                        setBills(cachedData.bills || []);
                        setBillPayments(cachedData.billPayments || []);
                    }
                } catch (cacheErr) {
                    logger.warn('Failed to load cache on reconnect:', cacheErr);
                }

                setLoadingStatus({ step: 4, message: 'Ready!', error: null });
                setIsLoading(false);

                // 2. Trigger background sync to get latest data
                logger.info('Triggering background sync for fresh data...');
                refreshData(savedId, false).catch(e => logger.warn('Background sync failed:', e.message));
                return;
            }

            setIsLoading(true);
            let hasCachedData = false;

            // Check for guest mode first
            const isGuestMode = storage.getBool(STORAGE_KEYS.GUEST_MODE);
            if (isGuestMode) {
                logger.info('Guest mode detected, loading local data');
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
                    logger.error('Guest mode init failed:', e);
                    await initializeDefaultData();
                    setIsConnected(true);
                    setLoadingStatus({ step: 4, message: 'Ready!', error: null });
                    setIsLoading(false);
                    return;
                }
            }

            // Special handling for Android WebView - but respect first-time setup
            if (isAndroidWebView()) {
                logger.info('Detected Android WebView');

                // Try to restore session silently first using Refresh Token
                const refreshToken = localStorage.getItem('google_refresh_token');
                if (refreshToken) {
                    logger.info('Attempting silent refresh for Android...');
                    try {
                        const { cloudBackup } = await importWithRetry(() => import('../services/cloudBackup'));
                        await cloudBackup.init();
                        if (cloudBackup.isSignedIn()) {
                            logger.info('Silent refresh successful!');
                            setIsConnected(true);
                            refreshData(null, true); // Fetch fresh data
                            return;
                        }
                    } catch (e) {
                        logger.warn('Silent refresh failed:', e);
                    }
                }

                setLoadingStatus({ step: 1, message: 'Checking local storage...', error: null });

                // Check if user has ever connected to Google Sheets
                const hasEverConnected = storage.get(STORAGE_KEYS.SPREADSHEET_ID) ||
                    localStorage.getItem('finday_spreadsheet_id') ||
                    storage.get(STORAGE_KEYS.EVER_CONNECTED);

                if (!hasEverConnected) {
                    logger.info('Fresh install - needs Google Sheets setup');
                    setIsConnected(false);
                    setIsLoading(false);
                    setLoadingStatus({ step: 0, message: 'Setup required', error: null });
                    return;
                }

                logger.info('Previously connected - initializing offline mode');
                setLoadingStatus({ step: 2, message: 'Loading cached data...', error: null });
                try {
                    const cachedData = await localDB.getAllData();
                    if (!isMountedRef.current) return;

                    if (cachedData.hasData) {
                        logger.info('Loading cached data for WebView');
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
                        logger.info('No cached data - initializing with defaults');
                        await initializeDefaultData();
                    }

                    // Handle Android bridge for SMS transactions - FIXED: Auto-add directly to sheets
                    if (window.AndroidBridge && typeof window.AndroidBridge.getPendingTransactions === 'function') {
                        try {
                            const pendingJson = window.AndroidBridge.getPendingTransactions();
                                    if (pendingJson && pendingJson !== '[]') {
                                        const pendingTxns = JSON.parse(pendingJson);
                                        if (Array.isArray(pendingTxns) && pendingTxns.length > 0) {
                                            logger.info('Found pending Android transactions:', pendingTxns.length);

                                    // FIXED: Auto-add directly to sheets if connected, otherwise queue for review
                                    const autoAddEnabled = localStorage.getItem('laksh_auto_add_sms') !== 'false'; // Default true
                                    let addedCount = 0;
                                    let queuedCount = 0;

                                    for (const txn of pendingTxns) {
                                        const enriched = enrichTransaction({
                                            ...txn,
                                            id: txn.id || generateId(),
                                            source: 'sms_android'
                                        });

                                        // Auto-add if enabled and we have spreadsheet connection
                                        if (autoAddEnabled && config.spreadsheetId && isConnected && !isGuest) {
                                            try {
                                                // Add directly to sheets
                                                const finalAmount = enriched.type === 'expense' 
                                                    ? -Math.abs(enriched.amount) 
                                                    : Math.abs(enriched.amount);
                                                
                                                await addTransaction({
                                                    ...enriched,
                                                    amount: finalAmount,
                                                    accountId: enriched.accountId || accounts[0]?.id || '',
                                                    date: enriched.date || new Date().toISOString().split('T')[0]
                                                });
                                                addedCount++;
                                                logger.info('Auto-added SMS transaction:', enriched.description);
                                            } catch (addError) {
                                                logger.warn('Auto-add failed, queuing for review:', addError);
                                                // Fallback to pending queue if auto-add fails
                                                transactionDetector.addPending(enriched);
                                                queuedCount++;
                                            }
                                        } else {
                                            // Queue for review if auto-add disabled or not connected
                                            const added = transactionDetector.addPending(enriched);
                                            if (added) queuedCount++;
                                        }
                                    }

                                    if (addedCount > 0) {
                                        toast(`${addedCount} SMS transaction(s) added automatically ✓`, 'success');
                                    }
                                    if (queuedCount > 0) {
                                        toast(`${queuedCount} transaction(s) queued for review`, 'info');
                                    }

                                    if (typeof window.AndroidBridge.clearPendingTransactions === 'function') {
                                        window.AndroidBridge.clearPendingTransactions();
                                    }
                                }
                            }
                        } catch (e) {
                            logger.info('Bridge error (safe to ignore):', e.message);
                        }
                    }

                    // Set as connected in offline mode only after previous connection
                    logger.info('WebView offline mode activated');
                    setIsConnected(true);

                    // Show toast to indicate data loaded
                    // toast('Loaded local data', 'info');

                    // Proceed to cloud sync (Real Sync Up) instead of returning
                    // logic continues below...

                    // For Android, if we have cached data and a token, refresh immediately
                    const token = savedToken || localStorage.getItem('laksh_access_token');
                    if (hasCachedData && token) {
                        logger.info('Android: Triggering background sync refresh');
                        toast('Android: Starting background sync...', 'info');
                        refreshData(savedId, true)
                            .then(() => toast('Android: Sync complete!', 'success'))
                            .catch(e => toast(`Android Sync Error: ${e.message}`, 'error'));
                        setIsLoading(false);
                        return;
                    } else if (!token && !refreshToken) {
                        // Only warn if NO refresh token available
                        toast('Android: No token found. Please login again.', 'warning');
                    }

                } catch (e) {
                    logger.error('Failed to initialize WebView data:', e);
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
                                    logger.info('Processing bridge transactions:', pendingTxns.length);

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
                    logger.warn('Bridge sync error:', e.message);
                }
            }

            if (!isMountedRef.current) return;

            setLoadingStatus({ step: 2, message: 'Connecting to Google...', error: null });

            // Use cloudBackup for session restoration
            const { cloudBackup } = await importWithRetry(() => import('../services/cloudBackup'));

            // Initialize cloudBackup first to check for existing sessions
            try {
                await cloudBackup.init();
                logger.info('CloudBackup initialized successfully');
                setLoadingStatus({ step: 3, message: 'Fetching your data...', error: null });
            } catch (error) {
                logger.info('CloudBackup init error, continuing with offline mode:', error);
                setLoadingStatus({ step: 2, message: 'Using offline mode...', error: error.message });
            }

            if (!isMountedRef.current) return;

            // Check if user has selected a spreadsheet (from Welcome page)
            const savedSpreadsheetId = storage.get(STORAGE_KEYS.SPREADSHEET_ID) || localStorage.getItem('finday_spreadsheet_id');

            // Check for token directly in localStorage (important for Android WebView)
            const directToken = localStorage.getItem('google_access_token');
            const directExpiry = localStorage.getItem('google_token_expiry');
            const hasValidDirectToken = directToken && directExpiry && Date.now() < parseInt(directExpiry);

            logger.info('Auth check:', {
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
                        
                        // FIXED: Check for OAuth refresh flag before deciding to refresh
                        const oauthRefreshRequired = localStorage.getItem('oauth_refresh_required') === 'true';
                        
                        // Trigger initial sync if we have any valid token OR if OAuth refresh is required
                        if (oauthRefreshRequired || cloudBackup.isSignedIn() || cloudBackup.accessToken || hasValidDirectToken) {
                            if (oauthRefreshRequired) {
                                logger.info('OAuth refresh flag detected, forcing data refresh...');
                                localStorage.removeItem('oauth_refresh_required');
                            } else {
                                logger.info('Triggering data refresh after login...');
                            }
                            setLoadingStatus({ step: 3, message: 'Fetching your data...', error: null });
                            try {
                                // Ensure sheets service is initialized before refresh
                                await ensureSheetsReady();
                                await refreshData(savedSpreadsheetId, true); // Force refresh after login
                            } catch (refreshError) {
                                logger.error('Refresh after login failed:', refreshError);
                                setError(refreshError.message || 'Failed to load data after login');
                                setLoadingStatus({ step: 3, message: 'Failed to load data', error: refreshError.message });
                                // Still show as connected if we have cached data
                                if (hasCachedData) {
                                    logger.info('Using cached data due to refresh failure');
                                }
                                // FIXED: Always clear loading state even on error
                                setIsLoading(false);
                            }
                        } else {
                            logger.info('No valid token, skipping refresh');
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
                    // Deduplication by id/date/amount/desc
                    const seen = new Set();
                    const deduped = [];
                    for (const t of prev) {
                        const key = (t.id || '') + (t.date || '') + (t.amount || '') + (t.description?.toLowerCase().replace(/\s+/g, '') || '');
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
            logger.error('AutoConnect error:', error);
            if (isMountedRef.current) {
                setIsLoading(false);
                setIsConnected(false);
                setError('Failed to initialize app');
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only init; full deps would cause re-runs on every state change
    }, []);

    // ===== POLL FOR TOKEN (WebView Fix) =====
    useEffect(() => {
        const POLL_INITIAL_GRACE_MS = 6000; // Let autoConnect handle oauth_refresh first
        const CONNECTION_FAILED_KEY = 'laksh_connection_failed';

        const interval = setInterval(() => {
            const token = localStorage.getItem('google_access_token');
            const refreshRequired = localStorage.getItem('oauth_refresh_required');
            const connectionFailed = localStorage.getItem(CONNECTION_FAILED_KEY) === 'true';
            const sinceMount = Date.now() - mountTimeRef.current;

            // OAuth refresh: only handle if autoConnect has had time (prevents double refresh)
            if (refreshRequired === 'true' && config.spreadsheetId && !isSyncing && !isLoading && sinceMount > POLL_INITIAL_GRACE_MS) {
                logger.info('OAuth refresh required (poll), triggering data refresh...');
                localStorage.removeItem('oauth_refresh_required');

                ensureSheetsReady()
                    .then(() => refreshData(config.spreadsheetId, true))
                    .catch(err => {
                        logger.error('OAuth refresh failed:', err);
                        setError('Failed to load data after sign-in. Please try refreshing.');
                    });
            }

            // Reload only when token arrived from another tab - NOT when we failed to connect (prevents loop)
            if (token && !isConnected && !isLoading && !refreshRequired && !connectionFailed) {
                logger.info('Token detected via polling, reloading to initialize...');
                window.location.reload();
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
                const notifyDays = parseInt(storage.get(STORAGE_KEYS.NOTIFY_DAYS) || '5');
                const today = new Date().getDate();
                const upcoming = bills.filter(b => {
                    const due = parseInt(b.dueDay);
                    return due >= today && due <= today + notifyDays;
                });

                if (upcoming.length > 0) {
                    const lastNotified = storage.get(STORAGE_KEYS.LAST_NOTIFICATION);
                    const todayStr = new Date().toDateString();

                    // Notify max once per day
                    if (lastNotified !== todayStr) {
                        // Use service worker for mobile PWA, fallback to regular Notification
                        try {
                            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                                const reg = await navigator.serviceWorker.ready;
                                await reg.showNotification('LAKSH: Upcoming Bills', {
                                    body: `You have ${upcoming.length} bill${upcoming.length > 1 ? 's' : ''} due in the next ${notifyDays} days!`,
                                    icon: '/logo192.png'
                                });
                            } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                                new Notification('LAKSH: Upcoming Bills', {
                                    body: `You have ${upcoming.length} bill${upcoming.length > 1 ? 's' : ''} due in the next ${notifyDays} days!`,
                                    icon: '/logo192.png'
                                });
                            }
                        } catch (e) {
                            console.log('[LAKSH] Notification failed:', e);
                        }
                        storage.set(STORAGE_KEYS.LAST_NOTIFICATION, todayStr);
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
            logger.info('[LAKSH CC] generateCCBills triggered. Checking conditions...');
            // Only run if we have data and not currently syncing
            if (accounts.length === 0 && transactions.length === 0) {
                logger.info('[LAKSH CC] Skipping: No accounts/transactions loaded yet.');
                return;
            }
            if (isSyncing) {
                logger.info('[LAKSH CC] Skipping: Currently syncing.');
                return;
            }
            // Relaxing lastSyncTime check since cached data is enough to generate bills
            // if (!lastSyncTime) ...

            // Lock to prevent concurrent execution
            const lockKey = 'laksh_cc_bill_lock';
            const lock = localStorage.getItem(lockKey);
            if (lock && Date.now() - parseInt(lock) < 30000) {
                logger.info('[LAKSH CC] Skipping: Locked (ran recently).');
                return;
            }
            localStorage.setItem(lockKey, Date.now().toString());

            const creditAccounts = accounts.filter(a => a.type === 'credit');
            logger.info(`[LAKSH CC] Found ${creditAccounts.length} credit accounts.`);

            const today = new Date();
            const currentDay = today.getDate();
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();

            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

            for (const acc of creditAccounts) {
                if (!acc.billingDay) continue;

                const billingDay = parseInt(acc.billingDay);
                const dueDay = parseInt(acc.dueDay) || billingDay + 20;

                logger.info(`[LAKSH CC] Checking ${acc.name}. BillingDay: ${billingDay}, CurrentDay: ${currentDay}`);

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
                        logger.info(`[LAKSH CC] Skipping ${acc.name}: Bill already exists (${existingBill.name})`);
                    }

                    // Check ephemeral lock for this specific bill (session scope)
                    const billLockKey = `laksh_bill_created_${acc.id}_${currentMonth}_${currentYear}`;
                    const inMemoryLock = createdBillsRef.current.has(billLockKey);

                    if (inMemoryLock) {
                        logger.info(`[LAKSH CC] Skipping ${acc.name}: In-memory lock active.`);
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

                        logger.info(`[LAKSH CC] ${acc.name}: Cycle ${cycleStartStr} to ${cycleEndStr}. TxTotal: ${totalFromTx}, Debt: ${debt}, TotalSpent: ${totalSpent}`);

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

                            logger.info(`[LAKSH CC] GENERATING BILL: ${billName} - ${totalSpent}`);
                            await addBill(newBill);

                            if (Notification.permission === 'granted') {
                                new Notification('Statement Ready', {
                                    body: `${acc.name}: ₹${totalSpent.toLocaleString()}`,
                                    icon: '/logo192.png'
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
        // eslint-disable-next-line react-hooks/exhaustive-deps -- addBill/isSyncing would cause unnecessary re-schedules
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

            logger.info('Mobile app initialized with default data');
        } catch (error) {
            logger.error('Failed to initialize default data:', error);
        }
    };

    // ===== TRANSACTIONS CRUD (extracted to useTransactionActions) =====
    const { addTransaction, updateTransaction, deleteTransaction } = useTransactionActions({
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
    });

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
            logger.error('Update account failed:', err);
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

    // ===== BILLS CRUD (extracted to useBillActions) =====
    // addBill, updateBill, updateBillPayment, deleteBill from billActions above

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
            let _timeFiltered = false;

            if (q.includes('this month')) {
                results = results.filter(t => new Date(t.date).getMonth() === now.getMonth() && new Date(t.date).getFullYear() === now.getFullYear());
                _timeFiltered = true;
            } else if (q.includes('last month')) {
                const lm = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
                const ly = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
                results = results.filter(t => new Date(t.date).getMonth() === lm && new Date(t.date).getFullYear() === ly);
                _timeFiltered = true;
            } else if (q.includes('this year')) {
                results = results.filter(t => new Date(t.date).getFullYear() === now.getFullYear());
                _timeFiltered = true;
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
            logger.warn('Sheets smartQuery failed, falling back to local:', err);
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
            if (updates.spreadsheetId) {
                setIsConnected(true);
                setIsGuest(false);
                storage.set(STORAGE_KEYS.GUEST_MODE, 'false');
                storage.set(STORAGE_KEYS.SPREADSHEET_ID, updates.spreadsheetId);
            }
            setConfig(prev => ({ ...prev, ...updates }));
            if (updates.spreadsheetId) {
                await refreshData(updates.spreadsheetId);
            }
            return;
        }

        const spreadsheetId = config.spreadsheetId;
        if (!spreadsheetId) return;

        try {
            await sheetsService.setConfig(spreadsheetId, key, value);
            setConfig(prev => ({ ...prev, [key]: value }));
        } catch (err) {
            logger.error('Config update failed:', err);
        }
    }, [config.spreadsheetId, setConfig, refreshData, setIsConnected, setIsGuest]);

    const disconnect = useCallback(async () => {
        // Special handling for Android WebView
        if (isAndroidWebView()) {
            logger.info('Disconnecting in WebView mode');

            // Clear all local data including "ever connected" flag
            await localDB.clearAll();
            localStorage.removeItem('laksh_ever_connected');
            localStorage.removeItem('laksh_connection_failed');
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
        localStorage.removeItem('laksh_connection_failed');
        localStorage.removeItem('finday_spreadsheet_id');

        setIsConnected(false);
        setTransactions([]);
        setAccounts([]);
        setCategories([]);
        setBills([]);
        setConfig({ spreadsheetId: '', clientId: '', currency: 'INR' });
    }, [setConfig, toast, setIsConnected]);

    // Force refresh - refreshes token first (for mobile), clears cache, then re-syncs
    const forceRefresh = useCallback(async () => {
        setError(null);
        const refreshToken = localStorage.getItem('google_refresh_token');
        if (refreshToken) {
            try {
                const refreshed = await sheetsService.refreshToken();
                if (refreshed) {
                    localStorage.removeItem('laksh_connection_failed');
                }
            } catch (e) {
                logger.warn('Force refresh token attempt:', e?.message);
            }
        }
        await localDB.clearAll();
        toast('Cache cleared');
        await refreshData();
    }, [refreshData, toast]);

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
            logger.info('Restored from backup:', {
                transactions: data.transactions?.length || 0,
                accounts: data.accounts?.length || 0,
                categories: data.categories?.length || 0,
                bills: data.bills?.length || 0
            });

            return true;
        } catch (error) {
            logger.error('Restore failed:', error);
            toast('Failed to restore data', 'error');
            return false;
        }
    }, [toast]);

    // Categories sorted by usage (most-used first); "Other" always last
    const categoriesByUsage = useMemo(() => {
        const counts = {};
        categories.forEach(c => { counts[c.name] = 0; });
        transactions.forEach(t => {
            if (t.category && counts[t.category] !== undefined) counts[t.category]++;
        });
        const withUsage = categories.map(c => ({ ...c, _count: counts[c.name] ?? 0 }));
        const other = withUsage.find(c => c.name === 'Other');
        const rest = withUsage.filter(c => c.name !== 'Other').sort((a, b) => b._count - a._count);
        return other ? [...rest, other] : rest;
    }, [categories, transactions]);

    const value = {
        isGuest,
        isConnected,
        isLoading,
        loadingStage, // Expose for UI
        loadingStatus,
        isSyncing,
        lastSyncTime,
        error,
        transactions,
        accounts,
        categories,
        categoriesByUsage,
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
        forceSync: async () => {
            if (config.spreadsheetId) await refreshData(config.spreadsheetId, true);
        },
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
                logger.error('Import failed:', e);
                return false;
            }
        },
        setGuestMode,
        closePeriod: (periodKey) => {
            if (!closedPeriods.includes(periodKey)) {
                const newPeriods = [...closedPeriods, periodKey];
                setClosedPeriods(newPeriods);
                storage.setJSON(STORAGE_KEYS.CLOSED_PERIODS, newPeriods);
                toast(`Period ${periodKey} closed successfully.`);
            }
        },
        createFinanceSheet: authCreateFinanceSheet,
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
}

export const FinanceProvider = ({ children }) => {
    const [isLoading, setIsLoading] = useState(true);
    return (
        <AuthProvider setIsLoading={setIsLoading}>
            <FinanceProviderInner isLoading={isLoading} setIsLoading={setIsLoading}>
                {children}
            </FinanceProviderInner>
        </AuthProvider>
    );
};
