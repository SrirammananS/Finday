import React, { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { motion, AnimatePresence } from 'framer-motion';
import PageLayout from '../components/PageLayout';
import PageHeader from '../components/PageHeader';
import { CreditCard, Link2, Check, X, CheckCircle2, ArrowRight } from 'lucide-react';
import { format, parseISO, subDays, addDays } from 'date-fns';
import { formatCurrency } from '../utils/formatUtils';
import { getAccountIcon } from '../utils/accountUtils';

function transactionsInDueWindow(transactions, payment, creditCardPayments = []) {
    if (!payment?.dueDate) return [];
    const linkedIds = new Set((creditCardPayments || []).map(p => p.transactionId).filter(Boolean));
    const pDate = parseISO(payment.dueDate);
    const start = subDays(pDate, 15);
    const end = addDays(pDate, 20);
    return transactions
        .filter(t => {
            if (linkedIds.has(t.id)) return false;
            if (parseFloat(t.amount) >= 0) return false;
            const txDate = parseISO(t.date);
            return txDate >= start && txDate <= end;
        })
        .sort((a, b) => parseISO(b.date) - parseISO(a.date));
}

const CreditCardManager = () => {
    const {
        accounts = [],
        creditCards = [],
        creditCardPayments = [],
        transactions = [],
        updateCreditCardPayment,
        updateCreditCard
    } = useFinance();
    const [showLinkModal, setShowLinkModal] = useState(null);
    const [selectedTransactionId, setSelectedTransactionId] = useState(null);

    const creditAccounts = useMemo(() => accounts.filter(a => a.type === 'credit' && !a.hidden), [accounts]);

    const cardsByAccount = useMemo(() => {
        const byAcc = {};
        for (const acc of creditAccounts) {
            byAcc[acc.id] = (creditCards || []).filter(c => c.accountId === acc.id)
                .sort((a, b) => (b.cycleEnd || '').localeCompare(a.cycleEnd || ''));
        }
        return byAcc;
    }, [creditCards, creditAccounts]);

    const paymentsByCardId = useMemo(() => {
        const byCard = {};
        for (const p of creditCardPayments || []) {
            if (!byCard[p.creditCardId]) byCard[p.creditCardId] = [];
            byCard[p.creditCardId].push(p);
        }
        for (const id of Object.keys(byCard)) {
            byCard[id].sort((a, b) => parseISO(b.dueDate || 0) - parseISO(a.dueDate || 0));
        }
        return byCard;
    }, [creditCardPayments]);

    const getTransactionsInDueWindow = useCallback((payment) => transactionsInDueWindow(transactions, payment, creditCardPayments), [transactions, creditCardPayments]);

    const getLinkedTransaction = useCallback((payment) => {
        if (!payment?.transactionId) return null;
        return transactions.find(t => t.id === payment.transactionId);
    }, [transactions]);

    const handleMarkPaid = useCallback(async (payment, transactionId = null, card = null) => {
        const linkedTx = transactionId ? transactions.find(t => t.id === transactionId) : null;
        const paidDate = linkedTx?.date ? new Date(linkedTx.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        await updateCreditCardPayment(payment.id, {
            status: 'paid',
            paidDate,
            transactionId: transactionId ?? ''
        });
        if (card) await updateCreditCard(card.id, { status: 'closed' });
        setShowLinkModal(null);
        setSelectedTransactionId(null);
    }, [updateCreditCardPayment, updateCreditCard, transactions]);

    return (
        <div className="min-h-screen text-text-main selection:bg-primary selection:text-black">
            <PageLayout>
                <PageHeader
                    badge="Cards"
                    title="Credit Card Manager"
                    subtitle="Link payments & track settlements"
                    icon={CreditCard}
                    iconBg="bg-amber-500/10"
                    iconColor="text-amber-500"
                />

                <div className="space-y-6">
                    {creditAccounts.length === 0 ? (
                        <div className="p-8 rounded-2xl bg-canvas-subtle border border-card-border text-center">
                            <p className="text-text-muted font-medium">No credit accounts. Add one from <Link to="/accounts" className="text-primary hover:underline">Wallets</Link>.</p>
                        </div>
                    ) : (
                        creditAccounts.map((acc) => {
                            const cards = cardsByAccount[acc.id] || [];
                            return (
                                <motion.div
                                    key={acc.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 md:p-6 rounded-2xl bg-card border border-card-border"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-canvas-subtle border border-card-border flex items-center justify-center text-2xl">
                                                {getAccountIcon(acc)}
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-black uppercase tracking-tight text-text-main">{acc.name}</h2>
                                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                                    Balance {formatCurrency(acc.balance ?? 0, { useAbs: false })}
                                                </p>
                                            </div>
                                        </div>
                                        <Link
                                            to={`/accounts/${acc.id}`}
                                            className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline flex items-center gap-1"
                                        >
                                            History <ArrowRight size={12} />
                                        </Link>
                                    </div>

                                    <div className="space-y-3">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-text-muted">Cycles & payments</h3>
                                        {cards.length === 0 ? (
                                            <p className="text-sm text-text-muted">No statement cycles yet. Cycles are created automatically when you spend on this card.</p>
                                        ) : (
                                            <div className="grid gap-3">
                                                {cards.slice(0, 8).map((card) => {
                                                    const payments = (paymentsByCardId[card.id] || []).slice(0, 3);
                                                    const isClosed = card.status === 'closed';
                                                    return (
                                                        <div key={card.id} className={`p-3 rounded-xl border ${isClosed ? 'bg-canvas-subtle border-card-border opacity-80' : 'bg-canvas-subtle border-card-border'}`}>
                                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                                <p className="text-xs font-bold text-text-main">{card.name}</p>
                                                                <span className="text-[10px] font-bold text-text-muted">
                                                                    Outstanding {formatCurrency(card.amount ?? 0)}
                                                                </span>
                                                            </div>
                                                            {isClosed && (
                                                                <span className="text-[10px] font-bold text-emerald-500 uppercase flex items-center gap-1 mb-2">
                                                                    <CheckCircle2 size={12} /> Closed
                                                                </span>
                                                            )}
                                                            {payments.length === 0 ? (
                                                                <p className="text-[10px] text-text-muted">No payment row for this cycle.</p>
                                                            ) : (
                                                                payments.map((payment) => {
                                                                    const paid = payment.status === 'paid';
                                                                    const linkedTx = getLinkedTransaction(payment);
                                                                    return (
                                                                        <div
                                                                            key={payment.id}
                                                                            className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border mt-2 ${paid ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-canvas-elevated border-card-border'}`}
                                                                        >
                                                                            <div>
                                                                                <p className="text-[11px] font-bold text-text-main">{payment.name}</p>
                                                                                <p className="text-[10px] text-text-muted">{payment.dueDate ? format(parseISO(payment.dueDate), 'dd MMM yyyy') : '–'} • {formatCurrency(payment.amount)}</p>
                                                                                {paid && linkedTx && (
                                                                                    <div className="flex items-center gap-1 mt-1 text-emerald-600">
                                                                                        <Link2 size={10} />
                                                                                        <span className="text-[10px] font-bold">{format(parseISO(linkedTx.date), 'dd MMM')}</span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            {paid ? (
                                                                                <span className="text-[10px] font-bold text-emerald-500 uppercase flex items-center gap-1">
                                                                                    <CheckCircle2 size={12} /> Paid
                                                                                </span>
                                                                            ) : (
                                                                                <button
                                                                                    onClick={() => { setShowLinkModal({ payment, card }); setSelectedTransactionId(null); }}
                                                                                    className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold uppercase flex items-center gap-1.5 hover:opacity-90"
                                                                                >
                                                                                    <Link2 size={11} /> Link payment
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                                {cards.length > 8 && (
                                                    <p className="text-[10px] text-text-muted">+{cards.length - 8} more cycles</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </div>
            </PageLayout>

            <AnimatePresence>
                {showLinkModal && (
                    <div className="fixed inset-0 z-[10001] flex items-end md:items-center justify-center p-0 md:p-6" data-modal-overlay>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowLinkModal(null); setSelectedTransactionId(null); }} className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
                        <motion.div
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            className="relative bg-card border border-card-border p-6 md:p-8 rounded-t-3xl md:rounded-2xl w-full max-w-lg shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-black uppercase text-text-main">Link to transaction</h3>
                                <button onClick={() => { setShowLinkModal(null); setSelectedTransactionId(null); }} className="w-10 h-10 rounded-full bg-canvas-subtle border border-card-border flex items-center justify-center hover:bg-canvas-elevated">
                                    <X size={20} />
                                </button>
                            </div>
                            <p className="text-[10px] text-text-muted mb-3">Select the bank transaction you used to pay this card.</p>
                            {getTransactionsInDueWindow(showLinkModal.payment).length > 0 ? (
                                <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
                                    {getTransactionsInDueWindow(showLinkModal.payment).map(tx => (
                                        <button
                                            key={tx.id}
                                            type="button"
                                            onClick={() => setSelectedTransactionId(selectedTransactionId === tx.id ? null : tx.id)}
                                            className={`w-full p-3 rounded-xl border text-left transition-all ${selectedTransactionId === tx.id ? 'border-primary bg-primary/10' : 'border-card-border bg-canvas-subtle hover:border-primary/30'}`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="text-sm font-bold text-text-main line-clamp-1">{tx.description}</p>
                                                    <p className="text-[10px] text-text-muted">{format(parseISO(tx.date), 'dd MMM yyyy')}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-rose-500">{formatCurrency(Math.abs(tx.amount))}</p>
                                                    {selectedTransactionId === tx.id && <Check size={14} className="text-primary ml-auto" />}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-text-muted py-4 bg-canvas-subtle rounded-xl text-center mb-4">No transactions in due window. Mark paid without linking, or add a transaction and try again.</p>
                            )}
                            <div className="flex gap-3">
                                <button type="button" onClick={() => { setShowLinkModal(null); setSelectedTransactionId(null); }} className="flex-1 h-12 rounded-xl border border-card-border font-bold uppercase text-xs text-text-muted hover:bg-canvas-subtle">
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleMarkPaid(showLinkModal.payment, selectedTransactionId, showLinkModal.card)}
                                    className="flex-1 h-12 bg-emerald-500 text-white rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-emerald-600"
                                >
                                    <Check size={16} /> Mark paid
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CreditCardManager;
