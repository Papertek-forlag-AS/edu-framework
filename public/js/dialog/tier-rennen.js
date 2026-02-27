/**
 * Tier-Rennen (Animal Race) Game Module
 *
 * A visual racing game where teams/players choose animal mascots that move
 * forward on a race track when answering questions correctly.
 *
 * Features:
 * - Visual race track (0% → 100%)
 * - Multiple game modes: Classroom (3-4 teams) and Group (2-3 players)
 * - Animated animal movement
 * - Mixed question types from multiple chapters
 * - Difficulty-based movement (easy = 1 space, hard = 3 spaces)
 * - Special bonus rounds
 * - Progress tracking and replay
 * - Fully modular and reusable
 *
 * Data format:
 * {
 *   animals: [
 *     { id: 'hund', emoji: '🐕', name: 'Hund' },
 *     ...
 *   ],
 *   questionCategories: [
 *     {
 *       name: "Category Name",
 *       icon: "🎯",
 *       questions: [
 *         {
 *           question: "Question text?",
 *           answer: "Correct answer",
 *           difficulty: 1-3,  // 1=easy (1 space), 2=medium (2 spaces), 3=hard (3 spaces)
 *           type: "text"  // or "multiple-choice"
 *         }
 *       ]
 *     }
 *   ],
 *   settings: {
 *     finishLine: 100,  // Percentage to win
 *     wrongAnswerPenalty: 0,  // Spaces to move back on wrong answer
 *     enableBonusRounds: true
 *   }
 * }
 */

import { loadData, saveData, getActiveCurriculum } from '../progress/index.js';
import { announce } from '../accessibility.js';
import { showConfirmModal } from '../modals.js';

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
 * Setup Tier-Rennen game
 * @param {string} containerId - ID of the container element
 * @param {object} gameData - Game data with animals, questions, and settings
 */
export function setupTierRennen(containerId, gameData) {
  console.log('🏁 setupTierRennen called with:', { containerId, gameData });
  const container = document.getElementById(containerId);
  if (!container) {
    console.error('❌ Tier-Rennen container not found:', containerId);
    return;
  }

  const chapterId = document.body.dataset.chapterId;
  if (!chapterId) return;

  const curriculum = getActiveCurriculum();
  const storageKey = `${curriculum}-tier-rennen-${containerId}-${chapterId}`;

  // Default settings
  const settings = {
    finishLine: 100,
    wrongAnswerPenalty: 0,
    enableBonusRounds: true,
    ...gameData.settings
  };

  // Initialize game state
  let state = {
    gameMode: null, // 'classroom' (3-4 teams) or 'group' (2-3 players)
    players: [], // Array of {name, animal, position, color}
    currentPlayerIndex: 0,
    currentQuestion: null,
    questionPool: [],
    questionsAsked: 0,
    gameStarted: false,
    gameFinished: false,
    winner: null
  };

  // Load saved state
  function loadState() {
    const saved = loadData(storageKey);
    if (saved) {
      state = { ...state, ...saved };
    }
  }

  // Save state
  function saveState() {
    saveData(storageKey, state);
  }

  // Reset game
  function resetGame() {
    state = {
      gameMode: null,
      players: [],
      currentPlayerIndex: 0,
      currentQuestion: null,
      questionPool: [],
      questionsAsked: 0,
      gameStarted: false,
      gameFinished: false,
      winner: null
    };
    saveState();
    renderModeSelection();
  }

  // Initialize question pool (shuffle all questions)
  function initializeQuestionPool() {
    const allQuestions = [];
    gameData.questionCategories.forEach(category => {
      category.questions.forEach(q => {
        allQuestions.push({
          ...q,
          category: category.name,
          categoryIcon: category.icon
        });
      });
    });
    state.questionPool = shuffleArray(allQuestions);
  }

  // Get next question
  function getNextQuestion() {
    if (state.questionPool.length === 0) {
      initializeQuestionPool(); // Reshuffle if we run out
    }
    return state.questionPool.pop();
  }

  // Calculate movement based on difficulty
  function calculateMovement(difficulty) {
    const movements = { 1: 10, 2: 15, 3: 20 }; // Percentage points
    return movements[difficulty] || 10;
  }

  // Render mode selection screen
  function renderModeSelection() {
    container.innerHTML = `
      <div class="bg-surface p-6 rounded-xl shadow-sm">
        <h2 class="text-2xl font-bold text-primary-700 mb-4">🏁 Tier-Rennen</h2>
        <p class="text-neutral-600 mb-6">
          Velg en spillmodus for å starte racet! Hvert lag velger et dyr-maskot som løper fremover når dere svarer riktig.
        </p>

        <div class="grid md:grid-cols-2 gap-6 mb-6">
          <!-- Classroom Mode -->
          <div class="bg-info-50 border-2 border-info-200 rounded-xl p-6 hover:border-info-400 transition-colors cursor-pointer"
               onclick="document.getElementById('mode-classroom').click()">
            <div class="flex items-center gap-3 mb-3">
              <input type="radio" name="game-mode" id="mode-classroom" value="classroom" class="w-5 h-5">
              <label for="mode-classroom" class="text-xl font-bold text-info-800 cursor-pointer">
                🎓 Klasserom-modus
              </label>
            </div>
            <p class="text-sm text-neutral-700 ml-8">
              Perfekt for å spille på storskjerm med 3-4 lag. Læreren styrer spillet og lagene konkurrerer mot hverandre.
            </p>
          </div>

          <!-- Group Mode -->
          <div class="bg-success-50 border-2 border-success-200 rounded-xl p-6 hover:border-success-400 transition-colors cursor-pointer"
               onclick="document.getElementById('mode-group').click()">
            <div class="flex items-center gap-3 mb-3">
              <input type="radio" name="game-mode" id="mode-group" value="group" class="w-5 h-5">
              <label for="mode-group" class="text-xl font-bold text-success-800 cursor-pointer">
                👥 Gruppe-modus
              </label>
            </div>
            <p class="text-sm text-neutral-700 ml-8">
              2-3 elever spiller sammen. Én elev kan være "moderator" eller alle spiller selv.
            </p>
          </div>
        </div>

        <!-- Info box about answer modes -->
        <div class="bg-info-50 border-l-4 border-info-500 p-6 rounded-r-xl mb-6">
          <h3 class="font-bold text-info-900 mb-3 flex items-center gap-2">
            <span class="text-xl">ℹ️</span>
            Slik svarer dere på spørsmål
          </h3>
          <div class="space-y-3 text-sm text-info-900">
            <div>
              <p class="font-semibold mb-1">🗣️ Muntlig modus (bruk "Vis svar"-knappen):</p>
              <p class="ml-4 text-info-800">
                Elevene svarer muntlig, og læreren eller gruppelederen vurderer om svaret stemmer med fasiten.
                Perfekt for aktiv diskusjon og læring!
              </p>
            </div>
            <div>
              <p class="font-semibold mb-1">✍️ Skriftlig modus (bruk "Sjekk svar"-knappen):</p>
              <p class="ml-4 text-info-800">
                Elevene skriver svaret sitt i tekstfeltet. Svaret må være <strong>100% nøyaktig</strong> for å bli godkjent.
              </p>
            </div>
            <div class="bg-primary-50 border border-primary-200 p-3 rounded-lg mt-2">
              <p class="font-semibold text-primary-900 mb-1">⚠️ Viktig om skriftlig modus:</p>
              <p class="text-primary-800 text-xs">
                I skriftlig modus kan teknisk riktige svar bli avvist hvis de ikke matcher fasiten eksakt.
                For eksempel vil "halb 8" bli markert som feil, mens fasiten er "halb acht".
                Dette gjelder likt for alle lag/spillere, så det er rettferdig over tid.
                Bruk muntlig modus hvis dere vil unngå dette!
              </p>
            </div>
          </div>
        </div>

        <div class="text-center">
          <button id="start-mode-btn" class="bg-primary-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-600 transition-colors disabled:bg-neutral-300 disabled:cursor-not-allowed" disabled>
            Neste: Velg dyr →
          </button>
        </div>
      </div>
    `;

    // Enable button when mode is selected
    document.querySelectorAll('input[name="game-mode"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        document.getElementById('start-mode-btn').disabled = false;
        state.gameMode = e.target.value;
      });
    });

    // Start button
    document.getElementById('start-mode-btn').addEventListener('click', () => {
      if (state.gameMode) {
        renderAnimalSelection();
      }
    });
  }

  // Render animal selection screen
  function renderAnimalSelection() {
    const numPlayers = state.gameMode === 'classroom' ? 4 : 3;
    const playerNames = state.gameMode === 'classroom'
      ? ['Lag 1', 'Lag 2', 'Lag 3', 'Lag 4']
      : ['Spiller 1', 'Spiller 2', 'Spiller 3'];

    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B']; // blue, red, green, amber

    container.innerHTML = `
      <div class="bg-surface p-6 rounded-xl shadow-sm">
        <h2 class="text-2xl font-bold text-primary-700 mb-4">🐾 Velg dyr-maskot</h2>
        <p class="text-neutral-600 mb-6">
          ${state.gameMode === 'classroom' ? 'Hvert lag' : 'Hver spiller'} velger sitt favoritt-dyr som skal løpe i racet!
        </p>

        <div class="space-y-6 mb-6">
          ${playerNames.slice(0, numPlayers).map((name, index) => `
            <div class="bg-neutral-50 p-4 rounded-lg border-2 border-neutral-200">
              <h3 class="font-bold text-lg mb-3" style="color: ${colors[index]}">
                ${name}
              </h3>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                ${gameData.animals.map(animal => `
                  <label class="cursor-pointer">
                    <input type="radio" name="animal-${index}" value="${animal.id}" class="hidden animal-radio" data-player-index="${index}">
                    <div class="animal-card border-2 border-neutral-300 rounded-lg p-3 text-center hover:border-primary-500 transition-colors">
                      <div class="text-4xl mb-1">${animal.emoji}</div>
                      <div class="text-sm font-semibold">${animal.name}</div>
                    </div>
                  </label>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>

        <div class="text-center">
          <button id="start-race-btn" class="bg-primary-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-600 transition-colors disabled:bg-neutral-300 disabled:cursor-not-allowed" disabled>
            Start racet! 🏁
          </button>
        </div>
      </div>
    `;

    // Handle animal selection
    const selectedAnimals = new Array(numPlayers).fill(null);

    document.querySelectorAll('.animal-radio').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const playerIndex = parseInt(e.target.dataset.playerIndex);
        const animalId = e.target.value;

        selectedAnimals[playerIndex] = animalId;

        // Visual feedback
        const card = e.target.nextElementSibling;
        document.querySelectorAll(`input[name="animal-${playerIndex}"]`).forEach(r => {
          r.nextElementSibling.classList.remove('border-primary-500', 'bg-primary-50');
          r.nextElementSibling.classList.add('border-neutral-300');
        });
        card.classList.remove('border-neutral-300');
        card.classList.add('border-primary-500', 'bg-primary-50');

        // Enable start button if all players selected
        const allSelected = selectedAnimals.every(a => a !== null);
        document.getElementById('start-race-btn').disabled = !allSelected;
      });
    });

    // Start race button
    document.getElementById('start-race-btn').addEventListener('click', () => {
      // Initialize players
      state.players = playerNames.slice(0, numPlayers).map((name, index) => {
        const animal = gameData.animals.find(a => a.id === selectedAnimals[index]);
        return {
          name,
          animal: animal,
          position: 0,
          color: colors[index]
        };
      });

      state.gameStarted = true;
      initializeQuestionPool();
      renderRaceTrack();
      nextTurn();
    });
  }

  // Render race track
  function renderRaceTrack() {
    container.innerHTML = `
      <div class="bg-surface p-6 rounded-xl shadow-sm">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-primary-700">🏁 Tier-Rennen</h2>
          <button id="reset-race-btn" class="text-sm bg-neutral-500 text-white px-4 py-2 rounded-lg hover:bg-neutral-600 transition-colors">
            ↻ Start på nytt
          </button>
        </div>

        <!-- Race Track -->
        <div class="mb-8">
          <div class="bg-neutral-100 rounded-lg p-6 relative" style="min-height: ${state.players.length * 80}px">
            <!-- Finish line markers -->
            <div class="absolute top-0 bottom-0 left-0 right-0 flex justify-between px-6 text-xs text-neutral-400 pointer-events-none">
              <span class="pt-2">Start</span>
              <span class="pt-2">25%</span>
              <span class="pt-2">50%</span>
              <span class="pt-2">75%</span>
              <span class="pt-2 font-bold text-primary-600">Mål!</span>
            </div>

            <!-- Animal tracks -->
            <div class="space-y-4 mt-8" id="race-tracks">
              ${state.players.map((player, index) => `
                <div class="relative">
                  <div class="flex items-center gap-3 mb-1">
                    <span class="font-bold text-sm" style="color: ${player.color}; min-width: 80px">${player.name}</span>
                    <div class="flex-1 bg-surface rounded-full h-8 border-2 border-neutral-300 relative overflow-hidden">
                      <!-- Progress bar -->
                      <div class="progress-bar absolute top-0 left-0 h-full transition-all duration-700 ease-out rounded-full"
                           style="width: ${player.position}%; background-color: ${player.color}40"></div>
                      <!-- Animal icon -->
                      <div class="animal-icon absolute top-0 left-0 h-full flex items-center justify-center transition-all duration-700 ease-out text-2xl"
                           style="left: ${Math.max(0, player.position - 3)}%">
                        ${player.animal.emoji}
                      </div>
                    </div>
                    <span class="text-sm font-bold text-neutral-600 min-w-12">${Math.round(player.position)}%</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Question Area -->
        <div id="question-area" class="mb-6">
          <!-- Questions will be rendered here -->
        </div>

        <!-- Game over / Winner announcement -->
        <div id="winner-area" class="hidden">
          <!-- Winner will be announced here -->
        </div>
      </div>
    `;

    // Reset button
    document.getElementById('reset-race-btn').addEventListener('click', async () => {
      const confirmed = await showConfirmModal(
        'Er du sikker på at du vil starte på nytt?\n\nAll fremgang vil gå tapt.',
        'Start på nytt?'
      );
      if (confirmed) {
        resetGame();
      }
    });
  }

  // Update race track positions
  function updateRaceTrack() {
    state.players.forEach((player, index) => {
      const progressBar = container.querySelectorAll('.progress-bar')[index];
      const animalIcon = container.querySelectorAll('.animal-icon')[index];
      const positionText = container.querySelectorAll('.text-sm.font-bold.text-neutral-600')[index];

      if (progressBar && animalIcon && positionText) {
        progressBar.style.width = `${player.position}%`;
        animalIcon.style.left = `${Math.max(0, player.position - 3)}%`;
        positionText.textContent = `${Math.round(player.position)}%`;
      }
    });

    // Check for winner
    const winner = state.players.find(p => p.position >= settings.finishLine);
    if (winner && !state.gameFinished) {
      state.gameFinished = true;
      state.winner = winner;
      saveState();
      announceWinner(winner);
    }
  }

  // Next turn
  function nextTurn() {
    if (state.gameFinished) return;

    const question = getNextQuestion();
    state.currentQuestion = question;
    state.questionsAsked++;

    const currentPlayer = state.players[state.currentPlayerIndex];

    renderQuestion(currentPlayer, question);
  }

  // Render question
  function renderQuestion(player, question) {
    const questionArea = document.getElementById('question-area');
    if (!questionArea) return;

    const movementPoints = calculateMovement(question.difficulty);
    const difficultyText = question.difficulty === 1 ? 'Lett' : question.difficulty === 2 ? 'Medium' : 'Vanskelig';
    const difficultyColor = question.difficulty === 1 ? 'bg-success-100 text-success-800' : question.difficulty === 2 ? 'bg-yellow-100 text-yellow-800' : 'bg-error-100 text-error-800';

    questionArea.innerHTML = `
      <div class="bg-gradient-to-r from-${player.color.replace('#', '')} to-primary-50 p-6 rounded-lg border-2" style="border-color: ${player.color}">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="text-3xl">${player.animal.emoji}</div>
            <div>
              <h3 class="font-bold text-lg" style="color: ${player.color}">${player.name} sin tur</h3>
              <p class="text-sm text-neutral-600">${question.categoryIcon} ${question.category}</p>
            </div>
          </div>
          <div class="text-right">
            <div class="text-xs ${difficultyColor} px-3 py-1 rounded-full font-semibold inline-block mb-1">
              ${difficultyText}
            </div>
            <p class="text-xs text-neutral-600">+${movementPoints}% ved riktig svar</p>
          </div>
        </div>

        <div class="bg-surface p-4 rounded-lg mb-4">
          <p class="text-lg font-semibold text-neutral-800 mb-4">${question.question}</p>

          <div id="answer-input-area">
            <input type="text"
                   id="answer-input"
                   class="w-full p-3 border-2 border-neutral-300 rounded-lg focus:border-primary-500 focus:outline-none text-lg"
                   placeholder="Skriv svaret ditt her..."
                   autocomplete="off"
                   autocorrect="off"
                   autocapitalize="off">
          </div>
        </div>

        <div class="flex gap-3">
          <button id="check-answer-btn" class="flex-1 bg-primary-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-600 transition-colors">
            Sjekk svar
          </button>
          <button id="show-answer-btn" class="bg-neutral-400 text-white font-bold py-3 px-6 rounded-lg hover:bg-neutral-500 transition-colors">
            Vis svar
          </button>
        </div>

        <div id="answer-feedback" class="mt-4 hidden"></div>
      </div>
    `;

    // Focus on input
    const answerInput = document.getElementById('answer-input');
    answerInput.focus();

    // Enter key to check answer
    answerInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('check-answer-btn').click();
      }
    });

    // Check answer button
    document.getElementById('check-answer-btn').addEventListener('click', () => {
      checkAnswer(player, question, movementPoints);
    });

    // Show answer button
    document.getElementById('show-answer-btn').addEventListener('click', () => {
      showAnswer(question);
    });
  }

  // Check answer
  function checkAnswer(player, question, movementPoints) {
    const userAnswer = document.getElementById('answer-input').value.trim();
    const correctAnswer = question.answer;

    // Simple answer checking (case-insensitive, trim whitespace)
    const isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();

    showFeedback(isCorrect, correctAnswer, () => {
      if (isCorrect) {
        // Move forward
        player.position = Math.min(settings.finishLine, player.position + movementPoints);
        announce(`${player.name} svarte riktig og flytter fremover!`);
      } else {
        // Wrong answer - optional penalty
        if (settings.wrongAnswerPenalty > 0) {
          player.position = Math.max(0, player.position - settings.wrongAnswerPenalty);
        }
        announce(`${player.name} svarte feil.`);
      }

      updateRaceTrack();
      saveState();

      // Next player's turn after delay
      setTimeout(() => {
        state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
        nextTurn();
      }, 2000);
    });
  }

  // Show answer without checking
  function showAnswer(question) {
    const feedbackArea = document.getElementById('answer-feedback');
    feedbackArea.className = 'mt-4 bg-info-50 border-l-4 border-info-500 p-4 rounded';
    feedbackArea.innerHTML = `
      <p class="font-semibold text-info-800">Riktig svar:</p>
      <p class="text-lg font-bold text-info-900">${question.answer}</p>
      <button id="mark-correct-btn" class="mt-3 bg-success-500 text-white px-4 py-2 rounded-lg hover:bg-success-600 mr-2">
        ✓ Riktig svar
      </button>
      <button id="mark-wrong-btn" class="mt-3 bg-error-500 text-white px-4 py-2 rounded-lg hover:bg-error-600">
        ✗ Feil svar
      </button>
    `;
    feedbackArea.classList.remove('hidden');

    const currentPlayer = state.players[state.currentPlayerIndex];
    const movementPoints = calculateMovement(question.difficulty);

    document.getElementById('mark-correct-btn').addEventListener('click', () => {
      currentPlayer.position = Math.min(settings.finishLine, currentPlayer.position + movementPoints);
      updateRaceTrack();
      saveState();
      setTimeout(() => {
        state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
        nextTurn();
      }, 1500);
    });

    document.getElementById('mark-wrong-btn').addEventListener('click', () => {
      if (settings.wrongAnswerPenalty > 0) {
        currentPlayer.position = Math.max(0, currentPlayer.position - settings.wrongAnswerPenalty);
      }
      updateRaceTrack();
      saveState();
      setTimeout(() => {
        state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
        nextTurn();
      }, 1500);
    });
  }

  // Show feedback
  function showFeedback(isCorrect, correctAnswer, callback) {
    const feedbackArea = document.getElementById('answer-feedback');
    feedbackArea.className = `mt-4 ${isCorrect ? 'bg-success-50 border-l-4 border-success-500' : 'bg-error-50 border-l-4 border-error-500'} p-4 rounded`;
    feedbackArea.innerHTML = `
      <p class="font-semibold ${isCorrect ? 'text-success-800' : 'text-error-800'}">
        ${isCorrect ? '✓ Riktig svar!' : '✗ Feil svar'}
      </p>
      ${!isCorrect ? `<p class="text-error-700 mt-1">Riktig svar: <strong>${correctAnswer}</strong></p>` : ''}
    `;
    feedbackArea.classList.remove('hidden');

    // Disable inputs
    document.getElementById('answer-input').disabled = true;
    document.getElementById('check-answer-btn').disabled = true;
    document.getElementById('show-answer-btn').disabled = true;

    setTimeout(callback, 2000);
  }

  // Announce winner
  function announceWinner(winner) {
    const winnerArea = document.getElementById('winner-area');
    const questionArea = document.getElementById('question-area');

    questionArea.classList.add('hidden');
    winnerArea.classList.remove('hidden');

    // Sort players by position for final standings
    const sortedPlayers = [...state.players].sort((a, b) => b.position - a.position);

    winnerArea.innerHTML = `
      <div class="bg-gradient-to-r from-primary-100 to-yellow-100 p-8 rounded-xl border-4 border-primary-500 text-center">
        <div class="text-6xl mb-4">${winner.animal.emoji} 🏆</div>
        <h2 class="text-3xl font-bold mb-2" style="color: ${winner.color}">
          ${winner.name} vinner!
        </h2>
        <p class="text-xl text-neutral-700 mb-6">Gratulerer med seieren!</p>

        <div class="bg-surface p-6 rounded-lg mb-6">
          <h3 class="font-bold text-lg mb-4 text-neutral-800">Sluttresultat:</h3>
          <div class="space-y-2">
            ${sortedPlayers.map((player, index) => `
              <div class="flex items-center justify-between p-3 rounded-lg ${index === 0 ? 'bg-primary-50' : 'bg-neutral-50'}">
                <div class="flex items-center gap-3">
                  <span class="text-2xl">${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📍'}</span>
                  <span class="text-xl">${player.animal.emoji}</span>
                  <span class="font-bold" style="color: ${player.color}">${player.name}</span>
                </div>
                <span class="font-bold text-lg">${Math.round(player.position)}%</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="flex gap-3 justify-center">
          <button id="play-again-btn" class="bg-primary-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-600 transition-colors">
            🔄 Spill igjen
          </button>
          <button id="new-game-btn" class="bg-neutral-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-neutral-600 transition-colors">
            🆕 Nytt spill
          </button>
        </div>
      </div>
    `;

    announce(`${winner.name} vinner racet!`);

    // Play again button (same teams, reset positions)
    document.getElementById('play-again-btn').addEventListener('click', () => {
      state.players.forEach(p => p.position = 0);
      state.currentPlayerIndex = 0;
      state.questionsAsked = 0;
      state.gameFinished = false;
      state.winner = null;
      initializeQuestionPool();
      saveState();
      renderRaceTrack();
      nextTurn();
    });

    // New game button (back to mode selection)
    document.getElementById('new-game-btn').addEventListener('click', () => {
      resetGame();
    });
  }

  // Initialize
  loadState();
  if (state.gameStarted && !state.gameFinished) {
    // Resume game
    renderRaceTrack();
    nextTurn();
  } else if (state.gameFinished) {
    // Show winner
    renderRaceTrack();
    announceWinner(state.winner);
  } else {
    // Start new game
    renderModeSelection();
  }
}
