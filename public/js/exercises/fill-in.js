/**
 * Fill-in Task — Migrated to ExerciseBase
 *
 * Input fields with data-answer / data-answer-flexible attributes.
 * Check button validates answers, reset clears state.
 * Auto-saves input values on every keystroke.
 */

import { createExercise } from './exercise-base.js';
import { loadData, saveData, trackExerciseCompletion, removeExerciseCompletion, getProgressData, getActiveCurriculum } from '../progress/index.js';
import { createSpecialCharsComponent } from '../ui.js';
import { handleReset } from './core-reset.js';
import { t } from '../utils/i18n.js';

export function autoSetupFillInTasks() {
    document.querySelectorAll('.fill-in-task').forEach(container => {
        if (container.id) {
            setupFillInTask(container.id);
        } else {
            console.warn('Kunne ikke starte fill-in-task. Mangler ID på container.');
        }
    });
}

export function setupFillInTask(containerId) {
    const chapterId = document.body.dataset.chapterId;
    if (!chapterId) return null;

    // Guard against double init (autoSetup + manual call)
    const el = document.getElementById(containerId);
    if (!el) return null;
    if (el.dataset.fillInInitialized === 'true') return null;
    el.dataset.fillInInitialized = 'true';

    const curriculum = getActiveCurriculum();
    const storageKey = `${curriculum}-fill-in-${containerId}-${chapterId}`;

    const exercise = createExercise(containerId, {
        onMount(ctx) {
            const dom = {
                inputs: ctx.$$('input[data-answer], input[data-answer-flexible]'),
                checkButton: ctx.$('.check'),
                resetButton: ctx.$('.reset'),
                feedbackContainer: ctx.$('.feedback-container') || ctx.container,
            };

            let state = { inputs: [], checked: false, allCorrect: false };

            function loadState() {
                const saved = loadData(storageKey);
                if (saved) state = { ...state, ...saved };
            }

            function saveState() {
                state.inputs = Array.from(dom.inputs).map(input => input.value);
                saveData(storageKey, state);
            }

            function checkAnswers(trackCompletion = true) {
                let allCorrect = true;
                dom.inputs.forEach(input => {
                    const value = input.value.trim().toLowerCase();
                    const feedbackIcon = input.parentElement.querySelector('.feedback-icon');

                    let isCorrect = false;
                    if (input.hasAttribute('data-answer-flexible')) {
                        const keywords = (input.dataset.answerFlexible || '').toLowerCase().split(',').map(ans => ans.trim()).filter(Boolean);
                        isCorrect = keywords.some(keyword => value.includes(keyword));
                    } else {
                        const possibleAnswers = (input.dataset.answer || '').toLowerCase().split(',').map(answer => answer.trim());
                        isCorrect = possibleAnswers.includes(value);
                    }

                    if (isCorrect) {
                        input.classList.add('feedback-correct');
                        input.classList.remove('feedback-incorrect');
                        if (feedbackIcon) {
                            feedbackIcon.textContent = '✓';
                            feedbackIcon.className = 'feedback-icon correct';
                        }
                    } else {
                        input.classList.add('feedback-incorrect');
                        input.classList.remove('feedback-correct');
                        if (feedbackIcon) {
                            feedbackIcon.textContent = '✗';
                            feedbackIcon.className = 'feedback-icon incorrect';
                        }
                        allCorrect = false;
                    }
                });

                state.checked = true;
                state.allCorrect = allCorrect;
                saveState();

                const existingFeedback = dom.feedbackContainer.querySelector('.feedback');
                if (existingFeedback) existingFeedback.remove();

                if (allCorrect && trackCompletion) {
                    const newFeedbackEl = document.createElement('div');
                    newFeedbackEl.className = 'feedback-message correct';
                    newFeedbackEl.innerHTML = t('feedback_perfect', '🎉 Perfekt! Alle svarene er riktige!');
                    const buttonsContainer = dom.resetButton?.parentElement || ctx.container.querySelector('[class*="flex"][class*="gap"]');
                    if (buttonsContainer && buttonsContainer.parentElement === ctx.container) {
                        ctx.container.insertBefore(newFeedbackEl, buttonsContainer);
                    } else {
                        ctx.container.appendChild(newFeedbackEl);
                    }
                    trackExerciseCompletion(containerId);
                }
            }

            function render() {
                dom.inputs.forEach((input, index) => {
                    input.value = state.inputs[index] || '';
                    input.classList.remove('feedback-correct', 'feedback-incorrect');
                    const feedbackIcon = input.parentElement.querySelector('.feedback-icon');
                    if (feedbackIcon) {
                        feedbackIcon.textContent = '';
                        feedbackIcon.className = 'feedback-icon';
                    }
                });

                const existingFeedback = dom.feedbackContainer.querySelector('.feedback');
                if (existingFeedback) existingFeedback.remove();

                if (state.checked) {
                    checkAnswers(false);

                    const progress = getProgressData();
                    const lessonProgress = progress[chapterId] || { exercises: {} };
                    const wasCompleted = lessonProgress.exercises[containerId] === true;

                    if (wasCompleted && state.allCorrect) {
                        const newFeedbackEl = document.createElement('div');
                        newFeedbackEl.className = 'feedback-message correct';
                        newFeedbackEl.innerHTML = t('feedback_perfect', '🎉 Perfekt! Alle svarene er riktige!');
                        const buttonsContainer = dom.resetButton?.parentElement || ctx.container.querySelector('[class*="flex"][class*="gap"]');
                        if (buttonsContainer && buttonsContainer.parentElement === ctx.container) {
                            ctx.container.insertBefore(newFeedbackEl, buttonsContainer);
                        } else {
                            ctx.container.appendChild(newFeedbackEl);
                        }
                    }
                }
            }

            const specialCharsPlaceholder = ctx.$('.special-chars-placeholder');
            if (specialCharsPlaceholder) {
                const specialCharsId = `special-chars-${containerId}`;
                specialCharsPlaceholder.id = specialCharsId;
                createSpecialCharsComponent(specialCharsId);
            }

            const progress = getProgressData();
            const lessonProgress = progress[chapterId] || { exercises: {} };
            const wasCompleted = lessonProgress.exercises[containerId] === true;

            if (dom.checkButton) ctx.listen(dom.checkButton, 'click', () => checkAnswers(true));

            if (dom.resetButton) ctx.listen(dom.resetButton, 'click', () => {
                const performReset = () => {
                    if (wasCompleted) removeExerciseCompletion(containerId);
                    state = { inputs: [], checked: false, allCorrect: false };
                    saveData(storageKey, state);
                    render();
                };
                handleReset(containerId, performReset, wasCompleted);
            });

            dom.inputs.forEach(input => ctx.listen(input, 'input', saveState));

            loadState();
            render();
        },
    });

    if (exercise) exercise.mount();
    return exercise;
}
