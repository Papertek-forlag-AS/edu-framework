/**
 * Storage Manager
 * Centralized storage key management and helper functions
 */

// Storage keys used throughout the application
export const STORAGE_KEYS = {
    // Progress data
    PROGRESS_LEGACY: 'tysk08-progress',
    PROGRESS: 'progressData',

    // Vocabulary trainer
    VOCAB: 'vocab-trainer-multi',
    VOCAB_KNOWN_WORDS_LEGACY: 'vocab-trainer-known-words',
    VOCABULARY: 'vocabulary',

    // App state
    VERSION: 'app_version',
    FORCE_UPDATE: 'force-update-in-progress',

    // Teacher mode
    TEACHER_MODE: 'tysk08_teacherMode',

    // Test progress
    VERB_TEST_PROGRESS: 'verb-test-progress',
    VOCAB_TEST_PROGRESS: 'vocab-test-progress',

    // Exercise state (pattern: curriculum-lessonId-exerciseType-exerciseId)
    EXERCISE_KEYS_MIGRATED: 'exerciseKeysMigrated',

    // Migration tracking (per user)
    getMigrationDoneKey: (userId) => `migration_done_${userId}`,
    getMigrationTimestampKey: (userId) => `migration_timestamp_${userId}`,
};

/**
 * Get a value from localStorage with optional parsing
 * @param {string} key - The storage key
 * @param {*} defaultValue - Default value if key doesn't exist
 * @returns {*} The stored value or default
 */
export function getStorageItem(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        if (item === null) return defaultValue;
        return JSON.parse(item);
    } catch (e) {
        console.warn(`Error parsing storage item ${key}:`, e);
        return defaultValue;
    }
}

/**
 * Set a value in localStorage with JSON stringification
 * @param {string} key - The storage key
 * @param {*} value - The value to store
 */
export function setStorageItem(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error(`Error setting storage item ${key}:`, e);
    }
}

/**
 * Remove an item from localStorage
 * @param {string} key - The storage key
 */
export function removeStorageItem(key) {
    localStorage.removeItem(key);
}

/**
 * Clear all app-related storage (use with caution!)
 */
export function clearAllAppStorage() {
    Object.values(STORAGE_KEYS).forEach(key => {
        if (typeof key === 'string') {
            localStorage.removeItem(key);
        }
    });
    console.log('✅ All app storage cleared');
}
