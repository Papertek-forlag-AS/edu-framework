/**
 * =================================================================
 * BACKEND FACTORY
 * =================================================================
 *
 * Creates the appropriate backend adapter based on configuration.
 * Singleton pattern — the same instance is returned on every call.
 *
 * Usage:
 *   import { initBackend, getBackend } from './backends/BackendFactory.js';
 *
 *   // Initialize once at app startup (async):
 *   await initBackend({ provider: 'firebase', firebase: {...} });
 *
 *   // Then use anywhere (sync):
 *   const backend = getBackend();
 *   const user = backend.getCurrentUser();
 *
 * Configuration (papertek.config.js):
 *   backend: {
 *     provider: 'firebase',         // 'firebase' | 'supabase' | 'none'
 *     firebase: { ... },            // Firebase config (if provider === 'firebase')
 *     supabase: {                   // Supabase config (if provider === 'supabase')
 *       url: 'https://xxx.supabase.co',
 *       anonKey: 'eyJ...'
 *     }
 *   }
 */

/** @type {import('./base/BackendAdapter.js').BackendAdapter|null} */
let _instance = null;

/**
 * Null backend for when no provider is configured.
 * All operations are no-ops — the app works fully offline with localStorage.
 */
class NullBackend {
    isAuthAvailable() { return false; }
    getCurrentUser() { return null; }
    onAuthStateChanged(cb) { cb(null); return () => {}; }
    isSyncAvailable() { return false; }

    async signInWithPopup() { return null; }
    async signInWithRedirect() {}
    async getRedirectResult() { return { user: null }; }
    async signOut() {}
    async upsertUserProfile() {}
    async deleteUserAccount() {}
    async exportUserData() { return {}; }

    async getDocument() { return null; }
    async setDocument() {}
    async deleteDocument() {}
    async getCollection() { return []; }
    createBatch() {
        return { set() {}, delete() {}, async commit() {} };
    }

    async syncExercise() { return { success: false, error: 'No backend configured' }; }
    async syncAllProgress() { return { success: false, error: 'No backend configured' }; }
    async loadProgressFromCloud() { return {}; }
    async syncKnownWords() { return { success: false, error: 'No backend configured' }; }
    async loadKnownWords() { return []; }
}

/**
 * Initialize the backend (async, call once at startup).
 * Dynamically imports the correct backend module.
 *
 * @param {Object} [config] - Backend configuration
 * @param {string} config.provider - 'firebase' | 'supabase' | 'none'
 * @param {Object} [config.firebase] - Firebase config object
 * @param {Object} [config.supabase] - Supabase config object
 * @returns {Promise<import('./base/BackendAdapter.js').BackendAdapter>}
 */
export async function initBackend(config) {
    if (_instance) return _instance;

    const backendConfig = config || detectConfig();

    switch (backendConfig.provider) {
        case 'firebase': {
            if (typeof firebase === 'undefined') {
                console.warn('[BackendFactory] Firebase SDK not loaded — using offline mode');
                _instance = new NullBackend();
                break;
            }
            const { FirebaseBackend } = await import('./firebase/FirebaseBackend.js');
            _instance = new FirebaseBackend(backendConfig.firebase || {});
            break;
        }
        case 'supabase': {
            if (typeof supabase === 'undefined') {
                console.warn('[BackendFactory] Supabase SDK not loaded — using offline mode');
                _instance = new NullBackend();
                break;
            }
            const { SupabaseBackend } = await import('./supabase/SupabaseBackend.js');
            _instance = new SupabaseBackend({
                supabaseUrl: backendConfig.supabase?.url,
                supabaseAnonKey: backendConfig.supabase?.anonKey,
                ...backendConfig.supabase
            });
            break;
        }
        default:
            console.log('[BackendFactory] No backend configured — offline-only mode');
            _instance = new NullBackend();
    }

    return _instance;
}

/**
 * Get the current backend instance (sync, after initBackend has been called).
 * Returns NullBackend if not yet initialized.
 *
 * @returns {import('./base/BackendAdapter.js').BackendAdapter}
 */
export function getBackend() {
    if (!_instance) {
        // Auto-detect and use NullBackend rather than crashing
        _instance = new NullBackend();
    }
    return _instance;
}

/**
 * Reset the singleton (for testing or reconfiguration).
 */
export function resetBackend() {
    _instance = null;
}

/**
 * Detect backend config from existing page state.
 * Checks for loaded SDKs and global configuration.
 */
function detectConfig() {
    // Check if Firebase SDKs are loaded and initialized
    if (typeof firebase !== 'undefined' && firebase.apps?.length > 0) {
        return { provider: 'firebase', firebase: firebase.apps[0].options };
    }

    // Check for Supabase
    if (typeof supabase !== 'undefined' && window.__SUPABASE_CONFIG) {
        return { provider: 'supabase', supabase: window.__SUPABASE_CONFIG };
    }

    return { provider: 'none' };
}
