// Google Sheets Service - Robust Database Integration with Realtime Sync
import { storage, STORAGE_KEYS } from './storage';
import { importWithRetry } from '../utils/lazyRetry';

const DISCOVERY_DOCS = [
    "https://sheets.googleapis.com/$discovery/rest?version=v4",
    "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"
];
// - spreadsheets: Read/write access to user's spreadsheets only
// - drive.readonly: List spreadsheets for selection (read-only)
const SCOPES = "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly";

// Request throttling - reduced for faster sync
const REQUEST_DELAY_MS = 100;
let lastRequestTime = 0;
let throttleLock = Promise.resolve();
const throttle = async () => {
    const previousLock = throttleLock;
    let resolveLock;
    throttleLock = new Promise(resolve => { resolveLock = resolve; });

    await previousLock;
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < REQUEST_DELAY_MS) {
        await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY_MS - timeSinceLastRequest));
    }
    lastRequestTime = Date.now();
    resolveLock();
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
        this.pendingSheetChecks = new Map(); // Track in-flight sheet listing requests
        this.lastFetchTime = new Map(); // Track when each data type was last fetched
    }

    // Detect if running in Android WebView
    isAndroidWebView() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        return /Android/i.test(userAgent) && /wv/i.test(userAgent);
    }

    // Mobile OAuth flow using external browser
    async initMobileOAuth() {
        console.log('[LAKSH] Starting mobile OAuth flow');

        // Check if we already have a valid token from previous OAuth
        const accessToken = sessionStorage.getItem('google_access_token') || localStorage.getItem('google_access_token');
        const tokenExpiry = sessionStorage.getItem('google_token_expiry') || localStorage.getItem('google_token_expiry');

        if (accessToken && tokenExpiry && new Date() < new Date(parseInt(tokenExpiry))) {
            console.log('[LAKSH] Using existing access token');
            this.accessToken = accessToken;
            return true;
        }

        // Create OAuth URL for external browser
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

        // Use the web callback URL - the PWA will handle token storage
        // On Android, after OAuth completes in Chrome, user returns to app
        // The token will be available in the PWA's localStorage
        const redirectUri = window.location.origin + '/oauth-callback';
        const scope = encodeURIComponent(SCOPES);
        const state = 'mobile_oauth_' + Math.random().toString(36).substring(7);

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${clientId}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `scope=${scope}&` +
            `response_type=token&` +
            `state=${state}&` +
            `prompt=consent`;  // Force consent to ensure fresh token

        console.log('[LAKSH] Opening external browser for OAuth');
        console.log('[LAKSH] Redirect URI:', redirectUri);

        // Store state for verification
        localStorage.setItem('oauth_state', state);
        localStorage.setItem('oauth_pending', 'true');

        // Open external browser
        if (window.AndroidBridge && typeof window.AndroidBridge.openExternalBrowser === 'function') {
            // Use Android bridge if available
            window.AndroidBridge.openExternalBrowser(authUrl);
        } else {
            // Fallback: open in new window/tab
            window.open(authUrl, '_blank');
        }

        // Listen via BroadcastChannel for a faster, reliable callback
        let bc;
        try {
            bc = new BroadcastChannel('laksh-oauth');
        } catch { }

        // Show message to user and resolve when token available
        return new Promise((resolve, reject) => {
            if (bc) {
                const onMsg = (evt) => {
                    if (evt?.data?.type === 'oauth_token' && evt.data.access_token) {
                        try { bc.close(); } catch { }
                        this.accessToken = evt.data.access_token;
                        const expiryMs = Date.now() + (parseInt(evt.data.expires_in || '3600', 10) * 1000);
                        try {
                            sessionStorage.setItem('google_access_token', evt.data.access_token);
                            sessionStorage.setItem('google_token_expiry', String(expiryMs));
                            localStorage.setItem('google_access_token', evt.data.access_token);
                            localStorage.setItem('google_token_expiry', String(expiryMs));
                        } catch { }
                        this.isInitialized = true;
                        resolve(true);
                    }
                };
                bc.addEventListener('message', onMsg);
            }

            const checkInterval = setInterval(() => {
                const token = sessionStorage.getItem('google_access_token') || localStorage.getItem('google_access_token');
                const expiry = sessionStorage.getItem('google_token_expiry') || localStorage.getItem('google_token_expiry');

                if (token && expiry && new Date() < new Date(parseInt(expiry))) {
                    clearInterval(checkInterval);
                    try { bc && bc.close(); } catch { }
                    this.accessToken = token;
                    this.isInitialized = true;
                    console.log('[LAKSH] OAuth completed successfully');
                    resolve(true);
                }
            }, 1000);

            // Timeout after 5 minutes
            setTimeout(() => {
                clearInterval(checkInterval);
                try { bc && bc.close(); } catch { }
                reject(new Error('OAuth timeout - please try again'));
            }, 300000);
        });
    }

    // Helper for direct API calls in mobile
    // Ensure access token is loaded from storage
    ensureTokenLoaded() {
        if (!this.accessToken) {
            const storedToken = localStorage.getItem('google_access_token');
            const storedExpiry = localStorage.getItem('google_token_expiry');

            if (storedToken && storedExpiry && Date.now() < parseInt(storedExpiry)) {
                this.accessToken = storedToken;
                this.isInitialized = true;
                console.log('[LAKSH] Lazy-loaded OAuth token from storage');
            }
        }
        return !!this.accessToken;
    }

    async makeApiRequest(url, options = {}) {
        // Ensure token is loaded before making request
        this.ensureTokenLoaded();

        if (!this.accessToken) {
            throw new Error('No access token available');
        }

        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (!response.ok) {
            // Handle 401 specifically
            if (response.status === 401) {
                console.log('[LAKSH] 401 in fetch, trying refresh...');
                const refreshed = await this.refreshToken();
                if (refreshed) return this.makeApiRequest(url, options);
            }
            throw new Error(`API request failed: ${response.status}`);
        }

        return response.json();
    }

    // Helper for getting spreadsheet values with GAPI/Fetch fallback and smart sheet detect
    async getSpreadsheetValues(spreadsheetId, range) {
        this.ensureTokenLoaded();

        // Extract sheet name from range
        const sheetMatch = range.match(/'(.*?)'/);
        if (sheetMatch) {
            const sheetName = sheetMatch[1];
            // Only check existence for non-core sheets to avoid recursive loops
            if (!sheetName.startsWith('_') && !await this.doesSheetExist(spreadsheetId, sheetName)) {
                return [];
            }
        }

        try {
            if (window.gapi?.client?.sheets) {
                const response = await withRetry(() =>
                    window.gapi.client.sheets.spreadsheets.values.get({
                        spreadsheetId,
                        range
                    })
                );
                return response.result.values || [];
            }

            if (this.accessToken) {
                const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
                const data = await this.makeApiRequest(url);
                return data.values || [];
            }

            return [];
        } catch (error) {
            const isNotFound = error?.status === 400 || error?.result?.error?.code === 400;
            if (!isNotFound) {
                console.warn(`[LAKSH] getSpreadsheetValues failed for ${range}:`, error);
            }
            return [];
        }
    }

    // Wait for Google scripts to load
    waitForGapi() {
        return new Promise((resolve, reject) => {
            // Check if running in Android WebView
            if (this.isAndroidWebView()) {
                console.log('[LAKSH] Android WebView detected');

                // If we already have a token, just load the scripts
                if (this.accessToken || localStorage.getItem('google_access_token')) {
                    this.loadGoogleAPIsIfNeeded().then(resolve).catch(reject);
                    return;
                }

                // Otherwise start the mobile OAuth flow
                this.initMobileOAuth().then(resolve).catch(reject);
                return;
            }

            let attempts = 0;
            const maxAttempts = 100; // 20 seconds total for slower mobile connections

            const check = () => {
                attempts++;
                console.log(`[LAKSH] Checking for Google APIs (attempt ${attempts}/${maxAttempts})`);
                console.log('[LAKSH] window.gapi:', !!window.gapi);
                console.log('[LAKSH] window.google:', !!window.google);
                console.log('[LAKSH] window.google.accounts:', !!window.google?.accounts);
                console.log('[LAKSH] window.google.accounts.oauth2:', !!window.google?.accounts?.oauth2);

                if (window.gapi && window.google?.accounts?.oauth2) {
                    console.log('[LAKSH] Google APIs are ready!');
                    resolve(true);
                } else if (attempts >= maxAttempts) {
                    console.error('[LAKSH] Timeout waiting for Google APIs');
                    // Try to dynamically load if not available
                    this.loadGoogleAPIsIfNeeded()
                        .then(() => resolve(true))
                        .catch(() => reject(new Error('Google API scripts not loaded. Please refresh the page.')));
                } else {
                    setTimeout(check, 200); // Check every 200ms
                }
            };
            check();
        });
    }

    // Dynamically load Google APIs if not loaded (for mobile/PWA environments)
    async loadGoogleAPIsIfNeeded() {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (window.gapi && window.google?.accounts?.oauth2) {
                resolve();
                return;
            }

            let gapiLoaded = !!window.gapi;
            let gisLoaded = !!window.google?.accounts;
            let scriptsToLoad = 0;
            let scriptsLoaded = 0;

            const checkComplete = () => {
                scriptsLoaded++;
                if (scriptsLoaded === scriptsToLoad) {
                    // Wait a bit for initialization
                    setTimeout(() => {
                        if (window.gapi && window.google?.accounts?.oauth2) {
                            resolve();
                        } else {
                            reject(new Error('Scripts loaded but APIs not available'));
                        }
                    }, 1000);
                }
            };

            // Load GAPI if needed
            if (!gapiLoaded) {
                scriptsToLoad++;
                const gapiScript = document.createElement('script');
                gapiScript.src = 'https://apis.google.com/js/api.js';
                gapiScript.onload = checkComplete;
                gapiScript.onerror = () => reject(new Error('Failed to load Google API script'));
                document.head.appendChild(gapiScript);
            }

            // Load GIS if needed
            if (!gisLoaded) {
                scriptsToLoad++;
                const gisScript = document.createElement('script');
                gisScript.src = 'https://accounts.google.com/gsi/client';
                gisScript.onload = checkComplete;
                gisScript.onerror = () => reject(new Error('Failed to load Google Identity Services script'));
                document.head.appendChild(gisScript);
            }

            // If both already loaded
            if (scriptsToLoad === 0) {
                resolve();
            }
        });
    }

    // Ensure GAPI client is ready before making requests
    // Returns true if ready, false if not (but we can still use fetch fallback)
    async ensureClientReady() {
        // If we have access token, we can use fetch fallback - consider it "ready"
        if (this.accessToken) {
            this.isInitialized = true;
            return true;
        }

        if (this.isInitialized && window.gapi?.client?.sheets) return true;

        console.log('[LAKSH] Waiting for GAPI client...');

        // Wait up to 5 seconds for GAPI
        for (let i = 0; i < 50; i++) {
            if (window.gapi?.client?.sheets) {
                this.isInitialized = true;
                return true;
            }
            // Check if token became available during wait
            if (this.accessToken || localStorage.getItem('google_access_token')) {
                this.ensureTokenLoaded();
                if (this.accessToken) {
                    this.isInitialized = true;
                    return true;
                }
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Don't throw - return false so caller can use fallback
        console.warn('[LAKSH] GAPI client not ready after timeout, will use fetch fallback if possible');

        // One more check for token
        this.ensureTokenLoaded();
        if (this.accessToken) {
            this.isInitialized = true;
            return true;
        }

        throw new Error('Google Sheets API client not ready. Please ensure internet connection and refresh.');
    }

    async init(clientId = null) {
        // 1. Initial check: Do we already have a token in localStorage?
        if (!this.accessToken) {
            const storedToken = localStorage.getItem('google_access_token');
            const storedExpiry = localStorage.getItem('google_token_expiry');

            if (storedToken && storedExpiry) {
                if (Date.now() < parseInt(storedExpiry)) {
                    this.accessToken = storedToken;
                    console.log('[LAKSH] Restored OAuth token from storage');
                } else {
                    localStorage.removeItem('google_access_token');
                    localStorage.removeItem('google_token_expiry');
                }
            }
        }

        // 2. Handle OAuth callback for mobile (tokens in URL hash)
        if (this.isAndroidWebView()) {
            const hash = window.location.hash.substring(1);
            const urlParams = new URLSearchParams(hash);
            const accessToken = urlParams.get('access_token');
            const state = urlParams.get('state');
            const storedState = localStorage.getItem('oauth_state');

            if (accessToken && state && state === storedState) {
                console.log('[LAKSH] OAuth callback received via URL hash');
                this.accessToken = accessToken;
                const expiresIn = urlParams.get('expires_in') || '3600';
                const expiry = new Date(Date.now() + parseInt(expiresIn) * 1000);
                localStorage.setItem('google_access_token', accessToken);
                localStorage.setItem('google_token_expiry', expiry.getTime().toString());
                localStorage.removeItem('oauth_state');
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }

        if (this.isInitialized && this.accessToken) {
            // Even if "initialized", ensure gapi.client is actually loaded if possible
            if (window.gapi?.client?.sheets) return true;
            // On mobile, having a token is enough since we have fetch fallbacks
            if (this.isAndroidWebView()) return true;
        }

        // For mobile with a token, don't block on GAPI - just mark as ready
        if (this.accessToken && this.isAndroidWebView()) {
            console.log('[LAKSH] Mobile mode: Skipping GAPI wait, using token-only mode');
            this.isInitialized = true;
            return true;
        }

        try {
            // 3. Load scripts
            await this.waitForGapi();

            // 4. Load GAPI client and discovery docs
            await new Promise((resolve, reject) => {
                window.gapi.load('client', { callback: resolve, onerror: reject });
            });

            await window.gapi.client.init({
                discoveryDocs: DISCOVERY_DOCS,
            });

            // 5. If we have a token, set it in the client
            if (this.accessToken) {
                window.gapi.client.setToken({ access_token: this.accessToken });
            } else {
                // Otherwise try loading from cloudBackup (for web)
                const { cloudBackup } = await importWithRetry(() => import('./cloudBackup'));
                await cloudBackup.init();
                if (cloudBackup.isSignedIn()) {
                    window.gapi.client.setToken({ access_token: cloudBackup.accessToken });
                    this.accessToken = cloudBackup.accessToken;
                }
            }

            this.isInitialized = true;
            return true;
        } catch (err) {
            console.warn('[LAKSH] GAPI/GIS Init failed:', err);

            // On mobile, if we have a token but GAPI failed to init,
            // we can still proceed with direct REST calls (fetch fallbacks)
            if (this.accessToken) {
                console.log('[LAKSH] Proceeding with token-only initialization (fetch mode)');
                this.isInitialized = true;
                return true;
            }

            throw err;
        }
    }

    getAuthUrl() {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        const redirectUri = window.location.origin + '/oauth-callback';
        const scope = encodeURIComponent('https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/drive.appdata');
        const state = Math.random().toString(36).substring(2);
        localStorage.setItem('oauth_state', state);
        return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${scope}&state=${state}`;
    }

    setAccessToken(token) {
        this.accessToken = token;
        if (window.gapi?.client) {
            window.gapi.client.setToken({ access_token: token });
        }
        // On mobile/WebView, we can proceed even if GAPI fails
        if (this.isAndroidWebView()) {
            this.isInitialized = true;
        }
    }

    async handleCopyLink() {
        const url = this.getAuthUrl();
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(url);
                return true;
            } else {
                // Fallback for older WebViews/non-secure contexts
                const textArea = document.createElement("textarea");
                textArea.value = url;
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                textArea.style.top = "0";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                return successful;
            }
        } catch (err) {
            console.error('Clipboard copy failed:', err);
            return false;
        }
    }

    async signIn() {
        if (this.isAndroidWebView()) {
            console.log('[LAKSH] Mobile mode: Using OAuth redirect flow via external browser');
            const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
            // Use explicit callback path for production redirect
            const redirectUri = window.location.origin + '/oauth-callback';
            const scope = encodeURIComponent('https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/drive.appdata');
            const state = Math.random().toString(36).substring(2);
            localStorage.setItem('oauth_state', state);
            localStorage.setItem('oauth_pending', 'true');

            const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${scope}&state=${state}`;

            console.log('[LAKSH] Opening external browser for OAuth:', authUrl);

            // CRITICAL: Use AndroidBridge to open external browser to avoid disallowed_useragent error
            if (window.AndroidBridge && typeof window.AndroidBridge.openExternalBrowser === 'function') {
                window.AndroidBridge.openExternalBrowser(authUrl);
            } else {
                // Fallback: try opening in new window/tab
                window.open(authUrl, '_blank');
            }

            // Return a promise that resolves when token is received
            return new Promise((resolve, reject) => {
                let bc;
                try {
                    bc = new BroadcastChannel('laksh-oauth');
                } catch { }

                if (bc) {
                    const onMsg = (evt) => {
                        if (evt?.data?.type === 'oauth_token' && evt.data.access_token) {
                            try { bc.close(); } catch { }
                            this.accessToken = evt.data.access_token;
                            const expiryMs = Date.now() + (parseInt(evt.data.expires_in || '3600', 10) * 1000);
                            try {
                                sessionStorage.setItem('google_access_token', evt.data.access_token);
                                sessionStorage.setItem('google_token_expiry', String(expiryMs));
                                localStorage.setItem('google_access_token', evt.data.access_token);
                                localStorage.setItem('google_token_expiry', String(expiryMs));
                            } catch { }
                            this.isInitialized = true;
                            resolve(true);
                        }
                    };
                    bc.addEventListener('message', onMsg);
                }

                // Poll for token in storage (set by oauth-callback page)
                const checkInterval = setInterval(() => {
                    const token = sessionStorage.getItem('google_access_token') || localStorage.getItem('google_access_token');
                    const expiry = sessionStorage.getItem('google_token_expiry') || localStorage.getItem('google_token_expiry');

                    if (token && expiry && Date.now() < parseInt(expiry)) {
                        clearInterval(checkInterval);
                        try { bc && bc.close(); } catch { }
                        this.accessToken = token;
                        this.isInitialized = true;
                        console.log('[LAKSH] OAuth completed successfully');
                        resolve(true);
                    }
                }, 1000);

                // Timeout after 5 minutes
                setTimeout(() => {
                    clearInterval(checkInterval);
                    try { bc && bc.close(); } catch { }
                    reject(new Error('OAuth timeout - please try again'));
                }, 300000);
            });
        }

        // Web mode: use cloudBackup's popup flow
        const { cloudBackup } = await importWithRetry(() => import('./cloudBackup'));
        await cloudBackup.init();
        await cloudBackup.signIn();
        if (cloudBackup.isSignedIn()) {
            this.accessToken = cloudBackup.accessToken;
            if (window.gapi?.client) {
                window.gapi.client.setToken({ access_token: this.accessToken });
            }
            this.isInitialized = true;
            return true;
        }
        throw new Error('Sign in failed or cancelled');
    }

    // Force refresh the token (used on 401 errors)
    async refreshToken() {
        // Use cloudBackup for token refresh
        const { cloudBackup } = await importWithRetry(() => import('./cloudBackup'));
        if (!cloudBackup.isSignedIn()) {
            await cloudBackup.signIn();
        }
        if (cloudBackup.isSignedIn()) {
            window.gapi.client.setToken({ access_token: cloudBackup.accessToken });
            this.accessToken = cloudBackup.accessToken;
            return true;
        }
        return false;
    }

    async signOut() {
        // Use cloudBackup for sign out (ESM-safe)
        const { cloudBackup } = await importWithRetry(() => import('./cloudBackup'));
        cloudBackup.signOut();
        this.accessToken = null;
        this.isInitialized = false;
    }

    // ===== LIST USER'S SPREADSHEETS =====

    async listSpreadsheets() {
        // Ensure token is loaded from storage
        this.ensureTokenLoaded();

        try {
            // Attempt to ensure GAPI is ready, but don't crash if it's not (we'll fallback to fetch)
            try {
                await this.ensureClientReady();
            } catch (e) {
                console.warn('[LAKSH] GAPI not ready for listSpreadsheets, trying fetch fallback');
            }

            // Method A: use GAPI if available
            if (window.gapi?.client?.drive) {
                const response = await withRetry(() =>
                    window.gapi.client.drive.files.list({
                        q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
                        fields: 'files(id, name, modifiedTime)',
                        orderBy: 'modifiedTime desc',
                        pageSize: 40
                    })
                    , 3, 'listSpreadsheets-gapi');
                return response.result.files || [];
            }

            // Method B: use direct Fetch API (more reliable in WebViews)
            if (this.accessToken) {
                console.log('[LAKSH] Using direct fetch for listSpreadsheets');
                const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false")}&fields=${encodeURIComponent('files(id, name, modifiedTime)')}&orderBy=modifiedTime%20desc&pageSize=40`;
                const data = await this.makeApiRequest(url);
                return data.files || [];
            }

            throw new Error('No authentication available to list spreadsheets');
        } catch (error) {
            console.error('[LAKSH] Failed to list spreadsheets:', error);
            if (!this.isInitialized && this.accessToken) {
                await this.init();
            }
            return [];
        }
    }

    // Check if a spreadsheet has LAKSH data structure
    async isLakshSheet(spreadsheetId) {
        try {
            let sheetNames = [];

            // Method A: GAPI
            if (window.gapi?.client?.sheets) {
                const response = await withRetry(() =>
                    window.gapi.client.sheets.spreadsheets.get({
                        spreadsheetId,
                        fields: 'sheets.properties.title'
                    })
                );
                sheetNames = (response.result.sheets || []).map(s => s.properties.title);
            }
            // Method B: Fetch
            else if (this.accessToken) {
                const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=${encodeURIComponent('sheets.properties.title')}`;
                const data = await this.makeApiRequest(url);
                sheetNames = (data.sheets || []).map(s => s.properties.title);
            }

            // Check for LAKSH sheets (either old format or has Transactions)
            return sheetNames.includes('_Config') ||
                sheetNames.includes('Transactions') ||
                sheetNames.includes('_Accounts') ||
                sheetNames.some(name => /^[A-Z][a-z]{2} \d{4}$/.test(name)); // Monthly sheets like "Jan 2026"
        } catch (error) {
            return false;
        }
    }

    // ===== SHEET MANAGEMENT =====

    async ensureSheetExists(spreadsheetId, sheetTitle) {
        try {
            await this.ensureClientReady();
        } catch (e) {
            if (this.isAndroidWebView() && this.accessToken) {
                console.warn('[LAKSH] ensureSheetExists: GAPI not ready, skipping check and proceeding with fetch fallback');
                return true;
            }
            throw e;
        }

        // Check internal cache first to avoid redundant API calls
        const cacheKey = `${spreadsheetId}:${sheetTitle}`;
        if (this.sheetCache.has(cacheKey)) {
            return true;
        }

        // If a check for this spreadsheet is already in progress, wait for it
        if (this.pendingSheetChecks.has(spreadsheetId)) {
            console.log(`[LAKSH] Waiting for existing sheet check for: ${spreadsheetId.substring(0, 8)}`);
            await this.pendingSheetChecks.get(spreadsheetId);
            // After waiting, check cache again as it might be populated now
            if (this.sheetCache.has(cacheKey)) return true;
        }

        // Start a new check (and lock it for others)
        const checkPromise = (async () => {
            try {
                // Use throttled request with retry for 429 errors
                const response = await withRetry(() =>
                    window.gapi.client.sheets.spreadsheets.get({
                        spreadsheetId: spreadsheetId,
                        fields: 'sheets.properties.title'
                    }), 3, `Listing sheets for ${spreadsheetId.substring(0, 8)}`
                );

                const sheets = response.result.sheets || [];
                // Cache ALL discovered sheets for this spreadsheet to avoid future lookups
                sheets.forEach(s => {
                    this.sheetCache.set(`${spreadsheetId}:${s.properties.title}`, true);
                });

                const exists = sheets.some(s => s.properties.title === sheetTitle);
                if (!exists) {
                    console.log(`[LAKSH] Sheet "${sheetTitle}" missing, creating...`);
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
                    this.sheetCache.set(cacheKey, true);
                }
                return true;
            } catch (error) {
                if (error.status === 401 || error?.result?.error?.code === 401) {
                    const refreshed = await this.refreshToken();
                    if (refreshed) return this.ensureSheetExists(spreadsheetId, sheetTitle);
                }
                console.error(`[LAKSH] Error ensuring sheet ${sheetTitle} exists:`, error);
                throw error;
            } finally {
                // Clear the lock
                this.pendingSheetChecks.delete(spreadsheetId);
            }
        })();

        this.pendingSheetChecks.set(spreadsheetId, checkPromise);
        return checkPromise;
    }

    async doesSheetExist(spreadsheetId, sheetTitle) {
        // Ensure cache is populated at least once for this spreadsheet
        if (![...this.sheetCache.keys()].some(k => k.startsWith(`${spreadsheetId}:`))) {
            // Use _Config or Config to trigger initial list
            const hasUnderscoreConfig = await this.probeSheet(spreadsheetId, '_Config');
            if (!hasUnderscoreConfig) {
                await this.probeSheet(spreadsheetId, 'Config');
            }
        }

        // Check for exact match or opposite underscore version if appropriate
        if (this.sheetCache.has(`${spreadsheetId}:${sheetTitle}`)) return true;

        const altTitle = sheetTitle.startsWith('_') ? sheetTitle.substring(1) : `_${sheetTitle}`;
        return this.sheetCache.has(`${spreadsheetId}:${altTitle}`);
    }

    // New helper to just check if a sheet exists without creating it
    async probeSheet(spreadsheetId, sheetTitle) {
        try {
            const cacheKey = `${spreadsheetId}:${sheetTitle}`;
            if (this.sheetCache.has(cacheKey)) return true;

            let sheets = [];
            if (window.gapi?.client?.sheets) {
                const response = await withRetry(() =>
                    window.gapi.client.sheets.spreadsheets.get({
                        spreadsheetId,
                        fields: 'sheets.properties.title'
                    })
                );
                sheets = response.result.sheets || [];
            } else if (this.ensureTokenLoaded()) {
                console.log('[LAKSH] Probing sheets using fetch fallback');
                const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
                const data = await this.makeApiRequest(url);
                sheets = data.sheets || [];
            } else {
                return false;
            }

            sheets.forEach(s => {
                this.sheetCache.set(`${spreadsheetId}:${s.properties.title}`, true);
            });

            return sheets.some(s => s.properties.title === sheetTitle);
        } catch (e) {
            console.warn('[LAKSH] probeSheet failed:', e);
            return false;
        }
    }

    async resolveSheetName(spreadsheetId, logicalName) {
        const underscored = logicalName.startsWith('_') ? logicalName : `_${logicalName}`;
        const clean = logicalName.startsWith('_') ? logicalName.substring(1) : logicalName;

        // Check cache or probe
        if (await this.doesSheetExist(spreadsheetId, underscored)) return underscored;
        if (await this.doesSheetExist(spreadsheetId, clean)) return clean;

        // Default to underscored for new creations
        return underscored;
    }

    getHeadersForSheet(sheetTitle) {
        const cleanTitle = sheetTitle.startsWith('_') ? sheetTitle : `_${sheetTitle}`;
        if (cleanTitle === '_Config') return ['Key', 'Value'];
        if (cleanTitle === '_Accounts') return ['ID', 'Name', 'Type', 'Balance', 'BillingCycleStart', 'DueDate', 'CreatedAt', 'IsSecret'];
        if (cleanTitle === '_Categories') return ['Name', 'Keywords', 'Color', 'Icon'];
        if (cleanTitle === '_Bills') return ['ID', 'Name', 'Amount', 'DueDay', 'BillingDay', 'Category', 'Status', 'BillType', 'Cycle', 'CreatedAt'];
        if (cleanTitle === '_BillPayments') return ['ID', 'BillID', 'Name', 'Cycle', 'Amount', 'DueDate', 'Status', 'PaidDate', 'TransactionID'];
        // Monthly sheets
        return ['ID', 'Date', 'Description', 'Amount', 'Category', 'AccountID', 'Type', 'CreatedAt', 'Friend'];
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
        try {
            const sheetName = await this.resolveSheetName(spreadsheetId, '_Config');
            const rows = await this.getSpreadsheetValues(spreadsheetId, `'${sheetName}'!A:B`);
            const config = {};
            rows.forEach(row => {
                if (row[0]) config[row[0]] = row[1] || '';
            });
            return config;
        } catch (error) {
            console.error('[LAKSH] Error getting config:', error);
            return {};
        }
    }

    async setConfig(spreadsheetId, key, value) {
        const sheetName = await this.resolveSheetName(spreadsheetId, '_Config');
        await this.ensureSheetExists(spreadsheetId, sheetName);

        const responseData = await this.getSpreadsheetValues(spreadsheetId, `'${sheetName}'!A:B`);
        const rows = responseData || [];
        const rowIndex = rows.findIndex(row => row[0] === key);

        if (rowIndex === -1) {
            await window.gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId,
                range: `'${sheetName}'!A:B`,
                valueInputOption: 'RAW',
                insertDataOption: 'INSERT_ROWS',
                resource: { values: [[key, value]] }
            });
        } else {
            await window.gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `'${sheetName}'!A${rowIndex + 1}:B${rowIndex + 1}`,
                valueInputOption: 'RAW',
                resource: { values: [[key, value]] }
            });
        }
    }

    // ===== ACCOUNTS CRUD =====

    async getAccounts(spreadsheetId) {
        try {
            const sheetName = await this.resolveSheetName(spreadsheetId, '_Accounts');
            const rows = await this.getSpreadsheetValues(spreadsheetId, `'${sheetName}'!A:H`);
            return this.parseAccountRows(rows);
        } catch (error) {
            console.error('Error getting accounts:', error);
            return [];
        }
    }

    parseAccountRows(rows) {
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
    }

    async addAccount(spreadsheetId, account) {
        const sheetName = await this.resolveSheetName(spreadsheetId, '_Accounts');
        await this.ensureSheetExists(spreadsheetId, sheetName);

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
            range: `'${sheetName}'!A:H`,
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            resource: { values: [row] }
        });
    }

    async updateAccount(spreadsheetId, accountId, updates) {
        await this.ensureClientReady();
        const sheetName = await this.resolveSheetName(spreadsheetId, '_Accounts');
        const response = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `'${sheetName}'!A:H`
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
                range: `'${sheetName}'!A${rowIndex + 1}:H${rowIndex + 1}`,
                valueInputOption: 'RAW',
                resource: { values: [updatedRow] }
            });
        }
    }

    async deleteAccount(spreadsheetId, accountId) {
        await this.ensureClientReady();
        const sheetName = await this.resolveSheetName(spreadsheetId, '_Accounts');
        const sheetInfo = await window.gapi.client.sheets.spreadsheets.get({ spreadsheetId });
        const sheet = sheetInfo.result.sheets.find(s => s.properties.title === sheetName);
        if (!sheet) return;

        const response = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `'${sheetName}'!A:A`
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
        const seenIds = new Set();

        // Populate sheet cache first to avoid 400 errors from probing
        await this.ensureSheetExists(spreadsheetId, '_Config');

        // Strategy 1: Look for generic "Transactions" sheet if it exists
        if (await this.doesSheetExist(spreadsheetId, 'Transactions')) {
            try {
                const genericRows = await this.getSpreadsheetValues(spreadsheetId, "'Transactions'!A:I");
                if (genericRows.length > 1) {
                    genericRows.slice(1).forEach(row => {
                        if (row[0]) {
                            transactions.push(this.parseTransactionRow(row));
                            seenIds.add(row[0]);
                        }
                    });
                }
            } catch (e) {
                console.warn('[LAKSH] Error reading generic Transactions sheet:', e);
            }
        }

        // Strategy 2: Look for individual monthly sheets only if they exist
        for (let i = 0; i < months; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const sheetName = this.getMonthSheetName(date);

            if (await this.doesSheetExist(spreadsheetId, sheetName)) {
                try {
                    const rows = await this.getSpreadsheetValues(spreadsheetId, `'${sheetName}'!A:I`);
                    rows.slice(1).forEach(row => {
                        if (row[0] && !seenIds.has(row[0])) {
                            transactions.push(this.parseTransactionRow(row));
                            seenIds.add(row[0]);
                        }
                    });
                } catch (error) {
                    console.warn(`[LAKSH] Error reading monthly sheet ${sheetName}:`, error);
                }
            }
        }

        return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    parseTransactionRow(row) {
        return {
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
        };
    }

    // ===== CATEGORIES CRUD =====

    async getCategories(spreadsheetId) {
        try {
            const sheetName = await this.resolveSheetName(spreadsheetId, '_Categories');
            const rows = await this.getSpreadsheetValues(spreadsheetId, `'${sheetName}'!A:D`);

            if (rows.length <= 1) {
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
                return defaults.map(row => ({ name: row[0], keywords: row[1], color: row[2], icon: row[3] }));
            }

            return rows.slice(1).map(row => ({
                name: row[0],
                keywords: row[1] || '',
                color: row[2] || '#94a3b8',
                icon: row[3] || '📦'
            })).filter(c => c.name);
        } catch (error) {
            console.error('[LAKSH] Error getting categories:', error);
            return [];
        }
    }

    async addCategory(spreadsheetId, category) {
        const sheetName = await this.resolveSheetName(spreadsheetId, '_Categories');
        await this.ensureSheetExists(spreadsheetId, sheetName);

        await window.gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `'${sheetName}'!A:D`,
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            resource: { values: [[category.name, category.keywords, category.color, category.icon]] }
        });
    }

    async updateCategory(spreadsheetId, oldName, category) {
        await this.ensureClientReady();
        const sheetName = await this.resolveSheetName(spreadsheetId, '_Categories');
        const response = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `'${sheetName}'!A:D`
        });

        const rows = response.result.values || [];
        const rowIndex = rows.findIndex(row => row[0] === oldName);

        if (rowIndex > 0) {
            await window.gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `'${sheetName}'!A${rowIndex + 1}:D${rowIndex + 1}`,
                valueInputOption: 'RAW',
                resource: { values: [[category.name, category.keywords, category.color, category.icon]] }
            });
        }
    }

    async deleteCategory(spreadsheetId, categoryName) {
        await this.ensureClientReady();
        const sheetName = await this.resolveSheetName(spreadsheetId, '_Categories');
        const sheetInfo = await window.gapi.client.sheets.spreadsheets.get({ spreadsheetId });
        const sheet = sheetInfo.result.sheets.find(s => s.properties.title === sheetName);
        if (!sheet) return;

        const response = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `'${sheetName}'!A:A`
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
        try {
            const sheetName = await this.resolveSheetName(spreadsheetId, '_Bills');
            const rows = await this.getSpreadsheetValues(spreadsheetId, `'${sheetName}'!A:J`);
            const seenIds = new Set();
            return rows.slice(1).map(row => ({
                id: row[0],
                name: row[1],
                amount: parseFloat(row[2]) || 0,
                dueDay: parseInt(row[3]) || 1,
                billingDay: parseInt(row[4]) || 1,
                category: row[5],
                status: row[6] || 'active',
                billType: row[7] || 'recurring',
                cycle: row[8] || 'monthly',
                createdAt: row[9]
            })).filter(b => {
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
        const sheetName = await this.resolveSheetName(spreadsheetId, '_Bills');
        await this.ensureSheetExists(spreadsheetId, sheetName);

        const row = [
            bill.id,
            bill.name,
            bill.amount,
            bill.dueDay,
            bill.billingDay || '1',
            bill.category,
            bill.status || 'active',
            bill.billType || 'recurring',
            bill.cycle || 'monthly',
            new Date().toISOString()
        ];

        await window.gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `'${sheetName}'!A:J`,
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            resource: { values: [row] }
        });
    }

    async updateBill(spreadsheetId, billId, updates) {
        await this.ensureClientReady();
        const sheetName = await this.resolveSheetName(spreadsheetId, '_Bills');
        const response = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `'${sheetName}'!A:J`
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
                updates.billingDay ?? currentRow[4],
                updates.category ?? currentRow[5],
                updates.status ?? currentRow[6],
                updates.billType ?? currentRow[7],
                updates.cycle ?? currentRow[8],
                currentRow[9]
            ];

            await window.gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `'${sheetName}'!A${rowIndex + 1}:J${rowIndex + 1}`,
                valueInputOption: 'RAW',
                resource: { values: [[updatedRow]] }
            });
        }
    }

    // ===== BILL PAYMENTS CRUD =====

    async getBillPayments(spreadsheetId) {
        try {
            const sheetName = await this.resolveSheetName(spreadsheetId, '_BillPayments');
            const rows = await this.getSpreadsheetValues(spreadsheetId, `'${sheetName}'!A:I`);
            const payments = rows.slice(1).map(row => ({
                id: row[0],
                billId: row[1],
                name: row[2],
                cycle: row[3],
                amount: parseFloat(row[4]) || 0,
                dueDate: row[5],
                status: row[6],
                paidDate: row[7],
                transactionId: row[8]
            }));

            // Deduplicate: If multiple instances for same bill+cycle exist in sheet, take the most recent (last in sheet)
            const seen = new Set();
            return payments.reverse().filter(p => {
                const key = `${p.billId}:${p.cycle}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            }).reverse();
        } catch (error) {
            console.error('Error getting bill payments:', error);
            return [];
        }
    }

    async addBillPayment(spreadsheetId, payment) {
        const sheetName = await this.resolveSheetName(spreadsheetId, '_BillPayments');
        await this.ensureSheetExists(spreadsheetId, sheetName);
        const row = [
            payment.id,
            payment.billId,
            payment.name,
            payment.cycle,
            payment.amount,
            payment.dueDate,
            payment.status || 'pending',
            payment.paidDate || '',
            payment.transactionId || ''
        ];

        await window.gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `'${sheetName}'!A:I`,
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            resource: { values: [row] }
        });
    }

    async updateBillPayment(spreadsheetId, paymentId, updates) {
        await this.ensureClientReady();
        const sheetName = await this.resolveSheetName(spreadsheetId, '_BillPayments');
        const response = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `'${sheetName}'!A:I`
        });

        const rows = response.result.values || [];
        const rowIndex = rows.findIndex(row => row[0] === paymentId);

        if (rowIndex >= 0) {
            const curr = rows[rowIndex];
            const updated = [
                paymentId,
                updates.hasOwnProperty('billId') ? updates.billId : (curr[1] || ''),
                updates.hasOwnProperty('name') ? updates.name : (curr[2] || ''),
                updates.hasOwnProperty('cycle') ? updates.cycle : (curr[3] || ''),
                updates.hasOwnProperty('amount') ? updates.amount : (curr[4] || '0'),
                updates.hasOwnProperty('dueDate') ? updates.dueDate : (curr[5] || ''),
                updates.hasOwnProperty('status') ? updates.status : (curr[6] || 'pending'),
                updates.hasOwnProperty('paidDate') ? updates.paidDate : (curr[7] || ''),
                updates.hasOwnProperty('transactionId') ? updates.transactionId : (curr[8] || '')
            ];

            await window.gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `'${sheetName}'!A${rowIndex + 1}:I${rowIndex + 1}`,
                valueInputOption: 'RAW',
                resource: { values: [updated] }
            });
        }
    }

    async deleteBill(spreadsheetId, billId) {
        await this.ensureClientReady();
        const sheetName = await this.resolveSheetName(spreadsheetId, '_Bills');
        const sheetInfo = await window.gapi.client.sheets.spreadsheets.get({ spreadsheetId });
        const sheet = sheetInfo.result.sheets.find(s => s.properties.title === sheetName);
        if (!sheet) return;

        const response = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `'${sheetName}'!A:A`
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
    async deleteBillPayment(spreadsheetId, paymentId) {
        await this.ensureClientReady();
        const sheetName = await this.resolveSheetName(spreadsheetId, '_BillPayments');
        const sheetInfo = await window.gapi.client.sheets.spreadsheets.get({ spreadsheetId });
        const sheet = sheetInfo.result.sheets.find(s => s.properties.title === sheetName);
        if (!sheet) return;

        const response = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `'${sheetName}'!A:A`
        });

        const rows = response.result.values || [];
        const rowIndex = rows.findIndex(row => row[0] === paymentId);

        if (rowIndex >= 0) {
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

