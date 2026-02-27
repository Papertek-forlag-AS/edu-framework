/**
 * Vocabulary Provider
 *
 * Unified interface for accessing vocabulary data.
 * Supports two modes:
 *   1. Legacy mode: Uses original combined bank files (current default)
 *   2. Split mode: Uses separate core + translation files (future)
 *
 * The provider abstracts the underlying data source, making it easy
 * to switch between modes or support both simultaneously.
 *
 * Usage:
 *   import { VocabularyProvider, getNativeLanguage, setNativeLanguage } from './vocabulary-provider.js';
 *
 *   // Legacy mode (default - uses existing combined banks)
 *   const provider = new VocabularyProvider('german');
 *   await provider.loadLegacy(wordBanks);
 *
 *   // Split mode (future - uses core + translations)
 *   const provider = new VocabularyProvider('german', 'en');
 *   await provider.loadSplit();
 */

import { VocabularyMerger } from './vocabulary-merger.js';

// Global native language setting (can be changed at runtime)
let currentNativeLanguage = 'nb';

/**
 * Get current native language setting.
 * Priority order:
 * 1. Check body data-ui-language attribute (set by international pages)
 * 2. Check localStorage for persisted setting
 * 3. Default to 'nb' (Norwegian)
 * @returns {string} Language code (nb, en)
 */
export function getNativeLanguage() {
    // Check body data attribute first (used by international pages)
    const bodyLang = document.body?.dataset?.uiLanguage;
    if (bodyLang === 'en') {
        currentNativeLanguage = 'en';
        return 'en';
    }

    // Check localStorage for persisted setting
    const stored = localStorage.getItem('nativeLanguage');
    if (stored && ['nb', 'en'].includes(stored)) {
        currentNativeLanguage = stored;
    }
    return currentNativeLanguage;
}

/**
 * Set native language and persist to localStorage.
 * @param {string} langCode - Language code (nb, en)
 */
export function setNativeLanguage(langCode) {
    if (['nb', 'en'].includes(langCode)) {
        currentNativeLanguage = langCode;
        localStorage.setItem('nativeLanguage', langCode);
    }
}

/**
 * VocabularyProvider class
 * Provides a unified interface for vocabulary access.
 */
export class VocabularyProvider {
    /**
     * @param {string} targetLanguage - Target language (german, spanish)
     * @param {string} [nativeLanguage] - Native language code (defaults to global setting)
     */
    constructor(targetLanguage, nativeLanguage = null) {
        this.targetLanguage = targetLanguage;
        this.nativeLanguage = nativeLanguage || getNativeLanguage();
        this.mode = null; // 'legacy' or 'split'
        this.banks = {};
        this.merger = null;
    }

    /**
     * Load vocabulary in legacy mode (combined bank files).
     * @param {Object} wordBanks - Pre-loaded word banks from content-loader
     */
    loadLegacy(wordBanks) {
        this.mode = 'legacy';
        this.banks = {
            nounBank: wordBanks.nounBank || {},
            verbbank: wordBanks.verbbank || {},
            wordBank: wordBanks.wordBank || {},
            adjectiveBank: wordBanks.adjectiveBank || {}
        };
        return this;
    }

    /**
     * Load vocabulary in split mode (core + translations).
     * @returns {Promise<VocabularyProvider>}
     */
    async loadSplit() {
        this.mode = 'split';
        this.merger = new VocabularyMerger(this.targetLanguage, this.nativeLanguage);
        await this.merger.loadAllBanks();
        return this;
    }

    /**
     * Get a word entry by ID.
     * @param {string} wordId - Word ID
     * @returns {Object|null} Word entry
     */
    getWord(wordId) {
        if (this.mode === 'split' && this.merger) {
            return this.merger.getWord(wordId);
        }

        // Legacy mode - search all banks
        return this.banks.verbbank?.[wordId] ||
            this.banks.nounBank?.[wordId] ||
            this.banks.adjectiveBank?.[wordId] ||
            this.banks.wordBank?.[wordId] ||
            null;
    }

    /**
     * Get translation for a word.
     * @param {string} wordId - Word ID
     * @returns {string|null} Translation in native language
     */
    getTranslation(wordId) {
        const entry = this.getWord(wordId);
        return entry?.translations?.[this.nativeLanguage] || null;
    }

    /**
     * Get all verbs.
     * @returns {Object} Verb entries
     */
    getVerbs() {
        if (this.mode === 'split' && this.merger) {
            return this.merger.getBank('verbbank');
        }
        return this.filterMetadata(this.banks.verbbank);
    }

    /**
     * Get all nouns.
     * @returns {Object} Noun entries
     */
    getNouns() {
        if (this.mode === 'split' && this.merger) {
            return this.merger.getBank('nounbank');
        }
        return this.filterMetadata(this.banks.nounBank);
    }

    /**
     * Get all adjectives.
     * @returns {Object} Adjective entries
     */
    getAdjectives() {
        if (this.mode === 'split' && this.merger) {
            return this.merger.getBank('adjectivebank');
        }
        return this.filterMetadata(this.banks.adjectiveBank);
    }

    /**
     * Get general word bank.
     * @returns {Object} General word entries
     */
    getGeneralWords() {
        if (this.mode === 'split' && this.merger) {
            return {
                ...this.merger.getBank('generalbank'),
                ...this.merger.getBank('numbersbank'),
                ...this.merger.getBank('phrasesbank')
            };
        }
        return this.filterMetadata(this.banks.wordBank);
    }

    /**
     * Switch native language (only works in split mode).
     * @param {string} newLang - New native language code
     * @returns {Promise<void>}
     */
    async switchNativeLanguage(newLang) {
        if (this.mode !== 'split') {
            console.warn('[VocabProvider] Native language switching only available in split mode');
            return;
        }

        setNativeLanguage(newLang);
        this.nativeLanguage = newLang;
        await this.merger.switchNativeLanguage(newLang);
    }

    /**
     * Get statistics about loaded vocabulary.
     * @returns {Object} Statistics
     */
    getStats() {
        if (this.mode === 'split' && this.merger) {
            return this.merger.getStats();
        }

        // Legacy mode stats
        const countEntries = (bank) => {
            if (!bank) return 0;
            return Object.keys(bank).filter(k => k !== '_metadata').length;
        };

        return {
            mode: 'legacy',
            targetLanguage: this.targetLanguage,
            nativeLanguage: this.nativeLanguage,
            verbs: countEntries(this.banks.verbbank),
            nouns: countEntries(this.banks.nounBank),
            adjectives: countEntries(this.banks.adjectiveBank),
            general: countEntries(this.banks.wordBank)
        };
    }

    /**
     * Filter out _metadata from bank entries.
     * @private
     */
    filterMetadata(bank) {
        if (!bank) return {};
        const filtered = {};
        for (const [key, value] of Object.entries(bank)) {
            if (key !== '_metadata') {
                filtered[key] = value;
            }
        }
        return filtered;
    }
}

/**
 * Create a vocabulary provider with current settings.
 * @param {string} targetLanguage - Target language
 * @returns {VocabularyProvider}
 */
export function createProvider(targetLanguage) {
    return new VocabularyProvider(targetLanguage, getNativeLanguage());
}

export default VocabularyProvider;
