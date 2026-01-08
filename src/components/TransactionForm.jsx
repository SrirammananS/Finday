import React, { useState, useEffect, useRef } from 'react';
import { useFinance } from '../context/FinanceContext';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';

const TransactionForm = ({ onClose, editTransaction }) => {
    const { addTransaction, updateTransaction, accounts, categories, isSyncing } = useFinance();
    const [form, setForm] = useState({
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: '',
        category: categories[0]?.name || 'Other',
        accountId: accounts[0]?.id || '',
        type: 'expense'
    });

    const amountRef = useRef(null);

    useEffect(() => {
        if (editTransaction) {
            setForm({
                ...editTransaction,
                amount: Math.abs(editTransaction.amount).toString(),
                type: editTransaction.amount > 0 ? 'income' : 'expense'
            });
        }
    }, [editTransaction]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const amountNum = parseFloat(form.amount);
        if (isNaN(amountNum)) return;
        const finalAmount = form.type === 'expense' ? -Math.abs(amountNum) : Math.abs(amountNum);

        // GSAP Success scale
        gsap.to('.form-sheet', { scale: 0.95, opacity: 0, duration: 0.5, onComplete: onClose });

        if (editTransaction) {
            await updateTransaction({ ...form, id: editTransaction.id, amount: finalAmount });
        } else {
            await addTransaction({ ...form, amount: finalAmount });
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/80 backdrop-blur-3xl"
            />

            <motion.div
                layoutId="form-sheet"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="form-sheet relative w-full max-w-2xl bg-soft-zinc border border-white/10 rounded-t-[2.5rem] md:rounded-[3rem] p-8 md:p-16 overflow-y-auto max-h-[95vh] no-scrollbar"
                onClick={e => e.stopPropagation()}
            >
                {/* Decorative Liquid Glow */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-toxic-lime via-electric-violet to-toxic-lime animate-pulse" />

                <header className="flex justify-between items-start mb-10 md:mb-16">
                    <div>
                        <h2 className="text-3xl md:text-5xl font-black tracking-tighter leading-none mb-1">
                            Capture<span className="text-toxic-lime">.</span>
                        </h2>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">Nodal Input</p>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 md:w-16 md:h-16 rounded-full border border-white/10 flex items-center justify-center text-xl md:text-2xl hover:bg-white hover:text-black transition-all">✕</button>
                </header>

                <form onSubmit={handleSubmit} className="space-y-8 md:space-y-12">
                    {/* Immersive Amount Entry */}
                    <div className="text-center group">
                        <div className="inline-flex items-center gap-2 md:gap-4 relative">
                            <span className="text-2xl md:text-4xl font-black text-toxic-lime/40">₹</span>
                            <input
                                type="number"
                                ref={amountRef}
                                value={form.amount}
                                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                                className="w-full text-5xl md:text-9xl font-black text-center outline-none bg-transparent caret-toxic-lime text-white selection:bg-toxic-lime/30"
                                autoFocus
                                required
                            />
                        </div>

                        <div className="mt-6 md:mt-8 flex justify-center">
                            <div className="bg-black/40 p-1.5 rounded-full flex gap-1 border border-white/5">
                                {['expense', 'income'].map(type => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, type }))}
                                        className={`px-6 md:px-8 py-2 md:py-3 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${form.type === type
                                            ? 'bg-toxic-lime text-black shadow-toxic'
                                            : 'text-white/40 hover:text-white'
                                            }`}
                                    >
                                        {type === 'expense' ? 'Outflow' : 'Inflow'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Meta Fields - GenZ Styling */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        <div className="md:col-span-2">
                            <input
                                type="text"
                                value={form.description}
                                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                placeholder="Purpose..."
                                className="w-full bg-black/40 border border-white/5 py-5 md:py-6 px-8 md:px-10 rounded-[1.5rem] md:rounded-[2rem] font-bold text-lg outline-none focus:border-toxic-lime transition-all placeholder:text-white/10"
                                required
                            />
                        </div>

                        <div className="relative">
                            <label className="absolute top-3 left-8 md:top-4 md:left-10 text-[7px] md:text-[8px] font-black uppercase tracking-widest text-white/30">Timeline</label>
                            <input
                                type="date"
                                value={form.date}
                                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                className="w-full bg-black/40 border border-white/5 pt-8 pb-4 md:pt-10 md:pb-6 px-8 md:px-10 rounded-[1.5rem] md:rounded-[2rem] font-bold text-xs md:text-sm outline-none focus:border-toxic-lime transition-all"
                                required
                            />
                        </div>

                        <div className="relative">
                            <label className="absolute top-3 left-8 md:top-4 md:left-10 text-[7px] md:text-[8px] font-black uppercase tracking-widest text-white/30">Node</label>
                            <select
                                value={form.accountId}
                                onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}
                                className="w-full bg-black/40 border border-white/5 pt-8 pb-4 md:pt-10 md:pb-6 px-8 md:px-10 rounded-[1.5rem] md:rounded-[2rem] font-bold text-xs md:text-sm outline-none focus:border-toxic-lime transition-all appearance-none"
                                required
                            >
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] text-white/30 ml-4 md:ml-6 mb-3 md:mb-4 block">Classification</label>
                            <div className="flex gap-2 md:gap-3 overflow-x-auto no-scrollbar pb-2 px-1">
                                {categories.map(c => (
                                    <button
                                        key={c.name}
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, category: c.name }))}
                                        className={`flex-shrink-0 flex items-center gap-3 md:gap-4 px-6 md:px-8 py-3 md:py-4 rounded-[1.2rem] md:rounded-[1.5rem] border-2 transition-all duration-500 ${form.category === c.name
                                            ? 'bg-white border-white text-black scale-105'
                                            : 'bg-black/40 border-white/5 text-white/40 hover:border-white/20'}`}
                                    >
                                        <span className="text-xl md:text-2xl">{c.icon}</span>
                                        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">{c.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSyncing}
                        className="genz-btn genz-btn-primary w-full py-6 md:py-8 text-lg md:text-xl shadow-2xl transition-all active:scale-95 group"
                    >
                        <span className="relative z-10">{isSyncing ? 'BROADCASTING...' : (editTransaction ? 'FINALIZE' : 'EXECUTE')}</span>
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

export default TransactionForm;
