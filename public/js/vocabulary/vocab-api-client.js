/**
 * Vocabulary API Client
 *
 * Sentralt modul for å hente vokabulardata.
 * Data hentes fra statiske JSON-filer som er bygget fra den eksterne API-en
 * under Vercel-bygget (scripts/fetch-vocabulary.cjs).
 *
 * Brukere laster aldri fra ekstern API — bare lokale filer.
 */

const VOCAB_BASE = '/shared/vocabulary';
const cache = new Map();

/**
 * Generisk fetch med in-memory cache.
 * @param {string} path - Sti relativ til VOCAB_BASE (f.eks. "core/de/verbbank.json")
 * @param {boolean} silent404 - Returner {} stille ved 404
 * @returns {Promise<Object>}
 */
async function cachedFetch(path, silent404 = false) {
    if (cache.has(path)) return cache.get(path);

    const response = await fetch(`${VOCAB_BASE}/${path}`);

    if (!response.ok) {
        if (silent404 && response.status === 404) {
            cache.set(path, {});
            return {};
        }
        throw new Error(`[Vocab] Failed to fetch ${path}: ${response.status}`);
    }

    const data = await response.json();
    cache.set(path, data);
    return data;
}

/**
 * Hent en kjernebank (verbbank, nounbank osv.)
 * @param {string} lang - ISO 639-1 språkkode (de, es, fr)
 * @param {string} bankName - Banknavn uten .json (f.eks. "verbbank")
 * @returns {Promise<Object>}
 */
export async function fetchCoreBank(lang, bankName) {
    return cachedFetch(`core/${lang}/${bankName}.json`);
}

/**
 * Hent en oversettelsesbank.
 * Returnerer {} stille ved 404 (matcher eksisterende fallback-oppførsel).
 * @param {string} pair - Språkpar (f.eks. "de-nb", "es-en")
 * @param {string} bankName - Banknavn uten .json
 * @returns {Promise<Object>}
 */
export async function fetchTranslationBank(pair, bankName) {
    return cachedFetch(`translations/${pair}/${bankName}.json`, true);
}

/**
 * Hent et pensum-manifest (curricula).
 * @param {string} curriculumId - Pensum-ID (f.eks. "tysk1-vg1")
 * @returns {Promise<Object|null>}
 */
export async function fetchCurriculum(curriculumId) {
    try {
        return await cachedFetch(`curricula/vocab-manifest-${curriculumId}.json`);
    } catch (e) {
        console.warn(`[Vocab] Could not load curriculum ${curriculumId}:`, e.message);
        return null;
    }
}

/**
 * Hent grammatikk-features.
 * @param {string} lang - ISO 639-1 språkkode (brukes ikke for filsti, men beholdt for API-kompatibilitet)
 * @returns {Promise<Object>}
 */
export async function fetchGrammarFeatures(lang) {
    return cachedFetch('grammar-features.json');
}
