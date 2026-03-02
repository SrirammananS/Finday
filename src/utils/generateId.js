/**
 * Generate short IDs for Excel/Sheets storage efficiency.
 * Format: 12 chars (timestamp base36 + random) - sufficient for millions of records.
 * Replaces UUID (36 chars) to save space.
 */
export function generateShortId() {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).substring(2, 8);
  return (t + r).slice(-12);
}
