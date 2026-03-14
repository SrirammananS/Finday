/**
 * Billing cycle is interval-only: we store statement day (1–31) and due day (1–31).
 * Cycles are computed as [billingDay of month M, (billingDay of M+1) - 1]. No fixed dates.
 * This util derives billingDay and dueDay from one sample cycle + due date string.
 */

/**
 * Parse a date string that may be d/m/y or d-m-y or "d Mmm yyyy". Returns day of month (1–31) or null.
 * Handles: "13/12/2025", "13-12-2025", "13 Dec 2025", "12/1/26", "30 Mar 2026".
 * @param {string} str
 * @returns {{ day: number, month: number, year: number } | null}
 */
function parseDatePart(str) {
    if (!str || typeof str !== 'string') return null;
    const trimmed = str.trim();
    if (!trimmed) return null;

    const slash = trimmed.split('/').filter(Boolean);
    if (slash.length >= 3) {
        const d = parseInt(slash[0], 10);
        const m = parseInt(slash[1], 10) - 1;
        const y = parseInt(slash[2], 10);
        const yFull = y < 100 ? 2000 + y : y;
        if (d >= 1 && d <= 31 && m >= 0 && m <= 11) return { day: d, month: m, year: yFull };
    }

    const dash = trimmed.split('-').filter(Boolean);
    if (dash.length >= 3) {
        const d = parseInt(dash[0], 10);
        const m = parseInt(dash[1], 10) - 1;
        const y = parseInt(dash[2], 10);
        const yFull = y < 100 ? 2000 + y : y;
        if (d >= 1 && d <= 31 && m >= 0 && m <= 11) return { day: d, month: m, year: yFull };
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
        return { day: parsed.getDate(), month: parsed.getMonth(), year: parsed.getFullYear() };
    }
    return null;
}

/**
 * Extract the first date from a cycle range string.
 * E.g. "13/12/2025 to 12/1/26" → "13/12/2025", "13 Dec 2025 - 12 Jan 2026" → "13 Dec 2025".
 * @param {string} cycleStr
 * @returns {string|null}
 */
function extractCycleStartString(cycleStr) {
    if (!cycleStr || typeof cycleStr !== 'string') return null;
    const lower = cycleStr.toLowerCase();
    const toIdx = lower.indexOf(' to ');
    const dashIdx = lower.indexOf(' - ');
    const sep = toIdx >= 0 ? ' to ' : (dashIdx >= 0 ? ' - ' : null);
    if (sep) {
        const parts = cycleStr.split(sep);
        const start = parts[0]?.trim();
        return start || null;
    }
    return cycleStr.trim() || null;
}

/**
 * Derive interval rule (billingDay, dueDay) from one sample cycle and one due date.
 * No fixed dates are stored — only the day-of-month rule so cycles repeat (e.g. 13 Dec–12 Jan, 13 Jan–12 Feb).
 * @param {string} sampleCycleStr - e.g. "13/12/2025 to 12/1/26" or "13 Dec 2025 - 12 Jan 2026"
 * @param {string} dueDateStr - e.g. "30 Mar 2026" or "30/3/2026"
 * @returns {{ billingDay: number, dueDay: number } | { error: string }}
 */
export function parseSampleBillingCycle(sampleCycleStr, dueDateStr) {
    const startStr = extractCycleStartString(sampleCycleStr);
    const startPart = startStr ? parseDatePart(startStr) : null;
    if (!startPart) {
        return { error: 'Could not read cycle start date (e.g. 13/12/2025 or 13 Dec 2025)' };
    }
    const billingDay = Math.min(31, Math.max(1, startPart.day));

    const duePart = dueDateStr ? parseDatePart(dueDateStr.trim()) : null;
    if (!duePart) {
        return { billingDay, dueDay: Math.min(31, billingDay + 20) }; // fallback: due ~20 days after statement
    }
    const dueDay = Math.min(31, Math.max(1, duePart.day));

    return { billingDay, dueDay };
}
