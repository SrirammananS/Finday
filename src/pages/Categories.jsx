import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Trash2, Tag, Fingerprint, Layers, Sparkles, TrendingUp, TrendingDown, PieChart } from 'lucide-react';

const Categories = () => {
    const { categories = [], transactions = [], addCategory, deleteCategory, isLoading } = useFinance();
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', icon: '📦', color: '#CCFF00' });

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(Math.abs(amount) || 0);
    };

    const incomeList = transactions.filter(t => t.type === 'income' || t.amount > 0);
    const expenses = transactions.filter(t => t.type === 'expense' || t.amount < 0);
    const totalIncome = incomeList.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalExpenses = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    React.useEffect(() => {
        if (showModal) document.body.classList.add('overflow-hidden');
        else document.body.classList.remove('overflow-hidden');
    }, [showModal]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        await addCategory(form);
        setShowModal(false);
        setForm({ name: '', icon: '📦', color: '#CCFF00' });
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-canvas">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
        </div>
    );

    return (
        <div className="min-h-screen text-text-main selection:bg-primary selection:text-black">
            {/* Background handled by Layout */}

            <motion.main
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative px-5 py-12 md:px-8 md:py-24 max-w-5xl mx-auto pb-40"
            >
                {/* Header Section */}
                <header className="mb-16 md:mb-24">
                    <div className="grid grid-cols-3 gap-2 mb-10 items-stretch">
                        <div className="p-4 rounded-2xl bg-emerald-500/[0.03] border border-emerald-500/10 flex flex-col justify-between group transition-all hover:bg-emerald-500/[0.05]">
                            <div className="flex justify-between items-start">
                                <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-emerald-500/60">INFLOW</span>
                                <TrendingUp size={14} className="text-emerald-500 group-hover:scale-125 transition-transform" />
                            </div>
                            <div>
                                <h3 className="text-lg font-extrabold text-emerald-400 tabular-nums tracking-tight leading-none">{formatCurrency(totalIncome)}</h3>
                                <p className="text-[7px] font-bold uppercase tracking-widest text-emerald-500/30 mt-1">{incomeList.length} STREAMS</p>
                            </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-rose-500/[0.03] border border-rose-500/10 flex flex-col justify-between group transition-all hover:bg-rose-500/[0.05]">
                            <div className="flex justify-between items-start">
                                <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-rose-500/60">OUTFLOW</span>
                                <TrendingDown size={14} className="text-rose-500 group-hover:scale-125 transition-transform" />
                            </div>
                            <div>
                                <h3 className="text-lg font-extrabold text-rose-400 tabular-nums tracking-tight leading-none">{formatCurrency(totalExpenses)}</h3>
                                <p className="text-[7px] font-bold uppercase tracking-widest text-rose-500/30 mt-1">{expenses.length} STREAMS</p>
                            </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-primary/[0.03] border border-primary/10 flex flex-col justify-between group transition-all hover:bg-primary/[0.05]">
                            <div className="flex justify-between items-start">
                                <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-primary/60">NET</span>
                                <PieChart size={14} className="text-primary group-hover:scale-125 transition-transform" />
                            </div>
                            <div>
                                <h3 className={`text-lg font-extrabold tabular-nums tracking-tight leading-none ${totalIncome >= totalExpenses ? 'text-primary' : 'text-rose-400'}`}>
                                    {totalIncome >= totalExpenses ? '+' : '-'}{formatCurrency(Math.abs(totalIncome - totalExpenses))}
                                </h3>
                                <p className="text-[7px] font-bold uppercase tracking-widest text-primary/30 mt-1">TOTAL</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
                            <Layers size={24} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted">Classification</span>
                    </div>
                    <h1 className="text-xl font-black tracking-[-0.04em] leading-none mb-1 transition-all text-text-main uppercase">
                        Categories
                    </h1>
                    <p className="text-[8px] font-semibold text-text-muted uppercase tracking-[0.4em] opacity-60">Classification Framework</p>
                </header>

                {/* Categories Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                    {categories.map((cat, idx) => (
                        <motion.div
                            key={String(cat.name)}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.05 * idx }}
                            className="group relative"
                        >
                            <div className="absolute -inset-[1px] rounded-[2rem] bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
                            <div className="relative aspect-square p-4 rounded-2xl bg-card border border-card-border flex flex-col items-center justify-center gap-2 transition-all group-hover:bg-canvas-elevated group-hover:-translate-y-1">
                                <span className="text-3xl group-hover:scale-125 transition-transform duration-500">{cat.icon}</span>
                                <div className="text-center">
                                    <h3 className="text-sm font-black uppercase tracking-tighter text-text-main group-hover:text-primary transition-colors">{cat.name}</h3>
                                    <div className="flex items-center justify-center gap-1.5 mt-2 opacity-30 group-hover:opacity-60 transition-all">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                                        <span className="text-[8px] font-black uppercase tracking-widest">Active Link</span>
                                    </div>
                                </div>

                                <button
                                    onClick={(e) => { e.stopPropagation(); if (confirm(`Purge signal tag ${cat.name}?`)) deleteCategory(cat.name); }}
                                    className="absolute bottom-6 right-6 p-2 rounded-full text-rose-500/0 group-hover:text-rose-500/40 hover:!text-rose-500 hover:bg-rose-500/10 transition-all"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </motion.div>
                    ))}

                    <motion.button
                        onClick={() => setShowModal(true)}
                        className="group relative aspect-square p-4 rounded-2xl border-2 border-dashed border-card-border flex flex-col items-center justify-center gap-2 transition-all hover:border-primary/50 hover:bg-primary/[0.02]"
                    >
                        <div className="w-10 h-10 rounded-full bg-canvas-subtle border border-card-border flex items-center justify-center text-text-muted group-hover:bg-primary group-hover:text-black transition-all">
                            <Plus size={20} />
                        </div>
                        <div className="text-center">
                            <h3 className="text-sm font-black uppercase tracking-tighter text-text-muted group-hover:text-text-main">New Tag</h3>
                            <p className="text-[8px] font-black uppercase tracking-widest text-text-muted/40 mt-1">Create Category</p>
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
                            className="relative bg-card border border-card-border p-8 md:p-16 rounded-t-[3rem] md:rounded-[4rem] w-full max-w-xl shadow-3xl overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="absolute top-0 right-0 p-16 opacity-[0.02] pointer-events-none">
                                <Sparkles size={300} />
                            </div>

                            <div className="relative z-10">
                                <div className="flex justify-between items-center mb-12">
                                    <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-text-main">NEW SIGNAL TAG</h2>
                                    <button onClick={() => setShowModal(false)} className="w-12 h-12 rounded-full bg-canvas-subtle border border-card-border flex items-center justify-center hover:bg-canvas-elevated transition-all">
                                        <X size={24} />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-10">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted ml-4 block">Tag Identity</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. LUXURY"
                                            value={form.name}
                                            onChange={e => setForm({ ...form, name: e.target.value })}
                                            className="w-full h-20 bg-canvas-subtle border border-card-border px-8 rounded-3xl outline-none focus:border-primary transition-all font-black text-xl text-text-main uppercase tracking-widest"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted ml-4 block">Visual Icon</label>
                                            <input
                                                type="text"
                                                placeholder="Emoji"
                                                value={form.icon}
                                                onChange={e => setForm({ ...form, icon: e.target.value })}
                                                className="w-full h-20 bg-canvas-subtle border border-card-border px-8 rounded-3xl outline-none focus:border-primary transition-all font-black text-3xl text-center"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted ml-4 block">Color Node</label>
                                            <div className="h-20 w-full bg-canvas-subtle border border-card-border rounded-3xl p-3 flex items-center justify-center cursor-pointer relative">
                                                <input
                                                    type="color"
                                                    value={form.color}
                                                    onChange={e => setForm({ ...form, color: e.target.value })}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                />
                                                <div className="w-full h-full rounded-2xl flex items-center justify-center font-black text-[10px] tracking-widest text-black" style={{ backgroundColor: form.color }}>
                                                    {form.color.toUpperCase()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 pt-6">
                                        <button type="submit" className="h-20 bg-primary text-black flex-1 rounded-3xl font-black text-lg uppercase tracking-widest shadow-[0_0_50px_rgba(16,185,129,0.3)] hover:shadow-[0_0_60px_rgba(16,185,129,0.5)] transition-all">
                                            ADD CATEGORY
                                        </button>
                                        <button type="button" onClick={() => setShowModal(false)} className="h-20 px-12 rounded-3xl border border-card-border text-[10px] font-black uppercase tracking-widest hover:bg-canvas-subtle transition-all">
                                            CANCEL
                                        </button>
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

export default Categories;
