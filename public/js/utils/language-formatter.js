/**
 * Language Formatter Utility
 * Handles language-specific string manipulation rules.
 */

/**
 * Formats a noun with its definite article based on the language configuration.
 * 
 * @param {string} rawNoun - The raw noun string (e.g., "Mann")
 * @param {string} genus - The gender key (e.g., 'm', 'f', 'n')
 * @param {Object} grammarConfig - The grammar configuration object from curriculum registry
 * @returns {string} - The formatted noun (e.g., "der Mann")
 */
export function formatNoun(rawNoun, genus, grammarConfig) {
    if (!rawNoun) return '';

    // Default to German/Generic "Article + Space + Noun" pattern
    // This works for German, Spanish, Norwegian (indefinite), English, etc.

    // 1. Get the article
    const articles = grammarConfig.articles || {};
    const article = articles[genus];

    if (!article) {
        // Fallback: If no article defined for this genus, return raw noun
        return rawNoun;
    }

    // 2. Handle specific language rules (Future expansion)
    // E.g. French elision: le + ami -> l'ami
    // if (grammarConfig.code === 'fr' && /^[aeiouh]/i.test(rawNoun)) { ... }

    // 3. Default Pattern: Prepend with space
    return `${article} ${rawNoun}`;
}
