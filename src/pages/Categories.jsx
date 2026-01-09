import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Trash2 } from 'lucide-react';

const Categories = () => {
    const { categories = [], addCategory, deleteCategory, isLoading } = useFinance();
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', icon: '📦', color: '#CCFF00' });

    if (isLoading) return <div className="p-10 text-center uppercase tracking-widest opacity-20 text-[10px] font-bold">Loading...</div>;

    const handleSubmit = async (e) => {
        e.preventDefault();
        await addCategory(form);
        setShowModal(false);
        setForm({ name: '', icon: '📦', color: '#CCFF00' });
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 py-12 md:px-6 md:py-20 max-w-4xl mx-auto min-h-screen pb-40"
        >
            <header className="mb-12 md:mb-20">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.5em] text-text-muted mb-2">Classification</h2>
                <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-none text-text-main">Categories<span className="text-primary">.</span></h1>
            </header>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {categories.map((cat, idx) => (
                    <motion.div
                        key={String(cat.name)}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.03 * idx }}
                        className="modern-card aspect-square p-6 flex flex-col items-center justify-center gap-4 relative group hover:scale-[1.02] transition-transform"
                    >
                        <div className="text-4xl md:text-5xl transition-transform duration-500">{cat.icon}</div>
                        <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-center truncate w-full px-2 text-text-main">{cat.name}</p>

                        <button
                            onClick={() => { if (confirm(`Delete ${cat.name}?`)) deleteCategory(cat.name); }}
                            className="absolute top-3 right-3 text-transparent group-hover:text-destructive/50 hover:!text-destructive transition-colors"
                        >
                            <Trash2 size={16} />
                        </button>
                    </motion.div>
                ))}

                <motion.button
                    onClick={() => setShowModal(true)}
                    className="modern-card aspect-square flex flex-col items-center justify-center gap-3 border-dashed border-2 border-card-border hover:border-primary transition-all group shadow-none hover:shadow-none bg-transparent"
                >
                    <div className="w-10 h-10 md:w-16 md:h-16 rounded-full border border-card-border flex items-center justify-center text-text-muted group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                        <Plus className="w-6 h-6 md:w-8 md:h-8" />
                    </div>
                    <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-text-muted group-hover:text-primary">New Category</span>
                </motion.button>
            </div>

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
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl md:text-4xl font-black tracking-tight text-text-main">New Category</h2>
                                <button onClick={() => setShowModal(false)} className="text-text-muted hover:text-text-main transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted ml-4 mb-2 block">Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Groceries"
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        className="w-full bg-canvas-subtle border border-card-border p-5 md:p-6 rounded-2xl md:rounded-[1.5rem] outline-none focus:border-primary text-lg font-bold text-text-main placeholder:text-text-muted/30 transition-all"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted ml-4 mb-2 block">Icon</label>
                                        <input
                                            type="text"
                                            placeholder="Emoji"
                                            value={form.icon}
                                            onChange={e => setForm({ ...form, icon: e.target.value })}
                                            className="w-full bg-canvas-subtle border border-card-border p-5 md:p-6 rounded-2xl md:rounded-[1.5rem] outline-none focus:border-primary text-2xl text-center text-text-main transition-all"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted ml-4 mb-2 block">Color Tag</label>
                                        <div className="h-full flex items-center">
                                            <input
                                                type="color"
                                                value={form.color}
                                                onChange={e => setForm({ ...form, color: e.target.value })}
                                                className="w-full h-[64px] bg-canvas-subtle border border-card-border p-2 rounded-2xl md:rounded-[1.5rem] cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <button type="submit" className="modern-btn modern-btn-primary flex-1 py-5 md:py-6 text-base tracking-widest">CREATE</button>
                                    <button type="button" onClick={() => setShowModal(false)} className="modern-btn bg-canvas-subtle text-text-muted hover:text-text-main px-6">CANCEL</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default Categories;
