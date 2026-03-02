# LAKSH Mobile Design Spec – Figma Reference

Use this spec to build layouts in Figma. Prototype: `docs/mobile-design-prototypes.html` (open in browser).

---

## Breakpoint

- **Mobile:** viewport width < 768px
- **Artboard:** 375 × 812 (iPhone 14) or 375 × 667 (iPhone SE)

---

## Colors (Dark Theme)

| Token | Hex | Usage |
|-------|-----|-------|
| Canvas | `#0a0e1a` | Background |
| Card | `#1e293b` (60% opacity) | Cards, modals |
| Primary | `#00e676` | CTAs, income, active |
| Expense | `#f43f5e` | Expense, debt |
| Text main | `#e2e8f0` | Primary text |
| Text muted | `#64748b` | Labels, hints |
| Border | `rgba(255,255,255,0.08)` | Card borders |

---

## Dashboard – Collapsed (Default)

### Hero
- **Height:** ~100–120px collapsed
- **Content:** Net worth (24px, bold), insight line (12px), "Details ▼" (12px, primary)
- **Padding:** 16px

### Stats
- **Grid:** 2 columns, 8px gap
- **Cards:** Income (green value), Expense (red value)
- **Below:** "Show more" (12px, primary)

### Financial Nodes (Summary)
- **Single card:** "12 accounts · ₹X net" + chevron right
- **Tap:** Expands to full grid

### Collapsible Sections
- **Spending by Category:** Title + "Tap to expand"
- **Cash Flow:** Title + "Tap to expand"

### Recent Activity
- **Items:** 2–3 rows (desc, category, amount)
- **Below:** "See all →" (12px, primary)

---

## Dashboard – Expanded

### Hero Expanded
- **Adds:** Assets/Debt row, action buttons (Add, Accounts, Sync)
- **Height:** ~180–200px

### Stats Expanded
- **Adds:** Net Flow, Savings Rate (2 more cards in 2×2 grid)

### Nodes Expanded
- **Grid:** 2–3 columns, 8px gap
- **Cards:** Compact (min-height ~80px), name + balance
- **Include:** Social Capital, all accounts, Add Node

---

## More Menu (Bottom Sheet)

- **Trigger:** ⋯ (ellipsis) in DynamicIsland
- **Sheet:** Rounded top (24px), full width
- **Items:** Friends 👥, Bills 🔔, Categories 🏷️, Insights 📊
- **Row height:** 48px min (44px tap target)

---

## Bottom Nav (DynamicIsland)

- **Items:** Home, Ledger, Accounts, Settings, More (⋯)
- **Divider** then SMS, Add (+)
- **Pill:** Rounded full, blur background, 8px padding
- **Icon size:** 18–20px
- **Add button:** Primary fill, 44×44px min

---

## Spacing

- **Section gap:** 24px
- **Card padding:** 16px
- **Bottom safe area:** `env(safe-area-inset-bottom)` + 88px for nav

---

## Decision Log

| Decision | Chosen | Alternatives |
|----------|--------|--------------|
| Financial nodes (10+ wallets) | Summary + expand | Always show all, horizontal scroll |
| Stats | 2 primary + expand for 2 more | 4 always, 1 + expand |
| Charts | Collapsed by default | Always visible, tabbed |
| More nav | 5th item in island | Replace Settings, hamburger |
| Haptics | No | Yes |
| Share | No | Yes |
