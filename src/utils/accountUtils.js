/**
 * Account display helpers. Use account.icon when present, else default by type.
 */

const DEFAULT_ICONS = {
  bank: '🏦',
  credit: '💳',
  cash: '💵',
};

/**
 * Returns the emoji/icon for an account. Prefers account.icon, falls back to type-based default.
 * @param {Object} account - { icon?, type? }
 * @returns {string}
 */
export function getAccountIcon(account) {
  if (!account) return DEFAULT_ICONS.cash;
  if (account.icon) return account.icon;
  return DEFAULT_ICONS[account.type] || DEFAULT_ICONS.cash;
}

/**
 * Default icon for a given account type (for new accounts / form defaults).
 */
export function getDefaultAccountIconByType(type) {
  return DEFAULT_ICONS[type] || DEFAULT_ICONS.cash;
}
