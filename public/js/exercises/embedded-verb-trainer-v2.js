/**
 * Embedded Verb Trainer v2 — Refactored with ExerciseBase
 *
 * Demonstrates:
 * 1. Automatic event listener cleanup via ctx.listen() + AbortController
 * 2. Safe timers via ctx.setTimeout() — no stale callbacks
 * 3. Cross-module data sync via onStorageChange
 * 4. Eliminated ~400 lines of duplication (startTest/resumeTest merged)
 *
 * Drop-in replacement: same export signature as the original.
 */

import { fetchCoreBank } from '../vocabulary/vocab-api-client.js';
import { getTargetLanguageCode } from '../core/language-utils.js';
const verbbank = await fetchCoreBank(getTargetLanguageCode(), 'verbbank');

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

import { saveData, loadData, trackExerciseCompletion } from '../progress/index.js';
import { createSpecialCharsComponent } from '../ui.js';
import { createExercise, notifyStorageChange } from './exercise-base.js';

// ─── Storage key helpers ─────────────────────────────────────────

function progressKey(exerciseId) {
    return `embedded-verb-trainer-${exerciseId}-progress`;
}

function completionKey(exerciseId) {
    return `embedded-verb-trainer-${exerciseId}-completions`;
}

// ─── Verb helpers (pure functions, no DOM) ───────────────────────

function isStrongVerb(verbKey, verbData) {
    const vc = verbClassification[verbKey];
    if (vc) return (vc.presens || vc.default) === 'strong';
    return verbData.type === 'strong' || verbData.type === 'sterkt';
}

function isModalVerb(verbKey, verbData) {
    const vc = verbClassification[verbKey];
    if (vc) return vc.default === 'modal';
    return verbData.modal === true;
}

function getEligibleVerbs(config) {
    const { chapters, strongOnly = false, modalOnly = false, specificVerbs = null } = config;
    const eligible = [];

    for (const verbKey in verbbank) {
        const verbData = verbbank[verbKey];
        if (!verbData?.conjugations?.presens?.intro) continue;

        const introKap = parseInt(verbData.conjugations.presens.intro.split('.')[0]);
        if (!chapters.includes(introKap)) continue;

        if (specificVerbs?.length > 0) {
            if (specificVerbs.includes(verbKey)) eligible.push({ key: verbKey, data: verbData });
            continue;
        }

        const isStrong = isStrongVerb(verbKey, verbData);
        const isModal = isModalVerb(verbKey, verbData);

        if (modalOnly && isModal) eligible.push({ key: verbKey, data: verbData });
        else if (strongOnly && !modalOnly && isStrong) eligible.push({ key: verbKey, data: verbData });
        else if (!strongOnly && !modalOnly) eligible.push({ key: verbKey, data: verbData });
    }
    return eligible;
}

function getRandomVerbs(sourceArray, count) {
    if (sourceArray.length >= count) {
        return [...sourceArray].sort(() => 0.5 - Math.random()).slice(0, count);
    }
    const result = [...sourceArray];
    while (result.length < count) {
        result.push(sourceArray[Math.floor(Math.random() * sourceArray.length)]);
    }
    return result.sort(() => 0.5 - Math.random());
}

function generateQuestions(eligibleVerbs) {
    const pronomenList = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie'];
    const questions = [];

    // Phase 1: 5 MCQ
    getRandomVerbs(eligibleVerbs, 5).forEach(verbObj => {
        const pronomen = pronomenList[Math.floor(Math.random() * pronomenList.length)];
        const correctForm = verbObj.data.conjugations.presens.former[pronomen];
        const allForms = Object.values(verbObj.data.conjugations.presens.former);
        const uniqueForms = [...new Set(allForms)].filter(f => f !== correctForm);
        let distractors = uniqueForms.sort(() => 0.5 - Math.random()).slice(0, 3);
        while (distractors.length < 3) {
            const fake = correctForm + (Math.random() > 0.5 ? 't' : 'en');
            if (!distractors.includes(fake) && fake !== correctForm) distractors.push(fake);
            else distractors.push('???');
        }
        questions.push({
            type: 'mcq', verb: verbObj.key, pronomen,
            correctAnswer: correctForm,
            alternatives: [correctForm, ...distractors].sort(() => 0.5 - Math.random())
        });
    });

    // Phase 2: 10 fill-in
    getRandomVerbs(eligibleVerbs, 10).forEach(verbObj => {
        const pronomen = pronomenList[Math.floor(Math.random() * pronomenList.length)];
        questions.push({
            type: 'fill-in', verb: verbObj.key, pronomen,
            correctAnswer: verbObj.data.conjugations.presens.former[pronomen]
        });
    });

    return questions;
}

// ─── Storage operations (+ notification) ─────────────────────────

function loadProgress(exerciseId) {
    return loadData(progressKey(exerciseId));
}

function saveProgress(exerciseId, state) {
    saveData(progressKey(exerciseId), state);
    notifyStorageChange(progressKey(exerciseId), state);
}

function clearProgressData(exerciseId) {
    saveData(progressKey(exerciseId), null);
    notifyStorageChange(progressKey(exerciseId), null);
}

function getCompletionCount(exerciseId) {
    return loadData(completionKey(exerciseId)) || 0;
}

function incrementCompletionCount(exerciseId) {
    const count = getCompletionCount(exerciseId) + 1;
    saveData(completionKey(exerciseId), count);
    notifyStorageChange(completionKey(exerciseId), count);
    return count;
}

// ─── Render helpers (return HTML strings, no side effects) ───────

function startScreenHTML(config, eligibleVerbs, completionCount, savedProgress) {
    const { strongOnly = false, modalOnly = false, chapters } = config;
    const verbTypeLabel = modalOnly ? 'modalverb' : (strongOnly ? 'sterke verb' : 'verb');
    const verbTypeLabelCapital = modalOnly ? 'Modalverb' : (strongOnly ? 'Sterke Verb' : 'Verb');
    const chapterRange = chapters.length > 1
        ? `Kapittel ${Math.min(...chapters)}-${Math.max(...chapters)}`
        : `Kapittel ${chapters[0]}`;
    const displayTitle = config.title || `Verbtrening: ${verbTypeLabelCapital} (${chapterRange})`;

    const completionBadge = completionCount > 0
        ? `<div class="inline-block bg-success-100 text-success-800 px-4 py-2 rounded-full text-sm font-semibold mb-4">
               ✓ Fullført ${completionCount} ${completionCount === 1 ? 'gang' : 'ganger'}
           </div>`
        : '';

    if (savedProgress) {
        return `
        <div class="text-center py-6">
            <h3 class="text-lg font-bold text-neutral-800 mb-4">${displayTitle}</h3>
            <p class="text-neutral-600 mb-4">
                Test deg selv på <strong>${eligibleVerbs.length} ${verbTypeLabel}</strong>!<br>
                <strong>5</strong> flervalgsoppgaver + <strong>10</strong> skriveoppgaver
            </p>
            ${completionBadge}
            <div class="bg-info-50 p-4 rounded-lg mb-6 border-2 border-info-300 max-w-md mx-auto">
                <h4 class="font-bold text-info-800 mb-2">⏸️ Pågående test funnet!</h4>
                <p class="text-sm text-info-700 mb-4">Du var på spørsmål ${savedProgress.currentQuestionIndex + 1} av ${savedProgress.questions.length}</p>
                <div class="flex gap-3">
                    <button data-action="resume" class="flex-1 bg-info-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-info-700 transition-colors">
                        Fortsett test
                    </button>
                    <button data-action="new" class="flex-1 bg-neutral-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-neutral-600 transition-colors">
                        Start på nytt
                    </button>
                </div>
            </div>
        </div>`;
    }

    return `
    <div class="text-center py-6">
        <h3 class="text-lg font-bold text-neutral-800 mb-4">${displayTitle}</h3>
        <p class="text-neutral-600 mb-4">
            Test deg selv på <strong>${eligibleVerbs.length} ${verbTypeLabel}</strong>!<br>
            <strong>5</strong> flervalgsoppgaver + <strong>10</strong> skriveoppgaver
        </p>
        ${completionBadge}
        <div class="bg-neutral-100 p-4 rounded-lg mb-6 max-w-md mx-auto">
            <label class="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" data-role="help-mode" class="mt-1 w-4 h-4 text-primary-600 rounded">
                <div class="text-left">
                    <span class="font-semibold text-neutral-800">Aktiver hjelpemodus</span>
                    <p class="text-sm text-neutral-600 mt-1">Klikk på verb under testen for å se bøyninger.</p>
                </div>
            </label>
        </div>
        <button data-action="start" class="w-full max-w-xs mx-auto block bg-primary-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-600 transition-colors">
            Start Test
        </button>
    </div>`;
}

function questionHTML(q, currentIndex, total, helpModeActive) {
    const progress = Math.round((currentIndex / total) * 100);
    const helpClass = helpModeActive ? 'grammar-info cursor-pointer underline' : '';

    const progressBar = `
        <p class="text-sm text-neutral-500 mb-2">Spørsmål ${currentIndex + 1} av ${total}</p>
        <div class="w-full bg-neutral-200 rounded-full h-2 mb-6">
            <div class="bg-primary-500 h-2 rounded-full transition-all" style="width: ${progress}%"></div>
        </div>`;

    if (q.type === 'mcq') {
        return `
        <div class="mb-6">
            ${progressBar}
            <h3 class="text-xl font-bold text-neutral-800 mb-2">Hvilken form er riktig?</h3>
            <p class="text-lg mb-6">
                <span class="font-semibold text-primary-700">${q.pronomen}</span> ...
                (<span class="italic ${helpClass}" data-type="verb" data-verb="${q.verb}">${q.verb}</span>)
            </p>
            <div class="grid grid-cols-1 gap-3">
                ${q.alternatives.map(alt => `
                    <button class="mc-btn p-4 bg-surface border-2 border-neutral-300 rounded-lg hover:bg-neutral-100 font-semibold text-lg transition-colors" data-answer="${alt}">
                        ${alt}
                    </button>
                `).join('')}
            </div>
            <div data-role="feedback" class="mt-4 h-12"></div>
        </div>`;
    }

    return `
    <div class="mb-6">
        ${progressBar}
        <h3 class="text-xl font-bold text-neutral-800 mb-2">Bøy verbet</h3>
        <p class="text-lg mb-6">
            Bøy verbet <strong class="${helpClass}" data-type="verb" data-verb="${q.verb}">${q.verb}</strong>
            i presens for <strong>${q.pronomen}</strong>:
        </p>
        <input type="text" data-role="verb-input" class="w-full p-3 border-2 border-neutral-300 rounded-lg text-center text-xl mb-4" autocomplete="off" spellcheck="false">
        <div data-role="special-chars" class="flex justify-center gap-2 mb-4"></div>
        <button data-action="submit" class="w-full bg-primary-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-600 transition-colors">
            Sjekk svar
        </button>
        <div data-role="feedback" class="mt-4 h-12"></div>
    </div>`;
}

function resultsHTML(score, total, completionCount) {
    const percentage = Math.round((score / total) * 100);
    return `
    <div class="bg-surface p-6 rounded-xl shadow-lg text-center">
        <h3 class="text-3xl font-bold text-primary-700 mb-2">Test Fullført!</h3>
        <p class="text-neutral-500 mb-6">Her er resultatet ditt</p>
        <div class="bg-neutral-50 p-6 rounded-xl border border-neutral-200 mb-6">
            <div class="text-5xl font-bold text-primary-600 mb-2">${score}/${total}</div>
            <div class="text-xl font-semibold ${percentage >= 80 ? 'text-success-600' : 'text-neutral-600'}">${percentage}% Riktig</div>
        </div>
        <div class="bg-success-100 text-success-800 px-4 py-2 rounded-full text-sm font-semibold mb-6 inline-block">
            ✓ Fullført ${completionCount} ${completionCount === 1 ? 'gang' : 'ganger'}
        </div>
        <div class="flex gap-3">
            <button data-action="retry" class="flex-1 bg-primary-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-600 transition-colors">
                Prøv igjen
            </button>
            <button data-action="back" class="flex-1 bg-neutral-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-neutral-600 transition-colors">
                Tilbake
            </button>
        </div>
    </div>`;
}

// ─── Main export ─────────────────────────────────────────────────

export function setupEmbeddedVerbTrainer(exerciseId, config) {
    const eligibleVerbs = getEligibleVerbs(config);

    // The keys this exercise reads/writes — ExerciseBase watches these
    const storageKeys = [progressKey(exerciseId), completionKey(exerciseId)];

    const exercise = createExercise(exerciseId, {
        storageKeys,

        // ── LIFECYCLE: Mount ─────────────────────────────────────
        onMount(ctx) {
            showStartScreen(ctx);
        },

        // ── LIFECYCLE: Storage changed from elsewhere ────────────
        // Example: cloud-sync pulled new completion count, or another
        // tab completed the test. We re-render the start screen so
        // the badge ("Fullført 3 ganger") stays accurate.
        onStorageChange(ctx, key, _newValue) {
            if (key === completionKey(exerciseId)) {
                // Completion count changed externally — refresh start screen
                // but only if we're on the start screen (not mid-test).
                // We detect this by checking if a start/resume button exists.
                if (ctx.$('[data-action="start"]') || ctx.$('[data-action="resume"]')) {
                    ctx.render(showStartScreen);
                }
            }
            if (key === progressKey(exerciseId)) {
                // Progress changed externally (e.g. cloud sync restored a
                // paused test). If we're on the start screen, refresh it
                // so the "resume" prompt appears.
                if (ctx.$('[data-action="start"]')) {
                    ctx.render(showStartScreen);
                }
            }
        },
    });

    // ── Screen: Start ────────────────────────────────────────────

    function showStartScreen(ctx) {
        if (eligibleVerbs.length === 0) {
            ctx.container.innerHTML = `
                <div class="text-center py-8">
                    <p class="text-neutral-500 mb-4">Ingen verb funnet for de valgte kapitlene.</p>
                </div>`;
            return;
        }

        const completionCount = getCompletionCount(exerciseId);
        const savedProgress = loadProgress(exerciseId);

        ctx.container.innerHTML = startScreenHTML(config, eligibleVerbs, completionCount, savedProgress);

        if (savedProgress) {
            ctx.listen(ctx.$('[data-action="resume"]'), 'click', () => {
                ctx.render(c => showTest(c, savedProgress));
            });
            ctx.listen(ctx.$('[data-action="new"]'), 'click', () => {
                clearProgressData(exerciseId);
                ctx.render(showStartScreen);
            });
        } else {
            ctx.listen(ctx.$('[data-action="start"]'), 'click', () => {
                const helpMode = ctx.$('[data-role="help-mode"]')?.checked || false;
                const questions = generateQuestions(eligibleVerbs);
                ctx.render(c => showTest(c, {
                    questions,
                    currentQuestionIndex: 0,
                    score: 0,
                    userAnswers: [],
                    helpModeActive: helpMode,
                }));
            });
        }
    }

    // ── Screen: Test (unified — handles both new and resume) ─────

    function showTest(ctx, state) {
        const { questions, helpModeActive } = state;
        // Mutable test state — scoped to this render phase
        let { currentQuestionIndex, score, userAnswers } = state;

        renderCurrentQuestion();

        // ── Render one question ──────────────────────────────────
        function renderCurrentQuestion() {
            const q = questions[currentQuestionIndex];
            const bgColor = helpModeActive ? 'bg-primary-100' : 'bg-neutral-50';

            ctx.container.innerHTML = `
                <div class="${bgColor} p-6 rounded-xl border border-neutral-200">
                    ${questionHTML(q, currentQuestionIndex, questions.length, helpModeActive)}
                </div>`;

            // Tooltips for help mode
            if (helpModeActive && window.initializeTooltips) {
                ctx.setTimeout(() => window.initializeTooltips(), 50);
            }

            // ── Wire up interaction ──────────────────────────────
            if (q.type === 'mcq') {
                ctx.$$('.mc-btn').forEach(btn => {
                    ctx.listen(btn, 'click', () => handleAnswer(btn.dataset.answer, q));
                });
            } else {
                createSpecialCharsComponent(
                    ctx.$('[data-role="special-chars"]')?.id ||
                    // createSpecialCharsComponent expects an ID string;
                    // give the element an ID if it doesn't have one
                    (() => {
                        const el = ctx.$('[data-role="special-chars"]');
                        el.id = `special-chars-${exerciseId}`;
                        return el.id;
                    })()
                );

                const input = ctx.$('[data-role="verb-input"]');
                const submitBtn = ctx.$('[data-action="submit"]');

                ctx.setTimeout(() => input?.focus(), 50);

                const submit = () => handleAnswer(input.value.trim(), q);
                ctx.listen(submitBtn, 'click', submit);
                ctx.listen(input, 'keydown', e => { if (e.key === 'Enter') submit(); });
            }
        }

        // ── Handle answer (MCQ or fill-in) ───────────────────────
        function handleAnswer(userAnswer, question) {
            const isCorrect = userAnswer.toLowerCase() === question.correctAnswer.toLowerCase();
            userAnswers.push({ question, userAnswer, isCorrect });
            if (isCorrect) score++;

            // Visual feedback
            const feedbackEl = ctx.$('[data-role="feedback"]');

            if (question.type === 'mcq') {
                ctx.$$('.mc-btn').forEach(btn => {
                    btn.disabled = true;
                    if (btn.dataset.answer === question.correctAnswer) {
                        btn.classList.add('bg-success-500', 'text-white', 'border-success-500');
                    } else if (btn.dataset.answer === userAnswer && !isCorrect) {
                        btn.classList.add('bg-error-500', 'text-white', 'border-error-500');
                    }
                });
            } else {
                const input = ctx.$('[data-role="verb-input"]');
                const submitBtn = ctx.$('[data-action="submit"]');
                if (input) input.disabled = true;
                if (submitBtn) submitBtn.disabled = true;
            }

            feedbackEl.innerHTML = isCorrect
                ? '<p class="text-success-600 font-bold text-lg">✓ Riktig!</p>'
                : `<p class="text-error-600 font-bold text-lg">✗ Feil. Riktig: ${question.correctAnswer}</p>`;

            // ── Advance after delay ──────────────────────────────
            // ctx.setTimeout ensures this is cancelled if the exercise
            // is destroyed or re-rendered before the 1.5s elapses.
            ctx.setTimeout(() => {
                currentQuestionIndex++;

                if (currentQuestionIndex < questions.length) {
                    saveProgress(exerciseId, {
                        questions, currentQuestionIndex, score, userAnswers, helpModeActive
                    });
                    renderCurrentQuestion();
                } else {
                    clearProgressData(exerciseId);
                    ctx.render(showResults);
                }
            }, 1500);
        }

        // ── Results screen ───────────────────────────────────────
        function showResults(ctx) {
            const newCount = incrementCompletionCount(exerciseId);
            trackExerciseCompletion(exerciseId);

            const percentage = Math.round((score / questions.length) * 100);
            ctx.container.innerHTML = resultsHTML(score, questions.length, newCount);

            if (typeof confetti === 'function' && percentage >= 80) {
                confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
            }

            ctx.listen(ctx.$('[data-action="retry"]'), 'click', () => {
                clearProgressData(exerciseId);
                ctx.render(showStartScreen);
            });
            ctx.listen(ctx.$('[data-action="back"]'), 'click', () => {
                ctx.render(showStartScreen);
            });
        }
    }

    // ── Start ────────────────────────────────────────────────────
    exercise.mount();
    return exercise;  // Caller can call exercise.destroy() on navigation
}
