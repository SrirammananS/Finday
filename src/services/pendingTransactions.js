/**
 * Pending Transactions Service
 * Stores SMS-detected transactions waiting for user approval
 * Integrates with Android native app via AndroidBridge
 */

const PENDING_KEY = 'laksh_pending_transactions';

class PendingTransactionsService {
    constructor() {
        this.pending = [];
        this.listeners = [];
        this.isAndroid = typeof window !== 'undefined' && window.AndroidBridge?.isAndroidApp?.();
        this.load();
        this.setupAndroidListener();
    }

    // Listen for Android app injections
    setupAndroidListener() {
        if (typeof window !== 'undefined') {
            window.addEventListener('laksh-transactions-updated', () => {
                this.load();
                this.notifyListeners();
            });
        }
    }

    load() {
        try {
            const stored = localStorage.getItem(PENDING_KEY);
            this.pending = stored ? JSON.parse(stored) : [];
        } catch (e) {
            this.pending = [];
        }
    }

    save() {
        localStorage.setItem(PENDING_KEY, JSON.stringify(this.pending));
        this.notifyListeners();
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notifyListeners() {
        this.listeners.forEach(l => l(this.pending));
    }

    getAll() {
        return [...this.pending];
    }

    getCount() {
        return this.pending.length;
    }

    add(transaction) {
        const pending = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            ...transaction,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        this.pending.unshift(pending);
        this.save();
        return pending;
    }

    remove(id) {
        this.pending = this.pending.filter(p => p.id !== id);
        this.save();
        // Sync with Android native store
        if (this.isAndroid && window.AndroidBridge?.removePendingTransaction) {
            try {
                window.AndroidBridge.removePendingTransaction(id);
            } catch (e) {
                console.warn('[PWA] Failed to sync remove with Android:', e);
            }
        }
    }

    clear() {
        this.pending = [];
        this.save();
        // Sync with Android native store
        if (this.isAndroid && window.AndroidBridge?.clearPendingTransactions) {
            try {
                window.AndroidBridge.clearPendingTransactions();
            } catch (e) {
                console.warn('[PWA] Failed to sync clear with Android:', e);
            }
        }
    }

    // Check if similar transaction already exists
    isDuplicate(amount, date) {
        return this.pending.some(p => 
            Math.abs(p.amount) === Math.abs(amount) && 
            p.date === date
        );
    }
}

export const pendingTransactionsService = new PendingTransactionsService();
export default pendingTransactionsService;
