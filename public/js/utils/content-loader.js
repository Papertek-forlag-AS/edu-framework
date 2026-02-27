/**
 * content-loader.js
 * Handles dynamic loading of language-specific content based on curriculum configuration.
 *
 * Uses split vocabulary system:
 * - Core data: shared/vocabulary/core/{language}/
 * - Translations: shared/vocabulary/translations/{language}-to-{native}/
 */

import { getCurriculumConfig } from '../progress/curriculum-registry.js';
import { getActiveCurriculum } from '../progress/store.js';
import { getNativeLanguage } from '../vocabulary/vocabulary-provider.js';
import { fetchCoreBank, fetchTranslationBank } from '../vocabulary/vocab-api-client.js';

// Cache loaded content to avoid repeated fetches
const contentCache = {};

// ISO 639-1 language codes used:
// Target languages: de (German), es (Spanish), fr (French)
// Native languages: nb (Norwegian Bokmål), en (English)

/**
 * Merge core vocabulary data with translations.
 * @param {Object} core - Core vocabulary data
 * @param {Object} translations - Translation data for native language
 * @param {string} nativeLang - Native language code
 * @returns {Object} Merged vocabulary
 */
function mergeVocabulary(core, translations, nativeLang) {
    const merged = {};

    for (const [wordId, coreEntry] of Object.entries(core)) {
        if (wordId === '_metadata') continue;

        // Start with core data
        const entry = { ...coreEntry };

        // Add translations if available
        const trans = translations[wordId];
        if (trans) {
            // Main translation
            if (trans.translation) {
                entry.translations = entry.translations || {};
                entry.translations[nativeLang] = trans.translation;
            }

            // Synonyms
            if (trans.synonyms) {
                entry.translation_synonyms = entry.translation_synonyms || {};
                entry.translation_synonyms[nativeLang] = trans.synonyms;
            }

            // Explanations
            if (trans.explanation) {
                entry.explanations = entry.explanations || {};
                entry.explanations[nativeLang] = trans.explanation;
            }

            // Definite translations (for nouns)
            if (trans.definite) {
                entry.definite_translations = entry.definite_translations || {};
                entry.definite_translations[nativeLang] = trans.definite;
            }

            // Example sentences
            if (trans.examples && Array.isArray(trans.examples)) {
                entry.examples = entry.examples || {};
                entry.examples[nativeLang] = trans.examples;
            }
        }

        merged[wordId] = entry;
    }

    return merged;
}

/**
 * Check if current page is international (English UI)
 * @returns {boolean}
 */
function isInternationalPage() {
    return document.body?.dataset?.uiLanguage === 'en';
}

/**
 * Loads all necessary content for the active curriculum.
 * @param {object} externalConfig - Optional config to use (overrides getActiveCurriculum)
 * @returns {Promise<Object>} Object containing lessonsData, grammarData, and wordBanks
 */
export async function loadContent(externalConfig) {
    const curriculumId = externalConfig?.id || getActiveCurriculum();
    const nativeLang = getNativeLanguage();
    const isInternational = isInternationalPage();

    // Check cache - must match curriculum, native language, AND international status
    const cacheKey = `${curriculumId}_${nativeLang}_${isInternational ? 'int' : 'std'}`;
    if (contentCache[cacheKey]) {
        return contentCache[cacheKey];
    }

    const config = externalConfig || getCurriculumConfig(curriculumId);

    // Determine content path:
    // - International pages load from german-international/
    // - Spanish pages load from spanish/
    // - Standard pages load from german/
    let contentPath;
    if (isInternational) {
        contentPath = '../../content/german-international';
    } else if (config.languageConfig?.code === 'es') {
        contentPath = '../../content/spanish';
    } else {
        contentPath = config.contentPath || '../../content/german';
    }

    // Determine content file suffix based on page type
    // International pages use 'international-a1' suffix, others use curriculum ID
    const contentSuffix = isInternational ? 'international-a1' : config.id;
    const fallbackSuffix = isInternational ? 'international-a1' : 'tysk1-vg1';

    let lessonsModule;
    try {
        lessonsModule = await import(`${contentPath}/lessons-data-${contentSuffix}.js`);
    } catch (e) {
        console.warn(`Could not load lessons-data-${contentSuffix}.js, falling back to ${fallbackSuffix}`);
        lessonsModule = await import(`${contentPath}/lessons-data-${fallbackSuffix}.js`);
    }

    // Dynamic load with fallback for shared content types
    let grammarModule, pronunciationModule, cultureModule;

    try { grammarModule = await import(`${contentPath}/grammar-data-${contentSuffix}.js`); }
    catch (e) {
        console.warn(`Could not load grammar-data-${contentSuffix}.js, falling back to ${fallbackSuffix}`);
        grammarModule = await import(`${contentPath}/grammar-data-${fallbackSuffix}.js`);
    }

    try { pronunciationModule = await import(`${contentPath}/pronunciation-data-${contentSuffix}.js`); }
    catch (e) {
        console.warn(`Could not load pronunciation-data-${contentSuffix}.js, falling back to ${fallbackSuffix}`);
        pronunciationModule = await import(`${contentPath}/pronunciation-data-${fallbackSuffix}.js`);
    }

    try { cultureModule = await import(`${contentPath}/culture-data-${contentSuffix}.js`); }
    catch (e) {
        console.warn(`Could not load culture-data-${contentSuffix}.js, falling back to ${fallbackSuffix}`);
        cultureModule = await import(`${contentPath}/culture-data-${fallbackSuffix}.js`);
    }

    const vocabDataModule = await import(`${contentPath}/vocabulary-data.js`);

    // Load characters data
    const charactersModule = await import(`${contentPath}/characters-data.js`);

    // Load vocabulary from external API (core + translations)
    // Uses ISO 639-1 codes: de (German), es (Spanish), fr (French), nb (Norwegian), en (English)
    const langCode = config.languageConfig?.code || 'de';
    const nativeCode = nativeLang || 'nb';
    const transPair = `${langCode}-${nativeCode}`;

    const bankNames = ['nounbank', 'verbbank', 'generalbank', 'adjectivebank', 'numbersbank', 'phrasesbank', 'pronounsbank', 'articlesbank'];

    // Load core and translation banks in parallel from external API
    const [coreBanks, transBanks] = await Promise.all([
        Promise.all(bankNames.map(b => fetchCoreBank(langCode, b))),
        Promise.all(bankNames.map(b => fetchTranslationBank(transPair, b)))
    ]);

    // Merge core with translations
    const [nounCore, verbCore, generalCore, adjCore, numbersCore, phrasesCore, pronounsCore, articlesCore] = coreBanks;
    const [nounTrans, verbTrans, generalTrans, adjTrans, numbersTrans, phrasesTrans, pronounsTrans, articlesTrans] = transBanks;

    const nounBank = mergeVocabulary(nounCore, nounTrans, nativeLang);
    const verbbank = mergeVocabulary(verbCore, verbTrans, nativeLang);
    const generalBank = mergeVocabulary(generalCore, generalTrans, nativeLang);
    const adjectiveBank = mergeVocabulary(adjCore, adjTrans, nativeLang);
    const numbersBank = mergeVocabulary(numbersCore, numbersTrans, nativeLang);
    const phrasesBank = mergeVocabulary(phrasesCore, phrasesTrans, nativeLang);
    const pronounsBank = mergeVocabulary(pronounsCore, pronounsTrans, nativeLang);
    const articlesBank = mergeVocabulary(articlesCore, articlesTrans, nativeLang);

    // Combine into wordBank (general + numbers + phrases + pronouns + articles)
    const wordBank = {
        ...generalBank,
        ...numbersBank,
        ...phrasesBank,
        ...pronounsBank,
        ...articlesBank
    };

    const content = {
        lessonsData: lessonsModule.lessonsData,
        chapterTitles: lessonsModule.chapterTitles,
        grammarData: grammarModule.grammarData,
        pronunciationData: pronunciationModule.pronunciationData,
        cultureData: cultureModule.cultureData,
        vocabularyData: vocabDataModule.vocabularyData,
        charactersData: charactersModule,
        wordBanks: {
            nounBank,
            verbbank,
            wordBank,
            adjectiveBank
        },
        // Store native language used for this cache entry
        _nativeLanguage: nativeLang
    };

    contentCache[cacheKey] = content;
    return content;
}

/**
 * Clear content cache (call when native language changes)
 */
export function clearContentCache() {
    for (const key of Object.keys(contentCache)) {
        delete contentCache[key];
    }
}

/**
 * Get current native language from cache or default
 * @returns {string} Current native language code
 */
export function getCurrentNativeLanguage() {
    return getNativeLanguage();
}
