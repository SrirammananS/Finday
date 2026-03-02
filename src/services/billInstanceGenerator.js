/**
 * Smart Bill Instance Generator.
 * Phase 1: Auto-detect payments from transactions.
 * Phase 2: Create new bill cycles (credit card or monthly).
 */
import { format, parseISO, subDays, addDays, subMonths } from 'date-fns';
import { logger } from '../utils/logger';

import { generateShortId } from '../utils/generateId';

const generateId = () => generateShortId();

/**
 * @param {Object} params
 * @param {Array} params.billsList
 * @param {Array} params.paymentsList
 * @param {Array} params.txnsList
 * @param {string} params.spreadsheetId
 * @param {Function} params.updateBillPayment - async (paymentId, updates, paymentsOverride) => void
 * @param {Function} params.setBillPayments - (updater: (prev) => newPayments) => void
 * @param {Function} params.toast - (message, type) => void
 * @param {{ current: Set }} params.generatedBuffer
 * @param {Object} params.sheetsService
 */
export async function generateBillInstances({
  billsList,
  paymentsList,
  txnsList,
  spreadsheetId,
  updateBillPayment,
  setBillPayments,
  toast,
  generatedBuffer,
  sheetsService,
}) {
  if (!spreadsheetId || billsList.length === 0) return;

  const today = new Date();
  const currentMonthKey = format(today, 'yyyy-MM');
  const newPayments = [];
  const existingCycles = new Set(paymentsList.map((p) => `${p.billId}:${p.cycle}`));

  logger.info(`Running Smart Bill Audit (Cycle: ${currentMonthKey})...`);

  // Phase 1: Status Sync (Auto-detect payments for EXISTING bills)
  let workingPayments = [...paymentsList];
  for (const payment of paymentsList.filter((p) => p.status === 'pending')) {
    const bill = billsList.find((b) => b.id === payment.billId);
    if (!bill) continue;

    const pDate = parseISO(payment.dueDate);
    const searchStart = subDays(pDate, 15);
    const searchEnd = addDays(pDate, 20);

    const match = txnsList.find((t) => {
      const txDate = parseISO(t.date);
      const isExpense = parseFloat(t.amount) < 0;
      const txAmt = Math.abs(parseFloat(t.amount));
      const pAmt = parseFloat(payment.amount);
      const amtMatch = Math.abs(txAmt - pAmt) <= (pAmt || 1) * 0.1;
      const nameMatch = t.description?.toLowerCase().includes(bill.name?.toLowerCase().split(' ')[0]);
      return txDate >= searchStart && txDate <= searchEnd && isExpense && (amtMatch || nameMatch);
    });

    if (match) {
      logger.info(`Auto-detected payment for ${payment.name}! Linking TxID: ${match.id}`);
      const updates = { status: 'paid', paidDate: match.date, transactionId: match.id };
      await updateBillPayment(payment.id, updates, workingPayments);
      workingPayments = workingPayments.map((p) => (p.id === payment.id ? { ...p, ...updates } : p));
    }
  }

  // Phase 2: Signal Generation (Create new cycles)
  for (const bill of billsList) {
    try {
      let cycleKey;
      let dueDate;
      let calculationStart;
      let calculationEnd;

      if (bill.billType === 'credit_card') {
        const billingDay = parseInt(bill.billingDay) || 1;
        const dueDay = parseInt(bill.dueDay) || 1;
        const todayDay = today.getDate();

        if (todayDay >= billingDay) {
          cycleKey = format(new Date(today.getFullYear(), today.getMonth(), billingDay), 'yyyy-MM');
          const dueMonth = dueDay < billingDay ? today.getMonth() + 1 : today.getMonth();
          dueDate = format(new Date(today.getFullYear(), dueMonth, dueDay), 'yyyy-MM-dd');
          calculationEnd = new Date(today.getFullYear(), today.getMonth(), billingDay);
          calculationStart = subMonths(calculationEnd, 1);
        } else {
          const lastMonth = subMonths(today, 1);
          cycleKey = format(new Date(lastMonth.getFullYear(), lastMonth.getMonth(), billingDay), 'yyyy-MM');
          const dueMonth = dueDay < billingDay ? lastMonth.getMonth() + 1 : lastMonth.getMonth();
          dueDate = format(new Date(lastMonth.getFullYear(), dueMonth, dueDay), 'yyyy-MM-dd');
          calculationEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), billingDay);
          calculationStart = subMonths(calculationEnd, 1);
        }
      } else {
        cycleKey = currentMonthKey;
        const dueDay = parseInt(bill.dueDay) || 1;
        dueDate = format(new Date(today.getFullYear(), today.getMonth(), dueDay), 'yyyy-MM-dd');
      }

      const uniqueKey = `${bill.id}:${cycleKey}`;
      if (existingCycles.has(uniqueKey) || generatedBuffer.current.has(uniqueKey)) {
        continue;
      }

      let amount = parseFloat(bill.amount) || 0;
      if (bill.billType === 'credit_card' && calculationStart && calculationEnd) {
        const cardTag = bill.name.toLowerCase().split(' ')[0];
        const cardTxns = txnsList.filter((t) => {
          const amt = parseFloat(t.amount);
          if (amt >= 0) return false;
          const dt = parseISO(t.date);
          return (
            dt >= calculationStart &&
            dt < calculationEnd &&
            t.description?.toLowerCase().includes(cardTag)
          );
        });
        amount = Math.abs(cardTxns.reduce((sum, t) => sum + parseFloat(t.amount), 0));
        if (amount === 0 && bill.billType === 'credit_card') continue;
      }

      const meshDate = parseISO(dueDate);
      const instanceName = `${bill.name} - ${format(meshDate, 'MMM yy')}`;

      const newPayment = {
        id: generateId(),
        billId: bill.id,
        name: instanceName,
        cycle: cycleKey,
        amount,
        dueDate,
        status: 'pending',
        accountId: bill.accountId || '',
      };

      try {
        await sheetsService.addBillPayment(spreadsheetId, newPayment);
        newPayments.push(newPayment);
        generatedBuffer.current.add(uniqueKey);
      } catch (sheetsErr) {
        logger.error(`Smart generate fail for ${bill.name}:`, sheetsErr);
      }
    } catch (err) {
      logger.error(`Generation error for ${bill.name}:`, err);
    }
  }

  if (newPayments.length > 0) {
    setBillPayments((prev) => [...prev, ...newPayments]);
    toast(`Smart Brain: Detected ${newPayments.length} new bill signals`);
  }

  try {
    await sheetsService.setConfig(spreadsheetId, 'last_bill_audit', new Date().toISOString());
  } catch {
    logger.warn('Failed to update bill audit flag in cloud');
  }
}
