/**
 * Number Grids — Migrated to ExerciseBase
 *
 * Renders number tiles with German number words as tooltips.
 * No state persistence (pure UI).
 */

import { createExercise } from './exercise-base.js';

const NUMBERS_1_16 = [
    'eins','zwei','drei','vier','fünf','sechs','sieben','acht',
    'neun','zehn','elf','zwölf','dreizehn','vierzehn','fünfzehn','sechzehn',
];

const NUMBERS_LARGE = {
    17: 'siebzehn', 18: 'achtzehn', 19: 'neunzehn',
    21: 'einundzwanzig', 22: 'zweiundzwanzig', 23: 'dreiundzwanzig',
    25: 'fünfundzwanzig', 26: 'sechsundzwanzig',
    31: 'einunddreißig', 32: 'zweiunddreißig', 33: 'dreiunddreißig',
    34: 'vierunddreißig', 35: 'fünfunddreißig',
    43: 'dreiundvierzig', 51: 'einundfünfzig', 62: 'zweiundsechzig',
    74: 'vierundsiebzig', 85: 'fünfundachtzig', 96: 'sechsundneunzig',
    100: 'hundert',
};

function renderGrid(ctx, items) {
    ctx.container.innerHTML = '';
    items.forEach(({ number, word }) => {
        const el = document.createElement('div');
        el.className = 'relative group flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-neutral-100 rounded-lg cursor-pointer text-2xl font-bold transition-colors hover:bg-primary-100';
        el.innerHTML = `
      <span>${number}</span>
      <div class="tooltip absolute -top-10 left-1/2 -translate-x-1/2 w-max px-2 py-1 bg-neutral-800 text-white text-sm rounded">${word}</div>`;
        ctx.container.appendChild(el);
    });
}

export function setupNumberGrid() {
    const items = NUMBERS_1_16.map((word, i) => ({ number: i + 1, word }));
    const exercise = createExercise('number-grid', {
        onMount(ctx) { renderGrid(ctx, items); },
    });
    if (exercise) exercise.mount();
    return exercise;
}

export function setupNumberGrid3_3() {
    const items = Object.entries(NUMBERS_LARGE).map(([n, word]) => ({ number: Number(n), word }));
    const exercise = createExercise('number-grid-3-3', {
        onMount(ctx) { renderGrid(ctx, items); },
    });
    if (exercise) exercise.mount();
    return exercise;
}
