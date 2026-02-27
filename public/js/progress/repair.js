/**
 * =================================================================
 * REPAIR - Data consistency checking and repair
 * =================================================================
 *
 * This module handles automatic data repair for mismatches between
 * achievement counters and actual exercise completion data.
 * This is needed when migrating from old system to new system.
 */

import { EXERCISE_DATABASE } from './config.js';
import { getFullProgressData, saveFullProgressData } from './store.js';

/**
 * Reparerer data-mismatch: achievement counter finnes men individual exercises er tomme
 * Dette skjer når data ble migrert fra gammelt system
 */
export function repairAchievementMismatch() {
    const data = getFullProgressData();
    let repaired = false;

    console.log('🔍 Starting achievement mismatch repair...');

    // Gå gjennom alle curricula
    Object.keys(data.progressByCurriculum || {}).forEach(curriculum => {
        const curriculumData = data.progressByCurriculum[curriculum];
        console.log(`📚 Checking curriculum: ${curriculum}`);

        // Gå gjennom alle leksjoner i dette curriculum
        Object.keys(curriculumData).forEach(lessonId => {
            const lessonProgress = curriculumData[lessonId];
            const exerciseConfig = EXERCISE_DATABASE[lessonId];

            if (!exerciseConfig) return;

            const ovelserCount = lessonProgress.achievements?.ovelser || 0;
            const ekstraCount = lessonProgress.achievements?.ekstraovelser || 0;

            // Ensure exercises object exists
            if (!lessonProgress.exercises) {
                lessonProgress.exercises = {};
            }

            // REPAIR 1: Hvis pencil achievement finnes, men ikke nok regular exercises er fullført
            if (ovelserCount > 0) {
                const exercises = lessonProgress.exercises;
                const requiredExercises = exerciseConfig.ovelser;

                // Count exercises that are explicitly TRUE
                const completedRegular = Object.entries(exercises)
                    .filter(([id, completed]) => completed === true && !id.includes('ekstra'))
                    .length;

                // Count exercises that are explicitly FALSE (reset)
                const resetRegular = Object.entries(exercises)
                    .filter(([id, completed]) => completed === false && !id.includes('ekstra'))
                    .length;

                // Count total regular exercises in data
                const totalRegular = Object.entries(exercises)
                    .filter(([id, completed]) => !id.includes('ekstra'))
                    .length;

                console.log(`  Lesson ${lessonId}: achievement=${ovelserCount}, completed=${completedRegular}, reset=${resetRegular}, total=${totalRegular}, required=${requiredExercises}`);

                // Check if this is a legitimate reset or active practice state:
                // 1. ALL existing exercises are explicitly FALSE (post-reset state)
                // 2. SOME exercises are true AND some are false (active practice after reset)
                const allExercisesReset = resetRegular > 0 && resetRegular === totalRegular;
                const activePractice = completedRegular > 0 && resetRegular > 0;

                // ONLY repair if:
                // - Achievement exists but NO exercise data exists at all (true migration case)
                // - This indicates data that was migrated but never had exercises created
                const needsRepair = totalRegular === 0;

                // Skip repair for FRESH MIGRATIONS (simplified migration strategy)
                // If earnedDate matches migrationDate, this is a fresh migration with intentionally blank exercises
                const isFreshMigration = lessonProgress.achievements?.earnedDate &&
                                       data.studentProfile?.migrationDate &&
                                       lessonProgress.achievements.earnedDate === data.studentProfile.migrationDate;

                // Skip repair if:
                // - All exercises are reset (post-reset/post-migration state)
                // - Student is actively practicing (some complete, some not)
                // - Already has exercise data (even if partial)
                // - This is a fresh migration with intentionally blank exercises
                if (needsRepair && completedRegular < requiredExercises && !isFreshMigration) {
                    console.log(`🔧 Repairing lesson ${lessonId}: Adding ${requiredExercises} regular exercises (no exercise data found)`);

                    // Marker alle regular exercises som fullført
                    for (let i = 0; i < requiredExercises; i++) {
                        const exerciseId = `aufgabe${String.fromCharCode(65 + i)}`; // aufgabeA, aufgabeB, etc.
                        lessonProgress.exercises[exerciseId] = true;
                    }
                    repaired = true;
                } else if (isFreshMigration) {
                    console.log(`⏭️ Skipping repair for lesson ${lessonId} - fresh migration with intentionally blank exercises`);
                } else if (allExercisesReset) {
                    console.log(`⏭️ Skipping repair for lesson ${lessonId} - exercises are legitimately reset (${resetRegular}/${totalRegular} exercises all false)`);
                } else if (activePractice) {
                    console.log(`⏭️ Skipping repair for lesson ${lessonId} - student is actively practicing (${completedRegular} completed, ${resetRegular} remaining)`);
                } else if (totalRegular > 0) {
                    console.log(`⏭️ Skipping repair for lesson ${lessonId} - exercise data already exists (${totalRegular} exercises tracked)`);
                }
            }

            // REPAIR 2: Hvis star achievement finnes, men ikke nok ekstraøvelser er fullført
            if (ekstraCount > 0) {
                const exercises = lessonProgress.exercises;
                const requiredEkstra = exerciseConfig.ekstraovelser;

                // Count exercises that are explicitly TRUE
                const completedEkstra = Object.entries(exercises)
                    .filter(([id, completed]) => completed === true && id.includes('ekstraovelse'))
                    .length;

                // Count exercises that are explicitly FALSE (reset)
                const resetEkstra = Object.entries(exercises)
                    .filter(([id, completed]) => completed === false && id.includes('ekstraovelse'))
                    .length;

                // Count total ekstraøvelser in data
                const totalEkstra = Object.entries(exercises)
                    .filter(([id, completed]) => id.includes('ekstraovelse'))
                    .length;

                // Check if this is a legitimate reset or active practice state
                const allEkstraReset = resetEkstra > 0 && resetEkstra === totalEkstra;
                const activePracticeEkstra = completedEkstra > 0 && resetEkstra > 0;

                // ONLY repair if no exercise data exists at all
                const needsRepairEkstra = totalEkstra === 0;

                // Skip repair for FRESH MIGRATIONS (same check as regular exercises)
                const isFreshMigrationEkstra = lessonProgress.achievements?.earnedDate &&
                                             data.studentProfile?.migrationDate &&
                                             lessonProgress.achievements.earnedDate === data.studentProfile.migrationDate;

                if (needsRepairEkstra && completedEkstra < requiredEkstra && !isFreshMigrationEkstra) {
                    console.log(`🔧 Repairing lesson ${lessonId}: Adding ${requiredEkstra} ekstraøvelser (no exercise data found)`);

                    // Marker alle ekstraøvelser som fullført
                    for (let i = 1; i <= requiredEkstra; i++) {
                        const exerciseId = `ekstraovelse-${i}-${lessonId}`;
                        lessonProgress.exercises[exerciseId] = true;
                    }
                    repaired = true;
                } else if (isFreshMigrationEkstra) {
                    console.log(`⏭️ Skipping repair for lesson ${lessonId} ekstraøvelser - fresh migration with intentionally blank exercises`);
                } else if (allEkstraReset) {
                    console.log(`⏭️ Skipping repair for lesson ${lessonId} ekstraøvelser - exercises are legitimately reset (${resetEkstra}/${totalEkstra} exercises all false)`);
                } else if (activePracticeEkstra) {
                    console.log(`⏭️ Skipping repair for lesson ${lessonId} ekstraøvelser - student is actively practicing (${completedEkstra} completed, ${resetEkstra} remaining)`);
                } else if (totalEkstra > 0) {
                    console.log(`⏭️ Skipping repair for lesson ${lessonId} ekstraøvelser - exercise data already exists (${totalEkstra} exercises tracked)`);
                }
            }
        });
    });

    // Lagre og vis resultat
    if (repaired) {
        console.log('✅ Data repair complete - achievement mismatch fixed');
        saveFullProgressData(data);
    } else {
        console.log('✅ No data repair needed - all data is consistent');
    }
}
