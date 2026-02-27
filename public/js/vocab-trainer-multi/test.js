import { loadData, saveData, logVocabTestResult } from '../progress/index.js';
import { createSpecialCharsComponent } from '../ui.js';
import { isNumberQuestion, isAnswerCorrect, getRandomItems } from './utils.js';
import { showReportModal } from '../utils/report-modal.js';
import { vt, getNativeLabel, getTargetLabel } from './i18n-helper.js';
import { genusToArticle } from '../core/language-utils.js';

export function renderTest(container, context) {
    const { vocabulary, knownWords, saveKnownWords, chapters } = context;

    // Safety check: Ensure there are words to test
    if (!vocabulary || vocabulary.length === 0) {
        container.innerHTML = `
            <div class="w-full max-w-2xl p-6 border rounded-lg bg-surface shadow-lg text-center mx-auto mt-8">
                <h3 class="text-xl font-bold text-neutral-700 mb-4">${vt('te_no_words_title')}</h3>
                <p class="text-neutral-600 mb-6">${vt('te_no_words_desc')}</p>
                <button id="exit-empty-test-btn" class="bg-primary-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-600 transition-colors">
                    ${vt('te_go_back')}
                </button>
            </div>
        `;
        container.querySelector('#exit-empty-test-btn').addEventListener('click', () => {
            if (context.onExit) context.onExit();
        });
        return;
    }

    // Differentiate storage keys based on testType (practice vs unlock)
    const testType = context.testType || 'practice';
    const progressKey = `vocab-test-progress-${testType}`;
    const resultsKey = `vocab-test-results-${testType}`;
    const MAX_QUESTIONS = (testType === 'unlock' || testType === 'glossary') ? 50 : 20;

    // Calculate actual max questions based on available vocabulary
    const actualMaxQuestions = Math.min(vocabulary.length, MAX_QUESTIONS);

    // Load previous test results if they exist
    const savedResults = loadData(resultsKey) || null;

    // Validate saved progress matches current test context
    function validateSavedProgress(progress) {
        if (!progress) return null;

        // For glossary tests, validate that saved progress is for the same test code
        if (testType === 'glossary' && context.glossaryTestCode) {
            if (progress.glossaryTestCode !== context.glossaryTestCode) {
                console.log(`Saved glossary progress is for different test (${progress.glossaryTestCode} vs ${context.glossaryTestCode}), clearing.`);
                return null;
            }
        }

        // Validate saved progress is in a valid state (question index must be < total)
        if (progress.currentQuestionIndex >= actualMaxQuestions) {
            console.log(`Saved progress has invalid question index (${progress.currentQuestionIndex} >= ${actualMaxQuestions} available questions), clearing.`);
            return null;
        }

        // Check if saved progress has chapters and if they match
        const currentChapters = [...chapters].sort().join(',');
        const savedChapters = progress.chapters ? [...progress.chapters].sort().join(',') : '';
        if (currentChapters !== savedChapters) {
            console.log('Saved progress is for different chapters (or old format), ignoring.');
            return null;
        }

        return progress;
    }

    // Load saved test progress (for pause/resume functionality)
    let savedProgress = validateSavedProgress(context.savedState || loadData(progressKey) || null);

    // Helper: Fisher-Yates Shuffle
    function shuffleArray(array) {
        let currentIndex = array.length, randomIndex;
        // While there remain elements to shuffle.
        while (currentIndex > 0) {
            // Pick a remaining element.
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            // And swap it with the current element.
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }
        return array;
    }

    // 1. Shuffle the ENTIRE vocabulary pool once
    const shuffledVocab = shuffleArray([...vocabulary]); // Copy before shuffle

    // 2. Determine Question Counts (iOS-aligned: 20 or 50 questions)
    const totalQuestions = Math.min(shuffledVocab.length, MAX_QUESTIONS);

    // Ratios: 20% MC, 20% DE-NO, 60% NO-DE
    const mcCount = Math.floor(totalQuestions * 0.2);
    const deNoCount = Math.floor(totalQuestions * 0.2);
    const noDeCount = totalQuestions - mcCount - deNoCount; // Remainder to No-De

    // 3. Partition Vocabulary (No Repetition)
    const mcWords = shuffledVocab.slice(0, mcCount);
    const deNoWords = shuffledVocab.slice(mcCount, mcCount + deNoCount);
    const noDeWords = shuffledVocab.slice(mcCount + deNoCount, mcCount + deNoCount + noDeCount);

    const questions = [];

    // 4. Generate MC Questions
    mcWords.forEach(word => {
        // Generate 3 wrong alternatives from the REST of the vocabulary
        // We can pick from the entire original vocab list, excluding the current word
        let wrongAlternatives = vocabulary
            .filter(w => w.native !== word.native)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3)
            .map(w => w.native);

        // Fallback if not enough wrong alternatives
        if (wrongAlternatives.length < 3) {
            const fillers = vt('te_fillers');
            wrongAlternatives = [...wrongAlternatives, ...fillers.slice(0, 3 - wrongAlternatives.length)];
        }

        const alternatives = [word.native, ...wrongAlternatives].sort(() => Math.random() - 0.5);

        questions.push({
            type: 'multiple-choice',
            question: word.target,
            correctAnswer: word.native,
            alternatives: alternatives,
            isVerb: word.type === 'verb',
            wordId: word.wordId || word.target // For SM-2 tracking
        });
    });

    // 5. Generate DE-NO Questions
    deNoWords.forEach(word => {
        const hasExplanations = word.synonym_forklaringer && Object.keys(word.synonym_forklaringer).length > 0;
        if (hasExplanations) {
            console.log(`[Vocab Trainer Debug] de-no question with explanations:`, word.target, word.synonym_forklaringer);
        }
        const artikel = word.artikel || genusToArticle(word.genus);

        questions.push({
            type: 'de-no',
            question: word.target,
            correctAnswer: word.native,
            isVerb: word.type === 'verb',
            isNoun: word.type === 'noun' || !!artikel,
            synonyms: word.norsk_synonymer,
            synonym_forklaringer: word.synonym_forklaringer || {},
            wordId: word.wordId || word.target // For SM-2 tracking
        });
    });

    // 6. Generate NO-DE Questions
    noDeWords.forEach(word => {
        const artikel = word.artikel || genusToArticle(word.genus);

        questions.push({
            type: 'no-de',
            question: word.native,
            correctAnswer: word.targetRaw || word.target,
            artikel: artikel,
            isVerb: word.type === 'verb',
            isNoun: word.type === 'noun' || !!artikel,
            synonyms: word.synonymer,
            synonym_forklaringer: word.synonym_forklaringer || {},
            wordId: word.wordId || word.target // For SM-2 tracking
        });
    });

    // Test state
    let currentQuestionIndex = 0;
    let answers = [];
    let genderAnswers = [];
    let sessionPoints = 0; // Track points earned in this session (iOS-aligned)
    // Fix 2A: Preserve original vocabulary count - use saved value when resuming
    let originalTotalVocab = savedProgress?.totalVocab || vocabulary.length;
    let isExiting = false; // Flag to prevent double exit handling
    let usingNativeFullscreen = false; // Track if we are using native fullscreen
    let saveProgress = () => { }; // Defined in outer scope to be accessible by onFullscreenChange
    let lastWrongAnswer = null; // Track last wrong answer for reporting
    let testTimerInterval = null; // Timer interval for glossary tests

    // Helper: Check if in native fullscreen
    const isInNativeFullscreen = () => {
        return !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
    };

    // Helper: Apply CSS-based "fake" fullscreen styling
    const applyFakeFullscreen = () => {
        container.classList.add(
            'fixed', 'inset-0', 'z-50',
            'w-full', 'h-full', 'min-h-screen',
            'bg-surface', 'overflow-y-auto', 'p-4',
            'flex', 'items-center', 'justify-center'
        );
        document.body.style.overflow = 'hidden';
    };

    // Fullscreen helper
    const enterFullscreen = () => {
        // If already in native fullscreen, just add styling
        if (isInNativeFullscreen()) {
            container.classList.add(
                'w-full', 'h-full', 'min-h-screen',
                'bg-surface', 'overflow-y-auto', 'p-4',
                'flex', 'items-center', 'justify-center'
            );
            usingNativeFullscreen = true;
            console.log('[Fullscreen] Applied native fullscreen styling (already in fullscreen)');
            return;
        }

        // Try native fullscreen API
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
                        console.log('[Fullscreen] Native fullscreen activated successfully');
                    })
                    .catch(() => {
                        // Native fullscreen denied - apply CSS fallback silently
                        console.log('[Fullscreen] Native fullscreen denied, using CSS fallback');
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
                console.log('[Fullscreen] Native fullscreen activated (no promise)');
            }
        } else {
            // No fullscreen API - use CSS fallback
            console.log('[Fullscreen] No fullscreen API available, using CSS fallback');
            applyFakeFullscreen();
            usingNativeFullscreen = false;
        }
    };

    // Exit fullscreen helper
    const exitFullscreen = () => {
        // Remove all fullscreen styling classes (both fake and native)
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

    // Show exit warning modal
    function showExitWarning(onConfirm) {
        const isGlossaryTest = testType === 'glossary';

        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-neutral-900 bg-opacity-50 flex items-center justify-center z-[100] backdrop-blur-sm';

        // Create modal content with different messaging for glossary tests
        const modal = document.createElement('div');
        modal.className = 'bg-surface rounded-lg p-6 max-w-md mx-4 shadow-xl text-center';

        if (isGlossaryTest) {
            modal.innerHTML = `
                <h3 class="text-xl font-bold text-neutral-900 mb-4">⚠️ Pause gloseprøve?</h3>
                <p class="text-neutral-700 mb-4">Du har allerede startet prøven. Forsøket er brukt uansett om du pauser eller fullfører.</p>
                <div class="bg-primary-50 border border-primary-200 rounded-lg p-3 mb-6 text-sm text-primary-800">
                    <strong>Tips:</strong> Du kan fortsette prøven senere, men forsøket teller fra du startet.
                </div>
                <div class="flex flex-col gap-2">
                    <button id="modal-continue" class="px-4 py-3 bg-accent2-600 hover:bg-accent2-700 text-white rounded-lg font-semibold transition-colors">
                        Fortsett prøven
                    </button>
                    <button id="modal-pause" class="px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-semibold transition-colors">
                        Pause likevel
                    </button>
                </div>
            `;
        } else {
            modal.innerHTML = `
                <h3 class="text-xl font-bold text-neutral-900 mb-4">⚠️ ${vt('te_exit_warning_title')}</h3>
                <p class="text-neutral-700 mb-6">${vt('te_exit_warning_desc')}</p>
                <div class="flex gap-3 justify-center">
                    <button id="modal-cancel" class="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 rounded-lg font-semibold transition-colors">${vt('te_cancel')}</button>
                    <button id="modal-ok" class="px-4 py-2 bg-accent2-600 hover:bg-accent2-700 text-white rounded-lg font-semibold transition-colors">${vt('te_exit')}</button>
                </div>
            `;
        }

        overlay.appendChild(modal);
        container.appendChild(overlay);

        if (isGlossaryTest) {
            modal.querySelector('#modal-continue').addEventListener('click', () => {
                container.removeChild(overlay);
            });
            modal.querySelector('#modal-pause').addEventListener('click', () => {
                container.removeChild(overlay);
                onConfirm();
            });
        } else {
            modal.querySelector('#modal-ok').addEventListener('click', () => {
                container.removeChild(overlay);
                onConfirm();
            });
            modal.querySelector('#modal-cancel').addEventListener('click', () => {
                container.removeChild(overlay);
            });
        }
    }

    // Centralized exit handler
    const handleExit = () => {
        if (isExiting) return;
        isExiting = true;

        // Clean up timer
        if (testTimerInterval) {
            clearInterval(testTimerInterval);
            testTimerInterval = null;
        }

        // Clean up global expiresAt reference
        if (window._glossaryTestExpiresAt !== undefined) {
            delete window._glossaryTestExpiresAt;
        }

        // Remove fullscreen listener to prevent leaks
        document.removeEventListener('fullscreenchange', onFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
        document.removeEventListener('mozfullscreenchange', onFullscreenChange);
        document.removeEventListener('MSFullscreenChange', onFullscreenChange);
        document.removeEventListener('keydown', onKeyDown);

        exitFullscreen();

        if (context.onExit) {
            context.onExit();
        }
    };

    // Fullscreen change listener (handles ESC key)
    const onFullscreenChange = () => {
        if (!document.fullscreenElement && !document.webkitIsFullScreen && !document.mozFullScreen && !document.msFullscreenElement) {
            saveProgress();
            handleExit();
        }
    };

    // ESC key listener for fake fullscreen
    const onKeyDown = (e) => {
        if (e.key === 'Escape' && !usingNativeFullscreen) {
            saveProgress();
            handleExit();
        }
    };

    // Attach listeners
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('mozfullscreenchange', onFullscreenChange);
    document.addEventListener('MSFullscreenChange', onFullscreenChange);
    document.addEventListener('keydown', onKeyDown);

    function showStartScreen() {
        // Reload saved progress to ensure we have the latest state (with validation)
        savedProgress = validateSavedProgress(loadData(progressKey) || null);

        const isUnlock = testType === 'unlock';
        const title = isUnlock ? vt('te_chapter_test') : vt('te_vocab_test');
        const description = isUnlock
            ? vt('te_chapter_test_desc')
            : vt('te_vocab_test_desc', { count: actualMaxQuestions });

        container.innerHTML = `
            <div class="w-full max-w-2xl p-6 border rounded-lg bg-surface shadow-lg">
                <h3 class="text-2xl font-bold text-primary-700 mb-4">${title}</h3>
                <p class="text-neutral-600 mb-6">${description}</p>

                ${savedProgress ? `
                    <div class="bg-info-50 p-4 rounded-lg mb-6 border-2 border-info-300">
                        <h4 class="font-bold text-info-800 mb-3">⏸️ ${vt('te_ongoing_found')}</h4>
                        <p class="text-sm text-info-700 mb-3">${vt('te_question_of', { current: savedProgress.currentQuestionIndex + 1, total: actualMaxQuestions })}</p>
                        <div class="flex gap-3">
                            <button id="resume-test-btn" class="flex-1 bg-info-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-info-700 transition-colors">
                                ${vt('te_continue_test')}
                            </button>
                            <button id="new-test-btn" class="flex-1 bg-neutral-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-neutral-600 transition-colors">
                                ${vt('te_start_new')}
                            </button>
                        </div>
                    </div>
                ` : ''}

                ${savedResults && !savedProgress ? `
                    <div class="bg-neutral-50 p-4 rounded-lg mb-6 border border-neutral-200">
                        <h4 class="font-bold text-neutral-800 mb-3">📊 ${vt('te_previous_result')}</h4>
                        <p class="text-sm text-neutral-600 mb-2">${savedResults.date}</p>
                        <div class="grid grid-cols-2 gap-3 mb-3">
                            <div class="bg-surface p-3 rounded border border-neutral-200">
                                <p class="text-xs text-neutral-500">${vt('te_score')}</p>
                                <p class="text-xl font-bold text-primary-600">${savedResults.score}</p>
                                <p class="text-xs text-neutral-400">${vt('te_of_words', { count: savedResults.totalVocab })}</p>
                            </div>
                            <div class="bg-surface p-3 rounded border border-neutral-200">
                                <p class="text-xs text-neutral-500">${vt('te_percent_correct')}</p>
                                <p class="text-xl font-bold text-success-600">${savedResults.percentage}%</p>
                                <p class="text-xs text-neutral-400">${vt('te_questions_count', { correct: savedResults.correctCount, total: actualMaxQuestions })}</p>
                            </div>
                        </div>
                        ${savedResults.genderTotal > 0 ? `
                            <div class="bg-surface p-3 rounded border border-neutral-200">
                                <p class="text-xs text-neutral-500">${vt('te_gender_accuracy')}</p>
                                <p class="text-lg font-bold text-info-600">${savedResults.genderPercentage}%</p>
                                <p class="text-xs text-neutral-400">${vt('te_nouns_count', { correct: savedResults.genderCorrectCount, total: savedResults.genderTotal })}</p>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}

                ${!savedProgress ? `
                    <button id="start-test-btn" class="w-full bg-primary-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-600 transition-colors">
                        ${savedResults ? vt('te_start_new') : vt('te_start_test')}
                    </button>
                ` : ''}
            </div>
        `;

        if (savedProgress) {
            const resumeBtn = container.querySelector('#resume-test-btn');
            if (resumeBtn) {
                resumeBtn.addEventListener('click', () => {
                    // Enter fullscreen on user gesture (button click)
                    enterFullscreen();
                    resumeTest();
                });
            }

            const newTestBtn = container.querySelector('#new-test-btn');
            if (newTestBtn) {
                newTestBtn.addEventListener('click', () => {
                    // Enter fullscreen on user gesture (button click)
                    enterFullscreen();
                    // Clear saved progress and start fresh
                    saveData(progressKey, null);
                    currentQuestionIndex = 0;
                    answers = [];
                    genderAnswers = [];
                    startTestUI();
                });
            }
        } else {
            const startBtn = container.querySelector('#start-test-btn');
            if (startBtn) {
                startBtn.addEventListener('click', () => {
                    // Enter fullscreen on user gesture (button click)
                    enterFullscreen();
                    // Clear saved progress and start fresh
                    saveData(progressKey, null);
                    currentQuestionIndex = 0;
                    answers = [];
                    genderAnswers = [];
                    startTestUI();
                });
            }
        }
    }

    function resumeTest() {
        if (!savedProgress) return;
        // Restore test state
        currentQuestionIndex = savedProgress.currentQuestionIndex;
        answers = savedProgress.answers;
        genderAnswers = savedProgress.genderAnswers;
        startTestUI();
    }

    // Get language labels once for use throughout the test
    const nativeLabel = getNativeLabel();
    const targetLabel = getTargetLabel(context.config?.languageConfig?.dataKeys?.target || 'german');

    function startTestUI() {
        container.innerHTML = `
            <button id="exit-vocab-test-btn" class="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 transition-colors z-50 p-2 bg-white/80 rounded-full backdrop-blur-sm" title="${vt('te_exit')}">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            <!-- Flex Container for Centering -->
            <div class="w-full h-full min-h-screen flex items-center justify-center p-4">
                <div class="w-full max-w-2xl p-4 sm:p-6 border rounded-lg bg-neutral-50 shadow-lg mx-auto">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold text-primary-700">${testType === 'unlock' ? vt('te_chapter_test') : vt('te_test_questions', { count: questions.length })}</h3>
                        <div class="flex items-center gap-3">
                            <div id="test-timer" class="hidden"></div>
                            <p class="text-sm font-semibold text-neutral-500">${vt('te_question')} <span id="test-progress">${currentQuestionIndex + 1}</span> / ${questions.length}</p>
                        </div>
                    </div>
                    <div class="w-full bg-neutral-200 rounded-full h-2 mb-6">
                        <div id="test-progress-bar" class="bg-primary-500 h-2 rounded-full transition-all" style="width: ${((currentQuestionIndex + 1) / questions.length) * 100}%"></div>
                    </div>

                    <!-- Report previous answer button (hidden by default) -->
                    <div id="test-report-previous-container" class="mb-4 hidden">
                        <button id="test-report-previous-btn" class="w-full text-sm text-primary-600 hover:text-primary-700 font-medium py-2 px-4 border-2 border-primary-300 rounded-lg hover:bg-primary-50 transition-colors">
                            📝 ${vt('te_report_previous')}
                        </button>
                    </div>

                    <div id="test-question-area"></div>
                    <div class="mt-6 flex justify-center">
                        <button id="pause-test-btn" class="text-neutral-500 hover:text-primary-600 font-semibold flex items-center gap-2 transition-colors py-2 px-4 rounded hover:bg-neutral-100">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                            </svg>
                            ${vt('te_pause_save')}
                        </button>
                    </div>
                </div>
            </div>
        `;
        // Only scroll into view if not in fullscreen mode
        if (!usingNativeFullscreen && !container.classList.contains('fixed')) {
            container.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        initializeTest();
    }

    function initializeTest() {
        const questionArea = container.querySelector('#test-question-area');
        const progressText = container.querySelector('#test-progress');
        const progressBar = container.querySelector('#test-progress-bar');
        let forgottenWords = new Set(); // Track words the user "knew" but got wrong

        // Initialize timer if expiresAt is provided (glossary tests)
        if (context.expiresAt) {
            // Store in global for real-time updates from teacher extending time
            window._glossaryTestExpiresAt = context.expiresAt;

            const timerEl = container.querySelector('#test-timer');
            if (timerEl) {
                timerEl.classList.remove('hidden');

                const updateTimer = () => {
                    // Read from global to pick up real-time updates
                    const expiresAt = window._glossaryTestExpiresAt || context.expiresAt;
                    const remaining = expiresAt - Date.now();
                    if (remaining <= 0) {
                        timerEl.innerHTML = `<span class="bg-error-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">⏱️ Tid ute!</span>`;
                        if (testTimerInterval) clearInterval(testTimerInterval);
                        return;
                    }

                    const mins = Math.floor(remaining / 60000);
                    const secs = Math.floor((remaining % 60000) / 1000);
                    const timeText = `${mins}:${secs.toString().padStart(2, '0')}`;

                    // Apply warning styles based on time remaining
                    let classes = 'px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1';
                    if (mins < 1) {
                        classes += ' bg-error-500 text-white animate-pulse';
                    } else if (mins < 5) {
                        classes += ' bg-warning-500 text-white';
                    } else if (mins < 10) {
                        classes += ' bg-primary-200 text-primary-800';
                    } else {
                        classes += ' bg-neutral-100 text-neutral-600';
                    }

                    timerEl.innerHTML = `<span class="${classes}">⏱️ ${timeText}</span>`;
                };

                // Initial update and set interval
                updateTimer();
                testTimerInterval = setInterval(updateTimer, 1000);
            }
        }

        function updateProgress() {
            progressText.textContent = currentQuestionIndex + 1;
            progressBar.style.width = `${((currentQuestionIndex + 1) / questions.length) * 100}%`;
        }

        // Assign to outer scope variable
        saveProgress = function () {
            // Save current test state
            const progressData = {
                currentQuestionIndex: currentQuestionIndex,
                answers: answers,
                genderAnswers: genderAnswers,
                chapters: chapters,
                totalVocab: originalTotalVocab, // Fix 2A: Use preserved count
                glossaryTestCode: context.glossaryTestCode || null
            };
            saveData(progressKey, progressData);
        };

        // Exit button listener (X in corner)
        const exitBtn = container.querySelector('#exit-vocab-test-btn');
        if (exitBtn) {
            exitBtn.addEventListener('click', () => {
                showExitWarning(() => {
                    saveProgress();
                    handleExit();
                });
            });
        }

        // Report previous answer button
        const reportPreviousContainer = container.querySelector('#test-report-previous-container');
        const reportPreviousBtn = container.querySelector('#test-report-previous-btn');
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

        // Pause button listener
        const pauseBtn = container.querySelector('#pause-test-btn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                showExitWarning(() => {
                    saveProgress();
                    handleExit();
                });
            });
        }



        function renderQuestion() {
            const q = questions[currentQuestionIndex];

            // Safety guard: handle invalid question index gracefully
            if (!q) {
                console.error(`[Test] Question index ${currentQuestionIndex} out of bounds (${questions.length}). Clearing invalid state.`);
                saveData(progressKey, null);
                if (answers.length > 0) {
                    showResults();
                } else {
                    container.innerHTML = `
                        <div class="w-full max-w-2xl p-6 border rounded-lg bg-error-50 shadow-lg text-center mx-auto mt-8">
                            <h3 class="text-xl font-bold text-error-700 mb-4">Noe gikk galt</h3>
                            <p class="text-neutral-600 mb-6">Prøven kunne ikke fortsette. Vennligst start på nytt.</p>
                            <button id="exit-error-btn" class="bg-primary-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-600">
                                Tilbake
                            </button>
                        </div>
                    `;
                    container.querySelector('#exit-error-btn')?.addEventListener('click', handleExit);
                }
                return;
            }

            // Show/hide report previous button
            if (lastWrongAnswer && currentQuestionIndex > 0) {
                reportPreviousContainer.classList.remove('hidden');
            } else {
                reportPreviousContainer.classList.add('hidden');
            }

            if (q.type === 'multiple-choice') {
                questionArea.innerHTML = `
                    <div class="mb-4">
                        <p class="text-sm text-neutral-600 mb-2">${vt('te_mc_what_means', { lang: nativeLabel.toLowerCase() })}</p>
                        <p class="text-2xl font-bold text-neutral-800 mb-4">${q.question}</p>
                    </div>
                    <div class="grid grid-cols-1 gap-3">
                        ${q.alternatives.map((alt, i) => `
                            <button class="mc-btn p-4 bg-surface border-2 border-neutral-300 rounded-lg hover:bg-neutral-100 text-left font-semibold" data-answer="${alt}">
                                ${alt}
                            </button>
                        `).join('')}
                    </div>
                    <div id="question-feedback" class="mt-4 h-12"></div>
                `;

                questionArea.querySelectorAll('.mc-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const userAnswer = btn.dataset.answer;
                        const isCorrect = userAnswer === q.correctAnswer;
                        answers.push({ correct: isCorrect, partial: false });

                        // Track points for correct answers (iOS-aligned)
                        if (isCorrect) {
                            sessionPoints++;
                        }

                        // SM-2 Update (test mode = full credit)
                        if (context.updateProgress && q.wordId) {
                            const quality = isCorrect ? 5 : 1;
                            context.updateProgress(q.wordId, quality, 'test');
                        }

                        // Visual feedback
                        questionArea.querySelectorAll('.mc-btn').forEach(b => {
                            b.disabled = true;
                            if (b.dataset.answer === q.correctAnswer) {
                                b.classList.add('bg-success-500', 'text-white', 'border-success-500');
                            } else if (b === btn && !isCorrect) {
                                b.classList.add('bg-error-500', 'text-white', 'border-error-500');
                            }
                        });

                        const feedback = questionArea.querySelector('#question-feedback');
                        feedback.innerHTML = isCorrect
                            ? `<p class="text-success-600 font-bold">✓ ${vt('te_correct')}</p>`
                            : `<p class="text-error-600 font-bold">✗ ${vt('te_wrong_correct_was', { answer: q.correctAnswer })}</p>`;

                        setTimeout(() => {
                            currentQuestionIndex++;
                            updateProgress();
                            // Fix 1A: Only save if NOT finished
                            if (currentQuestionIndex < questions.length) {
                                saveProgress();
                                renderQuestion();
                            } else {
                                showResults();
                            }
                        }, 1500);
                    });
                });

            } else if (q.type === 'de-no') {
                questionArea.innerHTML = `
                    <div class="mb-4">
                        <p class="text-sm text-neutral-600 mb-2">${vt('te_translate_to_native', { target: targetLabel, native: nativeLabel.toLowerCase() })}</p>
                        <p class="text-2xl font-bold text-neutral-800 mb-4">${q.question}</p>
                        ${isNumberQuestion(q.question, true) ? `<span class="text-sm text-neutral-500 block mt-1 mb-2">${vt('te_number_hint')}</span>` : ''}
                    </div>
                    <div>
                        <label class="text-sm font-medium text-neutral-700">${vt('te_your_answer')}</label>
                        <input type="text" id="test-input" class="mt-1 block w-full p-3 border-2 border-neutral-300 rounded-md shadow-sm text-lg" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
                    </div>
                    <div id="test-special-chars" class="mt-3 flex items-center gap-2 flex-wrap"></div>
                    <div id="question-feedback" class="mt-4 h-12"></div>
                    <button id="test-submit-btn" class="w-full bg-primary-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-600 transition-colors mt-4">${vt('te_check_answer')}</button>
                `;

                createSpecialCharsComponent('test-special-chars');

                const inputEl = questionArea.querySelector('#test-input');
                const submitBtn = questionArea.querySelector('#test-submit-btn');
                const feedback = questionArea.querySelector('#question-feedback');

                const checkAnswer = () => {
                    const userAnswer = inputEl.value.trim();
                    const result = isAnswerCorrect(userAnswer, q.correctAnswer, q.isVerb, q.isNoun, true, q.synonyms);

                    answers.push(result);

                    inputEl.disabled = true;
                    submitBtn.disabled = true;

                    let explanationHtml = '';
                    if (q.synonym_forklaringer && Object.keys(q.synonym_forklaringer).length > 0) {
                        const explanations = Object.entries(q.synonym_forklaringer)
                            .map(([word, expl]) => `<span class="text-neutral-600">${word}: ${expl}</span>`)
                            .join(', ');
                        explanationHtml = `<div class="mt-2 max-h-32 overflow-y-auto p-2 bg-neutral-50 rounded border border-neutral-200"><p class="text-sm text-neutral-500">💡 ${explanations}</p></div>`;
                    }

                    // SM-2 Update (test mode = full credit)
                    if (context.updateProgress && q.wordId) {
                        const quality = result.correct ? (result.partial ? 4 : 5) : 1;
                        context.updateProgress(q.wordId, quality, 'test');
                    }

                    if (result.correct) {
                        sessionPoints++; // Track point for UI (iOS-aligned)
                        const typoInfo = result.partial ? `<p class="text-sm mt-1"><span class="text-neutral-600">(${vt('te_correct_was', { answer: q.correctAnswer })})</span></p>` : '';
                        const baseMsg = result.partial
                            ? `<p class="text-success-600 font-bold">✓ ${vt('te_correct_typo')}</p>`
                            : `<p class="text-success-600 font-bold">✓ ${vt('te_correct_perfect')}</p>`;
                        feedback.innerHTML = baseMsg + typoInfo + explanationHtml;
                    } else {
                        let synonymInfo = '';
                        if (q.synonyms && q.synonyms.length > 0) {
                            synonymInfo = ` <span class="text-neutral-500">(${vt('te_other_accepted', { answers: q.synonyms.join(', ') })})</span>`;
                        }
                        feedback.innerHTML = `
                            <p class="text-error-600 font-bold">✗ ${vt('te_wrong_correct_answer', { answer: q.correctAnswer })}${synonymInfo}</p>
                            ${explanationHtml}
                        `;

                        // Store answer data for reporting on next question
                        lastWrongAnswer = {
                            lessonId: chapters ? `kapittel-${Array.from(chapters).join('-')}` : 'test',
                            exerciseType: 'test',
                            questionType: q.type,
                            prompt: q.question,
                            userAnswer: userAnswer,
                            correctAnswer: q.correctAnswer,
                            wordType: q.isVerb ? 'verb' : (q.isNoun ? 'noun' : 'word'),
                            existingSynonyms: q.synonyms || [],
                            isNoun: q.isNoun || false,
                            isVerb: q.isVerb || false
                        };

                        if (knownWords.has(q.question)) {
                            forgottenWords.add(q.question);
                        }
                    }

                    setTimeout(() => {
                        currentQuestionIndex++;
                        updateProgress();
                        // Fix 1A: Only save if NOT finished
                        if (currentQuestionIndex < questions.length) {
                            saveProgress();
                            renderQuestion();
                        } else {
                            showResults();
                        }
                    }, 1500);
                };

                submitBtn.addEventListener('click', checkAnswer);
                inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') checkAnswer(); });
                setTimeout(() => inputEl.focus(), 100);

            } else if (q.type === 'no-de') {
                questionArea.innerHTML = `
                    <div class="mb-4">
                        <p class="text-sm text-neutral-600 mb-2">${vt('te_translate_to_target', { native: nativeLabel, target: targetLabel.toLowerCase() })}</p>
                        <p class="text-2xl font-bold text-neutral-800 mb-4">${q.question}</p>
                        ${isNumberQuestion(q.question, false) ? `<span class="text-sm text-neutral-500 block mt-1 mb-2">${vt('te_number_hint_write')}</span>` : ''}
                    </div>
                    ${q.isNoun ? `
                        <div class="mb-4">
                            <label class="text-sm font-medium text-neutral-700 mb-2 block">${vt('te_select_gender')}</label>
                            <div class="grid grid-cols-${Object.keys(context.config?.languageConfig?.grammar?.articles || { m: 'der', f: 'die', n: 'das' }).filter(k => ['m', 'f', 'n'].includes(k)).length} gap-3">
                                ${Object.entries(context.config?.languageConfig?.grammar?.articles || { m: 'der', f: 'die', n: 'das' })
                            .filter(([key]) => ['m', 'f', 'n'].includes(key))
                            .map(([, label]) => `
                                    <button class="gender-btn p-3 bg-surface border-2 border-neutral-300 rounded-lg font-bold hover:bg-neutral-100" data-gender="${label}">${label}</button>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    <div>
                        <label class="text-sm font-medium text-neutral-700">${q.isNoun ? vt('te_answer_noun_only') : vt('te_your_answer')}</label>
                        <input type="text" id="test-input" class="mt-1 block w-full p-3 border-2 border-neutral-300 rounded-md shadow-sm text-lg" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
                    </div>
                    <div id="test-special-chars" class="mt-3 flex items-center gap-2 flex-wrap"></div>
                    <div id="question-feedback" class="mt-4 h-12"></div>
                    <button id="test-submit-btn" class="w-full bg-primary-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-600 transition-colors mt-4">${vt('te_check_answer')}</button>
                `;

                createSpecialCharsComponent('test-special-chars');

                const inputEl = questionArea.querySelector('#test-input');
                const submitBtn = questionArea.querySelector('#test-submit-btn');
                const feedback = questionArea.querySelector('#question-feedback');
                const genderBtns = questionArea.querySelectorAll('.gender-btn');

                let selectedGender = null;

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

                const checkAnswer = () => {
                    let userAnswer = inputEl.value.trim();

                    let explanationHtml = '';
                    if (q.synonym_forklaringer && Object.keys(q.synonym_forklaringer).length > 0) {
                        const explanations = Object.entries(q.synonym_forklaringer)
                            .map(([word, expl]) => `<span class="text-neutral-600">${word}: ${expl}</span>`)
                            .join(', ');
                        explanationHtml = `<div class="mt-2 max-h-32 overflow-y-auto p-2 bg-neutral-50 rounded border border-neutral-200"><p class="text-sm text-neutral-500">💡 ${explanations}</p></div>`;
                    }

                    const getSynonymInfo = () => {
                        if (q.synonyms && q.synonyms.length > 0) {
                            return ` <span class="text-neutral-500">(${vt('te_other_accepted', { answers: q.synonyms.join(', ') })})</span>`;
                        }
                        return '';
                    };

                    if (q.isNoun) {
                        const articles = context.config?.languageConfig?.grammar?.articles || { m: 'der', f: 'die', n: 'das' };
                        const allowedArticles = Object.values(articles).filter(v => v && !v.includes('/'));

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

                        if (userGender === null) {
                            const articleString = allowedArticles.join('/');
                            feedback.innerHTML = `<p class="text-warning-600 font-bold">⚠ ${vt('te_must_select_gender', { articles: articleString })}</p>`;
                            return;
                        }

                        const wordResult = isAnswerCorrect(userAnswer, q.correctAnswer, false, true, false, q.synonyms);
                        const genderCorrect = userGender === q.artikel;

                        genderAnswers.push({ correct: genderCorrect });
                        answers.push(wordResult);

                        // SM-2 Update (test mode = full credit)
                        // For nouns: correct word + correct gender = 5, correct word + wrong gender = 3, wrong word = 1
                        if (context.updateProgress && q.wordId) {
                            let quality;
                            if (wordResult.correct && genderCorrect) {
                                quality = wordResult.partial ? 4 : 5;
                            } else if (wordResult.correct && !genderCorrect) {
                                quality = 3; // Word correct but gender wrong
                            } else {
                                quality = 1; // Wrong word
                            }
                            context.updateProgress(q.wordId, quality, 'test');
                        }

                        inputEl.disabled = true;
                        submitBtn.disabled = true;
                        genderBtns.forEach(btn => btn.disabled = true);

                        if (wordResult.correct && genderCorrect) {
                            sessionPoints++; // Track point for UI (iOS-aligned)
                            const typoInfo = wordResult.partial ? `<p class="text-sm mt-1"><span class="text-neutral-600">(${vt('te_correct_was', { answer: q.correctAnswer })})</span></p>` : '';
                            feedback.innerHTML = `<p class="text-success-600 font-bold">✓ ${wordResult.partial ? vt('te_correct_typo') : vt('te_correct_perfect')}</p>` + typoInfo + explanationHtml;
                        } else if (wordResult.correct && !genderCorrect) {
                            // Word correct but gender wrong - still give point for word (iOS-aligned)
                            sessionPoints++;
                            const typoInfo = wordResult.partial ? `<p class="text-sm mt-1"><span class="text-neutral-600">(${vt('te_correct_was', { answer: q.correctAnswer })})</span></p>` : '';
                            const typoText = wordResult.partial ? ` (${vt('te_correct_typo').replace('✓ ', '')})` : '';
                            feedback.innerHTML = `<p class="text-success-600 font-bold">✓ ${vt('te_correct_word_wrong_gender', { typo: typoText, article: q.artikel, answer: q.correctAnswer })}</p>` + typoInfo + explanationHtml;
                        } else if (!wordResult.correct && genderCorrect) {
                            feedback.innerHTML = `
                                <p class="text-error-600 font-bold">✗ ${vt('te_wrong_word_correct_gender', { answer: `${q.artikel} ${q.correctAnswer}` })}${getSynonymInfo()}</p>
                                ${explanationHtml}
                            `;

                            // Store answer data for reporting on next question
                            lastWrongAnswer = {
                                lessonId: chapters ? `kapittel-${Array.from(chapters).join('-')}` : 'test',
                                exerciseType: 'test',
                                questionType: q.type,
                                prompt: q.question,
                                userAnswer: userAnswer,
                                correctAnswer: q.correctAnswer,
                                userGender: userGender,
                                correctGender: q.artikel,
                                wordType: 'noun',
                                existingSynonyms: q.synonyms || [],
                                isNoun: true,
                                isVerb: false
                            };
                        } else {
                            feedback.innerHTML = `
                                <p class="text-error-600 font-bold">✗ ${vt('te_wrong_correct_answer', { answer: `${q.artikel} ${q.correctAnswer}` })}${getSynonymInfo()}</p>
                                ${explanationHtml}
                            `;

                            // Store answer data for reporting on next question
                            lastWrongAnswer = {
                                lessonId: chapters ? `kapittel-${Array.from(chapters).join('-')}` : 'test',
                                exerciseType: 'test',
                                questionType: q.type,
                                prompt: q.question,
                                userAnswer: userAnswer,
                                correctAnswer: q.correctAnswer,
                                userGender: userGender,
                                correctGender: q.artikel,
                                wordType: 'noun',
                                existingSynonyms: q.synonyms || [],
                                isNoun: true,
                                isVerb: false
                            };
                        }

                        if (!wordResult.correct && q.isNoun) {
                            if (knownWords.has(q.correctAnswer)) {
                                forgottenWords.add(q.correctAnswer);
                            }
                        }

                    } else {
                        const result = isAnswerCorrect(userAnswer, q.correctAnswer, q.isVerb, false, false, q.synonyms);
                        answers.push(result);

                        // SM-2 Update (test mode = full credit)
                        if (context.updateProgress && q.wordId) {
                            const quality = result.correct ? (result.partial ? 4 : 5) : 1;
                            context.updateProgress(q.wordId, quality, 'test');
                        }

                        inputEl.disabled = true;
                        submitBtn.disabled = true;

                        if (result.correct) {
                            sessionPoints++; // Track point for UI (iOS-aligned)
                            const typoInfo = result.partial ? `<p class="text-sm mt-1"><span class="text-neutral-600">(${vt('te_correct_was', { answer: q.correctAnswer })})</span></p>` : '';
                            const baseMsg = result.partial
                                ? `<p class="text-success-600 font-bold">✓ ${vt('te_correct_typo')}</p>`
                                : `<p class="text-success-600 font-bold">✓ ${vt('te_correct_perfect')}</p>`;
                            feedback.innerHTML = baseMsg + typoInfo + explanationHtml;
                        } else {
                            feedback.innerHTML = `
                                <p class="text-error-600 font-bold">✗ ${vt('te_wrong_correct_answer', { answer: q.correctAnswer })}${getSynonymInfo()}</p>
                                ${explanationHtml}
                            `;

                            // Store answer data for reporting on next question
                            lastWrongAnswer = {
                                lessonId: chapters ? `kapittel-${Array.from(chapters).join('-')}` : 'test',
                                exerciseType: 'test',
                                questionType: q.type,
                                prompt: q.question,
                                userAnswer: userAnswer,
                                correctAnswer: q.correctAnswer,
                                wordType: q.isVerb ? 'verb' : 'word',
                                existingSynonyms: q.synonyms || [],
                                isNoun: false,
                                isVerb: q.isVerb || false
                            };

                            if (!result.correct) {
                                const germanWord = q.type === 'no-de' ? q.correctAnswer : q.question;
                                if (knownWords.has(germanWord)) {
                                    forgottenWords.add(germanWord);
                                }
                            }
                        }
                    }

                    setTimeout(() => {
                        currentQuestionIndex++;
                        updateProgress();
                        // Fix 1A: Only save if NOT finished
                        if (currentQuestionIndex < questions.length) {
                            saveProgress();
                            renderQuestion();
                        } else {
                            showResults();
                        }
                    }, 1500);
                };

                submitBtn.addEventListener('click', checkAnswer);
                inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') checkAnswer(); });
                setTimeout(() => inputEl.focus(), 100);
            }
        }


        function showResults() {
            try {
                saveData(progressKey, null);
                let correctCount = 0;
                let partialCount = 0;

                answers.forEach(answer => {
                    if (answer.correct && !answer.partial) {
                        correctCount++;
                    } else if (answer.correct && answer.partial) {
                        correctCount++;
                        partialCount++;
                    }
                });

                const genderCorrectCount = genderAnswers.filter(a => a.correct).length;
                const genderPercentage = genderAnswers.length > 0
                    ? Math.round((genderCorrectCount / genderAnswers.length) * 100)
                    : 0;

                const totalVocab = originalTotalVocab; // Fix 2A: Use preserved count
                const finalScore = Math.floor((correctCount / questions.length) * totalVocab);
                const percentage = Math.round((correctCount / questions.length) * 100);

                const testResults = {
                    score: finalScore,
                    totalVocab: totalVocab,
                    percentage: percentage,
                    correctCount: correctCount,
                    partialCount: partialCount,
                    genderCorrectCount: genderCorrectCount,
                    genderTotal: genderAnswers.length,
                    genderPercentage: genderPercentage,
                    chapters: Array.from(chapters), // Fix 2C: Add for debugging
                    timestamp: new Date().toISOString(),
                    date: new Date().toLocaleDateString('no-NO', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                };
                saveData(resultsKey, testResults); // Save for start-screen display & unlock check
                logVocabTestResult(testResults);

                // For glossary tests, skip the test engine result screen and go directly
                // to the glossary-specific result screen with attempt tracking
                if (testType === 'glossary' && context.onExit) {
                    exitFullscreen();
                    context.onExit();
                    return;
                }

                if (typeof confetti === 'function' && percentage >= 80) {
                    confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
                }

                // Points display (iOS-aligned)
                const pointsHtml = sessionPoints > 0 ? `
                <div class="flex items-center justify-center gap-2 mb-4">
                    <span class="text-3xl font-bold text-primary-500">+${sessionPoints}</span>
                    <span class="text-lg text-neutral-600">${vt('te_points')}</span>
                </div>
            ` : '';

                container.innerHTML = `
                <div class="w-full max-w-2xl p-6 border rounded-lg bg-surface shadow-lg">
                    <h3 class="text-3xl font-bold ${testType === 'unlock' && percentage < 80 ? 'text-error-700' : 'text-success-700'} mb-4 text-center">
                        ${testType === 'unlock' ? vt('te_chapter_test_complete') : vt('te_test_complete')}
                    </h3>

                    ${testType === 'unlock' ? `
                        <div class="text-center mb-6">
                            <span class="text-2xl font-bold ${percentage >= 80 ? 'text-success-600' : 'text-error-600'}">
                                ${percentage >= 80 ? vt('te_passed') : vt('te_not_passed')}
                            </span>
                            <p class="text-neutral-600 mt-1">
                                ${percentage >= 80 ? vt('te_next_unlocked') : vt('te_need_80')}
                            </p>
                        </div>
                    ` : ''}

                    ${pointsHtml}

                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div class="bg-neutral-50 p-4 rounded-lg border border-neutral-200 text-center">
                            <p class="text-xs text-neutral-500 mb-1">${vt('te_correct_answers')}</p>
                            <p class="text-3xl font-bold text-success-600">${percentage}%</p>
                            <p class="text-xs text-neutral-400">${vt('te_of_questions', { correct: correctCount, total: questions.length })}</p>
                        </div>
                        <div class="bg-neutral-50 p-4 rounded-lg border border-neutral-200 text-center">
                            <p class="text-xs text-neutral-500 mb-1">${vt('te_total_score')}</p>
                            <p class="text-3xl font-bold text-primary-600">${finalScore}</p>
                            <p class="text-xs text-neutral-400">${vt('te_of_words', { count: totalVocab })}</p>
                        </div>
                    </div>

                    ${genderAnswers.length > 0 ? `
                        <div class="bg-success-50 p-4 rounded-lg border border-success-200 text-center mb-4">
                            <p class="text-xs text-neutral-500 mb-1">${vt('te_noun_gender_accuracy')}</p>
                            <p class="text-2xl font-bold text-success-700">${genderPercentage}%</p>
                            <p class="text-xs text-neutral-400">${vt('te_nouns_count', { correct: genderCorrectCount, total: genderAnswers.length })}</p>
                        </div>
                    ` : ''}

                    <div class="flex justify-center mb-4">
                        <canvas id="results-pie-chart" width="250" height="250"></canvas>
                    </div>

                    ${partialCount > 0 ? `
                        <p class="text-sm text-neutral-600 text-center mb-4">
                            ${vt('te_typos_accepted', { count: partialCount })}
                        </p>
                    ` : ''}

                    ${forgottenWords.size > 0 ? `
                        <div class="bg-warning-50 p-4 rounded-lg mb-6 border border-warning-200">
                            <h4 class="font-bold text-warning-800 mb-2">${vt('te_words_to_practice')}</h4>
                            <p class="text-sm text-neutral-600 mb-3">${vt('te_words_marked_known')}</p>
                            <ul class="list-disc list-inside text-left text-neutral-700">
                                ${Array.from(forgottenWords).map(w => `<li>${w}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}

                    <div class="flex flex-col sm:flex-row gap-4">
                        <button id="restart-test-btn" class="flex-1 bg-primary-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-600 transition-colors">
                            ${vt('te_retake_test')}
                        </button>
                        <button id="exit-test-btn" class="flex-1 bg-neutral-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-neutral-600 transition-colors">
                            ${vt('te_exit')}
                        </button>
                    </div>
                </div>
            `;

                // Draw pie chart
                const canvas = container.querySelector('#results-pie-chart');
                const ctx = canvas.getContext('2d');
                const centerX = 125;
                const centerY = 125;
                const radius = 100;

                const correctAngle = (correctCount / questions.length) * 2 * Math.PI;
                const incorrectAngle = ((questions.length - correctCount) / questions.length) * 2 * Math.PI;

                // Draw correct portion (green)
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + correctAngle);
                ctx.fillStyle = '#22c55e';
                ctx.fill();

                // Draw incorrect portion (red)
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.arc(centerX, centerY, radius, -Math.PI / 2 + correctAngle, -Math.PI / 2 + correctAngle + incorrectAngle);
                ctx.fillStyle = '#ef4444';
                ctx.fill();

                // Add center circle for donut effect
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius * 0.6, 0, 2 * Math.PI);
                ctx.fillStyle = '#ffffff';
                ctx.fill();

                // Add percentage text in center
                ctx.fillStyle = '#1c1917';
                ctx.font = 'bold 28px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${percentage}%`, centerX, centerY);

                container.querySelector('#restart-test-btn').addEventListener('click', () => {
                    exitFullscreen();
                    showStartScreen();
                });

                container.querySelector('#exit-test-btn').addEventListener('click', () => {
                    exitFullscreen();
                    if (context.onExit) {
                        context.onExit();
                    } else {
                        window.location.href = 'repetisjon.html';
                    }
                });

                // Only scroll into view if not in fullscreen mode
                if (!usingNativeFullscreen && !container.classList.contains('fixed')) {
                    container.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }

                if (forgottenWords.size > 0) {
                    forgottenWords.forEach(word => knownWords.delete(word));
                    saveKnownWords();
                }
            } catch (err) {
                console.error('Error showing results:', err);
                container.innerHTML = `
                <div class="p-6 bg-error-50 rounded-lg text-center border-2 border-error-200">
                    <h3 class="text-xl font-bold text-error-800 mb-2">${vt('te_error_title')}</h3>
                    <p class="text-error-700 mb-4">${vt('te_error_desc')}</p>
                    <p class="text-xs font-mono text-error-600 mb-4 bg-surface p-2 rounded border border-error-100">${err.message}</p>
                    <button id="error-restart-btn" class="bg-error-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-error-700 transition-colors">${vt('te_go_back')}</button>
                </div>
            `;
                const btn = container.querySelector('#error-restart-btn');
                if (btn) btn.addEventListener('click', () => {
                    if (context.onExit) context.onExit();
                    else window.location.reload();
                });
            }
        }

        // Start rendering questions
        renderQuestion();
    }

    // Start by showing the start screen
    // Note: enterFullscreen() is called inside button click handlers (user gesture required)
    showStartScreen();
}
