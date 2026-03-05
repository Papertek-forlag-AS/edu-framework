/**
 * Interactive Flashcards — Migrated to ExerciseBase
 *
 * Shows vocabulary cards that flip on click to reveal translations.
 * Control buttons (show all German / show all Norwegian) live outside
 * the container but are cleaned up via ctx.listen().
 *
 * Called repeatedly (tab-changed, vocab-updated) — previous instance
 * is destroyed automatically on each call.
 */

import { createExercise } from './exercise-base.js';
import { loadKnownWordsFromStorage } from '../vocab-trainer-multi/utils/known-words.js';
import { getLessonVocabulary } from '../vocab-trainer-multi/vocabulary-loader.js';

let currentExercise = null;

export async function setupFlashcards(wordBanks = {}) {
    // Destroy previous instance (called repeatedly on tab-change / vocab-updated)
    if (currentExercise) {
        currentExercise.destroy();
        currentExercise = null;
    }

    const chapterId = document.body.dataset.chapterId;
    if (!chapterId) return null;

    const lessonId = chapterId.replace('-', '.');

    const mappedBanks = {
        ordbank: wordBanks.wordBank || {},
        substantivbank: wordBanks.nounBank || {},
        verbbank: wordBanks.verbbank || {},
        adjektivbank: wordBanks.adjectiveBank || {},
    };

    const vocabulary = await getLessonVocabulary(lessonId, mappedBanks);
    const knownWords = new Set(loadKnownWordsFromStorage());

    const exercise = createExercise('flashcard-container', {
        onMount(ctx) {
            ctx.container.innerHTML = '';

            if (vocabulary.length === 0) {
                ctx.container.innerHTML = '<p class="text-center text-neutral-500 py-8">Ingen ord funnet for denne leksjonen.</p>';
                return;
            }

            vocabulary.forEach(item => {
                const isKnown = knownWords.has(item.wordId);
                const frontClass = isKnown ? 'bg-success-100 text-neutral-800' : 'bg-neutral-100 text-neutral-800';
                const backClass = isKnown ? 'bg-success-600 text-white' : 'bg-primary-400 text-white';

                const card = document.createElement('div');
                card.className = 'flashcard h-32 bg-transparent cursor-pointer group perspective';
                card.innerHTML = `
                    <div class="flashcard-inner relative w-full h-full">
                        <div class="flashcard-front absolute w-full h-full flex items-center justify-center ${frontClass} rounded-lg p-2 text-center font-semibold">${item.target}</div>
                        <div class="flashcard-back absolute w-full h-full flex items-center justify-center ${backClass} rounded-lg p-2 text-center font-semibold">${item.native}</div>
                    </div>`;

                ctx.listen(card, 'click', () => card.classList.toggle('flipped'));
                ctx.container.appendChild(card);
            });

            // Control buttons live outside the container
            const showGermanBtn = document.getElementById('show-german-btn');
            const showNorwegianBtn = document.getElementById('show-norwegian-btn');

            if (showGermanBtn) {
                ctx.listen(showGermanBtn, 'click', () => {
                    ctx.$$('.flashcard').forEach(card => card.classList.remove('flipped'));
                });
            }
            if (showNorwegianBtn) {
                ctx.listen(showNorwegianBtn, 'click', () => {
                    ctx.$$('.flashcard').forEach(card => card.classList.add('flipped'));
                });
            }
        },
    });

    if (exercise) {
        exercise.mount();
        currentExercise = exercise;
    }
    return exercise;
}
