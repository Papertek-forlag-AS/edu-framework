import { DataAdapter } from './DataAdapter.js';
import { VocabProfileService } from '../VocabProfileService.js';

/**
 * Blob Adapter
 * Connects the "Vocab Trainer Multi" UI to the "VocabProfileService" (V3.0 Backend)
 */
export class BlobAdapter extends DataAdapter {
    constructor(vocabProfileService, language = null) {
        super();
        this.service = vocabProfileService;
        this.language = language; // 'german', 'spanish', or null
    }

    /**
     * Set the current language for point attribution
     * @param {string|null} language - 'german', 'spanish', or null
     */
    setLanguage(language) {
        this.language = language;
    }

    async loadKnownWords() {
        // Ensure profile is loaded
        await this.service.loadProfile();

        // Convert Blob Format (Map of Objects) to UI Format (Set of Strings)
        // We only care about words where status === 'known'
        const knownSet = new Set();
        const words = this.service.profile.words || {};

        Object.keys(words).forEach(wordId => {
            if (words[wordId].status === 'known') {
                knownSet.add(wordId);
            }
        });

        return knownSet;
    }

    async markWordAsKnown(wordId) {
        this.service.markWordAsKnown(wordId);
    }

    async unmarkWordAsKnown(wordId) {
        this.service.unmarkWordAsKnown(wordId);
    }

    /**
     * Update progress for a word (SM-2)
     * Routes to VocabProfileService.updateWordProgressCrossMode
     * @param {string} wordId - The word identifier
     * @param {number} quality - SM-2 quality rating (0-5)
     * @param {string} mode - Training mode
     * @param {boolean|Object} options - If boolean: skipPoints. If object: { skipPoints, language, exposureOnly }
     */
    async updateProgress(wordId, quality, mode, options = false) {
        // Convert boolean to object format with language
        let opts = options;
        if (typeof options === 'boolean') {
            opts = { skipPoints: options, language: this.language };
        } else if (typeof options === 'object' && options !== null) {
            opts = { ...options, language: options.language || this.language };
        } else {
            opts = { skipPoints: false, language: this.language };
        }
        await this.service.updateWordProgressCrossMode(wordId, quality, mode, opts);
    }

    /**
     * Add points directly (for modes that handle points per-round like Kombiner)
     * @param {number} amount - Points to add
     * @param {string|null} language - Override language (uses adapter's language if null)
     */
    async addPoints(amount, language = null) {
        this.service.addPoints(amount, language || this.language);
    }

    /**
     * Check if daily goal is reached and update streak if needed
     */
    async checkAndUpdateStreak() {
        const dailyGoal = 20;
        const dailyPoints = this.service.profile.dailyPointsEarned || 0;
        if (dailyPoints >= dailyGoal) {
            this.service.updateStreak();
        }
    }

    /**
     * Get current profile stats for UI refresh
     */
    getProfileStats() {
        return {
            dailyPointsEarned: this.service.profile.dailyPointsEarned || 0,
            currentStreak: this.service.profile.currentStreak || 0,
            totalPoints: this.service.profile.totalPoints || 0
        };
    }

    /**
     * Get due word IDs from a list (for flashcards - SM-2 scheduling)
     * V3.7 Spec: Flashcards shows ONLY words due for review
     * @param {Array<string>} wordIds - Array of word identifiers to check
     * @returns {Array<string>} - Array of word IDs that are due for review
     */
    getDueWords(wordIds) {
        return this.service.getDueWords(wordIds);
    }

    /**
     * Get learning (non-known) word IDs from a list (for write/match modes)
     * V3.7 Spec: Write/Match shows ALL learning words
     * @param {Array<string>} wordIds - Array of word identifiers to check
     * @returns {Array<string>} - Array of word IDs that are in learning status
     */
    getLearningWords(wordIds) {
        return this.service.getLearningWords(wordIds);
    }

    /**
     * Check if a specific word is due for review
     * @param {string} wordId - The word identifier
     * @returns {boolean} true if word is due
     */
    isWordDue(wordId) {
        return this.service.isWordDue(wordId);
    }

    /**
     * Check if there are words that need Write training (lastMode = flashcards)
     * @param {Array<string>} wordIds - Array of word identifiers to check
     * @returns {boolean} - True if there are words with lastMode='flashcards'
     */
    hasWordsNeedingWriteMode(wordIds) {
        return this.service.hasWordsNeedingWriteMode(wordIds);
    }

    /**
     * Check if there are words that need Flashcard training (lastMode = write)
     * @param {Array<string>} wordIds - Array of word identifiers to check
     * @returns {boolean} - True if there are words with lastMode='write'
     */
    hasWordsNeedingFlashcardMode(wordIds) {
        return this.service.hasWordsNeedingFlashcardMode(wordIds);
    }

    /**
     * Explicit save to cloud/storage
     * @returns {Promise<void>}
     */
    async save() {
        await this.service.saveProfile();
    }
}
