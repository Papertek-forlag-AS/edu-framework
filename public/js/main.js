/**
 * Main Application Entry Point
 * Acts as a router that delegates initialization to specialized modules.
 *
 * Refactored from ~750 lines to ~60 lines
 */

import { runMigrationIfNeeded } from './progress/index.js';
import { debug as logDebug } from './logger.js';

// Page initialization modules
import {
    initHomePage,
    initLessonPage,
    initProgressPage,
    initTestPage,
    initProjectPages,
    initCommonExercises,
    detectPageType
} from './page-init.js';

// Service worker management
import {
    registerServiceWorker,
    checkAndShowReleaseNotes,
    SW_VERSION
} from './utils/service-worker-manager.js';

// Debug utilities (exposed to window for console access)
import { initDebugUtils } from './utils/debug-utils.js';

// Environment indicator (shows DEV/STAGING badge in non-production)
import './utils/environment-indicator.js';

// User feedback system
import { initFeedbackSystem } from './feedback/index.js';

logDebug('🚀 main.js loaded');

// Initialize feedback system early (captures errors from the start)
initFeedbackSystem();

// Module scripts are deferred, so DOMContentLoaded may have already fired
async function initApp() {
    // Run migration before anything else
    await runMigrationIfNeeded();

    // Detect page type and initialize accordingly
    const pageType = detectPageType();
    logDebug(`📄 Page type detected: ${pageType}`);

    switch (pageType) {
        case 'home':
            await initHomePage();
            break;

        case 'lesson':
            await initLessonPage();
            break;

        case 'progress':
            initProgressPage();
            break;

        case 'test':
            initTestPage();
            break;

        case 'project':
            initProjectPages();
            break;
    }

    // Initialize common exercises that may appear on any page
    initCommonExercises();

    // Check and show release notes
    checkAndShowReleaseNotes(SW_VERSION);

    // Register service worker
    registerServiceWorker();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initApp());
} else {
    initApp();
}

// Initialize debug utilities (exposed to window object for console access)
initDebugUtils();
