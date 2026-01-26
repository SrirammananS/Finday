// Biometric Authentication Service
// Provides fingerprint/face authentication with PIN fallback

const LOCK_KEY = 'finday_app_lock_enabled';
const PIN_KEY = 'finday_app_pin';

class BiometricAuthService {
    constructor() {
        this.isSupported = this.checkSupport();
    }

    checkSupport() {
        return !!(window.PublicKeyCredential && navigator.credentials);
    }

    isLockEnabled() {
        return localStorage.getItem(LOCK_KEY) === 'true';
    }

    enableLock() {
        localStorage.setItem(LOCK_KEY, 'true');
    }

    disableLock() {
        localStorage.removeItem(LOCK_KEY);
        localStorage.removeItem(PIN_KEY);
    }

    // PIN Management
    setPIN(pin) {
        // Simple hash for demo (in production, use proper hashing)
        const hashed = btoa(pin);
        localStorage.setItem(PIN_KEY, hashed);
    }

    verifyPIN(pin) {
        const stored = localStorage.getItem(PIN_KEY);
        return stored === btoa(pin);
    }

    hasPIN() {
        return !!localStorage.getItem(PIN_KEY);
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
