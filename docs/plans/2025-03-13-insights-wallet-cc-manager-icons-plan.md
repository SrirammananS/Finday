# Insights, Wallet Icons, CC Manager & Net Worth Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align Insights Wallet filter with Sector UI (single dropdown), add wallet update + icons for accounts and categories everywhere, add Credit Card Manager page and dashboard widget, fix net worth when negative and apply red/green convention.

**Architecture:** Incremental. Net worth and formatting first; then Insights filter; then account/category icon field + picker and display; finally Credit Card Manager page and dashboard CC payment widget. Reuse existing Bills “link payment” flow for CC payments.

**Tech Stack:** React, FinanceContext, existing sheets service, formatUtils, React Router.

**Design reference:** `laksh/docs/plans/2025-03-13-insights-wallet-cc-manager-icons-design.md`

---

## Phase 1: Net worth fix + red/green convention

### Task 1.1: formatCurrency supports negative and optional sign/color hint

**Files:**
- Modify: `laksh/src/utils/formatUtils.js`

**Step 1:** Add an option to format negative values without abs, and document it.

In `formatCurrency`, support `opts.useAbs = false` (already exists). Ensure when `useAbs: false` and value is negative, the formatted string is negative (e.g. `-₹1,234.00`). Current implementation uses `Intl.NumberFormat` which will show minus when value is negative if we pass the raw number.

**Step 2:** Change the implementation so that when `useAbs: false`, pass `value` (not `Math.abs(value)`) to `Intl.NumberFormat`. Verify existing call sites that pass `useAbs: true` or omit it still get positive display.

**Step 3:** Commit with message: `fix: formatCurrency useAbs false for negative net worth`

---

### Task 1.2: Dashboard Net Worth shows negative and uses red/green

**Files:**
- Modify: `laksh/src/pages/Dashboard.jsx` (hero Net Worth block, ~417–421)

**Step 1:** For the Net Worth hero value, call `formatCurrency(metrics.total, { useAbs: false })` so negative net worth displays as negative.

**Step 2:** Apply conditional class for color: when `metrics.total < 0` use red (e.g. `text-rose-500`), when `metrics.total >= 0` use green/primary (e.g. `text-primary` or `text-emerald-500`). Ensure the rupee symbol and value both use this color.

**Step 3:** If `metrics.total` is null/undefined, show `formatCurrency(0)` or "—" so the hero never shows blank.

**Step 4:** Commit with message: `fix: net worth negative value display and red/green`

---

### Task 1.3: Red/green for other dashboard amounts that can be negative

**Files:**
- Modify: `laksh/src/pages/Dashboard.jsx` (any stat or link that shows a number that can be negative)

**Step 1:** Find all places that display `metrics.total`, `metrics.totalDebt`, net flow, or “you owe” / “owed to you” difference. Ensure negative = red, positive = green (or primary) consistently.

**Step 2:** Apply the same convention in the pulse chart tooltip or legend if it shows negative values. Optionally in Insights for assets/debt view (Section 4 of design).

**Step 3:** Commit with message: `fix: red/green convention for negative amounts on dashboard`

---

## Phase 2: Insights Wallet filter → Sector-style dropdown

### Task 2.1: Replace Wallet checkboxes with single dropdown card

**Files:**
- Modify: `laksh/src/pages/Insights.jsx`

**Step 1:** Remove state `selectedAccountIds` (Set). Replace with a single value, e.g. `selectedAccountId: string | null` where `null` means "All".

**Step 2:** Replace the Wallet filter block (current checkboxes) with one card that matches the Sector card layout: same outer div class, icon (Wallet), label "Wallet" or "Account", and a `<select>` with option "All" and one option per `visibleAccounts` (value = account id or "" for All).

**Step 3:** In the `filteredData` useMemo, replace the "2b. Account / Wallet filter" logic: if `selectedAccountId` is non-null and non-empty, keep only transactions where `t.accountId === selectedAccountId`.

**Step 4:** Remove any leftover checkbox UI and the `visibleAccounts.map` for checkboxes. Ensure `totalTxPages` / `paginatedTxs` and the rest of the page still work.

**Step 5:** Commit with message: `feat(insights): wallet filter as Sector-style single dropdown`

---

## Phase 3: Wallet update + account icons

### Task 3.1: Add icon field to account in data layer

**Files:**
- Modify: `laksh/src/context/FinanceContext.jsx` (addAccount / updateAccount — ensure icon is passed through)
- Modify: `laksh/src/services/sheets.js` (addAccount, updateAccount, and any read that builds account objects — add `icon` field read/write if accounts are stored in sheets)
- Check: `laksh/src/services/localDB.js` or wherever accounts are persisted if not sheets

**Step 1:** In FinanceContext, ensure `addAccount` and `updateAccount` accept and persist `icon` (string, e.g. emoji or icon id). If sheets service has a fixed schema, add a column or property for `icon`.

**Step 2:** When loading accounts (from sheets or local), ensure each account can have `icon: string | undefined`. Default to undefined so existing accounts still work.

**Step 3:** Commit with message: `feat: account icon field in data layer`

---

### Task 3.2: Icon picker component (shared)

**Files:**
- Create: `laksh/src/components/IconPicker.jsx` (or `IconPicker.js`)

**Step 1:** Create a small reusable component that accepts `value` (current icon string), `onChange(value)`, and optional `label`. Render a grid of emoji (e.g. 🏦 💳 💵 📱 🔒 ⭐ 🏠 🚗 🍔 ☕ etc.) or a preset list; clicking one calls `onChange` with that icon. Include an optional “Clear” to set empty/undefined.

**Step 2:** Export and use in account form (next task). Style to match app (rounded, border, hover).

**Step 3:** Commit with message: `feat: IconPicker component for accounts and categories`

---

### Task 3.3: Account form includes icon; Accounts page shows icon

**Files:**
- Modify: `laksh/src/pages/Accounts.jsx` (form state, openEditModal, handleSubmit, and card display)

**Step 1:** Add `icon` to form state and to `openEditModal` (prefill from `acc.icon`). In the add/edit modal, render `IconPicker` and include `form.icon` in the payload to `addAccount` / `updateAccount`.

**Step 2:** In the account cards, if `acc.icon` is set, show it instead of (or alongside) the type-based emoji (🏦/💳/💵). Prefer `acc.icon` when present.

**Step 3:** Commit with message: `feat: account icon in form and card display`

---

### Task 3.4: Show account icon everywhere accounts are displayed

**Files:**
- Modify: `laksh/src/pages/Insights.jsx` (Wallet dropdown option display; transaction list account)
- Modify: `laksh/src/pages/Transactions.jsx` (if account is shown)
- Modify: `laksh/src/pages/Dashboard.jsx` (WalletCard or any account list)
- Modify: `laksh/src/components/WalletCard.jsx` (if used)
- Modify: `laksh/src/pages/Bills.jsx` (if account name/icon is shown)
- Modify: `laksh/src/pages/AccountDetail.jsx` (header or summary)

**Step 1:** Create a small helper or use inline: `getDisplayIcon(account)` that returns `account?.icon || getAccountIcon(account)` (existing type-based fallback). Use it wherever an account is rendered (dropdowns, lists, transaction rows).

**Step 2:** In Insights Wallet dropdown, show the icon next to each account name. In transaction list row (date | category | account), show account icon next to account name.

**Step 3:** Commit with message: `feat: account icon displayed across Insights, Transactions, Dashboard, Bills`

---

## Phase 4: Category icons

### Task 4.1: Add icon field to category in data layer

**Files:**
- Modify: `laksh/src/context/FinanceContext.jsx` (addCategory, updateCategory)
- Modify: `laksh/src/services/sheets.js` (addCategory, updateCategory, and category read — add `icon` to category object if stored in sheets)

**Step 1:** Categories have a name and possibly id. Add `icon` (string) to the category object. Ensure add/update and load paths persist and return `icon`.

**Step 2:** Commit with message: `feat: category icon field in data layer`

---

### Task 4.2: Category form includes icon; Categories page shows icon

**Files:**
- Modify: `laksh/src/pages/Categories.jsx` (form, add flow, and list/card display)

**Step 1:** Where categories are created or edited, add IconPicker and include `icon` in the payload. If there is no edit flow, add a simple edit (e.g. click to edit name + icon).

**Step 2:** In the category list/cards, show `category.icon` when present, else a default (e.g. first letter or a generic icon).

**Step 3:** Commit with message: `feat: category icon in form and list`

---

### Task 4.3: Show category icon everywhere categories are displayed

**Files:**
- Modify: `laksh/src/pages/Insights.jsx` (Sector dropdown options; transaction list category; category breakdown charts if applicable)
- Modify: `laksh/src/pages/Transactions.jsx` (category column/cell)
- Modify: `laksh/src/pages/Categories.jsx` (already in 4.2)
- Modify: `laksh/src/components/TransactionForm.jsx` (category dropdown)
- Any other component that renders category name (Bills, Dashboard category breakdown, etc.)

**Step 1:** Helper `getCategoryDisplayIcon(category)` that returns `category?.icon` or fallback. Use in dropdowns, transaction rows, and charts.

**Step 2:** Commit with message: `feat: category icon displayed across app`

---

## Phase 5: Credit Card Manager page + dashboard widget

### Task 5.1: Route and nav entry for Credit Card Manager

**Files:**
- Create: `laksh/src/pages/CreditCardManager.jsx` (or `CreditCards.jsx`)
- Modify: `laksh/src/App.jsx` (add route for `/credit-cards`)
- Modify: `laksh/src/components/LeftSidebar.jsx` (and any MobileNav / other nav) — add link "Card Manager" or "Credit Cards" with icon CreditCard

**Step 1:** Create a minimal page component that reads `accounts.filter(a => a.type === 'credit')` from useFinance and renders a list of cards (name, icon, balance). No payment linking yet.

**Step 2:** In App.jsx, add `<Route path="/credit-cards" element={<CreditCardManager />} />` (inside protected routes). In LeftSidebar, add an item linking to `/credit-cards`.

**Step 3:** Commit with message: `feat: Credit Card Manager page and nav`

---

### Task 5.2: Credit Card Manager — link payment (reuse Bills flow)

**Files:**
- Modify: `laksh/src/pages/CreditCardManager.jsx`
- Reuse: Bills “mark paid” / “link to transaction” logic (may require extracting a shared hook or component, or calling the same billPayment API if CC is represented as a bill)

**Step 1:** For each credit account, show "Link payment" or "Mark paid". When clicked, open a modal that lists recent bank (negative) transactions in a due window (e.g. last 30 days) from bank accounts, excluding transactions already linked to a CC payment. User selects one transaction to link.

**Step 2:** Persist the link: either create/update a billPayment record for a credit_card bill tied to this account, or add a dedicated `ccPaymentLinks` structure (design: reuse billPayments + bills with billType 'credit_card'). Use existing `getLinkedCCPaymentTransactionIds` so this transaction is excluded from expense.

**Step 3:** After linking, refresh data and show "Paid on &lt;date&gt;" or similar for that card for that cycle.

**Step 4:** Commit with message: `feat: Credit Card Manager link payment from bank`

---

### Task 5.3: Dashboard CC payment widget

**Files:**
- Modify: `laksh/src/pages/Dashboard.jsx`

**Step 1:** Add a small widget (e.g. "CC payment" or "Card payment") that shows the sum of amounts of linked CC payment transactions in the last 30 days (or same period as other dashboard metrics). Use `billPayments` + `bills` (billType === 'credit_card') and transactions; sum `transaction.amount` (absolute) for those transaction ids in the date range.

**Step 2:** Place it near the Debt link (e.g. next to "Debt" or below). Link to `/credit-cards` so user can open Card Manager.

**Step 3:** Style: negative = red, positive = green if applicable; for "amount paid" it's usually positive (money out of bank), so can use one consistent style.

**Step 4:** Commit with message: `feat: dashboard CC payment widget and link to Card Manager`

---

### Task 5.4: Transactions list — show CC payment as single “bank → CC” line

**Files:**
- Modify: `laksh/src/pages/Transactions.jsx` (and any transaction row component)

**Step 1:** For a transaction that is in `linkedCCPaymentTxnIds`, display it as a single row with description like "CC payment" or "Payment to [Card name]" and indicate source account (bank). Do not show a second expense entry on the card side; the payment is one transfer.

**Step 2:** Ensure transaction list does not duplicate this as two expenses (already enforced by data model; just ensure UI labels and filters treat it as one transfer).

**Step 3:** Commit with message: `feat: transactions show CC payment as single bank-to-CC line`

---

## Execution handoff

Plan complete and saved to `laksh/docs/plans/2025-03-13-insights-wallet-cc-manager-icons-plan.md`.

**Two execution options:**

1. **Subagent-driven (this session)** — I run tasks one by one (or in small batches), you review between steps.
2. **Parallel session** — You open a new session, paste the plan path, and use the executing-plans skill for batch execution with checkpoints.

Which approach do you want?
