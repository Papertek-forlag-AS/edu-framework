/**
 * Jeopardy Game Module
 *
 * A reusable Jeopardy-style game for reviewing lesson content.
 * Supports both classroom (teacher-led on board) and individual/pair play.
 *
 * Features:
 * - Two game modes: Classroom (4 teams) and Parvis (2 players)
 * - 60-second discussion timer with visual countdown
 * - Question banks for replayability (random selection per game)
 * - Questions ordered by difficulty (100pts = easiest, 500pts = hardest)
 * - Score tracking and progress persistence
 * - Accessible with screen reader support
 * - Team randomizer to decide who starts
 *
 * Data format (Question Banks - Recommended):
 * {
 *   categories: [
 *     {
 *       name: "Category Name",
 *       questionBanks: {
 *         "100": [
 *           { question: "Easy question?", answer: "Answer" },
 *           { question: "Another easy?", answer: "Answer" },
 *           ...
 *         ],
 *         "200": [...],
 *         ...
 *       }
 *     }
 *   ]
 * }
 *
 * Legacy format (Direct Questions - Still Supported):
 * {
 *   categories: [
 *     {
 *       name: "Category Name",
 *       questions: [
 *         { points: 100, question: "Question?", answer: "Answer" },
 *         ...
 *       ]
 *     }
 *   ]
 * }
 */

import { loadData, saveData, getActiveCurriculum } from '../progress/index.js';
import { announce } from '../accessibility.js';
import { showConfirmModal, showAlertModal } from '../modals.js';

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
 * Setup Jeopardy game
 * @param {string} containerId - ID of the container element
 * @param {object} gameData - Game data with categories and questions
 */
export function setupJeopardy(containerId, gameData) {
  console.log('🎮 setupJeopardy called with:', { containerId, gameData });
  console.log('🎮 JEOPARDY VERSION: 2.0 - WITH TIMER');
  const container = document.getElementById(containerId);
  if (!container) {
    console.error('❌ Jeopardy container not found:', containerId);
    return;
  }
  console.log('✅ Container found:', container);

  const chapterId = document.body.dataset.chapterId;
  if (!chapterId) return;

  const curriculum = getActiveCurriculum();
  const storageKey = `${curriculum}-jeopardy-${containerId}-${chapterId}`;

  // Initialize game state
  let state = {
    selectedQuestions: new Set(),
    scores: { team1: 0, team2: 0, team3: 0, team4: 0, elev1: 0, elev2: 0 },
    currentTeam: 1,
    gameMode: 'classroom', // 'classroom' or 'parvis'
    randomizedQuestions: null
  };

  // Timer state
  let timerInterval = null;
  let timeRemaining = 60;

  // Load saved state
  function loadState() {
    const saved = loadData(storageKey);
    if (saved) {
      state = {
        ...state,
        ...saved,
        selectedQuestions: new Set(saved.selectedQuestions || [])
      };
    }
  }

  // Save state
  function saveState() {
    saveData(storageKey, {
      ...state,
      selectedQuestions: Array.from(state.selectedQuestions)
    });
  }

  // Get questions - supports both question banks and direct questions
  // Question banks allow random selection from pools per difficulty level
  function getQuestions() {
    if (state.randomizedQuestions) {
      return state.randomizedQuestions;
    }

    const selectedQuestions = gameData.categories.map(category => {
      // Check if using new questionBanks format
      if (category.questionBanks) {
        // New format: select one random question from each difficulty level bank
        console.log(`🎲 Selecting random questions for category: ${category.name}`);
        const pointLevels = ['100', '200', '300', '400', '500'];
        const questions = pointLevels.map(points => {
          const bank = category.questionBanks[points];
          if (!bank || bank.length === 0) {
            console.warn(`No questions in bank for ${category.name} - ${points}pts`);
            return { points: parseInt(points), question: 'Missing question', answer: '?' };
          }
          // Randomly select one question from the bank
          const randomIndex = Math.floor(Math.random() * bank.length);
          const selectedQuestion = bank[randomIndex];
          console.log(`  ${points}pts: Selected question ${randomIndex + 1} of ${bank.length}`);
          return {
            points: parseInt(points),
            question: selectedQuestion.question,
            answer: selectedQuestion.answer
          };
        });
        return { name: category.name, questions };
      } else {
        // Old format: use questions array as-is (backward compatibility)
        console.log(`📋 Using direct questions for category: ${category.name}`);
        return { name: category.name, questions: [...category.questions] };
      }
    });

    console.log('✅ Question selection complete');
    state.randomizedQuestions = selectedQuestions;
    saveState();
    return selectedQuestions;
  }

  // Render the game board
  function renderBoard() {
    const categories = getQuestions();

    const boardHTML = `
      <div class="jeopardy-game">
        <!-- Game Controls -->
        <div class="bg-surface p-4 rounded-lg shadow-sm mb-6">
          <div class="flex flex-wrap gap-4 items-center justify-between">
            <div class="flex gap-4">
              <button id="mode-classroom" class="mode-btn ${state.gameMode === 'classroom' ? 'active' : ''} px-4 py-2 rounded-lg font-semibold transition-colors">
                🎓 Klasserom
              </button>
              <button id="mode-parvis" class="mode-btn ${state.gameMode === 'parvis' ? 'active' : ''} px-4 py-2 rounded-lg font-semibold transition-colors">
                👥 Parvis
              </button>
            </div>
            <div class="flex gap-4">
              <button id="randomize-team" class="bg-info-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-info-600 transition-colors">
                🎲 Hvem starter?
              </button>
              <button id="reset-game" class="bg-neutral-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-neutral-600 transition-colors">
                🔄 Start på nytt
              </button>
            </div>
          </div>
        </div>

        <!-- Score Display (Classroom mode - 4 teams) -->
        <div id="score-display-classroom" class="bg-surface p-4 rounded-lg shadow-sm mb-6 ${state.gameMode === 'classroom' ? '' : 'hidden'}">
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
        <div id="score-display-parvis" class="bg-surface p-4 rounded-lg shadow-sm mb-6 ${state.gameMode === 'parvis' ? '' : 'hidden'}">
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

        <!-- Jeopardy Board -->
        <div class="bg-info-900 p-4 rounded-xl shadow-lg">
          <div class="grid gap-2" style="grid-template-columns: repeat(${categories.length}, 1fr);">
            ${categories.map((category, catIndex) => `
              <!-- Category Header -->
              <div class="bg-gradient-to-b from-info-700 to-info-800 text-white p-5 text-center font-bold text-xl uppercase tracking-wide rounded-t-lg border-2 border-info-600 shadow-md" style="min-height: 80px; display: flex; align-items: center; justify-content: center; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
                ${category.name}
              </div>
            `).join('')}

            ${[0, 1, 2, 3, 4].map(qIndex =>
              categories.map((category, catIndex) => {
                const question = category.questions[qIndex];
                const questionId = `${catIndex}-${qIndex}`;
                const isSelected = state.selectedQuestions.has(questionId);

                return `
                  <button class="jeopardy-tile ${isSelected ? 'selected' : ''}"
                          data-category="${catIndex}"
                          data-question="${qIndex}"
                          data-points="${question.points}"
                          ${isSelected ? 'disabled' : ''}>
                    <span class="points">${isSelected ? '' : question.points}</span>
                  </button>
                `;
              }).join('')
            ).join('')}
          </div>
        </div>

        <!-- Question Modal (hidden by default) -->
        <div id="question-modal" class="hidden fixed inset-0 bg-neutral-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div class="bg-surface rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div class="p-8">
              <div class="text-center mb-6">
                <span id="modal-points" class="text-5xl font-bold text-info-600"></span>
              </div>
              <!-- Timer Display -->
              <div id="timer-display" class="text-center mb-6">
                <div id="timer-circle" class="inline-flex items-center justify-center w-24 h-24 rounded-full border-8 border-success-500 bg-success-50 transition-all duration-300">
                  <span id="timer-seconds" class="text-3xl font-bold text-success-700">60</span>
                </div>
                <div class="text-sm text-neutral-600 mt-2">Tid igjen til å diskutere</div>
              </div>
              <div id="modal-question" class="text-2xl font-semibold text-center mb-8 text-neutral-800"></div>

              <div id="answer-section" class="hidden">
                <div class="bg-success-50 border-2 border-success-500 rounded-lg p-6 mb-6">
                  <div class="text-sm font-semibold text-success-700 mb-2">SVAR:</div>
                  <div id="modal-answer" class="text-xl font-semibold text-success-800"></div>
                </div>
              </div>

              <div class="flex flex-wrap gap-4 justify-center mt-6">
                <button id="show-answer" class="bg-info-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-info-600 transition-colors text-lg">
                  Vis svar
                </button>
                <div id="score-buttons" class="hidden flex gap-4">
                  <button class="award-points bg-success-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-success-600 transition-colors text-lg">
                    ✓ Riktig
                  </button>
                  <button class="wrong-answer bg-error-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-error-600 transition-colors text-lg">
                    ✗ Feil
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = boardHTML;
    attachEventListeners();
  }

  // Attach event listeners
  function attachEventListeners() {
    // Mode switching
    document.getElementById('mode-classroom')?.addEventListener('click', () => {
      state.gameMode = 'classroom';
      state.currentTeam = 1;
      saveState();
      renderBoard();
    });

    document.getElementById('mode-parvis')?.addEventListener('click', () => {
      state.gameMode = 'parvis';
      state.currentTeam = 1;
      saveState();
      renderBoard();
    });

    // Randomize starting team
    document.getElementById('randomize-team')?.addEventListener('click', async () => {
      const maxTeam = state.gameMode === 'classroom' ? 4 : 2;
      const randomTeam = Math.floor(Math.random() * maxTeam) + 1;
      state.currentTeam = randomTeam;
      saveState();
      renderBoard();

      const teamName = state.gameMode === 'classroom' ? `Lag ${randomTeam}` : `Elev ${randomTeam}`;
      announce(`${teamName} starter!`, 'assertive');
      await showAlertModal(
        `${teamName} starter spillet!`,
        '🎲 Tilfeldig valgt',
        'info'
      );
    });

    // Reset game
    document.getElementById('reset-game')?.addEventListener('click', async () => {
      const confirmed = await showConfirmModal(
        'Er du sikker på at du vil starte spillet på nytt?\n\nAll progresjon vil bli slettet.',
        'Start på nytt?'
      );
      if (confirmed) {
        state = {
          selectedQuestions: new Set(),
          scores: { team1: 0, team2: 0, team3: 0, team4: 0, elev1: 0, elev2: 0 },
          currentTeam: 1,
          gameMode: state.gameMode,
          randomizedQuestions: null
        };
        saveState();
        renderBoard();
        announce('Spillet er startet på nytt', 'polite');
      }
    });

    // Tile clicks
    document.querySelectorAll('.jeopardy-tile:not(.selected)').forEach(tile => {
      tile.addEventListener('click', () => {
        const categoryIndex = parseInt(tile.dataset.category);
        const questionIndex = parseInt(tile.dataset.question);
        const points = parseInt(tile.dataset.points);
        showQuestion(categoryIndex, questionIndex, points);
      });
    });
  }

  // Show question modal
  function showQuestion(categoryIndex, questionIndex, points) {
    const categories = getQuestions();
    const question = categories[categoryIndex].questions[questionIndex];

    const modal = document.getElementById('question-modal');
    const modalPoints = document.getElementById('modal-points');
    const modalQuestion = document.getElementById('modal-question');
    const modalAnswer = document.getElementById('modal-answer');
    const answerSection = document.getElementById('answer-section');
    const showAnswerBtn = document.getElementById('show-answer');
    const scoreButtons = document.getElementById('score-buttons');

    // Set content
    modalPoints.textContent = points;
    modalQuestion.textContent = question.question;
    modalAnswer.textContent = question.answer;
    answerSection.classList.add('hidden');
    showAnswerBtn.classList.remove('hidden');
    scoreButtons.classList.add('hidden');

    // Show modal
    modal.classList.remove('hidden');
    console.log('🎮 Modal shown, about to start timer...');
    announce(`Spørsmål for ${points} poeng: ${question.question}`, 'assertive');

    // Start the 60-second timer
    console.log('🎮 Calling startTimer() now...');
    startTimer();
    console.log('🎮 startTimer() called');

    // Show answer button
    showAnswerBtn.onclick = () => {
      answerSection.classList.remove('hidden');
      showAnswerBtn.classList.add('hidden');

      // Stop the timer when answer is revealed
      stopTimer();

      // Show score buttons for both classroom and parvis modes
      if (state.gameMode === 'classroom' || state.gameMode === 'parvis') {
        scoreButtons.classList.remove('hidden');
      }

      announce(`Svar: ${question.answer}`, 'polite');
    };

    // Award points
    const awardBtn = scoreButtons.querySelector('.award-points');
    awardBtn.onclick = () => {
      stopTimer(); // Stop timer when answer is submitted
      if (state.gameMode === 'classroom') {
        state.scores[`team${state.currentTeam}`] += points;
        state.currentTeam = (state.currentTeam % 4) + 1; // Rotate teams (4 teams)
      } else if (state.gameMode === 'parvis') {
        state.scores[`elev${state.currentTeam}`] += points;
        state.currentTeam = (state.currentTeam % 2) + 1; // Rotate players (2 players)
      }
      markQuestionAsUsed(categoryIndex, questionIndex);
      modal.classList.add('hidden');
      renderBoard();
      announce(`${points} poeng gitt. Riktig svar!`, 'polite');
    };

    // Wrong answer
    const wrongBtn = scoreButtons.querySelector('.wrong-answer');
    wrongBtn.onclick = () => {
      stopTimer(); // Stop timer when answer is submitted
      if (state.gameMode === 'classroom') {
        state.currentTeam = (state.currentTeam % 4) + 1; // Rotate teams (4 teams)
      } else if (state.gameMode === 'parvis') {
        state.currentTeam = (state.currentTeam % 2) + 1; // Rotate players (2 players)
      }
      markQuestionAsUsed(categoryIndex, questionIndex);
      modal.classList.add('hidden');
      renderBoard();
      announce('Feil svar. Neste får prøve.', 'polite');
    };
  }

  // Timer functions
  function startTimer() {
    console.log('🎮 startTimer called');
    // Reset timer state
    timeRemaining = 60;
    stopTimer(); // Clear any existing timer

    const timerSecondsEl = document.getElementById('timer-seconds');
    const timerCircleEl = document.getElementById('timer-circle');

    console.log('🎮 Timer elements:', { timerSecondsEl, timerCircleEl });

    if (!timerSecondsEl || !timerCircleEl) {
      console.error('❌ Timer elements not found in DOM');
      return;
    }

    // Update display immediately
    updateTimerDisplay();

    // Start countdown
    timerInterval = setInterval(() => {
      timeRemaining--;
      updateTimerDisplay();

      // Timer expired
      if (timeRemaining <= 0) {
        stopTimer();
        // Optional: play a sound or show notification
        announce('Tiden er ute!', 'assertive');
      }
    }, 1000);

    console.log('✅ Timer started');
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function updateTimerDisplay() {
    const timerSecondsEl = document.getElementById('timer-seconds');
    const timerCircleEl = document.getElementById('timer-circle');

    if (timerSecondsEl && timerCircleEl) {
      timerSecondsEl.textContent = timeRemaining;

      // Change color based on time remaining
      if (timeRemaining > 30) {
        // Green: plenty of time
        timerCircleEl.className = 'inline-flex items-center justify-center w-24 h-24 rounded-full border-8 border-success-500 bg-success-50 transition-all duration-300';
        timerSecondsEl.className = 'text-3xl font-bold text-success-700';
      } else if (timeRemaining > 10) {
        // Amber: getting low
        timerCircleEl.className = 'inline-flex items-center justify-center w-24 h-24 rounded-full border-8 border-primary-500 bg-primary-50 transition-all duration-300';
        timerSecondsEl.className = 'text-3xl font-bold text-primary-700';
      } else {
        // Red: critical
        timerCircleEl.className = 'inline-flex items-center justify-center w-24 h-24 rounded-full border-8 border-error-500 bg-error-50 transition-all duration-300 animate-pulse';
        timerSecondsEl.className = 'text-3xl font-bold text-error-700';
      }
    }
  }

  // Mark question as used
  function markQuestionAsUsed(categoryIndex, questionIndex) {
    const questionId = `${categoryIndex}-${questionIndex}`;
    state.selectedQuestions.add(questionId);
    saveState();
  }

  // Initialize
  loadState();
  renderBoard();
}
