import { getLessonVocabulary } from '../vocab-trainer-multi/vocabulary-loader.js';
import { showAlertModal } from '../modals.js';
import { getActiveCurriculum } from '../progress/store.js';
import { getCurriculumConfig } from '../progress/curriculum-registry.js';
import { getTranslationLangCode } from '../vocab-trainer-multi/i18n-helper.js';
import { fetchCoreBank, fetchTranslationBank } from '../vocabulary/vocab-api-client.js';

/**
 * Ord-Battle: Competitive vocabulary game
 * Two students compete to translate Norwegian → German
 */

// Cached wordbanks for performance
let cachedBanks = null;
let cachedCurriculum = null;

/**
 * Merge translation data into core vocabulary entries
 */
function mergeTranslations(coreData, translationData, langCode = 'nb') {
    const merged = { ...coreData };

    for (const [wordId, coreEntry] of Object.entries(coreData)) {
        if (wordId === '_metadata') continue;

        const translation = translationData?.[wordId];
        if (translation) {
            merged[wordId] = {
                ...coreEntry,
                translations: {
                    ...(coreEntry.translations || {}),
                    [langCode]: translation.translation || ''
                }
            };

            if (translation.definite) {
                merged[wordId].definite_translations = {
                    ...(coreEntry.definite_translations || {}),
                    [langCode]: translation.definite
                };
            }

            if (translation.synonyms?.length) {
                merged[wordId].translation_synonyms = {
                    ...(coreEntry.translation_synonyms || {}),
                    [langCode]: translation.synonyms
                };
            }
        }
    }

    return merged;
}

/**
 * Load vocabulary banks for the current curriculum from external API
 */
async function loadVocabularyBanks() {
    const curriculumId = getActiveCurriculum();

    // Return cached banks if already loaded for this curriculum
    if (cachedBanks && cachedCurriculum === curriculumId) {
        return cachedBanks;
    }

    const config = getCurriculumConfig(curriculumId);
    const langCode = config?.languageConfig?.code || 'de';
    const nativeCode = getTranslationLangCode() === 'en' ? 'en' : 'nb';
    const transPair = `${langCode}-${nativeCode}`;

    const bankNames = ['generalbank', 'verbbank', 'nounbank', 'adjectivebank', 'numbersbank'];

    const [coreBanks, transBanks] = await Promise.all([
        Promise.all(bankNames.map(b => fetchCoreBank(langCode, b))),
        Promise.all(bankNames.map(b => fetchTranslationBank(transPair, b)))
    ]);

    const [coreGeneral, coreVerbs, coreNouns, coreAdj, coreNumbers] = coreBanks;
    const [transGeneral, transVerbs, transNouns, transAdj, transNumbers] = transBanks;

    const general = mergeTranslations(coreGeneral, transGeneral, nativeCode);
    const verbs = mergeTranslations(coreVerbs, transVerbs, nativeCode);
    const nouns = mergeTranslations(coreNouns, transNouns, nativeCode);
    const adjectives = mergeTranslations(coreAdj, transAdj, nativeCode);
    const numbers = mergeTranslations(coreNumbers, transNumbers, nativeCode);

    cachedBanks = {
        ordbank: { ...general, ...numbers },
        verbbank: verbs,
        substantivbank: nouns,
        adjektivbank: adjectives
    };

    cachedCurriculum = curriculumId;
    console.log('[OrdBattle] Loaded vocabulary banks for', curriculumId);
    return cachedBanks;
}

/**
 * Shuffle array (Fisher-Yates)
 */
function shuffle(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Setup Ord-Battle game
 */
export function setupOrdBattle(container, config) {
  const { availableLessons, title, subtitle, instructions } = config;

  // Create main container
  container.innerHTML = `
    <div class="bg-surface p-6 rounded-xl shadow-sm">
      <div class="text-center mb-6">
        <h2 class="text-4xl font-bold text-error-600 mb-2" style="text-shadow: 2px 2px 0px #fbbf24;">${title}</h2>
        <p class="text-xl text-accent4-600 font-semibold">${subtitle}</p>
      </div>

      <!-- Instructions Slideshow Panel -->
      <div id="instructions-panel" class="mb-8">
        <div class="bg-gradient-to-r from-yellow-100 to-primary-100 p-8 rounded-xl border-4 border-primary-300">
          <h3 class="text-3xl font-bold text-primary-800 mb-6 text-center">📋 Spilleregler</h3>

          <!-- Slideshow container -->
          <div id="instruction-slide" class="bg-surface p-8 rounded-xl border-2 border-primary-200 min-h-[300px]">
            <!-- Slide content will be inserted here -->
          </div>

          <!-- Navigation buttons -->
          <div class="flex justify-between items-center mt-6">
            <button id="prev-instruction-btn" class="bg-primary-500 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-primary-600 transition-all disabled:bg-neutral-300 disabled:cursor-not-allowed" disabled>
              ◀ Forrige
            </button>

            <div class="text-center">
              <span class="text-lg font-semibold text-primary-800">
                Steg <span id="current-step">1</span> av <span id="total-steps">5</span>
              </span>
            </div>

            <button id="next-instruction-btn" class="bg-primary-500 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-primary-600 transition-all">
              Neste ▶
            </button>
          </div>

          <!-- Hide rules and start button (shown on last slide) -->
          <div id="start-from-slideshow" class="text-center mt-6 hidden">
            <button id="hide-rules-btn" class="bg-info-500 text-white font-bold py-4 px-8 rounded-lg text-xl hover:bg-info-600 transition-all">
              ✓ Lukk regler og velg leksjon
            </button>
          </div>
        </div>
      </div>

      <!-- Lesson Selector -->
      <div id="lesson-selector" class="mb-8">
        <div class="bg-info-50 p-6 rounded-xl border-2 border-info-300">
          <h3 class="text-xl font-bold text-info-800 mb-4">Velg leksjon (Læreren bestemmer):</h3>
          <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3" id="lesson-buttons"></div>
          <div class="mt-6 text-center">
            <button id="start-battle-btn" class="bg-error-500 text-white font-bold py-4 px-8 rounded-lg text-xl hover:bg-error-600 transition-all transform hover:scale-105 disabled:bg-neutral-300 disabled:cursor-not-allowed" disabled>
              ⚔️ Start Battle!
            </button>
          </div>
        </div>
      </div>

      <!-- Odd Word Count Warning (Hidden initially) -->
      <div id="odd-word-warning" class="hidden mb-8">
        <div class="bg-gradient-to-r from-warning-100 to-error-100 p-8 rounded-xl border-4 border-warning-400">
          <div class="text-center mb-6">
            <div class="text-5xl mb-4">⚠️</div>
            <h3 class="text-3xl font-bold text-warning-800 mb-4">ODDETALL ORD!</h3>
            <div class="bg-surface p-6 rounded-lg mb-6 max-w-2xl mx-auto">
              <p class="text-xl text-warning-900 font-semibold mb-4">
                Denne leksjonen har <span id="odd-word-count" class="text-3xl font-bold text-error-600">0</span> ord.
              </p>
              <p class="text-lg text-warning-800 mb-4">
                Det betyr at <strong>én spiller får ett ekstra ord</strong>!
              </p>
            </div>
          </div>

          <div class="bg-surface p-8 rounded-lg border-4 border-error-300 mb-6 max-w-2xl mx-auto">
            <div class="text-2xl font-bold text-error-700 mb-4 text-center">
              ✊ ✋ ✌️ STEIN, SAKS, PAPIR!
            </div>
            <p class="text-lg text-center text-neutral-800 mb-4">
              Spill <strong>stein, saks, papir</strong> for å bestemme hvem som starter først og får fordelen!
            </p>
            <div class="text-center text-error-600 font-semibold">
              🎲 Vinneren av stein, saks, papir starter og får mulighet til ett ekstra poeng!
            </div>
          </div>

          <div class="text-center">
            <button id="continue-to-battle-btn" class="bg-error-500 text-white font-bold py-4 px-8 rounded-lg text-xl hover:bg-error-600 transition-all transform hover:scale-105">
              ✓ Vi har bestemt! Start battle →
            </button>
          </div>
        </div>
      </div>

      <!-- Battle Arena (Hidden initially) -->
      <div id="battle-arena" class="hidden">
        <!-- Player scores -->
        <div class="grid grid-cols-2 gap-4 mb-6">
          <div class="bg-info-100 p-4 rounded-lg border-4 border-info-400 text-center">
            <div class="text-sm font-semibold text-info-600 mb-1">👤 ELEV A</div>
            <div class="text-4xl font-bold text-info-800" id="score-a">0</div>
            <div class="text-xs text-info-600 mt-1">poeng</div>
          </div>
          <div class="bg-success-100 p-4 rounded-lg border-4 border-success-400 text-center">
            <div class="text-sm font-semibold text-success-600 mb-1">👤 ELEV B</div>
            <div class="text-4xl font-bold text-success-800" id="score-b">0</div>
            <div class="text-xs text-success-600 mt-1">poeng</div>
          </div>
        </div>

        <!-- Current turn indicator -->
        <div class="text-center mb-6">
          <div class="inline-block bg-gradient-to-r from-accent4-500 to-pink-500 text-white px-6 py-3 rounded-full font-bold text-xl">
            ⭐ <span id="current-player">ELEV A</span> SIN TUR
          </div>
        </div>

        <!-- Word card -->
        <div class="bg-gradient-to-br from-accent4-100 to-pink-100 p-8 rounded-xl border-4 border-accent4-300 mb-6">
          <div class="text-center">
            <div class="text-sm font-semibold text-accent4-600 mb-2">📢 Norsk ord:</div>
            <div class="text-5xl font-bold text-accent4-900 mb-6" id="norwegian-word"></div>

            <div id="german-answer" class="hidden mb-6">
              <div class="text-sm font-semibold text-success-600 mb-2">✅ Riktig svar:</div>
              <div class="text-4xl font-bold text-success-700" id="german-word"></div>
            </div>

            <div class="flex gap-4 justify-center">
              <button id="reveal-btn" class="bg-primary-500 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-primary-600 transition-all">
                👁️ Sjekk svar
              </button>
            </div>
          </div>
        </div>

        <!-- Answer buttons (hidden until revealed) -->
        <div id="answer-buttons" class="hidden grid grid-cols-2 gap-4 mb-6">
          <button id="correct-btn" class="bg-success-500 text-white font-bold py-4 px-6 rounded-lg text-xl hover:bg-success-600 transition-all">
            ✓ Riktig
          </button>
          <button id="wrong-btn" class="bg-error-500 text-white font-bold py-4 px-6 rounded-lg text-xl hover:bg-error-600 transition-all">
            ✗ Feil
          </button>
        </div>

        <!-- Progress -->
        <div class="text-center text-neutral-600 mb-4">
          Ord <span id="current-word-num">1</span> av <span id="total-words">0</span>
        </div>

        <!-- Quit button -->
        <div class="text-center">
          <button id="quit-btn" class="bg-neutral-400 text-white font-semibold py-2 px-4 rounded-lg hover:bg-neutral-500 transition-all">
            Avslutt og velg ny leksjon
          </button>
        </div>
      </div>

      <!-- Results Screen (Hidden initially) -->
      <div id="results-screen" class="hidden">
        <div class="bg-gradient-to-br from-yellow-100 to-primary-100 p-8 rounded-xl border-4 border-primary-400 text-center">
          <h3 class="text-3xl font-bold text-primary-800 mb-6">🏆 ORD-BATTLE FERDIG! 🏆</h3>

          <div class="grid grid-cols-2 gap-6 mb-8">
            <div class="bg-surface p-6 rounded-lg">
              <div class="text-lg font-semibold text-info-600 mb-2">👤 Elev A</div>
              <div class="text-5xl font-bold text-info-800" id="final-score-a">0</div>
              <div class="text-sm text-info-600 mt-1">poeng</div>
            </div>
            <div class="bg-surface p-6 rounded-lg">
              <div class="text-lg font-semibold text-success-600 mb-2">👤 Elev B</div>
              <div class="text-5xl font-bold text-success-800" id="final-score-b">0</div>
              <div class="text-sm text-success-600 mt-1">poeng</div>
            </div>
          </div>

          <div class="bg-surface p-6 rounded-lg mb-6">
            <div class="text-3xl font-bold text-accent4-600 mb-4" id="winner-text"></div>
          </div>

          <!-- Tie-breaker instruction (shown only for ties) -->
          <div id="tie-breaker" class="hidden bg-gradient-to-r from-warning-100 to-error-100 border-4 border-warning-400 p-8 rounded-lg mb-6">
            <div class="text-2xl font-bold text-warning-800 mb-4">✊✋✌️ STEIN, SAKS, PAPIR!</div>
            <p class="text-lg text-warning-900 font-semibold mb-4">
              Dere må spille stein, saks, papir for å bestemme vinneren!
            </p>
            <div class="bg-surface p-4 rounded-lg">
              <p class="text-warning-800 font-bold text-xl">
                Spill stein, saks, papir nå!
              </p>
            </div>
          </div>

          <div id="winner-instructions" class="bg-error-50 border-4 border-error-300 p-6 rounded-lg mb-6">
            <div class="text-xl font-bold text-error-700 mb-4">⚠️ HVA NÅ? ⚠️</div>
            <div class="space-y-2 text-left max-w-md mx-auto">
              <div class="flex items-center gap-3">
                <span class="text-3xl">👍</span>
                <span class="text-lg font-semibold">Hold tommelen OPP hvis du vant</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-3xl">👎</span>
                <span class="text-lg font-semibold">Hold tommelen NED hvis du tapte</span>
              </div>
            </div>
          </div>

          <div class="bg-accent4-50 border-2 border-accent4-300 p-4 rounded-lg mb-6">
            <p class="text-accent4-800 font-semibold">👍 møter bare 👍 | 👎 møter bare 👎</p>
          </div>

          <button id="new-battle-btn" class="bg-error-500 text-white font-bold py-4 px-8 rounded-lg text-xl hover:bg-error-600 transition-all">
            🔄 Velg ny leksjon
          </button>
        </div>
      </div>
    </div>
  `;

  // Slideshow state
  let currentSlideIndex = 0;

  // Render current instruction slide
  function renderSlide() {
    const slide = container.querySelector('#instruction-slide');
    const instr = instructions[currentSlideIndex];

    slide.innerHTML = `
      <div class="text-center">
        <div class="flex-shrink-0 bg-error-500 text-white w-16 h-16 rounded-full flex items-center justify-center font-bold text-3xl mx-auto mb-4">
          ${instr.step}
        </div>
        <div class="text-3xl font-bold text-neutral-800 mb-4">${instr.icon} ${instr.title}</div>
        <ul class="space-y-3 text-left max-w-2xl mx-auto">
          ${instr.content.map(item => `<li class="text-xl text-neutral-700">${item}</li>`).join('')}
        </ul>
      </div>
    `;

    // Update step counter
    container.querySelector('#current-step').textContent = currentSlideIndex + 1;
    container.querySelector('#total-steps').textContent = instructions.length;

    // Update button states
    const prevBtn = container.querySelector('#prev-instruction-btn');
    const nextBtn = container.querySelector('#next-instruction-btn');
    const startSection = container.querySelector('#start-from-slideshow');

    prevBtn.disabled = currentSlideIndex === 0;

    if (currentSlideIndex === instructions.length - 1) {
      // Last slide - show "Lukk regler" button
      nextBtn.disabled = true;
      startSection.classList.remove('hidden');
    } else {
      nextBtn.disabled = false;
      startSection.classList.add('hidden');
    }
  }

  // Initial render
  renderSlide();

  // Previous slide button
  container.querySelector('#prev-instruction-btn').addEventListener('click', () => {
    if (currentSlideIndex > 0) {
      currentSlideIndex--;
      renderSlide();
    }
  });

  // Next slide button
  container.querySelector('#next-instruction-btn').addEventListener('click', () => {
    if (currentSlideIndex < instructions.length - 1) {
      currentSlideIndex++;
      renderSlide();
    }
  });

  // Hide rules button
  container.querySelector('#hide-rules-btn').addEventListener('click', () => {
    container.querySelector('#instructions-panel').classList.add('hidden');
    container.querySelector('#lesson-selector').classList.remove('hidden');
  });

  // Render lesson buttons
  const lessonButtons = container.querySelector('#lesson-buttons');
  availableLessons.forEach(lessonId => {
    const btn = document.createElement('button');
    btn.className = 'lesson-btn bg-surface border-3 border-info-300 text-info-800 font-bold py-3 px-4 rounded-lg hover:bg-info-100 transition-all text-lg';
    btn.textContent = lessonId;
    btn.dataset.lesson = lessonId;

    btn.addEventListener('click', () => {
      // Deselect all
      container.querySelectorAll('.lesson-btn').forEach(b => {
        b.classList.remove('bg-info-500', 'text-white', 'border-info-600');
        b.classList.add('bg-surface', 'text-info-800', 'border-info-300');
      });

      // Select this one
      btn.classList.remove('bg-surface', 'text-info-800', 'border-info-300');
      btn.classList.add('bg-info-500', 'text-white', 'border-info-600');

      // Enable start button
      container.querySelector('#start-battle-btn').disabled = false;
    });

    lessonButtons.appendChild(btn);
  });

  // Game state
  let vocabulary = [];
  let currentWordIndex = 0;
  let currentPlayer = 'A'; // 'A' or 'B'
  let scoreA = 0;
  let scoreB = 0;

  // Start battle
  container.querySelector('#start-battle-btn').addEventListener('click', async () => {
    const selectedBtn = container.querySelector('.lesson-btn.bg-info-500');
    if (!selectedBtn) return;

    const lessonId = selectedBtn.dataset.lesson; // e.g., "1.1"

    // Load vocabulary banks first
    const banks = await loadVocabularyBanks();

    // Load vocabulary using the new manifest structure with loaded banks
    const fullVocab = getLessonVocabulary(lessonId, banks);

    // Transform to simplified format for the game (norsk/tysk pairs)
    vocabulary = shuffle(fullVocab.map(word => ({
      norsk: word.native || word.norsk,
      tysk: word.target || word.tysk
    })));

    if (vocabulary.length === 0) {
      await showAlertModal(
        'Ingen ord funnet for denne leksjonen!',
        '⚠️ Ingen ord',
        'error'
      );
      return;
    }

    // Reset game state
    currentWordIndex = 0;
    currentPlayer = 'A';
    scoreA = 0;
    scoreB = 0;

    // Check if word count is odd
    const isOddWordCount = vocabulary.length % 2 !== 0;

    if (isOddWordCount) {
      // Show odd word warning instead of going directly to battle
      container.querySelector('#lesson-selector').classList.add('hidden');
      container.querySelector('#instructions-panel').classList.add('hidden');
      container.querySelector('#odd-word-warning').classList.remove('hidden');

      // Update word count in warning
      container.querySelector('#odd-word-count').textContent = vocabulary.length;
    } else {
      // Even word count - proceed directly to battle
      startBattleArena();
    }
  });

  // Continue to battle after odd word warning
  container.querySelector('#continue-to-battle-btn').addEventListener('click', () => {
    container.querySelector('#odd-word-warning').classList.add('hidden');
    startBattleArena();
  });

  // Helper function to start the battle arena
  function startBattleArena() {
    container.querySelector('#battle-arena').classList.remove('hidden');

    // Update UI
    container.querySelector('#total-words').textContent = vocabulary.length;
    updateScores();
    showNextWord();
  }

  // Reveal answer
  container.querySelector('#reveal-btn').addEventListener('click', () => {
    container.querySelector('#german-answer').classList.remove('hidden');
    container.querySelector('#answer-buttons').classList.remove('hidden');
    container.querySelector('#reveal-btn').classList.add('hidden');
  });

  // Mark correct
  container.querySelector('#correct-btn').addEventListener('click', () => {
    if (currentPlayer === 'A') {
      scoreA++;
    } else {
      scoreB++;
    }
    updateScores();
    nextTurn();
  });

  // Mark wrong
  container.querySelector('#wrong-btn').addEventListener('click', () => {
    nextTurn();
  });

  // Quit to lesson selector
  container.querySelector('#quit-btn').addEventListener('click', () => {
    container.querySelector('#battle-arena').classList.add('hidden');
    container.querySelector('#odd-word-warning').classList.add('hidden');
    container.querySelector('#lesson-selector').classList.remove('hidden');
    container.querySelector('#instructions-panel').classList.remove('hidden');

    // Reset slideshow
    currentSlideIndex = 0;
    renderSlide();

    // Deselect lesson
    container.querySelectorAll('.lesson-btn').forEach(b => {
      b.classList.remove('bg-info-500', 'text-white', 'border-info-600');
      b.classList.add('bg-surface', 'text-info-800', 'border-info-300');
    });
    container.querySelector('#start-battle-btn').disabled = true;
  });

  // New battle from results
  container.querySelector('#new-battle-btn').addEventListener('click', () => {
    container.querySelector('#results-screen').classList.add('hidden');
    container.querySelector('#odd-word-warning').classList.add('hidden');
    container.querySelector('#lesson-selector').classList.remove('hidden');
    container.querySelector('#instructions-panel').classList.remove('hidden');

    // Reset slideshow
    currentSlideIndex = 0;
    renderSlide();

    // Deselect lesson
    container.querySelectorAll('.lesson-btn').forEach(b => {
      b.classList.remove('bg-info-500', 'text-white', 'border-info-600');
      b.classList.add('bg-surface', 'text-info-800', 'border-info-300');
    });
    container.querySelector('#start-battle-btn').disabled = true;
  });

  function showNextWord() {
    if (currentWordIndex >= vocabulary.length) {
      showResults();
      return;
    }

    const word = vocabulary[currentWordIndex];
    container.querySelector('#norwegian-word').textContent = word.norsk;
    container.querySelector('#german-word').textContent = word.tysk;
    container.querySelector('#current-word-num').textContent = currentWordIndex + 1;
    container.querySelector('#current-player').textContent = `ELEV ${currentPlayer}`;

    // Reset UI
    container.querySelector('#german-answer').classList.add('hidden');
    container.querySelector('#answer-buttons').classList.add('hidden');
    container.querySelector('#reveal-btn').classList.remove('hidden');
  }

  function nextTurn() {
    currentWordIndex++;
    currentPlayer = currentPlayer === 'A' ? 'B' : 'A';
    showNextWord();
  }

  function updateScores() {
    container.querySelector('#score-a').textContent = scoreA;
    container.querySelector('#score-b').textContent = scoreB;
  }

  function showResults() {
    container.querySelector('#battle-arena').classList.add('hidden');
    container.querySelector('#results-screen').classList.remove('hidden');

    container.querySelector('#final-score-a').textContent = scoreA;
    container.querySelector('#final-score-b').textContent = scoreB;

    const winnerText = container.querySelector('#winner-text');
    const tieBreaker = container.querySelector('#tie-breaker');
    const winnerInstructions = container.querySelector('#winner-instructions');

    if (scoreA > scoreB) {
      winnerText.textContent = '🎉 VINNER: ELEV A! 🎉';
      tieBreaker.classList.add('hidden');
      winnerInstructions.classList.remove('hidden');
    } else if (scoreB > scoreA) {
      winnerText.textContent = '🎉 VINNER: ELEV B! 🎉';
      tieBreaker.classList.add('hidden');
      winnerInstructions.classList.remove('hidden');
    } else {
      winnerText.textContent = '🤝 UAVGJORT! 🤝';
      tieBreaker.classList.remove('hidden');
      winnerInstructions.classList.add('hidden');
    }
  }
}
