import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

const Accounts = () => {
    const { accounts = [], addAccount, updateAccount, deleteAccount, isLoading } = useFinance();
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', type: 'bank', balance: '' });

    if (isLoading) return <div className="p-10 text-center uppercase tracking-widest opacity-20 text-[10px]">Accessing.Nodes...</div>;

    const handleSubmit = async (e) => {
        e.preventDefault();
        const data = { ...form, balance: parseFloat(form.balance) || 0 };
        editing ? await updateAccount(editing.id, data) : await addAccount(data);
        setShowModal(false);
        setEditing(null);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 py-12 md:px-6 md:py-20 max-w-4xl mx-auto min-h-screen pb-40"
        >
            <header className="mb-12 md:mb-20">
                <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 mb-2">Network.Topology</h2>
                <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-none text-kinetic">Wallets<span className="text-toxic-lime">.</span></h1>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                {accounts.map((acc, idx) => (
                    <motion.div
                        key={String(acc.id)}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.05 * idx }}
                        onClick={() => { setEditing(acc); setForm({ name: acc.name, type: acc.type, balance: acc.balance.toString() }); setShowModal(true); }}
                        className="genz-card p-6 md:p-10 min-h-[180px] md:min-h-[280px] flex flex-col justify-between group cursor-pointer border-l-4 border-l-toxic-lime"
                    >
                        <div className="flex justify-between items-start">
                            <span className="text-3xl md:text-5xl">{acc.type === 'bank' ? '🏦' : acc.type === 'credit' ? '💳' : '💵'}</span>
                            <div className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-toxic-lime border border-toxic-lime/20 px-2 md:px-3 py-1 rounded-full">Node.Active</div>
                        </div>
                        <div className="mt-4">
                            <p className="text-[9px] md:text-xs font-black uppercase tracking-[0.3em] text-white/30 mb-1">{acc.name}</p>
                            <h3 className="text-3xl md:text-5xl font-black tracking-tighter break-all">₹{acc.balance.toLocaleString()}</h3>
                        </div>
                    </motion.div>
                ))}

                <motion.button
                    onClick={() => { setEditing(null); setForm({ name: '', type: 'bank', balance: '' }); setShowModal(true); }}
                    className="genz-card p-6 md:p-10 min-h-[160px] md:min-h-[280px] flex md:flex-col items-center justify-center gap-4 md:gap-6 border-dashed border-white/20 hover:border-toxic-lime transition-all group"
                >
                    <div className="w-12 h-12 md:w-20 md:h-20 rounded-full border border-white/10 flex items-center justify-center text-2xl md:text-4xl group-hover:bg-toxic-lime group-hover:text-black transition-all">+</div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30 group-hover:text-white">New_Node</p>
                </motion.button>
            </div>

            {/* Simple GenZ Modal */}
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
                                <h2 className="text-2xl md:text-4xl font-black tracking-tight">{editing ? 'Modify Node' : 'Init Node'}</h2>
                                <button onClick={() => setShowModal(false)} className="text-white/20 hover:text-white">✕</button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
                                <input
                                    type="text"
                                    placeholder="LABEL"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="w-full bg-black/40 border border-white/5 p-5 md:p-6 rounded-2xl md:rounded-[1.5rem] outline-none focus:border-toxic-lime text-lg font-bold"
                                    required
                                />
                                <input
                                    type="number"
                                    placeholder="VALUE"
                                    value={form.balance}
                                    onChange={e => setForm({ ...form, balance: e.target.value })}
                                    className="w-full bg-black/40 border border-white/5 p-5 md:p-6 rounded-2xl md:rounded-[1.5rem] outline-none focus:border-toxic-lime text-2xl font-black"
                                    required
                                />
                                <select
                                    value={form.type}
                                    onChange={e => setForm({ ...form, type: e.target.value })}
                                    className="w-full bg-black/40 border border-white/5 p-5 md:p-6 rounded-2xl md:rounded-[1.5rem] outline-none focus:border-toxic-lime font-bold uppercase tracking-widest text-[10px]"
                                >
                                    <option value="bank">🏦 Banking</option>
                                    <option value="credit">💳 Credit</option>
                                    <option value="cash">💵 Cash</option>
                                </select>
                                <div className="flex gap-4">
                                    <button type="submit" className="genz-btn genz-btn-primary flex-1 py-5 md:py-6 text-base tracking-widest">COMMIT</button>
                                    {editing && (
                                        <button
                                            type="button"
                                            onClick={() => { if (confirm('Vaporize node?')) deleteAccount(editing.id); setShowModal(false); }}
                                            className="genz-btn genz-btn-ghost px-6 text-rose-500 border-rose-500/20 hover:bg-rose-500 hover:text-white"
                                        >
                                            [DEL]
                                        </button>
                                    )}
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default Accounts;
