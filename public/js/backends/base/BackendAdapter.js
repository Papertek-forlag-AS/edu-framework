/**
 * =================================================================
 * BACKEND ADAPTER — Base Interface
 * =================================================================
 *
 * Abstract interface for backend providers (Firebase, Supabase, etc.).
 * Combines auth and database operations into a single adapter.
 *
 * Implementations must provide:
 *   - Auth: sign in, sign out, auth state, user profile
 *   - Database: CRUD for documents, batch operations
 *   - Sync: progress, exercises, vocabulary sync
 *
 * @see backends/firebase/FirebaseBackend.js
 * @see backends/supabase/SupabaseBackend.js
 */

/**
 * @typedef {Object} BackendUser
 * @property {string} uid - Unique user ID
 * @property {string} email - User email
 * @property {string} displayName - Display name
 * @property {string|null} providerId - Auth provider ('feide', 'google', etc.)
 * @property {string|null} providerUid - Provider-specific user ID
 * @property {string|null} organization - User organization (school, etc.)
 */

/**
 * @typedef {Object} SyncResult
 * @property {boolean} success - Whether the operation succeeded
 * @property {number} [itemCount] - Number of items synced
 * @property {string} [error] - Error message if failed
 */

export class BackendAdapter {
    /**
     * @param {Object} config - Backend-specific configuration
     */
    constructor(config) {
        if (new.target === BackendAdapter) {
            throw new Error('BackendAdapter is abstract — use a concrete implementation');
        }
        this.config = config;
    }

    // ─── Auth ────────────────────────────────────────

    /** @returns {boolean} Whether auth is available and initialized */
    isAuthAvailable() { throw new Error('Not implemented'); }

    /** @returns {BackendUser|null} Current authenticated user */
    getCurrentUser() { throw new Error('Not implemented'); }

    /**
     * Listen for auth state changes.
     * @param {function(BackendUser|null): void} callback
     * @returns {function} Unsubscribe function
     */
    onAuthStateChanged(callback) { throw new Error('Not implemented'); }

    /**
     * Sign in with a popup (OAuth flow).
     * @param {string} providerId - 'google', 'feide', etc.
     * @returns {Promise<BackendUser>}
     */
    async signInWithPopup(providerId) { throw new Error('Not implemented'); }

    /**
     * Sign in with redirect (mobile-friendly OAuth).
     * @param {string} providerId
     * @returns {Promise<void>}
     */
    async signInWithRedirect(providerId) { throw new Error('Not implemented'); }

    /**
     * Handle redirect result after OAuth redirect flow.
     * @returns {Promise<{user: BackendUser|null}>}
     */
    async getRedirectResult() { throw new Error('Not implemented'); }

    /** Sign out the current user. */
    async signOut() { throw new Error('Not implemented'); }

    /**
     * Create or update a user profile in the backend.
     * @param {BackendUser} user
     * @param {Object} profileData - Additional profile fields
     */
    async upsertUserProfile(user, profileData) { throw new Error('Not implemented'); }

    /**
     * Delete the current user's account and all associated data.
     * @returns {Promise<void>}
     */
    async deleteUserAccount() { throw new Error('Not implemented'); }

    /**
     * Export all user data (GDPR compliance).
     * @returns {Promise<Object>} All user data
     */
    async exportUserData() { throw new Error('Not implemented'); }

    // ─── Database (Document CRUD) ────────────────────

    /**
     * Get a single document.
     * @param {string} collection - Collection/table name
     * @param {string} docId - Document/row ID
     * @returns {Promise<Object|null>}
     */
    async getDocument(collection, docId) { throw new Error('Not implemented'); }

    /**
     * Set (create or replace) a document. Supports merge mode.
     * @param {string} collection
     * @param {string} docId
     * @param {Object} data
     * @param {{ merge?: boolean }} options
     */
    async setDocument(collection, docId, data, options = {}) { throw new Error('Not implemented'); }

    /**
     * Delete a document.
     * @param {string} collection
     * @param {string} docId
     */
    async deleteDocument(collection, docId) { throw new Error('Not implemented'); }

    /**
     * Get all documents in a collection (optionally scoped to user).
     * @param {string} collection
     * @param {{ userId?: string }} options
     * @returns {Promise<Array<{id: string, data: Object}>>}
     */
    async getCollection(collection, options = {}) { throw new Error('Not implemented'); }

    /**
     * Create a batch writer for multiple operations.
     * @returns {BatchWriter}
     */
    createBatch() { throw new Error('Not implemented'); }

    // ─── Sync (High-Level Operations) ────────────────
    // These use the document CRUD methods internally but provide
    // domain-specific convenience methods.

    /** @returns {boolean} Whether sync is possible (user logged in) */
    isSyncAvailable() {
        return this.isAuthAvailable() && this.getCurrentUser() !== null;
    }

    /**
     * Sync a single exercise completion to the cloud.
     * @param {string} exerciseId
     * @param {string} lessonId
     * @param {Object} data - Exercise completion data
     * @returns {Promise<SyncResult>}
     */
    async syncExercise(exerciseId, lessonId, data) { throw new Error('Not implemented'); }

    /**
     * Sync all local progress to the cloud (bulk push).
     * @param {Object} progressData - Full progress data from localStorage
     * @returns {Promise<SyncResult>}
     */
    async syncAllProgress(progressData) { throw new Error('Not implemented'); }

    /**
     * Pull progress from the cloud and return it for merging.
     * @returns {Promise<Object>} Cloud progress data
     */
    async loadProgressFromCloud() { throw new Error('Not implemented'); }

    /**
     * Sync vocabulary (known words) to the cloud.
     * @param {string[]} words
     * @returns {Promise<SyncResult>}
     */
    async syncKnownWords(words) { throw new Error('Not implemented'); }

    /**
     * Load known words from the cloud.
     * @returns {Promise<string[]>}
     */
    async loadKnownWords() { throw new Error('Not implemented'); }
}

/**
 * Abstract batch writer for grouped operations.
 */
export class BatchWriter {
    /**
     * Queue a set operation.
     * @param {string} collection
     * @param {string} docId
     * @param {Object} data
     * @param {{ merge?: boolean }} options
     */
    set(collection, docId, data, options = {}) { throw new Error('Not implemented'); }

    /**
     * Queue a delete operation.
     * @param {string} collection
     * @param {string} docId
     */
    delete(collection, docId) { throw new Error('Not implemented'); }

    /**
     * Execute all queued operations atomically.
     * @returns {Promise<void>}
     */
    async commit() { throw new Error('Not implemented'); }
}
