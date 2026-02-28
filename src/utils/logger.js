/**
 * Structured logger for LAKSH/Finday
 * - info: Only in development (import.meta.env.DEV)
 * - warn/error: Always logged
 */
export const logger = {
  info: (msg, ...args) => {
    if (import.meta.env.DEV) {
      console.info(`[LAKSH] ${msg}`, ...args);
    }
  },
  warn: (msg, ...args) => {
    console.warn(`[LAKSH] ${msg}`, ...args);
  },
  error: (msg, ...args) => {
    console.error(`[LAKSH] ${msg}`, ...args);
  },
};

export default logger;
