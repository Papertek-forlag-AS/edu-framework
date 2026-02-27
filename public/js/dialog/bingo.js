/**
 * Bingo Game Module
 *
 * A reusable Bingo game for classroom and individual use.
 * Each student gets their own randomized board.
 *
 * Features:
 * - Randomized board generation (each student gets a unique board)
 * - Multiple grid sizes (3x3, 4x4, 5x5)
 * - Line win (row/column/diagonal) or full board win
 * - Teacher mode (manual calling) or auto mode (system calls)
 * - Visual and audio feedback
 * - Progress persistence
 * - Accessible with screen reader support
 *
 * Usage:
 * import { setupBingo } from './dialog/bingo.js';
 * setupBingo('container-id', bingoGameData);
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
 * Setup Bingo game
 * @param {string} containerId - ID of the container element
 * @param {object} gameData - Game data with items and configuration
 */
export function setupBingo(containerId, gameData) {
  console.log('🎯 setupBingo called with:', { containerId, gameData });

  const container = document.getElementById(containerId);
  if (!container) {
    console.error('❌ Bingo container not found:', containerId);
    return;
  }

  const chapterId = document.body.dataset.chapterId;
  if (!chapterId) return;

  const curriculum = getActiveCurriculum();
  const storageKey = `${curriculum}-bingo-${containerId}-${chapterId}`;
  const gridSize = gameData.gridSize || 4;
  const totalCells = gridSize * gridSize;

  // Initialize game state
  let state = {
    board: [], // The player's randomized board
    markedCells: new Set(), // Cells the player has marked
    calledItems: [], // Items that have been called (in order)
    currentCallIndex: -1, // Which item is currently being called (-1 = none)
    hasWon: false,
    gameStarted: false
  };

  // Load saved state or generate new board
  function loadState() {
    const saved = loadData(storageKey);
    if (saved && saved.board && saved.board.length === totalCells) {
      state = {
        ...saved,
        markedCells: new Set(saved.markedCells || [])
      };
    } else {
      // Generate new board
      generateNewBoard();
    }
  }

  // Save state
  function saveState() {
    saveData(storageKey, {
      ...state,
      markedCells: Array.from(state.markedCells)
    });
  }

  // Generate a new randomized board for the player
  function generateNewBoard() {
    const shuffledItems = shuffleArray(gameData.items);
    state.board = shuffledItems.slice(0, totalCells);
    state.markedCells = new Set();
    state.calledItems = shuffleArray([...gameData.items]); // Randomize call order too
    state.currentCallIndex = -1;
    state.hasWon = false;
    state.gameStarted = false;
    saveState();
  }

  // Check for win condition
  function checkWin() {
    const marked = state.markedCells;

    if (gameData.winCondition === 'full') {
      // Full board win
      return marked.size === totalCells;
    }

    // Line win (row, column, or diagonal)
    // Check rows
    for (let row = 0; row < gridSize; row++) {
      let rowComplete = true;
      for (let col = 0; col < gridSize; col++) {
        if (!marked.has(row * gridSize + col)) {
          rowComplete = false;
          break;
        }
      }
      if (rowComplete) return true;
    }

    // Check columns
    for (let col = 0; col < gridSize; col++) {
      let colComplete = true;
      for (let row = 0; row < gridSize; row++) {
        if (!marked.has(row * gridSize + col)) {
          colComplete = false;
          break;
        }
      }
      if (colComplete) return true;
    }

    // Check diagonal (top-left to bottom-right)
    let diag1Complete = true;
    for (let i = 0; i < gridSize; i++) {
      if (!marked.has(i * gridSize + i)) {
        diag1Complete = false;
        break;
      }
    }
    if (diag1Complete) return true;

    // Check diagonal (top-right to bottom-left)
    let diag2Complete = true;
    for (let i = 0; i < gridSize; i++) {
      if (!marked.has(i * gridSize + (gridSize - 1 - i))) {
        diag2Complete = false;
        break;
      }
    }
    if (diag2Complete) return true;

    return false;
  }

  // Render the game
  function render() {
    const instructionsHTML = gameData.instructions
      ? `<ol class="list-decimal list-inside space-y-1 text-neutral-700">
          ${gameData.instructions.map(inst => `<li>${inst}</li>`).join('')}
        </ol>`
      : '';

    const helpPhrasesHTML = gameData.helpPhrases
      ? `<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          ${gameData.helpPhrases.map(phrase => `
            <div class="bg-primary-50 p-3 rounded-lg text-center">
              <div class="font-bold text-primary-800">${phrase.german}</div>
              <div class="text-neutral-600 text-sm">${phrase.norwegian}</div>
              <div class="text-neutral-500 text-xs mt-1">f.eks. ${phrase.example}</div>
            </div>
          `).join('')}
        </div>`
      : '';

    const html = `
      <div class="bingo-game">
        <!-- Header -->
        <div class="bg-gradient-to-r from-info-600 to-accent4-600 text-white p-6 rounded-xl mb-6 text-center">
          <h2 class="text-3xl font-bold mb-2">${gameData.title}</h2>
          <p class="text-info-100">${gameData.subtitle}</p>
        </div>

        <!-- Instructions -->
        <div class="bg-surface p-6 rounded-xl shadow-sm mb-6">
          <h3 class="font-bold text-lg mb-3 text-primary-700">📋 Slik spiller du:</h3>
          ${instructionsHTML}
          ${helpPhrasesHTML}
        </div>

        <!-- Game Controls -->
        <div class="bg-surface p-4 rounded-xl shadow-sm mb-6">
          <div class="flex flex-wrap gap-4 items-center justify-center">
            <button id="bingo-new-board" class="bg-info-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-info-600 transition-colors">
              🔄 Nytt brett
            </button>
            <button id="bingo-call-next" class="bg-success-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-success-600 transition-colors ${state.hasWon ? 'opacity-50 cursor-not-allowed' : ''}">
              📢 Neste klokkeslett
            </button>
            <button id="bingo-show-called" class="bg-accent4-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-accent4-600 transition-colors">
              📜 Vis kalte tider
            </button>
          </div>
        </div>

        <!-- Current Call Display -->
        <div id="bingo-current-call" class="bg-gradient-to-r from-info-600 to-accent4-600 text-white p-8 rounded-xl mb-6 text-center ${state.currentCallIndex < 0 ? 'hidden' : ''}">
          <div class="text-lg mb-2 opacity-80">Læreren sier:</div>
          <div class="text-4xl font-bold mb-2" id="bingo-call-german">
            ${state.currentCallIndex >= 0 ? state.calledItems[state.currentCallIndex]?.german : ''}
          </div>
          <div class="text-xl opacity-90" id="bingo-call-norwegian">
            ${state.currentCallIndex >= 0 ? `(${state.calledItems[state.currentCallIndex]?.norwegian})` : ''}
          </div>
        </div>

        <!-- Win Banner -->
        <div id="bingo-win-banner" class="bg-gradient-to-r from-yellow-400 to-warning-500 text-white p-8 rounded-xl mb-6 text-center ${state.hasWon ? '' : 'hidden'}">
          <div class="text-5xl mb-4">🎉</div>
          <div class="text-3xl font-bold mb-2">BINGO!</div>
          <div class="text-lg">Gratulerer! Du har vunnet!</div>
        </div>

        <!-- Bingo Board -->
        <div class="bg-surface p-6 rounded-xl shadow-sm">
          <div class="bingo-board grid gap-2 max-w-2xl mx-auto" style="grid-template-columns: repeat(${gridSize}, 1fr);">
            ${state.board.map((item, index) => {
      const isMarked = state.markedCells.has(index);

      return `
                <button class="bingo-cell aspect-square flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all duration-200
                  ${isMarked
          ? 'bg-success-500 border-success-600 text-white'
          : 'bg-neutral-100 border-neutral-300 hover:bg-neutral-200 hover:border-neutral-400'}
                  ${state.hasWon ? 'cursor-default' : 'cursor-pointer'}"
                  data-index="${index}"
                  data-display="${item.display}"
                  ${state.hasWon ? 'disabled' : ''}>
                  <span class="text-2xl font-bold">${item.display}</span>
                  ${isMarked ? '<span class="text-xl mt-1">✓</span>' : ''}
                </button>
              `;
    }).join('')}
          </div>
        </div>

        <!-- Called Items Modal -->
        <div id="bingo-called-modal" class="hidden fixed inset-0 bg-neutral-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div class="bg-surface rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div class="p-6">
              <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-bold text-primary-700">📜 Kalte klokkeslett</h3>
                <button id="bingo-close-modal" class="text-neutral-500 hover:text-neutral-700 text-2xl">&times;</button>
              </div>
              <div id="bingo-called-list" class="space-y-2">
                ${state.calledItems.slice(0, state.currentCallIndex + 1).map((item, idx) => `
                  <div class="flex justify-between items-center p-3 bg-neutral-50 rounded-lg">
                    <span class="font-bold text-lg">${idx + 1}. ${item.display}</span>
                    <span class="text-neutral-600">${item.german}</span>
                  </div>
                `).join('') || '<p class="text-neutral-500 text-center">Ingen klokkeslett er kalt ennå.</p>'}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
    attachEventListeners();
  }

  // Attach event listeners
  function attachEventListeners() {
    // New board button
    document.getElementById('bingo-new-board')?.addEventListener('click', async () => {
      const confirmed = await showConfirmModal(
        'Er du sikker på at du vil starte på nytt med et nytt brett?',
        'Start på nytt?'
      );
      if (confirmed) {
        generateNewBoard();
        render();
        announce('Nytt brett generert!', 'polite');
      }
    });

    // Call next button
    document.getElementById('bingo-call-next')?.addEventListener('click', () => {
      if (state.hasWon) return;

      if (state.currentCallIndex < state.calledItems.length - 1) {
        state.currentCallIndex++;
        state.gameStarted = true;
        saveState();
        render();

        const currentItem = state.calledItems[state.currentCallIndex];
        announce(`${currentItem.german} - ${currentItem.norwegian}`, 'assertive');
      } else {
        announce('Alle klokkeslett er kalt!', 'polite');
      }
    });

    // Show called items
    document.getElementById('bingo-show-called')?.addEventListener('click', () => {
      const modal = document.getElementById('bingo-called-modal');
      if (modal) {
        modal.classList.remove('hidden');
      }
    });

    // Close modal
    document.getElementById('bingo-close-modal')?.addEventListener('click', () => {
      const modal = document.getElementById('bingo-called-modal');
      if (modal) {
        modal.classList.add('hidden');
      }
    });

    // Click outside modal to close
    document.getElementById('bingo-called-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'bingo-called-modal') {
        e.target.classList.add('hidden');
      }
    });

    // Bingo cell clicks - students can mark ANY cell freely
    // (they listen to the teacher and mark what they hear)
    const cells = document.querySelectorAll('.bingo-cell');

    cells.forEach(cell => {
      cell.addEventListener('click', (e) => {
        e.preventDefault();

        if (state.hasWon) return;

        const index = parseInt(cell.dataset.index);

        if (state.markedCells.has(index)) {
          // Unmark the cell
          state.markedCells.delete(index);
          announce('Celle fjernet', 'polite');
        } else {
          // Mark the cell
          state.markedCells.add(index);
          announce('Celle markert!', 'polite');

          // Check for win (row, column, or diagonal)
          if (checkWin()) {
            state.hasWon = true;
            announce('BINGO! Du har vunnet!', 'assertive');
          }
        }

        saveState();
        render();
      });
    });
  }

  // Add custom CSS for shake animation
  function addCustomStyles() {
    if (!document.getElementById('bingo-custom-styles')) {
      const style = document.createElement('style');
      style.id = 'bingo-custom-styles';
      style.textContent = `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
        .bingo-cell:hover:not(:disabled) {
          transform: scale(1.02);
        }
        .bingo-cell:active:not(:disabled) {
          transform: scale(0.98);
        }
      `;
      document.head.appendChild(style);
    }
  }

  // Initialize
  addCustomStyles();
  loadState();
  render();

  console.log('✅ Bingo game initialized');
}
