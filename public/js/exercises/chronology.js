/**
 * Chronology Exercise — Migrated to ExerciseBase
 *
 * Strict ordering: click items in correct sequence.
 * Wrong answer resets entire sequence with a penalty delay.
 * Uses ctx.setTimeout() so the penalty timer is cancelled on destroy.
 */

import { createExercise } from './exercise-base.js';
import { trackExerciseCompletion, removeExerciseCompletion, saveData, loadData } from '../progress/index.js';

export function setupChronologyTask(exerciseId, items) {
    if (!items || items.length === 0) return null;

    const exercise = createExercise(exerciseId, {
        onMount(ctx) {
            const poolContainer = ctx.$('.chronology-pool');
            const timelineContainer = ctx.$('.chronology-timeline');
            const feedbackElement = ctx.$('.feedback');
            const resetButton = ctx.$('.reset-btn');

            if (!poolContainer || !timelineContainer) return;

            let currentStep = 0;
            let shuffledItems = [];

            function init() {
                const savedStep = loadData(`${exerciseId}_step`);
                currentStep = typeof savedStep === 'number' ? savedStep : 0;

                timelineContainer.innerHTML = '';
                poolContainer.innerHTML = '';
                feedbackElement.textContent = '';
                feedbackElement.className = 'feedback-message';

                if (currentStep < items.length) {
                    removeExerciseCompletion(exerciseId);
                }

                // Create timeline slots
                items.forEach((itemText, index) => {
                    const slot = document.createElement('div');

                    if (index < currentStep) {
                        slot.className = 'timeline-slot bg-success-50 border-2 border-success-500 rounded-lg p-4 min-h-[60px] flex items-center text-neutral-800 font-medium shadow-sm';
                        slot.innerHTML = `
                            <div class="flex gap-4 items-center w-full">
                                <span class="flex-shrink-0 w-8 h-8 bg-success-200 text-success-800 rounded-full flex items-center justify-center font-bold text-sm">${index + 1}</span>
                                <span>${itemText}</span>
                            </div>`;
                    } else {
                        slot.className = 'timeline-slot bg-neutral-100 border-2 border-dashed border-neutral-300 rounded-lg p-4 min-h-[60px] flex items-center justify-center text-neutral-400 font-medium transition-all duration-300';
                        slot.dataset.index = index;
                        slot.innerHTML = `<span class="text-2xl opacity-20">${index + 1}</span>`;
                    }
                    timelineContainer.appendChild(slot);
                });

                // Pool items
                const remainingItems = items.map((text, index) => ({ text, originalIndex: index }))
                    .filter(item => item.originalIndex >= currentStep);

                shuffledItems = remainingItems.sort(() => Math.random() - 0.5);

                shuffledItems.forEach(item => {
                    const btn = document.createElement('button');
                    btn.className = 'pool-item w-full text-left p-4 bg-surface border-2 border-neutral-200 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-all duration-200 shadow-sm text-neutral-700 font-medium';
                    btn.textContent = item.text;
                    btn.dataset.originalIndex = item.originalIndex;

                    ctx.listen(btn, 'click', () => handleItemClick(btn, item.originalIndex));
                    poolContainer.appendChild(btn);
                });

                if (currentStep === items.length) {
                    handleCompletion(false);
                }
            }

            function handleItemClick(btn, originalIndex) {
                if (btn.disabled || btn.classList.contains('opacity-50')) return;

                if (originalIndex === currentStep) {
                    handleCorrect(btn);
                } else {
                    handleIncorrect(btn);
                }
            }

            function handleCorrect(btn) {
                btn.classList.remove('hover:border-primary-400', 'hover:bg-primary-50', 'bg-surface', 'border-neutral-200');
                btn.classList.add('bg-success-100', 'border-success-500', 'text-success-800', 'opacity-0', 'pointer-events-none');

                const slot = timelineContainer.children[currentStep];
                slot.className = 'timeline-slot bg-success-50 border-2 border-success-500 rounded-lg p-4 min-h-[60px] flex items-center text-neutral-800 font-medium shadow-sm transform scale-100 transition-all duration-500';
                slot.innerHTML = `
                    <div class="flex gap-4 items-center w-full">
                        <span class="flex-shrink-0 w-8 h-8 bg-success-200 text-success-800 rounded-full flex items-center justify-center font-bold text-sm">${currentStep + 1}</span>
                        <span>${items[currentStep]}</span>
                    </div>`;

                currentStep++;
                saveData(`${exerciseId}_step`, currentStep);

                if (currentStep === items.length) {
                    handleCompletion(true);
                }
            }

            function handleIncorrect(btn) {
                btn.classList.add('animate-shake', 'bg-error-100', 'border-error-500', 'text-error-800');

                feedbackElement.textContent = 'Feil rekkefølge! Prøv igjen fra starten.';
                feedbackElement.className = 'feedback-message incorrect';

                const allBtns = poolContainer.querySelectorAll('button');
                allBtns.forEach(b => b.disabled = true);

                saveData(`${exerciseId}_step`, 0);

                ctx.setTimeout(() => {
                    init();
                }, 1500);
            }

            function handleCompletion(showConfetti = true) {
                feedbackElement.textContent = 'Riktig! Godt jobbet.';
                feedbackElement.className = 'feedback-message correct';
                trackExerciseCompletion(exerciseId);

                if (showConfetti && typeof confetti === 'function') {
                    confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 0.6 },
                    });
                }
            }

            if (resetButton) {
                ctx.listen(resetButton, 'click', () => {
                    saveData(`${exerciseId}_step`, 0);
                    init();
                });
            }

            init();
        },
    });

    if (exercise) exercise.mount();
    return exercise;
}
