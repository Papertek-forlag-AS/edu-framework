/**
 * Matching Game — Migrated to ExerciseBase
 *
 * Two columns (questions + answers). Click to select, match pairs.
 * Supports both text and icon modes. Delegated click listeners
 * on .questions and .answers containers.
 */

import { createExercise } from './exercise-base.js';
import { loadData, saveData, trackExerciseCompletion, removeExerciseCompletion, getProgressData, getActiveCurriculum } from '../progress/index.js';
import { handleReset } from './core-reset.js';
import { saveExerciseState, loadExerciseState, getExerciseStorageKey } from './storage-utils.js';
import { t } from '../utils/i18n.js';

export function autoSetupMatchingGames() {
    document.querySelectorAll('.matching-game-task').forEach(container => {
        const containerId = container.id;
        const pairsVariableName = container.dataset.pairsVariable;
        const isIcon = container.dataset.isIconGame === 'true';
        const pairsData = window[pairsVariableName];

        if (containerId && pairsData) {
            setupMatchingGame(containerId, pairsData, isIcon);
        } else {
            console.warn(`Kunne ikke starte matching-game for container #${containerId}. Mangler data.`);
        }
    });
}

export function setupMatchingGame(containerId, pairsData, isIconGame = false) {
    if (!pairsData) return null;

    const chapterId = document.body.dataset.chapterId;
    if (!chapterId) return null;

    const curriculum = getActiveCurriculum();

    const exercise = createExercise(containerId, {
        onMount(ctx) {
            const dom = {
                questions: ctx.$('.questions'),
                answers: ctx.$('.answers'),
                feedback: ctx.$('.feedback'),
                resetButton: ctx.$('.reset'),
            };

            if (!dom.questions || !dom.answers || !dom.feedback || !dom.resetButton) return;

            const state = {
                selectedQuestion: null,
                selectedAnswer: null,
                completedPairs: [],
                randomSeed: Math.random(),
                questions: pairsData.map(p => ({ id: p.id, group: p.group, text: p.q })),
                answers: [],
            };

            function shuffleAnswers() {
                const answersToShuffle = [...pairsData];
                let seed = state.randomSeed;
                const seededRandom = () => {
                    seed = (seed * 9301 + 49297) % 233280;
                    return seed / 233280;
                };
                for (let i = answersToShuffle.length - 1; i > 0; i--) {
                    const j = Math.floor(seededRandom() * (i + 1));
                    [answersToShuffle[i], answersToShuffle[j]] = [answersToShuffle[j], answersToShuffle[i]];
                }
                state.answers = answersToShuffle.map(p => ({ id: p.id, group: p.group, text: p.a }));
            }

            function render() {
                dom.questions.innerHTML = '';
                dom.answers.innerHTML = '';
                dom.feedback.textContent = '';

                state.questions.forEach(q => {
                    const div = document.createElement('div');
                    div.innerHTML = q.text;
                    div.dataset.id = q.id;
                    if (q.group) div.dataset.group = q.group;

                    const isCompleted = state.completedPairs.includes(String(q.id));
                    const baseClass = `match-item p-3 sm:p-4 rounded-lg text-center ${isIconGame ? 'text-3xl sm:text-4xl' : 'text-base sm:text-lg'}`;
                    const stateClass = isCompleted ? 'correct' : 'bg-neutral-100 cursor-pointer hover:bg-neutral-200 transition-colors';
                    div.className = `${baseClass} ${stateClass}`;
                    dom.questions.appendChild(div);
                });

                state.answers.forEach(a => {
                    const div = document.createElement('div');
                    div.innerHTML = a.text;
                    div.dataset.id = a.id;
                    if (a.group) div.dataset.group = a.group;

                    const isCompleted = state.completedPairs.includes(String(a.id));
                    const baseClass = 'match-item p-3 sm:p-4 rounded-lg text-center text-base sm:text-lg';
                    const stateClass = isCompleted ? 'correct' : 'bg-neutral-100 cursor-pointer hover:bg-neutral-200 transition-colors';
                    div.className = `${baseClass} ${stateClass}`;
                    dom.answers.appendChild(div);
                });
            }

            function handleSelect(element, type, parentContainer) {
                if (element.classList.contains('correct') || element.classList.contains('selected')) return;

                parentContainer.querySelectorAll('.match-item.selected').forEach(el => el.classList.remove('selected'));
                element.classList.add('selected');

                if (type === 'question') state.selectedQuestion = element;
                else state.selectedAnswer = element;

                if (state.selectedQuestion && state.selectedAnswer) checkMatch();
            }

            function checkMatch() {
                const { selectedQuestion, selectedAnswer } = state;
                if (!selectedQuestion || !selectedAnswer) return;

                const isCorrect = (selectedQuestion.dataset.group && selectedAnswer.dataset.group)
                    ? (selectedQuestion.dataset.group === selectedAnswer.dataset.group)
                    : (selectedQuestion.dataset.id === selectedAnswer.dataset.id);

                if (isCorrect) {
                    selectedQuestion.classList.replace('selected', 'correct');
                    selectedAnswer.classList.replace('selected', 'correct');
                    dom.feedback.textContent = t('feedback_correct', 'Riktig!');
                    dom.feedback.className = 'feedback-message correct';

                    const pairId = String(selectedQuestion.dataset.id);
                    if (!state.completedPairs.includes(pairId)) {
                        state.completedPairs.push(pairId);
                    }
                    saveExerciseState(curriculum, chapterId, 'matching', containerId, { completedPairs: state.completedPairs, randomSeed: state.randomSeed });

                    if (state.completedPairs.length === pairsData.length) {
                        dom.feedback.textContent = t('feedback_perfect', '🎉 Perfekt! Alle svarene er riktige!');
                        dom.feedback.className = 'feedback-message correct';
                        trackExerciseCompletion(containerId);
                    }
                } else {
                    selectedQuestion.classList.add('incorrect');
                    selectedAnswer.classList.add('incorrect');
                    dom.feedback.textContent = t('feedback_try_again', 'Prøv igjen!');
                    dom.feedback.className = 'feedback-message incorrect';

                    ctx.setTimeout(() => {
                        selectedQuestion.classList.remove('incorrect', 'selected');
                        selectedAnswer.classList.remove('incorrect', 'selected');
                        dom.feedback.textContent = '';
                    }, 1000);
                }
                state.selectedQuestion = null;
                state.selectedAnswer = null;
            }

            // Load saved state
            const savedState = loadExerciseState(curriculum, chapterId, 'matching', containerId, null);
            if (savedState) {
                state.completedPairs = savedState.completedPairs || [];
                state.randomSeed = savedState.randomSeed || Math.random();
            }

            shuffleAnswers();
            render();

            // Show celebration if previously completed
            if (state.completedPairs.length === pairsData.length) {
                const progress = getProgressData();
                const lessonProgress = progress[chapterId] || { exercises: {} };
                const wasCompleted = lessonProgress.exercises[containerId] === true;

                if (wasCompleted) {
                    dom.feedback.textContent = t('feedback_perfect', '🎉 Perfekt! Alle svarene er riktige!');
                    dom.feedback.className = 'feedback-message correct';
                }
            }

            ctx.listen(dom.questions, 'click', e => {
                const target = e.target.closest('.match-item');
                if (target) handleSelect(target, 'question', dom.questions);
            });

            ctx.listen(dom.answers, 'click', e => {
                const target = e.target.closest('.match-item');
                if (target) handleSelect(target, 'answer', dom.answers);
            });

            ctx.listen(dom.resetButton, 'click', () => {
                const progress = getProgressData();
                const lessonId = document.body.dataset.chapterId;
                const lessonProgress = progress[lessonId] || { exercises: {} };
                const wasCompleted = lessonProgress.exercises[containerId] === true;

                const performReset = () => {
                    removeExerciseCompletion(containerId);
                    const storageKey = getExerciseStorageKey(curriculum, chapterId, 'matching', containerId);
                    localStorage.removeItem(storageKey);
                    state.completedPairs = [];
                    state.randomSeed = Math.random();
                    state.selectedQuestion = null;
                    state.selectedAnswer = null;
                    shuffleAnswers();
                    render();
                };

                handleReset(containerId, performReset, wasCompleted);
            });
        },
    });

    if (exercise) exercise.mount();
    return exercise;
}
