// Cloud Backup Service - WhatsApp-style One-Touch Backup
// Uses Google Drive API with E2E encryption for privacy-preserving backups

import { encrypt, decrypt, deriveBackupKey, getOrCreateDeviceSecret } from './crypto';
import { storage, STORAGE_KEYS } from './storage';

// Comprehensive scopes for LAKSH:
// - drive.appdata: Store encrypted backups (WhatsApp style)
// - userinfo.email: Identity for encryption key derivation
// - spreadsheets: Full access to finance ledger sheets
// - drive.readonly: List sheets for selection
const DRIVE_SCOPES = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly';
const BACKUP_FILENAME = 'laksh_backup.enc';
const BACKUP_FOLDER_NAME = 'LAKSH Backups';
const BACKUP_VERSION = 1;

// Auto-backup interval: 15 minutes after last change
const AUTO_BACKUP_DELAY_MS = 15 * 60 * 1000;

class CloudBackupService {
    constructor() {
        this.isInitialized = false;
        this.isInitializing = false;
        this.tokenClient = null;
        this.accessToken = null;
        this.user = null;
        this.backupFolderId = null;
        this.autoBackupTimer = null;
        this.lastBackupTime = null;
        this.encryptionKey = null;
        this.listeners = new Set();
    }

    // Subscribe to backup status changes
    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notify(status) {
        this.listeners.forEach(cb => cb(status));
    }

    // Wait for Google Identity Services to load
    async waitForGIS() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 100; // Increased for slower mobile connections

            const check = () => {
                attempts++;
                if (window.google?.accounts?.oauth2 && window.gapi) {
                    resolve(true);
                } else if (attempts >= maxAttempts) {
                    // Try to dynamically load if not available
                    this.loadGoogleAPIsIfNeeded()
                        .then(() => resolve(true))
                        .catch(reject);
                } else {
                    setTimeout(check, 200); // Longer interval for mobile
                }
            };
            check();
        });
    }

    // Dynamically load Google APIs if not loaded
    async loadGoogleAPIsIfNeeded() {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (window.google?.accounts?.oauth2 && window.gapi) {
                resolve();
                return;
            }

            let gapiLoaded = false;
            let gisLoaded = false;

            const checkComplete = () => {
                if (gapiLoaded && gisLoaded) {
                    resolve();
                }
            };

            // Load GAPI
            if (!window.gapi) {
                const gapiScript = document.createElement('script');
                gapiScript.src = 'https://apis.google.com/js/api.js';
                gapiScript.onload = () => {
                    gapiLoaded = true;
                    checkComplete();
                };
                gapiScript.onerror = reject;
                document.head.appendChild(gapiScript);
            } else {
                gapiLoaded = true;
            }

            // Load GIS
            if (!window.google?.accounts) {
                const gisScript = document.createElement('script');
                gisScript.src = 'https://accounts.google.com/gsi/client';
                gisScript.onload = () => {
                    gisLoaded = true;
                    checkComplete();
                };
                gisScript.onerror = reject;
                document.head.appendChild(gisScript);
            } else {
                gisLoaded = true;
            }

            checkComplete();
        });
    }

    // Initialize with app-level OAuth client
    async init() {
        if (this.isInitialized && this.accessToken) return true;
        if (this.isInitializing) {
            // Wait for existing initialization to complete
            while (this.isInitializing) {
                await new Promise(r => setTimeout(r, 100));
            }
            return this.isInitialized;
        }

        this.isInitializing = true;
        try {
            console.log('[CloudBackup] Initializing...');
            await this.waitForGIS();
            // Load GAPI client
            await new Promise((resolve, reject) => {
                window.gapi.load('client', { callback: resolve, onerror: reject });
            });
            // Initialize GAPI client with Drive API
            await window.gapi.client.init({
                discoveryDocs: [
                    'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
                    'https://sheets.googleapis.com/$discovery/rest?version=v4'
                ]
            });
            // Use pre-configured OAuth client ID from environment
            const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
            this.tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: DRIVE_SCOPES,
                callback: () => { }
            });
            // Try to restore existing session
            const backupSession = storage.getBackupSession();
            if (backupSession.isValid() && backupSession.user) {
                window.gapi.client.setToken({ access_token: backupSession.token });
                this.accessToken = backupSession.token;
                this.user = backupSession.user;
                this.isInitialized = true;
                // Setup encryption key
                await this.setupEncryptionKey();
                console.log('[CloudBackup] Session restored');
                return true;
            }

            this.isInitialized = true;
            this.isInitializing = false;
            return true;
        } catch (error) {
            console.error('[CloudBackup] Init failed:', error);
            this.isInitializing = false;
            throw error;
        }
    }

    // One-touch Google Sign-In
    async signIn() {
        return new Promise((resolve, reject) => {
            if (!this.tokenClient) {
                reject(new Error('Service not initialized'));
                return;
            }

            this.tokenClient.callback = async (response) => {
                if (response.error) {
                    reject(new Error(response.error));
                    return;
                }

                this.accessToken = response.access_token;

                // Store token securely
                storage.setBackupSession(response.access_token, null);

                // Get user info
                try {
                    const userInfo = await this.getUserInfo();
                    this.user = userInfo;
                    storage.setBackupSession(response.access_token, userInfo);

                    // Setup encryption key
                    await this.setupEncryptionKey();

                    // Ensure backup folder exists
                    await this.ensureBackupFolder();

                    this.notify({ type: 'signed_in', user: userInfo });
                    resolve(userInfo);
                } catch (e) {
                    reject(e);
                }
            };

            // Request access token with consent prompt for new users
            console.log('[CloudBackup] Requesting access token...');
            this.tokenClient.requestAccessToken({ prompt: 'consent' });
        });
    }

    // Silent sign-in for returning users
    async silentSignIn() {
        return new Promise((resolve, reject) => {
            if (!this.tokenClient) {
                reject(new Error('Service not initialized'));
                return;
            }

            this.tokenClient.callback = async (response) => {
                if (response.error) {
                    // Silent sign-in failed, user needs to sign in manually
                    resolve(null);
                    return;
                }

                this.accessToken = response.access_token;
                storage.setBackupSession(response.access_token, null);

                try {
                    const userInfo = await this.getUserInfo();
                    this.user = userInfo;
                    storage.setBackupSession(response.access_token, userInfo);
                    await this.setupEncryptionKey();
                    resolve(userInfo);
                } catch (e) {
                    resolve(null);
                }
            };

            // Try silent sign-in (no prompt)
            this.tokenClient.requestAccessToken({ prompt: '' });
        });
    }

    // Get user info from Google (minimal data)
    async getUserInfo() {
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('UserInfo API response:', response.status, response.statusText);
                throw new Error(`Failed to get user info: ${response.status} ${response.statusText}`);
            }

            const userData = await response.json();

            // Handle minimal user data - only email is guaranteed
            const userInfo = {
                id: userData.id,
                email: userData.email,
                name: userData.name || userData.email?.split('@')[0] || 'User',
                picture: userData.picture || null
            };

            console.log('[CloudBackup] User info retrieved:', userInfo.email);
            return userInfo;
        } catch (error) {
            console.error('[CloudBackup] getUserInfo failed:', error);
            throw error;
        }
    }

    // Setup encryption key from user identity + device secret
    async setupEncryptionKey() {
        if (!this.user?.id) throw new Error('User not authenticated');

        const deviceSecret = await getOrCreateDeviceSecret();
        this.encryptionKey = await deriveBackupKey(this.user.id, deviceSecret);
    }

    // Sign out and clear data
    signOut() {
        if (this.accessToken) {
            try {
                window.google?.accounts?.oauth2?.revoke(this.accessToken);
            } catch (e) { }
        }

        storage.clearBackupSession();

        this.accessToken = null;
        this.user = null;
        this.encryptionKey = null;
        this.backupFolderId = null;

        this.notify({ type: 'signed_out' });
    }

    // Check if user is signed in
    isSignedIn() {
        return !!(this.accessToken && this.user);
    }

    // Get current user
    getUser() {
        return this.user;
    }

    // Ensure backup folder exists in Drive
    async ensureBackupFolder() {
        if (this.backupFolderId) return this.backupFolderId;

        try {
            // Search for existing folder
            const searchResponse = await gapi.client.drive.files.list({
                q: `name='${BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                spaces: 'drive',
                fields: 'files(id, name)'
            });

            const files = searchResponse.result.files || [];
            if (files.length > 0) {
                this.backupFolderId = files[0].id;
                return this.backupFolderId;
            }

            // Create new folder
            const createResponse = await gapi.client.drive.files.create({
                resource: {
                    name: BACKUP_FOLDER_NAME,
                    mimeType: 'application/vnd.google-apps.folder'
                },
                fields: 'id'
            });

            this.backupFolderId = createResponse.result.id;
            return this.backupFolderId;
        } catch (error) {
            console.error('[CloudBackup] Failed to ensure backup folder:', error);
            throw error;
        }
    }

    // Create encrypted backup
    async createBackup(data) {
        if (!this.isSignedIn()) throw new Error('Not signed in');
        if (!this.encryptionKey) throw new Error('Encryption key not set');

        this.notify({ type: 'backup_started' });

        try {
            await this.ensureBackupFolder();

            // Prepare backup payload
            const backupPayload = {
                version: BACKUP_VERSION,
                timestamp: new Date().toISOString(),
                data: {
                    transactions: data.transactions || [],
                    accounts: data.accounts || [],
                    categories: data.categories || [],
                    bills: data.bills || []
                }
            };

            // Encrypt the backup
            const encryptedData = await encrypt(backupPayload, this.encryptionKey);

            // Check if backup file already exists
            const searchResponse = await gapi.client.drive.files.list({
                q: `name='${BACKUP_FILENAME}' and '${this.backupFolderId}' in parents and trashed=false`,
                spaces: 'drive',
                fields: 'files(id, name)'
            });

            const existingFiles = searchResponse.result.files || [];

            // Create file metadata
            const metadata = {
                name: BACKUP_FILENAME,
                mimeType: 'application/octet-stream'
            };

            // Upload using multipart request
            const boundary = '-------laksh_backup_boundary';
            const body = this.buildMultipartBody(metadata, encryptedData, boundary);

            let response;
            if (existingFiles.length > 0) {
                // Update existing file
                response = await fetch(
                    `https://www.googleapis.com/upload/drive/v3/files/${existingFiles[0].id}?uploadType=multipart`,
                    {
                        method: 'PATCH',
                        headers: {
                            Authorization: `Bearer ${this.accessToken}`,
                            'Content-Type': `multipart/related; boundary=${boundary}`
                        },
                        body
                    }
                );
            } else {
                // Create new file
                metadata.parents = [this.backupFolderId];
                const createBody = this.buildMultipartBody(metadata, encryptedData, boundary);

                response = await fetch(
                    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
                    {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${this.accessToken}`,
                            'Content-Type': `multipart/related; boundary=${boundary}`
                        },
                        body: createBody
                    }
                );
            }

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Backup upload failed');
            }

            const result = await response.json();
            this.lastBackupTime = new Date();
            storage.set(STORAGE_KEYS.LAST_BACKUP, this.lastBackupTime.toISOString());

            this.notify({ type: 'backup_completed', timestamp: this.lastBackupTime });
            console.log('[CloudBackup] Backup completed:', result.id);

            return { success: true, fileId: result.id, timestamp: this.lastBackupTime };
        } catch (error) {
            console.error('[CloudBackup] Backup failed:', error);
            this.notify({ type: 'backup_failed', error: error.message });
            throw error;
        }
    }

    // Build multipart request body for Drive API
    buildMultipartBody(metadata, content, boundary) {
        const metadataJson = JSON.stringify(metadata);

        return `--${boundary}\r\n` +
            `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
            `${metadataJson}\r\n` +
            `--${boundary}\r\n` +
            `Content-Type: application/octet-stream\r\n\r\n` +
            `${content}\r\n` +
            `--${boundary}--`;
    }

    // Restore from backup
    async restoreBackup() {
        if (!this.isSignedIn()) throw new Error('Not signed in');
        if (!this.encryptionKey) throw new Error('Encryption key not set');

        this.notify({ type: 'restore_started' });

        try {
            await this.ensureBackupFolder();

            // Find backup file
            const searchResponse = await gapi.client.drive.files.list({
                q: `name='${BACKUP_FILENAME}' and '${this.backupFolderId}' in parents and trashed=false`,
                spaces: 'drive',
                fields: 'files(id, name, modifiedTime)',
                orderBy: 'modifiedTime desc'
            });

            const files = searchResponse.result.files || [];
            if (files.length === 0) {
                this.notify({ type: 'restore_completed', data: null });
                return null;
            }

            // Download the backup file
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files/${files[0].id}?alt=media`,
                {
                    headers: { Authorization: `Bearer ${this.accessToken}` }
                }
            );

            if (!response.ok) throw new Error('Failed to download backup');

            const encryptedData = await response.text();

            // Decrypt the backup
            const decryptedJson = await decrypt(encryptedData, this.encryptionKey);
            const backupPayload = JSON.parse(decryptedJson);

            // Validate backup version
            if (backupPayload.version > BACKUP_VERSION) {
                throw new Error('Backup was created with a newer version of the app');
            }

            this.notify({ type: 'restore_completed', data: backupPayload.data });
            console.log('[CloudBackup] Restore completed:', backupPayload.timestamp);

            return backupPayload.data;
        } catch (error) {
            console.error('[CloudBackup] Restore failed:', error);
            this.notify({ type: 'restore_failed', error: error.message });
            throw error;
        }
    }

    // Get backup info without downloading
    async getBackupInfo() {
        if (!this.isSignedIn()) return null;

        try {
            await this.ensureBackupFolder();

            const searchResponse = await gapi.client.drive.files.list({
                q: `name='${BACKUP_FILENAME}' and '${this.backupFolderId}' in parents and trashed=false`,
                spaces: 'drive',
                fields: 'files(id, name, modifiedTime, size)'
            });

            const files = searchResponse.result.files || [];
            if (files.length === 0) return null;

            return {
                id: files[0].id,
                lastModified: new Date(files[0].modifiedTime),
                size: parseInt(files[0].size) || 0
            };
        } catch (error) {
            console.error('[CloudBackup] Failed to get backup info:', error);
            return null;
        }
    }

    // Schedule auto-backup after data changes
    scheduleAutoBackup(getData) {
        // Clear existing timer
        if (this.autoBackupTimer) {
            clearTimeout(this.autoBackupTimer);
        }

        // Don't auto-backup if not signed in
        if (!this.isSignedIn()) return;

        // Schedule backup after delay
        this.autoBackupTimer = setTimeout(async () => {
            try {
                const data = await getData();
                await this.createBackup(data);
            } catch (error) {
                console.error('[CloudBackup] Auto-backup failed:', error);
            }
        }, AUTO_BACKUP_DELAY_MS);
    }

    // Get last backup time
    getLastBackupTime() {
        if (this.lastBackupTime) return this.lastBackupTime;

        const stored = storage.get(STORAGE_KEYS.LAST_BACKUP);
        if (stored) {
            this.lastBackupTime = new Date(stored);
            return this.lastBackupTime;
        }

        return null;
    }
}

export const cloudBackup = new CloudBackupService();
export default cloudBackup;
