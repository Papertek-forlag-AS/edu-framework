/**
 * Vocabulary trainer utility functions.
 * Language-agnostic: delegates normalization and number checks to language-utils.
 */

import {
    normalizeTargetAnswer,
    normalizeNativeAnswer,
    getNumberWords,
    getTargetLanguageCode,
    getNativeLanguageCode,
} from '../core/language-utils.js';

export function cleanAnswer(text) {
    // Remove content in parentheses
    return text.replace(/\s*\(.*?\)\s*/g, '').trim();
}

export function levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
            }
        }
    }
    return dp[m][n];
}

export function isNumberQuestion(text, isTargetLanguage) {
    const langCode = isTargetLanguage ? getTargetLanguageCode() : getNativeLanguageCode();
    const numbers = getNumberWords(langCode);
    return !!numbers[text.toLowerCase().trim()];
}

export function normalizeGerman(text) {
    // Name kept for backward compat — now language-agnostic
    return normalizeTargetAnswer(text);
}

export function normalizeNorwegian(text) {
    // Name kept for backward compat — now language-agnostic
    return normalizeNativeAnswer(text);
}

// Helper function to check if answer is correct with generous tolerance
export function isAnswerCorrect(userAnswer, correctAnswer, isVerb = false, isNoun = false, isNorwegian = false, synonyms = []) {
    const userClean = cleanAnswer(userAnswer).toLowerCase().replace(/[.,?!]+$/, '');

    // 1. Check Synonyms first (exact match)
    if (synonyms && synonyms.length > 0) {
        if (synonyms.some(syn => syn.toLowerCase() === userClean)) {
            return { correct: true, partial: false };
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
                return { correct: true, partial: false };
            }
        }

        // Split by slash if alternatives exist
        const alternatives = correctClean.includes('/')
            ? correctClean.split('/').map(s => s.trim())
            : [correctClean];

        if (synonyms) alternatives.push(...synonyms.map(s => s.toLowerCase()));

        for (const alt of alternatives) {
            if (userClean === alt) return { correct: true, partial: false };

            const userNorm = normalizeNativeAnswer(userClean);
            const altNorm = normalizeNativeAnswer(alt);
            if (userNorm === altNorm) return { correct: true, partial: false };

            const maxDistance = alt.length <= 5 ? 1 : 2;
            if (levenshteinDistance(userClean, alt) <= maxDistance) return { correct: true, partial: true };
            if (levenshteinDistance(userNorm, altNorm) <= maxDistance) return { correct: true, partial: true };
        }

        return { correct: false, partial: false };
    }

    // 3. Handle target language logic
    let correctClean = cleanAnswer(correctAnswer).toLowerCase();

    const userNorm = normalizeTargetAnswer(userClean);
    const correctNorm = normalizeTargetAnswer(correctClean);

    if (userNorm === correctNorm) return { correct: true, partial: false };

    // Verb handling — normalizeTargetAnswer already strips infinitive particle
    if (isVerb) {
        // Already handled
    }

    const maxDistance = correctNorm.length <= 5 ? 1 : 2;
    if (levenshteinDistance(userNorm, correctNorm) <= maxDistance) {
        return { correct: true, partial: true };
    }

    return { correct: false, partial: false };
}

// Helper to get random items with reuse if needed
export function getRandomItems(pool, count) {
    if (pool.length === 0) return [];
    const result = [];
    if (count > pool.length) {
        result.push(...pool);
        while (result.length < count) {
            result.push(pool[Math.floor(Math.random() * pool.length)]);
        }
    } else {
        result.push(...pool.sort(() => Math.random() - 0.5).slice(0, count));
    }
    return result.sort(() => Math.random() - 0.5);
}
