import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, Bell, CheckCircle, AlertCircle, Plus, ChevronRight,
    Clock, CreditCard, Repeat, Trash2, Edit, X, Zap, TrendingUp
} from 'lucide-react';
import { billManager } from '../services/billManager';
import { smartAI } from '../services/smartAI';

const CYCLES = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' }
];

const CATEGORIES = [
    'Utilities/Bills', 'Rent', 'Insurance', 'Subscription',
    'Entertainment', 'Health', 'Education', 'Transport/Petrol', 'Other'
];

export default function BillManager({ transactions = [], onAddTransaction }) {
    const [bills, setBills] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDetected, setShowDetected] = useState(false);
    const [editingBill, setEditingBill] = useState(null);
    const [detectedBills, setDetectedBills] = useState([]);
    const [activeTab, setActiveTab] = useState('upcoming');

    useEffect(() => {
        setBills(billManager.getAllBills());
        const unsub = billManager.subscribe(setBills);
        return unsub;
    }, []);

    // Detect bills from transactions
    useEffect(() => {
        if (transactions.length > 0) {
            const detected = billManager.detectBillsFromTransactions(transactions, smartAI);
            setDetectedBills(detected);
        }
    }, [transactions]);

    const upcomingBills = useMemo(() => billManager.getUpcomingBills(14), [bills]);
    const overdueBills = useMemo(() => billManager.getOverdueBills(), [bills]);
    const dueTodayBills = useMemo(() => billManager.getDueTodayBills(), [bills]);
    const monthlyTotal = useMemo(() => billManager.getMonthlyBillsTotal(), [bills]);

    const handleAddBill = (billData) => {
        if (editingBill) {
            billManager.updateBill(editingBill.id, billData);
        } else {
            billManager.addBill(billData);
        }
        setShowAddModal(false);
        setEditingBill(null);
    };

    const handleMarkPaid = (bill) => {
        billManager.markAsPaid(bill.id);
        if (onAddTransaction) {
            onAddTransaction({
                date: new Date().toISOString().split('T')[0],
                description: bill.name,
                amount: -Math.abs(bill.amount),
                category: bill.category,
                type: 'expense'
            });
        }
    };

    const handleImportDetected = (detected) => {
        billManager.importDetectedBill(detected);
        setDetectedBills(prev => prev.filter(d => d.name !== detected.name));
    };

    const getDaysUntilDue = (dueDate) => {
        const today = new Date();
        const due = new Date(dueDate);
        const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
        return diff;
    };

    const getDueStatus = (dueDate) => {
        const days = getDaysUntilDue(dueDate);
        if (days < 0) return { color: 'text-red-400', bg: 'bg-red-500/20', label: 'Overdue' };
        if (days === 0) return { color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'Due Today' };
        if (days <= 3) return { color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: `${days}d left` };
        return { color: 'text-slate-400', bg: 'bg-slate-500/20', label: `${days}d left` };
    };

    return (
        <div className="space-y-4">
            {/* Header Stats */}
            <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-xl p-3 border border-primary/30 flex items-center justify-between">
                    <p className="text-xs text-text-muted">Monthly Bills</p>
                    <p className="text-xl font-bold text-text-main">₹{monthlyTotal.toLocaleString()}</p>
                </div>
                <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl p-3 border border-orange-500/30">
                    <p className="text-xs text-text-muted">Due Soon</p>
                    <p className="text-lg font-bold text-text-main">{upcomingBills.length}</p>
                </div>
                <div className={`rounded-xl p-3 border ${overdueBills.length > 0 ? 'bg-red-500/20 border-red-500/30' : 'bg-green-500/20 border-green-500/30'}`}>
                    <p className="text-xs text-text-muted">Overdue</p>
                    <p className="text-lg font-bold text-text-main">{overdueBills.length}</p>
                </div>
            </div>

            {/* AI Detected Bills */}
            {detectedBills.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-purple-500/20 to-primary/20 rounded-xl p-4 border border-purple-500/30"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-purple-400" />
                            <span className="font-medium text-text-main">AI Detected {detectedBills.length} Recurring Bills</span>
                        </div>
                        <button
                            onClick={() => setShowDetected(!showDetected)}
                            className="text-purple-400 text-sm"
                        >
                            {showDetected ? 'Hide' : 'Review'}
                        </button>
                    </div>

                    <AnimatePresence>
                        {showDetected && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="space-y-2 overflow-hidden"
                            >
                                {detectedBills.map((detected, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-card rounded-lg p-3 border border-card-border">
                                        <div>
                                            <p className="text-text-main font-medium">{detected.name}</p>
                                            <p className="text-sm text-text-muted">
                                                ₹{detected.amount} • {detected.cycle} • {detected.category}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleImportDetected(detected)}
                                            className="px-3 py-1 bg-purple-500 text-white rounded-lg text-sm"
                                        >
                                            Add
                                        </button>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 bg-card rounded-xl p-1 border border-card-border">
                {[
                    { id: 'upcoming', label: 'Upcoming', count: upcomingBills.length },
                    { id: 'all', label: 'All Bills', count: bills.length },
                    { id: 'overdue', label: 'Overdue', count: overdueBills.length }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id
                            ? 'bg-primary text-primary-foreground'
                            : 'text-text-muted hover:text-text-main'
                            }`}
                    >
                        {tab.label} {tab.count > 0 && `(${tab.count})`}
                    </button>
                ))}
            </div>

            {/* Bills List */}
            <div className="space-y-3">
                {activeTab === 'upcoming' && upcomingBills.map(bill => (
                    <BillCard
                        key={bill.id}
                        bill={bill}
                        onPay={handleMarkPaid}
                        onEdit={() => { setEditingBill(bill); setShowAddModal(true); }}
                        onDelete={() => billManager.deleteBill(bill.id)}
                    />
                ))}

                {activeTab === 'all' && bills.map(bill => (
                    <BillCard
                        key={bill.id}
                        bill={bill}
                        onPay={handleMarkPaid}
                        onEdit={() => { setEditingBill(bill); setShowAddModal(true); }}
                        onDelete={() => billManager.deleteBill(bill.id)}
                    />
                ))}

                {activeTab === 'overdue' && overdueBills.map(bill => (
                    <BillCard
                        key={bill.id}
                        bill={bill}
                        onPay={handleMarkPaid}
                        onEdit={() => { setEditingBill(bill); setShowAddModal(true); }}
                        onDelete={() => billManager.deleteBill(bill.id)}
                        isOverdue
                    />
                ))}

                {((activeTab === 'upcoming' && upcomingBills.length === 0) ||
                    (activeTab === 'all' && bills.length === 0) ||
                    (activeTab === 'overdue' && overdueBills.length === 0)) && (
                        <div className="text-center py-8 text-text-muted">
                            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No bills to show</p>
                        </div>
                    )}
            </div>

            {/* Add Button */}
            <button
                onClick={() => { setEditingBill(null); setShowAddModal(true); }}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium flex items-center justify-center gap-2"
            >
                <Plus className="w-5 h-5" />
                Add New Bill
            </button>

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <BillFormModal
                        bill={editingBill}
                        onSave={handleAddBill}
                        onClose={() => { setShowAddModal(false); setEditingBill(null); }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function BillCard({ bill, onPay, onEdit, onDelete, isOverdue }) {
    const getDaysUntilDue = (dueDate) => {
        const today = new Date();
        const due = new Date(dueDate);
        return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    };

    const days = getDaysUntilDue(bill.dueDate);
    const status = days < 0 ? 'overdue' : days === 0 ? 'today' : days <= 3 ? 'soon' : 'normal';

    const statusColors = {
        overdue: 'border-red-500/50 bg-red-500/10',
        today: 'border-orange-500/50 bg-orange-500/10',
        soon: 'border-yellow-500/50 bg-yellow-500/10',
        normal: 'border-card-border bg-card'
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl p-4 border ${statusColors[status]}`}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className="font-medium text-text-main">{bill.name}</h3>
                        {bill.autoPay && (
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                                Auto-pay
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-text-muted mt-1">
                        {bill.category} • {bill.cycle}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                        <span className="text-lg font-bold text-text-main">₹{bill.amount?.toLocaleString()}</span>
                        <span className={`text-sm ${status === 'overdue' ? 'text-red-400' :
                            status === 'today' ? 'text-orange-400' :
                                status === 'soon' ? 'text-yellow-400' : 'text-text-muted'
                            }`}>
                            {status === 'overdue' ? `${Math.abs(days)} days overdue` :
                                status === 'today' ? 'Due today' :
                                    `Due in ${days} days`}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <button
                        onClick={() => onPay(bill)}
                        className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium flex items-center gap-1"
                    >
                        <CheckCircle className="w-4 h-4" />
                        Paid
                    </button>
                    <div className="flex gap-1">
                        <button
                            onClick={onEdit}
                            className="p-1.5 bg-canvas-subtle border border-card-border text-text-muted hover:text-text-main rounded-lg transition-colors"
                        >
                            <Edit className="w-4 h-4" />
                        </button>
                        <button
                            onClick={onDelete}
                            className="p-1.5 bg-canvas-subtle border border-card-border text-red-500 rounded-lg hover:bg-red-500/10 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function BillFormModal({ bill, onSave, onClose }) {
    const [form, setForm] = useState({
        name: bill?.name || '',
        amount: bill?.amount || '',
        category: bill?.category || 'Utilities/Bills',
        cycle: bill?.cycle || 'monthly',
        dueDay: bill?.dueDay || new Date().getDate(),
        reminder: bill?.reminder !== false,
        reminderDays: bill?.reminderDays || 3,
        autoPay: bill?.autoPay || false,
        notes: bill?.notes || ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.name || !form.amount) return;
        onSave({
            ...form,
            amount: parseFloat(form.amount)
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                exit={{ y: 100 }}
                className="bg-card border border-card-border rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="sticky top-0 bg-card p-4 border-b border-card-border flex items-center justify-between">
                    <h2 className="text-lg font-bold text-text-main">
                        {bill ? 'Edit Bill' : 'Add New Bill'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-text-muted hover:text-text-main">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm text-text-muted mb-1">Bill Name</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            placeholder="e.g., Netflix, Electricity"
                            className="w-full px-4 py-3 bg-canvas-subtle border border-card-border rounded-xl text-text-main focus:border-primary outline-none"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm text-text-muted mb-1">Amount (₹)</label>
                            <input
                                type="number"
                                value={form.amount}
                                onChange={e => setForm({ ...form, amount: e.target.value })}
                                placeholder="0"
                                className="w-full px-4 py-3 bg-canvas-subtle border border-card-border rounded-xl text-text-main focus:border-primary outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-text-muted mb-1">Due Day</label>
                            <input
                                type="number"
                                min="1"
                                max="31"
                                value={form.dueDay}
                                onChange={e => setForm({ ...form, dueDay: parseInt(e.target.value) })}
                                className="w-full px-4 py-3 bg-canvas-subtle border border-card-border rounded-xl text-text-main focus:border-primary outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm text-text-muted mb-1">Category</label>
                            <select
                                value={form.category}
                                onChange={e => setForm({ ...form, category: e.target.value })}
                                className="w-full px-4 py-3 bg-canvas-subtle border border-card-border rounded-xl text-text-main focus:border-primary outline-none"
                            >
                                {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-text-muted mb-1">Cycle</label>
                            <select
                                value={form.cycle}
                                onChange={e => setForm({ ...form, cycle: e.target.value })}
                                className="w-full px-4 py-3 bg-canvas-subtle border border-card-border rounded-xl text-text-main focus:border-primary outline-none"
                            >
                                {CYCLES.map(c => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2">
                            <Bell className="w-5 h-5 text-text-muted" />
                            <span className="text-text-main">Reminder</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setForm({ ...form, reminder: !form.reminder })}
                            className={`w-12 h-7 rounded-full transition-colors ${form.reminder ? 'bg-primary' : 'bg-canvas-subtle border border-card-border'
                                }`}
                        >
                            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${form.reminder ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                        </button>
                    </div>

                    {form.reminder && (
                        <div>
                            <label className="block text-sm text-text-muted mb-1">
                                Remind me {form.reminderDays} days before
                            </label>
                            <input
                                type="range"
                                min="1"
                                max="7"
                                value={form.reminderDays}
                                onChange={e => setForm({ ...form, reminderDays: parseInt(e.target.value) })}
                                className="w-full"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm text-text-muted mb-1">Notes (optional)</label>
                        <textarea
                            value={form.notes}
                            onChange={e => setForm({ ...form, notes: e.target.value })}
                            placeholder="Add any notes..."
                            className="w-full px-4 py-3 bg-canvas-subtle border border-card-border rounded-xl text-text-main focus:border-primary outline-none resize-none"
                            rows={2}
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium"
                    >
                        {bill ? 'Update Bill' : 'Add Bill'}
                    </button>
                </form>
            </motion.div>
        </motion.div>
    );
}
