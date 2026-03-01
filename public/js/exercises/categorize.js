/**
 * Categorize Exercise — Built on ExerciseBase
 *
 * Sorting/classification exercise: items appear in a pool and students
 * click them to sort into the correct category bucket.
 *
 * Data shape (from exercise schema):
 *   categories: [
 *     { label: "der", items: ["Hund", "Tisch", "Stuhl"] },
 *     { label: "die", items: ["Katze", "Lampe", "Tür"] },
 *     { label: "das", items: ["Buch", "Kind", "Haus"] }
 *   ]
 *
 * Flow:
 *   1. All items from every category are pooled and shuffled.
 *   2. Student selects a category bucket, then clicks an item (or vice versa).
 *   3. Correct placements animate into the bucket; wrong ones shake.
 *   4. Progress is saved per-item so page reloads resume.
 */

import { createExercise } from './exercise-base.js';
import { trackExerciseCompletion, removeExerciseCompletion, getProgressData, getActiveCurriculum } from '../progress/index.js';
import { handleReset } from './core-reset.js';
import { saveExerciseState, loadExerciseState, getExerciseStorageKey } from './storage-utils.js';
import { t } from '../utils/i18n.js';

export function setupCategorizeTask(containerId, categories) {
    if (!categories || categories.length < 2) return null;

    const chapterId = document.body.dataset.chapterId;
    if (!chapterId) return null;

    const curriculum = getActiveCurriculum();

    // Build a flat lookup: item text → category label
    const correctMap = new Map();
    let totalItems = 0;
    for (const cat of categories) {
        for (const item of cat.items) {
            correctMap.set(item, cat.label);
            totalItems++;
        }
    }

    const exercise = createExercise(containerId, {
        onMount(ctx) {
            const poolContainer = ctx.$('.categorize-pool');
            const bucketsContainer = ctx.$('.categorize-buckets');
            const feedbackEl = ctx.$('.feedback-message');
            const resetButton = ctx.$('.reset');

            if (!poolContainer || !bucketsContainer) return;

            // State
            let placed = {};          // { itemText: categoryLabel }
            let selectedBucket = null; // currently active bucket label

            // ─── Load saved state ────────────────────────────────
            const saved = loadExerciseState(curriculum, chapterId, 'categorize', containerId, null);
            if (saved && saved.placed) {
                placed = saved.placed;
            }

            // ─── Shuffle helper ──────────────────────────────────
            function shuffle(arr) {
                const a = [...arr];
                for (let i = a.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [a[i], a[j]] = [a[j], a[i]];
                }
                return a;
            }

            // ─── Render ──────────────────────────────────────────
            function render() {
                // Render category buckets
                bucketsContainer.innerHTML = '';
                for (const cat of categories) {
                    const placedInCat = Object.entries(placed)
                        .filter(([, label]) => label === cat.label)
                        .map(([item]) => item);

                    const bucket = document.createElement('div');
                    bucket.className = 'categorize-bucket border-2 border-neutral-200 rounded-lg p-4 transition-all duration-200 cursor-pointer min-h-[100px]';
                    bucket.dataset.category = cat.label;

                    if (selectedBucket === cat.label) {
                        bucket.classList.remove('border-neutral-200');
                        bucket.classList.add('border-primary-500', 'bg-primary-50', 'ring-2', 'ring-primary-300');
                    }

                    const placedChips = placedInCat.map(item =>
                        `<span class="inline-block bg-success-100 text-success-800 px-3 py-1 rounded-full text-sm font-medium m-1">${item}</span>`
                    ).join('');

                    bucket.innerHTML = `
                        <h4 class="font-bold text-lg mb-2 text-center">${cat.label}</h4>
                        <div class="text-sm text-neutral-400 text-center mb-2">${placedInCat.length} / ${cat.items.length}</div>
                        <div class="flex flex-wrap justify-center">${placedChips}</div>
                    `;

                    ctx.listen(bucket, 'click', () => selectBucket(cat.label));
                    bucketsContainer.appendChild(bucket);
                }

                // Render pool items (unplaced only)
                poolContainer.innerHTML = '';
                const allItems = [];
                for (const cat of categories) {
                    for (const item of cat.items) {
                        if (!placed[item]) {
                            allItems.push(item);
                        }
                    }
                }

                // Shuffle unplaced items for display
                const shuffled = shuffle(allItems);

                if (shuffled.length === 0 && Object.keys(placed).length === totalItems) {
                    // All placed — show nothing in pool
                } else if (shuffled.length === 0) {
                    poolContainer.innerHTML = '<p class="text-neutral-400 text-center py-4">Ingen gjenstående elementer</p>';
                }

                for (const item of shuffled) {
                    const btn = document.createElement('button');
                    btn.className = 'pool-item px-4 py-2 bg-surface border-2 border-neutral-200 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-all duration-200 shadow-sm text-neutral-700 font-medium';
                    btn.textContent = item;
                    btn.dataset.item = item;

                    ctx.listen(btn, 'click', () => handleItemClick(btn, item));
                    poolContainer.appendChild(btn);
                }

                // Check completion
                if (Object.keys(placed).length === totalItems) {
                    handleCompletion();
                }
            }

            // ─── Bucket selection ────────────────────────────────
            function selectBucket(label) {
                selectedBucket = selectedBucket === label ? null : label;
                render();
            }

            // ─── Item click ──────────────────────────────────────
            function handleItemClick(btn, item) {
                if (!selectedBucket) {
                    // Flash hint: select a category first
                    bucketsContainer.querySelectorAll('.categorize-bucket').forEach(b => {
                        b.classList.add('animate-pulse');
                        ctx.setTimeout(() => b.classList.remove('animate-pulse'), 600);
                    });
                    if (feedbackEl) {
                        feedbackEl.textContent = t('categorize_select_category', 'Velg en kategori først!');
                        feedbackEl.className = 'feedback-message';
                    }
                    return;
                }

                const correctCategory = correctMap.get(item);

                if (selectedBucket === correctCategory) {
                    // Correct placement
                    placed[item] = selectedBucket;
                    saveExerciseState(curriculum, chapterId, 'categorize', containerId, { placed });

                    btn.classList.add('bg-success-100', 'border-success-500', 'text-success-800', 'pointer-events-none');
                    btn.classList.remove('hover:border-primary-400', 'hover:bg-primary-50');

                    if (feedbackEl) {
                        feedbackEl.textContent = t('feedback_correct', 'Riktig!');
                        feedbackEl.className = 'feedback-message correct';
                    }

                    ctx.setTimeout(() => render(), 400);
                } else {
                    // Wrong placement — shake
                    btn.classList.add('animate-shake', 'bg-error-100', 'border-error-500', 'text-error-800');

                    if (feedbackEl) {
                        feedbackEl.textContent = t('feedback_try_again', 'Prøv igjen!');
                        feedbackEl.className = 'feedback-message incorrect';
                    }

                    ctx.setTimeout(() => {
                        btn.classList.remove('animate-shake', 'bg-error-100', 'border-error-500', 'text-error-800');
                    }, 800);
                }
            }

            // ─── Completion ──────────────────────────────────────
            function handleCompletion() {
                if (feedbackEl) {
                    feedbackEl.textContent = t('feedback_perfect', '🎉 Perfekt! Alle svarene er riktige!');
                    feedbackEl.className = 'feedback-message correct';
                }
                trackExerciseCompletion(containerId);

                if (typeof confetti === 'function') {
                    confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 0.6 },
                    });
                }
            }

            // ─── Reset ───────────────────────────────────────────
            if (resetButton) {
                ctx.listen(resetButton, 'click', () => {
                    const progress = getProgressData();
                    const lessonId = document.body.dataset.chapterId;
                    const lessonProgress = progress[lessonId] || { exercises: {} };
                    const wasCompleted = lessonProgress.exercises[containerId] === true;

                    const performReset = () => {
                        removeExerciseCompletion(containerId);
                        const storageKey = getExerciseStorageKey(curriculum, chapterId, 'categorize', containerId);
                        localStorage.removeItem(storageKey);
                        placed = {};
                        selectedBucket = null;
                        if (feedbackEl) {
                            feedbackEl.textContent = '';
                            feedbackEl.className = 'feedback-message';
                        }
                        render();
                    };

                    handleReset(containerId, performReset, wasCompleted);
                });
            }

            // Initial render
            render();
        },
    });

    if (exercise) exercise.mount();
    return exercise;
}
