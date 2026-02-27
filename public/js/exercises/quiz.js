/**
 * Quiz — Migrated to ExerciseBase
 *
 * Multiple-choice quiz with auto-generated distractors.
 * Supports both data-attribute-based (initializeQuiz) and
 * direct-data (initializeModularQuiz) initialization.
 *
 * Fixed: reset no longer recursively re-registers listeners.
 * Now uses ctx.render() for clean phase transition on reset.
 */

import { createExercise } from './exercise-base.js';
import { loadData, saveData, trackExerciseCompletion, getActiveCurriculum, getProgressData } from '../progress/index.js';
import { handleReset } from './core-reset.js';
import { saveExerciseState, loadExerciseState, getExerciseStorageKey } from './storage-utils.js';
import { t } from '../utils/i18n.js';

function shuffleArray(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

function pickDistractors(correctAnswer, pool, count) {
    const result = [];
    const used = new Set();
    const available = pool.filter(a => a !== correctAnswer);
    if (available.length <= count) {
        return shuffleArray(available).slice(0, count);
    }
    while (result.length < count) {
        const candidate = available[Math.floor(Math.random() * available.length)];
        if (!used.has(candidate) && candidate !== correctAnswer) {
            used.add(candidate);
            result.push(candidate);
        }
    }
    return result;
}

function generateQuizHTML(quizContainer, quizData) {
    quizContainer.innerHTML = '';
    const shuffledQuestions = shuffleArray(quizData);
    const allAnswersPool = Array.from(new Set(quizData.map(q => q.a)));

    shuffledQuestions.forEach((question, index) => {
        const distractors = pickDistractors(question.a, allAnswersPool, 3);
        const options = [question.a, ...distractors];
        const shuffledOptions = shuffleArray(options);

        const questionHTML = `
            <div class="quiz-question">
                <p class="font-semibold mb-3">${index + 1}. ${question.q}</p>
                <div class="grid grid-cols-2 gap-2">
                    ${shuffledOptions.map(option => {
                        const isCorrect = option === question.a;
                        return `<button class="quiz-option p-2 border-2 border-neutral-300 rounded-md hover:bg-neutral-50" data-correct="${isCorrect}">${option}</button>`;
                    }).join('')}
                </div>
            </div>`;

        quizContainer.insertAdjacentHTML('beforeend', questionHTML);
    });

    const controlsHTML = `
        <p class="feedback-message"></p>
        <div class="mt-6 flex gap-4 justify-center">
            <button class="quiz-reset bg-neutral-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-neutral-600 transition-colors">${t('btn_reset', 'Start på nytt')}</button>
        </div>`;
    quizContainer.insertAdjacentHTML('beforeend', controlsHTML);
}

function generateModularQuizHTML(quizContainer, questions) {
    quizContainer.innerHTML = '';

    questions.forEach((question, index) => {
        const correctAnswer = question.options[question.correctIndex];
        const shuffledOptions = shuffleArray([...question.options]);

        const questionHTML = `
            <div class="quiz-question">
                <p class="font-semibold mb-3">${index + 1}. ${question.question}</p>
                <div class="grid grid-cols-2 gap-2">
                    ${shuffledOptions.map(option => {
                        const isCorrect = option === correctAnswer;
                        return `<button class="quiz-option p-2 border-2 border-neutral-300 rounded-md hover:bg-neutral-50" data-correct="${isCorrect}">${option}</button>`;
                    }).join('')}
                </div>
            </div>`;
        quizContainer.insertAdjacentHTML('beforeend', questionHTML);
    });

    const controlsHTML = `
        <div class="feedback-message"></div>
        <div class="mt-6 text-center">
            <button class="quiz-reset bg-neutral-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-neutral-600 transition-colors">${t('btn_reset', 'Start på nytt')}</button>
        </div>`;
    quizContainer.insertAdjacentHTML('beforeend', controlsHTML);
}

function setupQuizExercise(wrapperId, quizContainer, quizData, exerciseId, generateFn) {
    const chapterId = document.body.dataset.chapterId;
    if (!chapterId) return null;

    const curriculum = getActiveCurriculum();

    const exercise = createExercise(wrapperId, {
        onMount(ctx) {
            function buildQuiz(innerCtx) {
                generateFn(quizContainer);

                const feedbackEl = quizContainer.querySelector('.quiz-feedback');
                const resetButton = quizContainer.querySelector('.quiz-reset');
                const questions = Array.from(quizContainer.querySelectorAll('.quiz-question'));

                let state = { answered: {} };

                const saveState = () => saveExerciseState(curriculum, chapterId, 'quiz', exerciseId, state);
                const loadState = () => {
                    const saved = loadExerciseState(curriculum, chapterId, 'quiz', exerciseId, null);
                    if (saved) state = saved;
                };

                const checkCompletion = () => {
                    const total = questions.length;
                    const answered = Object.keys(state.answered).length;
                    const correct = Object.values(state.answered).filter(a => a.correct).length;

                    if (feedbackEl) {
                        if (answered === total) {
                            if (correct === total) {
                                feedbackEl.textContent = t('feedback_perfect', '🎉 Perfekt! Alle svarene er riktige!');
                                feedbackEl.className = 'feedback-message correct';
                                trackExerciseCompletion(exerciseId);
                            } else {
                                feedbackEl.textContent = t('feedback_score_try_again', { correct, total });
                                feedbackEl.className = 'feedback-message pending';
                            }
                        } else {
                            feedbackEl.textContent = t('feedback_questions_remaining', { count: total - answered });
                            feedbackEl.className = 'feedback-message neutral';
                        }
                    }
                };

                const updateQuestionUI = (qIndex) => {
                    const q = questions[qIndex];
                    if (!q) return;
                    const qState = state.answered[qIndex];
                    q.classList.toggle('answered', !!qState);
                    const options = q.querySelectorAll('.quiz-option');
                    options.forEach((opt, oIndex) => {
                        opt.classList.remove('correct-answer', 'wrong-answer', 'correct-answer-temp');
                        opt.style.pointerEvents = qState ? 'none' : 'auto';
                        opt.classList.toggle('hover:bg-neutral-50', !qState);
                        if (qState && oIndex === qState.selected) {
                            opt.classList.add(qState.correct ? 'correct-answer' : 'wrong-answer');
                        }
                    });
                };

                const renderAll = () => {
                    questions.forEach((_, qIndex) => updateQuestionUI(qIndex));
                    checkCompletion();
                };

                innerCtx.listen(quizContainer, 'click', e => {
                    const optionEl = e.target.closest('.quiz-option');
                    if (!optionEl || optionEl.closest('.quiz-question').classList.contains('answered')) return;

                    const qIndex = questions.indexOf(optionEl.closest('.quiz-question'));
                    const oIndex = Array.from(optionEl.parentElement.children).indexOf(optionEl);
                    const isCorrectSelection = optionEl.dataset.correct === 'true';
                    state.answered[qIndex] = { selected: oIndex, correct: isCorrectSelection };
                    saveState();
                    updateQuestionUI(qIndex);
                    checkCompletion();

                    if (!isCorrectSelection) {
                        const questionEl = optionEl.closest('.quiz-question');
                        const correctBtn = questionEl ? questionEl.querySelector('.quiz-option[data-correct="true"]') : null;
                        if (correctBtn) {
                            correctBtn.classList.add('correct-answer-temp');
                            innerCtx.setTimeout(() => { correctBtn.classList.remove('correct-answer-temp'); }, 2000);
                        }
                    }
                });

                if (resetButton) {
                    innerCtx.listen(resetButton, 'click', () => {
                        const progress = getProgressData();
                        const lessonId = document.body.dataset.chapterId;
                        const lessonProgress = progress[lessonId] || { exercises: {} };
                        const wasCompleted = lessonProgress.exercises[exerciseId] === true;

                        const performReset = () => {
                            state = { answered: {} };
                            saveState();
                            // Phase transition: cleans up old listeners, calls buildQuiz with fresh ctx
                            innerCtx.render(buildQuiz);
                        };

                        handleReset(exerciseId, performReset, wasCompleted);
                    });
                }

                loadState();
                renderAll();
            }

            buildQuiz(ctx);
        },
    });

    if (exercise) exercise.mount();
    return exercise;
}

export function initializeQuiz() {
    document.querySelectorAll('.quiz-container[data-quiz-source]').forEach(container => {
        const dataSourceName = container.dataset.quizSource;
        const quizData = window[dataSourceName];
        const wrapper = container.closest('.quiz-wrapper');
        const exerciseId = wrapper.id;

        if (quizData) {
            setupQuizExercise(exerciseId, container, quizData, exerciseId, (qc) => {
                generateQuizHTML(qc, quizData);
            });
        } else {
            console.warn(`Quiz data source "${dataSourceName}" not found for container:`, container);
        }
    });
}

export function initializeModularQuiz(container, questions, exerciseId) {
    if (!container || !questions || questions.length === 0) {
        console.error('initializeModularQuiz: Missing container or questions', { container, questions, exerciseId });
        return;
    }

    const quizData = questions.map(q => ({
        q: q.question,
        a: q.options[q.correctIndex],
    }));

    const wrapper = container.closest('.quiz-wrapper');
    if (!wrapper) {
        console.error('initializeModularQuiz: Could not find .quiz-wrapper parent for quiz container', { container, exerciseId });
        return;
    }

    setupQuizExercise(wrapper.id, container, quizData, exerciseId, (qc) => {
        generateModularQuizHTML(qc, questions);
    });
}
