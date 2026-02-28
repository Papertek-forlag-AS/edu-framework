/**
 * =================================================================
 * STORAGE UTILITIES - Standardized Exercise State Management
 * =================================================================
 *
 * Centralized exercise storage utilities that ensure consistent
 * localStorage key patterns across all exercise types.
 *
 * STANDARD KEY FORMAT: {curriculum}-{lessonId}-{exerciseType}-{exerciseId}
 *
 * Examples:
 * - vg1-tysk1-1-3-fill-in-aufgabeA
 * - vg1-tysk1-1-3-true-false-aufgabeC
 * - vg1-tysk1-2-2-matching-ovelse-1
 *
 * Note: User isolation is handled transparently by safeStorage (via
 * user-session.js). Exercise code does NOT need to worry about
 * multi-user namespacing — it's automatic at the storage layer.
 *
 * Benefits:
 * - Easy to query all exercises for a lesson (prefix matching)
 * - Consistent ordering (alphabetically sorted by lesson)
 * - Simpler reset logic
 * - Easier debugging
 */

import { namespacedKey } from '../core/user-session.js';

/**
 * Generate standardized localStorage key for an exercise
 * @param {string} curriculum - Curriculum ID (e.g., 'vg1-tysk1')
 * @param {string} lessonId - Lesson ID (e.g., '1-3')
 * @param {string} exerciseType - Type of exercise (e.g., 'fill-in', 'true-false')
 * @param {string} exerciseId - Exercise identifier (e.g., 'aufgabeA', 'ovelse-1')
 * @returns {string} Standardized localStorage key
 */
export function getExerciseStorageKey(curriculum, lessonId, exerciseType, exerciseId) {
    return `${curriculum}-${lessonId}-${exerciseType}-${exerciseId}`;
}

/**
 * Save exercise state to localStorage
 * @param {string} curriculum - Curriculum ID
 * @param {string} lessonId - Lesson ID
 * @param {string} exerciseType - Type of exercise
 * @param {string} exerciseId - Exercise identifier
 * @param {any} state - State to save (will be JSON stringified)
 */
export function saveExerciseState(curriculum, lessonId, exerciseType, exerciseId, state) {
    const key = getExerciseStorageKey(curriculum, lessonId, exerciseType, exerciseId);
    const nsKey = namespacedKey(key);
    localStorage.setItem(nsKey, JSON.stringify(state));
    console.log(`💾 Saved exercise state: ${key}`);
}

/**
 * Load exercise state from localStorage
 * @param {string} curriculum - Curriculum ID
 * @param {string} lessonId - Lesson ID
 * @param {string} exerciseType - Type of exercise
 * @param {string} exerciseId - Exercise identifier
 * @param {any} defaultState - Default state if not found
 * @returns {any} Parsed state or default
 */
export function loadExerciseState(curriculum, lessonId, exerciseType, exerciseId, defaultState = null) {
    const key = getExerciseStorageKey(curriculum, lessonId, exerciseType, exerciseId);
    const nsKey = namespacedKey(key);
    const stored = localStorage.getItem(nsKey);
    return stored ? JSON.parse(stored) : defaultState;
}

/**
 * Clear all exercise state for a specific lesson
 * Handles both new standardized format AND old legacy format
 * @param {string} curriculum - Curriculum ID
 * @param {string} lessonId - Lesson ID
 * @returns {number} Number of keys cleared
 */
export function clearLessonExercises(curriculum, lessonId) {
    const keysToRemove = [];

    // All keys are namespaced: {userId}:{curriculum}-{lessonId}-...
    // We need to match the user-prefixed versions
    const nsNewFormatPrefix = namespacedKey(`${curriculum}-${lessonId}-`);
    const nsOldFillInPrefix = namespacedKey(`${curriculum}-fill-in-`);
    const oldFillInSuffix = `-${lessonId}`;
    const oldExerciseTypes = ['true-false', 'matching', 'drag-drop', 'writing', 'flashcard', 'quiz', 'jeopardy'];

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        // Check new standardized format (namespaced)
        if (key.startsWith(nsNewFormatPrefix)) {
            keysToRemove.push(key);
            continue;
        }

        // Check old fill-in format (namespaced)
        if (key.startsWith(nsOldFillInPrefix) && key.endsWith(oldFillInSuffix)) {
            keysToRemove.push(key);
            continue;
        }

        // Check other old formats (namespaced)
        for (const exerciseType of oldExerciseTypes) {
            const nsOldPrefix = namespacedKey(`${curriculum}-${exerciseType}-`);
            if (key.startsWith(nsOldPrefix) && key.endsWith(oldFillInSuffix)) {
                keysToRemove.push(key);
                break;
            }
        }
    }

    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`🧹 Cleared exercise: ${key}`);
    });

    console.log(`✅ Cleared ${keysToRemove.length} exercise state keys for lesson ${lessonId}`);
    return keysToRemove.length;
}

/**
 * Get all exercise keys for a lesson
 * @param {string} curriculum - Curriculum ID
 * @param {string} lessonId - Lesson ID
 * @returns {string[]} Array of matching keys
 */
export function getLessonExerciseKeys(curriculum, lessonId) {
    const nsPrefix = namespacedKey(`${curriculum}-${lessonId}-`);
    const keys = [];

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(nsPrefix)) {
            keys.push(key);
        }
    }

    return keys;
}

/**
 * Clear all old-format exercise keys (migration helper)
 * This removes keys that don't follow the new standard format
 *
 * Old patterns that will be cleared:
 * - {curriculum}-fill-in-{exerciseId}-{lessonId}
 * - {curriculum}-true-false-{lessonId}
 * - {curriculum}-matching-{exerciseId}-{lessonId}
 * - {curriculum}-drag-drop-{exerciseId}-{lessonId}
 * - {curriculum}-writing-{exerciseId}-{lessonId}
 *
 * @returns {number} Number of old keys cleared
 */
export function clearOldExerciseKeys() {
    console.log('🧹 Clearing old exercise storage keys...');

    // Old patterns now need to account for the user namespace prefix.
    // Keys look like: {userId}:{curriculum}-{exerciseType}-...
    // The namespace prefix contains a colon, so we match after it.
    const oldPatterns = [
        /^[^:]+:[^-]+-fill-in-/,
        /^[^:]+:[^-]+-true-false-/,
        /^[^:]+:[^-]+-matching-/,
        /^[^:]+:[^-]+-drag-drop-/,
        /^[^:]+:[^-]+-writing-/,
        /^[^:]+:[^-]+-flashcard-/,
        /^[^:]+:[^-]+-quiz-/,
        /^[^:]+:[^-]+-jeopardy-/,
        // Also match legacy keys without namespace prefix (pre-migration)
        /^[^-:]+-(fill-in|true-false|matching|drag-drop|writing|flashcard|quiz|jeopardy)-/
    ];

    const keysToRemove = [];

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        // Check if key matches any old pattern
        for (const pattern of oldPatterns) {
            if (pattern.test(key)) {
                keysToRemove.push(key);
                break;
            }
        }
    }

    console.log(`Found ${keysToRemove.length} old exercise keys to clear`);

    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`🧹 Removed old key: ${key}`);
    });

    console.log('✅ Old exercise keys cleared');
    return keysToRemove.length;
}
