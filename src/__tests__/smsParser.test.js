import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseSMS, formatParsedTransaction } from '../services/smsParser';

// Mock storage - smsParser uses storage.getJSON(STORAGE_KEYS.SMS_RULES) via getCustomRules
vi.mock('../services/storage', () => ({
  storage: {
    getJSON: vi.fn(() => []),
  },
  STORAGE_KEYS: {},
}));

// Mock smartAI - formatParsedTransaction uses smartAI.predictCategory when confidence < 90
vi.mock('../services/smartAI', () => ({
  smartAI: {
    predictCategory: vi.fn(() => ({ category: 'Other', confidence: 0 })),
  },
}));

describe('smsParser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseSMS', () => {
    it('returns null for empty or invalid input', () => {
      expect(parseSMS('')).toBeNull();
      expect(parseSMS(null)).toBeNull();
      expect(parseSMS(undefined)).toBeNull();
      expect(parseSMS(123)).toBeNull();
    });

    it('parses HDFC debit SMS with amount', () => {
      const sms = 'Rs 500 debited from A/c XX1234 on 28-Feb. Avl Bal Rs 15000.';
      const result = parseSMS(sms);
      expect(result).not.toBeNull();
      expect(result.amount).toBe(500);
      expect(result.type).toBe('expense');
      expect(result.description).toBeDefined();
      expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('parses credit SMS', () => {
      const sms = 'Rs 2000 credited to A/c XX5678 on 28-Feb. Ref: UPI123.';
      const result = parseSMS(sms);
      expect(result).not.toBeNull();
      expect(result.amount).toBe(2000);
      expect(result.type).toBe('income');
    });

    it('parses UPI payment with merchant', () => {
      const sms = 'Rs 350 debited to Swiggy on 28/02/2025. UPI ref 123456.';
      const result = parseSMS(sms);
      expect(result).not.toBeNull();
      expect(result.amount).toBe(350);
      expect(result.type).toBe('expense');
      expect(result.merchant || result.description).toBeDefined();
    });

    it('returns null when no amount found', () => {
      const sms = 'Your OTP is 123456. Do not share.';
      expect(parseSMS(sms)).toBeNull();
    });
  });

  describe('formatParsedTransaction', () => {
    it('returns null for null parsed', () => {
      expect(formatParsedTransaction(null)).toBeNull();
      expect(formatParsedTransaction(null, [])).toBeNull();
    });

    it('formats expense with negative amount', () => {
      const parsed = {
        amount: 500,
        type: 'expense',
        description: 'Lunch',
        date: '2025-02-28',
        category: 'Food',
        merchant: 'Restaurant',
        confidence: 80,
      };
      const result = formatParsedTransaction(parsed, []);
      expect(result).not.toBeNull();
      expect(result.amount).toBe(-500);
      expect(result.date).toBe('2025-02-28');
      expect(result.description).toBe('Lunch');
      expect(result.category).toBe('Food');
    });

    it('formats income with positive amount', () => {
      const parsed = {
        amount: 1000,
        type: 'income',
        description: 'Salary',
        date: '2025-02-28',
        category: 'Income',
        confidence: 80,
      };
      const result = formatParsedTransaction(parsed, []);
      expect(result).not.toBeNull();
      expect(result.amount).toBe(1000);
      expect(result.type).toBe('income');
    });

    it('uses first account when no match', () => {
      const parsed = {
        amount: 500,
        type: 'expense',
        description: 'Payment',
        date: '2025-02-28',
        category: 'Other',
        confidence: 80,
      };
      const accounts = [{ id: 'acc1', name: 'HDFC' }];
      const result = formatParsedTransaction(parsed, accounts);
      expect(result.accountId).toBe('acc1');
    });
  });
});
