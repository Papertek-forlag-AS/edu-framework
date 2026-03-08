/**
 * Dilemma Exercise — Migrated to ExerciseBase
 *
 * Dropdown-based choice exercise. Students select from shuffled
 * options for each item. Check button validates, reset clears.
 */

import { createExercise } from './exercise-base.js';
import { loadData, saveData, trackExerciseCompletion, removeExerciseCompletion, getProgressData, getActiveCurriculum } from '../progress/index.js';
import { handleReset } from './core-reset.js';
import { saveExerciseState, loadExerciseState, getExerciseStorageKey } from './storage-utils.js';

function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

function shuffleArray(array, seed) {
    let seedNum = 0;
    for (let i = 0; i < seed.length; i++) {
        seedNum += seed.charCodeAt(i);
    }
    for (let i = array.length - 1; i > 0; i--) {
        seedNum = seedNum * 9301 + 49297;
        const j = Math.floor(seededRandom(seedNum) * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

export function autoSetupDilemmaTasks() {
    document.querySelectorAll('.dilemma-task').forEach(container => {
        // Skip dynamically-loaded exercises (handled by exercises-content-loader)
        if (container.dataset.dynamic === 'true') return;

        const exerciseId = container.id;
        const itemsData = Array.from(container.querySelectorAll('.dilemma-item')).map(item => ({
            pre: item.dataset.pre || '',
            options: JSON.parse(item.dataset.options || '[]'),
            correct: item.dataset.correct,
            post: item.dataset.post || '',
        }));

        if (exerciseId && itemsData.length > 0) {
            setupDilemmaTask(exerciseId, itemsData);
        }
    });
}

export function setupDilemmaTask(exerciseId, items) {
    const chapterId = document.body.dataset.chapterId;
    if (!chapterId) return null;

    const curriculum = getActiveCurriculum();

    const exercise = createExercise(exerciseId, {
        onMount(ctx) {
            let itemsContainer = ctx.$('.dilemma-items');
            if (!itemsContainer) {
                itemsContainer = document.createElement('div');
                itemsContainer.className = 'dilemma-items space-y-3';

                const feedback = ctx.$('.feedback-message') || ctx.$('.feedback');
                if (feedback) {
                    ctx.container.insertBefore(itemsContainer, feedback);
                } else {
                    ctx.container.appendChild(itemsContainer);
                }
            }

            const feedbackEl = ctx.$('.feedback-message') || ctx.$('.feedback');
            const checkButton = ctx.$('.check');
            const resetButton = ctx.$('.reset');

            let userAnswers = {};
            let isChecked = false;

            function loadState() {
                const saved = loadExerciseState(curriculum, chapterId, 'dilemma', exerciseId, null);
                if (saved) {
                    userAnswers = saved.userAnswers || {};
                    isChecked = saved.isChecked || false;
                }
            }

            function saveState() {
                saveExerciseState(curriculum, chapterId, 'dilemma', exerciseId, { userAnswers, isChecked });
            }

            function render() {
                itemsContainer.innerHTML = '';

                items.forEach((item, index) => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'flex flex-wrap items-center gap-2 text-base sm:text-lg';

                    if (item.pre) {
                        const preSpan = document.createElement('span');
                        preSpan.textContent = item.pre;
                        itemDiv.appendChild(preSpan);
                    }

                    const select = document.createElement('select');
                    select.className = 'exercise-select';
                    select.dataset.index = index;

                    const defaultOption = document.createElement('option');
                    defaultOption.value = '';
                    defaultOption.textContent = '---';
                    defaultOption.disabled = true;
                    select.appendChild(defaultOption);

                    const shuffledOptions = shuffleArray([...item.options], `${exerciseId}-${index}`);

                    shuffledOptions.forEach(option => {
                        const optionEl = document.createElement('option');
                        optionEl.value = option;
                        optionEl.textContent = option;
                        select.appendChild(optionEl);
                    });

                    if (userAnswers[index] !== undefined) {
                        select.value = userAnswers[index];
                    } else {
                        select.selectedIndex = 0;
                    }

                    if (isChecked) {
                        select.disabled = true;
                        const isCorrect = userAnswers[index] === item.correct;
                        if (isCorrect) {
                            select.className += ' bg-success-100 border-success-500';
                        } else {
                            select.className += ' bg-error-100 border-error-500';
                        }
                    }

                    ctx.listen(select, 'change', (e) => {
                        userAnswers[index] = e.target.value;
                        saveState();
                    });

                    itemDiv.appendChild(select);

                    if (item.post) {
                        const postSpan = document.createElement('span');
                        postSpan.textContent = item.post;
                        itemDiv.appendChild(postSpan);
                    }

                    const feedbackIcon = document.createElement('span');
                    feedbackIcon.className = 'feedback-icon';

                    if (isChecked) {
                        const isCorrect = userAnswers[index] === item.correct;
                        if (isCorrect) {
                            feedbackIcon.textContent = '✓';
                            feedbackIcon.className += ' text-success-600';
                        } else {
                            feedbackIcon.textContent = '✗';
                            feedbackIcon.className += ' text-error-600';
                        }
                    }

                    itemDiv.appendChild(feedbackIcon);

                    if (isChecked && userAnswers[index] !== item.correct) {
                        const correctSpan = document.createElement('span');
                        correctSpan.className = 'text-success-600 font-semibold ml-2';
                        correctSpan.textContent = `(→ ${item.correct})`;
                        itemDiv.appendChild(correctSpan);
                    }

                    itemsContainer.appendChild(itemDiv);
                });
            }

            function checkAnswers() {
                const allAnswered = items.every((_, index) => userAnswers[index] !== undefined && userAnswers[index] !== '');

                if (!allAnswered) {
                    if (feedbackEl) {
                        feedbackEl.textContent = 'Du må svare på alle spørsmålene først!';
                        feedbackEl.className = 'feedback-message text-primary-600';
                    }
                    return;
                }

                let correct = 0;
                items.forEach((item, index) => {
                    if (userAnswers[index] === item.correct) correct++;
                });

                const total = items.length;
                const percentage = Math.round((correct / total) * 100);

                isChecked = true;
                saveState();

                if (feedbackEl) {
                    if (correct === total) {
                        feedbackEl.textContent = `🎉 Perfekt! Du fikk ${correct} av ${total} riktige!`;
                        feedbackEl.className = 'feedback-message text-success-600';
                        trackExerciseCompletion(exerciseId);
                    } else {
                        feedbackEl.textContent = `Du fikk ${correct} av ${total} riktige (${percentage}%). Se over de røde svarene.`;
                        feedbackEl.className = 'feedback-message text-primary-600';
                    }
                }

                render();

                if (checkButton) checkButton.style.display = 'none';
                if (resetButton) resetButton.style.display = 'inline-block';
            }

            function reset() {
                const progress = getProgressData();
                const lessonProgress = progress[chapterId] || { exercises: {} };
                const wasCompleted = lessonProgress.exercises[exerciseId] === true;

                const performReset = () => {
                    userAnswers = {};
                    isChecked = false;
                    removeExerciseCompletion(exerciseId);
                    const storageKey = getExerciseStorageKey(curriculum, chapterId, 'dilemma', exerciseId);
                    localStorage.removeItem(storageKey);

                    if (feedbackEl) {
                        feedbackEl.textContent = '';
                        feedbackEl.className = 'feedback-message';
                    }

                    if (checkButton) checkButton.style.display = 'inline-block';
                    if (resetButton) resetButton.style.display = 'none';

                    render();
                };

                handleReset(exerciseId, performReset, wasCompleted);
            }

            if (checkButton) ctx.listen(checkButton, 'click', checkAnswers);
            if (resetButton) ctx.listen(resetButton, 'click', reset);

            loadState();
            render();

            if (isChecked) {
                if (checkButton) checkButton.style.display = 'none';
                if (resetButton) resetButton.style.display = 'inline-block';

                const allCorrect = items.every((item, index) => userAnswers[index] === item.correct);
                if (allCorrect && feedbackEl) {
                    feedbackEl.textContent = `🎉 Perfekt! Du fikk ${items.length} av ${items.length} riktige!`;
                    feedbackEl.className = 'feedback-message text-success-600';
                }
            } else {
                if (checkButton) checkButton.style.display = 'inline-block';
                if (resetButton) resetButton.style.display = 'none';
            }
        },
    });

    if (exercise) exercise.mount();
    return exercise;
}
