# FinanceContext Modularization Plan

**Goal:** Reduce FinanceProviderInner from ~1,800 lines to <500 by extracting logic into focused hooks.

**Strategy:** Incremental extraction. Each hook receives state/setters as params and returns actions. FinanceProvider remains the single source of truth.

---

## Phase 1: Transaction CRUD (~270 lines) ✓

**File:** `src/hooks/useTransactionActions.js`

**Inputs:** transactions, accounts, categories, bills, closedPeriods, config, setters, toast, ensureSheetsReady

**Outputs:** addTransaction, updateTransaction, deleteTransaction

**Status:** Extracted 2025-02-28. FinanceContext reduced by ~270 lines.

---

## Phase 2: Bill CRUD (~120 lines) ✓

**File:** `src/hooks/useBillActions.js`

**Inputs:** bills, billPayments, transactions, accounts, categories, config, setters

**Outputs:** addBill, updateBill, deleteBill, updateBillPayment

**Status:** Extracted 2025-02-28.

---

## Phase 3: Account & Category CRUD (~120 lines)

**File:** `src/hooks/useAccountCategoryActions.js`

**Outputs:** addAccount, updateAccount, deleteAccount, addCategory, updateCategory, deleteCategory

---

## Phase 4: Sync & Config (future)

- refreshData, disconnect, forceRefresh, updateConfig
- May stay in context due to auth/sheets coupling

---

## Success Criteria

- [ ] FinanceContext.jsx < 600 lines
- [ ] No behavior change; all tests pass
- [ ] Lint 0 errors, 0 warnings
