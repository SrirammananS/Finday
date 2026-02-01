import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, CreditCard, Banknote, Plus, Trash2, X, ArrowRight, Eye, EyeOff, Lock as LockIcon, Search, ShieldCheck } from 'lucide-react';

const Accounts = () => {
    const { accounts = [], addAccount, updateAccount, deleteAccount, isLoading, secretUnlocked, toggleSecretUnlock } = useFinance();
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', type: 'bank', balance: '', isSecret: false });
    const [search, setSearch] = useState('');

    React.useEffect(() => {
        if (showModal) document.body.classList.add('overflow-hidden');
        else document.body.classList.remove('overflow-hidden');
    }, [showModal]);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value || 0);
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
        </div>
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        const data = { ...form, balance: parseFloat(form.balance) || 0 };
        editing ? await updateAccount(editing.id, data) : await addAccount(data);
        setShowModal(false);
        setEditing(null);
    };

    const filteredAccounts = accounts.filter(acc => acc.name.toLowerCase().includes(search.toLowerCase()));
    const visibleAccounts = filteredAccounts.filter(acc => !acc.isSecret || secretUnlocked);
    const hiddenAccounts = filteredAccounts.filter(acc => acc.isSecret && !secretUnlocked);
    const secretCount = accounts.filter(acc => acc.isSecret).length;
    const totalBalance = visibleAccounts.reduce((sum, acc) => sum + acc.balance, 0);

    const openEditModal = (acc, e) => {
        e.stopPropagation();
        setEditing(acc);
        setForm({ name: acc.name, type: acc.type, balance: acc.balance.toString(), billingDay: acc.billingDay, dueDay: acc.dueDay, isSecret: acc.isSecret || false });
        setShowModal(true);
    };

    return (
        <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-black">
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

            <motion.main
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative px-5 py-12 md:px-8 md:py-24 max-w-5xl mx-auto pb-40"
            >
                {/* Header Layer */}
                <header className="mb-16">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
                                    <Wallet size={24} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-text-muted">Central Vault</span>
                            </div>
                            <h1 className="text-xl font-black tracking-[-0.04em] leading-none mb-1 transition-all text-white uppercase">
                                Accounts
                            </h1>
                            <p className="text-[8px] font-semibold text-text-muted uppercase tracking-[0.4em] opacity-60">Financial Nodes</p>
                        </div>

                        <div className="flex flex-col items-end gap-4">
                            {secretCount > 0 && (
                                <button
                                    onClick={toggleSecretUnlock}
                                    className={`group flex items-center gap-3 px-6 py-4 rounded-[1.5rem] border transition-all ${secretUnlocked ? 'bg-primary border-primary text-black' : 'bg-white/5 border-white/10 text-white hover:border-primary/50'}`}
                                >
                                    <div className="flex flex-col items-start mr-4">
                                        <span className={`text-[8px] font-black uppercase tracking-widest ${secretUnlocked ? 'text-black/60' : 'text-text-muted'}`}>Vault Protocol</span>
                                        <span className="text-xs font-black uppercase tracking-tighter">{secretUnlocked ? 'DECRYPTED' : 'ENCRYPTED'}</span>
                                    </div>
                                    {secretUnlocked ? <EyeOff size={18} strokeWidth={3} /> : <Eye size={18} strokeWidth={3} />}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Summary Intelligence */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-[2.5rem] bg-white/[0.03] border border-white/[0.05] backdrop-blur-xl">
                        <div className="relative group col-span-1 md:col-span-1">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                            <input
                                type="text"
                                placeholder="Filter nodes..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full h-16 bg-white/5 border border-white/10 pl-14 pr-6 rounded-2xl outline-none focus:border-primary/40 transition-all font-black text-xs uppercase tracking-widest text-white placeholder:text-white/10"
                            />
                        </div>
                        <div className="flex items-center justify-between px-8 py-4 bg-white/5 rounded-2xl border border-white/5">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/60 mb-1">Liquid</span>
                                <span className="text-xl font-black tracking-tighter tabular-nums">{formatCurrency(visibleAccounts.filter(a => a.type !== 'credit').reduce((sum, a) => sum + a.balance, 0))}</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between px-8 py-4 bg-white/5 rounded-2xl border border-white/5">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest text-rose-500/60 mb-1">Leverage</span>
                                <span className="text-xl font-black tracking-tighter tabular-nums">{formatCurrency(visibleAccounts.filter(a => a.type === 'credit').reduce((sum, a) => sum + a.balance, 0))}</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between px-8 py-4 bg-primary/[0.05] rounded-2xl border border-primary/10">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Net Valuation</span>
                                <span className="text-xl font-black tracking-tighter tabular-nums text-primary">{formatCurrency(totalBalance)}</span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Account Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {visibleAccounts.map((acc, idx) => {
                        const isCredit = acc.type === 'credit';
                        return (
                            <motion.div
                                key={String(acc.id)}
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.1 * idx }}
                                className="group relative"
                            >
                                <div className="absolute -inset-[1px] bg-gradient-to-br from-primary/20 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
                                <div className="relative p-4 md:p-5 rounded-2xl bg-[#080808] border border-white/[0.05] min-h-[140px] flex flex-col justify-between overflow-hidden transition-all group-hover:bg-[#0a0a0a]">
                                    <div className="absolute top-0 right-0 p-4 opacity-[0.01] -rotate-12 translate-x-2 translate-y-[-10%] group-hover:scale-110 transition-transform pointer-events-none">
                                        {acc.type === 'bank' ? <ShieldCheck size={100} /> : acc.type === 'credit' ? <CreditCard size={100} /> : <Banknote size={100} />}
                                    </div>

                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-base group-hover:border-primary/30 transition-all">
                                                    {acc.type === 'bank' ? '🏦' : acc.type === 'credit' ? '💳' : '💵'}
                                                </div>
                                                <div>
                                                    <p className="text-[7px] font-bold uppercase tracking-widest text-text-muted mb-0.5">{acc.type}</p>
                                                    <h3 className="text-sm font-bold uppercase tracking-tight text-white leading-none">{acc.name}</h3>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => openEditModal(acc, e)}
                                                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary hover:text-black transition-all"
                                            >
                                                <Plus size={16} className="rotate-45" />
                                            </button>
                                        </div>

                                        <div className="mb-8">
                                            <h3 className="text-lg md:text-xl font-bold tracking-tight text-white tabular-nums leading-none">
                                                {formatCurrency(acc.balance).replace('₹', '')}<span className="text-primary text-xs ml-0.5">₹</span>
                                            </h3>
                                            {isCredit && (acc.billingDay || acc.dueDay) && (
                                                <div className="flex gap-4 mt-4">
                                                    {acc.billingDay && (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-text-muted">Statement: {acc.billingDay}th</span>
                                                        </div>
                                                    )}
                                                    {acc.dueDay && (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                                                            <span className="text-[8px] font-bold uppercase tracking-widest text-rose-400">Due: {acc.dueDay}th</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="relative z-10 border-t border-white/5 pt-6 flex items-center justify-between">
                                        <Link
                                            to={`/accounts/${acc.id}`}
                                            className="text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-primary transition-all flex items-center gap-2"
                                        >
                                            Signal History <ArrowRight size={14} />
                                        </Link>
                                        {acc.isSecret && (
                                            <div className="flex items-center gap-1.5 text-primary">
                                                <LockIcon size={10} />
                                                <span className="text-[8px] font-black uppercase tracking-widest">Vaulted</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}

                    {hiddenAccounts.length > 0 && (
                        <motion.button
                            onClick={toggleSecretUnlock}
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="p-10 rounded-[2.5rem] bg-white/[0.02] border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-4 text-center hover:border-primary/50 transition-all group"
                        >
                            <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-muted group-hover:text-primary transition-all">
                                <LockIcon size={32} />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-black uppercase tracking-tighter text-text-muted group-hover:text-white transition-colors">
                                    {hiddenAccounts.length} Secret Node{hiddenAccounts.length > 1 ? 's' : ''}
                                </h3>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted/40">Vault protocol active. Reveal to access.</p>
                            </div>
                        </motion.button>
                    )}

                    <motion.button
                        onClick={() => { setEditing(null); setForm({ name: '', type: 'bank', balance: '', billingDay: '', dueDay: '' }); setShowModal(true); }}
                        className="p-6 md:p-8 rounded-3xl bg-transparent border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 text-center hover:border-primary/50 transition-all group min-h-[180px]"
                    >
                        <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-muted group-hover:bg-primary group-hover:text-black transition-all">
                            <Plus size={24} strokeWidth={3} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-base font-bold uppercase tracking-tighter text-text-muted group-hover:text-white transition-colors">New Node</h3>
                        </div>
                    </motion.button>
                </div>
            </motion.main>

            {/* Modal Layer */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[10001] flex items-end md:items-center justify-center p-0 md:p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowModal(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            className="relative bg-[#050505] border border-white/10 p-8 md:p-16 rounded-t-[3rem] md:rounded-[4rem] w-full max-w-2xl shadow-3xl overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="absolute top-0 right-0 p-16 opacity-[0.02] pointer-events-none">
                                <Plus size={400} />
                            </div>

                            <div className="relative z-10">
                                <div className="flex justify-between items-center mb-12">
                                    <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white">{editing ? 'ADJUST' : 'INJECT'} SIGNAL</h2>
                                    <button onClick={() => setShowModal(false)} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
                                        <X size={24} />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted ml-4 mb-3 block">Signal Identity</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. MONZO BANK"
                                                value={form.name}
                                                onChange={e => setForm({ ...form, name: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl outline-none focus:border-primary transition-all font-black text-lg uppercase tracking-wider text-white"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted ml-4 mb-3 block">Initial Momentum</label>
                                            <input
                                                type="number"
                                                placeholder="0.00"
                                                value={form.balance}
                                                onChange={e => setForm({ ...form, balance: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl outline-none focus:border-primary transition-all font-black text-2xl tabular-nums text-white"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted ml-4 mb-3 block">Node Architecture</label>
                                        <div className="grid grid-cols-3 gap-4">
                                            {[
                                                { id: 'bank', label: 'BANK', icon: '🏦' },
                                                { id: 'credit', label: 'CREDIT', icon: '💳' },
                                                { id: 'cash', label: 'CASH', icon: '💵' },
                                            ].map(type => (
                                                <button
                                                    key={type.id}
                                                    type="button"
                                                    onClick={() => setForm({ ...form, type: type.id })}
                                                    className={`p-6 rounded-3xl border transition-all flex flex-col items-center gap-3 ${form.type === type.id ? 'bg-primary border-primary text-black' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}
                                                >
                                                    <span className="text-3xl">{type.icon}</span>
                                                    <span className="text-[10px] font-black uppercase tracking-widest">{type.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {form.type === 'credit' && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="grid grid-cols-2 gap-8 overflow-hidden"
                                            >
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted ml-4 mb-3 block">Statement Cycle</label>
                                                    <input
                                                        type="number"
                                                        min="1" max="31"
                                                        value={form.billingDay || ''}
                                                        onChange={e => setForm({ ...form, billingDay: e.target.value })}
                                                        className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl outline-none focus:border-primary transition-all font-black text-white"
                                                        placeholder="Day (1-31)"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted ml-4 mb-3 block">Repayment Lock</label>
                                                    <input
                                                        type="number"
                                                        min="1" max="31"
                                                        value={form.dueDay || ''}
                                                        onChange={e => setForm({ ...form, dueDay: e.target.value })}
                                                        className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl outline-none focus:border-primary transition-all font-black text-white"
                                                        placeholder="Day (1-31)"
                                                    />
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="flex items-center gap-6 p-6 bg-white/5 rounded-3xl border border-white/10 cursor-pointer" onClick={() => setForm({ ...form, isSecret: !form.isSecret })}>
                                        <div
                                            className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${form.isSecret ? 'bg-primary' : 'bg-white/10'}`}
                                        >
                                            <div className={`w-6 h-6 rounded-full bg-white transition-all transform ${form.isSecret ? 'translate-x-6 shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]' : 'translate-x-0'}`} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-black text-white text-sm uppercase tracking-tighter">Vault Encryption</p>
                                            <p className="text-[9px] font-bold text-text-muted/60 uppercase tracking-widest mt-0.5">Obfuscate this node from standard protocols.</p>
                                        </div>
                                        <LockIcon size={20} className={form.isSecret ? 'text-primary' : 'text-text-muted/20'} />
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <button type="submit" className="h-20 bg-primary text-black flex-1 rounded-3xl font-black text-lg uppercase tracking-widest shadow-[0_0_50px_rgba(16,185,129,0.3)] hover:shadow-[0_0_60px_rgba(16,185,129,0.5)] transition-all">
                                            {editing ? 'FINALIZE UPDATE' : 'INJECT SIGNAL'}
                                        </button>
                                        {editing && (
                                            <button
                                                type="button"
                                                onClick={() => { if (confirm('Purge this node?')) deleteAccount(editing.id); setShowModal(false); }}
                                                className="w-20 h-20 rounded-3xl border-2 border-rose-500/20 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"
                                            >
                                                <Trash2 size={24} />
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Accounts;
