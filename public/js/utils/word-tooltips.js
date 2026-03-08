// word-tooltips.js
// Dynamic tooltip system - Configured at runtime via configureTooltips()

import { isFeatureUnlocked } from '../vocab-trainer-multi/vocabulary-loader.js';
import {
    normalizeChars,
    genusToArticle,
    getNativeLanguageCode,
    getLanguageDir,
} from '../core/language-utils.js';

// Grammar wordlist and verb classification — loaded dynamically per language
let grammarWordlist = {};
let verbClassification = {};

/**
 * Load language-specific resources (grammar terms, verb classification).
 * Called during tooltip configuration.
 * @param {string} contentPath - Path to content directory
 * @param {string} langDir - Language directory name (e.g., 'german', 'spanish')
 */
async function loadLanguageResources(contentPath, langDir) {
    // Load grammar wordlist (if it exists for this language)
    try {
        const grammarModule = await import(`../../content/${langDir}/grammar-wordlist.js`);
        grammarWordlist = grammarModule.grammarWordlist || {};
    } catch (e) {
        console.info(`No grammar wordlist found for ${langDir} — tooltips will work without grammar terms.`);
        grammarWordlist = {};
    }

    // Load verb classification (if it exists for this language)
    try {
        const langCode = langDir === 'german' ? 'de' : langDir === 'spanish' ? 'es' : langDir === 'french' ? 'fr' : langDir;
        const vcModule = await import(`../../shared/vocabulary/dictionary/verb-classification-${langCode}.json`, { with: { type: 'json' } });
        const { _metadata, ...rest } = vcModule.default || vcModule;
        verbClassification = rest;
    } catch (e) {
        console.info(`No verb classification found for ${langDir} — verb type icons disabled.`);
        verbClassification = {};
    }
}

/**
 * Check if an explanation description should be shown based on grammar progression.
 * Gates explanations that reference grammar concepts (dativ, akkusativ) not yet taught.
 * @param {string} description - The explanation text to check
 * @param {string} currentLesson - Current lesson ID (e.g., "5.1")
 * @returns {{ show: boolean, gated: boolean }} Whether to show the explanation
 */
function shouldShowExplanation(description, currentLesson) {
    if (!description) return { show: true, gated: false };
    const lower = description.toLowerCase();
    const mentionsDativ = lower.includes('dativ');
    const mentionsAkkusativ = lower.includes('akkusativ');

    // Gate explanations that reference grammar concepts not yet taught
    if (mentionsDativ && !isFeatureUnlocked('grammar_dative', currentLesson)) {
        return { show: false, gated: true };
    }
    if (mentionsAkkusativ &&
        !isFeatureUnlocked('grammar_accusative_indefinite', currentLesson) &&
        !isFeatureUnlocked('grammar_accusative_definite', currentLesson)) {
        return { show: false, gated: true };
    }
    return { show: true, gated: false };
}

/**
 * Generate expandable examples HTML.
 * @param {Array} examples - Array of { sentence, translation } objects
 * @param {string} wordId - Unique identifier for this word (used for toggle state)
 * @returns {string} HTML string for the expandable examples section
 */
function generateExamplesHTML(examples, wordId) {
    if (!examples || !examples.length) return '';

    const escapedWordId = wordId.replace(/[^a-zA-Z0-9]/g, '_');

    return `
        <div class="examples-section mt-3 pt-2 border-t border-neutral-200">
            <button class="explore-more-btn flex items-center gap-1 text-sm text-info-600 hover:text-info-800 font-medium"
                    data-target="examples-${escapedWordId}">
                <span class="expand-icon">▶</span>
                <span>Utforsk mer</span>
            </button>
            <div id="examples-${escapedWordId}" class="examples-content hidden mt-2">
                <div class="text-xs text-neutral-500 mb-1 font-medium">Eksempler:</div>
                ${examples.map(ex => `
                    <div class="example-item mb-2 pl-2 border-l-2 border-info-200">
                        <div class="text-sm font-medium">${ex.sentence}</div>
                        <div class="text-sm text-neutral-600 italic">${ex.translation}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

let vocabularyContext = {
    wordBanks: {},
    languageConfig: {},
    contentPath: ''
};

/**
 * Configure the tooltip system with loaded content and configuration.
 * Call this from page-init.js after content is loaded.
 * 
 * @param {Object} content - Object containing wordBanks key
 * @param {Object} config - Curriculum configuration
 */
export async function configureTooltips(content, config) {
    if (!content || !content.wordBanks) {
        console.warn('configureTooltips called without valid content');
        return;
    }

    vocabularyContext.wordBanks = content.wordBanks;

    // Language config from curriculum registry
    vocabularyContext.languageConfig = config.languageConfig || {};

    // Determine content path for audio
    vocabularyContext.contentPath = config.contentPath || '../../content/default';

    // Load language-specific resources (grammar terms, verb classification)
    const langDir = config.languageDir || config.contentPath?.split('/').pop() || 'default';
    await loadLanguageResources(vocabularyContext.contentPath, langDir);

    const targetLang = vocabularyContext.languageConfig.dataKeys?.target || vocabularyContext.languageConfig.code || 'target';
    console.log('✅ Tooltips configured for language:', targetLang);
}

/**
 * Sets up interactive tooltips for elements with class .group
 * Handles click-to-toggle behavior for mobile friendliness
 */
export function setupInteractiveTooltips() {
    const interactiveElements = document.querySelectorAll('.group');

    interactiveElements.forEach(el => {
        el.addEventListener('click', (event) => {
            event.stopPropagation();
            const wasActive = el.classList.contains('show-tooltip');
            interactiveElements.forEach(i => i.classList.remove('show-tooltip'));
            if (!wasActive) {
                el.classList.add('show-tooltip');
            }
        });
    });

    document.addEventListener('click', () => {
        interactiveElements.forEach(el => {
            el.classList.remove('show-tooltip');
        });
    });
}

/**
 * Sets up the main word lookup system.
 * Handles verbs, nouns, adjectives, articles, pronouns, and general words.
 */
export function setupWordLookups() {
    // Prevent multiple initializations (Event Delegation Pattern)
    if (window.wordLookupsInitialized) return;
    window.wordLookupsInitialized = true;

    // Expose globally if needed
    window.initializeTooltips = setupWordLookups;

    let tooltipElement = document.getElementById('grammar-tooltip');
    if (!tooltipElement) {
        tooltipElement = document.createElement('div');
        tooltipElement.id = 'grammar-tooltip';
        document.body.appendChild(tooltipElement);
    }

    // Event Delegation: Listen on body for clicks (word-lookup, grammar-info, term-lookup)
    document.body.addEventListener('click', (event) => {
        const target = event.target.closest('.grammar-info, .word-lookup, .term-lookup');
        if (!target) return; // Not a lookup element

        event.stopPropagation();

        // Handle Fullscreen Context
        const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
        if (fullscreenElement && !fullscreenElement.contains(tooltipElement)) {
            fullscreenElement.appendChild(tooltipElement);
        } else if (!fullscreenElement && document.body !== tooltipElement.parentNode) {
            document.body.appendChild(tooltipElement);
        }

        const isVisible = tooltipElement.classList.contains('visible');
        tooltipElement.classList.remove('visible');

        // If clicking the same word, just close it (toggle behavior)
        if (isVisible && tooltipElement.dataset.currentWordId === target.textContent) return;

        tooltipElement.dataset.currentWordId = target.textContent;
        tooltipElement.innerHTML = '';

        // --- TERM LOOKUP (science terms with data-term-definition) ---
        if (target.classList.contains('term-lookup') && target.dataset.termDefinition) {
            const termText = target.textContent.trim();
            const definition = target.dataset.termDefinition;
            const termHTML = `
                <div class="tooltip-title">📘 ${termText}</div>
                <div class="mt-1 text-sm">${definition}</div>
            `;
            tooltipElement.innerHTML = termHTML;

            const wordRect = target.getBoundingClientRect();
            tooltipElement.style.position = 'fixed';
            tooltipElement.style.zIndex = '10000';
            const topPos = wordRect.top - tooltipElement.offsetHeight - 8;
            tooltipElement.style.left = `${wordRect.left}px`;
            tooltipElement.style.top = `${topPos}px`;
            tooltipElement.classList.add('visible');
            return;
        }

        const wordType = target.dataset.type;
        // Prioritize explicit data-attributes, then data-word (Ch 12 style), then text content
        let wordKey = target.textContent.trim().replace(/[.,!?;:]/g, '');

        if (target.dataset.word) {
            wordKey = target.dataset.word;
        }

        if (wordType === 'verb' && target.dataset.verb) {
            wordKey = target.dataset.verb;
        }
        if ((wordType === 'adjektiv' || wordType === 'adjective') && target.dataset.adjective) {
            wordKey = target.dataset.adjective;
        }
        if ((wordType === 'substantiv' || wordType === 'noun') && target.dataset.noun) {
            wordKey = target.dataset.noun;
        }

        let contentHTML = '';
        let audioData = null;
        const langConfig = vocabularyContext.languageConfig || {};
        const nativeCode = getNativeLanguageCode();

        // --- LOOKUP LOGIC ---

        // 1. VERB LOOKUP
        if (wordType === 'verb' && vocabularyContext.wordBanks.verbbank) {
            const verbbank = vocabularyContext.wordBanks.verbbank;
            const normalizedKey = normalizeChars(wordKey.toLowerCase());
            const verb = verbbank[wordKey] ||
                verbbank[`${wordKey}_verb`] ||
                verbbank[wordKey.toLowerCase()] ||
                verbbank[`${wordKey.toLowerCase()}_verb`] ||
                // Also try normalized keys (heißen → heissen)
                verbbank[normalizedKey] ||
                verbbank[`${normalizedKey}_verb`];

            if (verb) {
                audioData = verb.audio;
                const verbTranslation = verb.translations?.[nativeCode] || '';

                // Verb type icons - use verbClass if available for accurate classification
                let verbIcons = '';
                const normalizedVerbKey = normalizeChars(wordKey.toLowerCase());
                const vcLookup = verbClassification[wordKey] || verbClassification[`${wordKey}_verb`] ||
                    verbClassification[normalizedVerbKey] || verbClassification[`${normalizedVerbKey}_verb`];
                if (vcLookup?.default === 'modal' || verb.modal) verbIcons = '<span class="text-info-600">🔧⚡</span> ';
                else if (vcLookup?.default === 'strong' || verb.type === 'strong' || verb.type === 'sterkt') verbIcons = '<span class="text-primary-500">⚡</span> ';
                else if (vcLookup?.default === 'mixed') verbIcons = '<span class="text-accent4-500">⚡</span> ';

                contentHTML = `<div class="tooltip-title">${verbIcons}${wordKey} - ${verbTranslation}</div>`;

                // Conjugations (Presens) - Progressive disclosure based on lesson
                if (verb.conjugations && verb.conjugations.presens && verb.conjugations.presens.former) {
                    contentHTML += '<div class="mt-2 text-sm"><strong>Presens:</strong></div>';
                    contentHTML += '<div class="grid grid-cols-2 gap-1 text-sm mt-1">';

                    const former = verb.conjugations.presens.former;

                    // Get current lesson from page context (convert "1-2" to "1.2" format)
                    const rawChapterId = document.body.dataset.chapterId || '1-1';
                    const currentLesson = rawChapterId.replace('-', '.');

                    // Define pronoun groups for progressive disclosure
                    // Uses the language's configured pronouns, split into progressive groups
                    const allPronouns = langConfig.grammar?.pronouns || Object.keys(former);
                    const pronounGroups = {
                        basic: allPronouns.slice(0, 2),             // First 2 pronouns
                        intermediate: allPronouns.slice(0, 4),      // First 4 pronouns
                        all: allPronouns                            // All pronouns
                    };

                    // Determine which pronouns to show based on grammar progression
                    let pronounsToShow;
                    if (isFeatureUnlocked('grammar_pronouns_all', currentLesson)) {
                        pronounsToShow = pronounGroups.all;
                    } else if (isFeatureUnlocked('grammar_pronouns_singular_wir', currentLesson)) {
                        pronounsToShow = pronounGroups.intermediate;
                    } else {
                        pronounsToShow = pronounGroups.basic;
                    }

                    // Show only the unlocked pronoun forms
                    for (const pronoun of pronounsToShow) {
                        if (former[pronoun]) {
                            contentHTML += `<div>${pronoun}: <strong>${former[pronoun]}</strong></div>`;
                        }
                    }
                    contentHTML += '</div>';
                }

                // Add examples section if available
                const verbExamples = verb.examples?.[nativeCode];
                if (verbExamples && verbExamples.length > 0) {
                    contentHTML += generateExamplesHTML(verbExamples, wordKey);
                }
            }
        }

        // 2. NOUN LOOKUP - Progressive disclosure based on lesson
        else if ((wordType === 'substantiv' || wordType === 'noun') && vocabularyContext.wordBanks.nounBank) {
            const nounBank = vocabularyContext.wordBanks.nounBank;
            const normalizedKey = normalizeChars(wordKey.toLowerCase());
            const noun = nounBank[wordKey] ||
                nounBank[`${wordKey}_substantiv`] ||
                nounBank[wordKey.toLowerCase()] ||
                nounBank[`${wordKey.toLowerCase()}_substantiv`] ||
                nounBank[`${wordKey.toLowerCase()}_noun`] ||
                nounBank[`${wordKey}_noun`] ||
                // Also try normalized keys (Größe → Groesse)
                nounBank[normalizedKey] ||
                nounBank[`${normalizedKey}_substantiv`] ||
                nounBank[`${normalizedKey}_noun`];

            if (noun) {
                audioData = noun.audio;
                const nounTranslation = noun.translations?.[nativeCode] || '';

                // Get current lesson from page context (convert "1-2" to "1.2" format)
                const rawChapterId = document.body.dataset.chapterId || '1-1';
                const currentLesson = rawChapterId.replace('-', '.');

                // Determine definite article based on gender (language-aware)
                const artikel = genusToArticle(noun.genus) || '';

                // Build title based on grammar progression
                let titleContent = noun.word || wordKey;
                if (isFeatureUnlocked('grammar_articles', currentLesson) && artikel) {
                    titleContent = `${artikel} ${noun.word || wordKey}`;
                }
                contentHTML = `<div class="tooltip-title">${titleContent} - ${nounTranslation}</div>`;

                // Show indefinite article after grammar_articles is unlocked
                if (isFeatureUnlocked('grammar_articles', currentLesson)) {
                    // Use case data if available (most reliable), otherwise show nothing
                    // Indefinite articles vary too much by language to hardcode
                    const nominativUbestemt = noun.cases?.nominativ?.ubestemt ||
                        (noun.indefiniteArticle ? `${noun.indefiniteArticle} ${noun.word || wordKey}` : '');

                    if (nominativUbestemt && noun.genus !== 'pl') {
                        contentHTML += `<div class="mt-2 text-sm"><strong>Ubestemt:</strong> ${nominativUbestemt}</div>`;
                    }
                }

                // Show plural after grammar_plural is unlocked
                if (isFeatureUnlocked('grammar_plural', currentLesson) && noun.plural) {
                    contentHTML += `<div class="mt-2 text-sm"><strong>Flertall:</strong> ${noun.plural}</div>`;
                }

                // Show accusative indefinite after grammar_accusative_indefinite is unlocked
                if (isFeatureUnlocked('grammar_accusative_indefinite', currentLesson) && noun.cases?.akkusativ?.ubestemt) {
                    contentHTML += `<div class="mt-2 text-sm"><strong>Akk. ubestemt:</strong> ${noun.cases.akkusativ.ubestemt}</div>`;
                }

                // Show accusative definite after grammar_accusative_definite is unlocked
                if (isFeatureUnlocked('grammar_accusative_definite', currentLesson) && noun.cases?.akkusativ?.bestemt) {
                    contentHTML += `<div class="mt-2 text-sm"><strong>Akk. bestemt:</strong> ${noun.cases.akkusativ.bestemt}</div>`;
                }

                // Add examples section if available
                const nounExamples = noun.examples?.[nativeCode];
                if (nounExamples && nounExamples.length > 0) {
                    contentHTML += generateExamplesHTML(nounExamples, wordKey);
                }
            }
        }

        // 3. ADJECTIVE LOOKUP
        else if ((wordType === 'adjektiv' || wordType === 'adjective') && vocabularyContext.wordBanks.adjectiveBank) {
            const adjectiveBank = vocabularyContext.wordBanks.adjectiveBank;
            const normalizedKey = normalizeChars(wordKey.toLowerCase());
            const adj = adjectiveBank[wordKey] ||
                adjectiveBank[wordKey.toLowerCase()] ||
                adjectiveBank[`${wordKey.toLowerCase()}_adj`] ||
                // Also try normalized keys (größer → groesser)
                adjectiveBank[normalizedKey] ||
                adjectiveBank[`${normalizedKey}_adj`];

            if (adj) {
                audioData = adj.audio;
                const adjTranslation = adj.translations?.[nativeCode] || '';
                contentHTML = `<div class="tooltip-title">${wordKey} - ${adjTranslation}</div>`;

                // Gradation - Progressive disclosure based on lesson
                const rawChapterId = document.body.dataset.chapterId || '1-1';
                const currentLesson = rawChapterId.replace('-', '.');

                if (adj.comparison) {
                    const showKomparativ = isFeatureUnlocked('grammar_comparative', currentLesson);
                    const showSuperlativ = isFeatureUnlocked('grammar_superlative', currentLesson);

                    if (showKomparativ || showSuperlativ) {
                        contentHTML += '<div class="mt-2 text-sm">';
                        if (showKomparativ && adj.comparison.komparativ) contentHTML += `<div><strong>Komparativ:</strong> ${adj.comparison.komparativ.form}</div>`;
                        if (showSuperlativ && adj.comparison.superlativ) contentHTML += `<div><strong>Superlativ:</strong> ${adj.comparison.superlativ.form}</div>`;
                        contentHTML += '</div>';
                    }
                }

                // Add examples section if available
                const adjExamples = adj.examples?.[nativeCode];
                if (adjExamples && adjExamples.length > 0) {
                    contentHTML += generateExamplesHTML(adjExamples, wordKey);
                }
            }
        }

        // 4. ARTICLE/PRONOUN LOOKUP (Simple)
        else if (['artikkel', 'article', 'pronomen', 'pronoun'].includes(wordType)) {
            // Try searching in articlesBank and pronounsBank
            const banks = [vocabularyContext.wordBanks.articlesBank, vocabularyContext.wordBanks.pronounsBank];
            for (const bank of banks) {
                if (!bank) continue;
                const entry = Object.values(bank).find(w => w.word && w.word.toLowerCase() === wordKey.toLowerCase());
                if (entry) {
                    audioData = entry.audio;
                    const translation = entry.translations?.[nativeCode] || '';
                    contentHTML = `<div class="tooltip-title">${entry.word} - ${translation}</div>`;
                    break;
                }
            }
        }

        // 5. GENERIC FALLBACK (Search Everything)
        if (!contentHTML) {
            const allWords = [
                ...Object.values(vocabularyContext.wordBanks.wordBank || {}),
                ...Object.values(vocabularyContext.wordBanks.verbbank || {}),
                ...Object.values(vocabularyContext.wordBanks.nounBank || {}),
                ...Object.values(vocabularyContext.wordBanks.adjectiveBank || {}),
                ...Object.values(vocabularyContext.wordBanks.articlesBank || {}),
                ...Object.values(vocabularyContext.wordBanks.pronounsBank || {})
            ];

            const entry = allWords.find(w => w.word && w.word.toLowerCase() === wordKey.toLowerCase());
            if (entry) {
                audioData = entry.audio;
                const translation = entry.translations?.[nativeCode] || '';
                contentHTML = `<div class="tooltip-title">${entry.word} - ${translation}</div>`;

                // Progressive disclosure: gate explanations that reference grammar not yet taught
                const rawChapterId = document.body.dataset.chapterId || '1-1';
                const currentLesson = rawChapterId.replace('-', '.');

                if (entry.explanations?.[nativeCode]?._description) {
                    const { show, gated } = shouldShowExplanation(entry.explanations[nativeCode]._description, currentLesson);
                    if (show) {
                        contentHTML += `<div class="mt-2 text-sm">${entry.explanations[nativeCode]._description}</div>`;
                    } else if (gated) {
                        contentHTML += `<div class="mt-2 text-xs text-neutral-400 italic">📚 Du lærer mer om dette i en senere leksjon.</div>`;
                    }
                }

                // Add examples section if available
                const entryExamples = entry.examples?.[nativeCode];
                if (entryExamples && entryExamples.length > 0) {
                    contentHTML += generateExamplesHTML(entryExamples, wordKey);
                }
            }
        }

        // --- RENDER & DISPLAY ---

        if (contentHTML) {
            tooltipElement.innerHTML = contentHTML;

            // Set up expand/collapse for examples section
            const exploreBtn = tooltipElement.querySelector('.explore-more-btn');
            if (exploreBtn) {
                exploreBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const targetId = exploreBtn.dataset.target;
                    const examplesContent = document.getElementById(targetId);
                    const expandIcon = exploreBtn.querySelector('.expand-icon');

                    if (examplesContent) {
                        const isHidden = examplesContent.classList.contains('hidden');
                        examplesContent.classList.toggle('hidden');
                        if (expandIcon) {
                            expandIcon.textContent = isHidden ? '▼' : '▶';
                        }
                    }
                });
            }

            // Audio Button logic
            const contentPath = vocabularyContext.contentPath;
            const isLessonPage = window.location.pathname.includes('/lessons/');
            const rootPath = isLessonPage ? '../../../../' : '';
            const langFolder = contentPath ? contentPath.split('/').pop() : 'de';

            // Clean path helper
            const cleanPath = (p) => p ? p.trim().replace(/\s+/g, '_') : null;

            let audioSrc = null;

            if (audioData) {
                if (!audioData.includes('/')) {
                    // Filename only -> construct path
                    audioSrc = `${rootPath}content/${langFolder}/vocab-audio/${audioData}`;
                } else {
                    // Full path provided (legacy or specific)
                    if (!audioData.startsWith('http') && !audioData.startsWith('/')) {
                        audioSrc = `${rootPath}${audioData}`; // Assume relative to root if not absolute
                    } else {
                        audioSrc = audioData;
                    }
                }
            }
            // Auto-fallback based on key (legacy convention)
            else {
                const normalizedKey = wordKey.toLowerCase().replace(/\s+/g, '_');
                // Guess prefix based on type (must match audio file naming convention)
                let prefix = 'ord';
                if (wordType === 'verb') prefix = 'verb';
                if (['noun', 'substantiv'].includes(wordType)) prefix = 'substantiv';
                if (['adjective', 'adjektiv'].includes(wordType)) prefix = 'adjektiv';
                if (['pronomen', 'pronoun', 'possessiv pronomen'].includes(wordType)) prefix = 'pronomen';
                if (['artikkel', 'article', 'sammentrekning'].includes(wordType)) prefix = 'artikkel';
                if (['frase', 'phrase'].includes(wordType)) prefix = 'frase';
                if (['tallord', 'number'].includes(wordType)) prefix = 'tall';
                if (wordType === 'land') prefix = 'land';

                audioSrc = `${rootPath}content/${langFolder}/vocab-audio/${prefix}_${normalizedKey}.mp3`;
            }

            audioSrc = cleanPath(audioSrc);

            if (audioSrc) {
                const audioBtn = document.createElement('button');
                audioBtn.className = 'mt-2 px-2 py-1 bg-info-500 text-white rounded text-sm hover:bg-info-600 flex items-center gap-1';
                audioBtn.innerHTML = '<span>🔊</span> <span>Lytt</span>';

                audioBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const icon = audioBtn.querySelector('span:first-child');

                    const audio = new Audio(audioSrc);
                    audio.play()
                        .then(() => icon.textContent = '🔊')
                        .catch(err => {
                            console.warn('Audio play failed:', audioSrc, err);
                            icon.textContent = '❌';
                            setTimeout(() => icon.textContent = '🔊', 2000);
                        });
                });
                tooltipElement.appendChild(audioBtn);
            }

            // Position and show
            const wordRect = target.getBoundingClientRect();
            tooltipElement.style.position = 'fixed';
            tooltipElement.style.zIndex = '10000';

            const topPos = wordRect.top - tooltipElement.offsetHeight - 8;
            tooltipElement.style.left = `${wordRect.left}px`;
            tooltipElement.style.top = `${topPos}px`;

            tooltipElement.classList.add('visible');
        } // End if(contentHTML)
    }); // End event listener

    // Close tooltip when clicking outside
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.grammar-info, .word-lookup, .term-lookup')) {
            if (tooltipElement && tooltipElement.classList.contains('visible')) {
                tooltipElement.classList.remove('visible');
            }
        }
    });
}

/**
 * Sets up lookups for specific grammar terms.
 * Used in grammar explanations.
 */
export function setupGrammarTermLookups() {
    let tooltipElement = document.getElementById('grammar-tooltip');
    if (!tooltipElement) return;

    const interactiveTerms = document.querySelectorAll('.term-lookup, .grammar-term');

    interactiveTerms.forEach(term => {
        term.addEventListener('click', (event) => {
            event.stopPropagation();

            const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
            if (fullscreenElement && !fullscreenElement.contains(tooltipElement)) {
                fullscreenElement.appendChild(tooltipElement);
            } else if (!fullscreenElement && document.body !== tooltipElement.parentNode) {
                document.body.appendChild(tooltipElement);
            }

            // Science term with self-contained definition (from autoTagTerms)
            if (event.target.dataset.termDefinition) {
                const termText = event.target.textContent.trim();
                const termDef = event.target.dataset.termDefinition;

                const isVisible = tooltipElement.classList.contains('visible');
                tooltipElement.classList.remove('visible');
                if (isVisible && tooltipElement.dataset.currentWordId === termText) return;

                tooltipElement.dataset.currentWordId = termText;
                tooltipElement.innerHTML = `
                    <div class="tooltip-title">\u{1F4D8} ${termText}</div>
                    <div class="mt-1 text-sm">${termDef}</div>
                `;

                const wordRect = event.target.getBoundingClientRect();
                tooltipElement.style.position = 'fixed';
                tooltipElement.style.zIndex = '10000';
                tooltipElement.style.left = `${wordRect.left}px`;
                tooltipElement.style.top = `${wordRect.top - tooltipElement.offsetHeight - 8}px`;
                tooltipElement.classList.add('visible');
                return;
            }

            // Grammar term from wordlist
            const termKey = event.target.dataset.term;
            const definition = grammarWordlist[termKey];

            if (!definition) return;

            const isVisible = tooltipElement.classList.contains('visible');
            tooltipElement.classList.remove('visible');

            if (isVisible && tooltipElement.dataset.currentWordId === termKey) {
                return;
            }

            tooltipElement.dataset.currentWordId = termKey;

            const contentHTML = `
                <div class="tooltip-title">${definition.title}</div>
                <div>${definition.explanation}</div>
            `;
            tooltipElement.innerHTML = contentHTML;

            const wordRect = event.target.getBoundingClientRect();

            tooltipElement.style.position = 'fixed';
            tooltipElement.style.zIndex = '10000';

            const topPos = wordRect.top - tooltipElement.offsetHeight - 8;
            tooltipElement.style.left = `${wordRect.left}px`;
            tooltipElement.style.top = `${topPos}px`;

            tooltipElement.classList.add('visible');
        });
    });
}
