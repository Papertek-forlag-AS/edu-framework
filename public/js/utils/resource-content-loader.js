/**
 * =================================================================
 * RESOURCE CONTENT LOADER
 * =================================================================
 *
 * Loads content for resource pages (Grammatikk, Landeskunde, Uttale, etc.)
 * in a language-aware way. Supports German, Spanish, and future languages.
 *
 * Resource pages use this to load aggregated content from all lessons
 * based on the user's active curriculum.
 */

import { getCurriculumConfig, CURRICULUM_REGISTRY } from '../progress/curriculum-registry.js';
import { getActiveCurriculum } from '../progress/store.js';

// Cache loaded content
const resourceCache = {};

/**
 * Determine the content folder based on curriculum language
 * @param {object} config - Curriculum config
 * @returns {string} Content folder path (relative to this module's location)
 */
function getContentPath(config) {
    // Use explicit contentPath from curriculum config when available
    if (config.contentPath) {
        return config.contentPath;
    }

    // Fallback: derive from language code for known languages
    const langCode = config.languageConfig?.code || 'nb';
    const langDirs = { 'de': 'german', 'es': 'spanish', 'fr': 'french' };
    const dir = langDirs[langCode] || langCode;
    return `../../content/${dir}`;
}

/**
 * Get all curricula for a specific language
 * @param {string} langCode - Language code (de, es, etc.)
 * @returns {string[]} Array of curriculum IDs
 */
function getCurriculaForLanguage(langCode) {
    return Object.keys(CURRICULUM_REGISTRY).filter(id => {
        const config = CURRICULUM_REGISTRY[id];
        return (config.languageConfig?.code || 'nb') === langCode;
    });
}

/**
 * Load grammar wordlist for the active language
 * @returns {Promise<object>} Grammar wordlist object
 */
export async function loadGrammarWordlist() {
    const curriculumId = getActiveCurriculum();
    const config = getCurriculumConfig(curriculumId);
    const contentPath = getContentPath(config);
    const langCode = config.languageConfig?.code || 'nb';

    const cacheKey = `grammar-wordlist-${langCode}`;
    if (resourceCache[cacheKey]) {
        return resourceCache[cacheKey];
    }

    try {
        const module = await import(`${contentPath}/grammar-wordlist.js`);
        resourceCache[cacheKey] = module.grammarWordlist;
        return module.grammarWordlist;
    } catch (error) {
        console.warn(`Could not load grammar-wordlist.js for ${langCode}:`, error);
        return {};
    }
}

/**
 * Load all grammar data for the active curriculum
 * @returns {Promise<object>} Aggregated grammar data keyed by lesson
 */
export async function loadAllGrammarData() {
    const curriculumId = getActiveCurriculum();
    const config = getCurriculumConfig(curriculumId);
    const contentPath = getContentPath(config);

    const cacheKey = `grammar-data-${curriculumId}`;
    if (resourceCache[cacheKey]) {
        return resourceCache[cacheKey];
    }

    try {
        const module = await import(`${contentPath}/grammar-data-${curriculumId}.js`);
        resourceCache[cacheKey] = module.grammarData;
        return module.grammarData;
    } catch (error) {
        console.warn(`Could not load grammar-data-${curriculumId}.js, trying fallback:`, error);

        // Try fallback for German
        if ((config.languageConfig?.code || 'nb') === 'de') {
            try {
                const fallback = await import(`${contentPath}/grammar-data-tysk1-vg1.js`);
                resourceCache[cacheKey] = fallback.grammarData;
                return fallback.grammarData;
            } catch (e) {
                console.error('Fallback grammar data also failed:', e);
            }
        }
        return {};
    }
}

/**
 * Load all culture data (Landeskunde) for the active curriculum
 * @returns {Promise<object>} Aggregated culture data keyed by lesson
 */
export async function loadAllCultureData() {
    const curriculumId = getActiveCurriculum();
    const config = getCurriculumConfig(curriculumId);
    const contentPath = getContentPath(config);

    const cacheKey = `culture-data-${curriculumId}`;
    if (resourceCache[cacheKey]) {
        return resourceCache[cacheKey];
    }

    try {
        const module = await import(`${contentPath}/culture-data-${curriculumId}.js`);
        resourceCache[cacheKey] = module.cultureData;
        return module.cultureData;
    } catch (error) {
        console.warn(`Could not load culture-data-${curriculumId}.js, trying fallback:`, error);

        // Try fallback for German
        if ((config.languageConfig?.code || 'nb') === 'de') {
            try {
                const fallback = await import(`${contentPath}/culture-data-tysk1-vg1.js`);
                resourceCache[cacheKey] = fallback.cultureData;
                return fallback.cultureData;
            } catch (e) {
                console.error('Fallback culture data also failed:', e);
            }
        }
        return {};
    }
}

/**
 * Load all pronunciation data (Uttale) for the active curriculum
 * @returns {Promise<object>} Aggregated pronunciation data keyed by lesson
 */
export async function loadAllPronunciationData() {
    const curriculumId = getActiveCurriculum();
    const config = getCurriculumConfig(curriculumId);
    const contentPath = getContentPath(config);

    const cacheKey = `pronunciation-data-${curriculumId}`;
    if (resourceCache[cacheKey]) {
        return resourceCache[cacheKey];
    }

    try {
        const module = await import(`${contentPath}/pronunciation-data-${curriculumId}.js`);
        resourceCache[cacheKey] = module.pronunciationData;
        return module.pronunciationData;
    } catch (error) {
        console.warn(`Could not load pronunciation-data-${curriculumId}.js, trying fallback:`, error);

        // Try fallback for German
        if ((config.languageConfig?.code || 'nb') === 'de') {
            try {
                const fallback = await import(`${contentPath}/pronunciation-data-tysk1-vg1.js`);
                resourceCache[cacheKey] = fallback.pronunciationData;
                return fallback.pronunciationData;
            } catch (e) {
                console.error('Fallback pronunciation data also failed:', e);
            }
        }
        return {};
    }
}

/**
 * Get the current language name for display
 * @returns {string} Language name in Norwegian (e.g., "tysk", "spansk")
 */
export function getCurrentLanguageName() {
    const curriculumId = getActiveCurriculum();
    const config = getCurriculumConfig(curriculumId);
    const langCode = config.languageConfig?.code || 'nb';

    const names = {
        'de': 'tysk',
        'es': 'spansk',
        'fr': 'fransk',
        'en': 'engelsk'
    };

    return names[langCode] || 'språk';
}

/**
 * Get the home page URL for the active curriculum
 * Used for "Tilbake til forsiden" links on resource pages
 * @returns {string} Relative URL to the home page
 */
export function getHomePageUrl() {
    const curriculumId = getActiveCurriculum();
    const config = getCurriculumConfig(curriculumId);
    const langCode = config.languageConfig?.code || 'nb';

    // Resource pages are in public/, home pages are in public/tysk/ or public/spansk/
    const homeUrls = {
        'de': 'tysk/index.html',
        'es': 'spansk/index.html',
        'fr': 'fransk/index.html',
        'en': 'engelsk/index.html'
    };

    return homeUrls[langCode] || config.paths?.homeLink || 'index.html';
}

/**
 * Get page titles based on current language
 * @param {string} pageType - 'grammar', 'culture', 'pronunciation', 'grammarWordlist'
 * @returns {object} Object with title and subtitle
 */
export function getResourcePageTitles(pageType) {
    const curriculumId = getActiveCurriculum();
    const config = getCurriculumConfig(curriculumId);
    const langCode = config.languageConfig?.code || 'nb';

    const titles = {
        'de': {
            grammar: {
                title: 'Grammatikk - Grammatikksammendrag',
                subtitle: 'En samling av alle grammatikksammendrag fra leksjonene.'
            },
            culture: {
                title: 'Landeskunde - Kulturfakta',
                subtitle: 'En samling av alle kultur- og samfunnsfakta fra leksjonene.'
            },
            pronunciation: {
                title: 'Uttale - Uttaleoversikt',
                subtitle: 'En samling av alle uttaleregler og tips fra leksjonene.'
            },
            grammarWordlist: {
                title: 'Grammatisk Ordliste',
                subtitle: 'Forklaring av grammatiske begreper.'
            }
        },
        'es': {
            grammar: {
                title: 'Gramática - Resumen gramatical',
                subtitle: 'En samling av alle grammatikksammendrag fra leksjonene.'
            },
            culture: {
                title: 'Cultura - Datos culturales',
                subtitle: 'En samling av alle kultur- og samfunnsfakta fra leksjonene.'
            },
            pronunciation: {
                title: 'Pronunciación - Guía de pronunciación',
                subtitle: 'En samling av alle uttaleregler og tips fra leksjonene.'
            },
            grammarWordlist: {
                title: 'Glosario gramatical',
                subtitle: 'Forklaring av grammatiske begreper.'
            }
        },
        'fr': {
            grammar: {
                title: 'Grammaire - Résumé grammatical',
                subtitle: 'En samling av alle grammatikksammendrag fra leksjonene.'
            },
            culture: {
                title: 'Culture - Faits culturels',
                subtitle: 'En samling av alle kultur- og samfunnsfakta fra leksjonene.'
            },
            pronunciation: {
                title: 'Prononciation - Guide de prononciation',
                subtitle: 'En samling av alle uttaleregler og tips fra leksjonene.'
            },
            grammarWordlist: {
                title: 'Glossaire grammatical',
                subtitle: 'Forklaring av grammatiske begreper.'
            }
        }
    };

    return titles[langCode]?.[pageType] || titles['de'][pageType];
}

/**
 * Clear the resource cache (call when curriculum changes)
 */
export function clearResourceCache() {
    for (const key of Object.keys(resourceCache)) {
        delete resourceCache[key];
    }
}
