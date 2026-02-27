/**
 * Answer validation utilities for vocabulary trainer.
 * Language-agnostic: uses language-utils for normalization and number words.
 */

import { levenshteinDistance } from './levenshtein.js';
import {
    normalizeTargetAnswer,
    normalizeNativeAnswer,
    getNumberWords,
    getTargetLanguageCode,
    getNativeLanguageCode,
} from '../../core/language-utils.js';

/**
 * Check if a question text is a number word.
 * @param {string} text - Text to check
 * @param {boolean} isTargetLanguage - true = checking target language, false = native
 * @returns {boolean}
 */
export function isNumberQuestion(text, isTargetLanguage) {
    const langCode = isTargetLanguage ? getTargetLanguageCode() : getNativeLanguageCode();
    const numbers = getNumberWords(langCode);
    return !!numbers[text.toLowerCase().trim()];
}

/**
 * Normalize target language text for comparison.
 * Removes articles and punctuation, language-aware.
 * @param {string} text - Text to normalize
 * @returns {string}
 */
export function normalizeGerman(text) {
    // Name kept for backward compat — now delegates to language-agnostic util
    return normalizeTargetAnswer(text);
}

/**
 * Normalize native language text for comparison.
 * Removes punctuation and definite form endings.
 * @param {string} text - Text to normalize
 * @returns {string}
 */
export function normalizeNorwegian(text) {
    // Name kept for backward compat — now delegates to language-agnostic util
    return normalizeNativeAnswer(text);
}

/**
 * Clean answer text by removing content in parentheses
 * @param {string} text - Text to clean
 * @returns {string}
 */
export function cleanAnswer(text) {
    return text.replace(/\s*\(.*?\)\s*/g, '').trim();
}

/**
 * Check if user answer is correct with generous tolerance
 * @param {string} userAnswer - User's answer
 * @param {string} correctAnswer - Correct answer
 * @param {Object} options - Validation options
 * @param {boolean} options.isVerb - Whether this is a verb
 * @param {boolean} options.isNoun - Whether this is a noun
 * @param {boolean} options.isNorwegian - Whether checking native language answer
 * @param {string[]} options.synonyms - Accepted synonyms
 * @returns {{correct: boolean, partial: boolean, usedSynonym: string|null}} - Validation result
 */
export function isAnswerCorrect(userAnswer, correctAnswer, options = {}) {
    const { isVerb = false, isNoun = false, isNorwegian = false, synonyms = [] } = options;
    const userClean = userAnswer.trim().toLowerCase().replace(/[.,?!]+$/, '');

    // 1. Check Synonyms first (exact match)
    if (synonyms && synonyms.length > 0) {
        const matchedSynonym = synonyms.find(syn => syn.toLowerCase() === userClean);
        if (matchedSynonym) {
            return { correct: true, partial: false, usedSynonym: matchedSynonym };
        }
    }

    // 2. Handle native language logic
    if (isNorwegian) {
        let correctClean = cleanAnswer(correctAnswer).toLowerCase();

        // Handle Numbers (native language)
        const nativeLangCode = getNativeLanguageCode();
        const nativeNumbers = getNumberWords(nativeLangCode);
        if (nativeNumbers[correctClean]) {
            if (userClean === nativeNumbers[correctClean]) {
                return { correct: true, partial: false, usedSynonym: null };
            }
        }

        // Split by slash if alternatives exist
        const alternatives = correctClean.includes('/')
            ? correctClean.split('/').map(s => s.trim())
            : [correctClean];

        // Add synonyms to alternatives
        if (synonyms) alternatives.push(...synonyms.map(s => s.toLowerCase()));

        // Check each alternative
        for (const alt of alternatives) {
            // Exact match
            if (userClean === alt) return { correct: true, partial: false, usedSynonym: null };

            // Normalized match (definite forms etc.)
            const userNorm = normalizeNativeAnswer(userClean);
            const altNorm = normalizeNativeAnswer(alt);
            if (userNorm === altNorm) return { correct: true, partial: false, usedSynonym: null };

            // Typo tolerance
            const maxDistance = alt.length <= 5 ? 1 : 2;
            if (levenshteinDistance(userClean, alt) <= maxDistance) return { correct: true, partial: true, usedSynonym: null };

            // Typo tolerance on normalized
            if (levenshteinDistance(userNorm, altNorm) <= maxDistance) return { correct: true, partial: true, usedSynonym: null };
        }

        return { correct: false, partial: false, usedSynonym: null };
    }

    // 3. Handle target language logic
    let correctClean = cleanAnswer(correctAnswer).toLowerCase();

    const userNorm = normalizeTargetAnswer(userClean);
    const correctNorm = normalizeTargetAnswer(correctClean);

    // Exact match
    if (userNorm === correctNorm) return { correct: true, partial: false, usedSynonym: null };

    // Verb handling — normalizeTargetAnswer already strips infinitive particle
    if (isVerb) {
        // Already handled by normalizeTargetAnswer
    }

    // Typo tolerance
    const maxDistance = correctNorm.length <= 5 ? 1 : 2;
    if (levenshteinDistance(userNorm, correctNorm) <= maxDistance) {
        return { correct: true, partial: true, usedSynonym: null };
    }

    return { correct: false, partial: false, usedSynonym: null };
}
