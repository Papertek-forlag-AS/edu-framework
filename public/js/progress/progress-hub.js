/**
 * =================================================================
 * ProgressHub - Unified Progress Event Bus
 * =================================================================
 *
 * Problem: Progress changes originate from many places:
 *   - achievements.js (exercise completion, achievement earned)
 *   - cloud-sync.js   (data pulled from Firestore)
 *   - store.js         (direct writes via saveLessonProgress)
 *   - Another browser tab (same user, same localStorage)
 *
 * Each UI widget (progress bar, lesson icons, achievement badges)
 * had to independently listen for 3+ CustomEvents AND the native
 * `storage` event, duplicating filtering logic everywhere.
 *
 * Solution: ProgressHub is a single pub/sub that:
 *   1. Aggregates all sources into one stream
 *   2. Provides typed channels (exercise, achievement, sync, any)
 *   3. Handles cross-tab sync via the native `storage` event
 *   4. Computes derived "total progress" so widgets don't have to
 *   5. Supports cleanup (unsubscribe) for SPA-style navigation
 *
 * Usage:
 *
 *   import { progressHub } from './progress-hub.js';
 *
 *   // Subscribe — returns an unsubscribe function
 *   const unsub = progressHub.on('progress-changed', (snapshot) => {
 *       // snapshot.totalPercent   — 0–100
 *       // snapshot.lessonId       — which lesson changed (or null)
 *       // snapshot.source         — 'exercise' | 'achievement' | 'sync' | 'tab'
 *       updateMyWidget(snapshot);
 *   });
 *
 *   // Later, clean up
 *   unsub();
 *
 *   // Emit from inside achievements.js, cloud-sync.js, etc.:
 *   import { progressHub } from './progress-hub.js';
 *   progressHub.emit({ lessonId: '2-1', source: 'exercise' });
 */

import { getProgressData, getFullProgressData } from './store.js';
import { EXERCISE_DATABASE } from './config.js';

// ─── Snapshot computation ────────────────────────────────────────

/**
 * Compute a lightweight snapshot of total progress across all
 * lessons in the active curriculum. This is the single source of
 * truth that every widget reads from.
 *
 * Returns:
 *   {
 *     totalPercent:       number 0-100,
 *     lessonsStarted:     number,
 *     lessonsTotal:       number,
 *     exercisesCompleted: number,
 *     exercisesTotal:     number,
 *     byLesson: { [lessonId]: { percent, completed, total } }
 *   }
 */
export function computeProgressSnapshot() {
    const progressData = getProgressData();     // active curriculum only
    const lessonIds = Object.keys(EXERCISE_DATABASE);

    let exercisesCompleted = 0;
    let exercisesTotal = 0;
    let lessonsStarted = 0;
    const byLesson = {};

    for (const lessonId of lessonIds) {
        const db = EXERCISE_DATABASE[lessonId];
        const lessonTotal = db.ovelser + db.ekstraovelser;
        exercisesTotal += lessonTotal;

        const lessonProgress = progressData[lessonId];
        const exercises = lessonProgress?.exercises || {};
        const completed = Object.values(exercises).filter(v => v === true).length;
        exercisesCompleted += completed;

        if (lessonProgress) lessonsStarted++;

        byLesson[lessonId] = {
            percent: lessonTotal > 0 ? Math.round((completed / lessonTotal) * 100) : 0,
            completed,
            total: lessonTotal,
        };
    }

    return {
        totalPercent: exercisesTotal > 0
            ? Math.round((exercisesCompleted / exercisesTotal) * 100)
            : 0,
        lessonsStarted,
        lessonsTotal: lessonIds.length,
        exercisesCompleted,
        exercisesTotal,
        byLesson,
    };
}

// ─── Event bus ───────────────────────────────────────────────────

/** @type {Set<(snapshot: object) => void>} */
const listeners = new Set();

/**
 * Subscribe to progress changes.
 * @param {string} _channel  Reserved for future filtering. Pass 'progress-changed'.
 * @param {(snapshot: object) => void} fn
 * @returns {() => void} Unsubscribe function
 */
function on(_channel, fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

/**
 * Notify all subscribers that progress changed.
 * Computes a fresh snapshot and fans it out.
 *
 * @param {{ lessonId?: string, source: string }} meta
 */
function emit(meta = {}) {
    const snapshot = {
        ...computeProgressSnapshot(),
        lessonId: meta.lessonId || null,
        source: meta.source || 'unknown',
    };
    for (const fn of listeners) {
        try { fn(snapshot); }
        catch (err) { console.error('[ProgressHub] Listener error:', err); }
    }
}

/**
 * Get a snapshot without subscribing.
 */
function getSnapshot() {
    return {
        ...computeProgressSnapshot(),
        lessonId: null,
        source: 'query',
    };
}

// ─── Cross-tab sync via native storage event ─────────────────────
// The `storage` event fires when *another* tab writes to localStorage.
// We re-emit so local widgets stay current.

if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
        // Only react to our main progress key
        if (e.key === 'progressData') {
            emit({ source: 'tab' });
        }
    });
}

// ─── Bridge existing CustomEvents ────────────────────────────────
// These are the events already dispatched by achievements.js.
// We bridge them into the hub so widgets only need one subscription.

if (typeof document !== 'undefined') {
    document.addEventListener('exercise-completed', (e) => {
        emit({ lessonId: document.body?.dataset?.chapterId, source: 'exercise' });
    });

    document.addEventListener('exercise-removed', (e) => {
        emit({ lessonId: document.body?.dataset?.chapterId, source: 'exercise' });
    });

    document.addEventListener('progress-updated', (e) => {
        emit({
            lessonId: e.detail?.lessonId || document.body?.dataset?.chapterId,
            source: 'achievement',
        });
    });
}

// ─── Public API ──────────────────────────────────────────────────

export const progressHub = {
    on,
    emit,
    getSnapshot,
};
