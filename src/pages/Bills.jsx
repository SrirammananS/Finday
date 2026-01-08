import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

const Bills = () => {
    const { bills = [], addBill, deleteBill, isLoading } = useFinance();
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', amount: '', dueDay: '1' });

    if (isLoading) return <div className="p-10 text-center uppercase tracking-widest opacity-20 text-[10px]">Scanning.Obligations...</div>;

    const allBills = [...bills].sort((a, b) => (parseInt(a.dueDay) || 0) - (parseInt(b.dueDay) || 0));

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 py-12 md:px-6 md:py-20 max-w-4xl mx-auto min-h-screen pb-40"
        >
            <header className="mb-12 md:mb-20">
                <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 mb-2">Obligation.Matrix</h2>
                <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-none text-kinetic">Flows<span className="text-toxic-lime">_</span></h1>
            </header>

            <div className="space-y-4 md:space-y-6">
                {allBills.map((bill, idx) => (
                    <motion.div
                        key={String(bill.id)}
                        initial={{ x: 30, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.05 * idx }}
                        className="genz-card p-6 md:p-10 flex items-center justify-between border-r-4 border-r-electric-violet"
                    >
                        <div className="flex items-center gap-4 md:gap-10 min-w-0">
                            <span className="text-3xl md:text-5xl flex-shrink-0">📄</span>
                            <div className="min-w-0">
                                <h3 className="text-lg md:text-3xl font-black tracking-tight mb-0.5 md:mb-1 truncate">{bill.name}</h3>
                                <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white/20">Cycle: Day_{bill.dueDay}</p>
                            </div>
                        </div>
                        <div className="text-right ml-4">
                            <p className="text-xl md:text-4xl font-black text-white">₹{(parseFloat(bill.amount) || 0).toLocaleString()}</p>
                            <button
                                onClick={() => { if (confirm('Nullify obligation?')) deleteBill(bill.id); }}
                                className="mt-1 md:mt-2 text-[9px] font-black uppercase tracking-widest text-rose-500/40 hover:text-rose-500"
                            >
                                [DEL]
                            </button>
                        </div>
                    </motion.div>
                ))}

                <motion.button
                    onClick={() => { setForm({ name: '', amount: '', dueDay: '1' }); setShowModal(true); }}
                    className="genz-card p-8 md:p-12 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 border-2 hover:border-toxic-lime transition-all group w-full"
                >
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full border border-white/10 flex items-center justify-center text-2xl group-hover:bg-toxic-lime group-hover:text-black transition-all">+</div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/20 group-hover:text-white">Init_Obligation</span>
                </motion.button>
            </div>

            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[10001] flex items-end md:items-center justify-center p-0 md:p-6 bg-black/90 backdrop-blur-3xl">
                        <motion.div
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            className="bg-soft-zinc border border-white/10 p-8 md:p-12 rounded-t-[2.5rem] md:rounded-[3rem] w-full max-w-xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-10">
                                <h2 className="text-2xl md:text-4xl font-black tracking-tight">Init_Flow</h2>
                                <button onClick={() => setShowModal(false)} className="text-white/20 hover:text-white">✕</button>
                            </div>

                            <form onSubmit={(e) => { e.preventDefault(); addBill({ ...form, amount: parseFloat(form.amount) || 0 }); setShowModal(false); }} className="space-y-6 md:space-y-8">
                                <input
                                    type="text"
                                    placeholder="LABEL"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="w-full bg-black/40 border border-white/5 p-5 md:p-6 rounded-2xl md:rounded-[1.5rem] outline-none focus:border-toxic-lime text-lg font-bold"
                                    required
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="number"
                                        placeholder="VALUE"
                                        value={form.amount}
                                        onChange={e => setForm({ ...form, amount: e.target.value })}
                                        className="w-full bg-black/40 border border-white/5 p-5 md:p-6 rounded-2xl md:rounded-[1.5rem] outline-none focus:border-toxic-lime text-xl font-black"
                                        required
                                    />
                                    <input
                                        type="number"
                                        placeholder="CYCLE_DAY"
                                        value={form.dueDay}
                                        onChange={e => setForm({ ...form, dueDay: e.target.value })}
                                        className="w-full bg-black/40 border border-white/5 p-5 md:p-6 rounded-2xl md:rounded-[1.5rem] outline-none focus:border-toxic-lime text-xl font-black"
                                        required
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <button type="submit" className="genz-btn genz-btn-primary flex-1 py-5 md:py-6 text-base tracking-widest">COMMIT</button>
                                    <button type="button" onClick={() => setShowModal(false)} className="genz-btn genz-btn-ghost px-6">CANCEL</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default Bills;
