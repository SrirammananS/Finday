import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { motion, AnimatePresence } from 'framer-motion';
import TransactionForm from '../components/TransactionForm';
import { FileText, Plus, Bell, Trash2, CheckCircle2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth } from 'date-fns';

const Bills = () => {
    const { bills = [], addBill, deleteBill, isLoading } = useFinance();
    const [showModal, setShowModal] = useState(false);
    const [payBill, setPayBill] = useState(null);
    const [viewMode, setViewMode] = useState('list');
    const [form, setForm] = useState({ name: '', amount: '', dueDay: '1' });
    const [selectedMonth, setSelectedMonth] = useState(new Date());

    React.useEffect(() => {
        if (showModal) document.body.classList.add('modal-open');
        else document.body.classList.remove('modal-open');
    }, [showModal]);

    if (isLoading) return <div className="p-10 text-center uppercase tracking-widest opacity-20 text-[10px] font-bold">Loading...</div>;

    const totalMonthly = bills.reduce((acc, bill) => acc + (parseFloat(bill.amount) || 0), 0);
    const today = new Date();
    const calendarDays = eachDayOfInterval({ start: startOfMonth(selectedMonth), end: endOfMonth(selectedMonth) });

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

                    {bills.map(bill => {
                        const isPaid = bill.status === 'paid';
                        return (
                            <motion.div
                                key={bill.id}
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className={`modern-card p-6 flex justify-between items-center group relative overflow-hidden ${isPaid ? 'border-green-500/30 bg-green-500/5' : ''}`}
                            >
                                {/* Hover Actions */}
                                <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-canvas to-transparent opacity-0 group-hover:opacity-100 flex items-center justify-end pr-6 gap-2 transition-opacity">
                                    <button onClick={() => deleteBill(bill.id)} className="p-2 hover:bg-red-500 hover:text-white rounded-full transition-colors text-text-muted">
                                        <Trash2 size={18} />
                                    </button>
                                </div>

                                <div className="flex items-center gap-5">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl shadow-inner ${isPaid ? 'bg-green-500/20 text-green-500' : 'bg-canvas-subtle text-text-main'}`}>
                                        {isPaid ? <CheckCircle2 size={24} /> : bill.dueDay}
                                    </div>
                                    <div>
                                        <h3 className={`font-bold text-lg mb-1 ${isPaid ? 'text-green-600 line-through opacity-70' : 'text-text-main'}`}>{bill.name}</h3>
                                        <p className={`text-xs font-bold uppercase tracking-wider ${isPaid ? 'text-green-500' : 'text-text-muted'}`}>
                                            {isPaid ? 'Paid ✓' : `Due on ${bill.dueDay}th`}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-xl font-black ${isPaid ? 'text-green-500' : 'text-text-main'}`}>₹{parseFloat(bill.amount).toLocaleString()}</div>
                                    <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">/ Month</div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            ) : (
                <div className="modern-card p-6 md:p-8">
                    {/* Month Header with Navigation */}
                    <div className="flex items-center justify-between mb-6">
                        <button
                            onClick={() => setSelectedMonth(prev => subMonths(prev, 1))}
                            className="p-2 hover:bg-canvas-subtle rounded-full transition-colors"
                        >
                            <ChevronLeft size={20} className="text-text-muted" />
                        </button>
                        <div className="text-center">
                            <h3 className="text-lg font-black text-text-main">{format(selectedMonth, 'MMMM yyyy')}</h3>
                            {!isSameMonth(selectedMonth, today) && (
                                <button
                                    onClick={() => setSelectedMonth(new Date())}
                                    className="text-[10px] text-primary font-bold uppercase tracking-wider mt-1"
                                >
                                    Today
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => setSelectedMonth(prev => addMonths(prev, 1))}
                            className="p-2 hover:bg-canvas-subtle rounded-full transition-colors"
                        >
                            <ChevronRight size={20} className="text-text-muted" />
                        </button>
                    </div>

                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-1 md:gap-2 text-center mb-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                            <div key={`header-${i}`} className="text-[10px] font-bold text-text-muted py-2">{d}</div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1 md:gap-2">
                        {/* Empty cells for days before month starts */}
                        {Array.from({ length: startOfMonth(selectedMonth).getDay() }).map((_, i) => (
                            <div key={`empty-${i}`} className="aspect-square" />
                        ))}

                        {calendarDays.map(day => {
                            const dayNum = day.getDate();
                            const dayBills = bills.filter(b => parseInt(b.dueDay) === dayNum);
                            const hasBill = dayBills.length > 0;
                            const isToday = isSameDay(day, today);
                            const isPast = day < today && !isToday;
                            const allPaid = hasBill && dayBills.every(b => b.status === 'paid');
                            const unpaidBills = dayBills.filter(b => b.status !== 'paid');

                            return (
                                <div
                                    key={day.toISOString()}
                                    className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all cursor-default
                                        ${isToday ? 'bg-primary text-primary-foreground shadow-lg scale-105' : ''}
                                        ${hasBill && !allPaid && !isToday ? 'bg-red-500/10 border border-red-500/30' : ''}
                                        ${hasBill && allPaid && !isToday ? 'bg-green-500/10 border border-green-500/30' : ''}
                                        ${!hasBill && !isToday ? 'hover:bg-canvas-subtle' : ''}
                                    `}
                                    title={hasBill ? dayBills.map(b => `${b.name}: ₹${b.amount} (${b.status || 'due'})`).join('\n') : ''}
                                >
                                    <span className={`text-sm font-bold ${isToday ? '' : isPast ? 'text-text-muted/50' : 'text-text-main'}`}>
                                        {dayNum}
                                    </span>
                                    {hasBill && (
                                        <div className={`w-1.5 h-1.5 rounded-full mt-1 ${allPaid ? 'bg-green-500' : 'bg-red-500'}`} />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-card-border">
                        <span className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Due
                        </span>
                        <span className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                            <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span> Paid
                        </span>
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
