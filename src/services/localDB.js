// IndexedDB service for offline-first data persistence
// Implements stale-while-revalidate pattern for PWA

const DB_NAME = 'laksh_db';
const DB_VERSION = 2;
const STORES = {
    transactions: 'transactions',
    accounts: 'accounts',
    categories: 'categories',
    bills: 'bills',
    billPayments: 'billPayments',
    meta: 'meta'
};

// Cache TTL: 24 hours (data is still shown but considered stale)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

class LocalDB {
    constructor() {
        this.db = null;
        this.initPromise = null;
    }

    // Initialize IndexedDB
    async init() {
        if (this.db) return this.db;
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('[LAKSH DB] Failed to open IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('[LAKSH DB] IndexedDB initialized');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object stores
                if (!db.objectStoreNames.contains(STORES.transactions)) {
                    db.createObjectStore(STORES.transactions, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(STORES.accounts)) {
                    db.createObjectStore(STORES.accounts, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(STORES.categories)) {
                    db.createObjectStore(STORES.categories, { keyPath: 'name' });
                }
                if (!db.objectStoreNames.contains(STORES.bills)) {
                    db.createObjectStore(STORES.bills, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(STORES.billPayments)) {
                    db.createObjectStore(STORES.billPayments, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(STORES.meta)) {
                    db.createObjectStore(STORES.meta, { keyPath: 'key' });
                }

                console.log('[LAKSH DB] Database schema created');
            };
        });

        return this.initPromise;
    }

    // Generic store operations
    async getStore(storeName, mode = 'readonly') {
        const db = await this.init();
        const tx = db.transaction(storeName, mode);
        return tx.objectStore(storeName);
    }

    async getAll(storeName) {
        return new Promise(async (resolve, reject) => {
            try {
                const store = await this.getStore(storeName);
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            } catch (e) {
                console.error(`[LAKSH DB] getAll(${storeName}) failed:`, e);
                resolve([]);
            }
        });
    }

    async get(storeName, key) {
        return new Promise(async (resolve, reject) => {
            try {
                const store = await this.getStore(storeName);
                const request = store.get(key);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } catch (e) {
                console.error(`[LAKSH DB] get(${storeName}, ${key}) failed:`, e);
                resolve(undefined);
            }
        });
    }

    async loadData() {
        try {
            const [transactions, accounts, categories, bills, billPayments, lastSync] = await Promise.all([
                this.getAll(STORES.transactions),
                this.getAll(STORES.accounts),
                this.getAll(STORES.categories),
                this.getAll(STORES.bills),
                this.getAll(STORES.billPayments),
                this.get(STORES.meta, 'lastSync')
            ]);

            return {
                transactions,
                accounts,
                categories,
                bills,
                billPayments,
                lastSync: lastSync?.value
            };
        } catch (error) {
            console.error('[LAKSH DB] Failed to load initial data:', error);
            return {
                transactions: [],
                accounts: [],
                categories: [],
                bills: [],
                billPayments: [],
                lastSync: null
            };
        }
    }

    async putAll(storeName, items) {
        if (!items || items.length === 0) return;

        return new Promise(async (resolve, reject) => {
            try {
                const db = await this.init();
                const tx = db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);

                // Clear existing data first
                store.clear();

                // Add all items
                items.forEach(item => store.put(item));

                tx.oncomplete = () => resolve(true);
                tx.onerror = () => reject(tx.error);
            } catch (e) {
                console.error(`[LAKSH DB] putAll(${storeName}) failed:`, e);
                resolve(false);
            }
        });
    }

    async clear(storeName) {
        return new Promise(async (resolve, reject) => {
            try {
                const store = await this.getStore(storeName, 'readwrite');
                const request = store.clear();
                request.onsuccess = () => resolve(true);
                request.onerror = () => reject(request.error);
            } catch (e) {
                resolve(false);
            }
        });
    }

    // Meta operations
    async getMeta(key) {
        return new Promise(async (resolve, reject) => {
            try {
                const store = await this.getStore(STORES.meta);
                const request = store.get(key);
                request.onsuccess = () => resolve(request.result?.value || null);
                request.onerror = () => reject(request.error);
            } catch (e) {
                resolve(null);
            }
        });
    }

    async setMeta(key, value) {
        return new Promise(async (resolve, reject) => {
            try {
                const store = await this.getStore(STORES.meta, 'readwrite');
                const request = store.put({ key, value });
                request.onsuccess = () => resolve(true);
                request.onerror = () => reject(request.error);
            } catch (e) {
                resolve(false);
            }
        });
    }

    // High-level API

    /**
     * Get all cached data
     * Returns: { transactions, accounts, categories, bills, lastSyncTime, isStale }
     */
    async getAllData() {
        try {
            const [transactions, accounts, categories, bills, billPayments, lastSyncTime] = await Promise.all([
                this.getAll(STORES.transactions),
                this.getAll(STORES.accounts),
                this.getAll(STORES.categories),
                this.getAll(STORES.bills),
                this.getAll(STORES.billPayments),
                this.getMeta('lastSyncTime')
            ]);

            const isStale = !lastSyncTime || (Date.now() - new Date(lastSyncTime).getTime() > CACHE_TTL_MS);

            return {
                transactions,
                accounts,
                categories,
                bills,
                billPayments,
                lastSyncTime,
                isStale,
                hasData: transactions.length > 0 || accounts.length > 0 || billPayments.length > 0
            };
        } catch (e) {
            console.error('[LAKSH DB] getAllData failed:', e);
            return { transactions: [], accounts: [], categories: [], bills: [], billPayments: [], lastSyncTime: null, isStale: true, hasData: false };
        }
    }

    /**
     * Save all data after sync
     */
    async saveData({ transactions, accounts, categories, bills, billPayments }) {
        try {
            await Promise.all([
                this.putAll(STORES.transactions, transactions || []),
                this.putAll(STORES.accounts, accounts || []),
                this.putAll(STORES.categories, categories || []),
                this.putAll(STORES.bills, bills || []),
                this.putAll(STORES.billPayments, billPayments || []),
                this.setMeta('lastSyncTime', new Date().toISOString())
            ]);
            console.log('[LAKSH DB] Data cached successfully');
            return true;
        } catch (e) {
            console.error('[LAKSH DB] saveData failed:', e);
            return false;
        }
    }

    /**
     * Clear all cached data (for logout/reset)
     */
    async clearAll() {
        try {
            await Promise.all([
                this.clear(STORES.transactions),
                this.clear(STORES.accounts),
                this.clear(STORES.categories),
                this.clear(STORES.bills),
                this.clear(STORES.billPayments),
                this.clear(STORES.meta)
            ]);
            console.log('[LAKSH DB] Cache cleared');
            return true;
        } catch (e) {
            console.error('[LAKSH DB] clearAll failed:', e);
            return false;
        }
    }

    /**
     * Get last sync time
     */
    async getLastSyncTime() {
        return this.getMeta('lastSyncTime');
    }

    /**
     * Check if we have valid cached data
     */
    async hasCachedData() {
        const transactions = await this.getAll(STORES.transactions);
        return transactions.length > 0;
    }
}

export const localDB = new LocalDB();
