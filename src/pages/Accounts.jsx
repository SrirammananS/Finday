import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, CreditCard, Banknote, Plus, Trash2, X } from 'lucide-react';

const Accounts = () => {
    const { accounts = [], addAccount, updateAccount, deleteAccount, isLoading } = useFinance();
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', type: 'bank', balance: '' });

    if (isLoading) return <div className="p-10 text-center uppercase tracking-widest opacity-20 text-[10px] font-bold">Loading Accounts...</div>;

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
                <h2 className="text-[10px] font-bold uppercase tracking-[0.5em] text-text-muted mb-2">My Finances</h2>
                <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-none text-text-main">Wallets<span className="text-primary">.</span></h1>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {accounts.map((acc, idx) => (
                    <motion.div
                        key={String(acc.id)}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.05 * idx }}
                        onClick={() => { setEditing(acc); setForm({ name: acc.name, type: acc.type, balance: acc.balance.toString() }); setShowModal(true); }}
                        className="modern-card p-5 md:p-8 min-h-[140px] md:min-h-[200px] flex flex-col justify-between group cursor-pointer border-l-4 border-l-primary hover:shadow-lg transition-all"
                    >
                        <div className="flex justify-between items-start">
                            <span className="text-2xl md:text-4xl text-text-main">
                                {acc.type === 'bank' ? '🏦' : acc.type === 'credit' ? '💳' : '💵'}
                            </span>
                            <div className="text-[8px] font-bold uppercase tracking-widest text-primary border border-primary/20 px-2 py-1 rounded-full">Active</div>
                        </div>
                        <div className="mt-3">
                            <p className="text-[9px] md:text-xs font-bold uppercase tracking-widest text-text-muted mb-1">{acc.name}</p>
                            <h3 className="text-2xl md:text-4xl font-black tracking-tight text-text-main">₹{acc.balance.toLocaleString()}</h3>
                        </div>
                    </motion.div>
                ))}

                <motion.button
                    onClick={() => { setEditing(null); setForm({ name: '', type: 'bank', balance: '' }); setShowModal(true); }}
                    className="modern-card p-5 md:p-8 min-h-[140px] md:min-h-[200px] flex md:flex-col items-center justify-center gap-3 md:gap-4 border-dashed border-2 border-card-border hover:border-primary transition-all group shadow-none hover:shadow-none bg-transparent"
                >
                    <div className="w-10 h-10 md:w-16 md:h-16 rounded-full border border-card-border flex items-center justify-center text-text-muted group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                        <Plus size={24} />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted group-hover:text-primary transition-colors">New Account</p>
                </motion.button>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[10001] flex items-end md:items-center justify-center p-0 md:p-6 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            className="bg-card border border-card-border p-8 md:p-12 rounded-t-[2.5rem] md:rounded-[3rem] w-full max-w-xl shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-10">
                                <h2 className="text-2xl md:text-4xl font-black tracking-tight text-text-main">{editing ? 'Edit Account' : 'New Account'}</h2>
                                <button onClick={() => setShowModal(false)} className="text-text-muted hover:text-text-main transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted ml-4 mb-2 block">Account Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. HDFC Bank"
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        className="w-full bg-canvas-subtle border border-card-border p-5 md:p-6 rounded-2xl md:rounded-[1.5rem] outline-none focus:border-primary text-lg font-bold text-text-main placeholder:text-text-muted/30 transition-all"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted ml-4 mb-2 block">Current Balance</label>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={form.balance}
                                        onChange={e => setForm({ ...form, balance: e.target.value })}
                                        className="w-full bg-canvas-subtle border border-card-border p-5 md:p-6 rounded-2xl md:rounded-[1.5rem] outline-none focus:border-primary text-2xl font-black text-text-main placeholder:text-text-muted/30 transition-all"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted ml-4 mb-2 block">Account Type</label>
                                    <select
                                        value={form.type}
                                        onChange={e => setForm({ ...form, type: e.target.value })}
                                        className="w-full bg-canvas-subtle border border-card-border p-5 md:p-6 rounded-2xl md:rounded-[1.5rem] outline-none focus:border-primary font-bold uppercase tracking-widest text-xs text-text-main appearance-none transition-all"
                                    >
                                        <option value="bank">🏦 Banking</option>
                                        <option value="credit">💳 Credit Card</option>
                                        <option value="cash">💵 Cash</option>
                                    </select>
                                </div>

                                <div className="flex gap-4">
                                    <button type="submit" className="modern-btn modern-btn-primary flex-1 py-5 md:py-6 text-base tracking-widest">
                                        {editing ? 'UPDATE' : 'CREATE'}
                                    </button>
                                    {editing && (
                                        <button
                                            type="button"
                                            onClick={() => { if (confirm('Delete this account?')) deleteAccount(editing.id); setShowModal(false); }}
                                            className="px-6 py-4 rounded-xl border border-destructive/20 text-destructive hover:bg-destructive hover:text-white transition-all font-bold"
                                        >
                                            <Trash2 size={20} />
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
