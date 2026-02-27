/**
 * Checklist — Migrated to ExerciseBase
 *
 * Per-item checkbox toggle with localStorage persistence.
 * Each list item stores its checked state under a curriculum-scoped key.
 *
 * Storage keys are dynamic (one per <li>), so we build the list at
 * mount time and pass them to storageKeys for cross-tab sync.
 */

import { createExercise, notifyStorageChange } from './exercise-base.js';
import { loadData, saveData } from '../progress/index.js';
import { getActiveCurriculum } from '../progress/store.js';

function buildKey(prefix, chapterId, index) {
    return `${prefix}-checklist-${chapterId}-${index}`;
}

export function setupChecklist() {
    const chapterId = document.body.dataset.chapterId;
    if (!chapterId) return null;

    const curriculumId = getActiveCurriculum();
    // Legacy compatibility: Keep 'tysk' prefix for original course to preserve user data
    const prefix = (curriculumId === 'vg1-tysk1' || curriculumId === 'us-8') ? 'tysk' : curriculumId;

    // Pre-compute storage keys for all items (needed for storageKeys declaration)
    const checklist = document.getElementById('checklist');
    if (!checklist) return null;
    const itemCount = checklist.querySelectorAll('li').length;
    const keys = Array.from({ length: itemCount }, (_, i) => buildKey(prefix, chapterId, i));

    const exercise = createExercise('checklist', {
        storageKeys: keys,

        onMount(ctx) {
            ctx.$$('li').forEach((item, index) => {
                const key = keys[index];
                const box = item.querySelector('.check-box');
                if (!box) return;

                // Restore saved state
                if (loadData(key)) {
                    box.classList.add('bg-primary-500');
                    box.innerHTML = '<span class="flex justify-center items-center text-white font-bold">✓</span>';
                }

                ctx.listen(item, 'click', () => {
                    const isNowChecked = box.classList.toggle('bg-primary-500');
                    box.innerHTML = isNowChecked
                        ? '<span class="flex justify-center items-center text-white font-bold">✓</span>'
                        : '';
                    saveData(key, isNowChecked);
                    notifyStorageChange(key, isNowChecked);
                });
            });
        },

        onStorageChange(ctx, key, newValue) {
            // Cross-tab or cloud-sync updated a checklist item — refresh UI
            const index = keys.indexOf(key);
            if (index === -1) return;
            const item = ctx.$$('li')[index];
            if (!item) return;
            const box = item.querySelector('.check-box');
            if (!box) return;

            if (newValue) {
                box.classList.add('bg-primary-500');
                box.innerHTML = '<span class="flex justify-center items-center text-white font-bold">✓</span>';
            } else {
                box.classList.remove('bg-primary-500');
                box.innerHTML = '';
            }
        },
    });

    if (exercise) exercise.mount();
    return exercise;
}
