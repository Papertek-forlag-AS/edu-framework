/**
 * Glossary Test Student UI (Gloseprøve - Student Side)
 *
 * Renders in the ordtrener context. Handles:
 * - Code entry modal
 * - Chapter picker (when student-pick mode, filtered to unlocked)
 * - Wraps the shared renderTest() with attempt tracking
 * - Shows result + remaining attempts
 *
 * Uses shared modules from vocab-trainer-multi/ to avoid code duplication.
 */

import {
    getGlossaryTest,
    getStudentResult,
    startTestAttempt,
    submitTestResult,
    subscribeToTestStatus
} from './glossary-test-service.js';

// Grace period in seconds when teacher deactivates test
const DEACTIVATION_GRACE_PERIOD = 60;

// Helper to escape HTML for safe rendering
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Shows the glossary test code entry modal.
 * Called from the ordtrener app when user clicks the Gloseprøve button.
 *
 * @param {Object} deps - Injected dependencies from ordtrener/app.js
 * @param {Function} deps.t - i18n translation function
 * @param {Object} deps.vocabService - VocabProfileService instance
 * @param {Object} deps.blobAdapter - BlobAdapter instance
 * @param {string} deps.activeCurriculumId - Current curriculum ID
 * @param {Object} deps.loadedBanks - Loaded word banks
 * @param {Object} deps.loadedManifest - Loaded vocab manifest
 * @param {Function} deps.setupVocabTrainerMultiChapter - Trainer setup function
 * @param {HTMLElement} deps.exerciseContainer - Exercise container element
 * @param {HTMLElement} deps.viewDashboard - Dashboard view element
 * @param {Function} deps.showAlertModal - Alert modal function
 * @param {Function} deps.getCurriculumConfig - Curriculum config lookup
 * @param {Function} deps.onReturn - Callback when returning to dashboard
 */
export function showGlossaryTestModal(deps) {
    // Remove any existing modal
    const existingModal = document.getElementById('glossary-test-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'glossary-test-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900 bg-opacity-50';
    modal.innerHTML = `
        <div class="bg-surface rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-xl font-bold text-neutral-800">Gloseprøve</h3>
                <button id="gt-close-modal" class="text-neutral-400 hover:text-neutral-600 p-1">
                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <p class="text-sm text-neutral-600 mb-4">Skriv inn prøvekoden du fikk av læreren din.</p>
            <input type="text" id="gt-code-input"
                   class="w-full px-4 py-3 border-2 border-neutral-300 rounded-xl text-center text-2xl font-mono tracking-widest uppercase focus:border-accent2-500 focus:outline-none"
                   placeholder="ABC" maxlength="3" autocomplete="off" autocorrect="off" autocapitalize="characters">
            <div id="gt-error" class="mt-3 hidden bg-error-50 p-3 rounded-xl border border-error-200 text-error-700 text-sm"></div>
            <div id="gt-info" class="mt-3 hidden"></div>
            <button id="gt-submit-code" class="w-full mt-4 bg-accent2-500 hover:bg-accent2-600 text-white font-bold py-3 rounded-xl transition-colors">
                Start prøve
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    const codeInput = modal.querySelector('#gt-code-input');
    const submitBtn = modal.querySelector('#gt-submit-code');
    const errorEl = modal.querySelector('#gt-error');
    const infoEl = modal.querySelector('#gt-info');

    // Auto-format: uppercase and alphanumeric only
    codeInput.addEventListener('input', () => {
        codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });

    // Close modal
    modal.querySelector('#gt-close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    // Submit code
    const handleSubmit = async () => {
        const code = codeInput.value.trim().toUpperCase();
        if (!code || code.length !== 3) {
            errorEl.textContent = 'Prøvekoden skal være 3 tegn.';
            errorEl.classList.remove('hidden');
            return;
        }

        errorEl.classList.add('hidden');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Laster...';

        try {
            const test = await getGlossaryTest(code);
            if (!test) {
                errorEl.textContent = 'Fant ingen prøve med denne koden.';
                errorEl.classList.remove('hidden');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Start prøve';
                return;
            }

            if (!test.active) {
                errorEl.textContent = 'Denne prøven er ikke lenger aktiv.';
                errorEl.classList.remove('hidden');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Start prøve';
                return;
            }

            // Check existing result
            const existingResult = await getStudentResult(code);
            const attemptsUsed = existingResult ? (existingResult.attemptsUsed || 0) : 0;
            const bonusAttempts = existingResult ? (existingResult.bonusAttempts || 0) : 0;
            const totalAllowed = test.maxAttempts + bonusAttempts;

            // If stale inProgress, it was already counted - just let them try again if attempts remain
            if (existingResult && existingResult.inProgress) {
                // Clear the stale flag by starting fresh
            }

            if (attemptsUsed >= totalAllowed) {
                const bestScore = existingResult?.bestScore || 0;
                errorEl.innerHTML = `Du har brukt alle forsøkene dine (${attemptsUsed}/${totalAllowed}).<br>Ditt beste resultat: <strong>${bestScore}%</strong>`;
                errorEl.classList.remove('hidden');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Start prøve';
                return;
            }

            // Calculate remaining attempts (including any bonus attempts)
            const remaining = totalAllowed - attemptsUsed;
            let expirationText = '';
            let expirationClass = 'text-accent2-700';
            if (test._status && test._status.minutesRemaining !== null) {
                const mins = test._status.minutesRemaining;
                if (mins <= 10) {
                    expirationText = `Kun ${mins} minutter igjen!`;
                    expirationClass = 'text-primary-700 font-bold';
                } else if (mins <= 60) {
                    expirationText = `Tid igjen: ${mins} minutter`;
                } else {
                    const hours = Math.floor(mins / 60);
                    const remainMins = mins % 60;
                    expirationText = `Tid igjen: ${hours}t ${remainMins}m`;
                }
            }

            // Transform modal to "Test Ready" state
            const modalContent = modal.querySelector('.bg-surface');
            modalContent.innerHTML = `
                <div class="flex items-center justify-between mb-4">
                    <button id="gt-back-to-code" class="text-neutral-400 hover:text-neutral-600 p-1" title="Tilbake">
                        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                        </svg>
                    </button>
                    <h3 class="text-xl font-bold text-neutral-800">Klar til prøve</h3>
                    <button id="gt-close-modal-2" class="text-neutral-400 hover:text-neutral-600 p-1">
                        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                <div class="bg-gradient-to-br from-accent2-50 to-accent3-50 p-5 rounded-xl border border-accent2-200 mb-4">
                    <h4 class="font-bold text-lg text-accent2-900 mb-3">${escapeHtml(test.title)}</h4>
                    <div class="space-y-2 text-sm">
                        <p class="flex items-center gap-2 text-accent2-700">
                            <span>📚</span>
                            ${test.chapterMode === 'teacher'
                                ? `Kapitler: ${test.chapters.join(', ')}`
                                : 'Du velger kapitler selv'}
                        </p>
                        <p class="flex items-center gap-2 text-accent2-700">
                            <span>🔄</span>
                            Forsøk igjen: <strong>${remaining}</strong> av ${totalAllowed}${bonusAttempts > 0 ? ` <span class="text-success-600 text-xs">(+${bonusAttempts} ekstra)</span>` : ''}
                        </p>
                        ${existingResult?.bestScore !== undefined ? `
                            <p class="flex items-center gap-2 text-accent2-700">
                                <span>🏆</span>
                                Ditt beste: <strong>${existingResult.bestScore}%</strong>
                            </p>
                        ` : ''}
                        ${expirationText ? `
                            <p class="flex items-center gap-2 ${expirationClass}">
                                <span>⏱️</span>
                                ${expirationText}
                            </p>
                        ` : ''}
                    </div>
                </div>

                <div class="bg-primary-50 p-3 rounded-lg border border-primary-200 mb-4 text-sm text-primary-800">
                    <strong>Viktig:</strong> Når du starter prøven teller det som et forsøk.
                </div>

                <button id="gt-start-test" class="w-full bg-gradient-to-r from-accent2-500 to-accent3-500 hover:from-accent2-600 hover:to-accent3-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-xl text-lg">
                    Start prøve
                </button>
            `;

            // Re-attach event listeners
            modal.querySelector('#gt-close-modal-2').addEventListener('click', () => modal.remove());
            modal.querySelector('#gt-back-to-code').addEventListener('click', () => {
                modal.remove();
                showGlossaryTestModal(deps);
            });
            modal.querySelector('#gt-start-test').addEventListener('click', async () => {
                modal.remove();
                if (test.chapterMode === 'teacher') {
                    launchGlossaryTest(deps, test, test.chapters);
                } else {
                    showChapterPicker(deps, test);
                }
            });

        } catch (err) {
            errorEl.textContent = err.message || 'En feil oppstod.';
            errorEl.classList.remove('hidden');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Start prøve';
        }
    };

    submitBtn.addEventListener('click', handleSubmit);
    codeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSubmit(); });
    setTimeout(() => codeInput.focus(), 100);
}

/**
 * Shows a chapter picker for student-pick mode.
 * Only shows unlocked chapters.
 */
function showChapterPicker(deps, test) {
    const { vocabService, activeCurriculumId, showAlertModal } = deps;
    const profile = vocabService.profile;
    const passedTests = new Set((profile?.unlocks?.[test.curriculum]) || []);

    // Determine max chapters from curriculum config
    const config = deps.getCurriculumConfig(test.curriculum);
    const maxChapters = config?.chapters || 12;

    // Build list of unlocked chapters
    const unlockedChapters = [];
    for (let i = 1; i <= maxChapters; i++) {
        if (i === 1 || isChapterTestPassedLocal(i - 1, passedTests)) {
            unlockedChapters.push(i);
        }
    }

    if (unlockedChapters.length === 0) {
        showAlertModal('Du har ingen opplåste kapitler for denne prøven.', 'Ingen kapitler');
        return;
    }

    const selectedSet = new Set();

    const modal = document.createElement('div');
    modal.id = 'glossary-chapter-picker';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900 bg-opacity-50';
    modal.innerHTML = `
        <div class="bg-surface rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 class="text-xl font-bold text-neutral-800 mb-2">Velg kapitler</h3>
            <p class="text-sm text-neutral-600 mb-4">Velg hvilke kapitler du vil bli testet i. Du kan bare velge kapitler du har låst opp.</p>
            <div id="gt-chapter-grid" class="flex flex-wrap gap-3 mb-6">
                ${unlockedChapters.map(ch => `
                    <button class="gt-ch-btn w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm bg-neutral-100 text-neutral-500 transition-all active:scale-95 border-2 border-transparent hover:border-accent2-300"
                            data-chapter="${ch}">
                        ${ch}
                    </button>
                `).join('')}
            </div>
            <button id="gt-start-selected" class="w-full bg-accent2-500 hover:bg-accent2-600 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                Velg minst ett kapittel
            </button>
            <button id="gt-cancel-picker" class="w-full mt-2 text-neutral-500 hover:text-neutral-700 font-medium py-2 transition-colors">
                Avbryt
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    const startBtn = modal.querySelector('#gt-start-selected');
    const cancelBtn = modal.querySelector('#gt-cancel-picker');

    // Chapter toggle
    modal.querySelectorAll('.gt-ch-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const ch = parseInt(btn.dataset.chapter, 10);
            if (selectedSet.has(ch)) {
                selectedSet.delete(ch);
                btn.classList.remove('bg-accent2-500', 'text-white', 'border-accent2-500');
                btn.classList.add('bg-neutral-100', 'text-neutral-500', 'border-transparent');
            } else {
                selectedSet.add(ch);
                btn.classList.remove('bg-neutral-100', 'text-neutral-500', 'border-transparent');
                btn.classList.add('bg-accent2-500', 'text-white', 'border-accent2-500');
            }

            if (selectedSet.size > 0) {
                startBtn.disabled = false;
                startBtn.textContent = `Start prøve (${selectedSet.size} ${selectedSet.size === 1 ? 'kapittel' : 'kapitler'})`;
            } else {
                startBtn.disabled = true;
                startBtn.textContent = 'Velg minst ett kapittel';
            }
        });
    });

    startBtn.addEventListener('click', () => {
        modal.remove();
        launchGlossaryTest(deps, test, Array.from(selectedSet).sort((a, b) => a - b));
    });

    cancelBtn.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

/**
 * Launches the actual glossary test using the shared test engine.
 */
async function launchGlossaryTest(deps, test, chapters) {
    const {
        vocabService, blobAdapter, exerciseContainer, viewDashboard,
        setupVocabTrainerMultiChapter, showAlertModal, onReturn
    } = deps;

    // Start the attempt (increments counter in Firestore)
    let attemptInfo;
    try {
        attemptInfo = await startTestAttempt(test.code);
    } catch (err) {
        showAlertModal(err.message || 'Kunne ikke starte prøven.', 'Feil');
        return;
    }

    if (!attemptInfo.allowed) {
        const totalAllowed = test.maxAttempts + (attemptInfo.bonusAttempts || 0);
        showAlertModal(
            `Du har brukt alle forsøkene dine (${attemptInfo.attemptsUsed}/${totalAllowed}).`,
            'Ingen forsøk igjen'
        );
        return;
    }

    // Show remaining attempts
    const attemptsRemainingText = attemptInfo.attemptsRemaining > 0
        ? `${attemptInfo.attemptsRemaining} forsøk igjen etter dette`
        : 'Siste forsøk!';

    // Hide dashboard, show exercise container
    viewDashboard.classList.add('hidden');
    viewDashboard.style.display = 'none';
    exerciseContainer.classList.remove('hidden');
    exerciseContainer.style.display = 'block';

    // Update header
    const headerTitle = document.querySelector('header h1');
    const originalTitle = headerTitle.innerText;
    headerTitle.innerHTML = `<button id="back-home-gt" class="mr-2 text-neutral-500">&larr;</button> Gloseprøve`;

    // Track if test was completed (vs interrupted)
    let testCompleted = false;
    let unsubscribeFromTest = null;
    let deactivationCountdownInterval = null;
    let forceExitTimeout = null;

    const exitHandler = async () => {
        // Clean up listeners and timers
        if (unsubscribeFromTest) {
            unsubscribeFromTest();
            unsubscribeFromTest = null;
        }
        if (deactivationCountdownInterval) {
            clearInterval(deactivationCountdownInterval);
            deactivationCountdownInterval = null;
        }
        if (forceExitTimeout) {
            clearTimeout(forceExitTimeout);
            forceExitTimeout = null;
        }

        // Remove deactivation warning if present
        const warningEl = document.getElementById('gt-deactivation-warning');
        if (warningEl) warningEl.remove();

        // Restore UI
        viewDashboard.classList.remove('hidden');
        viewDashboard.style.display = '';
        exerciseContainer.classList.add('hidden');
        exerciseContainer.style.display = '';
        exerciseContainer.innerHTML = '';
        headerTitle.innerText = originalTitle;

        if (!testCompleted) {
            // Interrupted - attempt was already counted by startTestAttempt
            showAlertModal(
                'Du avbrøt prøven. Forsøket er brukt.',
                'Prøve avbrutt'
            );
        }

        if (onReturn) onReturn();
    };

    // Show deactivation warning with countdown
    const showDeactivationWarning = (secondsRemaining) => {
        // Remove existing warning if any
        const existingWarning = document.getElementById('gt-deactivation-warning');
        if (existingWarning) existingWarning.remove();

        const warningEl = document.createElement('div');
        warningEl.id = 'gt-deactivation-warning';
        warningEl.className = 'fixed top-0 left-0 right-0 bg-error-600 text-white p-4 z-[200] text-center shadow-lg';
        warningEl.innerHTML = `
            <div class="flex items-center justify-center gap-3">
                <span class="text-2xl">⚠️</span>
                <span class="font-bold">Prøven er avsluttet av læreren!</span>
                <span id="gt-deactivation-countdown" class="bg-surface text-error-600 px-3 py-1 rounded-full font-mono font-bold">${secondsRemaining}s</span>
            </div>
            <p class="text-sm mt-1 opacity-90">Fullfør raskt - du blir logget ut automatisk.</p>
        `;
        // Append inside the test container (gt-test-area) so it renders on top of
        // the fullscreen test overlay (which uses fixed inset-0 z-50 on the container).
        // Appending to document.body would place it behind the test's fullscreen layer.
        const testContainer = document.getElementById('gt-test-area');
        (testContainer || document.body).appendChild(warningEl);

        // Start countdown
        let remaining = secondsRemaining;
        const countdownEl = warningEl.querySelector('#gt-deactivation-countdown');

        deactivationCountdownInterval = setInterval(() => {
            remaining--;
            if (countdownEl) countdownEl.textContent = `${remaining}s`;
            if (remaining <= 0) {
                clearInterval(deactivationCountdownInterval);
            }
        }, 1000);

        // Force exit after grace period
        forceExitTimeout = setTimeout(() => {
            testCompleted = false; // Mark as interrupted
            exitHandler();
            showAlertModal(
                'Prøven ble avsluttet av læreren. Resultatet er ikke lagret.',
                'Prøve avsluttet'
            );
        }, secondsRemaining * 1000);
    };

    // Subscribe to realtime test status changes
    unsubscribeFromTest = subscribeToTestStatus(test.code, (status) => {
        // Only trigger warning if we haven't completed and test is now inactive
        if (!testCompleted && !status.isActive) {
            // Check if this is a new deactivation (not already showing warning)
            const existingWarning = document.getElementById('gt-deactivation-warning');
            if (!existingWarning) {
                showDeactivationWarning(DEACTIVATION_GRACE_PERIOD);
            }
        }

        // Update expiresAt if it changed (teacher extended time)
        if (status.expiresAt && status.expiresAt !== test.expiresAt) {
            test.expiresAt = status.expiresAt;
            // Update the global test context if it exists (for timer updates)
            if (window._glossaryTestExpiresAt !== undefined) {
                window._glossaryTestExpiresAt = status.expiresAt;
            }
        }
    });

    document.getElementById('back-home-gt').onclick = () => {
        // Warn before leaving
        if (!testCompleted) {
            const confirmed = confirm('Er du sikker på at du vil avbryte? Forsøket teller som brukt.');
            if (!confirmed) return;
        }
        exitHandler();
    };

    // Show attempts info banner before starting
    exerciseContainer.innerHTML = `
        <div class="max-w-2xl mx-auto p-6 mt-8">
            <div class="bg-accent2-50 p-4 rounded-xl border border-accent2-200 mb-6 text-center">
                <h3 class="text-lg font-bold text-accent2-800 mb-1">${test.title}</h3>
                <p class="text-sm text-accent2-700">Kapitler: ${chapters.join(', ')}</p>
                <p class="text-sm text-accent2-700 font-medium mt-1">${attemptsRemainingText}</p>
            </div>
            <div id="gt-test-area"></div>
        </div>
    `;

    // Initialize the test using the shared trainer
    const api = await setupVocabTrainerMultiChapter('gt-test-area', chapters, {
        allowedModes: ['test'],
        expiresAt: test.expiresAt || null, // Pass expiration timestamp for timer display
        glossaryTestCode: test.code, // Pass test code for progress validation
        onExit: async () => {
            // Check for results in localStorage
            const resultJson = localStorage.getItem('vocab-test-results-glossary');
            if (resultJson) {
                try {
                    const result = JSON.parse(resultJson);
                    const resultTime = new Date(result.timestamp).getTime();
                    const isRecent = (Date.now() - resultTime) < 120000;

                    if (isRecent) {
                        testCompleted = true;

                        // Calculate total questions from percentage and correct count
                        const totalQuestions = result.percentage > 0
                            ? Math.round(result.correctCount * 100 / result.percentage)
                            : result.correctCount;

                        // Submit to Firestore with extended scoring
                        const submission = await submitTestResult(test.code, {
                            percentage: result.percentage,
                            correct: result.correctCount,
                            total: totalQuestions,
                            finalScore: result.score || 0,
                            totalVocab: result.totalVocab || 0,
                            genderAccuracy: result.genderPercentage ?? null,
                            chapters
                        });

                        // Show result with attempts info
                        showGlossaryTestResult(deps, test, result, submission, exitHandler);
                        return; // Don't call exitHandler yet - the result screen handles it
                    }
                } catch (err) {
                    console.error('Error submitting glossary test result:', err);
                }
            }

            exitHandler();
        },
        testType: 'glossary'
    });

    if (api) api.startMode('test');
}

/**
 * Shows the glossary test result screen with attempts info.
 */
function showGlossaryTestResult(deps, test, result, submission, exitHandler) {
    const { exerciseContainer } = deps;

    // Calculate display values
    const totalQuestions = result.percentage > 0
        ? Math.round(result.correctCount * 100 / result.percentage)
        : result.correctCount;
    const finalScore = result.score || 0;
    const totalVocab = result.totalVocab || 0;
    const genderPct = result.genderPercentage;
    const hasGenderData = result.genderTotal > 0;

    // Build the result display
    exerciseContainer.innerHTML = `
        <div class="max-w-2xl mx-auto p-6 mt-8">
            <div class="bg-surface p-6 rounded-2xl shadow-lg border border-neutral-200">
                <h3 class="text-2xl font-bold text-center mb-4 ${result.percentage >= 80 ? 'text-success-700' : 'text-primary-700'}">
                    Prøve fullført!
                </h3>

                <div class="text-center mb-4">
                    <div class="text-5xl font-black ${result.percentage >= 80 ? 'text-success-600' : 'text-primary-600'} mb-2">
                        ${result.percentage}%
                    </div>
                    <p class="text-neutral-600">${result.correctCount} av ${totalQuestions} riktige</p>
                </div>

                ${totalVocab > 0 ? `
                    <div class="text-center mb-4">
                        <p class="text-lg font-bold text-neutral-700">Score: <span class="${result.percentage >= 80 ? 'text-success-600' : 'text-primary-600'}">${finalScore}</span> / ${totalVocab}</p>
                        <p class="text-xs text-neutral-400">Estimert ordmestring av ${totalVocab} gloser</p>
                    </div>
                ` : ''}

                ${hasGenderData ? `
                    <div class="text-center mb-6 bg-neutral-50 p-2 rounded-lg border border-neutral-200">
                        <p class="text-sm text-neutral-600">Kjønn (der/die/das): <strong class="${genderPct >= 80 ? 'text-success-600' : genderPct >= 50 ? 'text-primary-600' : 'text-error-600'}">${genderPct}%</strong>
                        <span class="text-xs text-neutral-400 ml-1">(${result.genderCorrectCount}/${result.genderTotal})</span></p>
                    </div>
                ` : '<div class="mb-6"></div>'}

                ${submission.isNewBest && submission.attemptsUsed > 1 ? `
                    <div class="bg-success-50 p-3 rounded-xl border border-success-200 text-center mb-4">
                        <p class="text-success-800 font-bold">Ny personlig rekord!</p>
                    </div>
                ` : ''}

                ${!submission.isNewBest && submission.attemptsUsed > 1 ? `
                    <div class="bg-neutral-50 p-3 rounded-xl border border-neutral-200 text-center mb-4">
                        <p class="text-neutral-600">Ditt beste resultat er fortsatt <strong>${submission.bestScore}%</strong></p>
                    </div>
                ` : ''}

                <div class="bg-accent2-50 p-3 rounded-xl border border-accent2-200 text-center mb-6">
                    <p class="text-accent2-700 text-sm">
                        Forsøk brukt: <strong>${submission.attemptsUsed}</strong> av ${test.maxAttempts + (submission.bonusAttempts || 0)}
                        ${submission.attemptsRemaining > 0
                            ? ` — <strong>${submission.attemptsRemaining}</strong> forsøk igjen`
                            : ' — ingen forsøk igjen'}
                    </p>
                </div>

                <div class="flex flex-col gap-3">
                    ${submission.attemptsRemaining > 0 ? `
                        <button id="gt-retry" class="w-full bg-accent2-500 hover:bg-accent2-600 text-white font-bold py-3 rounded-xl transition-colors">
                            Prøv igjen
                        </button>
                    ` : ''}
                    <button id="gt-back" class="w-full bg-neutral-200 hover:bg-neutral-300 text-neutral-700 font-bold py-3 rounded-xl transition-colors">
                        Tilbake til ordtreneren
                    </button>
                </div>
            </div>
        </div>
    `;

    const retryBtn = exerciseContainer.querySelector('#gt-retry');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            // Clear the results so the test can start fresh
            localStorage.removeItem('vocab-test-results-glossary');
            localStorage.removeItem('vocab-test-progress-glossary');

            // Determine chapters
            const chapters = test.chapterMode === 'teacher'
                ? test.chapters
                : (result.chapters || test.chapters);

            launchGlossaryTest(deps, test, chapters);
        });
    }

    exerciseContainer.querySelector('#gt-back').addEventListener('click', exitHandler);
}

// Local helper - mirrors app.js logic
function isChapterTestPassedLocal(chapterNum, unlockedSet) {
    return unlockedSet.has(String(chapterNum)) || unlockedSet.has(`${chapterNum}.1`);
}
