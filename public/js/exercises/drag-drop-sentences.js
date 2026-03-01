/**
 * Drag & Drop Sentences — Migrated to ExerciseBase
 *
 * Click words from the word bank to build a sentence in the drop zone.
 * Each sentence task within the exercise has its own reset and state.
 * Uses ctx.listen() and ctx.setTimeout() for automatic cleanup.
 */

import { createExercise } from './exercise-base.js';
import { loadData, saveData, trackExerciseCompletion, removeExerciseCompletion, getActiveCurriculum } from '../progress/index.js';
import { handleReset } from './core-reset.js';

export function autoSetupDragDropTasks() {
    document.querySelectorAll('.drag-drop-task').forEach(container => {
        const containerId = container.id;
        const dataVariableName = container.dataset.dragDropVariable;
        const dragDropData = window[dataVariableName];

        if (containerId && dragDropData) {
            setupDragDropSentenceTask(containerId, dragDropData);
        } else {
            console.warn(`Kunne ikke starte drag-drop-task for container #${containerId}. Mangler data eller data-variabel.`);
        }
    });
}

export function setupDragDropSentenceTask(containerId, sentences) {
    if (!sentences || sentences.length === 0) return null;

    const chapterId = document.body.dataset.chapterId;
    const curriculum = getActiveCurriculum();
    const storageKey = `${curriculum}-dragdrop-${containerId}-${chapterId}`;

    const exercise = createExercise(containerId, {
        onMount(ctx) {
            const contentArea = ctx.$('.content-area');
            if (contentArea) contentArea.innerHTML = '';

            const savedState = loadData(storageKey) || {};

            sentences.forEach((sentence, index) => {
                const taskWrapper = document.createElement('div');
                taskWrapper.className = 'p-4 border-2 border-neutral-200 rounded-lg bg-neutral-50 mb-4';
                taskWrapper.innerHTML = `
                    <p class="sentence-text font-semibold text-primary-800 bg-primary-100/60 p-3 rounded-md mb-4">${index + 1}. ${sentence.q}</p>
                    <div class="mb-4">
                        <p class="text-sm text-neutral-600 font-semibold mb-1">Din setning:</p>
                        <div class="flex items-center gap-1">
                            <div class="drop-zone flex-grow rounded-md flex flex-wrap gap-2 items-center p-3 bg-surface min-h-[60px] border-2 border-dashed border-neutral-300"></div>
                            <span class="punctuation-mark text-2xl font-bold text-primary-600">${sentence.punctuation || ''}</span>
                        </div>
                    </div>
                    <div>
                        <p class="text-sm text-neutral-600 font-semibold mb-1">Ordbank:</p>
                        <div class="word-bank rounded-md flex flex-wrap gap-2 items-center p-3 min-h-[60px] bg-surface border-2 border-neutral-300"></div>
                    </div>
                    <div class="feedback-message"></div>
                    <div class="mt-4 flex gap-4 justify-center">
                        <button class="reset bg-neutral-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-neutral-600 transition-colors">Start på nytt</button>
                    </div>`;

                const dropZoneEl = taskWrapper.querySelector('.drop-zone');
                const wordBankEl = taskWrapper.querySelector('.word-bank');
                const resetBtn = taskWrapper.querySelector('.reset');
                const feedbackEl = taskWrapper.querySelector('.feedback');

                const populate = () => {
                    wordBankEl.innerHTML = '';
                    dropZoneEl.innerHTML = '';
                    feedbackEl.innerHTML = '';

                    const shuffledWords = [...sentence.words].sort(() => Math.random() - 0.5);
                    shuffledWords.forEach(word => {
                        const div = document.createElement('div');
                        div.textContent = word;
                        div.className = 'clickable-word';
                        div.draggable = false;
                        wordBankEl.appendChild(div);
                    });

                    const sentenceKey = `sentence_${index}`;
                    if (savedState[sentenceKey]) {
                        const savedSentenceState = savedState[sentenceKey];
                        if (savedSentenceState.wordsInDropZone && savedSentenceState.wordsInDropZone.length > 0) {
                            savedSentenceState.wordsInDropZone.forEach(wordText => {
                                const wordElement = Array.from(wordBankEl.children).find(el => el.textContent === wordText);
                                if (wordElement) {
                                    dropZoneEl.appendChild(wordElement);
                                }
                            });
                        }
                        if (savedSentenceState.isCompleted) {
                            feedbackEl.textContent = '🎉 Perfekt! Helt riktig.';
                            feedbackEl.className = 'feedback-message correct';
                            taskWrapper.querySelectorAll('.clickable-word').forEach(w => {
                                w.classList.remove('cursor-pointer', 'hover:bg-primary-200');
                                w.classList.add('cursor-default', 'bg-success-100', 'text-success-800');
                                w.style.pointerEvents = 'none';
                            });
                        }
                    }

                    // Setup click listeners for all clickable words
                    taskWrapper.querySelectorAll('.clickable-word').forEach(word => {
                        ctx.listen(word, 'click', () => {
                            if (word.parentElement === wordBankEl) {
                                dropZoneEl.appendChild(word);
                            } else {
                                wordBankEl.appendChild(word);
                            }
                            saveDragDropState();
                            if (dropZoneEl.children.length === sentence.words.length) {
                                checkAnswer();
                            }
                        });
                    });
                };

                const saveDragDropState = () => {
                    const wordsInDropZone = Array.from(dropZoneEl.querySelectorAll('.clickable-word')).map(el => el.textContent);
                    const sentenceKey = `sentence_${index}`;
                    savedState[sentenceKey] = { wordsInDropZone, isCompleted: false };
                    saveData(storageKey, savedState);
                };

                const checkAnswer = () => {
                    const wordsInDropZone = Array.from(dropZoneEl.querySelectorAll('.clickable-word')).map(el => el.textContent);
                    const userAnswer = wordsInDropZone.join(' ');
                    const correctAnswer = sentence.words.join(' ');
                    const sentenceKey = `sentence_${index}`;
                    if (userAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
                        feedbackEl.textContent = '🎉 Perfekt! Helt riktig.';
                        feedbackEl.className = 'feedback-message correct';
                        taskWrapper.querySelectorAll('.clickable-word').forEach(w => {
                            w.classList.remove('cursor-pointer', 'hover:bg-primary-200');
                            w.classList.add('cursor-default', 'bg-success-100', 'text-success-800');
                            w.style.pointerEvents = 'none';
                        });
                        savedState[sentenceKey] = { wordsInDropZone, isCompleted: true };
                        saveData(storageKey, savedState);

                        const allCompleted = sentences.every((_, idx) => {
                            const key = `sentence_${idx}`;
                            return savedState[key]?.isCompleted === true;
                        });
                        if (allCompleted) {
                            const parentContainer = ctx.container.closest('[id^="extra-exercise"]');
                            const exerciseId = parentContainer ? parentContainer.id : containerId;
                            trackExerciseCompletion(exerciseId);
                        }
                    } else {
                        feedbackEl.textContent = '❌ Ikke helt riktig. Prøv igjen!';
                        feedbackEl.className = 'feedback-message incorrect';
                        dropZoneEl.classList.add('animate-pulse');
                        ctx.setTimeout(() => {
                            dropZoneEl.classList.remove('animate-pulse');
                            feedbackEl.innerHTML = '';
                            delete savedState[sentenceKey];
                            saveData(storageKey, savedState);
                            populate();
                        }, 2000);
                    }
                };

                ctx.listen(resetBtn, 'click', () => {
                    const sentenceKey = `sentence_${index}`;
                    const wasCompleted = savedState[sentenceKey]?.isCompleted;
                    const performReset = () => {
                        if (wasCompleted) {
                            const parentContainer = ctx.container.closest('[id^="extra-exercise"]');
                            const exerciseId = parentContainer ? parentContainer.id : containerId;
                            removeExerciseCompletion(exerciseId);
                        }
                        delete savedState[sentenceKey];
                        saveData(storageKey, savedState);
                        populate();
                    };
                    handleReset(containerId, performReset, wasCompleted);
                });

                populate();
                ctx.container.appendChild(taskWrapper);
            });
        },
    });

    if (exercise) exercise.mount();
    return exercise;
}
