/**
 * Konjugations-Karussell (Conjugation Carousel) Game Module
 *
 * A classroom grammar drill game for practicing verb conjugations.
 * Displays verbs and pronouns, teams must provide correct conjugations.
 *
 * Features:
 * - Two game modes: Classroom (4 teams) and Parvis (2 players)
 * - Visual carousel/wheel animation for verb/pronoun selection
 * - Color-coded for regular vs. irregular verbs
 * - Streak bonuses for consecutive correct answers
 * - Blitz-Runde (lightning round) for quick-fire drilling
 * - Score tracking and progress persistence
 * - Accessible with screen reader support
 *
 * Data format:
 * {
 *   title: "Game Title",
 *   subtitle: "Subtitle",
 *   verbs: [
 *     {
 *       infinitive: "gehen",
 *       type: "strong", // "strong", "modal", "regular", "mixed"
 *       norwegian: "å gå",
 *       conjugations: {
 *         "ich": "gehe",
 *         "du": "gehst",
 *         "er/sie/es": "geht",
 *         "wir": "gehen",
 *         "ihr": "geht",
 *         "sie/Sie": "gehen"
 *       }
 *     }
 *   ]
 * }
 */

import { loadData, saveData, getActiveCurriculum } from '../progress/index.js';
import { announce } from '../accessibility.js';
import { showConfirmModal, showAlertModal } from '../modals.js';

const PRONOUNS = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie'];

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get verb type styling
 */
function getVerbTypeStyle(type) {
  switch (type) {
    case 'strong':
      return { bg: 'bg-accent4-100', border: 'border-accent4-500', text: 'text-accent4-700', badge: 'bg-accent4-500', label: 'Sterkt verb' };
    case 'modal':
      return { bg: 'bg-primary-100', border: 'border-primary-500', text: 'text-primary-700', badge: 'bg-primary-500', label: 'Modalverb' };
    case 'mixed':
      return { bg: 'bg-info-100', border: 'border-info-500', text: 'text-info-700', badge: 'bg-info-500', label: 'Blandet verb' };
    default:
      return { bg: 'bg-success-100', border: 'border-success-500', text: 'text-success-700', badge: 'bg-success-500', label: 'Svakt verb' };
  }
}

/**
 * Setup Konjugations-Karussell game
 * @param {string} containerId - ID of the container element
 * @param {object} gameData - Game data with verbs and conjugations
 */
export function setupKonjugationsKarussell(containerId, gameData) {
  console.log('🎡 setupKonjugationsKarussell called with:', { containerId, gameData });
  const container = document.getElementById(containerId);
  if (!container) {
    console.error('Konjugations-Karussell container not found:', containerId);
    return;
  }

  const chapterId = document.body.dataset.chapterId;
  if (!chapterId) return;

  const curriculum = getActiveCurriculum();
  const storageKey = `${curriculum}-konjugations-karussell-${chapterId}`;

  // Game state
  let state = {
    gameMode: 'classroom', // 'classroom' or 'parvis'
    currentTeam: 1,
    scores: { team1: 0, team2: 0, team3: 0, team4: 0, elev1: 0, elev2: 0 },
    currentVerbIndex: 0,
    currentPronoun: 'ich',
    questionsAnswered: 0,
    streak: 0,
    isSpinning: false,
    showAnswer: false,
    usedCombinations: new Set(),
    blitzMode: false,
    blitzTimeRemaining: 60,
    blitzCorrect: 0
  };

  // Timer for blitz mode
  let blitzTimer = null;

  // Load saved state
  function loadState() {
    const saved = loadData(storageKey);
    if (saved) {
      state = {
        ...state,
        ...saved,
        usedCombinations: new Set(saved.usedCombinations || [])
      };
    }
  }

  // Save state
  function saveState() {
    saveData(storageKey, {
      ...state,
      usedCombinations: Array.from(state.usedCombinations)
    });
  }

  // Get random verb and pronoun combination
  function getRandomCombination() {
    const verbs = gameData.verbs;
    const totalCombinations = verbs.length * PRONOUNS.length;

    // If all combinations used, reset
    if (state.usedCombinations.size >= totalCombinations) {
      state.usedCombinations.clear();
    }

    let attempts = 0;
    let verbIndex, pronoun, combinationKey;

    do {
      verbIndex = Math.floor(Math.random() * verbs.length);
      pronoun = PRONOUNS[Math.floor(Math.random() * PRONOUNS.length)];
      combinationKey = `${verbIndex}-${pronoun}`;
      attempts++;
    } while (state.usedCombinations.has(combinationKey) && attempts < 100);

    state.usedCombinations.add(combinationKey);
    return { verbIndex, pronoun };
  }

  // Render the game
  function render() {
    const verb = gameData.verbs[state.currentVerbIndex];
    const style = getVerbTypeStyle(verb.type);

    container.innerHTML = `
      <div class="konjugations-karussell bg-surface p-6 rounded-xl shadow-sm">
        <!-- Header -->
        <div class="text-center mb-6">
          <h2 class="text-3xl font-bold text-accent3-700 mb-2">${gameData.title || '🎡 Konjugations-Karussell'}</h2>
          <p class="text-lg text-neutral-600">${gameData.subtitle || 'Bøy verbene riktig!'}</p>
        </div>

        <!-- Game Controls -->
        <div class="bg-neutral-50 p-4 rounded-lg mb-6">
          <div class="flex flex-wrap gap-4 items-center justify-between">
            <div class="flex gap-4">
              <button id="mode-classroom" class="mode-btn ${state.gameMode === 'classroom' ? 'bg-accent3-500 text-white' : 'bg-surface text-accent3-700 border-2 border-accent3-300'} px-4 py-2 rounded-lg font-semibold transition-colors">
                🎓 Klasserom
              </button>
              <button id="mode-parvis" class="mode-btn ${state.gameMode === 'parvis' ? 'bg-accent3-500 text-white' : 'bg-surface text-accent3-700 border-2 border-accent3-300'} px-4 py-2 rounded-lg font-semibold transition-colors">
                👥 Parvis
              </button>
            </div>
            <div class="flex gap-4">
              <button id="blitz-mode-btn" class="bg-warning-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-warning-600 transition-colors ${state.blitzMode ? 'hidden' : ''}">
                ⚡ Blitz-Runde
              </button>
              <button id="reset-game" class="bg-neutral-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-neutral-600 transition-colors">
                🔄 Start på nytt
              </button>
            </div>
          </div>
        </div>

        <!-- Blitz Mode Timer (hidden by default) -->
        <div id="blitz-timer-display" class="${state.blitzMode ? '' : 'hidden'} bg-gradient-to-r from-warning-500 to-error-500 text-white p-4 rounded-lg mb-6 text-center">
          <div class="flex items-center justify-center gap-4">
            <span class="text-2xl">⚡ BLITZ-RUNDE ⚡</span>
            <div class="text-4xl font-bold" id="blitz-timer">${state.blitzTimeRemaining}</div>
            <span class="text-lg">sekunder</span>
          </div>
          <div class="mt-2">Riktige: <span class="font-bold text-2xl">${state.blitzCorrect}</span></div>
        </div>

        <!-- Score Display (Classroom mode - 4 teams) -->
        <div id="score-display-classroom" class="${state.gameMode === 'classroom' && !state.blitzMode ? '' : 'hidden'} bg-surface p-4 rounded-lg shadow-sm mb-6">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="team-score text-center p-4 rounded-lg ${state.currentTeam === 1 ? 'bg-info-100 ring-2 ring-info-500' : 'bg-neutral-100'}">
              <div class="text-sm font-semibold text-neutral-600 mb-1">Lag 1</div>
              <div class="text-3xl font-bold text-info-600">${state.scores.team1}</div>
            </div>
            <div class="team-score text-center p-4 rounded-lg ${state.currentTeam === 2 ? 'bg-success-100 ring-2 ring-success-500' : 'bg-neutral-100'}">
              <div class="text-sm font-semibold text-neutral-600 mb-1">Lag 2</div>
              <div class="text-3xl font-bold text-success-600">${state.scores.team2}</div>
            </div>
            <div class="team-score text-center p-4 rounded-lg ${state.currentTeam === 3 ? 'bg-primary-100 ring-2 ring-primary-500' : 'bg-neutral-100'}">
              <div class="text-sm font-semibold text-neutral-600 mb-1">Lag 3</div>
              <div class="text-3xl font-bold text-primary-600">${state.scores.team3}</div>
            </div>
            <div class="team-score text-center p-4 rounded-lg ${state.currentTeam === 4 ? 'bg-accent4-100 ring-2 ring-accent4-500' : 'bg-neutral-100'}">
              <div class="text-sm font-semibold text-neutral-600 mb-1">Lag 4</div>
              <div class="text-3xl font-bold text-accent4-600">${state.scores.team4}</div>
            </div>
          </div>
        </div>

        <!-- Score Display (Parvis mode - 2 players) -->
        <div id="score-display-parvis" class="${state.gameMode === 'parvis' && !state.blitzMode ? '' : 'hidden'} bg-surface p-4 rounded-lg shadow-sm mb-6">
          <div class="grid grid-cols-2 gap-4 max-w-xl mx-auto">
            <div class="team-score text-center p-4 rounded-lg ${state.currentTeam === 1 ? 'bg-info-100 ring-2 ring-info-500' : 'bg-neutral-100'}">
              <div class="text-sm font-semibold text-neutral-600 mb-1">Elev 1</div>
              <div class="text-3xl font-bold text-info-600">${state.scores.elev1}</div>
            </div>
            <div class="team-score text-center p-4 rounded-lg ${state.currentTeam === 2 ? 'bg-success-100 ring-2 ring-success-500' : 'bg-neutral-100'}">
              <div class="text-sm font-semibold text-neutral-600 mb-1">Elev 2</div>
              <div class="text-3xl font-bold text-success-600">${state.scores.elev2}</div>
            </div>
          </div>
        </div>

        <!-- Streak Display -->
        <div class="${state.streak > 0 ? '' : 'hidden'} text-center mb-4">
          <span class="inline-block bg-gradient-to-r from-yellow-400 to-warning-500 text-white px-4 py-2 rounded-full font-bold">
            🔥 Streak: ${state.streak} ${state.streak >= 3 ? '(+' + Math.floor(state.streak / 3) + ' bonus!)' : ''}
          </span>
        </div>

        <!-- Main Carousel Display -->
        <div class="relative bg-gradient-to-br from-accent3-100 to-accent4-100 p-8 rounded-2xl border-4 border-accent3-300 mb-6">
          <!-- Verb Type Badge -->
          <div class="absolute top-4 right-4">
            <span class="${style.badge} text-white text-sm px-3 py-1 rounded-full font-semibold">
              ${style.label}
            </span>
          </div>

          <!-- Spinning Animation Overlay -->
          <div id="spin-overlay" class="${state.isSpinning ? '' : 'hidden'} absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center z-10">
            <div class="text-center">
              <div class="text-6xl animate-spin mb-4">🎡</div>
              <div class="text-2xl font-bold text-accent3-700">Spinner...</div>
            </div>
          </div>

          <!-- Verb Display -->
          <div class="text-center mb-8">
            <div class="text-sm font-semibold text-neutral-500 mb-2 uppercase tracking-wide">Infinitiv</div>
            <div class="text-5xl font-bold ${style.text} mb-2">${verb.infinitive}</div>
            <div class="text-lg text-neutral-600">(${verb.norwegian})</div>
          </div>

          <!-- Pronoun Display -->
          <div class="text-center mb-8">
            <div class="text-sm font-semibold text-neutral-500 mb-2 uppercase tracking-wide">Pronomen</div>
            <div class="inline-block bg-surface px-8 py-4 rounded-xl shadow-lg border-4 border-accent3-400">
              <span class="text-4xl font-bold text-accent3-700">${state.currentPronoun}</span>
            </div>
          </div>

          <!-- Question -->
          <div class="text-center">
            <div class="text-2xl font-semibold text-neutral-700 mb-4">
              Hva er riktig bøyning av <span class="${style.text} font-bold">${verb.infinitive}</span> for <span class="text-accent3-700 font-bold">${state.currentPronoun}</span>?
            </div>
          </div>

          <!-- Answer Section -->
          <div id="answer-section" class="${state.showAnswer ? '' : 'hidden'} mt-6">
            <div class="bg-success-50 border-4 border-success-500 rounded-xl p-6 text-center">
              <div class="text-sm font-semibold text-success-700 mb-2">RIKTIG SVAR:</div>
              <div class="text-4xl font-bold text-success-800">
                ${state.currentPronoun} <span class="text-success-600">${verb.conjugations[state.currentPronoun]}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-wrap gap-4 justify-center">
          <button id="spin-btn" class="${state.showAnswer || state.isSpinning ? 'hidden' : ''} bg-accent3-500 text-white px-8 py-4 rounded-lg font-bold text-xl hover:bg-accent3-600 transition-all transform hover:scale-105 shadow-lg">
            🎡 Spinn karussellen!
          </button>

          <button id="show-answer-btn" class="${state.showAnswer || state.isSpinning ? 'hidden' : ''} bg-primary-500 text-white px-6 py-4 rounded-lg font-bold text-lg hover:bg-primary-600 transition-colors">
            👁️ Vis svar
          </button>
        </div>

        <!-- Scoring Buttons (visible after showing answer) -->
        <div id="scoring-buttons" class="${state.showAnswer ? '' : 'hidden'} flex flex-wrap gap-4 justify-center mt-4">
          <button id="correct-btn" class="bg-success-500 text-white px-8 py-4 rounded-lg font-bold text-xl hover:bg-success-600 transition-colors">
            ✓ Riktig (+${1 + Math.floor(state.streak / 3)} poeng)
          </button>
          <button id="wrong-btn" class="bg-error-500 text-white px-8 py-4 rounded-lg font-bold text-xl hover:bg-error-600 transition-colors">
            ✗ Feil
          </button>
        </div>

        <!-- Stats -->
        <div class="mt-8 text-center text-neutral-600">
          <span class="mr-4">Spørsmål besvart: <strong>${state.questionsAnswered}</strong></span>
          <span>Verb i spillet: <strong>${gameData.verbs.length}</strong></span>
        </div>

        <!-- Verb Overview (collapsible) -->
        <details class="mt-8 bg-neutral-50 rounded-lg">
          <summary class="p-4 font-semibold text-neutral-700 cursor-pointer hover:bg-neutral-100 rounded-lg">
            📋 Se alle verb i spillet
          </summary>
          <div class="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
            ${gameData.verbs.map((v, i) => {
              const vStyle = getVerbTypeStyle(v.type);
              return `
                <div class="${vStyle.bg} ${vStyle.border} border-2 p-3 rounded-lg ${i === state.currentVerbIndex ? 'ring-2 ring-accent3-500' : ''}">
                  <div class="font-bold ${vStyle.text}">${v.infinitive}</div>
                  <div class="text-sm text-neutral-600">${v.norwegian}</div>
                </div>
              `;
            }).join('')}
          </div>
        </details>
      </div>
    `;

    attachEventListeners();
  }

  // Attach event listeners
  function attachEventListeners() {
    // Mode switching
    document.getElementById('mode-classroom')?.addEventListener('click', () => {
      state.gameMode = 'classroom';
      state.currentTeam = 1;
      saveState();
      render();
    });

    document.getElementById('mode-parvis')?.addEventListener('click', () => {
      state.gameMode = 'parvis';
      state.currentTeam = 1;
      saveState();
      render();
    });

    // Spin button
    document.getElementById('spin-btn')?.addEventListener('click', spinCarousel);

    // Show answer button
    document.getElementById('show-answer-btn')?.addEventListener('click', () => {
      state.showAnswer = true;
      saveState();
      render();
      const verb = gameData.verbs[state.currentVerbIndex];
      announce(`Svaret er: ${state.currentPronoun} ${verb.conjugations[state.currentPronoun]}`, 'assertive');
    });

    // Correct answer
    document.getElementById('correct-btn')?.addEventListener('click', () => {
      const bonusPoints = Math.floor(state.streak / 3);
      const points = 1 + bonusPoints;

      if (state.blitzMode) {
        state.blitzCorrect++;
      } else {
        if (state.gameMode === 'classroom') {
          state.scores[`team${state.currentTeam}`] += points;
          state.currentTeam = (state.currentTeam % 4) + 1;
        } else {
          state.scores[`elev${state.currentTeam}`] += points;
          state.currentTeam = (state.currentTeam % 2) + 1;
        }
      }

      state.streak++;
      state.questionsAnswered++;
      nextQuestion();
      announce(`Riktig! ${points} poeng. Streak: ${state.streak}`, 'polite');
    });

    // Wrong answer
    document.getElementById('wrong-btn')?.addEventListener('click', () => {
      state.streak = 0;
      state.questionsAnswered++;

      if (!state.blitzMode) {
        if (state.gameMode === 'classroom') {
          state.currentTeam = (state.currentTeam % 4) + 1;
        } else {
          state.currentTeam = (state.currentTeam % 2) + 1;
        }
      }

      nextQuestion();
      announce('Feil svar. Streak nullstilt.', 'polite');
    });

    // Reset game
    document.getElementById('reset-game')?.addEventListener('click', async () => {
      const confirmed = await showConfirmModal(
        'Er du sikker på at du vil starte spillet på nytt?\n\nAll progresjon vil bli slettet.',
        'Start på nytt?'
      );
      if (confirmed) {
        stopBlitzMode();
        state = {
          gameMode: state.gameMode,
          currentTeam: 1,
          scores: { team1: 0, team2: 0, team3: 0, team4: 0, elev1: 0, elev2: 0 },
          currentVerbIndex: 0,
          currentPronoun: 'ich',
          questionsAnswered: 0,
          streak: 0,
          isSpinning: false,
          showAnswer: false,
          usedCombinations: new Set(),
          blitzMode: false,
          blitzTimeRemaining: 60,
          blitzCorrect: 0
        };
        saveState();
        render();
        announce('Spillet er startet på nytt', 'polite');
      }
    });

    // Blitz mode button
    document.getElementById('blitz-mode-btn')?.addEventListener('click', startBlitzMode);
  }

  // Spin the carousel
  function spinCarousel() {
    state.isSpinning = true;
    state.showAnswer = false;
    render();

    // Animate for 1.5 seconds
    setTimeout(() => {
      const { verbIndex, pronoun } = getRandomCombination();
      state.currentVerbIndex = verbIndex;
      state.currentPronoun = pronoun;
      state.isSpinning = false;
      saveState();
      render();

      const verb = gameData.verbs[verbIndex];
      announce(`Verb: ${verb.infinitive}. Pronomen: ${pronoun}. Hva er riktig bøyning?`, 'assertive');
    }, 1500);
  }

  // Next question
  function nextQuestion() {
    state.showAnswer = false;
    const { verbIndex, pronoun } = getRandomCombination();
    state.currentVerbIndex = verbIndex;
    state.currentPronoun = pronoun;
    saveState();
    render();
  }

  // Start blitz mode
  function startBlitzMode() {
    state.blitzMode = true;
    state.blitzTimeRemaining = 60;
    state.blitzCorrect = 0;
    state.showAnswer = false;
    const { verbIndex, pronoun } = getRandomCombination();
    state.currentVerbIndex = verbIndex;
    state.currentPronoun = pronoun;
    saveState();
    render();

    blitzTimer = setInterval(() => {
      state.blitzTimeRemaining--;
      const timerEl = document.getElementById('blitz-timer');
      if (timerEl) {
        timerEl.textContent = state.blitzTimeRemaining;
      }

      if (state.blitzTimeRemaining <= 0) {
        endBlitzMode();
      }
    }, 1000);

    announce('Blitz-runde startet! 60 sekunder. Svar så raskt du kan!', 'assertive');
  }

  // Stop blitz mode timer
  function stopBlitzMode() {
    if (blitzTimer) {
      clearInterval(blitzTimer);
      blitzTimer = null;
    }
    state.blitzMode = false;
  }

  // End blitz mode
  async function endBlitzMode() {
    stopBlitzMode();
    await showAlertModal(
      `Blitz-runde ferdig!\n\nDu klarte ${state.blitzCorrect} riktige svar på 60 sekunder!`,
      '⚡ Resultat',
      'info'
    );
    state.blitzCorrect = 0;
    state.blitzTimeRemaining = 60;
    saveState();
    render();
    announce(`Blitz-runde ferdig! ${state.blitzCorrect} riktige svar.`, 'assertive');
  }

  // Initialize
  loadState();
  render();
  console.log('✅ Konjugations-Karussell initialized');
}
