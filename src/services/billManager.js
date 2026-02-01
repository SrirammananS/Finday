/**
 * Bill Manager Service
 * Manages recurring bills, due dates, and reminders
 */

const BILLS_KEY = 'laksh_bills';
const BILL_HISTORY_KEY = 'laksh_bill_history';

class BillManagerService {
    constructor() {
        this.bills = [];
        this.listeners = [];
        this.load();
    }

    // ============== CORE OPERATIONS ==============

    load() {
        try {
            const data = localStorage.getItem(BILLS_KEY);
            this.bills = data ? JSON.parse(data) : [];
        } catch {
            this.bills = [];
        }
    }

    save() {
        localStorage.setItem(BILLS_KEY, JSON.stringify(this.bills));
        this.notifyListeners();
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notifyListeners() {
        this.listeners.forEach(l => l(this.bills));
    }

    // ============== BILL CRUD ==============

    addBill(bill) {
        const newBill = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            name: bill.name,
            amount: bill.amount,
            category: bill.category || 'Utilities/Bills',
            cycle: bill.cycle || 'monthly', // weekly, monthly, quarterly, yearly
            dueDay: bill.dueDay || new Date().getDate(),
            dueDate: bill.dueDate || this.calculateNextDue(bill.cycle, bill.dueDay),
            reminder: bill.reminder !== false, // Default true
            reminderDays: bill.reminderDays || 3, // Days before due date
            autoPay: bill.autoPay || false,
            accountId: bill.accountId || '',
            notes: bill.notes || '',
            status: 'active',
            createdAt: new Date().toISOString(),
            lastPaidDate: null,
            lastPaidAmount: null,
            paymentHistory: []
        };

        this.bills.unshift(newBill);
        this.save();
        return newBill;
    }

    updateBill(id, updates) {
        const index = this.bills.findIndex(b => b.id === id);
        if (index >= 0) {
            this.bills[index] = { ...this.bills[index], ...updates };
            this.save();
            return this.bills[index];
        }
        return null;
    }

    deleteBill(id) {
        this.bills = this.bills.filter(b => b.id !== id);
        this.save();
    }

    getBill(id) {
        return this.bills.find(b => b.id === id);
    }

    getAllBills() {
        return [...this.bills];
    }

    getActiveBills() {
        return this.bills.filter(b => b.status === 'active');
    }

    // ============== BILL PAYMENT ==============

    markAsPaid(billId, paymentDetails = {}) {
        const bill = this.getBill(billId);
        if (!bill) return null;

        const payment = {
            date: paymentDetails.date || new Date().toISOString().split('T')[0],
            amount: paymentDetails.amount || bill.amount,
            transactionId: paymentDetails.transactionId || null,
            notes: paymentDetails.notes || ''
        };

        // Update bill
        bill.lastPaidDate = payment.date;
        bill.lastPaidAmount = payment.amount;
        bill.paymentHistory.unshift(payment);
        
        // Calculate next due date
        bill.dueDate = this.calculateNextDue(bill.cycle, bill.dueDay, payment.date);

        this.save();
        return bill;
    }

    skipPayment(billId, reason = '') {
        const bill = this.getBill(billId);
        if (!bill) return null;

        bill.paymentHistory.unshift({
            date: new Date().toISOString().split('T')[0],
            amount: 0,
            skipped: true,
            reason
        });

        // Move to next cycle
        bill.dueDate = this.calculateNextDue(bill.cycle, bill.dueDay);

        this.save();
        return bill;
    }

    // ============== DUE DATE CALCULATIONS ==============

    calculateNextDue(cycle, dueDay, fromDate = null) {
        const date = fromDate ? new Date(fromDate) : new Date();
        
        switch (cycle) {
            case 'weekly':
                date.setDate(date.getDate() + 7);
                break;
            case 'monthly':
                date.setMonth(date.getMonth() + 1);
                if (dueDay) {
                    const maxDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
                    date.setDate(Math.min(dueDay, maxDay));
                }
                break;
            case 'quarterly':
                date.setMonth(date.getMonth() + 3);
                if (dueDay) {
                    const maxDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
                    date.setDate(Math.min(dueDay, maxDay));
                }
                break;
            case 'yearly':
                date.setFullYear(date.getFullYear() + 1);
                break;
            default:
                date.setMonth(date.getMonth() + 1);
        }

        return date.toISOString().split('T')[0];
    }

    // ============== REMINDERS & ALERTS ==============

    getUpcomingBills(days = 7) {
        const today = new Date();
        const cutoff = new Date();
        cutoff.setDate(today.getDate() + days);

        return this.getActiveBills()
            .filter(bill => {
                const dueDate = new Date(bill.dueDate);
                return dueDate >= today && dueDate <= cutoff;
            })
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    }

    getOverdueBills() {
        const today = new Date().toISOString().split('T')[0];
        return this.getActiveBills()
            .filter(bill => bill.dueDate < today)
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    }

    getDueTodayBills() {
        const today = new Date().toISOString().split('T')[0];
        return this.getActiveBills().filter(bill => bill.dueDate === today);
    }

    getBillsNeedingReminder() {
        const today = new Date();
        return this.getActiveBills().filter(bill => {
            if (!bill.reminder) return false;
            const dueDate = new Date(bill.dueDate);
            const reminderDate = new Date(dueDate);
            reminderDate.setDate(reminderDate.getDate() - bill.reminderDays);
            return today >= reminderDate && today <= dueDate;
        });
    }

    // ============== STATISTICS ==============

    getMonthlyBillsTotal() {
        return this.getActiveBills()
            .filter(b => b.cycle === 'monthly')
            .reduce((sum, b) => sum + (b.amount || 0), 0);
    }

    getYearlyBillsTotal() {
        return this.getActiveBills().reduce((sum, bill) => {
            switch (bill.cycle) {
                case 'weekly': return sum + (bill.amount * 52);
                case 'monthly': return sum + (bill.amount * 12);
                case 'quarterly': return sum + (bill.amount * 4);
                case 'yearly': return sum + bill.amount;
                default: return sum + (bill.amount * 12);
            }
        }, 0);
    }

    getBillsByCategory() {
        const byCategory = {};
        this.getActiveBills().forEach(bill => {
            const cat = bill.category || 'Other';
            if (!byCategory[cat]) byCategory[cat] = { bills: [], total: 0 };
            byCategory[cat].bills.push(bill);
            byCategory[cat].total += bill.amount || 0;
        });
        return byCategory;
    }

    // ============== AUTO-DETECT FROM TRANSACTIONS ==============

    detectBillsFromTransactions(transactions, smartAI) {
        const detected = [];
        const processedDescriptions = new Set();

        // Group transactions by similar description
        const grouped = {};
        transactions.forEach(t => {
            if (t.amount >= 0) return; // Only expenses
            const desc = (t.description || '').toLowerCase().trim();
            if (!desc || processedDescriptions.has(desc)) return;
            
            if (!grouped[desc]) grouped[desc] = [];
            grouped[desc].push(t);
        });

        // Find recurring patterns
        for (const [desc, txns] of Object.entries(grouped)) {
            if (txns.length < 2) continue;

            // Sort by date
            txns.sort((a, b) => new Date(a.date) - new Date(b.date));

            // Check for consistent amounts
            const amounts = txns.map(t => Math.abs(t.amount));
            const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
            const isConsistentAmount = amounts.every(a => Math.abs(a - avgAmount) / avgAmount < 0.15);

            if (!isConsistentAmount) continue;

            // Check for consistent intervals
            const intervals = [];
            for (let i = 1; i < txns.length; i++) {
                const days = Math.round(
                    (new Date(txns[i].date) - new Date(txns[i-1].date)) / (1000 * 60 * 60 * 24)
                );
                intervals.push(days);
            }

            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            let cycle = null;

            if (avgInterval >= 6 && avgInterval <= 8) cycle = 'weekly';
            else if (avgInterval >= 25 && avgInterval <= 35) cycle = 'monthly';
            else if (avgInterval >= 85 && avgInterval <= 95) cycle = 'quarterly';
            else if (avgInterval >= 355 && avgInterval <= 375) cycle = 'yearly';

            if (!cycle) continue;

            // Check if already exists
            const exists = this.bills.some(b => 
                b.name.toLowerCase() === desc || 
                (b.amount === avgAmount && b.cycle === cycle)
            );

            if (exists) continue;

            // Use smartAI for better categorization
            let category = txns[0].category || 'Utilities/Bills';
            if (smartAI) {
                const prediction = smartAI.predictCategory(desc, avgAmount);
                if (prediction.confidence > 0.5) {
                    category = prediction.category;
                }
            }

            // Calculate typical due day
            const dueDays = txns.map(t => new Date(t.date).getDate());
            const avgDueDay = Math.round(dueDays.reduce((a, b) => a + b, 0) / dueDays.length);

            detected.push({
                name: desc.charAt(0).toUpperCase() + desc.slice(1),
                amount: Math.round(avgAmount),
                category,
                cycle,
                dueDay: avgDueDay,
                confidence: isConsistentAmount ? 0.8 : 0.6,
                basedOnTransactions: txns.length
            });

            processedDescriptions.add(desc);
        }

        return detected;
    }

    // ============== IMPORT DETECTED BILLS ==============

    importDetectedBill(detected) {
        return this.addBill({
            name: detected.name,
            amount: detected.amount,
            category: detected.category,
            cycle: detected.cycle,
            dueDay: detected.dueDay,
            reminder: true,
            reminderDays: 3
        });
    }
}

export const billManager = new BillManagerService();
export default billManager;
