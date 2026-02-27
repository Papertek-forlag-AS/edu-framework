/**
 * language-utils.js — Language Abstraction Layer
 *
 * Central module that provides language-aware utilities to all engine files.
 * Instead of hardcoding German articles, normalization rules, or number maps,
 * engine files import functions from here that read from the active curriculum config.
 *
 * This is the key abstraction that makes Papertek language-agnostic.
 *
 * @module language-utils
 */

import { getCurriculumConfig } from '../progress/curriculum-registry.js';
import { getActiveCurriculum } from '../progress/store.js';

// ─── Internal state ──────────────────────────────────────────────────

let _cachedConfig = null;
let _cachedCurriculumId = null;

// ─── Config Access ───────────────────────────────────────────────────

/**
 * Get the language config for the active curriculum.
 * Caches the result to avoid repeated registry lookups.
 * @returns {Object} Language config from curriculum registry
 */
export function getLanguageConfig() {
    const curriculumId = getActiveCurriculum();
    if (_cachedConfig && _cachedCurriculumId === curriculumId) {
        return _cachedConfig;
    }
    const config = getCurriculumConfig(curriculumId);
    _cachedConfig = config.languageConfig || {};
    _cachedCurriculumId = curriculumId;
    return _cachedConfig;
}

/**
 * Get the full curriculum config for the active curriculum.
 * @returns {Object} Full curriculum config
 */
export function getFullConfig() {
    const curriculumId = getActiveCurriculum();
    return getCurriculumConfig(curriculumId);
}

/**
 * Clear the cached config (call when curriculum changes).
 */
export function clearLanguageCache() {
    _cachedConfig = null;
    _cachedCurriculumId = null;
}

// ─── Articles & Gender ───────────────────────────────────────────────

/**
 * Convert a genus key (m/f/n/pl) to the definite article for the active language.
 * @param {string} genus - Gender key: 'm', 'f', 'n', 'pl'
 * @returns {string|null} The article, or null if not found
 */
export function genusToArticle(genus) {
    const config = getLanguageConfig();
    const articles = config.grammar?.articles || {};
    return articles[genus] || null;
}

/**
 * Get all articles as an object { m: 'der', f: 'die', ... }
 * @returns {Object} Articles map
 */
export function getArticles() {
    const config = getLanguageConfig();
    return config.grammar?.articles || {};
}

/**
 * Get articles filtered for gender selection (excludes plural).
 * @returns {Array<[string, string]>} Array of [key, article] pairs
 */
export function getGenderArticles() {
    const articles = getArticles();
    return Object.entries(articles).filter(([key]) => key !== 'pl');
}

/**
 * Get the number of genders in the active language.
 * @returns {number} Gender count (0, 2, or 3)
 */
export function getGenderCount() {
    const config = getLanguageConfig();
    return config.grammar?.genderCount || 0;
}

/**
 * Get gender color configuration.
 * @returns {Object} Map of gender key to color name/hex
 */
export function getGenderColors() {
    const config = getLanguageConfig();
    return config.grammar?.genderColors || {};
}

/**
 * Get gender labels (e.g., { m: 'Maskulinum', f: 'Femininum' }).
 * @returns {Object} Map of gender key to label
 */
export function getGenderLabels() {
    const config = getLanguageConfig();
    return config.grammar?.genderLabels || {};
}

// ─── Pronouns ────────────────────────────────────────────────────────

/**
 * Get the pronoun list for the active language.
 * @returns {string[]} Array of pronouns (e.g., ['ich', 'du', 'er/sie/es', ...])
 */
export function getPronouns() {
    const config = getLanguageConfig();
    return config.grammar?.pronouns || [];
}

// ─── Character Normalization ─────────────────────────────────────────

/**
 * Normalize special characters in text using the active language's normalization map.
 * For German: ö→oe, ä→ae, ü→ue, ß→ss
 * For Spanish: á→a, é→e, etc. (if configured)
 *
 * This is used for vocabulary lookups where bank keys use ASCII.
 *
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 */
export function normalizeChars(text) {
    const config = getLanguageConfig();
    const normMap = config.characterNormalization || {};

    // If no normalization map, try getting from papertek.config.js via the config
    // Fall back to empty (no normalization)
    if (Object.keys(normMap).length === 0) return text;

    let result = text;
    for (const [char, replacement] of Object.entries(normMap)) {
        result = result.replaceAll(char, replacement);
    }
    return result;
}

// ─── Special Characters ──────────────────────────────────────────────

/**
 * Get the special characters for the active language's keyboard.
 * @returns {string[]} Array of special characters
 */
export function getSpecialChars() {
    const config = getLanguageConfig();
    return config.specialChars || [];
}

// ─── Data Keys ───────────────────────────────────────────────────────

/**
 * Get the data keys for target and native language fields.
 * @returns {{ target: string, native: string }} Data keys
 */
export function getDataKeys() {
    const config = getLanguageConfig();
    return config.dataKeys || { target: 'target', native: 'native' };
}

/**
 * Get the target language data key (e.g., 'tysk', 'spansk').
 * @returns {string}
 */
export function getTargetKey() {
    return getDataKeys().target;
}

/**
 * Get the native language data key (e.g., 'norsk').
 * @returns {string}
 */
export function getNativeKey() {
    return getDataKeys().native;
}

// ─── Language Code ───────────────────────────────────────────────────

/**
 * Get the ISO 639-1 language code for the target language.
 * @returns {string} e.g., 'de', 'es', 'fr'
 */
export function getTargetLanguageCode() {
    const config = getLanguageConfig();
    return config.code || 'de';
}

/**
 * Get the native language code (UI language).
 * @returns {string} e.g., 'nb', 'en'
 */
export function getNativeLanguageCode() {
    // The native language is determined by the dataKeys or defaults to 'nb'
    const config = getLanguageConfig();
    const nativeKey = config.dataKeys?.native || 'norsk';
    // Map common native key names to ISO codes
    const keyToCode = { 'norsk': 'nb', 'english': 'en', 'deutsch': 'de' };
    return keyToCode[nativeKey] || 'nb';
}

// ─── Verb Configuration ──────────────────────────────────────────────

/**
 * Get verb-related configuration.
 * @returns {{ infinitiveParticle: string, acceptInfinitiveParticle: boolean }}
 */
export function getVerbConfig() {
    const config = getLanguageConfig();
    return config.grammar?.verbLogic || config.grammar?.verbConfig || {
        infinitiveParticle: '',
        acceptInfinitiveParticle: false,
    };
}

// ─── Answer Normalization ────────────────────────────────────────────

/**
 * Normalize a target language answer for comparison.
 * Removes articles and punctuation, language-aware.
 * @param {string} text - Answer text
 * @returns {string} Normalized text
 */
export function normalizeTargetAnswer(text) {
    let normalized = text.trim().toLowerCase();

    // Remove articles (all configured articles for the language)
    const articles = getArticles();
    const allArticles = Object.values(articles).filter(Boolean);
    if (allArticles.length > 0) {
        const articlePattern = allArticles
            .flatMap(a => a.includes('/') ? a.split('/') : [a])
            .map(a => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('|');
        normalized = normalized.replace(new RegExp(`^(${articlePattern})\\s+`, 'i'), '');
    }

    // Remove verb infinitive particle (e.g., "zu" for German)
    const verbConfig = getVerbConfig();
    if (verbConfig.acceptInfinitiveParticle && verbConfig.infinitiveParticle) {
        normalized = normalized.replace(
            new RegExp(`^${verbConfig.infinitiveParticle}\\s+`, 'i'), ''
        );
    }

    // Remove punctuation
    normalized = normalized.replace(/[.,?!]+$/, '');
    return normalized;
}

/**
 * Normalize a native language answer for comparison.
 * Removes punctuation and applies native-language-specific rules.
 * @param {string} text - Answer text
 * @returns {string} Normalized text
 */
export function normalizeNativeAnswer(text) {
    let normalized = text.trim().toLowerCase();
    normalized = normalized.replace(/[.,?!]+$/, '');

    // Norwegian-specific: remove definite form endings
    const nativeCode = getNativeLanguageCode();
    if (nativeCode === 'nb' || nativeCode === 'nn') {
        if (normalized.endsWith('ene')) return normalized.slice(0, -3);
        if (normalized.endsWith('ane')) return normalized.slice(0, -3);
        if (normalized.endsWith('en')) return normalized.slice(0, -2);
        if (normalized.endsWith('et')) return normalized.slice(0, -2);
        if (normalized.endsWith('a')) return normalized.slice(0, -1);
    }

    return normalized;
}

// ─── Number Words ────────────────────────────────────────────────────

/**
 * Number word maps for supported languages.
 * These are used for validating numeric answers in exercises.
 *
 * Languages can be extended by adding entries here.
 */
const NUMBER_WORDS = {
    de: {
        'eins': '1', 'zwei': '2', 'drei': '3', 'vier': '4', 'fünf': '5',
        'sechs': '6', 'sieben': '7', 'acht': '8', 'neun': '9', 'zehn': '10',
        'elf': '11', 'zwölf': '12', 'dreizehn': '13', 'vierzehn': '14', 'fünfzehn': '15',
        'sechzehn': '16', 'siebzehn': '17', 'achtzehn': '18', 'neunzehn': '19', 'zwanzig': '20',
        'einundzwanzig': '21', 'zweiundzwanzig': '22', 'dreißig': '30', 'vierzig': '40',
        'fünfzig': '50', 'sechzig': '60', 'siebzig': '70', 'achtzig': '80', 'neunzig': '90',
        'hundert': '100',
    },
    es: {
        'uno': '1', 'dos': '2', 'tres': '3', 'cuatro': '4', 'cinco': '5',
        'seis': '6', 'siete': '7', 'ocho': '8', 'nueve': '9', 'diez': '10',
        'once': '11', 'doce': '12', 'trece': '13', 'catorce': '14', 'quince': '15',
        'veinte': '20', 'treinta': '30', 'cuarenta': '40', 'cincuenta': '50',
        'cien': '100',
    },
    fr: {
        'un': '1', 'deux': '2', 'trois': '3', 'quatre': '4', 'cinq': '5',
        'six': '6', 'sept': '7', 'huit': '8', 'neuf': '9', 'dix': '10',
        'onze': '11', 'douze': '12', 'treize': '13', 'quatorze': '14', 'quinze': '15',
        'vingt': '20', 'trente': '30', 'quarante': '40', 'cinquante': '50',
        'cent': '100',
    },
    nb: {
        'en': '1', 'to': '2', 'tre': '3', 'fire': '4', 'fem': '5',
        'seks': '6', 'sju': '7', 'syv': '7', 'åtte': '8', 'ni': '9', 'ti': '10',
        'elleve': '11', 'tolv': '12', 'tretten': '13', 'fjorten': '14', 'femten': '15',
        'seksten': '16', 'sytten': '17', 'atten': '18', 'nitten': '19', 'tjue': '20',
        'tjueen': '21', 'tjueto': '22', 'tretti': '30', 'førti': '40',
        'femti': '50', 'seksti': '60', 'sytti': '70', 'åtti': '80', 'nitti': '90',
        'hundre': '100',
    },
};

/**
 * Get the number words map for a language.
 * @param {string} langCode - ISO 639-1 language code
 * @returns {Object} Map of number word → digit string
 */
export function getNumberWords(langCode) {
    return NUMBER_WORDS[langCode] || {};
}

/**
 * Check if text is a number word in the given language.
 * @param {string} text - Text to check
 * @param {string} langCode - ISO 639-1 language code
 * @returns {boolean}
 */
export function isNumberWord(text, langCode) {
    const numbers = getNumberWords(langCode);
    return !!numbers[text.toLowerCase().trim()];
}

/**
 * Get the numeric value for a number word.
 * @param {string} text - Number word
 * @param {string} langCode - ISO 639-1 language code
 * @returns {string|null} Digit string or null
 */
export function numberWordToDigit(text, langCode) {
    const numbers = getNumberWords(langCode);
    return numbers[text.toLowerCase().trim()] || null;
}

// ─── Content Paths ───────────────────────────────────────────────────

/**
 * Get the content path for the active curriculum.
 * @returns {string} Content path (e.g., '../../content/german')
 */
export function getContentPath() {
    const config = getFullConfig();
    return config.contentPath || '../../content/default';
}

/**
 * Get the language directory name (e.g., 'german', 'spanish').
 * @returns {string}
 */
export function getLanguageDir() {
    const config = getFullConfig();
    return config.languageDir || config.contentPath?.split('/').pop() || 'default';
}
