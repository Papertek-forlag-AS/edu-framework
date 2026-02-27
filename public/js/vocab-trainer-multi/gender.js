
import { getCurriculumConfig } from '../progress/curriculum-registry.js';
import { getActiveCurriculum } from '../progress/store.js';
import { vt } from './i18n-helper.js';

/**
 * Get the unique identifier for a word (for tracking progress)
 * Uses wordId (wordbank key) if available, falls back to target
 * @param {Object} word - Vocabulary word object
 * @returns {string} - Unique identifier
 */
function getWordKey(word) {
    return word.wordId || word.target;
}

export function renderSubstantivKjonn(container, context) {
    const { vocabulary, updateProgress, addPoints, isLessonMode } = context;

    // Get configuration for current curriculum
    const curriculumId = getActiveCurriculum();
    const config = getCurriculumConfig(curriculumId);
    const { grammar } = config.languageConfig;

    const substantivListe = vocabulary
        .filter(w => (w.type === 'substantiv' || w.type === 'noun') && (w.targetRaw || w.target))
        .map(data => ({
            ...data,
            displayWord: data.targetRaw || data.target, // Language-neutral: display word for gender game
            riktigArtikkel: grammar.articles[data.genus] || data.artikel
        }));

    if (substantivListe.length === 0) {
        container.innerHTML = `<p class="text-neutral-500 text-center py-8">${vt('ge_no_nouns')}</p>`;
        return;
    }

    // Shuffle and pick 10
    const shuffled = substantivListe.sort(() => 0.5 - Math.random()).slice(0, 10);
    let currentIndex = 0;
    let score = 0;
    let isCorrecting = false;
    let correctInRow = 0; // Track correct answers for 1 point per 3 words
    let sessionPoints = 0; // Total points earned in this session

    // Dynamically generate buttons based on configured articles
    // Gender colors from config (e.g., { m: 'blue', f: 'red', n: 'green' })
    const genderColorMap = grammar.genderColors || {};
    // Map color names to CSS class prefixes
    const colorToCss = {
        'blue': { bg: 'info', border: 'info' },
        'red': { bg: 'error', border: 'error' },
        'green': { bg: 'success', border: 'success' },
        'gray': { bg: 'neutral', border: 'neutral' },
        'purple': { bg: 'accent4', border: 'accent4' },
    };

    const articleButtonsHTML = Object.entries(grammar.articles)
        .filter(([key]) => key !== 'pl') // Filter out plural if present as separate gender key
        .map(([key, article]) => {
            const colorName = genderColorMap[key] || 'gray';
            const css = colorToCss[colorName] || colorToCss['gray'];
            const hoverClass = `hover:bg-${css.bg}-50 hover:border-${css.border}-300`;

            return `<button data-artikkel="${article}" class="artikkel-btn p-4 bg-surface border-2 border-neutral-300 rounded-lg font-bold text-xl ${hoverClass} transition-colors">${article}</button>`;
        }).join('');

    container.innerHTML = `
            <div class="p-4 sm:p-6 border rounded-lg bg-neutral-50">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-primary-700">${vt('ge_title')}</h3>
                    <p class="text-sm font-semibold text-neutral-500">${vt('ge_question')} <span id="subst-progress">1</span> / ${shuffled.length}</p>
                </div>
                <div class="mb-6 text-center">
                    <p class="text-sm text-neutral-600 mb-2">${vt('ge_which_gender')}</p>
                    <h2 id="subst-word" class="text-3xl font-bold text-neutral-800 mb-4"></h2>
                </div>
                <div class="grid grid-cols-${grammar.genderCount} gap-3 mb-6">
                    ${articleButtonsHTML}
                </div>
                <div id="subst-feedback" class="h-12 text-center"></div>
                <div class="mt-4 text-right text-sm text-neutral-400">${vt('ge_points')} <span id="subst-score">0</span></div>
            </div>
        `;
    container.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const wordEl = container.querySelector('#subst-word');
    const feedbackEl = container.querySelector('#subst-feedback');
    const scoreEl = container.querySelector('#subst-score');
    const progressEl = container.querySelector('#subst-progress');
    const artikkelBtns = container.querySelectorAll('.artikkel-btn');

    const displayQuestion = () => {
        isCorrecting = false;
        const word = shuffled[currentIndex];
        wordEl.textContent = word.displayWord;
        progressEl.textContent = currentIndex + 1;
        feedbackEl.innerHTML = '';
        artikkelBtns.forEach(btn => {
            // Remove all color classes
            btn.classList.remove('bg-success-500', 'bg-error-500', 'text-white');
            btn.classList.forEach(cls => {
                if (cls.startsWith('bg-') && cls !== 'bg-surface') btn.classList.remove(cls);
                if (cls.startsWith('border-') && cls !== 'border-neutral-300') btn.classList.remove(cls);
            });

            btn.classList.add('bg-surface', 'border-neutral-300');
            btn.disabled = false;
        });
    };

    const showFinalScore = () => {
        // Points display
        const pointsHtml = sessionPoints > 0 ? `
            <div class="flex items-center justify-center gap-2 mb-4">
                <span class="text-3xl font-bold text-primary-500">+${sessionPoints}</span>
                <span class="text-lg text-neutral-600">${vt('fc_points')}</span>
            </div>
        ` : '';

        container.innerHTML = `
                <div class="p-4 border rounded-lg bg-neutral-50 text-center">
                    <h4 class="text-2xl font-bold text-success-700 mb-4">${vt('ge_complete')}</h4>
                    ${pointsHtml}
                    <p class="text-xl mb-6">${vt('ge_score', { score: score, total: shuffled.length })}</p>
                    <button id="restart-subst-btn" class="bg-primary-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-600">${vt('ge_try_again')}</button>
                </div>
            `;
        container.querySelector('#restart-subst-btn').addEventListener('click', () => renderSubstantivKjonn(container, context));
        if (typeof confetti === 'function' && score === shuffled.length) {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }
    };

    artikkelBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (isCorrecting) return;

            const selected = btn.dataset.artikkel;
            const word = shuffled[currentIndex];
            const correct = word.riktigArtikkel;
            const wordKey = getWordKey(word);

            artikkelBtns.forEach(b => b.disabled = true);

            if (selected === correct) {
                btn.classList.remove('bg-surface', 'border-neutral-300');
                btn.classList.add('bg-success-500', 'text-white');
                feedbackEl.innerHTML = `<p class="font-bold text-success-600">${vt('ge_correct')}</p>`;
                score++;
                scoreEl.textContent = score;

                // Track correct answer for points (1 point per 3 correct)
                correctInRow++;
                if (correctInRow >= 3) {
                    correctInRow = 0;
                    sessionPoints++;
                    // Add point via adapter (skipPoints: true because we're handling points manually)
                    if (addPoints) {
                        addPoints(1);
                    }
                }

                // Record exposure credit for SSR (mode 'gender' gives exposure credit only)
                if (updateProgress) {
                    // skipPoints: true because we handle points manually above (1 per 3 words)
                    updateProgress(wordKey, 5, 'gender', { skipPoints: true, exposureOnly: isLessonMode });
                }

                setTimeout(() => {
                    currentIndex++;
                    if (currentIndex < shuffled.length) displayQuestion();
                    else showFinalScore();
                }, 1000);
            } else {
                btn.classList.remove('bg-surface', 'border-neutral-300');
                btn.classList.add('bg-error-500', 'text-white');
                feedbackEl.innerHTML = `<p class="font-bold text-error-600">${vt('ge_wrong')} ${correct}</p>`;
                isCorrecting = true;

                // Reset correct-in-row counter on wrong answer
                correctInRow = 0;

                // Record incorrect exposure credit for SSR
                if (updateProgress) {
                    updateProgress(wordKey, 1, 'gender', { skipPoints: true, exposureOnly: isLessonMode });
                }

                setTimeout(() => {
                    currentIndex++;
                    if (currentIndex < shuffled.length) displayQuestion();
                    else showFinalScore();
                }, 1500);
            }
        });
    });

    displayQuestion();
}
