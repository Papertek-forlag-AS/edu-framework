/**
 * Vocabulary loading and filtering utilities
 * Collects words, verbs, and nouns from word banks for selected chapters
 *
 * Uses JSON field names directly (no transformation):
 * - word -> target word
 * - translations.nb -> Norwegian translation
 * - translations.en -> English translation
 * - synonyms -> target language synonyms
 * - translation_synonyms.nb -> Norwegian synonyms
 * - explanations.nb._description -> explanation
 * - conjugations -> verb conjugations
 * - comparison -> adjective comparison
 * - cases -> noun cases
 */

import { cleanAnswer } from './utils/answer-validation.js';
import { getTranslationLangCode } from './i18n-helper.js';

/**
 * Get vocabulary for a single lesson
 *
 * @param {string} lessonId - Lesson ID (e.g., '1.1')
 * @param {Object} banks - Word banks
 * @returns {Array} - Array of vocabulary items
 */
export async function getLessonVocabulary(lessonId, banks = {}) {
    // Default to imported banks if not provided in args
    const {
        ordbank: o = {},
        verbbank: v = {},
        substantivbank: s = {},
        adjektivbank: a = {}
    } = banks;
    return collectAndProcessVocabulary([lessonId], { ordbank: o, verbbank: v, substantivbank: s, adjektivbank: a });
}

/**
 * Get vocabulary from multiple chapters
 * Combines words from ordbank, verbbank, and substantivbank
 * Also handles implicit synonyms (multiple German words with same Norwegian translation)
 *
 * @param {number[]} chapterNumbers - Array of chapter numbers (e.g., [1, 2, 3])
 * @param {Object} banks - Word banks
 * @returns {Array} - Array of vocabulary items
 */
export async function getMultiChapterVocabulary(chapterNumbers, banks = {}) {
    // Convert chapter numbers to lesson IDs (e.g., [1, 2] -> ['1.1', '1.2', '1.3', '2.1', '2.2', '2.3'])
    const lessonIds = [];
    chapterNumbers.forEach(chapterNum => {
        for (let i = 1; i <= 3; i++) {
            lessonIds.push(`${chapterNum}.${i}`);
        }
    });

    // Default to imported banks if not provided in args
    const {
        ordbank: o = {},
        verbbank: v = {},
        substantivbank: s = {},
        adjektivbank: a = {}
    } = banks;

    return collectAndProcessVocabulary(lessonIds, { ordbank: o, verbbank: v, substantivbank: s, adjektivbank: a });
}

import { getCurriculumConfig } from '../progress/curriculum-registry.js';
import { getActiveCurriculum } from '../progress/store.js';
import { formatNoun } from '../utils/language-formatter.js';

/**
 * Helper function to collect and process vocabulary from lesson IDs
 *
 * @param {string[]} lessonIds - Array of lesson IDs
 * @param {Object} banks - Word banks
 * @returns {Array} - Processed vocabulary
 */

// Lazy-load curricula manifests on demand (avoids 404s for unused curricula)
import { fetchCurriculum } from '../vocabulary/vocab-api-client.js';

const MANIFESTS = {};
const EMPTY_MANIFEST = { lessons: {} };

/** Async — fetches manifest if not cached */
async function getManifest(curriculumId) {
    if (MANIFESTS[curriculumId] !== undefined) return MANIFESTS[curriculumId] || EMPTY_MANIFEST;
    const manifest = await fetchCurriculum(curriculumId);
    MANIFESTS[curriculumId] = manifest;
    return manifest || EMPTY_MANIFEST;
}

/** Sync — returns cached manifest or empty (for use in non-async contexts like tooltips) */
function getManifestSync(curriculumId) {
    return MANIFESTS[curriculumId] || EMPTY_MANIFEST;
}

export function isFeatureUnlocked(feature, currentLessonId) {
    const curriculumId = getActiveCurriculum();
    const manifest = getManifestSync(curriculumId);

    // 1. Check if feature is in current lesson
    if (manifest.lessons[currentLessonId] &&
        manifest.lessons[currentLessonId].features &&
        manifest.lessons[currentLessonId].features.includes(feature)) {
        return true;
    }

    // 2. Check previous lessons?
    // Progressive disclosure usually means "Once unlocked, always unlocked".
    // But we need to know the ORDER of lessons to check "previous".
    // Simple heuristic: Iterate all lessons in manifest, if we find the feature in a lesson that is <= currentLessonId?
    // Lesson comparison is tricky ("1.10" vs "1.2").
    // Ideally we check if the introduction lesson for the feature is <= current lesson.

    // Let's find WHEN the feature was introduced in this curriculum.
    let introLesson = null;
    for (const [lesson, data] of Object.entries(manifest.lessons)) {
        if (data.features && data.features.includes(feature)) {
            // Heuristic: Pick the earliest one if multiple?
            // Usually introduced once.
            introLesson = lesson;
            break;
        }
    }

    if (!introLesson) return false;

    // Compare introLesson vs currentLessonId
    return compareLessonIds(introLesson, currentLessonId) <= 0;
}

// Helper for Lesson ID comparison (e.g. "1.2" < "1.10")
function compareLessonIds(id1, id2) {
    if (!id1 || !id2) return 0;
    const p1 = id1.split('.').map(Number);
    const p2 = id2.split('.').map(Number);

    if (p1[0] !== p2[0]) return p1[0] - p2[0];
    return (p1[1] || 0) - (p2[1] || 0);
}

/**
 * Helper to get translation from JSON entry
 * @param {Object} entry - Vocabulary entry
 * @param {string} langCode - Language code ('nb' or 'en')
 * @returns {string} - Translation or empty string
 */
function getTranslation(entry, langCode = 'nb') {
    return entry?.translations?.[langCode] || '';
}

/**
 * Helper to get definite translation from JSON entry (for nouns)
 * @param {Object} entry - Vocabulary entry
 * @param {string} langCode - Language code ('nb' or 'en')
 * @returns {string} - Definite translation or empty string
 */
function getDefiniteTranslation(entry, langCode = 'nb') {
    return entry?.definite_translations?.[langCode] || '';
}

/**
 * Helper to get synonyms from JSON entry
 * @param {Object} entry - Vocabulary entry
 * @returns {Array} - Array of synonyms
 */
function getSynonyms(entry) {
    return entry?.synonyms || [];
}

/**
 * Helper to get translation synonyms from JSON entry
 * @param {Object} entry - Vocabulary entry
 * @param {string} langCode - Language code ('nb' or 'en')
 * @returns {Array} - Array of translation synonyms
 */
function getTranslationSynonyms(entry, langCode = 'nb') {
    return entry?.translation_synonyms?.[langCode] || [];
}

/**
 * Helper to get explanation from JSON entry
 * @param {Object} entry - Vocabulary entry
 * @param {string} langCode - Language code ('nb' or 'en')
 * @returns {Object} - Explanation object (may contain _description and synonym explanations)
 */
function getExplanations(entry, langCode = 'nb') {
    return entry?.explanations?.[langCode] || {};
}

export async function collectAndProcessVocabulary(lessonIds, { ordbank, verbbank, substantivbank, adjektivbank }) {
    // Get configuration for current curriculum
    const curriculumId = getActiveCurriculum();
    const manifest = await getManifest(curriculumId);

    const config = getCurriculumConfig(curriculumId);
    const { grammar } = config.languageConfig;

    // Get translation language code based on UI language
    const langCode = getTranslationLangCode();

    let vocab = [];

    lessonIds.forEach(lessonId => {
        const lessonData = manifest.lessons[lessonId];
        if (!lessonData || !lessonData.words) return;

        lessonData.words.forEach(wordId => {
            // Retrieve word from one of the banks
            // Banks are now Objects keyed by ID!
            let entry = ordbank[wordId] ||
                ordbank[`${wordId}_phrase`] ||
                ordbank[`${wordId}_interj`] ||
                ordbank[`${wordId}_num`] ||
                (verbbank && (verbbank[wordId] || verbbank[`${wordId}_verb`])) ||
                (substantivbank && (substantivbank[wordId] || substantivbank[`${wordId}_noun`])) ||
                (adjektivbank && (adjektivbank[wordId] || adjektivbank[`${wordId}_adj`]));

            if (!entry) {
                return;
            }

            // Process Entry based on Type
            // 1. Verbs from Verbbank
            if (verbbank && (verbbank[wordId] || verbbank[`${wordId}_verb`])) {
                const verbEntry = verbbank[wordId] || verbbank[`${wordId}_verb`];
                // Store the original verbbank key for tooltip lookups
                const verbId = verbbank[wordId] ? wordId : `${wordId}_verb`;

                // Get target word - use 'word' field or derive from ID
                let tyskText = verbEntry.word;
                if (!tyskText) {
                    // Fallback: derive from key (e.g., "sich_freuen_auf_verb" -> "sich freuen auf")
                    // All entries should have 'word' field, but just in case:
                    tyskText = verbId.replace(/_verb$/, '').replace(/_/g, ' ');
                }

                const nativeText = getTranslation(verbEntry, langCode) || getTranslation(entry, langCode);

                vocab.push({
                    target: tyskText,
                    native: nativeText,
                    tysk: tyskText, // Legacy
                    norsk: nativeText, // Legacy
                    wordId: verbId, // Unique key for known words storage
                    verbId: verbId, // Original verbbank key for tooltip lookups (legacy)
                    synonymer: getSynonyms(verbEntry),
                    norsk_synonymer: getTranslationSynonyms(verbEntry, langCode),
                    synonym_forklaringer: getExplanations(verbEntry, langCode),
                    // Spread JSON fields for direct access
                    word: tyskText,
                    translations: verbEntry.translations,
                    synonyms: getSynonyms(verbEntry),
                    translation_synonyms: verbEntry.translation_synonyms,
                    explanations: verbEntry.explanations,
                    conjugations: verbEntry.conjugations,
                    bøyinger: verbEntry.conjugations, // Legacy alias for verb-test.js
                    modal: verbEntry.modal,
                    type: 'verb', // Enforce type 'verb'
                    grammarType: verbEntry.type // Preserve original type (strong/weak/modal/etc)
                });
            }
            // 2. Nouns from Substantivbank
            else if (substantivbank && (
                substantivbank[wordId] ||
                substantivbank[`${wordId}_noun`] ||
                substantivbank[wordId.toLowerCase()] ||
                substantivbank[`${wordId.toLowerCase()}_noun`]
            )) {
                const nounEntry = substantivbank[wordId] ||
                    substantivbank[`${wordId}_noun`] ||
                    substantivbank[wordId.toLowerCase()] ||
                    substantivbank[`${wordId.toLowerCase()}_noun`];

                // Determine the actual key used in substantivbank
                const nounId = substantivbank[wordId] ? wordId :
                    substantivbank[`${wordId}_noun`] ? `${wordId}_noun` :
                        substantivbank[wordId.toLowerCase()] ? wordId.toLowerCase() :
                            `${wordId.toLowerCase()}_noun`;

                // Get target word - use 'word' field or derive from ID
                let tyskText = nounEntry.word;
                if (!tyskText) {
                    tyskText = (nounEntry === substantivbank[`${wordId}_noun`] ? `${wordId}_noun` : wordId)
                        .replace(/_noun$/, '')
                        .replace(/_/g, ' ').trim();
                }

                // Use centralized formatter
                const targetText = formatNoun(tyskText, nounEntry.genus, grammar);
                // Prefer definite translation for nouns, fall back to regular translation
                const nativeText = getDefiniteTranslation(nounEntry, langCode) || getTranslation(nounEntry, langCode) || getTranslation(entry, langCode);

                vocab.push({
                    target: targetText,
                    targetRaw: tyskText, // Raw noun without article
                    native: nativeText,
                    tysk: targetText, // Legacy
                    norsk: nativeText, // Legacy
                    wordId: nounId, // Unique key for known words storage
                    synonymer: getSynonyms(nounEntry),
                    norsk_synonymer: getTranslationSynonyms(nounEntry, langCode),
                    synonym_forklaringer: getExplanations(nounEntry, langCode),
                    // Spread JSON fields for direct access
                    word: tyskText,
                    translations: nounEntry.translations,
                    definite_translations: nounEntry.definite_translations,
                    synonyms: getSynonyms(nounEntry),
                    translation_synonyms: nounEntry.translation_synonyms,
                    explanations: nounEntry.explanations,
                    cases: nounEntry.cases,
                    declension: nounEntry.declension,
                    genus: nounEntry.genus,
                    plural: nounEntry.plural,
                    type: 'noun'
                });
            }
            // 3. Adjectives
            else if (adjektivbank && adjektivbank[wordId]) {
                // Get target word - use 'word' field or derive from ID
                let tyskText = entry.word;
                if (!tyskText) {
                    tyskText = wordId.replace(/_adj$/, '').replace(/_/g, ' ');
                }

                const nativeText = getTranslation(entry, langCode);

                vocab.push({
                    target: tyskText,
                    native: nativeText,
                    tysk: tyskText, // Legacy
                    norsk: nativeText, // Legacy
                    wordId: wordId, // Unique key for known words storage
                    synonymer: getSynonyms(entry),
                    norsk_synonymer: getTranslationSynonyms(entry, langCode),
                    synonym_forklaringer: getExplanations(entry, langCode),
                    // Spread JSON fields for direct access
                    word: tyskText,
                    translations: entry.translations,
                    synonyms: getSynonyms(entry),
                    translation_synonyms: entry.translation_synonyms,
                    explanations: entry.explanations,
                    comparison: entry.comparison,
                    type: 'adj'
                });
            }
            // 4. General Words (Ordbank) - Check type for proper handling
            else {
                // If it's a noun in the general bank, try to treat it as a noun
                if (entry.type === 'noun') {
                    const tyskRaw = entry.word || '';

                    // Use centralized formatter
                    // Only add article if not already present in the raw string
                    const formatted = formatNoun(tyskRaw, entry.genus, grammar);

                    // Check if raw string already had article (avoid "der der Mann")
                    const article = grammar.articles[entry.genus];
                    const finalTysk = (article && tyskRaw.startsWith(article)) ? tyskRaw : formatted;

                    const nativeText = getDefiniteTranslation(entry, langCode) || getTranslation(entry, langCode);

                    vocab.push({
                        target: finalTysk,
                        targetRaw: tyskRaw, // Raw noun
                        native: nativeText,
                        tysk: finalTysk, // Legacy
                        norsk: nativeText, // Legacy
                        wordId: wordId, // Unique key for known words storage
                        synonymer: getSynonyms(entry),
                        norsk_synonymer: getTranslationSynonyms(entry, langCode),
                        synonym_forklaringer: getExplanations(entry, langCode),
                        // Spread JSON fields for direct access
                        word: tyskRaw,
                        translations: entry.translations,
                        definite_translations: entry.definite_translations,
                        synonyms: getSynonyms(entry),
                        translation_synonyms: entry.translation_synonyms,
                        explanations: entry.explanations,
                        genus: entry.genus,
                        plural: entry.plural,
                        type: 'noun'
                    });
                }
                // General fallback
                else {
                    const tyskText = entry.word || '';
                    const nativeText = getTranslation(entry, langCode);

                    vocab.push({
                        target: tyskText,
                        native: nativeText,
                        tysk: tyskText, // Legacy
                        norsk: nativeText, // Legacy
                        wordId: wordId, // Unique key for known words storage
                        // Spread JSON fields for direct access
                        word: tyskText,
                        translations: entry.translations,
                        synonyms: getSynonyms(entry),
                        translation_synonyms: entry.translation_synonyms,
                        explanations: entry.explanations,
                        type: entry.type
                    });
                }
            }
        });
    });

    // --- Reverse Lookup Logic ---
    // (Preserve existing logic for Synonyms)
    const nativeToTargetMap = {};

    vocab.forEach(item => {
        if (!item.native) return;
        const nativeKey = cleanAnswer(item.native).toLowerCase();

        if (!nativeToTargetMap[nativeKey]) {
            nativeToTargetMap[nativeKey] = [];
        }
        if (!nativeToTargetMap[nativeKey].includes(item.target)) {
            nativeToTargetMap[nativeKey].push(item.target);
        }
    });

    vocab.forEach(item => {
        if (!item.native) return;
        const nativeKey = cleanAnswer(item.native).toLowerCase();
        const potentialSynonyms = nativeToTargetMap[nativeKey];

        if (potentialSynonyms && potentialSynonyms.length > 1) {
            potentialSynonyms.forEach(targetWord => {
                if (targetWord !== item.target) {
                    if (!item.synonymer) item.synonymer = [];
                    if (!item.synonymer.includes(targetWord)) {
                        item.synonymer.push(targetWord);
                    }
                }
            });
        }
    });

    return vocab.sort(() => Math.random() - 0.5);
}
