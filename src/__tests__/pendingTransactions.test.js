import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((i) => Object.keys(store)[i] ?? null),
  };
})();

vi.stubGlobal('localStorage', localStorageMock);
if (typeof window !== 'undefined') {
  window.AndroidBridge = undefined;
}

// Import after mocks - pendingTransactionsService reads localStorage in constructor
const { pendingTransactionsService } = await import('../services/pendingTransactions');

describe('pendingTransactionsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    // Reset service state by clearing
    pendingTransactionsService.clear();
  });

  describe('add', () => {
    it('adds a new transaction', () => {
      const txn = {
        amount: -500,
        date: '2025-02-28',
        description: 'Lunch',
        category: 'Food',
      };
      const added = pendingTransactionsService.add(txn);
      expect(added).not.toBeNull();
      expect(added.amount).toBe(-500);
      expect(added.status).toBe('pending');
      expect(pendingTransactionsService.getCount()).toBe(1);
    });

    it('rejects duplicate by amount and date within 2 hours', () => {
      const txn = { amount: -500, date: '2025-02-28', description: 'Lunch' };
      pendingTransactionsService.add(txn);
      const duplicate = pendingTransactionsService.add(txn);
      expect(duplicate).toBeNull();
      expect(pendingTransactionsService.getCount()).toBe(1);
    });

    it('rejects duplicate by rawText', () => {
      const txn = {
        amount: -500,
        date: '2025-02-28',
        description: 'Lunch',
        rawText: 'Rs 500 debited to Swiggy',
      };
      pendingTransactionsService.add(txn);
      const duplicate = pendingTransactionsService.add({ ...txn });
      expect(duplicate).toBeNull();
      expect(pendingTransactionsService.getCount()).toBe(1);
    });
  });

  describe('remove', () => {
    it('removes transaction by id', () => {
      const added = pendingTransactionsService.add({
        amount: -500,
        date: '2025-02-28',
        description: 'Lunch',
      });
      pendingTransactionsService.remove(added.id);
      expect(pendingTransactionsService.getCount()).toBe(0);
    });
  });

  describe('isDuplicate', () => {
    it('returns false when pending is empty', () => {
      expect(
        pendingTransactionsService.isDuplicate(500, '2025-02-28', 'Lunch')
      ).toBe(false);
    });
  });
});
