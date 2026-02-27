/**
 * =================================================================
 * ANSWER REPORTS MODULE
 * =================================================================
 *
 * Handles student reports of answers they believe should be marked correct.
 * Reports are stored in localStorage and synced to Firestore periodically.
 */

import { loadData, saveData } from '../progress/index.js';

const REPORTS_KEY = 'answer-reports';

/**
 * Save a new answer report to localStorage
 * @param {Object} report - The report data
 * @returns {boolean} True if saved successfully
 */
export function saveAnswerReport(report) {
    try {
        const reports = loadData(REPORTS_KEY) || [];

        // Add timestamp if not present
        if (!report.timestamp) {
            report.timestamp = Date.now();
        }

        reports.push(report);
        saveData(REPORTS_KEY, reports);

        console.log('Answer report saved:', report);
        return true;
    } catch (error) {
        console.error('Failed to save answer report:', error);
        return false;
    }
}

/**
 * Get all pending reports from localStorage
 * @returns {Array} Array of report objects
 */
export function getPendingReports() {
    return loadData(REPORTS_KEY) || [];
}

/**
 * Clear all reports from localStorage (after successful sync)
 * @returns {boolean} True if cleared successfully
 */
export function clearReports() {
    try {
        saveData(REPORTS_KEY, []);
        return true;
    } catch (error) {
        console.error('Failed to clear reports:', error);
        return false;
    }
}

/**
 * Get count of pending reports
 * @returns {number} Number of pending reports
 */
export function getPendingReportsCount() {
    const reports = getPendingReports();
    return reports.length;
}

/**
 * Create a report object from answer data
 * @param {Object} params - Report parameters
 * @returns {Object} Formatted report object
 */
export function createReport({
    lessonId,
    exerciseType,
    questionType,
    prompt,
    userAnswer,
    correctAnswer,
    userGender = null,
    correctGender = null,
    wordType = null,
    existingSynonyms = [],
    studentComment,
    isNoun = false,
    isVerb = false
}) {
    return {
        timestamp: Date.now(),
        lessonId,
        exerciseType,
        questionType,
        prompt,
        userAnswer,
        correctAnswer,
        userGender,
        correctGender,
        wordType,
        existingSynonyms,
        studentComment,
        isNoun,
        isVerb,
        // Additional context
        userAgent: navigator.userAgent,
        url: window.location.href
    };
}
