/**
 * Color Picker — Migrated to ExerciseBase
 *
 * Renders interactive color swatches with German color names.
 * No state persistence (pure UI).
 */

import { createExercise } from './exercise-base.js';

const COLORS = [
    { name: 'rot', hex: '#ef4444' },
    { name: 'blau', hex: '#3b82f6' },
    { name: 'grün', hex: '#22c55e' },
    { name: 'gelb', hex: '#eab308' },
    { name: 'schwarz', hex: '#1c1917' },
    { name: 'weiß', hex: '#ffffff' },
    { name: 'grau', hex: '#a8a29e' },
    { name: 'braun', hex: '#78350f' },
    { name: 'orange', hex: '#f97316' },
    { name: 'lila', hex: '#a855f7' },
];

export function setupColorPicker() {
    const exercise = createExercise('color-picker', {
        onMount(ctx) {
            ctx.container.innerHTML = '';
            COLORS.forEach(color => {
                const el = document.createElement('div');
                el.className = 'relative group w-16 h-16 rounded-full cursor-pointer border-2 border-neutral-200';
                el.style.backgroundColor = color.hex;
                el.innerHTML = `<div class="tooltip absolute -top-10 left-1/2 -translate-x-1/2 w-max px-2 py-1 bg-neutral-800 text-white text-sm rounded">${color.name}</div>`;
                ctx.container.appendChild(el);
            });
        },
    });

    if (exercise) exercise.mount();
    return exercise;
}
