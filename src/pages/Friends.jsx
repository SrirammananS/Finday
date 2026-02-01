import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, TrendingUp, TrendingDown, X, CheckCircle2, Plus, Trash2, Edit2, ArrowDownLeft, ArrowUpRight, ShieldCheck, UserPlus, SlidersHorizontal, History, DollarSign } from 'lucide-react';
import { friendsService } from '../services/friendsService';
import { calculateFriendBalances } from '../utils/friendBalances';

const Friends = () => {
    const { transactions = [], accounts = [], addTransaction } = useFinance();
    const [selectedFriend, setSelectedFriend] = useState(null);
    const [filter, setFilter] = useState('all');
    const [showManage, setShowManage] = useState(false);
    const [friends, setFriends] = useState([]);
    const [newFriendName, setNewFriendName] = useState('');

    // Settle modal state
    const [showSettleModal, setShowSettleModal] = useState(false);
    const [settlingFriend, setSettlingFriend] = useState(null);
    const [settleAmount, setSettleAmount] = useState('');

    // Load and sync friends
    useEffect(() => {
        friendsService.syncFromTransactions(transactions);
        setFriends(friendsService.getAll());
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

    const handleSettle = async () => {
        if (!settleAmount || !settlingFriend) return;
        const amount = parseFloat(settleAmount);
        if (amount <= 0) return;

        await addTransaction({
            date: new Date().toISOString().split('T')[0],
            description: `Settlement: ${settlingFriend.name}`,
            amount: amount,
            category: 'Transfer',
            accountId: accounts[0]?.id || '',
            type: 'income',
            friend: settlingFriend.name
        });

        setShowSettleModal(false);
        setSettleAmount('');
        setSettlingFriend(null);
    };

    const openSettle = (friend) => {
        setSettlingFriend(friend);
        setSettleAmount(Math.abs(friend.balance).toString());
        setShowSettleModal(true);
    };

    return (
        <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-black">
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

            <motion.main
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative px-5 py-12 md:px-8 md:py-24 max-w-5xl mx-auto pb-40"
            >
                {/* Header Section */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
                                <Users size={24} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-text-muted">Social Ledger Protocol</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black tracking-tighter leading-none mb-4 uppercase">
                            Frien<span className="text-primary tracking-[-0.05em]">ds</span>.
                        </h1>
                        <p className="text-sm text-text-muted font-bold tracking-tight opacity-60">Synchronizing interpersonal liquidity nodes.</p>
                    </div>

                    <div className="flex flex-col items-end gap-4">
                        <button
                            onClick={() => setShowManage(true)}
                            className="h-14 px-8 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] bg-white/5 border border-white/10 text-text-muted hover:border-primary hover:text-primary transition-all flex items-center gap-3"
                        >
                            <SlidersHorizontal size={16} />
                            PROTOCOL SETTINGS
                        </button>
                    </div>
                </header>

                {/* Status Summary */}
                {friendBalances.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
                        <div className="group relative p-8 rounded-[2.5rem] bg-[#080808] border border-white/5 flex flex-col justify-between min-h-[160px] overflow-hidden transition-all hover:bg-[#0a0a0a]">
                            <TrendingUp className="absolute top-[-20%] right-[-10%] opacity-[0.02] -rotate-12 group-hover:scale-110 transition-transform" size={160} />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">RECEIVABLES</span>
                            <div>
                                <h3 className="text-2xl md:text-3xl font-black text-primary tabular-nums tracking-tighter leading-none">{formatCurrency(summary.totalOwedToMe)}</h3>
                                <p className="text-[9px] font-black uppercase tracking-widest text-primary/30 mt-2">LINKED INFLOWS</p>
                            </div>
                        </div>
                        <div className="group relative p-8 rounded-[2.5rem] bg-[#080808] border border-white/5 flex flex-col justify-between min-h-[160px] overflow-hidden transition-all hover:bg-[#0a0a0a]">
                            <TrendingDown className="absolute top-[-20%] right-[-10%] opacity-[0.02] -rotate-12 group-hover:scale-110 transition-transform" size={160} />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-500">PAYABLES</span>
                            <div>
                                <h3 className="text-2xl md:text-3xl font-black text-rose-500 tabular-nums tracking-tighter leading-none">{formatCurrency(summary.totalIOwe)}</h3>
                                <p className="text-[9px] font-black uppercase tracking-widest text-rose-500/30 mt-2">LINKED OUTFLOWS</p>
                            </div>
                        </div>
                        <div className="group relative p-8 rounded-[2.5rem] bg-[#080808] border border-white/5 flex flex-col justify-between min-h-[160px] overflow-hidden transition-all hover:bg-[#0a0a0a]">
                            <ShieldCheck className="absolute top-[-20%] right-[-10%] opacity-[0.02] -rotate-12 group-hover:scale-110 transition-transform" size={160} />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">NET DELTA</span>
                            <div>
                                <h3 className={`text-2xl md:text-3xl font-black tabular-nums tracking-tighter leading-none ${summary.netBalance >= 0 ? 'text-white' : 'text-rose-400'}`}>
                                    {summary.netBalance >= 0 ? '+' : ''}{formatCurrency(summary.netBalance)}
                                </h3>
                                <p className="text-[9px] font-black uppercase tracking-widest text-text-muted/30 mt-2">SYSTEM BALANCE</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Filter and Hub */}
                <div className="flex flex-col md:flex-row gap-6 mb-12">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                        {[
                            { key: 'all', label: 'ALL CHANNELS' },
                            { key: 'owes_me', label: 'OWED SIGNALS' },
                            { key: 'i_owe', label: 'DEBT VECTORS' }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setFilter(tab.key)}
                                className={`h-12 px-8 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border shrink-0
                                ${filter === tab.key ? 'bg-primary border-primary text-black shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]' : 'bg-white/5 text-text-muted border-white/10 hover:bg-white/10'}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* List Section */}
                <div className="grid grid-cols-1 gap-8">
                    {friendsList.length === 0 ? (
                        <div className="py-32 rounded-[3.5rem] bg-white/[0.02] border border-dashed border-white/10 text-center flex flex-col items-center justify-center">
                            <Users size={40} className="text-text-muted/20 mb-6" />
                            <h3 className="text-xl font-black uppercase tracking-tighter text-text-muted">No Nodes Detected</h3>
                            <p className="text-[9px] font-black uppercase tracking-widest text-text-muted/40 mt-1">Initialize social transactions to map signals.</p>
                        </div>
                    ) : (
                        friendsList.map((friend, idx) => (
                            <motion.div
                                key={friend.name}
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.1 * idx }}
                                className="group p-8 md:p-10 rounded-[3.5rem] bg-[#050505] border border-white/5 hover:border-white/10 transition-all shadow-3xl overflow-hidden"
                            >
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
                                    <div className="flex items-center gap-6">
                                        <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center font-black text-3xl transition-all shadow-xl ${friend.balance > 0 ? 'bg-primary text-black' : friend.balance < 0 ? 'bg-rose-500 text-white shadow-rose-900/20' : 'bg-white/5 text-text-muted'
                                            }`}>
                                            {friend.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-white">{friend.name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className={`w-2 h-2 rounded-full animate-pulse ${friend.balance > 0 ? 'bg-primary' : friend.balance < 0 ? 'bg-rose-500' : 'bg-green-500'}`} />
                                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${friend.balance > 0 ? 'text-primary' : friend.balance < 0 ? 'text-rose-400' : 'text-green-500'
                                                    }`}>
                                                    {friend.balance > 0 ? 'SIGNAL RECEIVABLE' : friend.balance < 0 ? 'SIGNAL PAYABLE' : 'CHANNEL SYNCHRONIZED'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-2">
                                        <div className={`text-2xl md:text-3xl font-black tabular-nums tracking-tighter ${friend.balance > 0 ? 'text-primary' : friend.balance < 0 ? 'text-rose-500' : 'text-green-500'
                                            }`}>
                                            {formatCurrency(friend.balance)}
                                        </div>
                                        {friend.balance > 0 && (
                                            <button
                                                onClick={() => openSettle(friend)}
                                                className="h-10 px-8 rounded-full bg-primary text-black text-[10px] font-black uppercase tracking-widest hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.5)] transition-all"
                                            >
                                                EXECUTE SETTLEMENT
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* History Layer */}
                                <div className="p-1 rounded-[2.5rem] bg-white/[0.03] border border-white/5">
                                    <div className="px-8 py-4 border-b border-white/5 flex justify-between items-center">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-text-muted opacity-60">LINKED SIGNALS ({friend.transactionCount})</span>
                                        <History size={14} className="text-text-muted/40" />
                                    </div>
                                    <div className="divide-y divide-white/5 max-h-[300px] overflow-y-auto no-scrollbar">
                                        {friend.history
                                            .sort((a, b) => new Date(b.date) - new Date(a.date))
                                            .map(t => (
                                                <div key={t.id} className="p-6 flex items-center justify-between group/item hover:bg-white/[0.02] transition-colors">
                                                    <div className="flex items-center gap-5">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${parseFloat(t.amount) < 0 ? 'bg-white/5 text-white opacity-40' : 'bg-primary/20 text-primary'
                                                            }`}>
                                                            {parseFloat(t.amount) < 0 ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black uppercase tracking-tight text-white/80 group-hover/item:text-white">{t.description}</p>
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-text-muted mt-1 opacity-50">{formatDate(t.date)} • {t.category}</p>
                                                        </div>
                                                    </div>
                                                    <div className={`text-lg font-black tabular-nums ${parseFloat(t.amount) < 0 ? 'text-white alpha-60' : 'text-primary'}`}>
                                                        {formatCurrency(t.amount)}
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </motion.main>

            {/* Manage Modal */}
            <AnimatePresence>
                {showManage && (
                    <div className="fixed inset-0 z-[10001] flex items-end md:items-center justify-center p-0 md:p-6">
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
                            className="relative bg-[#050505] border border-white/10 p-8 md:p-16 rounded-t-[3rem] md:rounded-[4rem] w-full max-w-2xl shadow-3xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-12">
                                <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white uppercase">Neural Connections</h2>
                                <button onClick={() => setShowManage(false)} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
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
                                        placeholder="NEW ENTITY NAME..."
                                        className="flex-1 h-20 bg-white/5 border border-white/10 px-8 rounded-3xl outline-none focus:border-primary transition-all font-black text-lg uppercase tracking-widest text-white"
                                    />
                                    <button
                                        onClick={handleAddFriend}
                                        className="w-20 h-20 bg-primary text-black rounded-3xl flex items-center justify-center hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.5)] transition-all"
                                    >
                                        <UserPlus size={28} />
                                    </button>
                                </div>
                            </div>

                            <div className="max-h-[40vh] overflow-y-auto no-scrollbar space-y-3">
                                {friends.map(f => {
                                    const balanceInfo = friendBalances.find(fb => fb.name.toLowerCase() === f.name.toLowerCase());
                                    return (
                                        <div key={f.id} className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 flex items-center justify-between group/friendItem">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-xs font-black uppercase tracking-widest text-text-muted">
                                                    {f.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-black text-white uppercase tracking-tight">{f.name}</p>
                                                    {balanceInfo && (
                                                        <p className={`text-[10px] font-black uppercase tracking-widest ${balanceInfo.balance > 0 ? 'text-primary' : balanceInfo.balance < 0 ? 'text-rose-500' : 'text-text-muted/40'
                                                            }`}>
                                                            {balanceInfo.balance > 0 ? `LINKED RECV ₹${balanceInfo.balance}` : balanceInfo.balance < 0 ? `LINKED PAYB ₹${Math.abs(balanceInfo.balance)}` : 'NULL DELTA'}
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
                    <div className="fixed inset-0 z-[10002] flex items-center justify-center p-6">
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
                            className="relative w-full max-w-md bg-[#080808] border border-white/10 p-10 rounded-[3rem] shadow-3xl text-center"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="w-24 h-24 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-8 text-primary">
                                <CheckCircle2 size={48} />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Execute Settle</h3>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted/60 mb-10">Record inbound transfer from {settlingFriend.name}</p>

                            <div className="mb-10">
                                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted mb-4">CONFIRMED VECTOR AMOUNT</div>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={settleAmount}
                                        onChange={(e) => setSettleAmount(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 h-24 rounded-[1.8rem] text-center text-4xl font-black text-primary outline-none focus:border-primary transition-all tabular-nums"
                                    />
                                    <div className="absolute right-8 top-1/2 -translate-y-1/2 text-primary font-black text-xl opacity-40">₹</div>
                                </div>
                            </div>

                            <button
                                onClick={handleSettle}
                                className="w-full h-20 bg-primary text-black rounded-[1.8rem] font-black text-lg uppercase tracking-widest shadow-[0_0_50px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_0_60px_rgba(var(--primary-rgb),0.5)] transition-all"
                            >
                                FINALIZE CLEARANCE
                            </button>
                            <button
                                onClick={() => setShowSettleModal(false)}
                                className="mt-4 text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-white transition-colors"
                            >
                                ABORT PROTOCOL
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Friends;
