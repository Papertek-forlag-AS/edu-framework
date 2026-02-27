/**
 * =================================================================
 * CONTEXT COLLECTOR MODULE
 * =================================================================
 *
 * Collects comprehensive context for feedback reports.
 * Gathers page info, user state, device info, errors, and source mappings.
 */

import { getPageInfo, detectActiveComponents, getRelevantSourceFiles } from './page-source-map.js';
import { getCapturedErrors, getRecentErrors } from './error-capture.js';
import { isAuthAvailable, getCurrentUser } from '../auth/firebase-client.js';
import { getActiveCurriculum } from '../progress/index.js';

/**
 * Collect comprehensive context for a feedback report
 * @returns {Object} Context object with all relevant information
 */
export function collectFeedbackContext() {
    const pathname = window.location.pathname;
    const pageInfo = getPageInfo(pathname);
    const activeComponents = detectActiveComponents();

    // Get user state
    let user = null;
    try {
        user = isAuthAvailable() ? getCurrentUser() : null;
    } catch (e) {
        // Auth not available
    }

    // Get curriculum
    let curriculum = 'unknown';
    try {
        curriculum = getActiveCurriculum() || 'unknown';
    } catch (e) {
        // Progress module not available
    }

    return {
        // Page info
        url: window.location.href,
        pathname: pathname,
        hash: window.location.hash,
        pageTitle: document.title,
        pageDescription: pageInfo.description,

        // Source mapping for AI
        sourceFiles: getRelevantSourceFiles(pathname),
        componentStack: activeComponents.map(c => c.name),
        activeComponentDetails: activeComponents,

        // User state
        isLoggedIn: !!user,
        userId: user?.uid || null,
        curriculum: curriculum,
        currentLesson: getCurrentLessonFromURL(),

        // Device info
        viewport: {
            width: window.innerWidth,
            height: window.innerHeight
        },
        screenSize: {
            width: window.screen?.width || null,
            height: window.screen?.height || null
        },
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        languages: navigator.languages ? [...navigator.languages] : [navigator.language],
        cookiesEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,

        // DOM state
        visibleText: getVisibleTextSummary(),
        activeElement: describeElement(document.activeElement),
        scrollPosition: {
            x: Math.round(window.scrollX),
            y: Math.round(window.scrollY)
        },
        documentHeight: document.documentElement.scrollHeight,

        // Errors (last 5 minutes)
        consoleErrors: getRecentErrors(5),
        totalErrorCount: getCapturedErrors().length,

        // Performance
        loadTime: getPageLoadTime(),
        memoryUsage: getMemoryUsage(),

        // Timestamp
        collectedAt: Date.now()
    };
}

/**
 * Extract lesson ID from URL if present
 * @returns {string|null} Lesson ID or null
 */
function getCurrentLessonFromURL() {
    // Check URL parameters
    const params = new URLSearchParams(window.location.search);
    const lessonParam = params.get('leksjon') || params.get('lesson') || params.get('kapittel');
    if (lessonParam) return lessonParam;

    // Check body data attribute
    const chapterId = document.body?.dataset?.chapterId;
    if (chapterId) return chapterId;

    // Check URL path for lesson pattern
    const pathMatch = window.location.pathname.match(/(\d+-\d+)/);
    if (pathMatch) return pathMatch[1];

    return null;
}

/**
 * Get summary of visible text (for context, truncated)
 * @param {number} maxLength - Maximum text length
 * @returns {string} Truncated visible text
 */
function getVisibleTextSummary(maxLength = 500) {
    try {
        // Try main content first
        const main = document.querySelector('main') ||
                     document.querySelector('[role="main"]') ||
                     document.querySelector('.main-content') ||
                     document.body;

        const text = main.innerText || '';

        // Clean up whitespace and truncate
        const cleaned = text
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, maxLength);

        return cleaned + (text.length > maxLength ? '...' : '');
    } catch (e) {
        return '';
    }
}

/**
 * Describe an element for debugging (tag, id, classes)
 * @param {Element|null} el - The element to describe
 * @returns {string} Element description
 */
function describeElement(el) {
    if (!el || el === document.body) return 'body';

    try {
        const tag = el.tagName?.toLowerCase() || 'unknown';
        const id = el.id ? `#${el.id}` : '';
        const classes = el.className && typeof el.className === 'string'
            ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.')
            : '';

        const description = `${tag}${id}${classes}`;
        return description.slice(0, 100);
    } catch (e) {
        return 'unknown';
    }
}

/**
 * Get page load time from Performance API
 * @returns {number|null} Load time in ms or null
 */
function getPageLoadTime() {
    try {
        const entries = performance.getEntriesByType('navigation');
        if (entries && entries.length > 0) {
            const perf = entries[0];
            return Math.round(perf.loadEventEnd - perf.startTime);
        }

        // Fallback for older browsers
        if (performance.timing) {
            const timing = performance.timing;
            return timing.loadEventEnd - timing.navigationStart;
        }

        return null;
    } catch (e) {
        return null;
    }
}

/**
 * Get memory usage if available (Chrome only)
 * @returns {number|null} Memory usage in bytes or null
 */
function getMemoryUsage() {
    try {
        // @ts-ignore - Chrome-specific API
        return performance.memory?.usedJSHeapSize || null;
    } catch (e) {
        return null;
    }
}

/**
 * Collect minimal context (for privacy-conscious users)
 * @returns {Object} Minimal context object
 */
export function collectMinimalContext() {
    return {
        url: window.location.href,
        pathname: window.location.pathname,
        pageTitle: document.title,
        viewport: {
            width: window.innerWidth,
            height: window.innerHeight
        },
        collectedAt: Date.now()
    };
}

/**
 * Get a human-readable summary of the context
 * @param {Object} context - The context object
 * @returns {string} Human-readable summary
 */
export function getContextSummary(context) {
    const parts = [];

    if (context.pageDescription) {
        parts.push(`Page: ${context.pageDescription}`);
    }

    if (context.currentLesson) {
        parts.push(`Lesson: ${context.currentLesson}`);
    }

    if (context.componentStack?.length > 0) {
        parts.push(`Components: ${context.componentStack.join(', ')}`);
    }

    if (context.consoleErrors?.length > 0) {
        parts.push(`Errors: ${context.consoleErrors.length} recent`);
    }

    const device = context.viewport
        ? `${context.viewport.width}x${context.viewport.height}`
        : 'unknown';
    parts.push(`Device: ${device}`);

    return parts.join(' | ');
}
