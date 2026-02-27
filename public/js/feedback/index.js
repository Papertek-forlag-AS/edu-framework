/**
 * =================================================================
 * FEEDBACK MODULE - Public API
 * =================================================================
 *
 * Entry point for the general feedback system.
 * Provides a floating widget for users to report issues from anywhere.
 */

// Core feedback functionality
export {
    saveFeedbackReport,
    createFeedbackReport,
    getPendingFeedback,
    clearFeedback,
    getPendingFeedbackCount,
    FEEDBACK_TYPES,
    SEVERITY_LEVELS
} from './feedback-reports.js';

// Context collection
export {
    collectFeedbackContext,
    collectMinimalContext,
    getContextSummary
} from './context-collector.js';

// Error capture
export {
    startErrorCapture,
    stopErrorCapture,
    getCapturedErrors,
    getRecentErrors,
    clearCapturedErrors,
    isErrorCaptureActive
} from './error-capture.js';

// Page source mapping
export {
    PAGE_SOURCE_MAP,
    COMPONENT_PATTERNS,
    getPageInfo,
    detectActiveComponents,
    getRelevantSourceFiles
} from './page-source-map.js';

// Widget UI
export {
    initFeedbackWidget,
    openFeedbackModal,
    destroyFeedbackWidget,
    isFeedbackModalOpen
} from './feedback-widget.js';

/**
 * Initialize the complete feedback system
 * Call this early in app initialization
 */
export function initFeedbackSystem() {
    // Import and start error capture
    import('./error-capture.js').then(({ startErrorCapture }) => {
        startErrorCapture();
    });

    // Initialize the floating widget
    import('./feedback-widget.js').then(({ initFeedbackWidget }) => {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initFeedbackWidget);
        } else {
            initFeedbackWidget();
        }
    });

    console.log('[Feedback] System initialized');
}
