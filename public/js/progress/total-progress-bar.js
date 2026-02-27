/**
 * =================================================================
 * TotalProgressBar - Real-time global progress widget
 * =================================================================
 *
 * A self-contained widget that:
 *   1. Mounts a progress bar into any container (typically the shell header)
 *   2. Subscribes to ProgressHub for real-time updates
 *   3. Does SURGICAL DOM updates (only touches 3 attributes) — never
 *      re-renders the bar HTML or causes layout thrash
 *   4. Cleans up its subscription when destroyed
 *
 * How UI sync works without re-rendering the page:
 *
 *   ┌─────────────┐     emit()     ┌──────────────┐    snapshot    ┌────────────────────┐
 *   │ exercises    │ ──────────────▶│ ProgressHub  │──────────────▶│ TotalProgressBar   │
 *   │ achievements │                │ (pub/sub)    │               │  .update(snapshot)  │
 *   │ cloud-sync   │                │              │               │                    │
 *   │ other tab    │ ─ storage ───▶│              │               │ Only mutates:       │
 *   └─────────────┘                └──────────────┘               │  - bar width (CSS)  │
 *                                                                  │  - label text       │
 *                                                                  │  - bar color (CSS)  │
 *                                                                  └────────────────────┘
 *
 * Usage:
 *
 *   import { mountProgressBar } from './total-progress-bar.js';
 *
 *   // Mount into any element — typically called once from page-init or shell
 *   const bar = mountProgressBar('header-progress-slot');
 *
 *   // Later (SPA navigation):
 *   bar.destroy();
 *
 * The bar also exposes bar.refresh() for imperative updates (e.g. after
 * a bulk import), though in normal flow the hub subscription handles it.
 */

import { progressHub } from './progress-hub.js';

// ─── Color thresholds ────────────────────────────────────────────

function barColorClass(percent) {
    if (percent >= 80) return 'bg-success-500';
    if (percent >= 50) return 'bg-primary-500';
    if (percent >= 20) return 'bg-info-500';
    return 'bg-neutral-400';
}

// ─── Mount ───────────────────────────────────────────────────────

/**
 * Mount a total-progress bar into the given container.
 *
 * @param {string} containerId - ID of the mount point
 * @returns {{ destroy: () => void, refresh: () => void } | null}
 */
export function mountProgressBar(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return null;

    // ── Build static shell (once) ────────────────────────────────
    // We never touch this HTML again. Only the three data-role
    // elements get mutated via update().

    container.innerHTML = `
        <div class="w-full" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-role="root">
            <div class="flex items-center justify-between mb-1">
                <span class="text-sm font-semibold text-neutral-700" data-role="label">Total progresjon: 0%</span>
                <span class="text-xs text-neutral-500" data-role="detail">0 / 0 øvelser</span>
            </div>
            <div class="w-full bg-neutral-200 rounded-full h-2.5 overflow-hidden">
                <div class="h-2.5 rounded-full transition-all duration-500 ease-out bg-neutral-400"
                     data-role="fill"
                     style="width: 0%"></div>
            </div>
        </div>`;

    // Cache element references — these never change
    const root   = container.querySelector('[data-role="root"]');
    const label  = container.querySelector('[data-role="label"]');
    const detail = container.querySelector('[data-role="detail"]');
    const fill   = container.querySelector('[data-role="fill"]');

    // ── Surgical update (no innerHTML, no re-render) ─────────────
    // This is called on every progress event. It touches exactly
    // 4 properties across 3 elements:
    //   1. fill.style.width        (CSS transition handles animation)
    //   2. fill.className          (color swap)
    //   3. label.textContent       (percentage text)
    //   4. detail.textContent      (fraction text)
    //   5. root aria-valuenow      (accessibility)

    let lastPercent = -1;  // Dedup identical updates

    function update(snapshot) {
        const { totalPercent, exercisesCompleted, exercisesTotal } = snapshot;

        // Skip if nothing changed
        if (totalPercent === lastPercent) return;
        lastPercent = totalPercent;

        // 1. Bar width — CSS transition handles the animation
        fill.style.width = `${totalPercent}%`;

        // 2. Bar color — swap class only if the threshold band changed
        const newColor = barColorClass(totalPercent);
        const currentClasses = fill.className;
        if (!currentClasses.includes(newColor)) {
            fill.className = `h-2.5 rounded-full transition-all duration-500 ease-out ${newColor}`;
        }

        // 3. Label text
        label.textContent = `Total progresjon: ${totalPercent}%`;

        // 4. Detail text
        detail.textContent = `${exercisesCompleted} / ${exercisesTotal} øvelser`;

        // 5. ARIA
        root.setAttribute('aria-valuenow', String(totalPercent));
    }

    // ── Initial render ───────────────────────────────────────────
    update(progressHub.getSnapshot());

    // ── Subscribe to live updates ────────────────────────────────
    const unsub = progressHub.on('progress-changed', update);

    // ── Public API ───────────────────────────────────────────────
    return {
        /** Remove the bar and unsubscribe from the hub */
        destroy() {
            unsub();
            container.innerHTML = '';
        },

        /** Force a re-read from storage (e.g. after bulk import) */
        refresh() {
            lastPercent = -1;  // Force update even if percent hasn't changed
            update(progressHub.getSnapshot());
        },
    };
}
