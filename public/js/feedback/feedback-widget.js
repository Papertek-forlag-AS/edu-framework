/**
 * =================================================================
 * FEEDBACK WIDGET MODULE
 * =================================================================
 *
 * Floating feedback button and modal for users to report issues
 * from anywhere in the webapp.
 */

import { saveFeedbackReport, createFeedbackReport, FEEDBACK_TYPES, SEVERITY_LEVELS } from './feedback-reports.js';
import { collectFeedbackContext, getContextSummary } from './context-collector.js';
import { isAuthAvailable, getCurrentUser } from '../auth/firebase-client.js';
import { syncAllProgressToCloud } from '../sync/cloud-sync.js';

let widgetContainer = null;
let isModalOpen = false;

/**
 * Type labels in Norwegian
 */
const TYPE_LABELS = {
    [FEEDBACK_TYPES.BUG]: 'Feil/Bug',
    [FEEDBACK_TYPES.CONTENT]: 'Innholdsfeil',
    [FEEDBACK_TYPES.SUGGESTION]: 'Forslag',
    [FEEDBACK_TYPES.ACCESSIBILITY]: 'Tilgjengelighet',
    [FEEDBACK_TYPES.OTHER]: 'Annet'
};

/**
 * Severity labels in Norwegian
 */
const SEVERITY_LABELS = {
    [SEVERITY_LEVELS.LOW]: 'Lav',
    [SEVERITY_LEVELS.MEDIUM]: 'Medium',
    [SEVERITY_LEVELS.HIGH]: 'Hoy'
};

/**
 * Initialize the feedback widget
 * Adds floating button to the page
 */
export function initFeedbackWidget() {
    // Don't initialize twice
    if (widgetContainer) return;

    // Don't show on admin pages
    if (window.location.pathname.startsWith('/admin/')) return;

    // Create container
    widgetContainer = document.createElement('div');
    widgetContainer.id = 'feedback-widget-container';
    document.body.appendChild(widgetContainer);

    // Render the floating button
    renderFloatingButton();
}

/**
 * Render the floating feedback button
 */
function renderFloatingButton() {
    if (!widgetContainer) return;

    widgetContainer.innerHTML = `
        <button
            id="feedback-floating-btn"
            class="fixed bottom-4 right-4 z-50 bg-info-600 hover:bg-info-700 text-white rounded-full p-3 shadow-lg transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-info-400 focus:ring-offset-2"
            aria-label="Gi tilbakemelding"
            title="Gi tilbakemelding"
        >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
        </button>
    `;

    // Attach click handler
    const btn = document.getElementById('feedback-floating-btn');
    if (btn) {
        btn.addEventListener('click', openFeedbackModal);
    }
}

/**
 * Open the feedback modal
 */
export function openFeedbackModal() {
    if (isModalOpen) return;
    isModalOpen = true;

    // Check if user is logged in
    const isLoggedIn = isAuthAvailable() && getCurrentUser() !== null;

    // Collect context
    const context = collectFeedbackContext();
    const contextSummary = getContextSummary(context);

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'feedback-modal';
    modal.className = 'fixed inset-0 bg-neutral-900 bg-opacity-50 flex items-center justify-center z-[100] p-4';

    modal.innerHTML = `
        <div class="bg-surface rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <!-- Header -->
            <div class="sticky top-0 bg-surface border-b border-neutral-200 px-6 py-4 rounded-t-xl">
                <div class="flex justify-between items-center">
                    <h3 class="text-xl font-bold text-info-700">Gi tilbakemelding</h3>
                    <button id="close-feedback-modal" class="text-neutral-400 hover:text-neutral-600 p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Body -->
            <div class="px-6 py-4">
                ${!isLoggedIn ? `
                    <div class="mb-4 p-3 bg-warning-50 border-2 border-warning-200 rounded-lg">
                        <p class="text-sm text-warning-800 font-bold mb-1">Du er ikke logget inn</p>
                        <p class="text-xs text-warning-700">
                            Tilbakemeldingen din lagres bare lokalt og blir <strong>ikke sendt</strong> med mindre du er logget inn.
                        </p>
                    </div>
                ` : ''}

                <!-- Type selector -->
                <div class="mb-4">
                    <label class="block text-sm font-medium text-neutral-700 mb-2">
                        Type tilbakemelding <span class="text-error-600">*</span>
                    </label>
                    <select id="feedback-type" class="w-full p-3 border-2 border-neutral-300 rounded-lg focus:border-info-500 focus:outline-none">
                        <option value="">Velg type...</option>
                        ${Object.entries(TYPE_LABELS).map(([value, label]) =>
                            `<option value="${value}">${label}</option>`
                        ).join('')}
                    </select>
                </div>

                <!-- Comment -->
                <div class="mb-4">
                    <label class="block text-sm font-medium text-neutral-700 mb-2">
                        Beskriv problemet eller forslaget <span class="text-error-600">*</span>
                    </label>
                    <textarea
                        id="feedback-comment"
                        rows="4"
                        class="w-full p-3 border-2 border-neutral-300 rounded-lg focus:border-info-500 focus:outline-none resize-none"
                        placeholder="Forklar hva som skjedde, hva du forventet, eller hva du onsker..."
                    ></textarea>
                    <p class="text-xs text-neutral-500 mt-1">Jo mer detaljer du gir, jo lettere er det a fikse problemet.</p>
                </div>

                <!-- Severity -->
                <div class="mb-4">
                    <label class="block text-sm font-medium text-neutral-700 mb-2">
                        Hvor viktig er dette?
                    </label>
                    <div class="flex gap-4">
                        ${Object.entries(SEVERITY_LABELS).map(([value, label]) => `
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="feedback-severity" value="${value}"
                                    ${value === SEVERITY_LEVELS.MEDIUM ? 'checked' : ''}
                                    class="w-4 h-4 text-info-600 focus:ring-info-500">
                                <span class="text-sm text-neutral-700">${label}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>

                <!-- Technical info checkbox -->
                <div class="mb-4">
                    <label class="flex items-start gap-3 cursor-pointer">
                        <input type="checkbox" id="feedback-include-tech" checked
                            class="w-4 h-4 mt-0.5 text-info-600 focus:ring-info-500 rounded">
                        <div>
                            <span class="text-sm font-medium text-neutral-700">Inkluder teknisk informasjon</span>
                            <p class="text-xs text-neutral-500 mt-0.5">
                                Hjelper oss a finne og fikse problemet raskere. Inkluderer side, nettleser, og eventuelle feilmeldinger.
                            </p>
                        </div>
                    </label>
                </div>

                <!-- Context summary (collapsible) -->
                <details class="mb-4">
                    <summary class="cursor-pointer text-sm text-neutral-600 hover:text-neutral-800 font-medium">
                        Se hva som sendes
                    </summary>
                    <div class="mt-2 p-3 bg-neutral-50 rounded-lg text-xs space-y-1 font-mono">
                        <div><strong>Side:</strong> ${context.pathname}</div>
                        <div><strong>Beskrivelse:</strong> ${context.pageDescription || 'Ukjent'}</div>
                        <div><strong>Komponenter:</strong> ${context.componentStack?.join(', ') || 'Ingen'}</div>
                        <div><strong>Feilmeldinger:</strong> ${context.consoleErrors?.length || 0}</div>
                        <div><strong>Nettleser:</strong> ${getBrowserName(context.userAgent)}</div>
                        <div><strong>Skjermstorrelse:</strong> ${context.viewport?.width}x${context.viewport?.height}</div>
                        ${context.currentLesson ? `<div><strong>Leksjon:</strong> ${context.currentLesson}</div>` : ''}
                    </div>
                </details>
            </div>

            <!-- Footer -->
            <div class="sticky bottom-0 bg-surface border-t border-neutral-200 px-6 py-4 rounded-b-xl">
                <div class="flex gap-3">
                    <button id="cancel-feedback" class="flex-1 bg-neutral-200 text-neutral-700 font-bold py-3 px-4 rounded-lg hover:bg-neutral-300 transition-colors">
                        Avbryt
                    </button>
                    <button id="submit-feedback" class="flex-1 bg-info-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-info-700 transition-colors">
                        Send tilbakemelding
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Store context for submission
    modal.dataset.context = JSON.stringify(context);

    // Attach event handlers
    attachModalHandlers(modal, isLoggedIn);

    // Focus first input
    setTimeout(() => {
        document.getElementById('feedback-type')?.focus();
    }, 100);
}

/**
 * Attach event handlers to the modal
 */
function attachModalHandlers(modal, isLoggedIn) {
    const closeModal = (submitted = false) => {
        modal.remove();
        isModalOpen = false;
    };

    // Close button
    document.getElementById('close-feedback-modal')?.addEventListener('click', () => closeModal());

    // Cancel button
    document.getElementById('cancel-feedback')?.addEventListener('click', () => closeModal());

    // Backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // ESC key
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);

    // Submit button
    document.getElementById('submit-feedback')?.addEventListener('click', () => {
        const type = document.getElementById('feedback-type')?.value;
        const comment = document.getElementById('feedback-comment')?.value?.trim();
        const severity = document.querySelector('input[name="feedback-severity"]:checked')?.value;
        const includeTech = document.getElementById('feedback-include-tech')?.checked;

        // Validation
        if (!type) {
            alert('Velg en type tilbakemelding.');
            document.getElementById('feedback-type')?.focus();
            return;
        }

        if (!comment) {
            alert('Skriv en beskrivelse av problemet eller forslaget.');
            document.getElementById('feedback-comment')?.focus();
            return;
        }

        // Get stored context
        let context = {};
        try {
            context = JSON.parse(modal.dataset.context || '{}');
        } catch (e) {
            context = collectFeedbackContext();
        }

        // Create and save report
        const report = createFeedbackReport({
            type,
            severity: severity || SEVERITY_LEVELS.MEDIUM,
            userComment: comment,
            context,
            includesTechnicalInfo: includeTech
        });

        const success = saveFeedbackReport(report);

        if (success) {
            showSuccessMessage(modal, isLoggedIn);

            // Trigger cloud sync if logged in (syncs feedback to Firestore)
            if (isLoggedIn) {
                syncAllProgressToCloud().catch(err => {
                    console.warn('Could not sync feedback to cloud:', err);
                });
            }
        } else {
            alert('Kunne ikke lagre tilbakemeldingen. Prov igjen senere.');
        }
    });
}

/**
 * Show success message after submission
 */
function showSuccessMessage(modal, isLoggedIn) {
    const successMessage = isLoggedIn
        ? 'Takk for tilbakemeldingen! Den vil bli synkronisert og vurdert.'
        : 'Tilbakemeldingen er lagret lokalt. Logg inn for a sende den til utviklerne.';

    const icon = isLoggedIn ? 'checkmark' : 'save';

    modal.innerHTML = `
        <div class="bg-surface rounded-xl shadow-2xl max-w-lg w-full p-8 text-center">
            <div class="text-6xl mb-4">${isLoggedIn ? '&#10004;' : '&#128190;'}</div>
            <h3 class="text-xl font-bold ${isLoggedIn ? 'text-success-700' : 'text-warning-700'} mb-2">
                ${isLoggedIn ? 'Tilbakemelding sendt!' : 'Lagret lokalt'}
            </h3>
            <p class="text-neutral-600 mb-6">${successMessage}</p>
            <button id="close-success" class="bg-info-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-info-700 transition-colors">
                OK
            </button>
        </div>
    `;

    document.getElementById('close-success')?.addEventListener('click', () => {
        modal.remove();
        isModalOpen = false;
    });

    // Auto-close
    setTimeout(() => {
        if (modal.parentElement) {
            modal.remove();
            isModalOpen = false;
        }
    }, isLoggedIn ? 2500 : 4000);
}

/**
 * Get browser name from user agent
 */
function getBrowserName(userAgent) {
    if (!userAgent) return 'Ukjent';

    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Edg/')) return 'Edge';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Opera') || userAgent.includes('OPR')) return 'Opera';

    return 'Annen nettleser';
}

/**
 * Destroy the feedback widget
 */
export function destroyFeedbackWidget() {
    if (widgetContainer) {
        widgetContainer.remove();
        widgetContainer = null;
    }

    const modal = document.getElementById('feedback-modal');
    if (modal) {
        modal.remove();
        isModalOpen = false;
    }
}

/**
 * Check if the feedback modal is currently open
 */
export function isFeedbackModalOpen() {
    return isModalOpen;
}
