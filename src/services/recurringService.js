/**
 * Recurring Transactions Service
 * Automatically creates transactions based on recurring schedules
 */

import { storage, STORAGE_KEYS } from './storage';

// Frequency options
export const FREQUENCIES = {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    BIWEEKLY: 'biweekly',
    MONTHLY: 'monthly',
    YEARLY: 'yearly'
};

class RecurringService {
    constructor() {
        this.recurring = [];
        this.loadFromStorage();
    }

    loadFromStorage() {
        try {
            const stored = storage.getJSON(STORAGE_KEYS.RECURRING_DATA);
            this.recurring = stored || [];
        } catch (e) {
            console.error('[LAKSH Recurring] Failed to load:', e);
            this.recurring = [];
        }
    }

    saveToStorage() {
        try {
            storage.setJSON(STORAGE_KEYS.RECURRING_DATA, this.recurring);
        } catch (e) {
            console.error('[LAKSH Recurring] Failed to save:', e);
        }
    }

    /**
     * Add a new recurring transaction template
     */
    add(template) {
        const recurring = {
            id: crypto.randomUUID(),
            description: template.description,
            amount: template.amount,
            type: template.type,
            category: template.category,
            accountId: template.accountId,
            frequency: template.frequency || FREQUENCIES.MONTHLY,
            dayOfMonth: template.dayOfMonth || 1, // For monthly
            dayOfWeek: template.dayOfWeek || 0,   // For weekly (0 = Sunday)
            nextRun: template.nextRun || this.calculateNextRun(template),
            enabled: true,
            createdAt: new Date().toISOString()
        };

        this.recurring.push(recurring);
        this.saveToStorage();
        return recurring;
    }

    /**
     * Remove a recurring transaction
     */
    remove(id) {
        this.recurring = this.recurring.filter(r => r.id !== id);
        this.saveToStorage();
    }

    /**
     * Toggle enabled state
     */
    toggle(id) {
        const item = this.recurring.find(r => r.id === id);
        if (item) {
            item.enabled = !item.enabled;
            this.saveToStorage();
        }
    }

    /**
     * Get all recurring transactions
     */
    getAll() {
        return this.recurring;
    }

    /**
     * Calculate next run date based on frequency
     */
    calculateNextRun(template) {
        const now = new Date();
        const next = new Date(now);

        switch (template.frequency) {
            case FREQUENCIES.DAILY:
                next.setDate(next.getDate() + 1);
                break;
            case FREQUENCIES.WEEKLY:
                const daysUntil = (template.dayOfWeek - now.getDay() + 7) % 7 || 7;
                next.setDate(next.getDate() + daysUntil);
                break;
            case FREQUENCIES.BIWEEKLY:
                next.setDate(next.getDate() + 14);
                break;
            case FREQUENCIES.MONTHLY:
                next.setMonth(next.getMonth() + 1);
                next.setDate(template.dayOfMonth || 1);
                break;
            case FREQUENCIES.YEARLY:
                next.setFullYear(next.getFullYear() + 1);
                break;
            default:
                next.setMonth(next.getMonth() + 1);
        }

        return next.toISOString().split('T')[0];
    }

    /**
     * Check and create due recurring transactions
     * Returns array of transactions to be created
     */
    checkDue() {
        const lastRun = storage.get(STORAGE_KEYS.RECURRING_LAST_RUN);
        const today = new Date().toISOString().split('T')[0];

        // Only run once per day
        if (lastRun === today) {
            return [];
        }

        const dueTransactions = [];

        for (const recurring of this.recurring) {
            if (!recurring.enabled) continue;

            const nextRun = new Date(recurring.nextRun);
            const now = new Date();

            if (nextRun <= now) {
                // Create transaction
                dueTransactions.push({
                    description: recurring.description,
                    amount: recurring.amount,
                    type: recurring.type,
                    category: recurring.category,
                    accountId: recurring.accountId,
                    date: today,
                    isRecurring: true,
                    recurringId: recurring.id
                });

                // Update next run
                recurring.nextRun = this.calculateNextRun(recurring);
            }
        }

        // Save updates
        if (dueTransactions.length > 0) {
            this.saveToStorage();
        }

        storage.set(STORAGE_KEYS.RECURRING_LAST_RUN, today);
        return dueTransactions;
    }
}

export const recurringService = new RecurringService();
