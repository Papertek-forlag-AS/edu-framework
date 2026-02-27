/**
 * =================================================================
 * RESET - Chapter exercise reset functionality
 * =================================================================
 *
 * This module handles resetting all exercises in a chapter while
 * preserving achievement counters and incrementing them on reset.
 */

import { EXERCISE_DATABASE } from './config.js';
import { getProgressData, getFullProgressData, saveFullProgressData, getActiveCurriculum } from './store.js';
import { showConfirmModal, showAlertModal } from '../modals.js';
import { clearLessonExercises } from '../exercises/storage-utils.js';

/**
 * Nullstiller alle øvelser i et kapittel (3 leksjoner) mens achievements bevares
 * @param {number} chapterNumber - Kapittelnummer (1, 2, 3, osv.)
 * @returns {boolean} True hvis nullstilling lyktes, false hvis ikke
 */
export function resetChapterExercises(chapterNumber) {
    const progressData = getProgressData();

    // Finn alle 3 leksjoner i kapittelet
    const lessonIds = [
        `${chapterNumber}-1`,
        `${chapterNumber}-2`,
        `${chapterNumber}-3`
    ];

    let anyExercisesReset = false;

    // For hver leksjon i kapittelet
    lessonIds.forEach(lessonId => {
        const lessonProgress = progressData[lessonId];

        if (!lessonProgress) return;

        const achievements = lessonProgress.achievements || { leksjon: false, ovelser: 0, ekstraovelser: 0 };
        const exerciseConfig = EXERCISE_DATABASE[lessonId];

        if (!exerciseConfig) return;

        // ACHIEVEMENT NOTE: We do NOT increment achievement counters here!
        // Achievements are managed ONLY by achievements.js when exercises are actually completed.
        // Reset simply marks exercises as false so they can be redone for practice.
        // When a student re-completes all exercises after a reset, achievements.js will
        // increment the counter (e.g., green → blue → red → gold progression).

        // Nullstill alle øvelser til false
        if (lessonProgress.exercises && Object.keys(lessonProgress.exercises).length > 0) {
            const curriculum = getActiveCurriculum();

            // Clear ALL localStorage keys for this lesson using the centralized utility
            const clearedCount = clearLessonExercises(curriculum, lessonId);
            console.log(`🧹 Cleared ${clearedCount} exercise state keys for lesson ${lessonId}`);

            // Reset all exercise completion flags to false
            Object.keys(lessonProgress.exercises).forEach(exerciseId => {
                lessonProgress.exercises[exerciseId] = false;
            });

            anyExercisesReset = true;
        }

        // Oppdater leksjonsprogresjon
        const fullData = getFullProgressData();
        const curriculum = getActiveCurriculum();
        fullData.progressByCurriculum[curriculum][lessonId] = lessonProgress;
        saveFullProgressData(fullData);
    });

    return anyExercisesReset;
}

/**
 * Viser eller skjuler nullstillingsknapper for kapitler basert på achievements
 * Kalles fra renderAllLessonProgress() for å oppdatere UI
 */
export function renderChapterResetButtons() {
    const progressData = getProgressData();

    // For hvert kapittel (1-12)
    for (let chapterNum = 1; chapterNum <= 12; chapterNum++) {
        const container = document.getElementById(`reset-chapter-${chapterNum}-container`);

        if (!container) continue; // Hopp over hvis containeren ikke finnes

        // Sjekk om ALLE regular exercises i kapittelet er fullført
        const lessonIds = [
            `${chapterNum}-1`,
            `${chapterNum}-2`,
            `${chapterNum}-3`
        ];

        let allRegularExercisesCompleted = true;
        let hasAnyLessons = false;

        lessonIds.forEach(lessonId => {
            const lessonProgress = progressData[lessonId];
            const exerciseConfig = EXERCISE_DATABASE[lessonId];

            // Hvis leksjonen ikke finnes i EXERCISE_DATABASE, hopp over
            if (!exerciseConfig) return;

            hasAnyLessons = true;

            // Sjekk om leksjonen har regular exercises
            const regularExerciseCount = exerciseConfig.ovelser || 0;

            // Hvis leksjonen har regular exercises, sjekk om alle er fullført
            if (regularExerciseCount > 0) {
                // Count ACTUAL completed exercises, not just the achievement
                const exercises = lessonProgress?.exercises || {};
                const completedRegular = Object.entries(exercises)
                    .filter(([exerciseId, completed]) =>
                        completed === true && !exerciseId.includes('ekstra')
                    ).length;

                // Check if all regular exercises are completed
                if (completedRegular < regularExerciseCount) {
                    allRegularExercisesCompleted = false;
                }
            }
        });

        // Vis knappen kun hvis:
        // 1. Kapittelet har minst én leksjon med øvelser
        // 2. ALLE regular exercises i alle leksjoner er fullført (grønn blyant earned)
        if (hasAnyLessons && allRegularExercisesCompleted) {
            container.classList.remove('hidden');
        } else {
            container.classList.add('hidden');
        }
    }
}

/**
 * Setter opp event listeners for kapittel-nullstillingsknapper
 * Kalles fra main.js på index.html
 */
export function setupChapterResetButtons() {
    const resetButtons = document.querySelectorAll('.reset-chapter-btn');

    resetButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const chapterNum = parseInt(e.currentTarget.dataset.chapter);

            // Vis bekreftelsesdialog med modal
            const confirmReset = await showConfirmModal(
                `Er du sikker på at du vil nullstille alle øvelser i Kapittel ${chapterNum}?\n\n` +
                `Dette vil:\n` +
                `✓ Nullstille alle øvelser til blank (kan gjøres på nytt)\n` +
                `✓ Bevare alle achievements (📗 ✏️ ⭐)\n\n` +
                `Dine achievements vil forbli synlige, men du kan gjøre øvelsene på nytt for trening.`,
                `Nullstille Kapittel ${chapterNum}`
            );

            if (!confirmReset) return;

            // Utfør nullstilling
            const success = resetChapterExercises(chapterNum);

            if (success) {
                // Merk at dette kapittelet nettopp ble nullstilt (for banner-visning)
                sessionStorage.setItem(`chapter-${chapterNum}-just-reset`, 'true');

                // Vis suksessmelding med grønn modal
                await showAlertModal(
                    `Kapittel ${chapterNum} er nullstilt!\n\n` +
                    `Du kan nå gjøre øvelsene på nytt. Achievements er bevart.`,
                    `✅ Vellykket`,
                    'success'
                );

                // Oppdater siden for å vise oppdaterte ikoner
                window.location.reload();
            } else {
                // Vis feilmelding med rød modal
                await showAlertModal(
                    `Kunne ikke nullstille kapittelet. Ingen achievements funnet.`,
                    `❌ Feil`,
                    'error'
                );
            }
        });
    });
}
