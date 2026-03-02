import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { motion, AnimatePresence } from 'framer-motion';
import PageLayout from '../components/PageLayout';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/ui/StatCard';
import { Users, TrendingUp, TrendingDown, X, CheckCircle2, Trash2, ArrowDownLeft, ArrowUpRight, ArrowRight, ShieldCheck, UserPlus, SlidersHorizontal, History, Link2 } from 'lucide-react';
import { friendsService } from '../services/friendsService';
import { calculateFriendBalances } from '../utils/friendBalances';
import { format, subDays, addDays } from 'date-fns';

const Friends = () => {
    const { transactions = [], updateTransaction } = useFinance();
    const [filter, setFilter] = useState('all');
    const [showManage, setShowManage] = useState(false);
    const [friends, setFriends] = useState([]);
    const [newFriendName, setNewFriendName] = useState('');

    // Settle modal state
    const [showSettleModal, setShowSettleModal] = useState(false);
    const [settlingFriend, setSettlingFriend] = useState(null);
    const [selectedSettleTxId, setSelectedSettleTxId] = useState(null);

    // Activity modal state
    const [showActivityModal, setShowActivityModal] = useState(null);

    // Load and sync friends
    useEffect(() => {
        friendsService.syncFromTransactions(transactions);
        queueMicrotask(() => setFriends(friendsService.getAll()));
    }, [transactions]);

    // Calculate friend balances from ALL transactions
    const friendBalances = useMemo(() => {
        const balances = calculateFriendBalances(transactions);
        return Object.values(balances);
    }, [transactions]);

    // Filter friends list
    const friendsList = useMemo(() => {
        let filtered = [...friendBalances];
        if (filter === 'owes_me') filtered = filtered.filter(f => f.balance > 0);
        else if (filter === 'i_owe') filtered = filtered.filter(f => f.balance < 0);
        return filtered.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
    }, [friendBalances, filter]);

    // Summary stats
    const summary = useMemo(() => {
        const totalOwedToMe = friendBalances.reduce((sum, f) => sum + Math.max(0, f.balance), 0);
        const totalIOwe = friendBalances.reduce((sum, f) => sum + Math.abs(Math.min(0, f.balance)), 0);
        return { totalOwedToMe, totalIOwe, netBalance: totalOwedToMe - totalIOwe };
    }, [friendBalances]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(Math.abs(amount) || 0);
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    };

    const handleAddFriend = () => {
        if (newFriendName.trim()) {
            friendsService.add(newFriendName);
            setFriends(friendsService.getAll());
            setNewFriendName('');
        }
    };

    const handleDeleteFriend = (id) => {
        friendsService.delete(id);
        setFriends(friendsService.getAll());
    };

    const openSettle = (friend) => {
        setSettlingFriend(friend);
        setSelectedSettleTxId(null);
        setShowSettleModal(true);
    };

    // Matching transactions - same type (income/expense) and amount within tolerance, not already tagged
    const matchingSettleTransactions = useMemo(() => {
        if (!settlingFriend) return [];
        const isTheyPaidMe = settlingFriend.balance > 0;
        const targetAmt = Math.abs(settlingFriend.balance);

        const now = new Date();
        const start = subDays(now, 30);
        const end = addDays(now, 5);

        const matches = transactions.filter(t => {
            const txDate = new Date(t.date);
            if (txDate < start || txDate > end) return false;
            const txAmt = parseFloat(t.amount) || 0;
            const txAbs = Math.abs(txAmt);
            const amtMatch = Math.abs(txAbs - targetAmt) <= (targetAmt || 1) * 0.15;
            const typeMatch = isTheyPaidMe ? txAmt > 0 : txAmt < 0;
            const notAlreadyTagged = !t.friend || t.friend.toLowerCase() !== settlingFriend.name.toLowerCase();
            return typeMatch && amtMatch && notAlreadyTagged;
        });

        return matches.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);
    }, [settlingFriend, transactions]);

    const handleSettle = async () => {
        if (!selectedSettleTxId || !settlingFriend) return;

        const tx = transactions.find(t => t.id === selectedSettleTxId);
        if (tx) {
            await updateTransaction({ ...tx, friend: settlingFriend.name });
        }

        setShowSettleModal(false);
        setSettlingFriend(null);
        setSelectedSettleTxId(null);
    };

    return (
        <div className="min-h-screen text-text-main selection:bg-primary selection:text-black">
            <PageLayout>
                <PageHeader
                    badge="Social"
                    title="Friends"
                    subtitle="Settle balances between contacts"
                    icon={Users}
                    actions={
                        <button
                            onClick={() => setShowManage(true)}
                            className="h-10 px-6 rounded-xl text-xs font-bold uppercase tracking-wider bg-canvas-subtle border border-card-border text-text-muted hover:border-primary hover:text-primary transition-all flex items-center gap-2"
                        >
                            <SlidersHorizontal size={14} />
                            Manage
                        </button>
                    }
                />

                {/* Status Summary */}
                    {friendBalances.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 md:mb-8">
                        <StatCard label="They owe me" value={formatCurrency(summary.totalOwedToMe)} icon={TrendingUp} variant="income" />
                        <StatCard label="I owe them" value={formatCurrency(summary.totalIOwe)} icon={TrendingDown} variant="expense" />
                        <StatCard
                            label="Net"
                            value={`${summary.netBalance >= 0 ? '+' : ''}${formatCurrency(summary.netBalance)}`}
                            icon={ShieldCheck}
                            variant={summary.netBalance >= 0 ? 'primary' : 'expense'}
                        />
                    </div>
                )}

                {/* Filter */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                    <div className="flex gap-2 p-1 bg-canvas-subtle border border-card-border rounded-xl">
                        {[
                            { key: 'all', label: 'All' },
                            { key: 'owes_me', label: 'They owe me' },
                            { key: 'i_owe', label: 'I owe them' },
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setFilter(tab.key)}
                                className={`h-10 px-6 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2 shrink-0
                                    ${filter === tab.key ? 'bg-primary text-primary-foreground' : 'text-text-muted hover:text-text-main'}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Friend Cards Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    <button
                        onClick={() => setShowManage(true)}
                        className="group rounded-[1.8rem] border-2 border-dashed border-white/10 hover:border-primary/50 hover:bg-primary/[0.02] transition-all flex flex-col items-center justify-center gap-3 min-h-[120px] h-full"
                    >
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-text-muted group-hover:bg-primary group-hover:text-black transition-all">
                            <UserPlus size={20} strokeWidth={3} />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-tighter text-text-muted group-hover:text-text-main">Manage</span>
                    </button>

                    {friendsList.length === 0 && friendBalances.length === 0 && (
                        <div className="col-span-full md:col-span-2 lg:col-span-3 py-16 rounded-2xl bg-card border border-dashed border-card-border text-center">
                            <Users size={40} className="mx-auto text-text-muted/30 mb-4" />
                            <h3 className="text-base font-bold text-text-muted">No friends with balances</h3>
                            <p className="text-sm text-text-muted/60 mt-1">Add transactions with friend names to track splits</p>
                            <button
                                onClick={() => setShowManage(true)}
                                className="mt-6 h-12 px-8 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:shadow-lg transition-all"
                            >
                                Add friend
                            </button>
                        </div>
                    )}

                    {friendsList.map((friend, idx) => (
                        <motion.div
                            key={friend.name}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.05 * idx }}
                            className="group relative"
                        >
                            <div className="absolute -inset-[1px] bg-gradient-to-br from-white/10 to-transparent rounded-[2rem] opacity-0 group-hover:opacity-100 transition-all duration-500" />
                            <div className={`relative p-4 md:p-6 rounded-2xl bg-card border flex flex-col justify-between gap-3 overflow-hidden transition-all hover:bg-canvas-elevated hover:border-primary/20 h-full min-h-[150px] ${friend.balance > 0 ? 'border-primary/20' : friend.balance < 0 ? 'border-rose-500/20' : 'border-card-border'}`}>
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs transition-all shrink-0 ${friend.balance > 0 ? 'bg-primary/20 text-primary' : friend.balance < 0 ? 'bg-rose-500/20 text-rose-500' : 'bg-canvas-subtle border border-card-border text-text-muted'}`}>
                                            {friend.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-xs font-black uppercase tracking-tight text-text-main leading-tight truncate">{friend.name}</h3>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${friend.balance > 0 ? 'text-primary' : friend.balance < 0 ? 'text-rose-500' : 'text-green-500'}`}>
                                                {friend.balance > 0 ? 'They owe me' : friend.balance < 0 ? 'I owe them' : 'Settled'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-1">
                                    <div className={`text-base md:text-lg font-black tabular-nums leading-none ${friend.balance > 0 ? 'text-primary' : friend.balance < 0 ? 'text-rose-500' : 'text-green-500'}`}>
                                        {formatCurrency(friend.balance)}
                                    </div>
                                    {friend.balance !== 0 && (
                                        <button
                                            onClick={() => openSettle(friend)}
                                            className={`mt-3 h-9 px-4 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all w-full
                                                ${friend.balance > 0
                                                    ? 'bg-primary text-primary-foreground hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.5)]'
                                                    : 'bg-rose-500 text-white hover:shadow-rose-500/30'
                                                }`}
                                        >
                                            {friend.balance > 0 ? 'Record payment' : 'I paid them'}
                                        </button>
                                    )}
                                </div>

                                <div className="border-t border-card-border pt-3 mt-auto flex items-center justify-between">
                                    <button
                                        onClick={() => setShowActivityModal(friend)}
                                        className="text-[8px] font-black uppercase tracking-widest text-text-muted hover:text-primary transition-all flex items-center gap-1"
                                    >
                                        Activity ({friend.transactionCount}) <ArrowRight size={10} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </PageLayout>

            {/* Manage Modal */}
            <AnimatePresence>
                {showManage && (
                    <div className="fixed inset-0 z-[10001] flex items-end md:items-center justify-center p-0 md:p-6" data-modal-overlay>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowManage(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            className="relative bg-card border border-card-border p-8 md:p-16 rounded-t-[3rem] md:rounded-[4rem] w-full max-w-2xl shadow-3xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-12">
                                <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-text-main uppercase">Manage Friends</h2>
                                <button onClick={() => setShowManage(false)} className="w-12 h-12 rounded-full bg-canvas-subtle border border-card-border flex items-center justify-center hover:bg-canvas-elevated transition-all">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="mb-10">
                                <div className="flex gap-4">
                                    <input
                                        type="text"
                                        value={newFriendName}
                                        onChange={e => setNewFriendName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddFriend()}
                                        placeholder="Friend's name..."
                                        className="flex-1 h-16 bg-canvas-subtle border border-card-border px-6 rounded-2xl outline-none focus:border-primary transition-all font-bold text-base text-text-main"
                                    />
                                    <button
                                        onClick={handleAddFriend}
                                        className="w-16 h-16 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.5)] transition-all shrink-0"
                                    >
                                        <UserPlus size={24} />
                                    </button>
                                </div>
                            </div>

                            <div className="max-h-[40vh] overflow-y-auto no-scrollbar space-y-3">
                                {friends.map(f => {
                                    const balanceInfo = friendBalances.find(fb => fb.name.toLowerCase() === f.name.toLowerCase());
                                    return (
                                        <div key={f.id} className="p-4 rounded-2xl bg-canvas-subtle border border-card-border flex items-center justify-between group/friendItem">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-2xl bg-canvas-elevated flex items-center justify-center text-xs font-black uppercase tracking-widest text-text-muted">
                                                    {f.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-black text-text-main uppercase tracking-tight">{f.name}</p>
                                                    {balanceInfo && (
                                                        <p className={`text-xs font-bold ${balanceInfo.balance > 0 ? 'text-primary' : balanceInfo.balance < 0 ? 'text-rose-500' : 'text-text-muted/60'
                                                            }`}>
                                                            {balanceInfo.balance > 0 ? `They owe ₹${Math.round(balanceInfo.balance)}` : balanceInfo.balance < 0 ? `I owe ₹${Math.round(Math.abs(balanceInfo.balance))}` : 'Settled'}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteFriend(f.id)}
                                                className="w-10 h-10 rounded-full flex items-center justify-center text-text-muted/20 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Settle Modal */}
            <AnimatePresence>
                {showSettleModal && settlingFriend && (
                    <div className="fixed inset-0 z-[10002] flex items-center justify-center p-6" data-modal-overlay>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowSettleModal(false)}
                            className="absolute inset-0 bg-black/90 backdrop-blur-2xl"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-md bg-card border border-card-border p-10 rounded-[3rem] shadow-3xl text-center"
                            onClick={e => e.stopPropagation()}
                        >
                            {(() => {
                                const isTheyPaidMe = settlingFriend.balance > 0;
                                return (
                                    <>
                                        <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${isTheyPaidMe ? 'bg-primary/10 border border-primary/20 text-primary' : 'bg-rose-500/10 border border-rose-500/20 text-rose-500'}`}>
                                            <Link2 size={48} />
                                        </div>
                                        <h3 className="text-2xl font-black text-text-main uppercase tracking-tighter mb-2">
                                            {isTheyPaidMe ? 'Record payment' : 'I paid them'}
                                        </h3>
                                        <p className="text-xs font-medium text-text-muted mb-6">
                                            Link to an existing transaction — no new transaction added
                                        </p>

                                        <div className="mb-6">
                                            <div className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">Select transaction</div>
                                            {matchingSettleTransactions.length > 0 ? (
                                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                                    {matchingSettleTransactions.map(tx => (
                                                        <button
                                                            key={tx.id}
                                                            type="button"
                                                            onClick={() => setSelectedSettleTxId(selectedSettleTxId === tx.id ? null : tx.id)}
                                                            className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${selectedSettleTxId === tx.id ? 'border-primary bg-primary/10' : 'border-card-border bg-canvas-subtle hover:border-primary/30'}`}
                                                        >
                                                            <div>
                                                                <p className="text-sm font-bold text-text-main line-clamp-1">{tx.description}</p>
                                                                <p className="text-xs text-text-muted">{format(new Date(tx.date), 'dd MMM yyyy')}</p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-bold tabular-nums">{formatCurrency(tx.amount)}</span>
                                                                {selectedSettleTxId === tx.id && <CheckCircle2 size={16} className="text-primary" />}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-text-muted text-center py-6 bg-canvas-subtle rounded-2xl">No matching transactions in last 30 days. Add the transaction in Ledger first, then link it here.</p>
                                            )}
                                        </div>

                                        <button
                                            onClick={handleSettle}
                                            disabled={!selectedSettleTxId}
                                            className={`w-full h-14 rounded-2xl font-black text-base uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isTheyPaidMe ? 'bg-primary text-primary-foreground shadow-[0_0_50px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_0_60px_rgba(var(--primary-rgb),0.5)]' : 'bg-rose-500 text-white shadow-rose-500/20 hover:shadow-rose-500/30'}`}
                                        >
                                            Link & confirm
                                        </button>
                                        <button
                                            onClick={() => setShowSettleModal(false)}
                                            className="mt-4 text-xs font-bold uppercase tracking-wider text-text-muted hover:text-text-main transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </>
                                );
                            })()}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Activity Modal */}
            <AnimatePresence>
                {showActivityModal && (
                    <div className="fixed inset-0 z-[10002] flex items-end md:items-center justify-center p-0 md:p-6" data-modal-overlay>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowActivityModal(null)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            className="relative bg-card border border-card-border p-6 md:p-10 rounded-t-[3rem] md:rounded-[3rem] w-full max-w-md shadow-3xl max-h-[80vh] flex flex-col"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-black tracking-tighter text-text-main uppercase">Activity</h2>
                                <button onClick={() => setShowActivityModal(null)} className="w-10 h-10 rounded-full bg-canvas-subtle border border-card-border flex items-center justify-center hover:bg-canvas-elevated transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                            <p className="text-sm font-bold text-text-muted mb-4">{showActivityModal.name}</p>
                            <div className="divide-y divide-card-border/50 overflow-y-auto flex-1 min-h-0">
                                {(showActivityModal.history || [])
                                    .slice()
                                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                                    .map(t => (
                                        <div key={t.id} className="py-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${parseFloat(t.amount) < 0 ? 'bg-canvas-subtle text-text-main opacity-60' : 'bg-primary/20 text-primary'}`}>
                                                    {parseFloat(t.amount) < 0 ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-text-main">{t.description}</p>
                                                    <p className="text-xs text-text-muted">{formatDate(t.date)} • {t.category}</p>
                                                </div>
                                            </div>
                                            <div className={`text-sm font-bold tabular-nums ${parseFloat(t.amount) < 0 ? 'text-text-main opacity-70' : 'text-primary'}`}>
                                                {formatCurrency(t.amount)}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Friends;
