import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, CreditCard, Banknote, Plus, Trash2, X, ArrowRight, Eye, EyeOff, Lock } from 'lucide-react';

const Accounts = () => {
    const { accounts = [], addAccount, updateAccount, deleteAccount, isLoading, secretUnlocked, toggleSecretUnlock } = useFinance();
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', type: 'bank', balance: '', isSecret: false });
    const [search, setSearch] = useState('');

    React.useEffect(() => {
        if (showModal) document.body.classList.add('modal-open');
        else document.body.classList.remove('modal-open');
    }, [showModal]);

    if (isLoading) return <div className="p-10 text-center uppercase tracking-widest opacity-20 text-[10px] font-bold">Loading Accounts...</div>;

    const handleSubmit = async (e) => {
        e.preventDefault();
        const data = { ...form, balance: parseFloat(form.balance) || 0 };
        editing ? await updateAccount(editing.id, data) : await addAccount(data);
        setShowModal(false);
        setEditing(null);
    };

    // Filter accounts: hide secrets unless unlocked
    const filteredAccounts = accounts
        .filter(acc => secretUnlocked || !acc.isSecret)
        .filter(acc => acc.name.toLowerCase().includes(search.toLowerCase()));

    const secretCount = accounts.filter(acc => acc.isSecret).length;

    const openEditModal = (acc, e) => {
        e.stopPropagation();
        setEditing(acc);
        setForm({ name: acc.name, type: acc.type, balance: acc.balance.toString(), billingDay: acc.billingDay, dueDay: acc.dueDay, isSecret: acc.isSecret || false });
        setShowModal(true);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 py-12 md:px-6 md:py-20 max-w-4xl mx-auto min-h-screen pb-40"
        >
            <header className="mb-8 md:mb-12">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-[10px] font-bold uppercase tracking-[0.5em] text-text-muted mb-2">My Finances</h2>
                        <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-none text-text-main">Wallets<span className="text-primary">.</span></h1>
                    </div>
                    {secretCount > 0 && (
                        <button
                            onClick={toggleSecretUnlock}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${secretUnlocked ? 'bg-primary text-primary-foreground' : 'bg-canvas-subtle text-text-muted border border-card-border hover:border-primary'}`}
                        >
                            {secretUnlocked ? <EyeOff size={14} /> : <Eye size={14} />}
                            {secretUnlocked ? 'Hide' : 'Reveal'}
                        </button>
                    )}
                </div>

                {/* Search Input */}
                <input
                    type="text"
                    placeholder="Search accounts..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full md:w-1/2 p-4 bg-canvas-subtle border border-card-border rounded-xl outline-none focus:border-primary text-text-main font-bold placeholder:text-text-muted/50 transition-all"
                />
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {filteredAccounts.map((acc, idx) => (
                    <motion.div
                        key={String(acc.id)}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.05 * idx }}
                        className="modern-card p-5 md:p-8 min-h-[140px] md:min-h-[200px] flex flex-col justify-between group border-l-4 border-l-primary hover:shadow-lg transition-all"
                    >
                        <div className="flex justify-between items-start">
                            <span className="text-2xl md:text-4xl text-text-main">
                                {acc.type === 'bank' ? '🏦' : acc.type === 'credit' ? '💳' : '💵'}
                            </span>
                            <button
                                onClick={(e) => openEditModal(acc, e)}
                                className="text-[8px] font-bold uppercase tracking-widest text-primary border border-primary/20 px-2 py-1 rounded-full hover:bg-primary hover:text-primary-foreground transition-all"
                            >
                                Edit
                            </button>
                        </div>
                        <div className="mt-3">
                            <p className="text-[9px] md:text-xs font-bold uppercase tracking-widest text-text-muted mb-1">{acc.name}</p>
                            <h3 className="text-2xl md:text-4xl font-black tracking-tight text-text-main">₹{acc.balance.toLocaleString()}</h3>
                            {acc.type === 'credit' && (acc.billingDay || acc.dueDay) && (
                                <p className="text-[9px] font-bold text-text-muted mt-2">
                                    {acc.billingDay && <span>Statement: {acc.billingDay}th</span>}
                                    {acc.billingDay && acc.dueDay && <span className="mx-2">•</span>}
                                    {acc.dueDay && <span className="text-primary">Due: {acc.dueDay}th</span>}
                                </p>
                            )}
                        </div>
                        <Link
                            to={`/accounts/${acc.id}`}
                            className="mt-4 flex items-center justify-between text-xs font-bold text-text-muted hover:text-primary transition-colors uppercase tracking-wider group/link"
                        >
                            <span>View Transactions</span>
                            <ArrowRight size={14} className="group-hover/link:translate-x-1 transition-transform" />
                        </Link>
                    </motion.div>
                ))}

                <motion.button
                    onClick={() => { setEditing(null); setForm({ name: '', type: 'bank', balance: '', billingDay: '', dueDay: '' }); setShowModal(true); }}
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

                                {form.type === 'credit' && (
                                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div>
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted ml-4 mb-2 block">Statement Day</label>
                                            <input
                                                type="number"
                                                min="1" max="31"
                                                placeholder="e.g. 15"
                                                value={form.billingDay || ''}
                                                onChange={e => setForm({ ...form, billingDay: e.target.value })}
                                                className="w-full bg-canvas-subtle border border-card-border p-5 md:p-6 rounded-2xl md:rounded-[1.5rem] outline-none focus:border-primary text-lg font-bold text-text-main transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted ml-4 mb-2 block">Due Day</label>
                                            <input
                                                type="number"
                                                min="1" max="31"
                                                placeholder="e.g. 5"
                                                value={form.dueDay || ''}
                                                onChange={e => setForm({ ...form, dueDay: e.target.value })}
                                                className="w-full bg-canvas-subtle border border-card-border p-5 md:p-6 rounded-2xl md:rounded-[1.5rem] outline-none focus:border-primary text-lg font-bold text-text-main transition-all"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Secret Toggle */}
                                <div className="flex items-center gap-4 p-4 bg-canvas-subtle rounded-2xl border border-card-border">
                                    <input
                                        type="checkbox"
                                        id="isSecret"
                                        checked={form.isSecret || false}
                                        onChange={e => setForm({ ...form, isSecret: e.target.checked })}
                                        className="w-5 h-5 accent-primary"
                                    />
                                    <label htmlFor="isSecret" className="flex-1">
                                        <p className="font-bold text-text-main text-sm">Secret Account</p>
                                        <p className="text-[10px] text-text-muted">Hide from dashboard and totals until revealed</p>
                                    </label>
                                    <Lock size={18} className="text-text-muted" />
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
