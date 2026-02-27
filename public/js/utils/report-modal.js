/**
 * =================================================================
 * ANSWER REPORT MODAL
 * =================================================================
 *
 * Modal dialog for students to report answers they believe should be correct
 */

import { saveAnswerReport, createReport } from './answer-reports.js';
import { isAuthAvailable, getCurrentUser } from '../auth/firebase-client.js';

/**
 * Show report modal for a wrong answer
 * @param {Object} answerData - The answer data to report
 * @param {HTMLElement} container - Optional container to append modal to (defaults to document.body)
 * @returns {Promise<boolean>} True if report was submitted
 */
export function showReportModal(answerData, container = null) {
    return new Promise((resolve) => {
        // Check if user is logged in
        const isLoggedIn = isAuthAvailable() && getCurrentUser() !== null;

        // Use provided container or default to document.body
        const targetContainer = container || document.body;

        // Create modal backdrop
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-neutral-900 bg-opacity-50 flex items-center justify-center z-[100] p-4';
        modal.id = 'report-modal';

        modal.innerHTML = `
            <div class="bg-surface rounded-xl shadow-2xl max-w-md w-full p-6 relative">
                <button id="close-report-modal" class="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <h3 class="text-xl font-bold text-primary-700 mb-4">Rapporter svar</h3>

                ${!isLoggedIn ? `
                    <div class="mb-4 p-3 bg-warning-50 border-2 border-warning-200 rounded-lg">
                        <p class="text-sm text-warning-800 font-bold mb-2">⚠️ Du er ikke logget inn</p>
                        <p class="text-xs text-warning-700 mb-2">
                            Rapporten din lagres bare lokalt på denne enheten og blir <strong>ikke sendt til utviklerne</strong> med mindre du er logget inn.
                        </p>
                        <p class="text-xs text-warning-700">
                            Din kommune eller fylkeskommune må kontakte eieren av Papertek for å få påloggingstilgang for elever og lærere.
                            Se <a href="https://papertek.no" target="_blank" class="underline font-bold">papertek.no</a> for mer informasjon.
                        </p>
                    </div>
                ` : ''}

                <div class="mb-4 p-3 bg-neutral-50 rounded-lg text-sm">
                    <p class="text-neutral-600 mb-1"><strong>Spørsmål:</strong> ${answerData.prompt}</p>
                    <p class="text-neutral-600 mb-1"><strong>Ditt svar:</strong> <span class="text-error-600">${answerData.userAnswer}</span></p>
                    <p class="text-neutral-600"><strong>Forventet svar:</strong> <span class="text-success-600">${answerData.correctAnswer}</span></p>
                    ${answerData.isNoun ? `
                        <p class="text-neutral-600 mt-1">
                            <strong>Kjønn:</strong>
                            ${answerData.userGender ? `<span class="${answerData.userGender === answerData.correctGender ? 'text-success-600' : 'text-error-600'}">${answerData.userGender}</span>` : '<span class="text-warning-600">ikke valgt</span>'}
                            / <span class="text-success-600">${answerData.correctGender}</span>
                        </p>
                    ` : ''}
                </div>

                <div class="mb-4">
                    <label for="report-comment" class="block text-sm font-medium text-neutral-700 mb-2">
                        Hvorfor mener du svaret ditt burde vært godtatt? <span class="text-error-600">*</span>
                    </label>
                    <textarea
                        id="report-comment"
                        rows="4"
                        class="w-full p-3 border-2 border-neutral-300 rounded-lg focus:border-primary-500 focus:outline-none"
                        placeholder="Forklar hvorfor du mener svaret ditt er riktig..."
                        required
                    ></textarea>
                    <p class="text-xs text-neutral-500 mt-1">Forklar tydelig hvorfor du mener svaret burde vært godkjent. Dette hjelper oss med å forbedre appen!</p>
                </div>

                <div class="flex gap-3">
                    <button id="cancel-report" class="flex-1 bg-neutral-200 text-neutral-700 font-bold py-3 px-4 rounded-lg hover:bg-neutral-300 transition-colors">
                        Avbryt
                    </button>
                    <button id="submit-report" class="flex-1 bg-primary-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-600 transition-colors">
                        Send rapport
                    </button>
                </div>
            </div>
        `;

        targetContainer.appendChild(modal);

        const commentInput = modal.querySelector('#report-comment');
        const submitBtn = modal.querySelector('#submit-report');
        const cancelBtn = modal.querySelector('#cancel-report');
        const closeBtn = modal.querySelector('#close-report-modal');

        // Focus comment input
        setTimeout(() => commentInput.focus(), 100);

        const closeModal = (submitted = false) => {
            modal.remove();
            resolve(submitted);
        };

        // Submit handler
        submitBtn.addEventListener('click', () => {
            const comment = commentInput.value.trim();

            if (!comment) {
                alert('Du må skrive en forklaring før du kan sende rapporten.');
                commentInput.focus();
                return;
            }

            // Create and save report
            const report = createReport({
                ...answerData,
                studentComment: comment
            });

            const success = saveAnswerReport(report);

            if (success) {
                // Show success message
                const successMessage = isLoggedIn
                    ? 'Takk for rapporten! Den vil bli synkronisert til skyen og vurdert av utviklerne.'
                    : 'Rapporten er lagret lokalt på denne enheten. Den vil <strong>ikke</strong> bli sendt til utviklerne før du logger inn.';

                const icon = isLoggedIn ? '✅' : '💾';
                const titleColor = isLoggedIn ? 'text-success-700' : 'text-warning-700';

                modal.innerHTML = `
                    <div class="bg-surface rounded-xl shadow-2xl max-w-md w-full p-6 text-center">
                        <div class="text-6xl mb-4">${icon}</div>
                        <h3 class="text-xl font-bold ${titleColor} mb-2">Rapport lagret!</h3>
                        <p class="text-neutral-600 mb-4">
                            ${successMessage}
                        </p>
                        ${!isLoggedIn ? `
                            <p class="text-xs text-warning-600 mb-4">
                                💡 Logg inn for å sende rapporten til utviklerne.
                            </p>
                        ` : ''}
                        <button id="close-success" class="bg-primary-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-600 transition-colors">
                            OK
                        </button>
                    </div>
                `;

                modal.querySelector('#close-success').addEventListener('click', () => closeModal(true));

                // Auto-close after 3 seconds (longer if not logged in so they can read the warning)
                setTimeout(() => closeModal(true), isLoggedIn ? 2000 : 3000);
            } else {
                alert('Kunne ikke lagre rapporten. Prøv igjen senere.');
            }
        });

        // Cancel handlers
        cancelBtn.addEventListener('click', () => closeModal(false));
        closeBtn.addEventListener('click', () => closeModal(false));

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(false);
            }
        });

        // Close on ESC key
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal(false);
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    });
}
