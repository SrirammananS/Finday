/**
 * Vault MPIN: hash and verify a numeric PIN for vault unlock.
 * Hash is stored in _Config sheet (vault_mpin_hash); never store plain PIN.
 */

const SALT = 'laksh-vault-mpin-v1';

function encode(str) {
  return new TextEncoder().encode(str);
}

function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hash PIN for storage. Uses SHA-256 with fixed app salt.
 * @param {string} pin - Numeric PIN (e.g. 4–8 digits)
 * @returns {Promise<string>} Hex-encoded hash
 */
export async function hashVaultPin(pin) {
  const normalized = String(pin).trim();
  const data = encode(SALT + normalized);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(hash);
}

/**
 * Verify user input against stored hash (constant-time compare).
 * @param {string} inputPin - PIN entered by user
 * @param {string} storedHash - Hash from config (vault_mpin_hash)
 * @returns {Promise<boolean>}
 */
export async function verifyVaultPin(inputPin, storedHash) {
  if (!storedHash || !inputPin) return false;
  const inputHash = await hashVaultPin(inputPin);
  if (inputHash.length !== storedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < inputHash.length; i++) {
    diff |= inputHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return diff === 0;
}
