// Secure Cryptography Utilities
// Implements industry-standard encryption for E2E backup protection

const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 256;

/**
 * Generate cryptographically secure random bytes
 */
export function generateRandomBytes(length) {
    return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Generate a secure random ID
 */
export function generateSecureId() {
    const bytes = generateRandomBytes(16);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Derive an encryption key from a password using PBKDF2
 * @param {string} password - User's password/passphrase
 * @param {Uint8Array} salt - Random salt (generate new for encryption, reuse for decryption)
 * @returns {Promise<CryptoKey>} Derived AES-GCM key
 */
export async function deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveKey']
    );

    // Derive AES-GCM key using PBKDF2
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt data using AES-GCM with a password-derived key
 * @param {string|object} data - Data to encrypt (will be JSON stringified if object)
 * @param {string} password - Encryption password
 * @returns {Promise<string>} Base64-encoded encrypted payload (salt:iv:ciphertext)
 */
export async function encrypt(data, password) {
    const encoder = new TextEncoder();
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    const dataBuffer = encoder.encode(dataString);

    // Generate random salt and IV
    const salt = generateRandomBytes(SALT_LENGTH);
    const iv = generateRandomBytes(IV_LENGTH);

    // Derive key from password
    const key = await deriveKey(password, salt);

    // Encrypt data
    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        dataBuffer
    );

    // Combine salt + iv + ciphertext into single payload
    const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

    // Return as base64
    return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt data encrypted with encrypt()
 * @param {string} encryptedPayload - Base64-encoded encrypted payload
 * @param {string} password - Decryption password
 * @returns {Promise<string>} Decrypted data string
 */
export async function decrypt(encryptedPayload, password) {
    // Decode base64
    const combined = new Uint8Array(
        atob(encryptedPayload).split('').map(c => c.charCodeAt(0))
    );

    // Extract salt, iv, and ciphertext
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH);

    // Derive key from password
    const key = await deriveKey(password, salt);

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
    );

    return new TextDecoder().decode(decrypted);
}

/**
 * Hash a PIN/password for secure storage using PBKDF2
 * Returns salt:hash as base64
 * @param {string} pin - PIN or password to hash
 * @returns {Promise<string>} Base64-encoded salt:hash
 */
export async function hashPassword(pin) {
    const encoder = new TextEncoder();
    const salt = generateRandomBytes(SALT_LENGTH);
    const pinBuffer = encoder.encode(pin);

    // Import as key material
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        pinBuffer,
        'PBKDF2',
        false,
        ['deriveBits']
    );

    // Derive hash bits
    const hashBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt,
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256'
        },
        keyMaterial,
        256
    );

    // Combine salt + hash
    const hash = new Uint8Array(hashBits);
    const combined = new Uint8Array(salt.length + hash.length);
    combined.set(salt, 0);
    combined.set(hash, salt.length);

    return btoa(String.fromCharCode(...combined));
}

/**
 * Verify a PIN/password against a stored hash
 * @param {string} pin - PIN to verify
 * @param {string} storedHash - Base64-encoded salt:hash from hashPassword()
 * @returns {Promise<boolean>} True if PIN matches
 */
export async function verifyPassword(pin, storedHash) {
    try {
        const encoder = new TextEncoder();
        const combined = new Uint8Array(
            atob(storedHash).split('').map(c => c.charCodeAt(0))
        );

        // Extract salt and stored hash
        const salt = combined.slice(0, SALT_LENGTH);
        const expectedHash = combined.slice(SALT_LENGTH);

        const pinBuffer = encoder.encode(pin);

        // Import as key material
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            pinBuffer,
            'PBKDF2',
            false,
            ['deriveBits']
        );

        // Derive hash bits
        const hashBits = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt,
                iterations: PBKDF2_ITERATIONS,
                hash: 'SHA-256'
            },
            keyMaterial,
            256
        );

        const computedHash = new Uint8Array(hashBits);

        // Constant-time comparison to prevent timing attacks
        if (computedHash.length !== expectedHash.length) return false;

        let result = 0;
        for (let i = 0; i < computedHash.length; i++) {
            result |= computedHash[i] ^ expectedHash[i];
        }

        return result === 0;
    } catch (e) {
        console.error('[Crypto] Password verification failed:', e);
        return false;
    }
}

/**
 * Generate a secure backup encryption key from user's Google ID + local secret
 * This ensures backups are tied to the user's identity
 * @param {string} googleUserId - User's Google account ID
 * @param {string} localSecret - Local device secret (stored securely)
 * @returns {Promise<string>} Derived encryption passphrase
 */
export async function deriveBackupKey(googleUserId, localSecret) {
    const combined = `${googleUserId}:${localSecret}:laksh-backup-v1`;
    const encoder = new TextEncoder();
    const data = encoder.encode(combined);

    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);

    return btoa(String.fromCharCode(...hashArray));
}

/**
 * Generate or retrieve a local device secret
 * This is stored in IndexedDB for better security than localStorage
 */
export async function getOrCreateDeviceSecret() {
    const DB_NAME = 'laksh_secure';
    const STORE_NAME = 'secrets';
    const KEY = 'device_secret';

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);

        request.onerror = () => reject(request.error);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'key' });
            }
        };

        request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);

            const getRequest = store.get(KEY);

            getRequest.onsuccess = () => {
                if (getRequest.result?.value) {
                    resolve(getRequest.result.value);
                } else {
                    // Generate new device secret
                    const secret = generateSecureId() + generateSecureId();
                    store.put({ key: KEY, value: secret });
                    resolve(secret);
                }
            };

            getRequest.onerror = () => reject(getRequest.error);
        };
    });
}

export default {
    encrypt,
    decrypt,
    hashPassword,
    verifyPassword,
    deriveBackupKey,
    getOrCreateDeviceSecret,
    generateSecureId,
    generateRandomBytes
};
