import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, TrendingUp, TrendingDown, Target, Zap, BrainCircuit, BarChart3 } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

const SmartAnalytics = ({ isOpen, onClose }) => {
    const { transactions, categories } = useFinance();

    const analysis = useMemo(() => {
        if (!transactions || transactions.length === 0) return null;

        const expenses = transactions.filter(t => t.amount < 0);
        const income = transactions.filter(t => t.amount > 0);

        const totalExp = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const totalInc = income.reduce((sum, t) => sum + t.amount, 0);

        // Find highest spending category
        const catMap = {};
        expenses.forEach(t => {
            catMap[t.category] = (catMap[t.category] || 0) + Math.abs(t.amount);
        });

        const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];

        return {
            totalExp,
            totalInc,
            savingsRate: totalInc > 0 ? ((totalInc - totalExp) / totalInc * 100).toFixed(1) : 0,
            topCategory: topCat ? { name: topCat[0], amount: topCat[1] } : null,
            burnRate: (totalExp / 30).toFixed(0) // Daily average
        };
    }, [transactions]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                />

                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-2xl bg-card border border-card-border rounded-3xl overflow-hidden shadow-2xl"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-card-border bg-gradient-to-r from-primary/20 to-transparent flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                <BrainCircuit className="text-primary" size={20} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-text-main">Smart AI Analysis</h2>
                                <p className="text-xs text-text-muted">Real-time wealth insights</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-8 space-y-8">
                        {analysis ? (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="modern-card p-6 bg-primary/5 border-primary/20">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Savings Rate</p>
                                        <h3 className="text-3xl font-black text-text-main">{analysis.savingsRate}%</h3>
                                        <div className="mt-2 h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.max(0, Math.min(100, analysis.savingsRate))}%` }}
                                                className="h-full bg-primary"
                                            />
                                        </div>
                                    </div>
                                    <div className="modern-card p-6">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">Daily Burn Rate</p>
                                        <h3 className="text-3xl font-black text-rose-500">₹{Number(analysis.burnRate).toLocaleString()}</h3>
                                        <p className="text-[10px] text-text-muted mt-1">Average daily expense</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Zap size={16} className="text-yellow-500" />
                                        <h4 className="text-sm font-bold text-text-main">AI Recommendations</h4>
                                    </div>

                                    <div className="grid gap-3">
                                        {analysis.savingsRate < 20 && (
                                            <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex gap-4">
                                                <Target className="text-orange-500 shrink-0" size={20} />
                                                <p className="text-sm text-text-main">Your savings rate is below the 20% target. Consider reviewing your <b>{analysis.topCategory?.name}</b> spending.</p>
                                            </div>
                                        )}
                                        <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex gap-3">
                                            <BarChart3 className="text-primary shrink-0" size={20} />
                                            <p className="text-sm text-text-main">You've made {transactions.length} transactions this month. Your spending is <b>{analysis.totalExp > analysis.totalInc ? 'higher' : 'lower'}</b> than your income.</p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="py-20 text-center">
                                <Sparkles className="mx-auto mb-4 text-text-muted opacity-20" size={48} />
                                <p className="text-text-muted font-bold">Not enough data for analysis yet.</p>
                                <p className="text-xs text-text-muted/50 mt-1">Add some transactions to see AI magic.</p>
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-canvas-subtle/50 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">LAKSH Intelligence v1.0</p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default SmartAnalytics;
