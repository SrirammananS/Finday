import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

const Categories = () => {
    const { categories = [], addCategory, deleteCategory, isLoading } = useFinance();
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', icon: '📦', color: '#CCFF00' });

    if (isLoading) return <div className="p-10 text-center uppercase tracking-widest opacity-20 text-[10px]">Scanning.Segments...</div>;

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
                <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 mb-2">Classification.Nodes</h2>
                <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-none text-kinetic">Segments<span className="text-toxic-lime">_</span></h1>
            </header>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {categories.map((cat, idx) => (
                    <motion.div
                        key={String(cat.name)}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.03 * idx }}
                        className="genz-card aspect-square p-6 flex flex-col items-center justify-center gap-4 relative group"
                    >
                        <div className="text-4xl md:text-5xl group-hover:scale-125 transition-transform duration-500">{cat.icon}</div>
                        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-center truncate w-full px-2">{cat.name}</p>

                        <button
                            onClick={() => { if (confirm(`Purge ${cat.name}?`)) deleteCategory(cat.name); }}
                            className="absolute top-3 right-3 text-white/0 group-hover:text-rose-500/40 transition-colors"
                        >
                            [X]
                        </button>
                    </motion.div>
                ))}

                <motion.button
                    onClick={() => setShowModal(true)}
                    className="genz-card aspect-square flex flex-col items-center justify-center gap-3 border-dashed border-2 border-white/10 hover:border-toxic-lime transition-all group"
                >
                    <div className="w-10 h-10 md:w-16 md:h-16 rounded-full border border-white/5 flex items-center justify-center text-xl md:text-3xl group-hover:bg-toxic-lime group-hover:text-black transition-all">+</div>
                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white/20 group-hover:text-white">New_Node</span>
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
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl md:text-4xl font-black tracking-tight">New_Segment</h2>
                                <button onClick={() => setShowModal(false)} className="text-white/20 hover:text-white">✕</button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
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
                                        type="text"
                                        placeholder="ICON (Emoji)"
                                        value={form.icon}
                                        onChange={e => setForm({ ...form, icon: e.target.value })}
                                        className="w-full bg-black/40 border border-white/5 p-5 md:p-6 rounded-2xl md:rounded-[1.5rem] outline-none focus:border-toxic-lime text-2xl text-center"
                                        required
                                    />
                                    <input
                                        type="color"
                                        value={form.color}
                                        onChange={e => setForm({ ...form, color: e.target.value })}
                                        className="w-full bg-black/40 border border-white/5 h-auto p-2 rounded-2xl md:rounded-[1.5rem] cursor-pointer"
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

export default Categories;
