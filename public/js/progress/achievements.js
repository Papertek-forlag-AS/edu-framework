/**
 * =================================================================
 * ACHIEVEMENTS - Achievement tracking logic and gamification
 * =================================================================
 *
 * This module handles exercise completion tracking, achievement
 * counters, and celebration triggers.
 */

import { EXERCISE_DATABASE, REGULAR_EXERCISES_EVENT } from './config.js';
import { getLessonProgress, saveLessonProgress, getProgressData } from './store.js';
import { showStarCelebration, showPencilCelebration } from './celebrations.js';
import { announce } from '../accessibility.js';

// Cloud sync imports (only if authentication is available)
let syncExerciseToCloud = null;

if (typeof window !== 'undefined') {
    import('../sync/cloud-sync.js')
        .then(module => {
            syncExerciseToCloud = module.syncExerciseToCloud;
        })
        .catch(() => {
            // Cloud sync not available - app works in localStorage-only mode
            syncExerciseToCloud = null;
        });
}

/**
 * Henter CSS-fargeklasse basert på completion count
 * @param {number} count - Antall fullføringer (0 = ikke oppnådd)
 * @returns {string} CSS color class
 */
export function getAchievementColor(count) {
    if (count === 0) return 'text-neutral-300';      // Grå (ikke oppnådd)
    if (count === 1) return 'text-success-500';      // Grønn (1. gang)
    if (count === 2) return 'text-info-600';       // Blå (2. gang)
    if (count === 3) return 'text-error-600';        // Rubin/Red (3. gang)
    return 'text-primary-500';                        // Gull (4+ ganger) - more saturated gold
}

/**
 * Kaller logProgress når en øvelse er fullført med 100% riktig.
 * @param {string} exerciseId - Den unike ID-en til øvelsescontaineren.
 */
export function trackExerciseCompletion(exerciseId) {
    const lessonId = document.body.dataset.chapterId;
    if (!lessonId) return;

    const lessonProgress = getLessonProgress(lessonId);

    // Sjekk om øvelsen allerede er fullført
    if (lessonProgress.exercises[exerciseId] === true) {
        return;
    }

    // Marker øvelsen som fullført
    lessonProgress.exercises[exerciseId] = true;

    // Sync to cloud if logged in (non-blocking)
    if (syncExerciseToCloud) {
        syncExerciseToCloud(exerciseId, lessonId).catch(error => {
            console.warn('Cloud sync failed (non-critical):', error);
        });
    }

    // Show completion icon immediately (with 2s delay)
    // This will be handled by icons.js via event or direct call
    if (typeof document !== 'undefined') {
        document.dispatchEvent(new CustomEvent('exercise-completed', {
            detail: { exerciseId }
        }));
    }

    // Announce completion to screen readers
    announce('Øvelse fullført! Bra jobbet!', 'polite');

    // Tell hvor mange øvelser som er fullførte
    const completedExerciseIds = Object.keys(lessonProgress.exercises).filter(id => lessonProgress.exercises[id] === true);

    if (exerciseId.includes('extra-exercise')) {
        // Håndter ekstraøvelse
        const exerciseData = EXERCISE_DATABASE[lessonId] || { extraExercises: 0 };
        const requiredExtra = exerciseData.extraExercises;
        const completedExtra = completedExerciseIds.filter(ex => ex.includes('extra-exercise')).length;

        if (requiredExtra > 0 && completedExtra === requiredExtra) {
            // Alle ekstraøvelser fullført - inkrementer achievement og vis feiring
            const currentCount = lessonProgress.achievements.extraExercises || 0;
            const displayLevel = currentCount + 1;

            // INCREMENT THE ACHIEVEMENT COUNTER!
            lessonProgress.achievements.extraExercises = displayLevel;

            if (!lessonProgress.achievements.earnedDate) {
                lessonProgress.achievements.earnedDate = new Date().toISOString().split('T')[0];
            }

            console.log(`⭐ Star achievement earned! Lesson ${lessonId}, completion #${displayLevel} (counter incremented: ${currentCount} → ${displayLevel})`);

            // Save progress WITH incremented counter
            saveLessonProgress(lessonId, lessonProgress);

            // Show celebration modal with display level
            showStarCelebration(lessonId, displayLevel).catch(err => {
                console.error('Error showing star celebration:', err);
            });
            announce(`Gratulerer! Du har fullført alle ekstraøvelsene i leksjon ${lessonId} for ${displayLevel}. gang!`, 'assertive');
            return;
        }

        saveLessonProgress(lessonId, lessonProgress);
        return;
    }

    // Håndter vanlige øvelser
    const exerciseData = EXERCISE_DATABASE[lessonId] || { exercises: 0, extraExercises: 0 };
    const requiredRegular = exerciseData.exercises || 0;
    const hasExtraTab = (exerciseData.extraExercises || 0) > 0;
    const completedRegular = completedExerciseIds.filter(ex => !ex.includes('extra-exercise')).length;

    if (requiredRegular === 0) {
        saveLessonProgress(lessonId, lessonProgress);
        if (hasExtraTab && typeof document !== 'undefined') {
            document.dispatchEvent(new CustomEvent(REGULAR_EXERCISES_EVENT, {
                detail: {
                    lessonId,
                    isComplete: true,
                    completed: completedRegular,
                    required: requiredRegular
                }
            }));
        }
        return;
    }

    if (completedRegular === requiredRegular) {
        // Alle vanlige øvelser fullført - inkrementer achievement og vis feiring
        const currentCount = lessonProgress.achievements.exercises || 0;
        const displayLevel = currentCount + 1;

        // INCREMENT THE ACHIEVEMENT COUNTER!
        lessonProgress.achievements.exercises = displayLevel;

        if (!lessonProgress.achievements.earnedDate) {
            lessonProgress.achievements.earnedDate = new Date().toISOString().split('T')[0];
        }

        console.log(`✏️ Pencil achievement earned! Lesson ${lessonId}, completion #${displayLevel} (counter incremented: ${currentCount} → ${displayLevel})`);

        // Save progress BEFORE dispatching event so UI reads correct state
        saveLessonProgress(lessonId, lessonProgress);

        if (hasExtraTab && typeof document !== 'undefined') {
            console.log(`🔓 Unlocking ekstraøvelser tab for lesson ${lessonId}`);
            document.dispatchEvent(new CustomEvent(REGULAR_EXERCISES_EVENT, {
                detail: {
                    lessonId,
                    isComplete: true,
                    completed: completedRegular,
                    required: requiredRegular
                }
            }));
        }

        showPencilCelebration(lessonId, displayLevel).catch(err => {
            console.error('Error showing pencil celebration:', err);
        });

        return;
    }

    saveLessonProgress(lessonId, lessonProgress);
}

/**
 * Fjerner øvelse-fullføring (for teacher mode eller reset)
 * @param {string} exerciseId - Øvelses-ID
 */
export function removeExerciseCompletion(exerciseId) {
    const lessonId = document.body.dataset.chapterId;
    if (!lessonId) return;

    const lessonProgress = getLessonProgress(lessonId);

    // Fjern øvelsen hvis den eksisterer
    if (lessonProgress.exercises[exerciseId]) {
        lessonProgress.exercises[exerciseId] = false;

        // Hide completion icon immediately
        if (typeof document !== 'undefined') {
            document.dispatchEvent(new CustomEvent('exercise-removed', {
                detail: { exerciseId }
            }));
        }

        // Tell hvor mange øvelser som er fullførte nå
        const completedExerciseIds = Object.keys(lessonProgress.exercises).filter(id => lessonProgress.exercises[id] === true);

        if (!exerciseId.includes('extra-exercise')) {
            // Sjekk om vi må fjerne achievement for vanlige øvelser
            const exerciseData = EXERCISE_DATABASE[lessonId] || { exercises: 0, extraExercises: 0 };
            const requiredRegular = exerciseData.exercises || 0;
            const hasExtraTab = (exerciseData.extraExercises || 0) > 0;
            const completedRegular = completedExerciseIds.filter(ex => !ex.includes('extra-exercise')).length;

            // ACHIEVEMENT PRESERVATION LOGIC (intentional design):
            // - Achievements only decrement when ALL exercises are reset to false
            // - Resetting a single exercise for practice does NOT lose the achievement
            // - This encourages practice without fear of losing earned achievements
            // - To fully "start over", the user must reset every exercise in the lesson
            const allExercisesFalse = completedRegular === 0;

            if (completedRegular < requiredRegular && lessonProgress.achievements.exercises > 0 && allExercisesFalse) {
                // Only decrement if no exercises are completed (true reset, not active practice)
                lessonProgress.achievements.exercises = Math.max(0, lessonProgress.achievements.exercises - 1);
                console.log(`⬇️ Decremented exercises achievement: ${lessonProgress.achievements.exercises + 1} → ${lessonProgress.achievements.exercises}`);
            } else if (completedRegular < requiredRegular && !allExercisesFalse) {
                console.log(`⏭️ Preserving achievement during active practice (${completedRegular}/${requiredRegular} complete)`);
            }

            if (requiredRegular > 0 && hasExtraTab && typeof document !== 'undefined') {
                if (completedRegular < requiredRegular) {
                    document.dispatchEvent(new CustomEvent(REGULAR_EXERCISES_EVENT, {
                        detail: {
                            lessonId,
                            isComplete: false,
                            completed: completedRegular,
                            required: requiredRegular
                        }
                    }));
                }
            }
        } else {
            // Sjekk om vi må fjerne achievement for ekstraøvelser
            const exerciseData = EXERCISE_DATABASE[lessonId] || { extraExercises: 0 };
            const requiredExtra = exerciseData.extraExercises;
            const completedExtra = completedExerciseIds.filter(ex => ex.includes('extra-exercise')).length;

            // Same achievement preservation logic as regular exercises (see comments above)
            const allExtraExercisesFalse = completedExtra === 0;

            if (completedExtra < requiredExtra && lessonProgress.achievements.extraExercises > 0 && allExtraExercisesFalse) {
                // Only decrement if no extra exercises are completed (true reset, not active practice)
                lessonProgress.achievements.extraExercises = Math.max(0, lessonProgress.achievements.extraExercises - 1);
                console.log(`⬇️ Decremented extraExercises achievement: ${lessonProgress.achievements.extraExercises + 1} → ${lessonProgress.achievements.extraExercises}`);
            } else if (completedExtra < requiredExtra && !allExtraExercisesFalse) {
                console.log(`⏭️ Preserving extraExercises achievement during active practice (${completedExtra}/${requiredExtra} complete)`);
            }
        }

        saveLessonProgress(lessonId, lessonProgress);
    }

    // Refresh the progress display in the UI (event-based to avoid circular dependency)
    if (typeof document !== 'undefined') {
        document.dispatchEvent(new CustomEvent('progress-updated', {
            detail: { lessonId, type: 'exercise-removed' }
        }));
    }
}

/**
 * Checks if all lessons in a set of chapters are completed with required achievements.
 * Config-driven: reads milestone requirements from curriculum registry.
 *
 * @param {number[]} chapters - Array of chapter numbers to check (e.g., [1, 2, 3, 4])
 * @param {number} lessonsPerChapter - Number of lessons per chapter (default 3)
 * @returns {boolean} True if all lessons have required achievements
 */
export function areChaptersCompleted(chapters, lessonsPerChapter = 3) {
    const progress = getProgressData();

    // Build required lesson IDs from chapters array
    const requiredLessons = [];
    for (const ch of chapters) {
        for (let lesson = 1; lesson <= lessonsPerChapter; lesson++) {
            requiredLessons.push(`${ch}-${lesson}`);
        }
    }

    for (const lessonId of requiredLessons) {
        const lessonProgress = progress[lessonId];
        const exerciseData = EXERCISE_DATABASE[lessonId] || { exercises: 0, extraExercises: 0, tests: [] };

        // Hvis leksjonen ikke eksisterer, er den ikke fullført
        if (!lessonProgress) return false;

        const achievements = lessonProgress.achievements || { leksjon: false, exercises: 0, extraExercises: 0 };

        // Check green book (achievement.leksjon)
        if (!achievements.leksjon) return false;

        // Check green pencil (achievement.exercises) - should have at least 1 completion
        const exercisesCount = typeof achievements.exercises === 'boolean' ? (achievements.exercises ? 1 : 0) : (achievements.exercises || 0);
        if (exercisesCount === 0) return false;

        // Check yellow star (achievement.extraExercises where applicable) - should have at least 1 completion
        const hasExtraTab = exerciseData.extraExercises > 0;
        const extraCount = typeof achievements.extraExercises === 'boolean' ? (achievements.extraExercises ? 1 : 0) : (achievements.extraExercises || 0);
        if (hasExtraTab && extraCount === 0) return false;

        // Check green scheme (all tests completed)
        const completedTests = lessonProgress.tests || [];
        const testsCompleted = exerciseData.tests.every(testType =>
            completedTests.some(test => test.type === testType)
        );
        if (!testsCompleted) return false;
    }

    return true;
}

/**
 * Backward-compatible wrapper: checks if chapters 1-4 are completed.
 * @deprecated Use areChaptersCompleted([1,2,3,4]) instead
 * @returns {boolean}
 */
export function areChapters1To4Completed() {
    return areChaptersCompleted([1, 2, 3, 4], 3);
}
