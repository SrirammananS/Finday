/**
 * Transaction Detector Service
 * Detects transactions from SMS, notifications, and clipboard
 * Uses pattern matching to extract amount, merchant, and type
 */

import { storage, STORAGE_KEYS } from './storage';
import { parseSMS } from './smsParser';
import { smartAI } from './smartAI';

// Common bank SMS patterns (Indian banks)
const SMS_PATTERNS = [
    // Debit patterns
    {
        regex: /(?:debited|spent|paid|withdrawn|purchase|txn|transaction).{0,30}(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{2})?)/i,
        type: 'expense',
        extract: (match, text) => ({
            amount: parseFloat(match[1].replace(/,/g, '')),
            merchant: extractMerchant(text),
        })
    },
    {
        regex: /(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{2})?).{0,30}(?:debited|spent|paid|withdrawn|deducted)/i,
        type: 'expense',
        extract: (match, text) => ({
            amount: parseFloat(match[1].replace(/,/g, '')),
            merchant: extractMerchant(text),
        })
    },
    // Credit patterns
    {
        regex: /(?:credited|received|deposited|refund).{0,30}(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{2})?)/i,
        type: 'income',
        extract: (match, text) => ({
            amount: parseFloat(match[1].replace(/,/g, '')),
            merchant: extractMerchant(text),
        })
    },
    {
        regex: /(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{2})?).{0,30}(?:credited|received|deposited)/i,
        type: 'income',
        extract: (match, text) => ({
            amount: parseFloat(match[1].replace(/,/g, '')),
            merchant: extractMerchant(text),
        })
    },
    // UPI patterns
    {
        regex: /(?:upi|gpay|phonepe|paytm).{0,50}(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{2})?)/i,
        type: 'expense',
        extract: (match, text) => ({
            amount: parseFloat(match[1].replace(/,/g, '')),
            merchant: extractUPIMerchant(text),
        })
    },
];

// Extract merchant name from SMS
function extractMerchant(text) {
    // Common patterns for merchant extraction
    const patterns = [
        /(?:at|to|from|@)\s+([A-Za-z0-9\s&'-]+?)(?:\s+on|\s+ref|\s+upi|\.|\s*$)/i,
        /(?:info|VPA):\s*([A-Za-z0-9@.-]+)/i,
        /(?:merchant|payee):\s*([A-Za-z0-9\s&'-]+)/i,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            return match[1].trim().substring(0, 50);
        }
    }

    return null;
}

// Extract UPI merchant
function extractUPIMerchant(text) {
    const upiMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z]+)/);
    if (upiMatch) {
        const upiId = upiMatch[1];
        // Extract name from UPI ID
        const name = upiId.split('@')[0].replace(/[._-]/g, ' ');
        return name.charAt(0).toUpperCase() + name.slice(1);
    }
    return extractMerchant(text);
}

// Storage key for pending transactions
const PENDING_KEY = 'laksh_pending_transactions';

class TransactionDetectorService {
    constructor() {
        this.pendingTransactions = [];
        this.listeners = [];
        this.loadPending();
    }

    // Load pending transactions from storage
    loadPending() {
        try {
            const stored = localStorage.getItem(PENDING_KEY);
            this.pendingTransactions = stored ? JSON.parse(stored) : [];
        } catch (e) {
            this.pendingTransactions = [];
        }
    }

    // Save pending transactions
    savePending() {
        localStorage.setItem(PENDING_KEY, JSON.stringify(this.pendingTransactions));
    }

    // Subscribe to new detections
    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    // Notify listeners
    notify(transaction) {
        this.listeners.forEach(cb => cb(transaction));
    }

    /**
     * Detect transaction from text (SMS, notification, or manual input)
     * @param {string} text - The text to analyze
     * @param {string} source - Source of the text ('sms', 'notification', 'clipboard', 'manual')
     * @returns {object|null} Detected transaction or null
     */
    detectFromText(text, source = 'manual') {
        if (!text || text.length < 10) return null;

        // Use the unified parser which supports Custom Rules, Banks, etc.
        const parsed = parseSMS(text);

        if (parsed && parsed.amount) {
            // Create transaction object matching the app's structure
            // Use fallback ID generation for Android WebView compatibility
            const generateId = () => {
                if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
                    return crypto.randomUUID();
                }
                return Date.now().toString(36) + Math.random().toString(36).substring(2);
            };

            const transaction = {
                id: generateId(),
                amount: parsed.amount,
                type: parsed.type || 'expense',
                description: parsed.description || parsed.merchant || 'Unknown',
                rawText: text.substring(0, 200),
                source,
                detectedAt: new Date().toISOString(),
                status: 'pending',
                category: parsed.category && parsed.category !== 'Other' ? parsed.category : smartAI.predictCategory(parsed.description || parsed.merchant, parsed.amount).category,
                accountId: parsed.accountId || null,
                bankName: parsed.bankName || null
            };

            // Double check with enrichTransaction (though parseSMS already does custom rules, doesn't hurt)
            // parseSMS already includes custom rule logic, so parsed result is already enriched.
            return transaction;
        }

        return null;
    }

    /**
     * Suggest category based on merchant name
     */
    suggestCategory(merchant, type) {
        if (!merchant) return type === 'income' ? 'Salary' : 'Other';

        const merchantLower = merchant.toLowerCase();

        const categoryMap = {
            // Food & Dining
            'swiggy|zomato|food|restaurant|cafe|pizza|burger|dominos|mcdonalds|kfc|starbucks': 'Food & Dining',
            // Shopping
            'amazon|flipkart|myntra|ajio|shop|store|mart|mall': 'Shopping',
            // Transport
            'uber|ola|rapido|metro|petrol|fuel|parking': 'Transport',
            // Bills & Utilities
            'electricity|water|gas|broadband|wifi|jio|airtel|vi|bsnl|bill': 'Bills & Utilities',
            // Entertainment
            'netflix|prime|hotstar|spotify|movie|cinema|pvr|inox': 'Entertainment',
            // Health
            'pharmacy|medical|hospital|doctor|apollo|medplus': 'Health',
            // Groceries
            'bigbasket|grofers|blinkit|dmart|grocery|supermarket': 'Groceries',
        };

        const prediction = smartAI.predictCategory(merchant, 0);
        if (prediction.confidence > 0.5) return prediction.category;

        return type === 'income' ? 'Salary' : 'Other';
    }

    /**
     * Add a detected transaction to pending list
     */
    addPending(transaction) {
        // Check for duplicates (same amount/desc within 24 hours OR same rawText)
        const isDuplicate = this.pendingTransactions.some(t => {
            const sameRaw = t.rawText && transaction.rawText && t.rawText === transaction.rawText;
            const sameLogic = t.amount === transaction.amount &&
                t.description === transaction.description &&
                Math.abs(new Date(t.detectedAt) - new Date(transaction.detectedAt)) < 24 * 60 * 60 * 1000;
            return sameRaw || sameLogic;
        });

        if (!isDuplicate) {
            this.pendingTransactions.unshift(transaction);
            this.savePending();
            this.notify(transaction);
            return true;
        }
        return false;
    }

    /**
     * Get all pending transactions
     */
    getPending() {
        return this.pendingTransactions.filter(t => t.status === 'pending');
    }

    /**
     * Confirm a pending transaction (mark as added)
     */
    confirmTransaction(id) {
        const transaction = this.pendingTransactions.find(t => t.id === id);
        if (transaction) {
            transaction.status = 'confirmed';
            this.savePending();
        }
        return transaction;
    }

    /**
     * Dismiss a pending transaction
     */
    dismissTransaction(id) {
        const transaction = this.pendingTransactions.find(t => t.id === id);
        if (transaction) {
            transaction.status = 'dismissed';
            this.savePending();
        }
    }

    /**
     * Clear all pending transactions
     */
    clearPending() {
        this.pendingTransactions = [];
        this.savePending();
    }

    /**
     * Process text from clipboard
     */
    async processClipboard() {
        try {
            const text = await navigator.clipboard.readText();
            const detected = this.detectFromText(text, 'clipboard');
            if (detected) {
                this.addPending(detected);
                return detected;
            }
        } catch (e) {
            console.log('[TransactionDetector] Clipboard access denied');
        }
        return null;
    }

    /**
     * Manual text input processing
     */
    processManualInput(text) {
        const detected = this.detectFromText(text, 'manual');
        if (detected) {
            this.addPending(detected);
            return detected;
        }
        return null;
    }
}

export const transactionDetector = new TransactionDetectorService();
export default transactionDetector;
