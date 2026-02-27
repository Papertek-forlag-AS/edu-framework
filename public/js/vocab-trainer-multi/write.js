import { createSpecialCharsComponent } from '../ui.js';
import { isAnswerCorrect } from './utils.js';
import { showReportModal } from '../utils/report-modal.js';
import { vt, getNativeLabel, getTargetLabel } from './i18n-helper.js';
import { genusToArticle } from '../core/language-utils.js';

// iOS-aligned: Maximum 20 words per session
const SESSION_SIZE = 20;

/**
 * Get the unique identifier for a word (for known words storage)
 * Uses wordId (wordbank key) if available, falls back to target for backwards compatibility
 */
function getWordKey(word) {
    return word.wordId || word.target;
}

export function renderSkriv(container, context) {
    const { vocabulary, knownWords, adapter, isLessonMode } = context;

    // First, filter out known words
    const learningWords = vocabulary.filter(word => !knownWords.has(getWordKey(word)));

    // Filter words based on mode
    let allAvailableWords;
    if (isLessonMode) {
        // Lesson-specific mode: Show ALL learning words (no SSR filtering)
        // This is because lessons have fewer words and SSR would make them run out quickly
        allAvailableWords = learningWords;
    } else if (adapter && adapter.getDueWords) {
        // V3.7 Spec: Write mode shows ONLY words that are DUE for review (symmetrical with Flashcards)
        const allWordIds = learningWords.map(word => getWordKey(word));
        const dueWordIds = new Set(adapter.getDueWords(allWordIds));
        allAvailableWords = learningWords.filter(word => dueWordIds.has(getWordKey(word)));
    } else {
        // Fallback for legacy mode (no adapter): show all learning words
        allAvailableWords = learningWords;
    }

    // Shuffle available words
    allAvailableWords = allAvailableWords.sort(() => Math.random() - 0.5);

    // iOS-aligned: Limit session to SESSION_SIZE (20) words
    let skriVocabulary = allAvailableWords.slice(0, SESSION_SIZE);

    if (skriVocabulary.length === 0) {
        // V3.7 Spec: Different empty states depending on whether words exist but aren't due
        const hasLearningWords = learningWords.length > 0;

        if (hasLearningWords) {
            // Words exist but none are due for review (SM-2 scheduling)
            container.innerHTML = `
                <div class="p-6 border rounded-lg bg-surface shadow-lg text-center">
                    <h3 class="text-xl font-bold text-accent2-700 mb-4">${vt('wr_no_words_now')}</h3>
                    <p class="text-neutral-600 mb-4">${vt('wr_words_scheduled')}</p>
                    <p class="text-neutral-600 mb-6">${vt('wr_come_back')}</p>
                    <p class="text-neutral-500 text-sm mb-6">${vt('wr_tip_match_test')}</p>
                    <button id="back-to-menu-btn" class="bg-primary-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-600 transition-colors">
                        ${vt('wr_back_to_menu')}
                    </button>
                </div>
            `;
            container.querySelector('#back-to-menu-btn').addEventListener('click', () => {
                if (context.onExit) {
                    context.onExit();
                } else {
                    window.location.reload();
                }
            });
            return;
        }

        // All words marked as known
        container.innerHTML = `<p class="text-neutral-500 text-center py-8">${vt('wr_all_known')}</p>`;
        return;
    }

    // Track remaining words for "Next Session" functionality
    let remainingWords = allAvailableWords.slice(SESSION_SIZE);

    let currentIndex = 0;
    let isCorrecting = false;
    let score = 0;
    let sessionPoints = 0; // Track points earned in this session
    let genderAnswers = []; // Track gender answers separately
    let usingNativeFullscreen = false;
    let isExiting = false;
    let lastWrongAnswer = null; // Track last wrong answer for reporting

    // Fullscreen helpers
    const isInNativeFullscreen = () => {
        return !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
    };

    const applyFakeFullscreen = () => {
        container.classList.add(
            'fixed', 'inset-0', 'z-50',
            'w-full', 'h-full', 'min-h-screen',
            'bg-surface', 'overflow-y-auto', 'p-4',
            'flex', 'items-center', 'justify-center'
        );
        document.body.style.overflow = 'hidden';
    };

    const enterFullscreen = () => {
        if (isInNativeFullscreen()) {
            container.classList.add(
                'w-full', 'h-full', 'min-h-screen',
                'bg-surface', 'overflow-y-auto', 'p-4',
                'flex', 'items-center', 'justify-center'
            );
            usingNativeFullscreen = true;
            return;
        }

        const requestFullscreen = container.requestFullscreen ||
            container.webkitRequestFullscreen ||
            container.msRequestFullscreen;

        if (requestFullscreen) {
            const fullscreenPromise = requestFullscreen.call(container);

            if (fullscreenPromise && typeof fullscreenPromise.then === 'function') {
                fullscreenPromise
                    .then(() => {
                        container.classList.add(
                            'w-full', 'h-full', 'min-h-screen',
                            'bg-surface', 'overflow-y-auto', 'p-4',
                            'flex', 'items-center', 'justify-center'
                        );
                        usingNativeFullscreen = true;
                    })
                    .catch(() => {
                        applyFakeFullscreen();
                        usingNativeFullscreen = false;
                    });
            } else {
                container.classList.add(
                    'w-full', 'h-full', 'min-h-screen',
                    'bg-surface', 'overflow-y-auto', 'p-4',
                    'flex', 'items-center', 'justify-center'
                );
                usingNativeFullscreen = true;
            }
        } else {
            applyFakeFullscreen();
            usingNativeFullscreen = false;
        }
    };

    const exitFullscreen = () => {
        container.classList.remove(
            'fixed', 'inset-0', 'z-50',
            'w-full', 'h-full', 'min-h-screen',
            'bg-surface', 'overflow-y-auto', 'p-4',
            'flex', 'items-center', 'justify-center'
        );
        document.body.style.overflow = '';

        if (isInNativeFullscreen()) {
            const exitMethod = document.exitFullscreen ||
                document.webkitExitFullscreen ||
                document.msExitFullscreen;

            if (exitMethod) {
                const exitPromise = exitMethod.call(document);
                if (exitPromise && typeof exitPromise.catch === 'function') {
                    exitPromise.catch(() => { /* silently ignore */ });
                }
            }
        }
        usingNativeFullscreen = false;
    };

    const handleExit = async () => {
        if (isExiting) return;
        isExiting = true;

        document.removeEventListener('fullscreenchange', onFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
        document.removeEventListener('mozfullscreenchange', onFullscreenChange);
        document.removeEventListener('MSFullscreenChange', onFullscreenChange);
        document.removeEventListener('keydown', onKeyDown);

        exitFullscreen();

        // Ensure points are saved before showing summary
        if (adapter && adapter.save) {
            await adapter.save();
        }

        // Show summary screen with points (like flashcards)
        showEarlyExitSummary();
    };

    const showEarlyExitSummary = () => {
        const wordsCompleted = currentIndex;
        const genderCorrectCount = genderAnswers.filter(a => a.correct).length;
        const genderPercentage = genderAnswers.length > 0
            ? Math.round((genderCorrectCount / genderAnswers.length) * 100)
            : 0;
        const percentage = wordsCompleted > 0 ? Math.round((score / wordsCompleted) * 100) : 0;

        // Points display
        const pointsHtml = sessionPoints > 0 ? `
            <div class="flex items-center justify-center gap-2 mb-4">
                <span class="text-3xl font-bold text-primary-500">+${sessionPoints}</span>
                <span class="text-lg text-neutral-600">${vt('wr_points')}</span>
            </div>
        ` : '';

        // Words completed text (shows X / Y if early exit)
        const wordsCompletedText = wordsCompleted < skriVocabulary.length
            ? `${wordsCompleted} / ${skriVocabulary.length}`
            : `${skriVocabulary.length}`;

        // Ordtrener link (only in lesson mode)
        const ordtrenerLinkHtml = isLessonMode ? `
            <div class="mt-6 pt-4 border-t border-neutral-200">
                <p class="text-neutral-600 text-sm mb-3">${vt('wr_more_chapters_question')}</p>
                <a href="/ordtrener/" class="inline-flex items-center gap-2 bg-info-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-info-700 transition-colors">
                    <span>${vt('wr_go_to_ordtrener')}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                </a>
            </div>
        ` : '';

        container.innerHTML = `
            <div class="p-6 border rounded-lg bg-surface shadow-lg text-center max-w-md mx-auto">
                <h3 class="text-2xl font-bold text-neutral-800 mb-4">${vt('wr_session_ended')}</h3>
                ${pointsHtml}
                <p class="text-lg mb-2">${vt('fc_went_through')} <span class="font-bold text-accent2-600">${wordsCompletedText}</span> ${vt('fc_words')}.</p>

                ${wordsCompleted > 0 ? `
                    <div class="grid ${genderAnswers.length > 0 ? 'grid-cols-2' : 'grid-cols-1'} gap-4 my-4">
                        <div class="bg-neutral-50 p-3 rounded-lg border border-neutral-200 text-center">
                            <p class="text-xs text-neutral-500 mb-1">${vt('wr_words_correct')}</p>
                            <p class="text-2xl font-bold text-success-600">${percentage}%</p>
                            <p class="text-xs text-neutral-400">${score} / ${wordsCompleted}</p>
                        </div>
                        ${genderAnswers.length > 0 ? `
                            <div class="bg-neutral-50 p-3 rounded-lg border border-neutral-200 text-center">
                                <p class="text-xs text-neutral-500 mb-1">${vt('wr_gender_correct')}</p>
                                <p class="text-2xl font-bold text-info-600">${genderPercentage}%</p>
                                <p class="text-xs text-neutral-400">${genderCorrectCount} / ${genderAnswers.length}</p>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}

                <button id="back-to-menu-btn" class="bg-primary-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-600 transition-colors">
                    ${vt('fc_back_to_menu')}
                </button>

                ${ordtrenerLinkHtml}
            </div>
        `;

        container.querySelector('#back-to-menu-btn').addEventListener('click', () => {
            if (context.onExit) {
                context.onExit();
            } else {
                window.location.reload();
            }
        });

        // Scroll into view
        setTimeout(() => {
            container.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    };

    const onFullscreenChange = () => {
        if (!isInNativeFullscreen() && usingNativeFullscreen) {
            handleExit();
        }
    };

    const onKeyDown = (e) => {
        if (e.key === 'Escape' && !usingNativeFullscreen) {
            handleExit();
        }
    };

    // Attach listeners
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('mozfullscreenchange', onFullscreenChange);
    document.addEventListener('MSFullscreenChange', onFullscreenChange);
    document.addEventListener('keydown', onKeyDown);

    const targetLangLabel = getTargetLabel(context.config?.languageConfig?.dataKeys?.target || 'german');

    container.innerHTML = `
            <button id="exit-skriv-btn" class="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 transition-colors z-50 p-2 bg-white/80 rounded-full backdrop-blur-sm" title="${vt('wr_exit')}">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <div class="w-full max-w-2xl p-4 sm:p-6 border rounded-lg bg-neutral-50 shadow-lg">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-primary-700">${vt('wr_title')}</h3>
                    <p class="text-sm font-semibold text-neutral-500">${vt('wr_question')} <span id="skriv-progress">${currentIndex + 1}</span> / ${skriVocabulary.length}</p>
                </div>
                <div class="w-full bg-neutral-200 rounded-full h-2 mb-6">
                    <div id="skriv-progress-bar" class="bg-primary-500 h-2 rounded-full transition-all" style="width: ${((currentIndex + 1) / skriVocabulary.length) * 100}%"></div>
                </div>
                <div id="skriv-question-area">
                    <!-- Report previous answer button (hidden by default) -->
                    <div id="report-previous-container" class="mb-4 hidden">
                        <button id="report-previous-btn" class="w-full text-sm text-primary-600 hover:text-primary-700 font-medium py-2 px-4 border-2 border-primary-300 rounded-lg hover:bg-primary-50 transition-colors">
                            ${vt('wr_report_previous')}
                        </button>
                    </div>

                    <div class="mb-4">
                        <p class="text-sm text-neutral-600">${getNativeLabel()}:</p>
                        <p id="skriv-prompt" class="text-2xl font-bold text-neutral-800"></p>
                    </div>
                    <div id="skriv-gender-section"></div>
                    <div>
                        <label for="skriv-input-module" class="text-sm font-medium text-neutral-700">${vt('wr_write_in')} ${targetLangLabel}<span id="skriv-noun-hint"></span>:</label>
                        <input type="text" id="skriv-input-module" class="mt-1 block w-full p-3 border-2 border-neutral-300 rounded-md shadow-sm text-lg" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
                    </div>


                    <div id="skriv-special-chars" class="mt-3 flex items-center gap-2 flex-wrap"></div>
                    <div id="skriv-feedback-module" class="mt-4 min-h-16"></div>
                    <button id="skriv-check-module" class="w-full bg-primary-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-600 transition-colors">${vt('wr_check_answer')}</button>
                </div>
            </div>`;

    // Enter fullscreen
    enterFullscreen();

    // Add special characters component
    createSpecialCharsComponent('skriv-special-chars');

    let progressText = container.querySelector('#skriv-progress');
    let progressBar = container.querySelector('#skriv-progress-bar');
    let promptEl = container.querySelector('#skriv-prompt');
    let inputEl = container.querySelector('#skriv-input-module');
    let feedbackEl = container.querySelector('#skriv-feedback-module');
    let checkBtn = container.querySelector('#skriv-check-module');
    let genderSection = container.querySelector('#skriv-gender-section');
    let nounHint = container.querySelector('#skriv-noun-hint');
    const exitBtn = container.querySelector('#exit-skriv-btn');
    let reportPreviousContainer = container.querySelector('#report-previous-container');
    let reportPreviousBtn = container.querySelector('#report-previous-btn');

    let selectedGender = null;

    // Exit button handler
    if (exitBtn) {
        exitBtn.addEventListener('click', handleExit);
    }

    // Report previous answer button handler
    if (reportPreviousBtn) {
        reportPreviousBtn.addEventListener('click', () => {
            if (lastWrongAnswer) {
                showReportModal(lastWrongAnswer, container);
                // Hide button after reporting
                reportPreviousContainer.classList.add('hidden');
                lastWrongAnswer = null;
            }
        });
    }

    const updateProgress = () => {
        progressText.textContent = currentIndex + 1;
        progressBar.style.width = `${((currentIndex + 1) / skriVocabulary.length) * 100}%`;
    };

    const showCompletionScreen = () => {
        if (typeof confetti === 'function') {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }

        const genderCorrectCount = genderAnswers.filter(a => a.correct).length;
        const genderPercentage = genderAnswers.length > 0
            ? Math.round((genderCorrectCount / genderAnswers.length) * 100)
            : 0;

        const percentage = Math.round((score / skriVocabulary.length) * 100);

        // Points display (iOS-aligned)
        const pointsHtml = sessionPoints > 0 ? `
            <div class="flex items-center justify-center gap-2 mb-4">
                <span class="text-3xl font-bold text-primary-500">+${sessionPoints}</span>
                <span class="text-lg text-neutral-600">${vt('wr_points')}</span>
            </div>
        ` : '';

        // iOS-aligned: Calculate remaining words for next session
        const hasMoreWords = remainingWords.length > 0;
        const nextSessionSize = Math.min(remainingWords.length, SESSION_SIZE);

        // "Neste økt" button (iOS-aligned)
        const nextSessionButtonHtml = hasMoreWords ? `
            <button id="skriv-next-session-btn" class="w-full bg-accent2-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-accent2-600 transition-colors flex items-center justify-center gap-2 mb-3">
                <span>${vt('wr_next_session', { count: nextSessionSize })}</span>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
            </button>
        ` : '';

        // Encouragement text (iOS-aligned)
        const encouragementHtml = hasMoreWords ? `
            <p class="text-accent2-600 text-sm mb-4">${vt('wr_words_remaining', { count: remainingWords.length })}</p>
        ` : '';

        // Ordtrener link (only in lesson mode)
        const ordtrenerLinkHtml = isLessonMode ? `
            <div class="mt-6 pt-4 border-t border-neutral-200">
                <p class="text-neutral-600 text-sm mb-3">${vt('wr_more_chapters_question')}</p>
                <a href="/ordtrener/" class="inline-flex items-center gap-2 bg-info-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-info-700 transition-colors">
                    <span>${vt('wr_go_to_ordtrener')}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                </a>
            </div>
        ` : '';

        container.querySelector('#skriv-question-area').innerHTML = `
            <div class="text-center">
                <h4 class="text-3xl font-bold text-success-700 mb-4">${vt('wr_well_done')}</h4>
                ${pointsHtml}

                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div class="bg-surface p-4 rounded-lg border border-neutral-200 text-center">
                        <p class="text-xs text-neutral-500 mb-1">${vt('wr_words_correct')}</p>
                        <p class="text-3xl font-bold text-success-600">${percentage}%</p>
                        <p class="text-xs text-neutral-400">${score} / ${skriVocabulary.length}</p>
                    </div>
                    ${genderAnswers.length > 0 ? `
                        <div class="bg-surface p-4 rounded-lg border border-neutral-200 text-center">
                            <p class="text-xs text-neutral-500 mb-1">${vt('wr_gender_correct')}</p>
                            <p class="text-3xl font-bold text-info-600">${genderPercentage}%</p>
                            <p class="text-xs text-neutral-400">${genderCorrectCount} / ${genderAnswers.length}</p>
                        </div>
                    ` : ''}
                </div>

                ${encouragementHtml}
                ${nextSessionButtonHtml}

                <button id="skriv-restart-btn" class="w-full ${hasMoreWords ? 'bg-neutral-500' : 'bg-primary-500'} text-white font-bold py-3 px-6 rounded-lg hover:${hasMoreWords ? 'bg-neutral-600' : 'bg-primary-600'} transition-colors">
                    ${hasMoreWords ? vt('wr_start_over') : vt('wr_try_again')}
                </button>

                ${ordtrenerLinkHtml}
            </div>
        `;

        // Add next session button handler
        const nextSessionBtn = container.querySelector('#skriv-next-session-btn');
        if (nextSessionBtn) {
            nextSessionBtn.addEventListener('click', () => {
                startNextSession();
            });
        }

        container.querySelector('#skriv-restart-btn').addEventListener('click', async () => {
            // Save before restarting
            if (adapter && adapter.save) {
                await adapter.save();
            }
            exitFullscreen();
            // Wait a bit for fullscreen exit, then restart
            setTimeout(() => renderSkriv(container, context), 1000); // 1000ms delay for stability
        });
    };

    /**
     * Start the next session with remaining words (iOS-aligned)
     */
    const startNextSession = () => {
        // Reset session state
        currentIndex = 0;
        score = 0;
        sessionPoints = 0;
        genderAnswers = [];
        isCorrecting = false;
        lastWrongAnswer = null;
        selectedGender = null;

        // Take the next batch from remaining words
        const shuffled = remainingWords.sort(() => Math.random() - 0.5);
        skriVocabulary = shuffled.slice(0, SESSION_SIZE);
        remainingWords = shuffled.slice(SESSION_SIZE);

        // Re-render the question area
        container.querySelector('#skriv-question-area').innerHTML = `
            <!-- Report previous answer button (hidden by default) -->
            <div id="report-previous-container" class="mb-4 hidden">
                <button id="report-previous-btn" class="w-full text-sm text-primary-600 hover:text-primary-700 font-medium py-2 px-4 border-2 border-primary-300 rounded-lg hover:bg-primary-50 transition-colors">
                    ${vt('wr_report_previous')}
                </button>
            </div>

            <div class="mb-4">
                <p class="text-sm text-neutral-600">${getNativeLabel()}:</p>
                <p id="skriv-prompt" class="text-2xl font-bold text-neutral-800"></p>
            </div>
            <div id="skriv-gender-section"></div>
            <div>
                <label for="skriv-input-module" class="text-sm font-medium text-neutral-700">${vt('wr_write_in')} ${targetLangLabel}<span id="skriv-noun-hint"></span>:</label>
                <input type="text" id="skriv-input-module" class="mt-1 block w-full p-3 border-2 border-neutral-300 rounded-md shadow-sm text-lg" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
            </div>
            <div id="skriv-special-chars" class="mt-3 flex items-center gap-2 flex-wrap"></div>
            <div id="skriv-feedback-module" class="mt-4 min-h-16"></div>
            <button id="skriv-check-module" class="w-full bg-primary-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-600 transition-colors">${vt('wr_check_answer')}</button>
        `;

        // Re-bind element references (these are let, so we can reassign)
        promptEl = container.querySelector('#skriv-prompt');
        inputEl = container.querySelector('#skriv-input-module');
        feedbackEl = container.querySelector('#skriv-feedback-module');
        checkBtn = container.querySelector('#skriv-check-module');
        genderSection = container.querySelector('#skriv-gender-section');
        nounHint = container.querySelector('#skriv-noun-hint');
        reportPreviousContainer = container.querySelector('#report-previous-container');
        reportPreviousBtn = container.querySelector('#report-previous-btn');

        // Re-add special characters component
        createSpecialCharsComponent('skriv-special-chars');

        // Re-add event listeners
        checkBtn.addEventListener('click', checkAnswer);
        inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') checkAnswer(); });

        // Re-add report button handler
        if (reportPreviousBtn) {
            reportPreviousBtn.addEventListener('click', () => {
                if (lastWrongAnswer) {
                    showReportModal(lastWrongAnswer, container);
                    reportPreviousContainer.classList.add('hidden');
                    lastWrongAnswer = null;
                }
            });
        }

        // Update the progress counter in the header
        const progressHeader = container.querySelector('.text-sm.font-semibold.text-neutral-500');
        if (progressHeader) {
            progressHeader.innerHTML = `${vt('wr_question')} <span id="skriv-progress">1</span> / ${skriVocabulary.length}`;
        }

        // Re-bind progress elements after updating header
        progressText = container.querySelector('#skriv-progress');
        progressBar = container.querySelector('#skriv-progress-bar');

        // Start the first question
        displayQuestion();
    };

    const displayQuestion = () => {
        isCorrecting = false;
        selectedGender = null;
        const word = skriVocabulary[currentIndex];
        const isNoun = word.type === 'substantiv' || word.type === 'noun' || !!word.artikel;

        promptEl.textContent = word.native;
        inputEl.value = '';
        inputEl.disabled = false;
        checkBtn.disabled = false;
        feedbackEl.innerHTML = '';
        checkBtn.textContent = vt('wr_check_answer');

        // Show report previous button if there's a wrong answer from previous question
        if (lastWrongAnswer && currentIndex > 0) {
            reportPreviousContainer.classList.remove('hidden');
        } else {
            reportPreviousContainer.classList.add('hidden');
        }

        // Show/hide gender selection for nouns
        if (isNoun) {
            nounHint.textContent = vt('wr_noun_hint');

            // Get articles from config, defaulting to German if not found
            const articles = context.config?.languageConfig?.grammar?.articles || {};
            const articleList = Object.entries(articles).filter(([key]) => ['m', 'f', 'n'].includes(key));

            genderSection.innerHTML = `
                <div class="mb-4">
                    <label class="text-sm font-medium text-neutral-700 mb-2 block">${vt('wr_select_gender')}</label>
                    <div class="grid grid-cols-${articleList.length} gap-3">
                        ${articleList.map(([key, label]) => `
                            <button class="gender-btn p-3 bg-surface border-2 border-neutral-300 rounded-lg font-bold hover:bg-neutral-100" data-gender="${label}">${label}</button>
                        `).join('')}
                    </div>
                </div>
            `;

            // Add gender button event listeners
            const genderBtns = genderSection.querySelectorAll('.gender-btn');
            genderBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    genderBtns.forEach(b => {
                        b.classList.remove('bg-primary-400', 'text-white', 'border-primary-400');
                        b.classList.add('bg-surface', 'border-neutral-300');
                        b.style.color = '';
                    });
                    btn.classList.remove('bg-surface', 'border-neutral-300');
                    btn.classList.add('bg-primary-400', 'text-white', 'border-primary-400');
                    btn.style.color = '#ffffff';
                    selectedGender = btn.dataset.gender;
                });
            });
        } else {
            nounHint.textContent = '';
            genderSection.innerHTML = '';
        }

        updateProgress();
        setTimeout(() => inputEl.focus(), 100);
    };

    const checkAnswer = () => {
        if (isCorrecting) {
            currentIndex++;
            if (currentIndex < skriVocabulary.length) displayQuestion();
            else showCompletionScreen();
            return;
        }

        const word = skriVocabulary[currentIndex];
        const correctAnswer = word.targetRaw || word.target;
        let userAnswer = inputEl.value.trim();
        const isNoun = word.type === 'substantiv' || word.type === 'noun' || !!word.artikel;
        const isVerb = word.type === 'verb';

        // Handle nouns with gender
        if (isNoun) {
            const genderBtns = genderSection.querySelectorAll('.gender-btn');
            const articles = context.config?.languageConfig?.grammar?.articles || {};
            const allowedArticles = Object.values(articles).filter(v => v && !v.includes('/')); // Filter out plural 'die' or 'los/las' if it's the same

            // Check if user typed the article at the start
            let typedArticle = null;
            const articlePattern = allowedArticles.join('|').replace(/\//g, '\\/');
            const articleRegex = new RegExp(`^(${articlePattern})\\s+`, 'i');

            const articleMatch = userAnswer.match(articleRegex);
            if (articleMatch) {
                typedArticle = articleMatch[1].toLowerCase();
                userAnswer = userAnswer.substring(articleMatch[0].length).trim(); // Remove article from answer
            }

            // Use typed article if available, otherwise use button selection
            const userGender = typedArticle || selectedGender;

            // Check if gender selected (either via button or typed)
            if (userGender === null) {
                const articleString = allowedArticles.join('/');
                feedbackEl.innerHTML = `<p class="text-warning-600 font-bold">${vt('wr_must_select_gender', { articles: articleString })}</p>`;
                return;
            }

            // Validate word using isAnswerCorrect (with typo tolerance)
            const wordResult = isAnswerCorrect(userAnswer, correctAnswer, false, true, false, word.synonymer);

            // Get correct article from either artikel or genus field
            const correctArticle = word.artikel || genusToArticle(word.genus);
            const genderCorrect = userGender === correctArticle;

            // Track gender answer
            genderAnswers.push({ correct: genderCorrect });

            // Count as score only if word is correct
            if (wordResult.correct && !isCorrecting) score++;

            inputEl.disabled = true;
            checkBtn.disabled = true;
            genderBtns.forEach(btn => btn.disabled = true);

            // Provide detailed feedback
            if (wordResult.correct && genderCorrect) {
                const typoInfo = wordResult.partial ? ` <span class="text-neutral-600">(${vt('wr_correct_answer')} ${correctAnswer})</span>` : '';
                feedbackEl.innerHTML = `<p class="text-success-600 font-bold">${wordResult.partial ? vt('wr_correct_typo') : vt('wr_correct_perfect')}</p>${typoInfo ? `<p class="text-sm mt-1">${typoInfo}</p>` : ''}`;

                // SM-2: Correct (5) or Correct with typo (3)
                // In lesson mode, use exposure credit only (no full SM-2 scheduling)
                if (context.updateProgress) {
                    const quality = wordResult.partial ? 3 : 5;
                    context.updateProgress(getWordKey(word), quality, 'write', { exposureOnly: isLessonMode });
                    sessionPoints++; // Track point for UI
                }
            } else if (wordResult.correct && !genderCorrect) {
                const typoInfo = wordResult.partial ? ` <span class="text-neutral-600">(${vt('wr_correct_answer')} ${correctAnswer})</span>` : '';
                feedbackEl.innerHTML = `<p class="text-success-600 font-bold">${wordResult.partial ? vt('wr_correct_typo') : vt('wr_correct_word')}</p><p class="text-warning-600 mt-1">${vt('wr_wrong_gender')} ${correctArticle} ${correctAnswer}</p>${typoInfo ? `<p class="text-sm mt-1">${typoInfo}</p>` : ''}`;

                // SM-2: Wrong Gender = Fail (Quality 2) - no point
                // In lesson mode, use exposure credit only
                if (context.updateProgress) {
                    context.updateProgress(getWordKey(word), 2, 'write', { exposureOnly: isLessonMode });
                }
            } else if (!wordResult.correct && genderCorrect) {
                const synonymInfo = word.synonymer && word.synonymer.length > 0
                    ? ` <span class="text-neutral-500 text-sm">(${vt('wr_other_accepted')} ${word.synonymer.join(', ')})</span>`
                    : '';
                feedbackEl.innerHTML = `
                    <p class="text-error-600 font-bold">${vt('wr_wrong_word_correct_gender')}</p>
                    <p class="text-neutral-600 mt-1">${vt('wr_correct_answer')} ${correctArticle} ${correctAnswer}${synonymInfo}</p>
                `;

                // Store answer data for reporting on next question
                lastWrongAnswer = {
                    lessonId: context.lessonId || 'unknown',
                    exerciseType: 'skriv',
                    questionType: 'no-de',
                    prompt: word.native,
                    userAnswer: userAnswer,
                    correctAnswer: correctAnswer,
                    userGender: userGender,
                    correctGender: correctArticle,
                    wordType: word.type,
                    existingSynonyms: word.synonymer || [],
                    isNoun: true,
                    isVerb: false
                };

                // SM-2: Incorrect Word (Quality 1)
                // In lesson mode, use exposure credit only
                if (context.updateProgress) {
                    context.updateProgress(getWordKey(word), 1, 'write', { exposureOnly: isLessonMode });
                }
            } else {
                const synonymInfo = word.synonymer && word.synonymer.length > 0
                    ? ` <span class="text-neutral-500 text-sm">(${vt('wr_other_accepted')} ${word.synonymer.join(', ')})</span>`
                    : '';
                feedbackEl.innerHTML = `
                    <p class="text-error-600 font-bold">${vt('wr_wrong')}</p>
                    <p class="text-neutral-600 mt-1">${vt('wr_correct_answer_was')} ${correctArticle} ${correctAnswer}${synonymInfo}</p>
                `;

                // Store answer data for reporting on next question
                lastWrongAnswer = {
                    lessonId: context.lessonId || 'unknown',
                    exerciseType: 'skriv',
                    questionType: 'no-de',
                    prompt: word.native,
                    userAnswer: userAnswer,
                    correctAnswer: correctAnswer,
                    userGender: userGender,
                    correctGender: correctArticle,
                    wordType: word.type,
                    existingSynonyms: word.synonymer || [],
                    isNoun: true,
                    isVerb: false
                };

                // SM-2: Incorrect (Quality 1)
                // In lesson mode, use exposure credit only
                if (context.updateProgress) {
                    context.updateProgress(getWordKey(word), 1, 'write', { exposureOnly: isLessonMode });
                }
            }

            // Auto-advance after showing feedback
            setTimeout(() => {
                currentIndex++;
                if (currentIndex < skriVocabulary.length) displayQuestion();
                else showCompletionScreen();
            }, 2000);

        } else {
            // Regular word or verb - use isAnswerCorrect for typo tolerance
            const result = isAnswerCorrect(userAnswer, correctAnswer, isVerb, false, false, word.synonymer);

            if (result.correct && !isCorrecting) score++;

            inputEl.disabled = true;

            if (result.correct) {
                const typoInfo = result.partial ? ` <span class="text-neutral-600">(${vt('wr_correct_answer')} ${correctAnswer})</span>` : '';
                const baseMsg = result.partial
                    ? `<p class="text-success-600 font-bold">${vt('wr_correct_typo')}</p>`
                    : `<p class="text-success-600 font-bold">${vt('wr_correct_perfect')}</p>`;
                feedbackEl.innerHTML = baseMsg + (typoInfo ? `<p class="text-sm mt-1">${typoInfo}</p>` : '');

                // SM-2: Correct (5) or Typo (3)
                // In lesson mode, use exposure credit only
                if (context.updateProgress) {
                    const quality = result.partial ? 3 : 5;
                    context.updateProgress(getWordKey(word), quality, 'write', { exposureOnly: isLessonMode });
                    sessionPoints++; // Track point for UI
                }
            } else {
                const synonymInfo = word.synonymer && word.synonymer.length > 0
                    ? ` <span class="text-neutral-500 text-sm">(${vt('wr_other_accepted')} ${word.synonymer.join(', ')})</span>`
                    : '';
                feedbackEl.innerHTML = `
                    <p class="text-error-600 font-bold">${vt('wr_wrong')}</p>
                    <p class="text-neutral-600 mt-1">${vt('wr_correct_answer_was')} ${correctAnswer}${synonymInfo}</p>
                `;

                // Store answer data for reporting on next question
                lastWrongAnswer = {
                    lessonId: context.lessonId || 'unknown',
                    exerciseType: 'skriv',
                    questionType: 'no-de',
                    prompt: word.native,
                    userAnswer: userAnswer,
                    correctAnswer: correctAnswer,
                    wordType: word.type,
                    existingSynonyms: word.synonymer || [],
                    isNoun: false,
                    isVerb: isVerb
                };

                // SM-2: Incorrect (Quality 1)
                // In lesson mode, use exposure credit only
                if (context.updateProgress) {
                    context.updateProgress(getWordKey(word), 1, 'write', { exposureOnly: isLessonMode });
                }
            }

            // Auto-advance after showing feedback
            setTimeout(() => {
                currentIndex++;
                if (currentIndex < skriVocabulary.length) displayQuestion();
                else showCompletionScreen();
            }, 1500);
        }
    };

    checkBtn.addEventListener('click', checkAnswer);
    inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') checkAnswer(); });

    displayQuestion();
}
