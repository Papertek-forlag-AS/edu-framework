/**
 * Interactive Clock for Lesson 2.3 — Migrated to ExerciseBase
 *
 * Whole hours only. User drags the minute hand hitbox, which snaps
 * to the nearest hour and displays "Es ist X Uhr."
 *
 * Drag listeners on `document` are registered once via ctx.listen()
 * and gated by isDragging flag — all cleaned up on destroy.
 */

import { createExercise } from './exercise-base.js';

const GERMAN_HOURS = [
    'zwölf', 'ein', 'zwei', 'drei', 'vier', 'fünf',
    'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf',
];

export function setupInteractiveClock23() {
    const exercise = createExercise('interactive-clock-2-3', {
        onMount(ctx) {
            const clock = ctx.container;
            const hourHand = ctx.$('#hour-hand-2-3');
            const minuteHand = ctx.$('#minute-hand-2-3');
            const minuteHandHitbox = ctx.$('#minute-hand-hitbox-2-3');
            const textOutput = document.getElementById('clock-text-output-2-3');

            if (!hourHand || !minuteHand || !textOutput || !minuteHandHitbox) return;

            let isDragging = false;
            let currentHour = 12;

            function updateClock(hour) {
                currentHour = hour;
                const hourAngle = (hour % 12) * 30;
                hourHand.setAttribute('transform', `rotate(${hourAngle}, 100, 100)`);
                minuteHand.setAttribute('transform', `rotate(0, 100, 100)`);
                minuteHandHitbox.setAttribute('transform', `rotate(0, 100, 100)`);
                textOutput.textContent = `Es ist ${GERMAN_HOURS[hour % 12]} Uhr.`;
            }

            function getAngle(e) {
                const rect = clock.getBoundingClientRect();
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                const x = clientX - rect.left - rect.width / 2;
                const y = clientY - rect.top - rect.height / 2;
                let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
                if (angle < 0) angle += 360;
                return angle;
            }

            // Drag start — on the hitbox element
            ctx.listen(minuteHandHitbox, 'mousedown', (e) => { e.preventDefault(); isDragging = true; });
            ctx.listen(minuteHandHitbox, 'touchstart', (e) => { e.preventDefault(); isDragging = true; }, { passive: false });

            // Drag move — on document, gated by flag
            ctx.listen(document, 'mousemove', (e) => {
                if (!isDragging) return;
                let hour = Math.round(getAngle(e) / 30);
                if (hour === 0) hour = 12;
                updateClock(hour);
            });
            ctx.listen(document, 'touchmove', (e) => {
                if (!isDragging) return;
                e.preventDefault();
                let hour = Math.round(getAngle(e) / 30);
                if (hour === 0) hour = 12;
                updateClock(hour);
            }, { passive: false });

            // Drag end
            ctx.listen(document, 'mouseup', () => { isDragging = false; });
            ctx.listen(document, 'touchend', () => { isDragging = false; });

            // Initialize at 12 o'clock
            updateClock(12);
        },
    });

    if (exercise) exercise.mount();
    return exercise;
}
