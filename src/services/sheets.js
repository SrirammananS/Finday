// Google Sheets Service - Robust Database Integration with Realtime Sync
const DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];
const SCOPES = "https://www.googleapis.com/auth/spreadsheets";

// Request throttling - reduced for faster sync
const REQUEST_DELAY_MS = 100; // Reduced from 200ms for faster sync
let lastRequestTime = 0;
let requestQueue = [];
let isProcessingQueue = false;

const throttle = async () => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < REQUEST_DELAY_MS) {
        await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY_MS - timeSinceLastRequest));
    }
    lastRequestTime = Date.now();
};

// Enhanced retry with better error handling
const withRetry = async (fn, maxRetries = 3, context = '') => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            await throttle();
            return await fn();
        } catch (error) {
            const isRateLimit = error?.status === 429 || error?.result?.error?.code === 429;
            const isUnauth = error?.status === 401 || error?.result?.error?.code === 401;
            const isNetwork = error?.message?.includes('network') || error?.message?.includes('Failed to fetch');

            if (isRateLimit) {
                const delay = Math.pow(2, i + 1) * 1000;
                console.log(`[LAKSH] Rate limited${context ? ` (${context})` : ''}, retry in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else if (isNetwork && i < maxRetries - 1) {
                const delay = 1000 * (i + 1);
                console.log(`[LAKSH] Network error${context ? ` (${context})` : ''}, retry in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else if (isUnauth) {
                console.log('[LAKSH] Auth error, token may be expired');
                throw error;
            } else {
                throw error;
            }
        }
    }
    throw new Error(`Max retries exceeded${context ? ` for ${context}` : ''}`);
};

// Write queue for offline-first with retry
const pendingWrites = [];
let isFlushingWrites = false;

class GoogleSheetsService {
    constructor() {
        this.isInitialized = false;
        this.tokenClient = null;
        this.accessToken = null;
        this.sheetCache = new Map();
        this.lastFetchTime = new Map(); // Track when each data type was last fetched
    }

    // Wait for Google scripts to load
    waitForGapi() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds total

            const check = () => {
                attempts++;
                if (window.gapi && window.google?.accounts?.oauth2) {
                    resolve(true);
                } else if (attempts >= maxAttempts) {
                    reject(new Error('Google API scripts not loaded. Please refresh the page.'));
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    // Ensure GAPI client is ready before making requests
    async ensureClientReady() {
        if (this.isInitialized && window.gapi?.client?.sheets) return true;

        console.log('[LAKSH] Waiting for GAPI client...');
        // Wait up to 5 seconds
        for (let i = 0; i < 50; i++) {
            if (this.isInitialized && window.gapi?.client?.sheets) return true;
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        throw new Error('Google Sheets API client not ready. Please refresh.');
    }

    async init(clientId) {
        if (this.isInitialized && this.accessToken) return true;

        try {
            // Wait for scripts
            await this.waitForGapi();

            // Load GAPI client
            await new Promise((resolve, reject) => {
                window.gapi.load('client', { callback: resolve, onerror: reject });
            });

            // Initialize client
            await window.gapi.client.init({
                discoveryDocs: DISCOVERY_DOCS,
            });

            // Setup token client
            this.tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: SCOPES,
                callback: () => { }, // Will be set on signin
            });

            // 1. Check if GAPI already has a valid token (e.g. from previous reload)
            const existingGapiToken = window.gapi.client.getToken();
            if (existingGapiToken && existingGapiToken.access_token) {
                this.accessToken = existingGapiToken.access_token;
                this.isInitialized = true;
                console.log('[LAKSH] GAPI session active');
                return true;
            }

            // 2. Check LocalStorage for restored session
            const storedToken = localStorage.getItem('finday_gapi_token');
            const tokenExpiry = parseInt(localStorage.getItem('finday_token_expiry') || '0');
            const now = Date.now();

            if (storedToken && tokenExpiry > now) {
                // Token is fresh enough to try using
                window.gapi.client.setToken({ access_token: storedToken });
                this.accessToken = storedToken;
                this.isInitialized = true;
                console.log('[LAKSH] Session restored from cache');
                return true;
            }

            // 3. Token expired or missing
            if (storedToken) {
                console.log('[LAKSH] Token expired, clearing...');
                localStorage.removeItem('finday_gapi_token');
                localStorage.removeItem('finday_token_expiry');
            }

            // 4. Request fresh sign-in (Silent if possible)
            console.log('[Finday] Requesting fresh sign-in');
            return await this.signIn(clientId);

        } catch (error) {
            console.error('Init failed:', error);
            throw error;
        }
    }

    signIn(clientId) {
        return new Promise((resolve, reject) => {
            if (!this.tokenClient) {
                reject(new Error('Token client not initialized'));
                return;
            }

            this.tokenClient.callback = (response) => {
                if (response.error) {
                    reject(new Error(response.error));
                    return;
                }

                this.accessToken = response.access_token;
                localStorage.setItem('finday_gapi_token', response.access_token);
                // Store token expiry for 55 minutes (safe buffer before 1h actual expiry)
                localStorage.setItem('finday_token_expiry', Date.now() + (55 * 60 * 1000));
                this.isInitialized = true;
                console.log('[Finday] New token saved');
                resolve(true);
            };

            // Use empty prompt for returning users (shows account picker only if needed)
            this.tokenClient.requestAccessToken({ prompt: '' });
        });
    }

    // Force refresh the token (used on 401 errors)
    async refreshToken() {
        const clientId = localStorage.getItem('finday_client_id');
        if (!clientId || !this.tokenClient) {
            console.log('[Finday] Cannot refresh - missing client or token client');
            return false;
        }

        console.log('[Finday] Refreshing token...');
        localStorage.removeItem('finday_gapi_token');
        localStorage.removeItem('finday_token_expiry');

        try {
            await this.signIn(clientId);
            return true;
        } catch (e) {
            console.error('[Finday] Token refresh failed:', e);
            return false;
        }
    }

    signOut() {
        if (this.accessToken) {
            try {
                window.google?.accounts?.oauth2?.revoke(this.accessToken);
            } catch (e) { }
            localStorage.removeItem('finday_gapi_token');
            localStorage.removeItem('finday_token_expiry');
            this.accessToken = null;
            this.isInitialized = false;
        }
    }

    // ===== SHEET MANAGEMENT =====

    async ensureSheetExists(spreadsheetId, sheetTitle) {
        await this.ensureClientReady();

        // Check cache first to avoid redundant API calls
        const cacheKey = `${spreadsheetId}:${sheetTitle}`;
        if (this.sheetCache.has(cacheKey)) {
            return true;
        }

        try {
            // Use throttled request with retry for 429 errors
            const response = await withRetry(() =>
                window.gapi.client.sheets.spreadsheets.get({
                    spreadsheetId,
                    fields: 'sheets.properties.title' // Only fetch titles, reduces payload
                })
            );

            const sheets = response.result.sheets || [];
            const exists = sheets.some(s => s.properties.title === sheetTitle);

            if (!exists) {
                await withRetry(() =>
                    window.gapi.client.sheets.spreadsheets.batchUpdate({
                        spreadsheetId,
                        resource: {
                            requests: [{
                                addSheet: { properties: { title: sheetTitle } }
                            }]
                        }
                    })
                );

                // Add headers based on sheet type
                const headers = this.getHeadersForSheet(sheetTitle);
                if (headers.length > 0) {
                    await this.setHeaders(spreadsheetId, sheetTitle, headers);
                }
            }

            // Cache the result
            this.sheetCache.set(cacheKey, true);
            return true;
        } catch (error) {
            // Handle 401 - try to refresh token
            if (error.status === 401 || error?.result?.error?.code === 401) {
                console.log('[LAKSH] 401 detected, refreshing token...');
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    return this.ensureSheetExists(spreadsheetId, sheetTitle);
                }
            }
            console.error('[LAKSH] Error ensuring sheet exists:', error);
            throw error;
        }
    }

    getHeadersForSheet(sheetTitle) {
        if (sheetTitle === '_Config') return ['Key', 'Value'];
        if (sheetTitle === '_Accounts') return ['ID', 'Name', 'Type', 'Balance', 'BillingCycleStart', 'DueDate', 'CreatedAt'];
        if (sheetTitle === '_Categories') return ['Name', 'Keywords', 'Color', 'Icon'];
        if (sheetTitle === '_Bills') return ['ID', 'Name', 'Amount', 'DueDay', 'Category', 'Status', 'AccountID', 'CreatedAt'];
        // Monthly sheets
        return ['ID', 'Date', 'Description', 'Amount', 'Category', 'AccountID', 'Type', 'CreatedAt'];
    }

    async setHeaders(spreadsheetId, sheetTitle, headers) {
        const endCol = String.fromCharCode(64 + headers.length);
        await window.gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `'${sheetTitle}'!A1:${endCol}1`,
            valueInputOption: 'RAW',
            resource: { values: [headers] }
        });
    }

    // ===== CONFIG =====

    async getConfig(spreadsheetId) {
        await this.ensureSheetExists(spreadsheetId, '_Config');

        try {
            const response = await window.gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId,
                range: "'_Config'!A:B"
            });

            const rows = response.result.values || [];
            const config = {};
            rows.slice(1).forEach(row => {
                if (row[0]) config[row[0]] = row[1] || '';
            });
            return config;
        } catch (error) {
            return {};
        }
    }

    async setConfig(spreadsheetId, key, value) {
        await this.ensureSheetExists(spreadsheetId, '_Config');

        const response = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: "'_Config'!A:B"
        });

        const rows = response.result.values || [];
        let rowIndex = rows.findIndex(row => row[0] === key);

        if (rowIndex === -1) {
            await window.gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId,
                range: "'_Config'!A:B",
                valueInputOption: 'RAW',
                insertDataOption: 'INSERT_ROWS',
                resource: { values: [[key, value]] }
            });
        } else {
            await window.gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `'_Config'!A${rowIndex + 1}:B${rowIndex + 1}`,
                valueInputOption: 'RAW',
                resource: { values: [[key, value]] }
            });
        }
    }

    // ===== ACCOUNTS CRUD =====

    async getAccounts(spreadsheetId) {
        await this.ensureSheetExists(spreadsheetId, '_Accounts');

        try {
            const response = await window.gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId,
                range: "'_Accounts'!A:H"
            });

            const rows = response.result.values || [];
            return rows.slice(1).map(row => ({
                id: row[0],
                name: row[1],
                type: row[2],
                balance: parseFloat(row[3]) || 0,
                billingDay: row[4] || '',
                dueDay: row[5] || '',
                createdAt: row[6],
                isSecret: row[7] === 'true' || row[7] === true
            })).filter(acc => acc.id);
        } catch (error) {
            console.error('Error getting accounts:', error);
            return [];
        }
    }

    async addAccount(spreadsheetId, account) {
        await this.ensureSheetExists(spreadsheetId, '_Accounts');

        const row = [
            account.id,
            account.name,
            account.type,
            account.balance || 0,
            account.billingDay || '',
            account.dueDay || '',
            new Date().toISOString(),
            account.isSecret ? 'true' : 'false'
        ];

        await window.gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId,
            range: "'_Accounts'!A:H",
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            resource: { values: [row] }
        });
    }

    async updateAccount(spreadsheetId, accountId, updates) {
        await this.ensureClientReady();
        const response = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: "'_Accounts'!A:H"
        });

        const rows = response.result.values || [];
        const rowIndex = rows.findIndex(row => row[0] === accountId);

        if (rowIndex > 0) {
            const currentRow = rows[rowIndex];
            const updatedRow = [
                accountId,
                updates.name ?? currentRow[1],
                updates.type ?? currentRow[2],
                updates.balance ?? currentRow[3],
                updates.billingDay ?? currentRow[4],
                updates.dueDay ?? currentRow[5],
                currentRow[6],
                updates.isSecret !== undefined ? (updates.isSecret ? 'true' : 'false') : (currentRow[7] || 'false')
            ];

            await window.gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `'_Accounts'!A${rowIndex + 1}:H${rowIndex + 1}`,
                valueInputOption: 'RAW',
                resource: { values: [updatedRow] }
            });
        }
    }

    async deleteAccount(spreadsheetId, accountId) {
        await this.ensureClientReady();
        const sheetInfo = await window.gapi.client.sheets.spreadsheets.get({ spreadsheetId });
        const sheet = sheetInfo.result.sheets.find(s => s.properties.title === '_Accounts');
        if (!sheet) return;

        const response = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: "'_Accounts'!A:A"
        });

        const rows = response.result.values || [];
        const rowIndex = rows.findIndex(row => row[0] === accountId);

        if (rowIndex > 0) {
            await window.gapi.client.sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                resource: {
                    requests: [{
                        deleteDimension: {
                            range: {
                                sheetId: sheet.properties.sheetId,
                                dimension: 'ROWS',
                                startIndex: rowIndex,
                                endIndex: rowIndex + 1
                            }
                        }
                    }]
                }
            });
        }
    }

    // ===== TRANSACTIONS CRUD =====

    getMonthSheetName(date = new Date()) {
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }

    async addTransaction(spreadsheetId, transaction) {
        const sheetName = this.getMonthSheetName(new Date(transaction.date));
        await this.ensureSheetExists(spreadsheetId, sheetName);

        const row = [
            transaction.id,
            transaction.date,
            transaction.description,
            transaction.amount,
            transaction.category,
            transaction.accountId,
            transaction.type,
            new Date().toISOString(),
            transaction.friend || ''
        ];

        await window.gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `'${sheetName}'!A:I`,
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            resource: { values: [row] }
        });

        return { ...transaction, synced: true };
    }

    async updateTransaction(spreadsheetId, transaction) {
        await this.ensureClientReady();
        const sheetName = this.getMonthSheetName(new Date(transaction.date));

        const response = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `'${sheetName}'!A:I`
        });

        const rows = response.result.values || [];
        const rowIndex = rows.findIndex(row => row[0] === transaction.id);

        if (rowIndex > 0) {
            const updatedRow = [
                transaction.id,
                transaction.date,
                transaction.description,
                transaction.amount,
                transaction.category,
                transaction.accountId,
                transaction.type,
                rows[rowIndex][7], // Keep original createdAt
                transaction.friend || ''
            ];

            await window.gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `'${sheetName}'!A${rowIndex + 1}:I${rowIndex + 1}`,
                valueInputOption: 'RAW',
                resource: { values: [updatedRow] }
            });
        }
    }

    async deleteTransaction(spreadsheetId, transactionId, transactionDate) {
        await this.ensureClientReady();
        const sheetName = this.getMonthSheetName(new Date(transactionDate));

        const sheetInfo = await window.gapi.client.sheets.spreadsheets.get({ spreadsheetId });
        const sheet = sheetInfo.result.sheets.find(s => s.properties.title === sheetName);
        if (!sheet) return;

        const response = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `'${sheetName}'!A:A`
        });

        const rows = response.result.values || [];
        const rowIndex = rows.findIndex(row => row[0] === transactionId);

        if (rowIndex > 0) {
            await window.gapi.client.sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                resource: {
                    requests: [{
                        deleteDimension: {
                            range: {
                                sheetId: sheet.properties.sheetId,
                                dimension: 'ROWS',
                                startIndex: rowIndex,
                                endIndex: rowIndex + 1
                            }
                        }
                    }]
                }
            });
        }
    }

    async getTransactions(spreadsheetId, months = 3) {
        const transactions = [];
        const now = new Date();

        for (let i = 0; i < months; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const sheetName = this.getMonthSheetName(date);

            try {
                await this.ensureSheetExists(spreadsheetId, sheetName);
                const response = await window.gapi.client.sheets.spreadsheets.values.get({
                    spreadsheetId,
                    range: `'${sheetName}'!A:I`
                });

                const rows = response.result.values || [];
                rows.slice(1).forEach(row => {
                    if (row[0]) {
                        transactions.push({
                            id: row[0],
                            date: row[1],
                            description: row[2],
                            amount: parseFloat(row[3]) || 0,
                            category: row[4],
                            accountId: row[5],
                            type: row[6],
                            createdAt: row[7],
                            friend: row[8] || '',
                            synced: true
                        });
                    }
                });
            } catch (error) {
                console.log(`Sheet ${sheetName} fetch error:`, error);
            }
        }

        return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // ===== CATEGORIES CRUD =====

    async getCategories(spreadsheetId) {
        await this.ensureSheetExists(spreadsheetId, '_Categories');

        try {
            const response = await window.gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId,
                range: "'_Categories'!A:D"
            });

            const rows = response.result.values || [];
            if (rows.length <= 1) {
                // Initialize with defaults
                const defaults = [
                    ['Groceries', 'walmart,kroger,grocery,supermarket', '#22c55e', '🛒'],
                    ['Dining', 'restaurant,cafe,mcdonalds,starbucks,pizza', '#f59e0b', '🍕'],
                    ['Transportation', 'uber,lyft,gas,petrol,shell,parking', '#3b82f6', '🚗'],
                    ['Entertainment', 'netflix,spotify,movie,cinema,game', '#8b5cf6', '🎬'],
                    ['Utilities', 'electric,water,internet,phone,bill', '#64748b', '💡'],
                    ['Healthcare', 'pharmacy,doctor,hospital,medical', '#ef4444', '🏥'],
                    ['Shopping', 'amazon,target,mall,store', '#ec4899', '🛍️'],
                    ['Subscriptions', 'subscription,monthly,annual', '#06b6d4', '📱'],
                    ['Income', 'salary,payment,deposit,transfer in', '#10b981', '💰'],
                    ['Other', '', '#94a3b8', '📦']
                ];

                await window.gapi.client.sheets.spreadsheets.values.append({
                    spreadsheetId,
                    range: "'_Categories'!A:D",
                    valueInputOption: 'RAW',
                    insertDataOption: 'INSERT_ROWS',
                    resource: { values: defaults }
                });

                return defaults.map(row => ({ name: row[0], keywords: row[1], color: row[2], icon: row[3] }));
            }

            return rows.slice(1).map(row => ({
                name: row[0],
                keywords: row[1] || '',
                color: row[2] || '#94a3b8',
                icon: row[3] || '📦'
            })).filter(c => c.name);
        } catch (error) {
            console.error('Error getting categories:', error);
            return [];
        }
    }

    async addCategory(spreadsheetId, category) {
        await this.ensureSheetExists(spreadsheetId, '_Categories');

        await window.gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId,
            range: "'_Categories'!A:D",
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            resource: { values: [[category.name, category.keywords, category.color, category.icon]] }
        });
    }

    async updateCategory(spreadsheetId, oldName, category) {
        await this.ensureClientReady();
        const response = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: "'_Categories'!A:D"
        });

        const rows = response.result.values || [];
        const rowIndex = rows.findIndex(row => row[0] === oldName);

        if (rowIndex > 0) {
            await window.gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `'_Categories'!A${rowIndex + 1}:D${rowIndex + 1}`,
                valueInputOption: 'RAW',
                resource: { values: [[category.name, category.keywords, category.color, category.icon]] }
            });
        }
    }

    async deleteCategory(spreadsheetId, categoryName) {
        await this.ensureClientReady();
        const sheetInfo = await window.gapi.client.sheets.spreadsheets.get({ spreadsheetId });
        const sheet = sheetInfo.result.sheets.find(s => s.properties.title === '_Categories');
        if (!sheet) return;

        const response = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: "'_Categories'!A:A"
        });

        const rows = response.result.values || [];
        const rowIndex = rows.findIndex(row => row[0] === categoryName);

        if (rowIndex > 0) {
            await window.gapi.client.sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                resource: {
                    requests: [{
                        deleteDimension: {
                            range: {
                                sheetId: sheet.properties.sheetId,
                                dimension: 'ROWS',
                                startIndex: rowIndex,
                                endIndex: rowIndex + 1
                            }
                        }
                    }]
                }
            });
        }
    }

    // ===== BILLS CRUD =====

    async getBills(spreadsheetId) {
        await this.ensureSheetExists(spreadsheetId, '_Bills');

        try {
            const response = await window.gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId,
                range: "'_Bills'!A:H"
            });

            const rows = response.result.values || [];
            const seenIds = new Set();

            return rows.slice(1).map(row => ({
                id: row[0],
                name: row[1],
                amount: parseFloat(row[2]) || 0,
                dueDay: parseInt(row[3]) || 1,
                category: row[4],
                status: row[5] || 'active',
                accountId: row[6],
                createdAt: row[7]
            })).filter(b => {
                // Filter out empty and duplicate IDs
                if (!b.id || seenIds.has(b.id)) return false;
                seenIds.add(b.id);
                return true;
            });
        } catch (error) {
            console.error('Error getting bills:', error);
            return [];
        }
    }

    async addBill(spreadsheetId, bill) {
        await this.ensureSheetExists(spreadsheetId, '_Bills');

        const row = [
            bill.id,
            bill.name,
            bill.amount,
            bill.dueDay,
            bill.category,
            bill.status || 'active',
            bill.accountId || '',
            new Date().toISOString()
        ];

        await window.gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId,
            range: "'_Bills'!A:H",
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            resource: { values: [row] }
        });
    }

    async updateBill(spreadsheetId, billId, updates) {
        await this.ensureClientReady();
        const response = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: "'_Bills'!A:H"
        });

        const rows = response.result.values || [];
        const rowIndex = rows.findIndex(row => row[0] === billId);

        if (rowIndex > 0) {
            const currentRow = rows[rowIndex];
            const updatedRow = [
                billId,
                updates.name ?? currentRow[1],
                updates.amount ?? currentRow[2],
                updates.dueDay ?? currentRow[3],
                updates.category ?? currentRow[4],
                updates.status ?? currentRow[5],
                updates.accountId ?? currentRow[6],
                currentRow[7]
            ];

            await window.gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `'_Bills'!A${rowIndex + 1}:H${rowIndex + 1}`,
                valueInputOption: 'RAW',
                resource: { values: [updatedRow] }
            });
        }
    }

    async deleteBill(spreadsheetId, billId) {
        await this.ensureClientReady();
        const sheetInfo = await window.gapi.client.sheets.spreadsheets.get({ spreadsheetId });
        const sheet = sheetInfo.result.sheets.find(s => s.properties.title === '_Bills');
        if (!sheet) return;

        const response = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: "'_Bills'!A:A"
        });

        const rows = response.result.values || [];
        const rowIndex = rows.findIndex(row => row[0] === billId);

        if (rowIndex > 0) {
            await window.gapi.client.sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                resource: {
                    requests: [{
                        deleteDimension: {
                            range: {
                                sheetId: sheet.properties.sheetId,
                                dimension: 'ROWS',
                                startIndex: rowIndex,
                                endIndex: rowIndex + 1
                            }
                        }
                    }]
                }
            });
        }
    }

    // ===== SMART QUERY =====

    async smartQuery(spreadsheetId, query) {
        const queryLower = query.toLowerCase();
        let transactions = [];
        let period = 'month';
        const year = new Date().getFullYear();

        // Detect time period
        if (queryLower.includes('year') || queryLower.includes('annual')) {
            period = 'year';
            transactions = await this.getTransactions(spreadsheetId, 12);
        } else if (queryLower.includes('last month')) {
            period = 'last month';
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            const sheetName = this.getMonthSheetName(lastMonth);
            transactions = await this.getTransactionsFromSheet(spreadsheetId, sheetName);
        } else {
            transactions = await this.getTransactions(spreadsheetId, 1);
        }

        // Detect category filter
        const categories = await this.getCategories(spreadsheetId);
        let categoryFilter = null;

        for (const cat of categories) {
            if (queryLower.includes(cat.name.toLowerCase())) {
                categoryFilter = cat.name;
                break;
            }
            const keywords = cat.keywords.split(',').map(k => k.trim().toLowerCase());
            for (const kw of keywords) {
                if (kw && queryLower.includes(kw)) {
                    categoryFilter = cat.name;
                    break;
                }
            }
            if (categoryFilter) break;
        }

        // Filter
        if (categoryFilter) {
            transactions = transactions.filter(t => t.category?.toLowerCase() === categoryFilter.toLowerCase());
        }

        // Only expenses
        const expenses = transactions.filter(t => t.amount < 0);

        return {
            query,
            period,
            categoryFilter,
            total: expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0),
            count: expenses.length,
            transactions: expenses.slice(0, 10)
        };
    }

    async getTransactionsFromSheet(spreadsheetId, sheetName) {
        try {
            const response = await withRetry(() =>
                window.gapi.client.sheets.spreadsheets.values.get({
                    spreadsheetId,
                    range: `'${sheetName}'!A:H`
                }), 3, 'getTransactionsFromSheet'
            );

            const rows = response.result.values || [];
            return rows.slice(1).map(row => ({
                id: row[0],
                date: row[1],
                description: row[2],
                amount: parseFloat(row[3]) || 0,
                category: row[4],
                accountId: row[5],
                type: row[6]
            })).filter(t => t.id);
        } catch (error) {
            console.error('[LAKSH] getTransactionsFromSheet error:', error);
            return [];
        }
    }

    // ===== CACHE MANAGEMENT =====

    /**
     * Clear all caches to force fresh fetch
     */
    clearCache() {
        this.sheetCache.clear();
        this.lastFetchTime.clear();
        console.log('[LAKSH] Cache cleared');
    }

    /**
     * Invalidate cache for a specific sheet (call after writes)
     */
    invalidateSheet(sheetName) {
        // Clear sheet existence cache entries that match
        for (const key of this.sheetCache.keys()) {
            if (key.includes(sheetName)) {
                this.sheetCache.delete(key);
            }
        }
        this.lastFetchTime.delete(sheetName);
    }

    /**
     * Check if data needs refresh (older than 30 seconds)
     */
    needsRefresh(dataType) {
        const lastFetch = this.lastFetchTime.get(dataType);
        if (!lastFetch) return true;
        return Date.now() - lastFetch > 30000; // 30 second threshold
    }

    /**
     * Mark data as freshly fetched
     */
    markFetched(dataType) {
        this.lastFetchTime.set(dataType, Date.now());
    }

    /**
     * Force refresh all data
     */
    async forceRefresh(spreadsheetId) {
        this.clearCache();
        // The actual data fetch will happen in FinanceContext.refreshData()
        console.log('[LAKSH] Force refresh triggered');
    }
}

export const sheetsService = new GoogleSheetsService();
export { GoogleSheetsService };

