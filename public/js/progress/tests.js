/**
 * =================================================================
 * TESTS - Test completion tracking
 * =================================================================
 *
 * This module handles tracking of lesson tests, chapter tests,
 * and vocabulary test results. Includes optional cloud sync.
 */

import { logProgress, saveData, loadData } from './store.js';

// Cloud sync imports (only if authentication is available)
let syncTestToCloud = null;
let syncVocabTestResultToCloud = null;

if (typeof window !== 'undefined') {
    import('../sync/cloud-sync.js')
        .then(module => {
            syncTestToCloud = module.syncTestToCloud;
            syncVocabTestResultToCloud = module.syncVocabTestResultToCloud;
        })
        .catch(() => {
            // Cloud sync not available - app works in localStorage-only mode
            syncTestToCloud = null;
            syncVocabTestResultToCloud = null;
        });
}

/**
 * Tracker at en test er fullført
 * @param {string} testType - Type test ('leksjon', 'kapittel', 'kumulativ')
 * @param {string} lessonId - Leksjons-ID
 * @param {number} score - Antall riktige svar
 * @param {number} totalQuestions - Totalt antall spørsmål
 */
export function trackTestCompletion(testType, lessonId, score, totalQuestions) {
    if (!lessonId) return;
    const result = {
        type: testType,
        score: score,
        total: totalQuestions,
        timestamp: new Date().toISOString()
    };
    logProgress(lessonId, 'tests', result);

    // Sync to cloud if logged in (non-blocking)
    if (syncTestToCloud) {
        syncTestToCloud(lessonId, testType, score, totalQuestions).catch(error => {
            console.warn('Cloud sync failed (non-critical):', error);
        });
    }
}

/**
 * Logs vocabulary test results to local storage and syncs to cloud
 * Saves to new multi-curriculum structure (progressData.vocabTestHistory)
 * Also maintains old format for backwards compatibility
 * @param {object} result - Test result object with score, total, timestamp, etc.
 */
export function logVocabTestResult(result) {
    // Save to new multi-curriculum structure
    const progressData = loadData('progressData');
    if (progressData) {
        if (!progressData.vocabTestHistory) {
            progressData.vocabTestHistory = [];
        }
        progressData.vocabTestHistory.push(result);
        saveData('progressData', progressData);
    }

    // Also save to old format for backwards compatibility
    const history = loadData('vocab-test-history') || [];
    history.push(result);
    saveData('vocab-test-history', history);

    // Also update the "last result" for backward compatibility
    saveData('vocab-test-results', result);

    // Sync to cloud if logged in (non-blocking)
    if (syncVocabTestResultToCloud) {
        syncVocabTestResultToCloud(result).catch(error => {
            console.warn('Cloud sync failed (non-critical):', error);
        });
    }
}
