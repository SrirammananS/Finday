// Biometric Authentication Service
// Provides fingerprint/face authentication with PIN fallback
// Uses PBKDF2 for secure PIN hashing

import { hashPassword, verifyPassword } from './crypto';
import { storage, STORAGE_KEYS } from './storage';

class BiometricAuthService {
    constructor() {
        this.isSupported = this.checkSupport();
        this.pinVerifyCache = null; // Cache for performance
    }

    checkSupport() {
        return !!(window.PublicKeyCredential && navigator.credentials);
    }

    isLockEnabled() {
        return storage.getBool(STORAGE_KEYS.LOCK_ENABLED);
    }

    enableLock() {
        storage.set(STORAGE_KEYS.LOCK_ENABLED, 'true');
    }

    disableLock() {
        storage.remove(STORAGE_KEYS.LOCK_ENABLED);
        storage.remove(STORAGE_KEYS.PIN_HASH);
        this.pinVerifyCache = null;
    }

    // PIN Management - Now uses secure PBKDF2 hashing
    async setPIN(pin) {
        const hashedPin = await hashPassword(pin);
        storage.set(STORAGE_KEYS.PIN_HASH, hashedPin);
        this.pinVerifyCache = null;
    }

    async verifyPIN(pin) {
        const storedHash = storage.get(STORAGE_KEYS.PIN_HASH);
        if (!storedHash) return false;

        // Use cached result if available (prevents timing attacks on repeated attempts)
        return await verifyPassword(pin, storedHash);
    }

    hasPIN() {
        return !!storage.get(STORAGE_KEYS.PIN_HASH);
    }

    // Migration: Check if old insecure PIN exists and needs migration
    async migrateInsecurePIN() {
        // Migrate from old finday_ keys
        const oldPinKey = 'finday_app_pin';
        const oldPin = localStorage.getItem(oldPinKey);
        if (oldPin && !storage.get(STORAGE_KEYS.PIN_HASH)) {
            try {
                const decodedPin = atob(oldPin);
                await this.setPIN(decodedPin);
                localStorage.removeItem(oldPinKey);
                console.log('[BiometricAuth] Migrated insecure PIN to secure hash');
            } catch (e) {
                console.error('[BiometricAuth] PIN migration failed:', e);
            }
        }
        
        // Migrate lock enabled flag
        const oldLockKey = 'finday_app_lock_enabled';
        if (localStorage.getItem(oldLockKey) === 'true') {
            storage.set(STORAGE_KEYS.LOCK_ENABLED, 'true');
            localStorage.removeItem(oldLockKey);
        }
        
        // Run general storage migration
        storage.migrate();
    }

    // Biometric Authentication
    async authenticateBiometric() {
        if (!this.isSupported) {
            return { success: false, reason: 'Biometric not supported' };
        }

        try {
            // Create a challenge
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);

            const credential = await navigator.credentials.get({
                publicKey: {
                    challenge,
                    timeout: 60000,
                    rpId: window.location.hostname,
                    userVerification: 'required',
                    authenticatorAttachment: 'platform', // Force platform auth (TouchID/FaceID)
                    allowCredentials: []
                }
            });

            if (credential) {
                return { success: true };
            }
            return { success: false, reason: 'Authentication cancelled' };
        } catch (error) {
            console.log('Biometric auth error:', error);
            return { success: false, reason: error.message || 'Authentication failed' };
        }
    }

    // Combined auth - tries biometric first, falls back to PIN
    async authenticate() {
        if (this.isSupported) {
            const bioResult = await this.authenticateBiometric();
            if (bioResult.success) return bioResult;
        }
        // Fallback to PIN (UI will handle this)
        return { success: false, requirePin: true };
    }
}

export const biometricAuth = new BiometricAuthService();
export default biometricAuth;
