/**
 * Known words management - Refactored for Adapter Pattern
 */
import { LocalStorageAdapter } from '../../core/adapters/LocalStorageAdapter.js';
import { loadData } from '../../progress/index.js';

let activeAdapter = new LocalStorageAdapter();

/**
 * Set the data adapter to use (Dependency Injection)
 * @param {DataAdapter} adapter
 */
export function setAdapter(adapter) {
    activeAdapter = adapter;
}

/**
 * Initialize known words set using the active adapter
 * @returns {Promise<Set<string>>} - Set of known word keys
 */
export async function initializeKnownWords() {
    return await activeAdapter.loadKnownWords();
}

/**
 * Save known words using the active adapter.
 * For set-based bulk updates, we iterate and mark individual words.
 * (Optimized implementation would require bulk-update method in adapter)
 * @param {Set<string>} knownWords - Set of known word keys
 */
export function saveKnownWordsToStorage(knownWords) {
    // Note: The original generic 'save' was effectively a full overwrite.
    // For the adapter pattern, passing the State Object is better 
    // than individual calls for this legacy function signature.

    // If exact LocalStorageAdapter, use internal persist for efficiency
    if (activeAdapter instanceof LocalStorageAdapter) {
        activeAdapter.cache = knownWords;
        activeAdapter._persist();
        return;
    }

    // For other adapters, we warn that this bulk-save is deprecated 
    // and should be handled by granular markWordAsKnown calls ideally,
    // but for now we do nothing or implement a bulk overwrite if needed.
    console.warn('saveKnownWordsToStorage called on non-local adapter. Use markWordAsKnown instead.');
}

/**
 * Legacy Synchronous Loader
 * Used by interactive-flashcards.js which expects a direct array return.
 * This bypasses the activeAdapter async interface for backward compatibility.
 */
export function loadKnownWordsFromStorage() {
    // Try new multi-curriculum key first
    const progressData = loadData('progressData');
    if (progressData && progressData.knownWords) {
        return progressData.knownWords;
    }
    // Fallback to legacy key
    return loadData('vocab-trainer-known-words') || [];
}

