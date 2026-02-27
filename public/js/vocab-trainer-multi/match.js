/**
 * Match Mode (Kombiner) - iOS Aligned
 * 5 rounds of 6 word pairs (12 tiles), 2 points per round (10 max)
 */

import { vt } from './i18n-helper.js';

/**
 * Get the unique identifier for a word (for known words storage)
 * Uses wordId (wordbank key) if available, falls back to target for backwards compatibility
 */
function getWordKey(word) {
    return word.wordId || word.target;
}

// iOS-aligned constants
const TOTAL_ROUNDS = 5;
const PAIRS_PER_ROUND = 6; // 6 word pairs = 12 tiles per round
const POINTS_PER_ROUND = 2;

export function renderKombiner(container, context) {
    try {
        const { vocabulary, knownWords } = context;

        // Filter out known words
        const kombinerVocabulary = vocabulary.filter(word => !knownWords.has(getWordKey(word)));

        if (kombinerVocabulary.length === 0) {
            container.innerHTML = `<p class="text-neutral-500 text-center py-8">${vt('ma_all_known')}</p>`;
            return;
        }

        // Need at least 3 word pairs (6 cards) per round
        const minWordsNeeded = PAIRS_PER_ROUND;
        if (kombinerVocabulary.length < minWordsNeeded) {
            container.innerHTML = `<div class="p-4 border rounded-lg bg-neutral-50 text-center text-neutral-600">${vt('ma_too_few_words', { count: minWordsNeeded })}</div>`;
            return;
        }

        // Game state
        let currentRound = 1;
        let totalPoints = 0;
        let totalTime = 0;
        let roundStartTime = null;
        let timerInterval = null;
        let usedWordIds = new Set(); // Track words already used to avoid repetition

        // Expose cleanup so switching modes clears timers
        window.__vocabModeCleanup = () => {
            if (timerInterval) clearInterval(timerInterval);
        };

        // Start the game
        showRoundIntro();

        function showRoundIntro() {
            // Calculate how many rounds we can play based on available words
            const availableWords = kombinerVocabulary.length - usedWordIds.size;
            const wordsNeeded = PAIRS_PER_ROUND;
            const maxRounds = Math.min(TOTAL_ROUNDS, Math.floor(kombinerVocabulary.length / wordsNeeded));

            if (currentRound > maxRounds || availableWords < wordsNeeded) {
                showFinalResults();
                return;
            }

            container.innerHTML = `
                <div class="p-6 border rounded-lg bg-surface shadow-lg text-center">
                    <h3 class="text-2xl font-bold text-primary-700 mb-2">${vt('ma_title')}</h3>
                    <div class="mb-4">
                        <span class="text-4xl font-bold text-neutral-800">${vt('ma_round')} ${currentRound}</span>
                        <span class="text-neutral-500"> ${vt('ma_of')} ${maxRounds}</span>
                    </div>
                    <div class="flex justify-center gap-2 mb-6">
                        ${Array.from({ length: maxRounds }, (_, i) => `
                            <div class="w-3 h-3 rounded-full ${i < currentRound - 1 ? 'bg-success-500' : i === currentRound - 1 ? 'bg-primary-500' : 'bg-neutral-200'}"></div>
                        `).join('')}
                    </div>
                    <p class="text-neutral-600 mb-4">${vt('ma_connect_pairs')}</p>
                    <p class="text-lg font-semibold text-primary-600 mb-6">${vt('ma_points_so_far')} ${totalPoints}</p>
                    <button id="start-round-btn" class="bg-primary-500 text-white font-bold py-3 px-8 rounded-lg hover:bg-primary-600 transition-colors">
                        ${vt('ma_start_round')} ${currentRound}
                    </button>
                </div>
            `;

            container.querySelector('#start-round-btn').addEventListener('click', startRound);
        }

        function startRound() {
            // Select words for this round (avoiding already used words if possible)
            let availableWords = kombinerVocabulary.filter(w => !usedWordIds.has(getWordKey(w)));

            // If not enough fresh words, allow reuse
            if (availableWords.length < PAIRS_PER_ROUND) {
                usedWordIds.clear();
                availableWords = [...kombinerVocabulary];
            }

            const wordsForRound = Math.min(PAIRS_PER_ROUND, availableWords.length);
            const gameWords = availableWords.sort(() => 0.5 - Math.random()).slice(0, wordsForRound);

            // Mark words as used
            gameWords.forEach(w => usedWordIds.add(getWordKey(w)));

            // Create pairs
            let tiles = [];
            gameWords.forEach(word => {
                tiles.push({ type: 'native', text: word.native, match: word.target, id: word.target });
                tiles.push({ type: 'target', text: word.target, match: word.native, id: word.target });
            });

            // Shuffle tiles
            tiles.sort(() => 0.5 - Math.random());

            // Calculate max rounds based on vocabulary
            const wordsNeeded = PAIRS_PER_ROUND;
            const maxRounds = Math.min(TOTAL_ROUNDS, Math.floor(kombinerVocabulary.length / wordsNeeded));

            container.innerHTML = `
                <div class="p-4 sm:p-6 border rounded-lg bg-neutral-50">
                    <div class="flex justify-between items-center mb-4">
                        <div>
                            <h3 class="text-xl font-bold text-primary-700">${vt('ma_round')} ${currentRound}/${maxRounds}</h3>
                            <p class="text-sm text-neutral-500">${vt('ma_points')} <span class="font-bold text-primary-600">${totalPoints}</span></p>
                        </div>
                        <div class="text-neutral-500 font-mono text-lg" id="kombiner-timer">00:00</div>
                    </div>
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4" id="kombiner-grid"></div>
                    <div id="kombiner-feedback" class="h-8 text-center"></div>
                </div>
            `;
            container.scrollIntoView({ behavior: 'smooth', block: 'center' });

            const gridEl = container.querySelector('#kombiner-grid');
            const feedbackEl = container.querySelector('#kombiner-feedback');
            const timerEl = container.querySelector('#kombiner-timer');

            let firstSelection = null;
            let lockBoard = false;
            let matchedPairs = 0;
            roundStartTime = Date.now();

            timerInterval = setInterval(() => {
                const delta = Math.floor((Date.now() - roundStartTime) / 1000);
                const m = Math.floor(delta / 60).toString().padStart(2, '0');
                const s = (delta % 60).toString().padStart(2, '0');
                timerEl.textContent = `${m}:${s}`;
            }, 1000);

            tiles.forEach(tile => {
                const tileEl = document.createElement('button');
                tileEl.className = 'p-4 bg-surface border-2 border-neutral-300 rounded-lg shadow-sm hover:bg-neutral-50 font-medium text-sm sm:text-base break-words h-full w-full transition-all duration-200';
                tileEl.textContent = tile.text;
                tileEl.dataset.id = tile.id;
                tileEl.dataset.type = tile.type;

                tileEl.addEventListener('click', () => {
                    if (lockBoard || tileEl === firstSelection || tileEl.classList.contains('matched')) return;

                    // Apply selection style directly
                    tileEl.style.backgroundColor = '#fef3c7'; // amber-100
                    tileEl.style.borderColor = '#fbbf24'; // amber-400
                    tileEl.classList.add('selected');

                    if (!firstSelection) {
                        firstSelection = tileEl;
                    } else {
                        // Check match
                        lockBoard = true;
                        const isMatch = firstSelection.dataset.id === tileEl.dataset.id && firstSelection.dataset.type !== tileEl.dataset.type;

                        if (isMatch) {
                            // Match found
                            firstSelection.classList.remove('selected');
                            tileEl.classList.remove('selected');

                            // SM-2 Exposure Credit (match mode = exposure only, not full SM-2)
                            // skipPoints=true because we add 2 points per round, not per match
                            if (context.updateProgress) {
                                const wordId = tileEl.dataset.id;
                                context.updateProgress(wordId, 5, 'match', true); // Quality 5, skip auto-points
                            }

                            // Apply styles directly to ensure they are visible
                            firstSelection.style.backgroundColor = '#bbf7d0'; // green-200
                            firstSelection.style.borderColor = '#22c55e'; // green-500
                            firstSelection.style.color = '#14532d'; // green-900

                            tileEl.style.backgroundColor = '#bbf7d0';
                            tileEl.style.borderColor = '#22c55e';
                            tileEl.style.color = '#14532d';

                            firstSelection.classList.add('matched', 'cursor-default', 'scale-95');
                            tileEl.classList.add('matched', 'cursor-default', 'scale-95');

                            // Add correct class for animation
                            firstSelection.classList.add('correct');
                            tileEl.classList.add('correct');
                            matchedPairs++;

                            if (matchedPairs === gameWords.length) {
                                // Round complete
                                if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
                                const roundTime = Math.floor((Date.now() - roundStartTime) / 1000);
                                totalTime += roundTime;
                                totalPoints += POINTS_PER_ROUND;

                                // Add round points to profile (2 points per round)
                                if (context.addPoints) {
                                    context.addPoints(POINTS_PER_ROUND);
                                }
                                // Check if daily goal reached and update streak
                                if (context.checkAndUpdateStreak) {
                                    context.checkAndUpdateStreak();
                                }

                                feedbackEl.innerHTML = `<p class="font-bold text-success-600">${vt('ma_round_complete', { points: POINTS_PER_ROUND })}</p>`;

                                if (typeof confetti === 'function') {
                                    confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
                                }

                                // Progress to next round after short delay
                                setTimeout(() => {
                                    currentRound++;
                                    showRoundIntro();
                                }, 1500);
                            }

                            // Reset immediately to allow rapid play
                            firstSelection = null;
                            lockBoard = false;
                        } else {
                            // No match - show red feedback
                            firstSelection.classList.remove('selected');
                            tileEl.classList.remove('selected');

                            // Apply styles directly
                            firstSelection.style.backgroundColor = '#fecaca'; // red-200
                            firstSelection.style.borderColor = '#ef4444'; // red-500
                            firstSelection.style.color = '#7f1d1d'; // red-900

                            tileEl.style.backgroundColor = '#fecaca';
                            tileEl.style.borderColor = '#ef4444';
                            tileEl.style.color = '#7f1d1d';

                            firstSelection.classList.add('incorrect');
                            tileEl.classList.add('incorrect');

                            setTimeout(() => {
                                // Clear styles
                                firstSelection.style.backgroundColor = '';
                                firstSelection.style.borderColor = '';
                                firstSelection.style.color = '';
                                tileEl.style.backgroundColor = '';
                                tileEl.style.borderColor = '';
                                tileEl.style.color = '';

                                firstSelection.classList.remove('incorrect');
                                tileEl.classList.remove('incorrect');
                                firstSelection = null;
                                lockBoard = false;
                            }, 1000);
                        }
                    }
                });
                gridEl.appendChild(tileEl);
            });
        }

        function showFinalResults() {
            if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }

            const roundsCompleted = currentRound - 1;
            const maxRounds = Math.min(TOTAL_ROUNDS, Math.floor(kombinerVocabulary.length / PAIRS_PER_ROUND));

            // Big confetti for completing all rounds
            if (typeof confetti === 'function' && roundsCompleted === maxRounds) {
                confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
            }

            // Points display (iOS-aligned)
            const pointsHtml = totalPoints > 0 ? `
                <div class="flex items-center justify-center gap-2 mb-4">
                    <span class="text-4xl font-bold text-primary-500">+${totalPoints}</span>
                    <span class="text-lg text-neutral-600">${vt('fc_points')}</span>
                </div>
            ` : '';

            container.innerHTML = `
                <div class="p-6 border rounded-lg bg-surface shadow-lg text-center">
                    <h3 class="text-2xl font-bold text-success-700 mb-4">${vt('ma_game_complete')}</h3>
                    ${pointsHtml}

                    <div class="grid grid-cols-2 gap-4 mb-6">
                        <div class="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
                            <p class="text-xs text-neutral-500 mb-1">${vt('ma_rounds_completed')}</p>
                            <p class="text-2xl font-bold text-accent2-600">${roundsCompleted}</p>
                            <p class="text-xs text-neutral-400">${vt('ma_of')} ${maxRounds}</p>
                        </div>
                        <div class="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
                            <p class="text-xs text-neutral-500 mb-1">${vt('ma_total_time')}</p>
                            <p class="text-2xl font-bold text-neutral-700">${formatTime(totalTime)}</p>
                        </div>
                    </div>

                    <div class="flex gap-3 justify-center">
                        <button id="restart-kombiner-btn" class="bg-primary-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-600 transition-colors">
                            ${vt('ma_play_again')}
                        </button>
                        <button id="exit-kombiner-btn" class="bg-neutral-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-neutral-600 transition-colors">
                            ${vt('ma_back_to_menu')}
                        </button>
                    </div>
                </div>
            `;

            container.querySelector('#restart-kombiner-btn').addEventListener('click', () => {
                currentRound = 1;
                totalPoints = 0;
                totalTime = 0;
                usedWordIds.clear();
                showRoundIntro();
            });

            container.querySelector('#exit-kombiner-btn').addEventListener('click', async () => {
                // Ensure points are saved before exiting
                if (context.adapter && context.adapter.save) {
                    await context.adapter.save();
                }

                if (context.onExit) {
                    context.onExit();
                } else {
                    window.location.reload();
                }
            });
        }

        function formatTime(seconds) {
            const m = Math.floor(seconds / 60);
            const s = seconds % 60;
            if (m > 0) {
                return `${m}m ${s}s`;
            }
            return `${s}s`;
        }

    } catch (error) {
        console.error('Error in renderKombiner:', error);
        container.innerHTML = `<div class="p-4 text-error-600 border border-error-300 rounded bg-error-50">
            <p class="font-bold">${vt('ma_error')}</p>
            <p class="text-sm font-mono mt-2">${error.message}</p>
        </div>`;
    }
}
