/**
 * i18n.js - Simple client-side localization
 */

import { no } from '../locales/no.js';
import { en } from '../locales/en.js';

const LOCALES = {
    no: no,
    en: en
};

let currentLocale = 'no'; // Default to Norwegian

/**
 * Initialize i18n and translate the page
 */
export function initI18n(locale = 'no') {
    if (LOCALES[locale]) {
        currentLocale = locale;
    }
    console.log(`[i18n] Initialized with locale: ${currentLocale}, body.uiLanguage: ${document.body?.dataset?.uiLanguage}`);
    translatePage();
}

/**
 * Get the effective locale, checking both currentLocale and body data attribute
 * This allows the ordtrener to set language via data-ui-language attribute
 */
function getEffectiveLocale() {
    // Check body data attribute first (used by ordtrener and international pages)
    const bodyLang = document.body?.dataset?.uiLanguage;
    if (bodyLang && LOCALES[bodyLang]) {
        return bodyLang;
    }
    return currentLocale;
}

/**
 * Get translated string for a key
 * @param {string} key - The translation key
 * @param {string|object} fallbackOrParams - Either a fallback string OR params object
 * @param {object} params - Optional parameters to replace in string (e.g., { name: 'Bob' })
 * @returns {string} Translated string or fallback or key if not found
 */
export function t(key, fallbackOrParams = {}, params = null) {
    const locale = getEffectiveLocale();
    const dictionary = LOCALES[locale];

    // Determine if second arg is fallback string or params object
    let fallback = null;
    let actualParams = {};

    if (typeof fallbackOrParams === 'string') {
        fallback = fallbackOrParams;
        actualParams = params || {};
    } else if (typeof fallbackOrParams === 'object' && fallbackOrParams !== null) {
        actualParams = fallbackOrParams;
    }

    // Get the string: dictionary value > fallback > key
    let string = dictionary[key] || fallback || key;

    // Debug: log when a key is missing or using unexpected locale
    if (!dictionary[key] && !fallback) {
        console.warn(`[i18n] Missing key "${key}" for locale "${locale}"`);
    }

    // Replace params {{key}}
    if (actualParams && typeof actualParams === 'object') {
        Object.keys(actualParams).forEach(param => {
            string = string.replace(new RegExp(`{{${param}}}`, 'g'), actualParams[param]);
        });
    }

    return string;
}

/**
 * Translate all elements with data-i18n attribute
 */
export function translatePage() {
    const elements = document.querySelectorAll('[data-i18n]');

    elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (key) {
            // Handle different target attributes (e.g., placeholder, alt, or textContent)
            const targetAttr = element.getAttribute('data-i18n-target');

            const translation = t(key);

            if (targetAttr) {
                element.setAttribute(targetAttr, translation);
            } else {
                element.textContent = translation;
            }
        }
    });

    // Dispatch event so other components can know language changed
    document.dispatchEvent(new CustomEvent('languageChanged', { detail: { locale: currentLocale } }));
}

/**
 * Get current locale code
 */
export function getLocale() {
    return currentLocale;
}
