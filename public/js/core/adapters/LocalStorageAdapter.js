import { DataAdapter } from './DataAdapter.js';
import { loadData, saveData } from '../../progress/index.js';

/**
 * Legacy Adapter for LocalStorage
 * Replicates the behavior of the original known-words.js
 */
export class LocalStorageAdapter extends DataAdapter {
    constructor() {
        super();
        this.cache = null;
    }

    async loadKnownWords() {
        // Try new multi-curriculum key first
        const progressData = loadData('progressData');
        let words = [];

        if (progressData && progressData.knownWords) {
            words = progressData.knownWords;
        } else {
            // Fallback to legacy key
            words = loadData('vocab-trainer-known-words') || [];
        }

        this.cache = new Set(words);
        return this.cache;
    }

    async markWordAsKnown(wordId) {
        if (!this.cache) await this.loadKnownWords();
        this.cache.add(wordId);
        this._persist();
    }

    async unmarkWordAsKnown(wordId) {
        if (!this.cache) await this.loadKnownWords();
        this.cache.delete(wordId);
        this._persist();
    }

    _persist() {
        const wordsArray = Array.from(this.cache);

        // Save to new structure
        const progressData = loadData('progressData') || {};
        progressData.knownWords = wordsArray;
        saveData('progressData', progressData);

        // Save to legacy key
        saveData('vocab-trainer-known-words', wordsArray);

        // Attempt Cloud Sync (Best Effort) if module is available
        // Note: In the adapter pattern, we might want to move this up a layer,
        // but for now we keep it here to match legacy behavior strictly.
        if (typeof window.syncKnownWordsToCloud === 'function') {
            window.syncKnownWordsToCloud(wordsArray).catch(console.warn);
        }
    }
}
