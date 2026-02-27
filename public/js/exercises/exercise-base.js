/**
 * =================================================================
 * ExerciseBase Factory - Lifecycle & Cleanup for Exercises
 * =================================================================
 *
 * Solves three problems that every exercise shares:
 *
 * 1. EVENT LISTENER CLEANUP
 *    Every render cycle (innerHTML = ...) orphans listeners on the old
 *    DOM tree. ExerciseBase uses a single AbortController per render
 *    phase. When the phase ends (next render, or destroy), the
 *    controller is aborted and *all* listeners registered through it
 *    are removed — including listeners on `document` or `window`.
 *
 * 2. TIMER CLEANUP
 *    setTimeout / setInterval callbacks that fire after the exercise
 *    is torn down cause errors and stale UI writes. ExerciseBase wraps
 *    them so they are automatically cancelled on phase change.
 *
 * 3. CROSS-MODULE DATA SYNC
 *    If another module (cloud-sync, a second tab, teacher dashboard)
 *    writes to the same storage key, the exercise must update its UI.
 *    ExerciseBase listens to the `storage` event (cross-tab) and an
 *    in-page CustomEvent `exercise-storage-change` (same-tab) and
 *    calls the exercise's `onStorageChange` hook when relevant keys
 *    change.
 *
 * Usage:
 *
 *   import { createExercise } from './exercise-base.js';
 *
 *   const exercise = createExercise('my-exercise-id', {
 *       storageKeys: ['embedded-verb-trainer-my-exercise-id-progress'],
 *
 *       onMount(ctx) {
 *           // Called once. Build initial UI.
 *           // ctx.listen(el, 'click', handler)  — auto-cleaned
 *           // ctx.setTimeout(fn, ms)            — auto-cleaned
 *           // ctx.render(buildNextScreen)        — transition to new phase
 *       },
 *
 *       onStorageChange(ctx, key, newValue) {
 *           // Another module wrote to one of our storageKeys.
 *           // Reconcile UI or re-render.
 *       },
 *
 *       onDestroy() {
 *           // Optional final cleanup (e.g. cancel animations).
 *       }
 *   });
 *
 *   exercise.mount();           // start
 *   exercise.destroy();         // teardown (e.g. on page navigation)
 */

// ─── In-page storage notification ────────────────────────────────
// Modules that write exercise-related keys should fire this after
// saveData() so same-tab exercises can react:
//
//   import { notifyStorageChange } from './exercise-base.js';
//   notifyStorageChange('my-key', newValue);
//
export function notifyStorageChange(key, value) {
    window.dispatchEvent(
        new CustomEvent('exercise-storage-change', { detail: { key, value } })
    );
}

// ─── Factory ─────────────────────────────────────────────────────

export function createExercise(containerId, definition) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`[ExerciseBase] Container #${containerId} not found`);
        return null;
    }

    // Phase tracking — each render() creates a new phase
    let phaseController = null;   // AbortController for current phase
    let phaseTimers = [];         // setTimeout/setInterval IDs
    let destroyed = false;

    // Storage keys this exercise cares about
    const watchedKeys = new Set(definition.storageKeys || []);

    // ─── Context object passed to every hook ─────────────────────
    function buildContext() {
        return {
            container,
            containerId,

            /**
             * Register an event listener that is automatically removed
             * when the current render phase ends or the exercise is
             * destroyed.
             *
             * Works on *any* EventTarget — container children, document,
             * window, etc.
             */
            listen(target, event, handler, options = {}) {
                if (destroyed || !phaseController) return;
                const merged = { ...options, signal: phaseController.signal };
                target.addEventListener(event, handler, merged);
            },

            /**
             * Safe setTimeout — cancelled automatically on phase change.
             */
            setTimeout(fn, ms) {
                if (destroyed) return -1;
                const id = setTimeout(() => {
                    // Remove from tracking after execution
                    phaseTimers = phaseTimers.filter(t => t !== id);
                    if (!destroyed) fn();
                }, ms);
                phaseTimers.push(id);
                return id;
            },

            /**
             * Safe setInterval — cancelled automatically on phase change.
             */
            setInterval(fn, ms) {
                if (destroyed) return -1;
                const id = setInterval(() => {
                    if (destroyed) {
                        clearInterval(id);
                        return;
                    }
                    fn();
                }, ms);
                phaseTimers.push(id);
                return id;
            },

            /**
             * Transition to a new render phase. This:
             * 1. Aborts all listeners from the previous phase
             * 2. Cancels all pending timers from the previous phase
             * 3. Calls `renderFn(ctx)` with a fresh context
             *
             * Use this instead of setting container.innerHTML directly.
             */
            render(renderFn) {
                if (destroyed) return;
                endPhase();
                startPhase();
                renderFn(buildContext());
            },

            /**
             * querySelector scoped to the exercise container.
             */
            $(selector) {
                return container.querySelector(selector);
            },

            /**
             * querySelectorAll scoped to the exercise container.
             */
            $$(selector) {
                return container.querySelectorAll(selector);
            },
        };
    }

    // ─── Phase lifecycle ─────────────────────────────────────────

    function startPhase() {
        phaseController = new AbortController();
        phaseTimers = [];
    }

    function endPhase() {
        // Abort all listeners registered via ctx.listen()
        if (phaseController) {
            phaseController.abort();
            phaseController = null;
        }
        // Cancel all pending timers
        for (const id of phaseTimers) {
            clearTimeout(id);   // works for both setTimeout and setInterval
        }
        phaseTimers = [];
    }

    // ─── Storage sync ────────────────────────────────────────────

    function handleStorageEvent(e) {
        // `storage` event fires for cross-tab changes
        if (destroyed || !e.key || !watchedKeys.has(e.key)) return;
        let newValue = null;
        try { newValue = JSON.parse(e.newValue); } catch { newValue = e.newValue; }
        definition.onStorageChange?.(buildContext(), e.key, newValue);
    }

    function handleInPageStorageEvent(e) {
        // Custom event for same-tab changes from other modules
        if (destroyed) return;
        const { key, value } = e.detail || {};
        if (!key || !watchedKeys.has(key)) return;
        definition.onStorageChange?.(buildContext(), key, value);
    }

    // ─── Public API ──────────────────────────────────────────────

    return {
        mount() {
            destroyed = false;
            startPhase();

            // Wire up storage listeners (on window — survive phase changes)
            window.addEventListener('storage', handleStorageEvent);
            window.addEventListener('exercise-storage-change', handleInPageStorageEvent);

            definition.onMount(buildContext());
        },

        destroy() {
            destroyed = true;
            endPhase();
            window.removeEventListener('storage', handleStorageEvent);
            window.removeEventListener('exercise-storage-change', handleInPageStorageEvent);
            definition.onDestroy?.();
        },

        /** Check if the exercise is still alive */
        get active() { return !destroyed; },
    };
}
