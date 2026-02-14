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
        <div className="min-h-screen text-text-main selection:bg-primary selection:text-black">
            {/* Background handled by Layout */}

            <motion.main
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative px-5 py-12 md:px-8 md:py-24 max-w-5xl mx-auto pb-40 text-text-main"
            >
                {/* Header Layer */}
                <header className="mb-16">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 rounded-2xl bg-canvas-subtle border border-card-border text-primary">
                                    <Wallet size={24} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-text-muted">Central Vault</span>
                            </div>
                            <h1 className="text-xl font-black tracking-[-0.04em] leading-none mb-1 transition-all text-text-main uppercase">
                                Accounts
                            </h1>
                            <p className="text-[8px] font-semibold text-text-muted uppercase tracking-[0.4em] opacity-60">Financial Nodes</p>
                        </div>

                        <div className="mb-1">

                            {secretCount > 0 && (
                                <button
                                    onClick={toggleSecretUnlock}
                                    className={`group flex items-center gap-3 px-6 py-4 rounded-[1.5rem] border transition-all ${secretUnlocked ? 'bg-primary border-primary text-black' : 'bg-card border-card-border text-text-main hover:border-primary/50'}`}
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

                    {/* Summary Intelligence - Refined Cubes */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                        <div className="relative group p-6 rounded-[2rem] bg-card border border-card-border hover:bg-canvas-elevated transition-all flex flex-col justify-between h-32 md:h-40 overflow-hidden">
                            <Search className="absolute top-4 right-4 text-text-muted/20 group-hover:text-primary/40 transition-colors" size={24} />
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-text-muted">Search Node</span>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full bg-transparent border-b-2 border-card-border/50 py-2 text-lg font-black uppercase text-text-main placeholder:text-text-muted/20 outline-none focus:border-primary transition-all relative z-10"
                                />
                                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary scale-x-0 group-focus-within:scale-x-100 transition-transform origin-left" />
                            </div>
                        </div>

                        <div className="p-6 rounded-[2rem] bg-card border border-card-border hover:bg-canvas-elevated transition-all flex flex-col justify-between h-32 md:h-40">
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-500/80">Liquid Assets</span>
                            <div>
                                <h3 className="text-2xl md:text-3xl font-black text-text-main tabular-nums tracking-tighter leading-none">{formatCurrency(visibleAccounts.filter(a => a.type !== 'credit').reduce((sum, a) => sum + a.balance, 0))}</h3>
                            </div>
                        </div>

                        <div className="p-6 rounded-[2rem] bg-card border border-card-border hover:bg-canvas-elevated transition-all flex flex-col justify-between h-32 md:h-40">
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-rose-500/80">Leverage</span>
                            <div>
                                <h3 className="text-2xl md:text-3xl font-black text-text-main tabular-nums tracking-tighter leading-none">{formatCurrency(visibleAccounts.filter(a => a.type === 'credit').reduce((sum, a) => sum + a.balance, 0))}</h3>
                            </div>
                        </div>

                        <div className="p-6 rounded-[2rem] bg-primary/[0.05] border border-primary/20 hover:bg-primary/[0.08] transition-all flex flex-col justify-between h-32 md:h-40 relative overflow-hidden group">
                            <div className="absolute top-[-20%] right-[-10%] w-24 h-24 bg-primary/20 blur-[40px] rounded-full group-hover:bg-primary/30 transition-all" />
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">Net Valuation</span>
                            <div>
                                <h3 className="text-2xl md:text-3xl font-black text-primary tabular-nums tracking-tighter leading-none">{formatCurrency(totalBalance)}</h3>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Account Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {visibleAccounts.map((acc, idx) => {
                        const isCredit = acc.type === 'credit';
                        return (
                            <motion.div
                                key={String(acc.id)}
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.1 * idx }}
                            >
                                <div className="group relative">
                                    <div className="absolute -inset-[1px] bg-gradient-to-br from-primary/20 to-transparent rounded-[2rem] opacity-0 group-hover:opacity-100 transition-all duration-500" />
                                    <div className="relative p-4 md:p-5 rounded-[1.8rem] bg-card border border-card-border min-h-[120px] flex flex-col justify-between overflow-hidden transition-all group-hover:bg-canvas-elevated">
                                        <div className="absolute top-0 right-0 p-3 opacity-[0.015] -rotate-12 translate-x-2 translate-y-[-10%] group-hover:scale-110 transition-transform pointer-events-none">
                                            {acc.type === 'bank' ? <ShieldCheck size={80} /> : acc.type === 'credit' ? <CreditCard size={80} /> : <Banknote size={80} />}
                                        </div>

                                        <div className="relative z-10">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-xl bg-canvas-subtle border border-card-border flex items-center justify-center text-sm group-hover:border-primary/30 transition-all">
                                                        {acc.type === 'bank' ? '🏦' : acc.type === 'credit' ? '💳' : '💵'}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xs font-black uppercase tracking-tight text-text-main leading-tight truncate max-w-[80px] md:max-w-none">{acc.name}</h3>
                                                        <p className="text-[6px] font-black uppercase tracking-widest text-text-muted opacity-60">{acc.type}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => openEditModal(acc, e)}
                                                    className="w-7 h-7 rounded-full bg-canvas-subtle border border-card-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all -mr-1 -mt-1"
                                                >
                                                    <Plus size={12} className="rotate-45" />
                                                </button>
                                            </div>

                                            <div>
                                                <h3 className="text-base md:text-lg font-black tracking-tight text-text-main tabular-nums leading-none">
                                                    {formatCurrency(acc.balance)}
                                                </h3>
                                                {isCredit && (acc.billingDay || acc.dueDay) && (
                                                    <div className="flex gap-2.5 mt-2">
                                                        {acc.dueDay && (
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="w-1 h-1 rounded-full bg-rose-500 shadow-[0_0_4px_rgba(244,63,94,0.5)]" />
                                                                <span className="text-[7px] font-bold uppercase tracking-wider text-rose-400">Due: {acc.dueDay}</span>
                                                            </div>
                                                        )}
                                                        {acc.billingDay && (
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="w-1 h-1 rounded-full bg-text-muted/20" />
                                                                <span className="text-[7px] font-black uppercase tracking-wider text-text-muted">Bill: {acc.billingDay}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="relative z-10 border-t border-card-border mt-3 pt-3 flex items-center justify-between">
                                            <Link
                                                to={`/accounts/${acc.id}`}
                                                className="text-[8px] font-black uppercase tracking-widest text-text-muted hover:text-primary transition-all flex items-center gap-1"
                                            >
                                                History <ArrowRight size={10} />
                                            </Link>
                                            {acc.isSecret && (
                                                <LockIcon size={10} className="text-primary/60" />
                                            )}
                                        </div>
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
                            className="p-5 rounded-[1.8rem] bg-card border-2 border-dashed border-card-border flex flex-col items-center justify-center gap-3 text-center hover:border-primary/50 transition-all group min-h-[120px] h-full"
                        >
                            <div className="w-10 h-10 rounded-xl bg-canvas-subtle border border-card-border flex items-center justify-center text-text-muted group-hover:text-primary transition-all">
                                <LockIcon size={20} />
                            </div>
                            <div className="space-y-0.5">
                                <h3 className="text-sm font-black uppercase tracking-tighter text-text-muted group-hover:text-text-main transition-colors">
                                    {hiddenAccounts.length} Secret Node{hiddenAccounts.length > 1 ? 's' : ''}
                                </h3>
                                <p className="text-[6px] font-bold uppercase tracking-widest text-text-muted/40">Vault protocol active.</p>
                            </div>
                        </motion.button>
                    )}

                    <motion.button
                        onClick={() => { setEditing(null); setForm({ name: '', type: 'bank', balance: '', billingDay: '', dueDay: '' }); setShowModal(true); }}
                        className="p-5 rounded-[1.8rem] bg-transparent border-2 border-dashed border-card-border flex flex-col items-center justify-center gap-3 text-center hover:border-primary/50 transition-all group min-h-[120px] h-full"
                    >
                        <div className="w-10 h-10 rounded-xl bg-canvas-subtle border border-card-border flex items-center justify-center text-text-muted group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                            <Plus size={20} strokeWidth={3} />
                        </div>
                        <div className="space-y-0.5">
                            <h3 className="text-xs font-bold uppercase tracking-tighter text-text-muted group-hover:text-text-main transition-colors">New Node</h3>
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
                            className="relative bg-card border border-card-border p-8 md:p-16 rounded-t-[3rem] md:rounded-[4rem] w-full max-w-2xl shadow-3xl overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="absolute top-0 right-0 p-16 opacity-[0.02] pointer-events-none">
                                <Plus size={400} />
                            </div>

                            <div className="relative z-10">
                                <div className="flex justify-between items-center mb-12">
                                    <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-text-main">{editing ? 'ADJUST' : 'INJECT'} SIGNAL</h2>
                                    <button onClick={() => setShowModal(false)} className="w-12 h-12 rounded-full bg-canvas-subtle border border-card-border flex items-center justify-center hover:bg-canvas-elevated transition-all">
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
                                                className="w-full bg-canvas-subtle border border-card-border p-6 rounded-3xl outline-none focus:border-primary transition-all font-black text-lg uppercase tracking-wider text-text-main"
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
                                                className="w-full bg-canvas-subtle border border-card-border p-6 rounded-3xl outline-none focus:border-primary transition-all font-black text-2xl tabular-nums text-text-main"
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
                                                    className={`p-6 rounded-3xl border transition-all flex flex-col items-center gap-3 ${form.type === type.id ? 'bg-primary border-primary text-primary-foreground' : 'bg-canvas-subtle border-card-border text-text-main hover:bg-canvas-elevated'}`}
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
                                                        className="w-full bg-canvas-subtle border border-card-border p-6 rounded-3xl outline-none focus:border-primary transition-all font-black text-text-main"
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
                                                        className="w-full bg-canvas-subtle border border-card-border p-6 rounded-3xl outline-none focus:border-primary transition-all font-black text-text-main"
                                                        placeholder="Day (1-31)"
                                                    />
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="flex items-center gap-6 p-6 bg-canvas-subtle rounded-3xl border border-card-border cursor-pointer" onClick={() => setForm({ ...form, isSecret: !form.isSecret })}>
                                        <div
                                            className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${form.isSecret ? 'bg-primary' : 'bg-card'}`}
                                        >
                                            <div className={`w-6 h-6 rounded-full bg-white transition-all transform ${form.isSecret ? 'translate-x-6 shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]' : 'translate-x-0'}`} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-black text-text-main text-sm uppercase tracking-tighter">Vault Encryption</p>
                                            <p className="text-[9px] font-bold text-text-muted/60 uppercase tracking-widest mt-0.5">Obfuscate this node from standard protocols.</p>
                                        </div>
                                        <LockIcon size={20} className={form.isSecret ? 'text-primary' : 'text-text-muted/20'} />
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <button type="submit" className="h-20 bg-primary text-primary-foreground flex-1 rounded-3xl font-black text-lg uppercase tracking-widest shadow-[0_0_50px_rgba(16,185,129,0.3)] hover:shadow-[0_0_60px_rgba(16,185,129,0.5)] transition-all">
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
