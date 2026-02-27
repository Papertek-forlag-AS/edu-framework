/**
 * =================================================================
 * PROGRESS INDEX - Public API Aggregator
 * =================================================================
 *
 * This module re-exports all public functions from the progress
 * tracking system. It serves as the single entry point and barrel
 * export for the modular progress system.
 *
 * Import this file instead of individual modules to get the full API.
 */

// Config exports (constants)
export { EXERCISE_DATABASE, REGULAR_EXERCISES_EVENT, CURRICULUM_CONFIG } from './config.js';

// Store exports (core data access)
export {
    saveData,
    loadData,
    getProgressData,
    logProgress,
    getLessonProgress,
    saveLessonProgress,
    setActiveCurriculum
} from './store.js';

// Curriculum exports
export {
    getActiveCurriculum,
    getCurrentCurriculum,
    getCurriculumConfig,
    switchCurriculum,
    setupCurriculumSelector,
    updateLessonLinks
} from './curriculum.js';

// Test tracking exports
export { trackTestCompletion, logVocabTestResult } from './tests.js';

// Repair exports
export { repairAchievementMismatch } from './repair.js';

// Achievement exports
export {
    trackExerciseCompletion,
    removeExerciseCompletion,
    areChaptersCompleted,
    areChapters1To4Completed
} from './achievements.js';

// Icon exports
export { renderExerciseCompletionIcons } from './icons.js';

// Reset exports
export {
    resetChapterExercises,
    setupChapterResetButtons,
    renderChapterResetButtons
} from './reset.js';

// UI exports
export {
    renderAllLessonProgress,
    setupContinueButton,
    setupProgressPage,
    renderLessonList
} from './ui.js';

// ProgressHub exports (unified event bus for real-time UI sync)
export { progressHub, computeProgressSnapshot } from './progress-hub.js';

// TotalProgressBar widget
export { mountProgressBar } from './total-progress-bar.js';

// Import/Export exports
export { setupImportExport } from './import-export.js';

// Migration exports
export {
    migrateProgressData,
    runMigrationIfNeeded,
    getMigrationStatus
} from './migration.js';

// Note: The following functions are NOT exported because they are internal:
// - getFullProgressData, saveFullProgressData (from store.js)
// - getLessonProgress, saveLessonProgress (from store.js)
// - getAchievementColor (from achievements.js) - now used internally by icons and ui
// - showStarCelebration, showPencilCelebration (from celebrations.js)
// - exportProgress, importProgress (from import-export.js) - only setupImportExport is public
