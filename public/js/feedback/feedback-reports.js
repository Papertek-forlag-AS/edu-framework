/**
 * =================================================================
 * GENERAL FEEDBACK REPORTS MODULE
 * =================================================================
 *
 * Handles user feedback reports for issues anywhere in the webapp.
 * Reports are stored in localStorage and synced to Firestore periodically.
 *
 * Similar pattern to answer-reports.js but for general feedback.
 */

import { loadData, saveData } from '../progress/index.js';

const FEEDBACK_KEY = 'general-feedback';

/**
 * Feedback types
 */
export const FEEDBACK_TYPES = {
    BUG: 'bug',
    CONTENT: 'content',
    SUGGESTION: 'suggestion',
    ACCESSIBILITY: 'accessibility',
    OTHER: 'other'
};

/**
 * Severity levels
 */
export const SEVERITY_LEVELS = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high'
};

/**
 * Save a new feedback report to localStorage
 * @param {Object} feedback - The feedback data
 * @returns {boolean} True if saved successfully
 */
export function saveFeedbackReport(feedback) {
    try {
        const reports = loadData(FEEDBACK_KEY) || [];

        // Add timestamp if not present
        if (!feedback.timestamp) {
            feedback.timestamp = Date.now();
        }

        reports.push(feedback);
        saveData(FEEDBACK_KEY, reports);

        console.log('Feedback report saved:', feedback);
        return true;
    } catch (error) {
        console.error('Failed to save feedback report:', error);
        return false;
    }
}

/**
 * Get all pending feedback reports from localStorage
 * @returns {Array} Array of feedback objects
 */
export function getPendingFeedback() {
    return loadData(FEEDBACK_KEY) || [];
}

/**
 * Clear all feedback reports from localStorage (after successful sync)
 * @returns {boolean} True if cleared successfully
 */
export function clearFeedback() {
    try {
        saveData(FEEDBACK_KEY, []);
        return true;
    } catch (error) {
        console.error('Failed to clear feedback:', error);
        return false;
    }
}

/**
 * Get count of pending feedback reports
 * @returns {number} Number of pending reports
 */
export function getPendingFeedbackCount() {
    const reports = getPendingFeedback();
    return reports.length;
}

/**
 * Create a feedback report object
 * @param {Object} params - Feedback parameters
 * @returns {Object} Formatted feedback object
 */
export function createFeedbackReport({
    type = FEEDBACK_TYPES.OTHER,
    severity = SEVERITY_LEVELS.MEDIUM,
    userComment,
    context = {},
    includesTechnicalInfo = true
}) {
    return {
        timestamp: Date.now(),
        type,
        severity,
        userComment,
        context: includesTechnicalInfo ? context : {
            // Minimal context if user opts out of technical info
            url: context.url,
            pathname: context.pathname,
            pageTitle: context.pageTitle
        },
        includesTechnicalInfo,
        // AI metadata (to be enriched)
        aiContext: {
            suggestedFiles: context.sourceFiles || [],
            category: type,
            confidence: 1.0
        }
    };
}

/**
 * Delete a specific feedback report by index
 * @param {number} index - Index of the report to delete
 * @returns {boolean} True if deleted successfully
 */
export function deleteFeedbackReport(index) {
    try {
        const reports = loadData(FEEDBACK_KEY) || [];
        if (index >= 0 && index < reports.length) {
            reports.splice(index, 1);
            saveData(FEEDBACK_KEY, reports);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Failed to delete feedback report:', error);
        return false;
    }
}
