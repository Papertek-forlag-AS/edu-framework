
import { saveData, loadData } from '../progress/index.js';
import { createSpecialCharsComponent } from '../ui.js';
import { getTargetLanguageCode } from '../core/language-utils.js';

// Dynamic verb classification import — loads language-specific file at runtime
let verbClassification = {};
try {
    const langCode = getTargetLanguageCode();
    const verbClassJson = await import(`../../shared/vocabulary/dictionary/verb-classification-${langCode}.json`, { with: { type: 'json' } });
    const { _metadata: _vcMeta, ...rest } = verbClassJson.default || verbClassJson;
    verbClassification = rest;
} catch (e) {
    console.warn('Verb classification data not available for this language:', e.message);
}

// verbbank is now passed in via context.verbbank to support multiple languages
// import verbbankJson from '../../shared/vocabulary/german/verbbank.json' with { type: 'json' };
// const verbbank = verbbankJson;

export function renderVerbTest(container, context) {
    const { vocabulary, chapters, verbbank, config } = context;
    const pronomenList = config?.languageConfig?.grammar?.pronouns || ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie'];

    // Helper to determine if a verb is strong/irregular in present tense
    // Uses verbClass for tense-aware classification with fallback to grammarType
    function isStrongVerb(verbData) {
        const vc = verbClassification[verbData.verbId];
        if (vc) {
            // Currently exercises only test presens conjugations
            return (vc.presens || vc.default) === 'strong';
        }
        // Fallback: check grammarType (handles both 'strong' and 'sterkt')
        return verbData.grammarType === 'strong' || verbData.grammarType === 'sterkt';
    }

    // Helper to determine if a verb is a modal verb
    function isModalVerb(verbData) {
        const vc = verbClassification[verbData.verbId];
        if (vc) {
            return vc.default === 'modal';
        }
        return verbData.modal === true || verbData.grammarType === 'modal';
    }

    // 1. Select verbs based on chapters and filters
    // If we have saved state, we don't need to re-select verbs or regenerate questions
    let questions = [];
    let currentQuestionIndex = 0;
    let score = 0;
    let userAnswers = [];
    let transitionTimeout = null;
    let isExiting = false; // Flag to prevent double exit handling
    let helpModeActive = context.savedState ? context.savedState.helpModeActive : false; // Restore help mode state if saved
    console.log('renderVerbTest initialized', { savedState: !!context.savedState });

    // Centralized exit handler
    const handleExit = () => {
        if (isExiting) return;
        isExiting = true;

        console.log('Handling exit...');
        if (transitionTimeout) {
            clearTimeout(transitionTimeout);
        }

        // Remove fullscreen listener to prevent leaks
        document.removeEventListener('fullscreenchange', onFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
        document.removeEventListener('mozfullscreenchange', onFullscreenChange);
        document.removeEventListener('MSFullscreenChange', onFullscreenChange);

        exitFullscreen();

        if (context.onExit) {
            context.onExit();
        }
    };

    // Fullscreen change listener (handles ESC key)
    const onFullscreenChange = () => {
        if (!document.fullscreenElement && !document.webkitIsFullScreen && !document.mozFullScreen && !document.msFullscreenElement) {
            console.log('Fullscreen exited via browser mechanism (e.g. ESC)');
            handleExit();
        }
    };

    // Attach listeners
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('mozfullscreenchange', onFullscreenChange);
    document.addEventListener('MSFullscreenChange', onFullscreenChange);

    function showExitWarning(onConfirm) {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-neutral-900 bg-opacity-50 flex items-center justify-center z-[100] backdrop-blur-sm';

        // Create modal content
        const modal = document.createElement('div');
        modal.className = 'bg-surface rounded-lg p-6 max-w-md mx-4 shadow-xl text-center';
        modal.innerHTML = `
            <h3 class="text-xl font-bold text-neutral-900 mb-4">⚠️ Avslutt test?</h3>
            <p class="text-neutral-700 mb-6">Er du sikker på at du vil avslutte? Fremgangen din blir lagret, og du kan fortsette senere.</p>
            <div class="flex gap-3 justify-center">
                <button id="modal-cancel" class="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 rounded-lg font-semibold transition-colors">Avbryt</button>
                <button id="modal-ok" class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors">Avslutt</button>
            </div>
        `;

        overlay.appendChild(modal);
        // Append to container to ensure visibility in fullscreen
        container.appendChild(overlay);

        // Event listeners
        const okBtn = modal.querySelector('#modal-ok');
        const cancelBtn = modal.querySelector('#modal-cancel');

        okBtn.addEventListener('click', () => {
            container.removeChild(overlay);
            onConfirm();
        });

        cancelBtn.addEventListener('click', () => {
            container.removeChild(overlay);
        });
    }

    if (context.savedState) {
        questions = context.savedState.questions;
        currentQuestionIndex = context.savedState.currentQuestionIndex;
        score = context.savedState.score;
        userAnswers = context.savedState.userAnswers || [];
    } else {
        // ... Normal initialization logic ...
        let eligibleVerbs = [];
        const filters = context.verbFilters || { weak: true, strong: true, modal: true };

        // Select verbs from vocabulary
        // Support both 'bøyinger' (legacy) and 'conjugations' (JSON field name)
        const getConjugations = (w) => w.bøyinger || w.conjugations;
        vocabulary.filter(w => w.type === 'verb' && getConjugations(w) && getConjugations(w).presens).forEach(verbData => {
            const isModal = isModalVerb(verbData);
            const isStrong = isStrongVerb(verbData);
            const isWeak = !isStrong && !isModal;

            // Include verb if its category filter is active
            if ((isModal && filters.modal) || (isStrong && !isModal && filters.strong) || (isWeak && filters.weak)) {
                eligibleVerbs.push({ key: verbData.target, verbId: verbData.verbId, data: verbData });
            }
        });

        if (eligibleVerbs.length === 0) {
            // Check if modal filter is active but no modal verbs found
            const modalFilterActive = filters.modal && !filters.weak && !filters.strong;
            const message = modalFilterActive
                ? 'Det finnes ingen modalverb i de valgte kapitlene. Vennligst velg flere kapitler eller endre filteret.'
                : 'Ingen verb funnet for de valgte kriteriene.';

            container.innerHTML = `<div class="text-center py-8"><p class="text-neutral-500 mb-4">${message}</p><button id="back-btn" class="text-primary-600 hover:underline">Gå tilbake</button></div>`;
            container.querySelector('#back-btn')?.addEventListener('click', () => {
                if (context.onExit) context.onExit();
            });
            return;
        }

        // 2. Generate Questions
        const pronomenList = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie'];

        // Helper function to sample verbs with repetition if needed
        const sampleVerbs = (verbs, count) => {
            const sampled = [];
            for (let i = 0; i < count; i++) {
                const randomIndex = Math.floor(Math.random() * verbs.length);
                sampled.push(verbs[randomIndex]);
            }
            return sampled;
        };

        // Phase 1: 5 Multiple Choice Questions
        const mcqCount = 5;
        const mcqVerbs = sampleVerbs(eligibleVerbs, mcqCount);

        mcqVerbs.forEach(verbObj => {
            const pronomen = pronomenList[Math.floor(Math.random() * pronomenList.length)];
            const conjugations = getConjugations(verbObj.data);
            const former = conjugations.presens.former;

            // Handle both object and array formats for former
            let correctForm = '';
            let allForms = [];

            if (Array.isArray(former)) {
                const pronounIndex = pronomenList.indexOf(pronomen);
                correctForm = former[pronounIndex];
                allForms = former;
            } else {
                correctForm = former[pronomen];
                allForms = Object.values(former);
            }

            // Generate distractors
            const uniqueForms = [...new Set(allForms)].filter(f => f !== correctForm);
            let distractors = uniqueForms.sort(() => 0.5 - Math.random()).slice(0, 3);

            while (distractors.length < 3) {
                const fake = correctForm + (Math.random() > 0.5 ? 't' : 'en');
                if (!distractors.includes(fake) && fake !== correctForm) distractors.push(fake);
                else distractors.push('???');
            }

            questions.push({
                type: 'mcq',
                verb: verbObj.key,
                verbId: verbObj.verbId, // Original verbbank key for tooltip lookup
                pronomen: pronomen,
                correctAnswer: correctForm,
                alternatives: [correctForm, ...distractors].sort(() => 0.5 - Math.random())
            });
        });

        // Phase 2: 10 Fill-in Questions
        const fillInCount = 10;
        const fillInVerbs = sampleVerbs(eligibleVerbs, fillInCount);

        fillInVerbs.forEach(verbObj => {
            const pronomen = pronomenList[Math.floor(Math.random() * pronomenList.length)];
            const conjugations = getConjugations(verbObj.data);
            const former = conjugations.presens.former;

            let correctForm = '';
            if (Array.isArray(former)) {
                const pronounIndex = pronomenList.indexOf(pronomen);
                correctForm = former[pronounIndex];
            } else {
                correctForm = former[pronomen];
            }

            questions.push({
                type: 'fill-in',
                verb: verbObj.key,
                verbId: verbObj.verbId, // Original verbbank key for tooltip lookup
                pronomen: pronomen,
                correctAnswer: correctForm
            });
        });
    }

    // Fullscreen helper
    const enterFullscreen = () => {
        try {
            if (container.requestFullscreen) container.requestFullscreen();
            else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
            else if (container.msRequestFullscreen) container.msRequestFullscreen();
            container.classList.add('bg-surface', 'overflow-y-auto', 'flex', 'items-center', 'justify-center');
        } catch (e) { console.warn(e); }
    };

    // Exit fullscreen helper
    const exitFullscreen = () => {
        if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
            else if (document.msExitFullscreen) document.msExitFullscreen();
        }
        container.classList.remove('bg-surface', 'overflow-y-auto', 'flex', 'items-center', 'justify-center');
    };

    function saveProgress() {
        const state = {
            questions,
            currentQuestionIndex,
            score,
            userAnswers,
            chapters: context.chapters, // Save context to verify validity on load
            verbFilters: context.verbFilters,
            helpModeActive
        };
        saveData('verb-test-progress', state);
    }

    function clearProgress() {
        localStorage.removeItem('verb-test-progress');
    }

    // Help mode tooltip handler for verb conjugations in fullscreen
    function setupHelpModeTooltips(container) {
        const verbElements = container.querySelectorAll('.grammar-info[data-type="verb"]');

        verbElements.forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();

                const verbKey = el.dataset.verb;
                if (!verbKey) return;

                // Look up verb in verbbank
                const verb = verbbank[verbKey] ||
                    verbbank[`${verbKey}_verb`] ||
                    verbbank[verbKey.toLowerCase()] ||
                    verbbank[`${verbKey.toLowerCase()}_verb`];

                if (!verb || !verb.conjugations?.presens) return;

                // Remove any existing tooltip
                const existingTooltip = container.querySelector('.verb-help-tooltip');
                if (existingTooltip) {
                    existingTooltip.remove();
                    // If clicking same element, just close
                    if (existingTooltip.dataset.verbKey === verbKey) return;
                }

                // Build conjugation table
                const former = verb.conjugations.presens.former;
                const translation = verb.translations?.nb || '';

                // Verb type indicator - use verbClass if available
                let verbTypeIcon = '';
                const vcLookup = verbClassification[verbKey] || verbClassification[`${verbKey}_verb`];
                if (vcLookup?.default === 'modal' || verb.modal) {
                    verbTypeIcon = '<span class="text-info-600">🔧⚡</span> ';
                } else if (vcLookup?.default === 'strong' || verb.type === 'strong' || verb.type === 'sterkt') {
                    verbTypeIcon = '<span class="text-primary-500">⚡</span> ';
                } else if (vcLookup?.default === 'mixed') {
                    verbTypeIcon = '<span class="text-accent4-500">⚡</span> ';
                }

                const tooltipHTML = `
                    <div class="verb-help-tooltip fixed bg-neutral-800 text-white p-4 rounded-lg shadow-xl z-[200] max-w-xs" data-verb-key="${verbKey}">
                        <div class="font-bold text-primary-400 mb-2">${verbTypeIcon}${verb.word || verbKey} - ${translation}</div>
                        <div class="text-sm font-semibold mb-1">Presens:</div>
                        <div class="grid grid-cols-2 gap-1 text-sm">
                            ${Array.isArray(former)
                        ? former.map((form, idx) => `<div>${pronomenList[idx]}: <strong class="text-primary-300">${form}</strong></div>`).join('')
                        : Object.entries(former).map(([pronoun, form]) => `<div>${pronoun}: <strong class="text-primary-300">${form}</strong></div>`).join('')
                    }
                        </div>
                        <div class="mt-2 text-xs text-neutral-400">Klikk hvor som helst for å lukke</div>
                    </div>
                `;

                // Insert tooltip into container (important for fullscreen)
                const tooltipWrapper = document.createElement('div');
                tooltipWrapper.innerHTML = tooltipHTML;
                const tooltip = tooltipWrapper.firstElementChild;
                container.appendChild(tooltip);

                // Position tooltip near the clicked element
                const rect = el.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();

                // Position above the element if possible
                let top = rect.top - containerRect.top - tooltip.offsetHeight - 8;
                if (top < 10) {
                    // Position below if not enough space above
                    top = rect.bottom - containerRect.top + 8;
                }

                tooltip.style.left = `${Math.max(10, rect.left - containerRect.left)}px`;
                tooltip.style.top = `${top}px`;

                // Close on click anywhere
                const closeHandler = (event) => {
                    if (!event.target.closest('.verb-help-tooltip')) {
                        tooltip.remove();
                        container.removeEventListener('click', closeHandler);
                    }
                };

                // Delay adding the close handler to prevent immediate close
                setTimeout(() => {
                    container.addEventListener('click', closeHandler);
                }, 10);
            });
        });
    }

    function renderStartScreen() {
        // If we are resuming, show a "Continue" screen instead of auto-starting
        // (fullscreen can only be triggered by user gesture)
        if (context.savedState) {
            container.innerHTML = `
                <div class="p-6 border rounded-lg bg-surface shadow-lg text-center max-w-md mx-auto">
                    <h3 class="text-2xl font-bold text-primary-700 mb-4">Fortsett test</h3>
                    <p class="text-neutral-600 mb-6">
                        Du har en pågående test.<br>
                        Spørsmål ${context.savedState.currentQuestionIndex + 1} av ${context.savedState.questions.length}
                    </p>
                    <button id="continue-verb-test-btn" class="w-full bg-primary-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-600 transition-colors">
                        Fortsett
                    </button>
                </div>
            `;
            container.querySelector('#continue-verb-test-btn').addEventListener('click', () => {
                enterFullscreen();
                renderQuestion();
            });
            return;
        }

        container.innerHTML = `
            <div class="p-6 border rounded-lg bg-surface shadow-lg text-center max-w-md mx-auto">
                <h3 class="text-2xl font-bold text-primary-700 mb-4">Verbtrening</h3>
                <p class="text-neutral-600 mb-6">
                    Test deg selv i verbbøying!<br>
                    <strong>5</strong> flervalgsoppgaver<br>
                    <strong>10</strong> skriveoppgaver
                </p>

                <div class="bg-neutral-100 p-4 rounded-lg mb-6 text-left">
                    <label class="flex items-start gap-3 cursor-pointer">
                        <input type="checkbox" id="help-mode-checkbox" class="mt-1 w-4 h-4 text-primary-600 rounded">
                        <div>
                            <span class="font-semibold text-neutral-800">Aktiver hjelpemodus</span>
                            <p class="text-sm text-neutral-600 mt-1">Klikk på verb under testen for å se bøyninger.</p>
                        </div>
                    </label>
                </div>

                <button id="start-verb-test-btn" class="w-full bg-primary-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-600 transition-colors">
                    Start Test
                </button>
            </div>
        `;
        container.querySelector('#start-verb-test-btn').addEventListener('click', () => {
            const helpModeCheckbox = container.querySelector('#help-mode-checkbox');
            helpModeActive = helpModeCheckbox ? helpModeCheckbox.checked : false;
            // Enter fullscreen on user gesture (button click)
            enterFullscreen();
            saveProgress(); // Save initial state
            renderQuestion();
        });
    }

    function renderQuestion() {
        const q = questions[currentQuestionIndex];
        const progress = Math.round(((currentQuestionIndex) / questions.length) * 100);

        let content = '';

        // Format verb for display (already clean in target)
        const displayVerb = q.verb;

        if (q.type === 'mcq') {
            content = `
                <div class="mb-6 text-center">
                    <p class="text-sm text-neutral-500 mb-2">Spørsmål ${currentQuestionIndex + 1} av ${questions.length}</p>
                    <div class="w-full bg-neutral-200 rounded-full h-2 mb-6">
                        <div class="bg-primary-500 h-2 rounded-full transition-all" style="width: ${progress}%"></div>
                    </div>
                    <h3 class="text-xl font-bold text-neutral-800 mb-2">Hvilken form er riktig?</h3>
                    <p class="text-lg mb-6">
                        <span class="font-semibold text-primary-700">${q.pronomen}</span> ... (<span class="italic ${helpModeActive ? 'grammar-info cursor-pointer underline' : ''}" data-type="verb" data-verb="${q.verbId || q.verb}">${displayVerb}</span>)
                    </p>
                    <div class="grid grid-cols-1 gap-3">
                        ${q.alternatives.map(alt => `
                            <button class="mc-btn p-4 bg-surface border-2 border-neutral-300 rounded-lg hover:bg-neutral-100 font-semibold text-lg transition-colors" data-answer="${alt}">
                                ${alt}
                            </button>
                        `).join('')}
                    </div>
                    <div id="feedback-area" class="mt-4 h-12"></div>
                    <div class="mt-6 border-t pt-4">
                        <button id="pause-btn" class="text-neutral-500 hover:text-neutral-700 font-semibold text-sm flex items-center justify-center gap-2 mx-auto transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                            </svg>
                            Pause og lagre
                        </button>
                    </div>
                </div>
            `;
        } else if (q.type === 'fill-in') {
            content = `
                <div class="mb-6 text-center">
                    <p class="text-sm text-neutral-500 mb-2">Spørsmål ${currentQuestionIndex + 1} av ${questions.length}</p>
                    <div class="w-full bg-neutral-200 rounded-full h-2 mb-6">
                        <div class="bg-primary-500 h-2 rounded-full transition-all" style="width: ${progress}%"></div>
                    </div>
                    <h3 class="text-xl font-bold text-neutral-800 mb-2">Bøy verbet</h3>
                    <p class="text-lg mb-6">
                        Bøy verbet <strong class="${helpModeActive ? 'grammar-info cursor-pointer underline' : ''}" data-type="verb" data-verb="${q.verbId || q.verb}">${displayVerb}</strong> i presens for <strong>${q.pronomen}</strong>:
                    </p>
                    <input type="text" id="verb-input" class="w-full p-3 border-2 border-neutral-300 rounded-lg text-center text-xl mb-4" autocomplete="off" spellcheck="false">
                    <div id="special-chars" class="flex justify-center gap-2 mb-4"></div>
                    <button id="submit-btn" class="w-full bg-primary-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-600 transition-colors">
                        Sjekk svar
                    </button>
                    <div id="feedback-area" class="mt-4 h-12"></div>
                    <div class="mt-6 border-t pt-4">
                        <button id="pause-btn" class="text-neutral-500 hover:text-neutral-700 font-semibold text-sm flex items-center justify-center gap-2 mx-auto transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                            </svg>
                            Pause og lagre
                        </button>
                    </div>
                </div>
            `;
        }

        const bgColor = helpModeActive ? 'bg-primary-100' : 'bg-surface';
        container.innerHTML = `
            <button id="exit-verb-test-btn" class="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 transition-colors z-50 p-2 bg-white/80 rounded-full backdrop-blur-sm" title="Avslutt">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <div class="w-full max-w-md ${bgColor} p-6 rounded-xl shadow-lg relative">
                ${content}
            </div>
        `;

        // Bind exit button
        container.querySelector('#exit-verb-test-btn').addEventListener('click', () => {
            showExitWarning(() => {
                handleExit();
            });
        });

        // Bind pause button
        container.querySelector('#pause-btn').addEventListener('click', () => {
            showExitWarning(() => {
                handleExit();
            });
        });

        // Initialize help mode tooltips for verb conjugations
        if (helpModeActive) {
            setupHelpModeTooltips(container);
        }

        if (q.type === 'mcq') {
            container.querySelectorAll('.mc-btn').forEach(btn => {
                btn.addEventListener('click', () => handleAnswer(btn.dataset.answer, q));
            });
        } else {
            createSpecialCharsComponent('special-chars');
            const input = container.querySelector('#verb-input');
            const submitBtn = container.querySelector('#submit-btn');

            setTimeout(() => input.focus(), 50);

            const submitHandler = () => handleAnswer(input.value.trim(), q);
            submitBtn.addEventListener('click', submitHandler);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') submitHandler();
            });
        }
    }

    function handleAnswer(userAnswer, question) {
        const isCorrect = userAnswer.toLowerCase() === question.correctAnswer.toLowerCase();
        userAnswers.push({ question, userAnswer, isCorrect });
        if (isCorrect) score++;

        // Save progress after each answer
        saveProgress();

        const feedbackEl = container.querySelector('#feedback-area');

        if (question.type === 'mcq') {
            const buttons = container.querySelectorAll('.mc-btn');
            buttons.forEach(btn => {
                btn.disabled = true;
                if (btn.dataset.answer === question.correctAnswer) {
                    btn.classList.add('bg-success-500', 'text-white', 'border-success-500');
                } else if (btn.dataset.answer === userAnswer && !isCorrect) {
                    btn.classList.add('bg-error-500', 'text-white', 'border-error-500');
                }
            });
        } else {
            const input = container.querySelector('#verb-input');
            const submitBtn = container.querySelector('#submit-btn');
            input.disabled = true;
            submitBtn.disabled = true;
        }

        feedbackEl.innerHTML = isCorrect
            ? '<p class="text-success-600 font-bold text-lg">✓ Riktig!</p>'
            : `<p class="text-error-600 font-bold text-lg">✗ Feil. Riktig: ${question.correctAnswer}</p>`;

        transitionTimeout = setTimeout(() => {
            currentQuestionIndex++;
            if (currentQuestionIndex < questions.length) {
                saveProgress(); // Save new index
                renderQuestion();
            } else {
                clearProgress(); // Test finished
                renderResults();
            }
        }, 1500);
    }

    function renderResults() {
        const percentage = Math.round((score / questions.length) * 100);

        container.innerHTML = `
            <div class="w-full max-w-md bg-surface p-6 rounded-xl shadow-lg text-center">
                <h3 class="text-3xl font-bold text-primary-700 mb-2">Test Fullført!</h3>
                <p class="text-neutral-500 mb-6">Her er resultatet ditt</p>
                
                <div class="bg-neutral-50 p-6 rounded-xl border border-neutral-200 mb-6">
                    <div class="text-5xl font-bold text-primary-600 mb-2">${score}/${questions.length}</div>
                    <div class="text-xl font-semibold ${percentage >= 80 ? 'text-success-600' : 'text-neutral-600'}">${percentage}% Riktig</div>
                </div>

                <div class="flex gap-3">
                    <button id="retry-btn" class="flex-1 bg-neutral-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-neutral-600 transition-colors">
                        Prøv igjen
                    </button>
                    <button id="exit-btn" class="flex-1 bg-primary-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-600 transition-colors">
                        Avslutt
                    </button>
                </div>
            </div>
        `;

        if (typeof confetti === 'function' && percentage >= 80) {
            confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
        }

        container.querySelector('#retry-btn').addEventListener('click', () => {
            // Restart with fresh state (no savedState)
            renderVerbTest(container, { ...context, savedState: null });
        });

        container.querySelector('#exit-btn').addEventListener('click', () => {
            handleExit();
        });
    }

    renderStartScreen();
}
