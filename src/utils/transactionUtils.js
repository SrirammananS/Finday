/**
 * Helpers for transaction classification.
 * Credit card PAYMENT (settlement from bank to card) is a transfer, not spend.
 * Only the actual spend on the card should count as expense.
 */

const CC_PAYMENT_PATTERNS = [
  'cc bill',
  'credit card payment',
  'credit card bill',
  'card payment',
  'card settled',
  'settled',
  'payment to card',
  'cc payment',
  'card payoff',
  'pay card',
];

/**
 * Returns true if this transaction is a credit card payment/settlement (bank → card).
 * Such transactions should be excluded from "expense" / "spend" totals so we only count one-time spend.
 * @param {Object} t - Transaction { description, isBillPayment, paymentType, id, ... }
 * @param {Set|undefined} linkedCCPaymentTxnIds - Optional set of transaction ids linked to a CC bill payment (from Bills). Those count as CC payment even if description doesn't match.
 */
export function isCreditCardPaymentTransaction(t, linkedCCPaymentTxnIds) {
  if (!t || t.amount >= 0) return false;
  if (linkedCCPaymentTxnIds && linkedCCPaymentTxnIds.has(t.id)) return true;
  if (t.isBillPayment === true && t.paymentType === 'cc') return true;
  const desc = (t.description || '').toLowerCase();
  return CC_PAYMENT_PATTERNS.some((p) => desc.includes(p));
}

/**
 * Filter transactions to only those that count as "spend" (expense) for insights/dashboard/charts.
 * Excludes CC payments (settlements + txns linked to CC bill payments) so they are not double-counted.
 * @param {Array} transactions
 * @param {Set|undefined} linkedCCPaymentTxnIds - Optional. Transaction ids that are linked to a credit_card bill payment (so excluded from expense).
 */
export function expenseOnlyTransactions(transactions, linkedCCPaymentTxnIds) {
  if (!Array.isArray(transactions)) return [];
  return transactions.filter((t) => t.amount < 0 && !isCreditCardPaymentTransaction(t, linkedCCPaymentTxnIds));
}

/**
 * Returns a Set of transaction ids that are linked to a credit card payment.
 * Prefers creditCardPayments (new _CreditCardPayments sheet); else uses billPayments + bills (legacy).
 */
export function getLinkedCCPaymentTransactionIds(billPayments = [], bills = [], creditCardPayments = []) {
  const ids = new Set();
  if (creditCardPayments && creditCardPayments.length > 0) {
    creditCardPayments.forEach((p) => { if (p.transactionId) ids.add(p.transactionId); });
    return ids;
  }
  for (const p of billPayments) {
    if (!p.transactionId) continue;
    const bill = bills.find((b) => b.id === p.billId);
    if (bill?.billType === 'credit_card') ids.add(p.transactionId);
  }
  return ids;
}

/**
 * For a transaction id linked to a CC payment, returns display info for transfer-style view.
 * Shows as "From [Bank] → [Card]. Settled" when transaction (from account) is provided.
 * Prefers creditCardPayments + creditCards (new sheets); else billPayments + bills (legacy).
 * @param {string} transactionId
 * @param {Array} billPayments
 * @param {Array} bills
 * @param {Array} accounts
 * @param {Array} creditCardPayments
 * @param {Array} creditCards
 * @param {{ transaction?: { accountId: string } }} [opts] - Optional. If transaction with accountId is passed, fromAccountName and transfer label are set.
 */
export function getLinkedCCPaymentDisplay(transactionId, billPayments = [], bills = [], accounts = [], creditCardPayments = [], creditCards = [], opts = {}) {
  const transaction = opts?.transaction;
  const fromAccountId = transaction?.accountId;
  const fromAccount = fromAccountId && accounts?.length ? accounts.find((a) => a.id === fromAccountId) : null;
  const fromAccountName = fromAccount?.name || null;

  if (creditCardPayments?.length > 0 && creditCards) {
    const payment = creditCardPayments.find((p) => p.transactionId === transactionId);
    if (!payment) return null;
    const card = creditCards.find((c) => c.id === payment.creditCardId);
    const account = accounts.find((a) => a.id === card?.accountId);
    const cardName = account?.name || card?.name || 'Card';
    const label = fromAccountName
      ? `From ${fromAccountName} → ${cardName}. Settled`
      : `CC Payment → ${cardName}`;
    return { label, fromAccountName, cardName, settled: true, bill: card, account };
  }
  const payment = billPayments.find((p) => p.transactionId === transactionId);
  if (!payment) return null;
  const bill = bills.find((b) => b.id === payment.billId);
  if (!bill || bill.billType !== 'credit_card') return null;
  const account = accounts.find((a) => a.id === bill.accountId || a.id === bill.billAccountId);
  const cardName = account?.name || bill.name || 'Card';
  const label = fromAccountName
    ? `From ${fromAccountName} → ${cardName}. Settled`
    : `CC Payment → ${cardName}`;
  return { label, fromAccountName, cardName, settled: true, bill, account };
}
