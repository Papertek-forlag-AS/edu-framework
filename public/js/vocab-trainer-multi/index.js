/**
 * Vocabulary Trainer Multi-Chapter - Main Entry Point
 * Exports all training modes with backward-compatible API
 */

// Import utilities
import { initializeKnownWords, saveKnownWordsToStorage } from './utils/known-words.js';
import { getMultiChapterVocabulary, getLessonVocabulary } from './vocabulary-loader.js';

// Import modes (New Modules)
import { renderFlashcards } from './flashcards.js';
import { renderSkriv } from './write.js';
import { renderKombiner } from './match.js';
import { renderSubstantivKjonn } from './gender.js';
import { renderTest } from './test.js';
import { renderVerbTest } from './verb-test.js';

// Import i18n helper
import { vt } from './i18n-helper.js';

// Module-level state to match original API
let ordbank = [];
let verbbank = {};
let substantivbank = {};
let adjektivbank = {};
let storageKey = '';
let config = null; // Curriculum configuration
let dataAdapter = null; // Default to null (use internal logic), unless injected

// --- History & State Management for Exercises ---
let isExerciseActive = false;
let exitExerciseHandler = null;

window.addEventListener('popstate', (event) => {
    if (isExerciseActive) {
        console.log('[VocabTrainer] Back button detected, exiting exercise');
        isExerciseActive = false;
        if (exitExerciseHandler) {
            exitExerciseHandler();
        }
    }
});


/**
 * Initialize vocabulary trainer with word banks
 * Matches original API: initializeVocabTrainerMulti(data)
 *
 * @param {Object} data - Configuration object
 * @param {Array} data.ordbank - Regular vocabulary
 * @param {Object} data.verbbank - Verb conjugations
 * @param {Object} data.substantivbank - Noun database
 * @param {Object} data.adjektivbank - Adjective database
 * @param {string} data.storageKey - Storage key for persistence
 * @param {Object} data.adapter - Optional DataAdapter instance (for V3.0 Blob Sync)
 */
export function initializeVocabTrainerMulti(data) {
    ordbank = data.ordbank || [];
    verbbank = data.verbbank || {};
    substantivbank = data.substantivbank || {};
    adjektivbank = data.adjektivbank || {};
    storageKey = data.storageKey || 'vocab-trainer-multi';
    config = data.config || null;
    dataAdapter = data.adapter;
}

/**
 * Setup vocabulary trainer for a single lesson
 *
 * @param {string} containerId - ID of main container element
 * @param {string} lessonId - Lesson ID (e.g., '1.1')
 */
export async function setupVocabTrainerSingleLesson(containerId, lessonId) {
    const mainContainer = document.getElementById(containerId);
    if (!mainContainer) {
        console.error(`Container with id "${containerId}" not found`);
        return;
    }

    // Load confetti library if not already loaded
    if (typeof confetti !== 'function') {
        const confettiScript = document.createElement('script');
        confettiScript.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js';
        document.head.appendChild(confettiScript);
    }

    // Extract chapter number from lessonId (e.g., '1.3' -> 1)
    const chapterNumber = parseInt(lessonId.split('.')[0]);

    // Get vocabulary for selected lesson
    const vocabulary = getLessonVocabulary(lessonId, { ordbank, verbbank, substantivbank, adjektivbank });

    if (vocabulary.length === 0) {
        mainContainer.innerHTML = `<p class="text-neutral-500 text-center py-8">${vt('no_words_lessons')}</p>`;
        return;
    }

    // Initialize known words
    const knownWords = await initializeKnownWords();

    // Render initial view
    renderInitialView();

    function renderInitialView() {
        mainContainer.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-bold text-center">
            <button data-mode="flashcards" class="vocab-btn p-4 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors">${vt('mode_flashcards')}</button>
            <button data-mode="kombiner" class="vocab-btn p-4 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors">${vt('mode_combine')}</button>
            <button data-mode="substantiv-kjonn" class="vocab-btn p-4 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors">${vt('mode_gender')}</button>
            <button data-mode="skriv" class="vocab-btn p-4 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors">${vt('mode_write')}</button>
        </div>

        <div id="vocab-exercise-area" class="mt-6 min-h-[350px] mb-4 flex items-center justify-center">
            <p class="text-neutral-500 text-center">${vt('select_method')}</p>
        </div>
    `;
        mainContainer.querySelectorAll('.vocab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const exerciseArea = mainContainer.querySelector('#vocab-exercise-area');
                if (exerciseArea.querySelector('p')) {
                    exerciseArea.innerHTML = '';
                    exerciseArea.classList.remove('flex', 'items-center', 'justify-center');
                }

                const mode = e.target.closest('.vocab-btn').dataset.mode;
                startExercise(mode);
            });
        });
    }

    function startExercise(mode) {
        const exerciseArea = mainContainer.querySelector('#vocab-exercise-area');

        // Pushes a new state to history if we're not already in an exercise state
        if (!isExerciseActive) {
            history.pushState({ vocabExercise: true }, "");
            isExerciseActive = true;
        }

        // Register the handler to return to the initial view for this instance
        exitExerciseHandler = () => {
            renderInitialView();
        };

        // Clear previous active state

        mainContainer.querySelectorAll('.vocab-btn').forEach(b => {
            b.classList.remove('bg-accent2-600', 'text-white');
            b.classList.add('bg-neutral-100');
        });

        // Highlight button if it exists
        const activeBtn = mainContainer.querySelector(`button[data-mode="${mode}"]`);
        if (activeBtn) {
            activeBtn.classList.remove('bg-neutral-100');
            activeBtn.classList.add('bg-accent2-600', 'text-white');
        }

        // Cleanup any existing timers or intervals from previous mode
        if (typeof window.__vocabModeCleanup === 'function') {
            try { window.__vocabModeCleanup(); } catch (_) { /* noop */ }
        }
        window.__vocabModeCleanup = undefined;

        // Context object for new modules
        const context = {
            vocabulary,
            knownWords,
            saveKnownWords: () => saveKnownWordsToStorage(knownWords),
            chapters: [chapterNumber], // Pass chapter as array for compatibility with gender.js
            substantivbank,
            verbbank,
            config, // Pass injected config for language-specific features (audio paths, etc.)
            isLessonMode: true, // Single lesson mode: no SSR filtering, exposure credit only
            onExit: () => {
                // If exiting normally (X button), remove the history state
                if (isExerciseActive) {
                    isExerciseActive = false;
                    history.back();
                }
                renderInitialView();
            },

            // V3.0 Integration
            adapter: dataAdapter,
            updateProgress: (wordId, q, m, options = false) => {
                if (dataAdapter) dataAdapter.updateProgress(wordId, q, m, options);
            },
            addPoints: (amount) => {
                if (dataAdapter) dataAdapter.addPoints(amount);
            },
            checkAndUpdateStreak: () => {
                if (dataAdapter) dataAdapter.checkAndUpdateStreak();
            }
        };

        if (mode === 'flashcards') {
            renderFlashcards(exerciseArea, context);
        } else if (mode === 'skriv') {
            renderSkriv(exerciseArea, context);
        } else if (mode === 'kombiner') {
            renderKombiner(exerciseArea, context);
        } else if (mode === 'substantiv-kjonn') {
            renderSubstantivKjonn(exerciseArea, context);
        }
        // verb-test and test modes are not available in single lesson view

        // Scroll to the exercise area so the user sees the content immediately
        setTimeout(() => {
            exerciseArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
}

/**
 * Setup vocabulary trainer for selected chapters
 * Matches original API: setupVocabTrainerMultiChapter(containerId, chapters)
 *
 * @param {string} containerId - ID of main container element
 * @param {Array} chapters - Array of chapter numbers (e.g., [1, 2, 3])
 */
export async function setupVocabTrainerMultiChapter(containerId, chapters, options = {}) {
    const mainContainer = document.getElementById(containerId);
    if (!mainContainer) {
        console.error(`Container with id "${containerId}" not found`);
        return;
    }

    // Load confetti library if not already loaded
    if (typeof confetti !== 'function') {
        const confettiScript = document.createElement('script');
        confettiScript.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js';
        document.head.appendChild(confettiScript);
    }

    // Get vocabulary for selected chapters
    const vocabulary = getMultiChapterVocabulary(chapters, { ordbank, verbbank, substantivbank, adjektivbank });

    if (vocabulary.length === 0) {
        // If we are in the specialized verb trainer column (allowedModes is empty), 
        // we want to allow initialization so the user can see the "Start" button 
        // and get a proper empty state message inside the test if needed.
        const isSpecializedMode = options.allowedModes && options.allowedModes.length === 0;

        if (!isSpecializedMode) {
            mainContainer.innerHTML = `<p class="text-neutral-500 text-center py-8">${vt('no_words_chapters')}</p>`;
            return;
        }
    }

    // Initialize known words
    const knownWords = await initializeKnownWords();

    /**
     * Render initial view with mode selection buttons
     */
    function renderInitialView() {
        const allModes = [
            { id: 'flashcards', labelKey: 'mode_flashcards' },
            { id: 'kombiner', labelKey: 'mode_combine' },
            { id: 'substantiv-kjonn', labelKey: 'mode_gender' },
            { id: 'skriv', labelKey: 'mode_write' },
            { id: 'verb-test', labelKey: 'mode_verb_test' }
        ];

        const allowedModes = options.allowedModes || allModes.map(m => m.id);
        const modesToRender = allModes.filter(m => allowedModes.includes(m.id));

        const buttonsHtml = modesToRender.map(mode =>
            `<button data-mode="${mode.id}" class="vocab-btn p-4 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors">${vt(mode.labelKey)}</button>`
        ).join('');

        // If no buttons are rendered (e.g. external control only), don't show the grid
        const gridHtml = buttonsHtml ?
            `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-bold text-center">
                ${buttonsHtml}
            </div>` : '';

        const placeholderText = options.placeholderText || vt('select_method');

        mainContainer.innerHTML = `
        ${gridHtml}

        <div id="vocab-exercise-area" class="mt-6 min-h-[350px] mb-4 flex items-center justify-center">
            <p class="text-neutral-500 text-center">${placeholderText}</p>
        </div>
    `;
        mainContainer.querySelectorAll('.vocab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const exerciseArea = mainContainer.querySelector('#vocab-exercise-area');
                if (exerciseArea.querySelector('p')) {
                    exerciseArea.innerHTML = '';
                    exerciseArea.classList.remove('flex', 'items-center', 'justify-center');
                }

                const mode = e.target.closest('.vocab-btn').dataset.mode;
                startExercise(mode);
            });
        });
    }

    /**
     * Start exercise mode
     * @param {string} mode - Mode name (flashcards, skriv, kombiner, substantiv-kjonn, test)
     */
    function startExercise(mode) {
        const exerciseArea = mainContainer.querySelector('#vocab-exercise-area');

        // Pushes a new state to history if we're not already in an exercise state
        if (!isExerciseActive) {
            history.pushState({ vocabExercise: true }, "");
            isExerciseActive = true;
        }

        // Register the handler to return to the initial view for this instance
        exitExerciseHandler = () => {
            renderInitialView();
            if (options.onExit) options.onExit();
        };

        // Clear previous active state

        mainContainer.querySelectorAll('.vocab-btn').forEach(b => {
            b.classList.remove('bg-accent2-600', 'text-white');
            b.classList.add('bg-neutral-100');
        });

        // Highlight button if it exists (it won't for 'test' anymore)
        const activeBtn = mainContainer.querySelector(`button[data-mode="${mode}"]`);
        if (activeBtn) {
            activeBtn.classList.remove('bg-neutral-100');
            activeBtn.classList.add('bg-accent2-600', 'text-white');
        }

        // Cleanup any existing timers or intervals from previous mode
        if (typeof window.__vocabModeCleanup === 'function') {
            try { window.__vocabModeCleanup(); } catch (_) { /* noop */ }
        }
        window.__vocabModeCleanup = undefined;

        // Context object for new modules
        const context = {
            vocabulary,
            knownWords,
            saveKnownWords: () => saveKnownWordsToStorage(knownWords),
            chapters,
            substantivbank,
            verbbank,
            config, // Pass injected config
            isLessonMode: false, // Multi-chapter mode: full SSR filtering and SM-2 credit
            onExit: () => {
                // If exiting normally (X button), remove the history state
                if (isExerciseActive) {
                    isExerciseActive = false;
                    history.back();
                }
                renderInitialView();
                if (options.onExit) options.onExit();
            },
            // V3.0 Integration
            adapter: dataAdapter,
            updateProgress: (wordId, q, m, options = false) => {
                if (dataAdapter) dataAdapter.updateProgress(wordId, q, m, options);
            },
            addPoints: (amount) => {
                if (dataAdapter) dataAdapter.addPoints(amount);
            },
            checkAndUpdateStreak: () => {
                if (dataAdapter) dataAdapter.checkAndUpdateStreak();
            }
        };

        if (mode === 'flashcards') {
            renderFlashcards(exerciseArea, context);
        } else if (mode === 'skriv') {
            renderSkriv(exerciseArea, context);
        } else if (mode === 'kombiner') {
            renderKombiner(exerciseArea, context);
        } else if (mode === 'substantiv-kjonn') {
            renderSubstantivKjonn(exerciseArea, context);
        } else if (mode === 'test') {
            // Use mainContainer for test mode to ensure fullscreen works correctly
            // (The test takes over the entire module area)
            renderTest(mainContainer, {
                ...context,
                savedState: options.savedState,
                testType: options.testType,
                glossaryTestCode: options.glossaryTestCode,
                expiresAt: options.expiresAt
            });
        } else if (mode === 'verb-test') {
            renderVerbTest(exerciseArea, {
                ...context,
                verbFilters: options.verbFilters,
                savedState: options.savedState
            });
        }

        // Scroll to the exercise area so the user sees the content immediately
        setTimeout(() => {
            exerciseArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }


    renderInitialView();

    // Return API for external control
    return {
        startMode: (mode) => {
            return startExercise(mode);
        }
    };
}

// Export individual components for flexibility
export {
    initializeKnownWords,
    saveKnownWordsToStorage,
    getMultiChapterVocabulary,
    getLessonVocabulary,
    renderFlashcards,
    renderSkriv,
    renderKombiner,
    renderSubstantivKjonn,
    renderTest,
    renderVerbTest
};
