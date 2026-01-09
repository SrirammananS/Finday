import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { motion, AnimatePresence } from 'framer-motion';
import TransactionForm from '../components/TransactionForm';
import { FileText, Plus, Bell, Trash2, CheckCircle2, X } from 'lucide-react';
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';

const Bills = () => {
    const { bills = [], addBill, deleteBill, isLoading } = useFinance();
    const [showModal, setShowModal] = useState(false);
    const [payBill, setPayBill] = useState(null);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
    const [form, setForm] = useState({ name: '', amount: '', dueDay: '1' });

    if (isLoading) return <div className="p-10 text-center uppercase tracking-widest opacity-20 text-[10px] font-bold">Loading...</div>;

    const totalMonthly = bills.reduce((acc, bill) => acc + (parseFloat(bill.amount) || 0), 0);
    const today = new Date();
    const currentMonthDays = eachDayOfInterval({ start: startOfMonth(today), end: endOfMonth(today) });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.amount) return;
        await addBill(form);
        setForm({ name: '', amount: '', dueDay: '1' });
        setShowModal(false);
    };

    const handlePayBill = (bill) => {
        // Here we would ideally open the TransactionForm pre-filled
        // For now, we can just trigger a state that might open the modal with pre-filled data
        // logic to find linked account would go here
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 py-12 md:px-6 md:py-20 max-w-4xl mx-auto min-h-screen pb-40"
        >
            <header className="flex justify-between items-end mb-12">
                <div>
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.5em] text-text-muted mb-2">Recurring</h2>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none text-text-main">Subscriptions<span className="text-primary">.</span></h1>
                </div>
                <div className="text-right hidden md:block">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Monthly Cost</p>
                    <p className="text-3xl font-black text-text-main">₹{totalMonthly.toLocaleString()}</p>
                </div>
            </header>

            {/* View Toggle */}
            <div className="flex items-center gap-4 mb-8 bg-canvas-subtle w-fit p-1 rounded-full border border-card-border">
                <button
                    onClick={() => setViewMode('list')}
                    className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-text-main text-canvas shadow-lg' : 'text-text-muted hover:text-text-main'}`}
                >
                    List
                </button>
                <button
                    onClick={() => setViewMode('calendar')}
                    className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${viewMode === 'calendar' ? 'bg-text-main text-canvas shadow-lg' : 'text-text-muted hover:text-text-main'}`}
                >
                    Calendar
                </button>
            </div>

            {viewMode === 'list' ? (
                <div className="grid gap-4">
                    <button
                        onClick={() => setShowModal(true)}
                        className="group w-full p-6 rounded-3xl border-2 border-dashed border-card-border hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-3 mb-4"
                    >
                        <div className="w-10 h-10 rounded-full bg-canvas-subtle group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-colors">
                            <Plus size={20} />
                        </div>
                        <span className="font-bold text-text-muted group-hover:text-primary uppercase tracking-widest text-xs">Add New Subscription</span>
                    </button>

                    {bills.map(bill => (
                        <motion.div
                            key={bill.id}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="modern-card p-6 flex justify-between items-center group relative overflow-hidden"
                        >
                            {/* Hover Actions */}
                            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-canvas to-transparent opacity-0 group-hover:opacity-100 flex items-center justify-end pr-6 gap-2 transition-opacity">
                                <button onClick={() => deleteBill(bill.id)} className="p-2 hover:bg-red-500 hover:text-white rounded-full transition-colors text-text-muted">
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 rounded-2xl bg-canvas-subtle flex items-center justify-center text-text-main font-bold text-xl shadow-inner">
                                    {bill.dueDay}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-text-main mb-1">{bill.name}</h3>
                                    <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Due on {bill.dueDay}th</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xl font-black text-text-main">₹{parseFloat(bill.amount).toLocaleString()}</div>
                                <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">/ Month</div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="modern-card p-6 md:p-10">
                    <h3 className="text-xl font-black mb-6 text-text-main">{format(today, 'MMMM yyyy')}</h3>
                    <div className="grid grid-cols-7 gap-2 md:gap-4 text-center">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                            <div key={d} className="text-xs font-bold text-text-muted mb-2">{d}</div>
                        ))}
                        {currentMonthDays.map(day => {
                            const dayNum = day.getDate();
                            const dayBills = bills.filter(b => parseInt(b.dueDay) === dayNum);
                            const hasBill = dayBills.length > 0;
                            const isToday = isSameDay(day, today);

                            return (
                                <div key={day.toISOString()} className={`aspect-square rounded-2xl flex flex-col items-center justify-center relative border transition-all ${isToday ? 'border-primary bg-primary/5' : 'border-transparent hover:border-text-muted/20'}`}>
                                    <span className={`text-sm font-bold ${isToday ? 'text-primary' : 'text-text-muted'}`}>{dayNum}</span>
                                    {hasBill && (
                                        <div className="mt-1 flex flex-col items-center">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 mb-1"></div>
                                            <span className="text-[8px] font-bold text-text-main hidden md:block">₹{dayBills.reduce((s, b) => s + parseFloat(b.amount), 0)}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowModal(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 50, opacity: 0 }}
                            className="modern-card w-full max-w-md p-8 relative z-10"
                        >
                            <h2 className="text-2xl font-black text-text-main mb-6">Add Subscription</h2>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted ml-4 mb-2 block">Name</label>
                                    <input
                                        type="text"
                                        placeholder="Netflix, Rent, etc."
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        className="w-full bg-canvas-subtle border border-card-border p-5 md:p-6 rounded-2xl md:rounded-[1.5rem] outline-none focus:border-primary text-xl font-bold text-text-main placeholder:text-text-muted/30 transition-all"
                                        autoFocus
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted ml-4 mb-2 block">Amount</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={form.amount}
                                            onChange={e => setForm({ ...form, amount: e.target.value })}
                                            className="w-full bg-canvas-subtle border border-card-border p-5 md:p-6 rounded-2xl md:rounded-[1.5rem] outline-none focus:border-primary text-xl font-black text-text-main placeholder:text-text-muted/30 transition-all"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted ml-4 mb-2 block">Due Day (1-31)</label>
                                        <input
                                            type="number"
                                            placeholder="1"
                                            min="1"
                                            max="31"
                                            value={form.dueDay}
                                            onChange={e => setForm({ ...form, dueDay: e.target.value })}
                                            className="w-full bg-canvas-subtle border border-card-border p-5 md:p-6 rounded-2xl md:rounded-[1.5rem] outline-none focus:border-primary text-xl font-black text-text-main placeholder:text-text-muted/30 transition-all"
                                            required
                                        />
                                    </div>
                                </div>
                                <button type="submit" className="modern-btn modern-btn-primary w-full py-5 md:py-6 text-base tracking-widest">SAVE SUBSCRIPTION</button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default Bills;
