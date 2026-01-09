import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { motion } from 'framer-motion';
import { Users, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

const Friends = () => {
    const { transactions } = useFinance();

    // Calculate Friend Balances
    // Logic: 
    // Expense + Friend = I paid for Friend (Friend Owes Me) -> Positive
    // Income + Friend = Friend paid me (I Owe Friend/Settlement) -> Negative (reduces what they owe)

    // Actually, "Income" usually means money IN. 
    // If friend pays me back, money comes IN. That should REDUCE their debt to me.
    // If I borrow from friend (Income for me), I OWE them. So their balance should be NEGATIVE (from my perspective of "Net Worth").

    // Let's stick to "Positive = They Owe Me", "Negative = I Owe Them".

    const friendBalances = transactions.reduce((acc, t) => {
        if (!t.friend) return acc;

        const friend = t.friend.trim();
        if (!friend) return acc;

        if (!acc[friend]) acc[friend] = { name: friend, balance: 0, history: [] };

        // If Expense (I paid): +Amount (They owe me)
        // If Income (I received): -Amount (They paid me back OR I borrowed)
        const impact = t.type === 'expense' ? Math.abs(t.amount) : -Math.abs(t.amount);

        acc[friend].balance += impact;
        acc[friend].history.push(t);
        return acc;
    }, {});

    const friendsList = Object.values(friendBalances).sort((a, b) => b.balance - a.balance);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 py-12 md:px-6 md:py-20 max-w-4xl mx-auto min-h-screen pb-40"
        >
            <header className="mb-12 md:mb-20">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.5em] text-text-muted mb-2">Social</h2>
                <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-none text-text-main">Friends<span className="text-primary">.</span></h1>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {friendsList.length === 0 ? (
                    <div className="col-span-full text-center py-20 opacity-50">
                        <Users size={48} className="mx-auto mb-4 text-text-muted" />
                        <p className="text-sm font-bold text-text-muted">No friends tracked yet.</p>
                        <p className="text-xs text-text-muted/50 mt-1">Tag a friend in a transaction to see them here.</p>
                    </div>
                ) : (
                    friendsList.map(f => (
                        <motion.div
                            key={f.name}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="modern-card p-6 md:p-8"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-text-main mb-1">{f.name}</h3>
                                    <p className={`text-xs font-bold uppercase tracking-wider ${f.balance >= 0 ? 'text-primary' : 'text-red-500'}`}>
                                        {f.balance >= 0 ? 'Owes You' : 'You Owe'}
                                    </p>
                                </div>
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${f.balance >= 0 ? 'bg-primary/20 text-primary' : 'bg-red-500/20 text-red-500'}`}>
                                    {f.balance >= 0 ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
                                </div>
                            </div>

                            <div className="text-4xl font-black text-text-main mb-8">
                                <span className="text-2xl align-top text-text-muted opacity-50 mr-1">₹</span>
                                {Math.abs(f.balance).toLocaleString()}
                            </div>

                            <div className="space-y-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">Recent Activity</p>
                                {f.history.slice(0, 3).map(t => (
                                    <div key={t.id} className="flex justify-between items-center text-xs py-2 border-b border-card-border last:border-0">
                                        <span className="text-text-muted truncate max-w-[60%]">{t.description}</span>
                                        <span className={`font-bold ${t.type === 'expense' ? 'text-primary' : 'text-text-main'}`}>
                                            {t.type === 'expense' ? '+' : '-'}{Math.abs(t.amount)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </motion.div>
    );
};

export default Friends;
