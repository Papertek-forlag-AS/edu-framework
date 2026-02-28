/**
 * =================================================================
 * USER SESSION — Multi-tenant localStorage isolation
 * =================================================================
 *
 * Solves the shared-device problem: when User A logs out and User B
 * logs in on the same browser, User A's localStorage must NOT sync
 * to User B's cloud account.
 *
 * Approach: Every localStorage key is prefixed with the active user ID.
 * Keys are stored as `{userId}:{originalKey}`. When no user is logged in,
 * the prefix is `guest`.
 *
 * This module is the single source of truth for the active user identity.
 * It is auth-provider-agnostic — works with Firebase, FEIDE, or no auth.
 *
 * Usage:
 *   import { getActiveUserId, setActiveUser, clearActiveUser } from './user-session.js';
 *
 *   // On login
 *   setActiveUser(firebaseUser.uid, { name: 'Anna', provider: 'feide' });
 *
 *   // On logout
 *   clearActiveUser();
 *
 *   // Everywhere else — just call getActiveUserId()
 *   // safeStorage uses this internally to namespace all keys
 *
 * Multi-user coexistence:
 *   User A's data:  `uid_abc:progressData`, `uid_abc:vg1-tysk1-1-1-fill-in-aufgabeA`
 *   User B's data:  `uid_xyz:progressData`, `uid_xyz:vg1-tysk1-1-1-fill-in-aufgabeA`
 *   Guest data:     `guest:progressData`, `guest:vg1-tysk1-1-1-fill-in-aufgabeA`
 *
 *   All coexist in the same localStorage. Each user only sees their own keys.
 *   When A logs back in (even offline), their data is instantly available.
 */

// ─── Constants ──────────────────────────────────────────────────

const SESSION_KEY = 'papertek_active_user';
const SESSION_META_KEY = 'papertek_active_user_meta';
const GUEST_ID = 'guest';

// ─── Core API ───────────────────────────────────────────────────

/**
 * Get the active user ID. Returns 'guest' if no one is logged in.
 * This is called by safeStorage on every read/write to prefix keys.
 * @returns {string} User ID or 'guest'
 */
export function getActiveUserId() {
    try {
        return localStorage.getItem(SESSION_KEY) || GUEST_ID;
    } catch {
        return GUEST_ID;
    }
}

/**
 * Check if a user is currently logged in (not guest).
 * @returns {boolean}
 */
export function isUserLoggedIn() {
    return getActiveUserId() !== GUEST_ID;
}

/**
 * Set the active user after successful authentication.
 * This does NOT move or migrate data — that's handled separately.
 *
 * @param {string} userId - Unique user identifier (e.g., Firebase UID)
 * @param {Object} [meta] - Optional metadata (name, provider, email)
 */
export function setActiveUser(userId, meta = {}) {
    if (!userId || typeof userId !== 'string') {
        console.error('setActiveUser: userId is required');
        return;
    }

    const previousUserId = getActiveUserId();

    // Store the session (these two keys are NOT namespaced — they're global)
    localStorage.setItem(SESSION_KEY, userId);
    localStorage.setItem(SESSION_META_KEY, JSON.stringify({
        ...meta,
        loginTime: new Date().toISOString(),
    }));

    console.log(`👤 Active user set: ${userId} (was: ${previousUserId})`);

    // Dispatch event so other modules can react (e.g., cloud sync)
    window.dispatchEvent(new CustomEvent('papertek:user-changed', {
        detail: { userId, previousUserId, meta }
    }));
}

/**
 * Clear the active user (logout). Reverts to 'guest'.
 * Does NOT delete user data from localStorage — it stays dormant
 * and will be available when the user logs back in.
 */
export function clearActiveUser() {
    const previousUserId = getActiveUserId();

    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_META_KEY);

    console.log(`👤 User cleared (was: ${previousUserId}), reverted to guest`);

    window.dispatchEvent(new CustomEvent('papertek:user-changed', {
        detail: { userId: GUEST_ID, previousUserId, meta: {} }
    }));
}

/**
 * Get metadata for the active user.
 * @returns {Object|null} User metadata or null
 */
export function getActiveUserMeta() {
    try {
        const meta = localStorage.getItem(SESSION_META_KEY);
        return meta ? JSON.parse(meta) : null;
    } catch {
        return null;
    }
}

// ─── Key Namespacing ────────────────────────────────────────────

/**
 * Prefix a storage key with the active user's ID.
 * Called by safeStorage internally — exercise code never sees this.
 *
 * @param {string} key - The original key (e.g., 'progressData')
 * @returns {string} Namespaced key (e.g., 'uid_abc:progressData')
 */
export function namespacedKey(key) {
    return `${getActiveUserId()}:${key}`;
}

/**
 * Strip the user prefix from a namespaced key.
 * Useful for debugging and migration.
 *
 * @param {string} namespacedKey - Key with prefix (e.g., 'uid_abc:progressData')
 * @returns {string} Original key (e.g., 'progressData')
 */
export function stripNamespace(key) {
    const colonIndex = key.indexOf(':');
    return colonIndex > -1 ? key.substring(colonIndex + 1) : key;
}

// ─── Guest → Authenticated Migration ────────────────────────────

/**
 * Check if there is unclaimed guest data in localStorage.
 * @returns {boolean} True if guest data exists
 */
export function hasGuestData() {
    const guestPrefix = `${GUEST_ID}:`;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(guestPrefix)) {
            // Ignore trivial keys
            if (key === `${GUEST_ID}:progressData`) {
                const data = localStorage.getItem(key);
                if (data && data !== 'null') return true;
            } else if (key.startsWith(guestPrefix)) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Claim guest data for the current authenticated user.
 * Renames all `guest:*` keys to `{userId}:*`.
 *
 * Call this after login if hasGuestData() returns true and the user
 * confirms they want to keep the guest progress.
 *
 * @returns {number} Number of keys migrated
 */
export function claimGuestData() {
    const userId = getActiveUserId();
    if (userId === GUEST_ID) {
        console.warn('Cannot claim guest data — no user is logged in');
        return 0;
    }

    const guestPrefix = `${GUEST_ID}:`;
    const keysToMigrate = [];

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(guestPrefix)) {
            keysToMigrate.push(key);
        }
    }

    let migrated = 0;
    for (const oldKey of keysToMigrate) {
        const newKey = `${userId}:${oldKey.substring(guestPrefix.length)}`;

        // Only migrate if the user doesn't already have this key
        // (don't overwrite existing cloud-synced data)
        if (localStorage.getItem(newKey) === null) {
            const value = localStorage.getItem(oldKey);
            localStorage.setItem(newKey, value);
            migrated++;
        }

        // Remove the guest version
        localStorage.removeItem(oldKey);
    }

    console.log(`✅ Claimed ${migrated} guest data keys for user ${userId}`);
    return migrated;
}

/**
 * Get all localStorage keys belonging to a specific user.
 * @param {string} [userId] - User ID (defaults to active user)
 * @returns {string[]} Array of namespaced keys
 */
export function getUserKeys(userId) {
    const targetId = userId || getActiveUserId();
    const prefix = `${targetId}:`;
    const keys = [];

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
            keys.push(key);
        }
    }

    return keys;
}

// ─── Constants export ───────────────────────────────────────────

export { GUEST_ID, SESSION_KEY, SESSION_META_KEY };
