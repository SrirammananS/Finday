# Design: Insights Filters, Wallet CRUD & Icons, Credit Card Manager, Net Worth Fix

**Date:** 2025-03-13  
**Status:** Approved  
**Approach:** Incremental (Approach A)

---

## 1. Insights filter alignment

- **Sector:** Unchanged. Single dropdown in current card (icon + “Sector” label + dropdown).
- **Wallet:** One card, same layout as Sector:
  - Same card style (icon + label + dropdown).
  - Label: “Wallet” or “Account”.
  - Dropdown: “All” plus one option per visible account.
  - Single selection only; filtering uses selected account or “All”.
- **Behaviour:** When “All” is selected, no account filter. When one account is selected, `filteredData` keeps only transactions with that `accountId`.
- **Remove:** Current wallet block with multiple checkboxes.

---

## 2. Wallet update + icons (accounts & categories)

### Wallet (account) update

- **Where:** From Accounts list or account detail: “Edit” (or pencil) opens edit form.
- **Editable:** Name, type (bank/credit/cash if applicable), and icon. No delete.
- **Persistence:** Same store as today (accounts in context/sheets); add/use `icon` (or `iconId`) per account.

### Icons for accounts and categories

- **Data:** Add `icon` (or `iconId`) to each account and each category.
- **Picker:** Shared icon picker (emoji list or small preset). Used in account create/edit and category create/edit.
- **Display:** Wherever account or category is shown, use stored icon if present; else fallback (e.g. type-based for accounts). Apply in: Insights (filters, transaction list), Transactions page, Dashboard, Bills, any dropdown showing account/category.

---

## 3. Credit Card Manager (page + dashboard)

### Dedicated page

- **Route:** e.g. `/credit-cards` (“Card Manager” in nav).
- **Content:** List of credit accounts (`type === 'credit'`). Per card: name, icon, current outstanding (debt). “Link payment” / “Mark paid”: pick a bank transaction that represents paying this card (same as Bills “link to transaction” for CC bills).
- **Linking:** Reuse/align with Bills “mark paid” + link to transaction. One linked bank transaction = one CC payment; excluded from expense via `linkedCCPaymentTxnIds`. No double expense.

### Dashboard widgets

- **Debt:** Keep; show total credit-account balance. Style: negative = red.
- **CC payment:** New widget (e.g. “CC payment” / “Card payment”): amount paid from bank to CC in period (e.g. last 30 days) or “Last payment”. Source: sum of linked CC payment transactions in that period.
- **Link:** Debt and/or CC payment link to Credit Card Manager page.

### Transactions

- One bank transaction linked as CC payment = one transfer (bank → CC). Shown as “CC payment” or “Payment to [Card]” from bank. Not expense; no second expense on card side.

---

## 4. Bug fix: net worth + red/green convention

### Net worth not showing when negative

- **Cause:** `formatCurrency(metrics.total)` uses `useAbs: true` by default; negative appears as positive with no sign.
- **Fix:** For Net Worth hero, pass `useAbs: false` so negative renders (e.g. “-₹1,234.00”). Ensure value always visible; if `metrics.total` null/undefined, show 0 or “—”.

### Red / green convention

- **Rule:** Negative = red; positive = green (or primary for positive).
- **Apply to:** Net worth hero (green when total ≥ 0, red when &lt; 0); other dashboard/Insights amounts that can be negative (net flow, debt, “you owe”) so negative = red, positive = green consistently.

---

## Implementation order (suggested)

1. Net worth fix + red/green convention (Section 4).
2. Insights Wallet filter → Sector-style dropdown (Section 1).
3. Wallet update + icon field for accounts; icon picker; show icon everywhere for accounts (Section 2, accounts first).
4. Icon field for categories; picker; show icon everywhere for categories (Section 2).
5. Credit Card Manager page + dashboard CC payment widget (Section 3).
