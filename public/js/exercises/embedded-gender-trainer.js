/**
 * Embedded Gender Trainer - No Fullscreen, Fixed Configuration
 *
 * This is a simplified version of the gender trainer from repetisjon.html
 * designed to be embedded directly into lesson pages.
 *
 * Key differences from the full trainer:
 * - No chapter selection UI (chapters are pre-configured)
 * - No fullscreen mode
 * - Tracks completion count (how many times user has completed the test)
 * - Integrates with exercise completion system (green pencil)
 */

// Import core vocabulary from external API (genus, word - no translations needed for gender trainer)
import { fetchCoreBank } from '../vocabulary/vocab-api-client.js';
import { getTargetLanguageCode, genusToArticle } from '../core/language-utils.js';
const nounBank = await fetchCoreBank(getTargetLanguageCode(), 'nounbank');

import { saveData, loadData, trackExerciseCompletion } from '../progress/index.js';

export function setupEmbeddedGenderTrainer(exerciseId, config) {
    const container = document.getElementById(exerciseId);
    if (!container) return;

    const { chapters, questionCount = 10 } = config;

    // Genus mapping — read from language config instead of hardcoding
    const genusMapping = { m: genusToArticle('m'), f: genusToArticle('f'), n: genusToArticle('n') };

    // Get eligible nouns based on chapters
    function getEligibleNouns() {
        const eligibleNouns = [];

        for (const nounKey in nounBank) {
            const nounData = nounBank[nounKey];
            if (nounData?.intro) {
                const introKap = parseInt(nounData.intro.split('.')[0]);
                if (chapters.includes(introKap)) {
                    eligibleNouns.push({
                        key: nounKey,
                        data: nounData,
                        riktigArtikkel: genusMapping[nounData.genus] || 'das'
                    });
                }
            }
        }

        return eligibleNouns;
    }

    // Generate questions - random nouns
    function generateQuestions(eligibleNouns, count) {
        // Shuffle and pick the requested count
        const shuffled = [...eligibleNouns].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(count, eligibleNouns.length));
    }

    // Load completion count
    function getCompletionCount() {
        const key = `embedded-gender-trainer-${exerciseId}-completions`;
        return loadData(key) || 0;
    }

    // Increment completion count
    function incrementCompletionCount() {
        const key = `embedded-gender-trainer-${exerciseId}-completions`;
        const count = getCompletionCount() + 1;
        saveData(key, count);
        return count;
    }

    // Save/load test progress
    function saveProgress(state) {
        const key = `embedded-gender-trainer-${exerciseId}-progress`;
        saveData(key, state);
    }

    function loadProgress() {
        const key = `embedded-gender-trainer-${exerciseId}-progress`;
        return loadData(key);
    }

    function clearProgress() {
        const key = `embedded-gender-trainer-${exerciseId}-progress`;
        saveData(key, null);
    }

    // Main render function
    function renderTrainer() {
        const eligibleNouns = getEligibleNouns();
        const completionCount = getCompletionCount();
        const savedProgress = loadProgress();

        if (eligibleNouns.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <p class="text-neutral-500 mb-4">Ingen substantiv funnet for de valgte kapitlene.</p>
                </div>
            `;
            return;
        }

        const chapterRange = chapters.length > 1
            ? `Kapittel ${Math.min(...chapters)}-${Math.max(...chapters)}`
            : `Kapittel ${chapters[0]}`;

        // Use title from config if available, otherwise generate it
        const displayTitle = config.title || `Substantiv-kjønn: ${chapterRange}`;

        // Show start screen with resume option if available
        container.innerHTML = `
            <div class="text-center py-6">
                <h3 class="text-lg font-bold text-neutral-800 mb-4">${displayTitle}</h3>
                <p class="text-neutral-600 mb-4">
                    Test deg selv på <strong>${eligibleNouns.length} substantiv fra ${chapterRange}</strong>!<br>
                    Du vil få <strong>${questionCount}</strong> tilfeldige ord og må velge riktig artikkel (der/die/das)
                </p>
                ${completionCount > 0 ? `
                    <div class="inline-block bg-success-100 text-success-800 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                        ✓ Fullført ${completionCount} ${completionCount === 1 ? 'gang' : 'ganger'}
                    </div>
                ` : ''}

                ${savedProgress ? `
                    <div class="bg-info-50 p-4 rounded-lg mb-6 border-2 border-info-300 max-w-md mx-auto">
                        <h4 class="font-bold text-info-800 mb-2">⏸️ Pågående test funnet!</h4>
                        <p class="text-sm text-info-700 mb-4">Du var på spørsmål ${savedProgress.currentQuestionIndex + 1} av ${savedProgress.questions.length}</p>
                        <div class="flex gap-3">
                            <button id="resume-test-btn" class="flex-1 bg-info-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-info-700 transition-colors">
                                Fortsett test
                            </button>
                            <button id="new-test-btn" class="flex-1 bg-neutral-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-neutral-600 transition-colors">
                                Start på nytt
                            </button>
                        </div>
                    </div>
                ` : `
                    <button id="start-embedded-gender-test" class="w-full max-w-xs mx-auto block bg-primary-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-600 transition-colors">
                        Start Test
                    </button>
                `}
            </div>
        `;

        if (savedProgress) {
            // Resume or start new
            container.querySelector('#resume-test-btn')?.addEventListener('click', () => {
                resumeTest(savedProgress);
            });
            container.querySelector('#new-test-btn')?.addEventListener('click', () => {
                clearProgress();
                renderTrainer(); // Re-render to show start screen
            });
        } else {
            // Start new test
            container.querySelector('#start-embedded-gender-test')?.addEventListener('click', () => {
                startTest(eligibleNouns);
            });
        }
    }

    // Start test
    function startTest(eligibleNouns) {
        const questions = generateQuestions(eligibleNouns, questionCount);
        let currentQuestionIndex = 0;
        let score = 0;
        let userAnswers = [];

        function renderQuestion() {
            const q = questions[currentQuestionIndex];
            const progress = Math.round(((currentQuestionIndex) / questions.length) * 100);

            const content = `
                <div class="mb-6">
                    <p class="text-sm text-neutral-500 mb-2">Spørsmål ${currentQuestionIndex + 1} av ${questions.length}</p>
                    <div class="w-full bg-neutral-200 rounded-full h-2 mb-6">
                        <div class="bg-primary-500 h-2 rounded-full transition-all" style="width: ${progress}%"></div>
                    </div>
                    <h3 class="text-xl font-bold text-neutral-800 mb-2">Hvilket kjønn har dette ordet?</h3>
                    <p class="text-3xl font-bold text-primary-700 mb-6 text-center">
                        ${q.key}
                    </p>
                    <div class="grid grid-cols-3 gap-3 mb-6">
                        <button class="artikkel-btn p-4 bg-surface border-2 border-neutral-300 rounded-lg font-bold text-xl hover:bg-info-50 hover:border-info-300 transition-colors" data-artikkel="der">
                            der
                        </button>
                        <button class="artikkel-btn p-4 bg-surface border-2 border-neutral-300 rounded-lg font-bold text-xl hover:bg-error-50 hover:border-error-300 transition-colors" data-artikkel="die">
                            die
                        </button>
                        <button class="artikkel-btn p-4 bg-surface border-2 border-neutral-300 rounded-lg font-bold text-xl hover:bg-success-50 hover:border-success-300 transition-colors" data-artikkel="das">
                            das
                        </button>
                    </div>
                    <div id="feedback-area" class="h-12 text-center"></div>
                </div>
            `;

            container.innerHTML = `
                <div class="bg-neutral-50 p-6 rounded-xl border border-neutral-200">
                    ${content}
                </div>
            `;

            container.querySelectorAll('.artikkel-btn').forEach(btn => {
                btn.addEventListener('click', () => handleAnswer(btn.dataset.artikkel, q));
            });
        }

        function handleAnswer(userAnswer, question) {
            const isCorrect = userAnswer === question.riktigArtikkel;
            userAnswers.push({ question, userAnswer, isCorrect });
            if (isCorrect) score++;

            const feedbackEl = container.querySelector('#feedback-area');
            const buttons = container.querySelectorAll('.artikkel-btn');

            buttons.forEach(btn => {
                btn.disabled = true;
                if (btn.dataset.artikkel === question.riktigArtikkel) {
                    btn.classList.remove('bg-surface', 'border-neutral-300');
                    btn.classList.add('bg-success-500', 'text-white', 'border-success-500');
                } else if (btn.dataset.artikkel === userAnswer && !isCorrect) {
                    btn.classList.remove('bg-surface', 'border-neutral-300');
                    btn.classList.add('bg-error-500', 'text-white', 'border-error-500');
                }
            });

            feedbackEl.innerHTML = isCorrect
                ? '<p class="text-success-600 font-bold text-lg">✓ Riktig!</p>'
                : `<p class="text-error-600 font-bold text-lg">✗ Feil. Riktig: ${question.riktigArtikkel}</p>`;

            setTimeout(() => {
                currentQuestionIndex++;

                // Save progress after each answer
                if (currentQuestionIndex < questions.length) {
                    saveProgress({
                        questions,
                        currentQuestionIndex,
                        score,
                        userAnswers
                    });
                    renderQuestion();
                } else {
                    // Clear progress when test is complete
                    clearProgress();
                    renderResults();
                }
            }, 1500);
        }

        function renderResults() {
            const percentage = Math.round((score / questions.length) * 100);
            const newCompletionCount = incrementCompletionCount();

            // Mark exercise as complete (triggers green pencil)
            trackExerciseCompletion(exerciseId);

            container.innerHTML = `
                <div class="bg-surface p-6 rounded-xl shadow-lg text-center">
                    <h3 class="text-3xl font-bold text-primary-700 mb-2">Test Fullført!</h3>
                    <p class="text-neutral-500 mb-6">Her er resultatet ditt</p>

                    <div class="bg-neutral-50 p-6 rounded-xl border border-neutral-200 mb-6">
                        <div class="text-5xl font-bold text-primary-600 mb-2">${score}/${questions.length}</div>
                        <div class="text-xl font-semibold ${percentage >= 80 ? 'text-success-600' : 'text-neutral-600'}">${percentage}% Riktig</div>
                    </div>

                    <div class="bg-success-100 text-success-800 px-4 py-2 rounded-full text-sm font-semibold mb-6 inline-block">
                        ✓ Fullført ${newCompletionCount} ${newCompletionCount === 1 ? 'gang' : 'ganger'}
                    </div>

                    <div class="flex gap-3">
                        <button id="retry-btn" class="flex-1 bg-primary-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-600 transition-colors">
                            Prøv igjen
                        </button>
                        <button id="back-btn" class="flex-1 bg-neutral-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-neutral-600 transition-colors">
                            Tilbake
                        </button>
                    </div>
                </div>
            `;

            if (typeof confetti === 'function' && percentage >= 80) {
                confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
            }

            container.querySelector('#retry-btn').addEventListener('click', () => {
                clearProgress();
                renderTrainer();
            });

            container.querySelector('#back-btn').addEventListener('click', () => {
                renderTrainer();
            });
        }

        renderQuestion();
    }

    // Resume test from saved progress
    function resumeTest(savedProgress) {
        const { questions, currentQuestionIndex: savedIndex, score: savedScore, userAnswers: savedAnswers } = savedProgress;
        let currentQuestionIndex = savedIndex;
        let score = savedScore;
        let userAnswers = savedAnswers;

        function renderQuestion() {
            const q = questions[currentQuestionIndex];
            const progress = Math.round(((currentQuestionIndex) / questions.length) * 100);

            const content = `
                <div class="mb-6">
                    <p class="text-sm text-neutral-500 mb-2">Spørsmål ${currentQuestionIndex + 1} av ${questions.length}</p>
                    <div class="w-full bg-neutral-200 rounded-full h-2 mb-6">
                        <div class="bg-primary-500 h-2 rounded-full transition-all" style="width: ${progress}%"></div>
                    </div>
                    <h3 class="text-xl font-bold text-neutral-800 mb-2">Hvilket kjønn har dette ordet?</h3>
                    <p class="text-3xl font-bold text-primary-700 mb-6 text-center">
                        ${q.key}
                    </p>
                    <div class="grid grid-cols-3 gap-3 mb-6">
                        <button class="artikkel-btn p-4 bg-surface border-2 border-neutral-300 rounded-lg font-bold text-xl hover:bg-info-50 hover:border-info-300 transition-colors" data-artikkel="der">
                            der
                        </button>
                        <button class="artikkel-btn p-4 bg-surface border-2 border-neutral-300 rounded-lg font-bold text-xl hover:bg-error-50 hover:border-error-300 transition-colors" data-artikkel="die">
                            die
                        </button>
                        <button class="artikkel-btn p-4 bg-surface border-2 border-neutral-300 rounded-lg font-bold text-xl hover:bg-success-50 hover:border-success-300 transition-colors" data-artikkel="das">
                            das
                        </button>
                    </div>
                    <div id="feedback-area" class="h-12 text-center"></div>
                </div>
            `;

            container.innerHTML = `
                <div class="bg-neutral-50 p-6 rounded-xl border border-neutral-200">
                    ${content}
                </div>
            `;

            container.querySelectorAll('.artikkel-btn').forEach(btn => {
                btn.addEventListener('click', () => handleAnswer(btn.dataset.artikkel, q));
            });
        }

        function handleAnswer(userAnswer, question) {
            const isCorrect = userAnswer === question.riktigArtikkel;
            userAnswers.push({ question, userAnswer, isCorrect });
            if (isCorrect) score++;

            const feedbackEl = container.querySelector('#feedback-area');
            const buttons = container.querySelectorAll('.artikkel-btn');

            buttons.forEach(btn => {
                btn.disabled = true;
                if (btn.dataset.artikkel === question.riktigArtikkel) {
                    btn.classList.remove('bg-surface', 'border-neutral-300');
                    btn.classList.add('bg-success-500', 'text-white', 'border-success-500');
                } else if (btn.dataset.artikkel === userAnswer && !isCorrect) {
                    btn.classList.remove('bg-surface', 'border-neutral-300');
                    btn.classList.add('bg-error-500', 'text-white', 'border-error-500');
                }
            });

            feedbackEl.innerHTML = isCorrect
                ? '<p class="text-success-600 font-bold text-lg">✓ Riktig!</p>'
                : `<p class="text-error-600 font-bold text-lg">✗ Feil. Riktig: ${question.riktigArtikkel}</p>`;

            setTimeout(() => {
                currentQuestionIndex++;

                if (currentQuestionIndex < questions.length) {
                    saveProgress({
                        questions,
                        currentQuestionIndex,
                        score,
                        userAnswers
                    });
                    renderQuestion();
                } else {
                    clearProgress();
                    renderResults();
                }
            }, 1500);
        }

        function renderResults() {
            const percentage = Math.round((score / questions.length) * 100);
            const newCompletionCount = incrementCompletionCount();

            trackExerciseCompletion(exerciseId);

            container.innerHTML = `
                <div class="bg-surface p-6 rounded-xl shadow-lg text-center">
                    <h3 class="text-3xl font-bold text-primary-700 mb-2">Test Fullført!</h3>
                    <p class="text-neutral-500 mb-6">Her er resultatet ditt</p>

                    <div class="bg-neutral-50 p-6 rounded-xl border border-neutral-200 mb-6">
                        <div class="text-5xl font-bold text-primary-600 mb-2">${score}/${questions.length}</div>
                        <div class="text-xl font-semibold ${percentage >= 80 ? 'text-success-600' : 'text-neutral-600'}">${percentage}% Riktig</div>
                    </div>

                    <div class="bg-success-100 text-success-800 px-4 py-2 rounded-full text-sm font-semibold mb-6 inline-block">
                        ✓ Fullført ${newCompletionCount} ${newCompletionCount === 1 ? 'gang' : 'ganger'}
                    </div>

                    <div class="flex gap-3">
                        <button id="retry-btn" class="flex-1 bg-primary-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-600 transition-colors">
                            Prøv igjen
                        </button>
                        <button id="back-btn" class="flex-1 bg-neutral-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-neutral-600 transition-colors">
                            Tilbake
                        </button>
                    </div>
                </div>
            `;

            if (typeof confetti === 'function' && percentage >= 80) {
                confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
            }

            container.querySelector('#retry-btn').addEventListener('click', () => {
                clearProgress();
                renderTrainer();
            });

            container.querySelector('#back-btn').addEventListener('click', () => {
                renderTrainer();
            });
        }

        renderQuestion();
    }

    // Initialize
    renderTrainer();
}
