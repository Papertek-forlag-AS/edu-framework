/**
 * Vocabulary Merger Module
 *
 * Merges core vocabulary data with translation packs at runtime.
 * This enables:
 * - Downloading language packs on demand
 * - Supporting multiple native languages
 * - Reducing initial bundle size
 *
 * Usage:
 *   import { VocabularyMerger } from './vocabulary-merger.js';
 *
 *   const merger = new VocabularyMerger('german', 'nb');
 *   await merger.loadBank('verbbank');
 *   const entry = merger.getWord('sein_verb');
 *
 * The merged entry will have both core data and translations.
 */

// Base paths for vocabulary files (static JSON, built from external API at deploy time)
const VOCAB_CORE_PATH = '/shared/vocabulary/core';
const VOCAB_TRANSLATIONS_PATH = '/shared/vocabulary/translations';

// Language code mapping (ISO 639-1)
// Target: de (German), es (Spanish), fr (French)
// Native: nb (Norwegian), en (English), sv (Swedish)
const TARGET_LANG_CODES = {
    'german': 'de',
    'spanish': 'es',
    'french': 'fr',
    'de': 'de',
    'es': 'es',
    'fr': 'fr'
};

/**
 * VocabularyMerger class
 * Handles loading and merging of core vocabulary with translations.
 */
export class VocabularyMerger {
    /**
     * @param {string} targetLang - Target language being learned (german, spanish)
     * @param {string} nativeLang - Native language code (nb, en)
     */
    constructor(targetLang, nativeLang = 'nb') {
        this.targetLang = targetLang;
        this.nativeLang = nativeLang;

        // Loaded data cache
        this.coreData = {};
        this.translations = {};
        this.mergedData = {};

        // Track loaded banks
        this.loadedBanks = new Set();
    }

    /**
     * Get the base URL for core vocabulary files.
     * Uses ISO 639-1 codes: de, es, fr
     */
    getCorePath(bankName) {
        const langCode = TARGET_LANG_CODES[this.targetLang] || this.targetLang;
        return `${VOCAB_CORE_PATH}/${langCode}/${bankName}.json`;
    }

    /**
     * Get the base URL for translation files.
     * Uses ISO 639-1 codes: de-nb, de-en, es-nb, etc.
     */
    getTranslationsPath(bankName) {
        const langCode = TARGET_LANG_CODES[this.targetLang] || this.targetLang;
        return `${VOCAB_TRANSLATIONS_PATH}/${langCode}-${this.nativeLang}/${bankName}.json`;
    }

    /**
     * Load a vocabulary bank (core + translations).
     * @param {string} bankName - Bank name without .json extension
     * @returns {Promise<Object>} Merged vocabulary data
     */
    async loadBank(bankName) {
        if (this.loadedBanks.has(bankName)) {
            return this.mergedData[bankName];
        }

        try {
            // Load core and translations in parallel
            const [coreResponse, transResponse] = await Promise.all([
                fetch(this.getCorePath(bankName)),
                fetch(this.getTranslationsPath(bankName))
            ]);

            if (!coreResponse.ok) {
                throw new Error(`Failed to load core bank: ${bankName}`);
            }

            const coreData = await coreResponse.json();
            this.coreData[bankName] = coreData;

            // Translations are optional (might not exist for all languages yet)
            if (transResponse.ok) {
                const transData = await transResponse.json();
                this.translations[bankName] = transData;
            } else {
                console.warn(`[VocabMerger] No translations found for ${bankName} (${this.nativeLang})`);
                this.translations[bankName] = {};
            }

            // Merge the data
            this.mergedData[bankName] = this.mergeBank(bankName);
            this.loadedBanks.add(bankName);

            return this.mergedData[bankName];
        } catch (error) {
            console.error(`[VocabMerger] Error loading bank ${bankName}:`, error);
            throw error;
        }
    }

    /**
     * Merge a loaded bank's core data with translations.
     * @param {string} bankName - Bank name
     * @returns {Object} Merged vocabulary data
     */
    mergeBank(bankName) {
        const core = this.coreData[bankName] || {};
        const trans = this.translations[bankName] || {};
        const merged = {};

        // Process each word entry
        for (const [wordId, coreEntry] of Object.entries(core)) {
            if (wordId === '_metadata') {
                merged._metadata = { ...coreEntry };
                continue;
            }

            // Start with core data
            const mergedEntry = { ...coreEntry };

            // Add translations if available
            const transEntry = trans[wordId];
            if (transEntry) {
                // Main translation
                if (transEntry.translation) {
                    mergedEntry.translations = mergedEntry.translations || {};
                    mergedEntry.translations[this.nativeLang] = transEntry.translation;
                }

                // Synonyms
                if (transEntry.synonyms) {
                    mergedEntry.translation_synonyms = mergedEntry.translation_synonyms || {};
                    mergedEntry.translation_synonyms[this.nativeLang] = transEntry.synonyms;
                }

                // Explanations
                if (transEntry.explanation) {
                    mergedEntry.explanations = mergedEntry.explanations || {};
                    mergedEntry.explanations[this.nativeLang] = transEntry.explanation;
                }

                // Definite translations (for nouns)
                if (transEntry.definite) {
                    mergedEntry.definite_translations = mergedEntry.definite_translations || {};
                    mergedEntry.definite_translations[this.nativeLang] = transEntry.definite;
                }

                // Examples with translations
                if (transEntry.examples) {
                    mergedEntry.examples = transEntry.examples;
                }
            }

            merged[wordId] = mergedEntry;
        }

        return merged;
    }

    /**
     * Load all banks for the target language.
     * @returns {Promise<void>}
     */
    async loadAllBanks() {
        const bankNames = [
            'generalbank',
            'verbbank',
            'nounbank',
            'adjectivebank',
            'articlesbank',
            'pronounsbank',
            'numbersbank',
            'phrasesbank'
        ];

        await Promise.all(bankNames.map(bank => this.loadBank(bank)));
    }

    /**
     * Get a word entry by ID.
     * @param {string} wordId - Word ID to look up
     * @param {string} [bankName] - Optional specific bank to search
     * @returns {Object|null} Word entry or null if not found
     */
    getWord(wordId, bankName = null) {
        if (bankName) {
            return this.mergedData[bankName]?.[wordId] || null;
        }

        // Search all loaded banks
        for (const bank of this.loadedBanks) {
            const entry = this.mergedData[bank]?.[wordId];
            if (entry) {
                return entry;
            }
        }

        return null;
    }

    /**
     * Get all words from a specific bank.
     * @param {string} bankName - Bank name
     * @returns {Object} All word entries (excluding metadata)
     */
    getBank(bankName) {
        const bank = this.mergedData[bankName];
        if (!bank) return {};

        // Filter out metadata
        const words = {};
        for (const [wordId, entry] of Object.entries(bank)) {
            if (wordId !== '_metadata') {
                words[wordId] = entry;
            }
        }
        return words;
    }

    /**
     * Get translation for a word.
     * @param {string} wordId - Word ID
     * @returns {string|null} Translation in native language
     */
    getTranslation(wordId) {
        const entry = this.getWord(wordId);
        return entry?.translations?.[this.nativeLang] || null;
    }

    /**
     * Check if a bank is loaded.
     * @param {string} bankName - Bank name
     * @returns {boolean}
     */
    isBankLoaded(bankName) {
        return this.loadedBanks.has(bankName);
    }

    /**
     * Switch native language and reload translations.
     * @param {string} newNativeLang - New native language code
     * @returns {Promise<void>}
     */
    async switchNativeLanguage(newNativeLang) {
        if (newNativeLang === this.nativeLang) return;

        this.nativeLang = newNativeLang;
        this.translations = {};

        // Reload all banks with new translations
        const banksToReload = [...this.loadedBanks];
        this.loadedBanks.clear();
        this.mergedData = {};

        await Promise.all(banksToReload.map(bank => this.loadBank(bank)));
    }

    /**
     * Get statistics about loaded vocabulary.
     * @returns {Object} Statistics
     */
    getStats() {
        let totalWords = 0;
        let wordsWithTranslations = 0;
        let wordsWithExplanations = 0;

        for (const bankName of this.loadedBanks) {
            const bank = this.mergedData[bankName];
            for (const [wordId, entry] of Object.entries(bank)) {
                if (wordId === '_metadata') continue;

                totalWords++;

                if (entry.translations?.[this.nativeLang]) {
                    wordsWithTranslations++;
                }

                if (entry.explanations?.[this.nativeLang]) {
                    wordsWithExplanations++;
                }
            }
        }

        return {
            targetLanguage: this.targetLang,
            nativeLanguage: this.nativeLang,
            loadedBanks: [...this.loadedBanks],
            totalWords,
            wordsWithTranslations,
            wordsWithExplanations,
            translationCoverage: totalWords > 0
                ? Math.round((wordsWithTranslations / totalWords) * 100)
                : 0
        };
    }
}

/**
 * Factory function to create a merger with default settings.
 * @param {string} targetLang - Target language
 * @param {string} nativeLang - Native language code
 * @returns {VocabularyMerger}
 */
export function createMerger(targetLang, nativeLang = 'nb') {
    return new VocabularyMerger(targetLang, nativeLang);
}

/**
 * Get available native language options.
 * @returns {Array<{code: string, name: string}>}
 */
export function getAvailableNativeLanguages() {
    return [
        { code: 'nb', name: 'Norsk (Bokmål)' },
        { code: 'en', name: 'English' }
        // { code: 'sv', name: 'Svenska' }  // Future
    ];
}

export default VocabularyMerger;
