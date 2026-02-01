// Unified Storage Service for LAKSH
// Centralizes all localStorage/sessionStorage operations with consistent naming

const PREFIX = 'laksh_';

// Storage keys - single source of truth
export const STORAGE_KEYS = {
    // Auth & Session
    CLIENT_ID: `${PREFIX}client_id`,
    SPREADSHEET_ID: `${PREFIX}spreadsheet_id`,
    GAPI_TOKEN: `${PREFIX}gapi_token`,
    TOKEN_EXPIRY: `${PREFIX}token_expiry`,
    EVER_CONNECTED: `${PREFIX}ever_connected`,

    // Cloud Backup
    ACCESS_TOKEN: `${PREFIX}access_token`,
    BACKUP_TOKEN_EXPIRY: `${PREFIX}backup_token_expiry`,
    USER: `${PREFIX}user`,
    LAST_BACKUP: `${PREFIX}last_backup`,

    // App Lock
    LOCK_ENABLED: `${PREFIX}lock_enabled`,
    PIN_HASH: `${PREFIX}pin_hash`,

    // Preferences
    THEME: `${PREFIX}theme`,
    NOTIFY_ENABLED: `${PREFIX}notify_enabled`,
    NOTIFY_DAYS: `${PREFIX}notify_days`,

    // Recurring
    RECURRING_DATA: `${PREFIX}recurring`,
    RECURRING_LAST_RUN: `${PREFIX}recurring_last_run`,

    // SMS Rules
    SMS_RULES: `${PREFIX}sms_rules`,

    // Guest Mode & Billing
    GUEST_MODE: `${PREFIX}guest_mode`,
    CLOSED_PERIODS: `${PREFIX}closed_periods`,
};

// Legacy keys for migration
const LEGACY_KEYS = {
    'finday_client_id': STORAGE_KEYS.CLIENT_ID,
    'finday_spreadsheet_id': STORAGE_KEYS.SPREADSHEET_ID,
    'finday_gapi_token': STORAGE_KEYS.GAPI_TOKEN,
    'finday_token_expiry': STORAGE_KEYS.TOKEN_EXPIRY,
    'finday_app_lock_enabled': STORAGE_KEYS.LOCK_ENABLED,
    'finday_app_pin': null, // Will be handled separately (needs re-hash)
    'finday_notify_enabled': STORAGE_KEYS.NOTIFY_ENABLED,
    'finday_notify_days': STORAGE_KEYS.NOTIFY_DAYS,
    'finday_recurring': STORAGE_KEYS.RECURRING_DATA,
    'finday_recurring_last_run': STORAGE_KEYS.RECURRING_LAST_RUN,
};

class StorageService {
    constructor() {
        this.migrated = false;
    }

    // Run migration from legacy keys
    migrate() {
        if (this.migrated) return;

        console.log('[Storage] Checking for legacy keys...');
        let migrationCount = 0;

        Object.entries(LEGACY_KEYS).forEach(([oldKey, newKey]) => {
            if (!newKey) return; // Skip keys that need special handling

            const value = localStorage.getItem(oldKey);
            if (value !== null && localStorage.getItem(newKey) === null) {
                localStorage.setItem(newKey, value);
                localStorage.removeItem(oldKey);
                migrationCount++;
                console.log(`[Storage] Migrated ${oldKey} → ${newKey}`);
            }
        });

        if (migrationCount > 0) {
            console.log(`[Storage] Migration complete: ${migrationCount} keys migrated`);
        }

        this.migrated = true;
    }

    // Get a value
    get(key) {
        return localStorage.getItem(key);
    }

    // Set a value
    set(key, value) {
        if (value === null || value === undefined) {
            localStorage.removeItem(key);
        } else {
            localStorage.setItem(key, String(value));
        }
    }

    // Remove a value
    remove(key) {
        localStorage.removeItem(key);
    }

    // Get JSON value
    getJSON(key) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : null;
        } catch {
            return null;
        }
    }

    // Set JSON value
    setJSON(key, value) {
        if (value === null || value === undefined) {
            localStorage.removeItem(key);
        } else {
            localStorage.setItem(key, JSON.stringify(value));
        }
    }

    // Get number value
    getNumber(key, defaultValue = 0) {
        const value = localStorage.getItem(key);
        return value !== null ? parseInt(value, 10) : defaultValue;
    }

    // Get boolean value
    getBool(key, defaultValue = false) {
        const value = localStorage.getItem(key);
        if (value === null) return defaultValue;
        return value === 'true';
    }

    // Session helpers
    getSession() {
        return {
            clientId: this.get(STORAGE_KEYS.CLIENT_ID),
            spreadsheetId: this.get(STORAGE_KEYS.SPREADSHEET_ID),
            token: this.get(STORAGE_KEYS.GAPI_TOKEN),
            tokenExpiry: this.getNumber(STORAGE_KEYS.TOKEN_EXPIRY),
            isValid: () => {
                const token = this.get(STORAGE_KEYS.GAPI_TOKEN);
                const expiry = this.getNumber(STORAGE_KEYS.TOKEN_EXPIRY);
                return token && expiry > Date.now();
            }
        };
    }

    setSession(clientId, spreadsheetId, token, expiryMs) {
        this.set(STORAGE_KEYS.CLIENT_ID, clientId);
        if (spreadsheetId) this.set(STORAGE_KEYS.SPREADSHEET_ID, spreadsheetId);
        this.set(STORAGE_KEYS.GAPI_TOKEN, token);
        this.set(STORAGE_KEYS.TOKEN_EXPIRY, expiryMs);
    }

    clearSession() {
        this.remove(STORAGE_KEYS.GAPI_TOKEN);
        this.remove(STORAGE_KEYS.TOKEN_EXPIRY);
    }

    clearAll() {
        Object.values(STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
        console.log('[Storage] All data cleared');
    }

    // Backup session helpers
    getBackupSession() {
        return {
            token: this.get(STORAGE_KEYS.ACCESS_TOKEN),
            tokenExpiry: this.getNumber(STORAGE_KEYS.BACKUP_TOKEN_EXPIRY),
            user: this.getJSON(STORAGE_KEYS.USER),
            lastBackup: this.get(STORAGE_KEYS.LAST_BACKUP),
            isValid: () => {
                const token = this.get(STORAGE_KEYS.ACCESS_TOKEN);
                const expiry = this.getNumber(STORAGE_KEYS.BACKUP_TOKEN_EXPIRY);
                return token && expiry > Date.now();
            }
        };
    }

    setBackupSession(token, user) {
        this.set(STORAGE_KEYS.ACCESS_TOKEN, token);
        this.set(STORAGE_KEYS.BACKUP_TOKEN_EXPIRY, Date.now() + 55 * 60 * 1000);
        this.setJSON(STORAGE_KEYS.USER, user);
    }

    clearBackupSession() {
        this.remove(STORAGE_KEYS.ACCESS_TOKEN);
        this.remove(STORAGE_KEYS.BACKUP_TOKEN_EXPIRY);
        this.remove(STORAGE_KEYS.USER);
        this.remove(STORAGE_KEYS.LAST_BACKUP);
    }
}

export const storage = new StorageService();
export default storage;
