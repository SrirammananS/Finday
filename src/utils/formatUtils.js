/**
 * Shared number/currency formatting with .00 decimal accuracy across the app.
 */

const INR_OPTIONS = {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

/**
 * Format a number as INR with exactly 2 decimal places (e.g. ₹1,234.00).
 * When useAbs is false, negative values display with minus sign (e.g. -₹1,234.00).
 * @param {number} value - Amount to format
 * @param {{ useAbs?: boolean }} [opts] - useAbs: format Math.abs(value) (default true). Use false for net worth / signed amounts.
 * @returns {string}
 */
export function formatCurrency(value, opts = {}) {
  const { useAbs = true } = opts;
  const num = typeof value !== 'number' || Number.isNaN(value) ? 0 : (useAbs ? Math.abs(value) : value);
  return new Intl.NumberFormat('en-IN', INR_OPTIONS).format(num);
}

/**
 * Format a number with 2 decimal places, no currency symbol (e.g. 1,234.00).
 */
export function formatNumber(value) {
  const num = typeof value !== 'number' || Number.isNaN(value) ? 0 : value;
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
}
