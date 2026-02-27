/**
 * Data Adapter Interface
 * Defines the contract for persistence strategies (LocalStorage vs Cloud Blob)
 */
export class DataAdapter {
    /**
     * Load known words for a specific user context
     * @returns {Promise<Set<string>>} Set of known word IDs
     */
    async loadKnownWords() {
        throw new Error('Method not implemented');
    }

    /**
     * Save a known word (mark as known)
     * @param {string} wordId
     * @returns {Promise<void>}
     */
    async markWordAsKnown(wordId) {
        throw new Error('Method not implemented');
    }

    /**
     * Remove a known word (unmark)
     * @param {string} wordId
     * @returns {Promise<void>}
     */
    async unmarkWordAsKnown(wordId) {
        throw new Error('Method not implemented');
    }

    /**
     * Update progress for a word (SM-2)
     * @param {string} wordId 
     * @param {number} quality (0-5)
     * @param {string} mode ('write', 'flashcards', 'match', 'test')
     */
    async updateProgress(wordId, quality, mode) { }

    /**
     * Explicit save to cloud/storage
     * @returns {Promise<void>}
     */
    async save() { }
}
