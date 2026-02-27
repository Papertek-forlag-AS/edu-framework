/**
 * =================================================================
 * PAGE SOURCE MAP
 * =================================================================
 *
 * Maps pages to their relevant source files for AI-assisted debugging.
 * This enables AI to know exactly which files to examine when users
 * report issues from specific pages.
 */

/**
 * Static mapping of pages to their source files
 */
export const PAGE_SOURCE_MAP = {
    '/index.html': {
        description: 'Home page / Lesson list',
        mainFiles: [
            'js/main.js',
            'js/page-init.js',
            'js/progress/index.js',
            'js/progress/ui.js',
            'js/ui.js'
        ],
        components: ['lesson-cards', 'progress-display', 'navigation', 'continue-button']
    },

    '/glosetrener.html': {
        description: 'Vocabulary trainer (Ordtrener)',
        mainFiles: [
            'js/vocab-trainer-multi/index.js',
            'js/vocab-trainer-multi/write.js',
            'js/vocab-trainer-multi/flashcards.js',
            'js/vocab-trainer-multi/test.js',
            'js/vocab-trainer-multi/ui.js',
            'js/core/VocabProfileService.js'
        ],
        components: ['flashcard', 'write-input', 'test-question', 'progress-bar', 'lesson-selector']
    },

    '/grammatikk.html': {
        description: 'Grammar lessons',
        mainFiles: [
            'js/grammar-content-loader.js',
            'js/exercises.js',
            'js/exercises-content-loader.js'
        ],
        components: ['grammar-content', 'embedded-exercises', 'fill-in', 'matching-game']
    },

    '/repetisjon.html': {
        description: 'Review center',
        mainFiles: [
            'js/repetisjon.js',
            'js/vocab-trainer-multi/index.js'
        ],
        components: ['chapter-selector', 'test-launcher', 'review-options']
    },

    '/teacher-dashboard.html': {
        description: 'Teacher dashboard',
        mainFiles: [
            'js/teacher/dashboard.js',
            'js/teacher/class-management.js',
            'js/sync/cloud-sync.js'
        ],
        components: ['class-list', 'student-progress', 'insights', 'invite-link']
    },

    '/landeskunde.html': {
        description: 'Culture/civics content (Landeskunde)',
        mainFiles: [
            'js/ui.js'
        ],
        components: ['content-display', 'media-player', 'culture-sections']
    },

    '/min-progresjon.html': {
        description: 'My progress page',
        mainFiles: [
            'js/progress/index.js',
            'js/progress/ui.js',
            'js/progress/import-export.js'
        ],
        components: ['progress-chart', 'achievement-display', 'export-import']
    },

    '/uttale.html': {
        description: 'Pronunciation guide',
        mainFiles: [
            'js/ui.js',
            'js/audio/player.js'
        ],
        components: ['pronunciation-list', 'audio-player']
    },

    '/grammar-wordlist.html': {
        description: 'Grammar word list',
        mainFiles: [
            'js/grammar-wordlist.js'
        ],
        components: ['word-list', 'search', 'filters']
    }
};

/**
 * Dynamic component detection patterns
 * Used to identify which components are active on a page
 */
export const COMPONENT_PATTERNS = {
    'vocab-card': {
        selector: '.flashcard, .vocab-card, #flashcards-container',
        files: ['js/vocab-trainer-multi/flashcards.js']
    },
    'write-exercise': {
        selector: '#write-container, .write-input',
        files: ['js/vocab-trainer-multi/write.js']
    },
    'test-mode': {
        selector: '#test-container, .test-question',
        files: ['js/vocab-trainer-multi/test.js']
    },
    'gender-trainer': {
        selector: '#gender-trainer, .gender-exercise, [data-exercise-type="gender"]',
        files: ['js/exercises/embedded-gender-trainer.js']
    },
    'verb-trainer': {
        selector: '#verb-trainer, .verb-exercise, [data-exercise-type="verb"]',
        files: ['js/exercises/embedded-verb-trainer-v2.js']
    },
    'matching-game': {
        selector: '.matching-game, #matching-container, [data-exercise-type="matching"]',
        files: ['js/exercises/matching-game.js']
    },
    'fill-in-exercise': {
        selector: '.fill-in, .luketekst, [data-exercise-type="fill-in"]',
        files: ['js/exercises/fill-in.js']
    },
    'drag-drop': {
        selector: '.drag-drop-container, [data-exercise-type="drag-drop"]',
        files: ['js/exercises/drag-drop-sentences.js']
    },
    'audio-player': {
        selector: 'audio, .audio-control, .play-audio, [data-audio]',
        files: ['js/audio/player.js', 'js/audio/pronunciation.js']
    },
    'quiz': {
        selector: '.quiz-container, #quiz, [data-exercise-type="quiz"]',
        files: ['js/exercises/quiz.js']
    },
    'true-false': {
        selector: '.true-false-game, [data-exercise-type="true-false"]',
        files: ['js/exercises/true-false-game.js']
    },
    'image-matching': {
        selector: '.image-matching, [data-exercise-type="image-matching"]',
        files: ['js/exercises/image-matching-game.js']
    },
    'tabs': {
        selector: '.tab-buttons, [role="tablist"]',
        files: ['js/ui.js']
    },
    'modal': {
        selector: '.modal, [role="dialog"]',
        files: ['js/utils/dialog.js']
    },
    'report-modal': {
        selector: '#report-modal',
        files: ['js/utils/report-modal.js', 'js/utils/answer-reports.js']
    },
    'auth-ui': {
        selector: '#auth-container, .auth-button, #login-btn',
        files: ['js/auth/auth-ui.js', 'js/auth/firebase-client.js']
    },
    'sync-status': {
        selector: '#sync-status, .sync-indicator',
        files: ['js/sync/cloud-sync.js']
    }
};

/**
 * Get page info for a given pathname
 * @param {string} pathname - The page pathname
 * @returns {Object} Page info with description, mainFiles, and components
 */
export function getPageInfo(pathname) {
    // Normalize pathname
    const normalizedPath = pathname.endsWith('/') ? pathname + 'index.html' : pathname;

    // Direct match
    if (PAGE_SOURCE_MAP[normalizedPath]) {
        return PAGE_SOURCE_MAP[normalizedPath];
    }

    // Check for lesson pages (content/german/lessons/*)
    if (normalizedPath.includes('/content/') && normalizedPath.includes('/lessons/')) {
        return {
            description: 'Lesson page',
            mainFiles: [
                'js/page-init.js',
                'js/lessons-content-loader.js',
                'js/grammar-content-loader.js',
                'js/exercises-content-loader.js',
                'js/exercises.js',
                'js/ui.js',
                'js/vocab-trainer-multi/index.js'
            ],
            components: ['lesson-content', 'tabs', 'exercises', 'vocab-trainer']
        };
    }

    // Default for unknown pages
    return {
        description: 'Unknown page',
        mainFiles: ['js/main.js', 'js/page-init.js'],
        components: []
    };
}

/**
 * Detect active components on the current page
 * @returns {Array} Array of detected component objects
 */
export function detectActiveComponents() {
    const active = [];

    for (const [name, config] of Object.entries(COMPONENT_PATTERNS)) {
        try {
            if (document.querySelector(config.selector)) {
                active.push({
                    name: name,
                    files: config.files,
                    selector: config.selector
                });
            }
        } catch (e) {
            // Invalid selector, skip
            console.warn(`Invalid selector for component ${name}:`, config.selector);
        }
    }

    return active;
}

/**
 * Get all source files relevant to the current page
 * Combines static page mapping with dynamic component detection
 * @param {string} pathname - The page pathname
 * @returns {string[]} Array of relevant source file paths
 */
export function getRelevantSourceFiles(pathname) {
    const pageInfo = getPageInfo(pathname);
    const activeComponents = detectActiveComponents();

    // Combine and deduplicate
    const files = new Set([
        ...pageInfo.mainFiles,
        ...activeComponents.flatMap(c => c.files)
    ]);

    return Array.from(files);
}
