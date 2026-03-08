/**
 * Image Matching Game — Migrated to ExerciseBase
 *
 * Images on left, text answers on right. Click to select, match pairs.
 * Delegated click listeners on .images and .answers containers.
 */

import { createExercise } from './exercise-base.js';
import { loadData, saveData, trackExerciseCompletion, removeExerciseCompletion, getProgressData, getActiveCurriculum } from '../progress/index.js';
import { handleReset } from './core-reset.js';
import { saveExerciseState, loadExerciseState, getExerciseStorageKey } from './storage-utils.js';

export function autoSetupImageMatchingGames() {
    document.querySelectorAll('.image-matching-game-task').forEach(container => {
        // Skip dynamically-loaded exercises (handled by exercises-content-loader)
        if (container.dataset.dynamic === 'true') return;

        const containerId = container.id;
        const pairsVariableName = container.dataset.pairsVariable;
        const pairsData = window[pairsVariableName];

        if (containerId && pairsData) {
            setupImageMatchingGame(containerId, pairsData);
        } else {
            console.warn(`Kunne ikke starte image-matching-game for container #${containerId}. Mangler data.`);
        }
    });
}

export function setupImageMatchingGame(containerId, pairsData) {
    if (!pairsData) return null;

    const chapterId = document.body.dataset.chapterId;
    if (!chapterId) return null;

    const curriculum = getActiveCurriculum();

    const exercise = createExercise(containerId, {
        onMount(ctx) {
            const dom = {
                images: ctx.$('.images'),
                answers: ctx.$('.answers'),
                feedback: ctx.$('.feedback-message') || ctx.$('.feedback'),
                resetButton: ctx.$('.reset'),
            };

            if (!dom.images || !dom.answers || !dom.feedback || !dom.resetButton) return;

            const state = {
                selectedImage: null,
                selectedAnswer: null,
                completedPairs: [],
                randomSeed: Math.random(),
                images: pairsData.map(p => ({ id: p.id, image: p.image, alt: p.alt })),
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
                state.answers = answersToShuffle.map(p => ({ id: p.id, answer: p.answer }));
            }

            function render() {
                dom.images.innerHTML = '';
                dom.answers.innerHTML = '';
                dom.feedback.textContent = '';

                state.images.forEach(img => {
                    const div = document.createElement('div');
                    div.dataset.id = img.id;

                    const isCompleted = state.completedPairs.includes(String(img.id));
                    const baseClass = 'image-match-item rounded-lg cursor-pointer transition-all';
                    const stateClass = isCompleted ? 'correct' : 'bg-neutral-100 hover:bg-neutral-200';
                    div.className = `${baseClass} ${stateClass}`;

                    const imgElement = document.createElement('img');
                    imgElement.src = img.image;
                    imgElement.alt = img.alt;
                    imgElement.className = 'w-full h-full object-cover rounded-lg';
                    imgElement.style.pointerEvents = 'none';

                    div.appendChild(imgElement);
                    dom.images.appendChild(div);
                });

                state.answers.forEach(a => {
                    const div = document.createElement('div');
                    div.textContent = a.answer;
                    div.dataset.id = a.id;

                    const isCompleted = state.completedPairs.includes(String(a.id));
                    const baseClass = 'answer-match-item p-3 sm:p-4 rounded-lg text-center text-base sm:text-lg font-semibold';
                    const stateClass = isCompleted ? 'correct' : 'bg-neutral-100 cursor-pointer hover:bg-neutral-200 transition-colors';
                    div.className = `${baseClass} ${stateClass}`;
                    dom.answers.appendChild(div);
                });
            }

            function handleSelect(element, type, parentContainer) {
                if (element.classList.contains('correct') || element.classList.contains('selected')) return;

                parentContainer.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
                element.classList.add('selected');

                if (type === 'image') state.selectedImage = element;
                else state.selectedAnswer = element;

                if (state.selectedImage && state.selectedAnswer) checkMatch();
            }

            function checkMatch() {
                const { selectedImage, selectedAnswer } = state;
                if (!selectedImage || !selectedAnswer) return;

                const isCorrect = selectedImage.dataset.id === selectedAnswer.dataset.id;

                if (isCorrect) {
                    selectedImage.classList.replace('selected', 'correct');
                    selectedAnswer.classList.replace('selected', 'correct');
                    dom.feedback.textContent = 'Riktig!';
                    dom.feedback.className = 'feedback-message correct';

                    const pairId = String(selectedImage.dataset.id);
                    if (!state.completedPairs.includes(pairId)) {
                        state.completedPairs.push(pairId);
                    }
                    saveExerciseState(curriculum, chapterId, 'image-matching', containerId, { completedPairs: state.completedPairs, randomSeed: state.randomSeed });

                    if (state.completedPairs.length === pairsData.length) {
                        dom.feedback.textContent = '🎉 Perfekt! Alle svarene er riktige!';
                        dom.feedback.className = 'feedback-message correct';
                        trackExerciseCompletion(containerId);
                    }
                } else {
                    selectedImage.classList.add('incorrect');
                    selectedAnswer.classList.add('incorrect');
                    dom.feedback.textContent = 'Prøv igjen!';
                    dom.feedback.className = 'feedback-message incorrect';

                    ctx.setTimeout(() => {
                        selectedImage.classList.remove('incorrect', 'selected');
                        selectedAnswer.classList.remove('incorrect', 'selected');
                        dom.feedback.textContent = '';
                    }, 1000);
                }
                state.selectedImage = null;
                state.selectedAnswer = null;
            }

            // Load saved state
            const savedState = loadExerciseState(curriculum, chapterId, 'image-matching', containerId, null);
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
                    dom.feedback.textContent = '🎉 Perfekt! Alle svarene er riktige!';
                    dom.feedback.className = 'feedback-message correct';
                }
            }

            ctx.listen(dom.images, 'click', e => {
                const target = e.target.closest('.image-match-item');
                if (target) handleSelect(target, 'image', dom.images);
            });

            ctx.listen(dom.answers, 'click', e => {
                const target = e.target.closest('.answer-match-item');
                if (target) handleSelect(target, 'answer', dom.answers);
            });

            ctx.listen(dom.resetButton, 'click', () => {
                const progress = getProgressData();
                const lessonId = document.body.dataset.chapterId;
                const lessonProgress = progress[lessonId] || { exercises: {} };
                const wasCompleted = lessonProgress.exercises[containerId] === true;

                const performReset = () => {
                    removeExerciseCompletion(containerId);
                    const storageKey = getExerciseStorageKey(curriculum, chapterId, 'image-matching', containerId);
                    localStorage.removeItem(storageKey);
                    state.completedPairs = [];
                    state.randomSeed = Math.random();
                    state.selectedImage = null;
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
