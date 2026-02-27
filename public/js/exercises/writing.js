/**
 * Writing Task — Migrated to ExerciseBase
 *
 * Textarea with auto-save on input, "Ferdig" completion button,
 * and reset support. Uses storage-utils for exercise state.
 */

import { createExercise } from './exercise-base.js';
import { getProgressData, removeExerciseCompletion, trackExerciseCompletion, getActiveCurriculum } from '../progress/index.js';
import { createSpecialCharsComponent } from '../ui.js';
import { handleReset } from './core-reset.js';
import { saveExerciseState, loadExerciseState, getExerciseStorageKey } from './storage-utils.js';

export function setupWritingTask(containerId) {
    const chapterId = document.body.dataset.chapterId;
    if (!chapterId) return null;

    const curriculum = getActiveCurriculum();

    const exercise = createExercise(containerId, {
        onMount(ctx) {
            const resetButton = ctx.$('.reset');
            const textarea = ctx.$('textarea');
            if (!textarea || !resetButton) return;

            const specialCharsPlaceholder = ctx.$('.special-chars-placeholder');
            if (specialCharsPlaceholder) {
                const specialCharsId = `special-chars-${containerId}`;
                specialCharsPlaceholder.id = specialCharsId;
                createSpecialCharsComponent(specialCharsId);
            }

            const savedText = loadExerciseState(curriculum, chapterId, 'writing', containerId, null);
            if (savedText) textarea.value = savedText;

            ctx.listen(textarea, 'input', () => {
                saveExerciseState(curriculum, chapterId, 'writing', containerId, textarea.value);
            });

            const fertigButton = document.createElement('button');
            fertigButton.textContent = 'Ferdig!';
            fertigButton.className = 'bg-success-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-success-600 transition-colors';

            const feedbackP = document.createElement('p');
            feedbackP.className = 'mt-4 font-semibold text-center h-6 text-success-600';

            ctx.listen(fertigButton, 'click', () => {
                if (textarea.value.trim().length > 0) {
                    feedbackP.textContent = 'Bra jobbet!';
                    trackExerciseCompletion(containerId);
                } else {
                    feedbackP.textContent = 'Skriv noe i feltet først.';
                }
                ctx.setTimeout(() => { feedbackP.textContent = ''; }, 3000);
            });

            const buttonContainer = resetButton.parentElement;
            if (buttonContainer) {
                buttonContainer.classList.add('flex', 'gap-4', 'items-center');
                if (!buttonContainer.querySelector('button.bg-success-500')) {
                    buttonContainer.appendChild(fertigButton);
                }
            }
            ctx.container.appendChild(feedbackP);

            ctx.listen(resetButton, 'click', () => {
                const progress = getProgressData();
                const lessonId = document.body.dataset.chapterId;
                const lessonProgress = progress[lessonId] || { exercises: {} };
                const wasCompleted = lessonProgress.exercises[containerId] === true;

                const performReset = () => {
                    textarea.value = '';
                    const storageKey = getExerciseStorageKey(curriculum, chapterId, 'writing', containerId);
                    localStorage.removeItem(storageKey);
                    feedbackP.textContent = '';
                    removeExerciseCompletion(containerId);
                };

                handleReset(containerId, performReset, wasCompleted);
            });
        },
    });

    if (exercise) exercise.mount();
    return exercise;
}
