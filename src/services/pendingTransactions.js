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
        // Check for duplicates before adding
        if (this.hasRawText(transaction.rawText)) {
            console.log('[PendingTransactions] Skipping duplicate (rawText match):', transaction.description);
            return null;
        }

        if (this.isDuplicate(transaction.amount, transaction.date, transaction.description)) {
            console.log('[PendingTransactions] Skipping duplicate (amount/date match):', transaction.description);
            return null;
        }

        const pending = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            ...transaction,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        this.pending.unshift(pending);
        this.save();
        console.log('[PendingTransactions] Added new transaction:', transaction.description);
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

    // Generate a simple hash from transaction details for deduplication
    generateHash(transaction) {
        const key = `${Math.abs(transaction.amount || 0)}_${transaction.description || ''}_${transaction.date || ''}`;
        return key.toLowerCase().replace(/\s+/g, '');
    }

    // Check if similar transaction already exists
    isDuplicate(amount, date, description = '') {
        const now = Date.now();
        const TWO_HOURS = 2 * 60 * 60 * 1000; // 2 hours window

        return this.pending.some(p => {
            // Check time proximity first (within 2 hours)
            const createdAt = new Date(p.createdAt).getTime();
            if (now - createdAt > TWO_HOURS) return false;

            // Same amount is required
            if (Math.abs(p.amount) !== Math.abs(amount)) return false;

            // Same date or no date
            if (date && p.date && p.date !== date) return false;

            // If description matches closely, it's a duplicate
            if (description && p.description) {
                const desc1 = description.toLowerCase().replace(/\s+/g, '');
                const desc2 = p.description.toLowerCase().replace(/\s+/g, '');
                if (desc1 === desc2 || desc1.includes(desc2) || desc2.includes(desc1)) {
                    return true;
                }
            }

            // Just amount + date match within time window is enough
            return true;
        });
    }

    // Check if raw SMS text already exists
    hasRawText(rawText) {
        if (!rawText) return false;
        const normalized = rawText.toLowerCase().replace(/\s+/g, ' ').trim();
        return this.pending.some(p => {
            if (!p.rawText) return false;
            const existing = p.rawText.toLowerCase().replace(/\s+/g, ' ').trim();
            return existing === normalized || existing.includes(normalized) || normalized.includes(existing);
        });
    }
}

export const pendingTransactionsService = new PendingTransactionsService();
export default pendingTransactionsService;
