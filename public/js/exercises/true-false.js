/**
 * True/False Game — Migrated to ExerciseBase
 *
 * Supports both text-only and image-based true/false statements.
 * Delegated click on .statements-container for answer selection.
 */

import { createExercise } from './exercise-base.js';
import { loadData, saveData, trackExerciseCompletion, removeExerciseCompletion, getProgressData, getActiveCurriculum } from '../progress/index.js';
import { handleReset } from './core-reset.js';
import { saveExerciseState, loadExerciseState, getExerciseStorageKey } from './storage-utils.js';
import { t } from '../utils/i18n.js';

export function autoSetupTrueFalseGames() {
    document.querySelectorAll('.true-false-task').forEach(container => {
        // Skip dynamically-loaded exercises (handled by exercises-content-loader)
        if (container.dataset.dynamic === 'true') return;

        const containerId = container.id;
        const dataVariableName = container.dataset.trueFalseVariable;
        const trueFalseData = window[dataVariableName];

        if (containerId && trueFalseData) {
            setupTrueFalseGame(containerId, trueFalseData);
        } else {
            console.warn(`Kunne ikke starte true-false-game for container #${containerId}. Mangler data eller data-variabel.`);
        }
    });
}

export function setupTrueFalseGame(containerId, statements) {
    if (!statements) return null;

    const chapterId = document.body.dataset.chapterId;
    if (!chapterId) return null;

    const curriculum = getActiveCurriculum();
    const hasImages = statements.some(stmt => stmt.img);
    const exerciseType = hasImages ? 'true-false-pictures' : 'true-false';

    const exercise = createExercise(containerId, {
        onMount(ctx) {
            const exerciseContainer = ctx.container.closest('[id^="extra-exercise"]');
            const exerciseId = exerciseContainer ? exerciseContainer.id : containerId;

            const statementsContainer = ctx.$('.statements-container');
            const resetButton = ctx.$('.reset');
            const feedbackEl = ctx.$('.feedback-message') || ctx.$('.feedback');

            if (!statementsContainer || !resetButton) return;

            let state;
            if (hasImages) {
                state = loadExerciseState(curriculum, chapterId, exerciseType, exerciseId, { playerAnswers: {}, completedAnswers: [] });
            } else {
                state = loadExerciseState(curriculum, chapterId, exerciseType, exerciseId, {});
            }

            const progress = getProgressData();
            const lessonProgress = progress[chapterId] || { exercises: {} };
            const wasCompleted = lessonProgress.exercises[exerciseId] === true;

            function createStatementRow(item, index) {
                const statementDiv = document.createElement('div');
                if (hasImages) {
                    statementDiv.className = 'statement-item flex items-center gap-4 p-4 border-2 border-neutral-200 rounded-lg';
                    statementDiv.innerHTML = `
                        <div class="flex-grow">
                            <p class="text-center sm:text-left text-lg font-medium mb-2">${index + 1}. ${item.q}</p>
                            ${item.img ? `<img src="${item.img}" alt="${item.q}" class="w-16 h-16 object-cover rounded-lg mb-2 shadow-sm mx-auto sm:mx-0">` : ''}
                            <div class="flex gap-2 flex-shrink-0 justify-center sm:justify-start">
                                <button class="tf-btn bg-success-100 text-success-800 font-semibold py-2 px-5 rounded-lg hover:bg-success-200 transition-colors" data-answer="true">${t('feedback_correct', 'Riktig')}</button>
                                <button class="tf-btn bg-error-100 text-error-800 font-semibold py-2 px-5 rounded-lg hover:bg-error-200 transition-colors" data-answer="false">${t('feedback_wrong', 'Galt')}</button>
                            </div>
                        </div>`;
                } else {
                    statementDiv.className = 'statement-item p-4 border rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4';
                    statementDiv.dataset.index = index;
                    statementDiv.innerHTML = `
                        <div class="text-center sm:text-left">
                            <p class="font-semibold">${index + 1}. ${item.q}</p>
                            ${item.tysk ? `<p class="text-sm text-neutral-600 mt-1">"${item.tysk}"</p>` : ''}
                        </div>
                        <div class="flex gap-2 flex-shrink-0">
                            <button data-answer="true" class="tf-btn bg-success-100 text-success-800 font-semibold py-2 px-5 rounded-lg hover:bg-success-200 transition-colors">${t('feedback_correct', 'Riktig')}</button>
                            <button data-answer="false" class="tf-btn bg-error-100 text-error-800 font-semibold py-2 px-5 rounded-lg hover:bg-error-200 transition-colors">${t('feedback_wrong', 'Galt')}</button>
                        </div>`;
                }
                return statementDiv;
            }

            function updateStatementUI(index, playerAnswer) {
                let statementDiv;
                if (hasImages) {
                    statementDiv = statementsContainer.children[index];
                } else {
                    statementDiv = statementsContainer.querySelector(`[data-index='${index}']`);
                }
                if (!statementDiv) return;

                const buttons = statementDiv.querySelectorAll('.tf-btn');
                const isCorrect = playerAnswer === statements[index].a;

                if (hasImages) {
                    const trueBtn = Array.from(buttons).find(b => b.dataset.answer === 'true');
                    const falseBtn = Array.from(buttons).find(b => b.dataset.answer === 'false');
                    [trueBtn, falseBtn].forEach(btn => { if (btn) btn.disabled = true; });
                    const applyStateClasses = (btn, selected) => {
                        if (!btn) return;
                        btn.classList.remove('ring-2', 'ring-success-600', '!bg-success-500', '!bg-error-500', 'text-white');
                        if (selected) {
                            if (isCorrect) btn.classList.add('!bg-success-500', 'text-white', 'ring-2', 'ring-success-600');
                            else btn.classList.add('!bg-error-500', 'text-white');
                        }
                    };
                    applyStateClasses(trueBtn, playerAnswer === true);
                    applyStateClasses(falseBtn, playerAnswer === false);
                } else {
                    buttons.forEach(button => {
                        button.disabled = true;
                        const buttonAnswer = button.dataset.answer === 'true';
                        if (buttonAnswer === playerAnswer) {
                            button.classList.add(isCorrect ? '!bg-success-500' : '!bg-error-500', 'text-white');
                            if (isCorrect) button.classList.add('ring-2', 'ring-success-600');
                        }
                    });
                }
            }

            function renderStatements() {
                statementsContainer.innerHTML = '';
                statements.forEach((item, index) => {
                    const row = createStatementRow(item, index);
                    statementsContainer.appendChild(row);
                });

                if (hasImages) {
                    Object.keys(state.playerAnswers).forEach(key => {
                        const idx = parseInt(key, 10);
                        if (!Number.isNaN(idx)) updateStatementUI(idx, state.playerAnswers[idx]);
                    });
                } else {
                    Object.keys(state).forEach(index => {
                        updateStatementUI(parseInt(index, 10), state[index]);
                    });
                }

                checkCompletion();
            }

            function checkCompletion() {
                const answeredCount = hasImages ? Object.keys(state.playerAnswers).length : Object.keys(state).length;
                const totalCount = statements.length;

                if (answeredCount === totalCount) {
                    const allCorrect = statements.every((item, idx) => {
                        const playerAnswer = hasImages ? state.playerAnswers[idx] : state[idx];
                        return playerAnswer === item.a;
                    });

                    if (allCorrect) {
                        if (hasImages) {
                            const existingFeedback = ctx.container.querySelector('.feedback');
                            if (existingFeedback) existingFeedback.remove();
                            const newFeedbackEl = document.createElement('div');
                            newFeedbackEl.className = 'feedback-message correct';
                            newFeedbackEl.textContent = t('feedback_perfect', '🎉 Perfekt! Alle svarene er riktige!');
                            const resetButtonContainer = ctx.container.querySelector('.mt-6.text-center');
                            if (resetButtonContainer) ctx.container.insertBefore(newFeedbackEl, resetButtonContainer);
                            else ctx.container.appendChild(newFeedbackEl);
                        } else if (feedbackEl) {
                            feedbackEl.textContent = t('feedback_perfect', '🎉 Perfekt! Alle svarene er riktige!');
                            feedbackEl.className = 'feedback-message correct';
                        }
                        trackExerciseCompletion(exerciseId);
                    } else if (!hasImages && feedbackEl) {
                        const correctCount = statements.filter((item, idx) => {
                            const playerAnswer = hasImages ? state.playerAnswers[idx] : state[idx];
                            return playerAnswer === item.a;
                        }).length;
                        feedbackEl.textContent = t('feedback_score', { correct: correctCount, total: totalCount });
                        feedbackEl.className = 'feedback-message pending';
                    }
                } else if (!hasImages && feedbackEl) {
                    feedbackEl.textContent = t('feedback_remaining', { count: totalCount - answeredCount });
                    feedbackEl.className = 'feedback-message neutral';
                }
            }

            ctx.listen(statementsContainer, 'click', (e) => {
                const button = e.target.closest('.tf-btn');
                if (!button || button.disabled) return;

                let index;
                if (hasImages) {
                    const statementItem = button.closest('.statement-item');
                    index = Array.from(statementsContainer.children).indexOf(statementItem);
                } else {
                    const statementDiv = button.closest('.statement-item');
                    index = parseInt(statementDiv.dataset.index, 10);
                }

                const playerAnswer = button.dataset.answer === 'true';

                if (hasImages) {
                    if (!state.completedAnswers.includes(index)) {
                        state.completedAnswers.push(index);
                    }
                    state.playerAnswers[index] = playerAnswer;
                    saveExerciseState(curriculum, chapterId, exerciseType, exerciseId, state);
                    updateStatementUI(index, playerAnswer);
                    const allAnswered = state.completedAnswers.length === statements.length;
                    if (allAnswered) checkCompletion();
                } else {
                    state[index] = playerAnswer;
                    saveExerciseState(curriculum, chapterId, exerciseType, exerciseId, state);
                    updateStatementUI(index, playerAnswer);
                    checkCompletion();
                }
            });

            ctx.listen(resetButton, 'click', () => {
                const performReset = () => {
                    if (wasCompleted) removeExerciseCompletion(exerciseId);
                    const storageKey = getExerciseStorageKey(curriculum, chapterId, exerciseType, exerciseId);
                    localStorage.removeItem(storageKey);
                    if (hasImages) {
                        state = { playerAnswers: {}, completedAnswers: [] };
                        const existingFeedback = ctx.container.querySelector('.feedback');
                        if (existingFeedback) existingFeedback.remove();
                    } else {
                        state = {};
                        if (feedbackEl) feedbackEl.textContent = '';
                    }
                    renderStatements();
                };

                handleReset(exerciseId, performReset, wasCompleted);
            });

            renderStatements();
        },
    });

    if (exercise) exercise.mount();
    return exercise;
}
