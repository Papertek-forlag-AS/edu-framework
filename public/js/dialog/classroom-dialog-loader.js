/**
 * Classroom Dialog Loader
 * Dynamically loads and renders classroom dialog presentations and games from data.
 * Supports multiple content types:
 * - Dialog slides (standard classroom presentations)
 * - Bingo games (interactive classroom games)
 * - Ord-Battle (competitive vocabulary game)
 * - Konjugations-Karussell (verb conjugation drill game)
 */

import { debug } from '../logger.js';
import { getActiveCurriculum } from '../progress/store.js';
import { getCurriculumConfig } from '../progress/curriculum-registry.js';

let currentSlideIndex = 0;
let totalSlides = 0;

/**
 * Loads classroom dialog content for the current lesson.
 * Checks for dialog slides, bingo games, tier-rennen games, and ord-battle.
 * @param {object} externalConfig - Optional config to use (overrides getActiveCurriculum)
 */
export async function loadClassroomDialog(externalConfig) {
  const chapterId = document.body.dataset.chapterId;
  const curriculumId = externalConfig?.id || getActiveCurriculum();
  const config = externalConfig || getCurriculumConfig(curriculumId);

  // Check if this is an international page - use german-international folder
  const isInternational = document.body?.dataset?.uiLanguage === 'en';
  const languageDir = isInternational ? 'german-international' : (config?.languageDir || 'german');

  let dialogData = null;
  let bingo = null;
  let ordBattle = null;

  // Load Dialog Data
  try {
    const module = await import(`../../content/${languageDir}/dialog/classroom-dialog-data.js`);
    dialogData = module.classroomDialogData?.[chapterId];
  } catch (e) {
    debug(`No classroom dialog data for ${languageDir}/${chapterId}`);
  }

  // Load Bingo Data
  try {
    const module = await import(`../../content/${languageDir}/dialog/bingo-data.js`);
    bingo = module.bingoData?.[chapterId];
  } catch (e) {
    // Expected for languages without this file yet
  }

  // Load OrdBattle Data
  try {
    const module = await import(`../../content/${languageDir}/dialog/ord-battle-data.js`);
    ordBattle = module.ordBattleData?.[chapterId];
  } catch (e) {
    // Expected
  }

  const ordBattleDataForChapter = ordBattle; // Alias for consistency if needed

  // Load Konjugations-Karussell Data
  let konjugationsKarussell = null;
  try {
    const module = await import(`../../content/${languageDir}/dialog/konjugations-karussell-data.js`);
    konjugationsKarussell = module.konjugationsKarussellData?.[chapterId];
  } catch (e) {
    // Expected for languages without this file yet
  }

  // Check for jeopardy game in exercise data
  let jeopardyData = null;

  // Check for tier-rennen game in exercise data
  let tierRennenData = null;

  let chapterNum;

  // Extract chapter number based on curriculum ID
  if (chapterId.startsWith(curriculumId)) {
    // e.g. vg1-tysk1-1-2 -> -1-2 -> 1
    const remainder = chapterId.substring(curriculumId.length);
    const parts = remainder.split('-').filter(p => p);
    chapterNum = parts[0];
  } else {
    // Fallback/Legacy: just take the first part
    chapterNum = chapterId.split('-')[0];
  }

  // Load Tier Rennen & Jeopardy from Exercises Data
  // Dynamic path based on languageDir
  try {
    // International pages use 'international-a1' folder
    const folderName = isInternational ? 'international-a1' : (config?.folderName || curriculumId);
    const module = await import(`../../content/${languageDir}/exercises-data/${folderName}/chapter-${chapterNum}.js`);
    const lessonData = module.exercisesData[chapterId];

    if (lessonData) {
      if (lessonData.tierRennen) tierRennenData = lessonData.tierRennen;
      if (lessonData.jeopardy) jeopardyData = lessonData.jeopardy;
    }
  } catch (error) {
    debug(`No exercises data found for ${chapterId} in ${languageDir}/exercises-data/${curriculumId}/chapter-${chapterNum}.js`);
  }

  // Check if we have any classroom content
  if (!dialogData && !bingo && !tierRennenData && !ordBattle && !jeopardyData && !konjugationsKarussell) {
    // No classroom content for this lesson - show "Coming Soon" message
    const container = document.getElementById('classroom-dialog-container');
    if (container) {
      container.innerHTML = `
            <div class="bg-surface p-6 rounded-xl shadow-sm">
                <h2 class="text-2xl font-bold text-primary-700 mb-4">Klasseromsdialog</h2>
                <div class="bg-primary-50 border-l-4 border-primary-500 p-6 rounded-r-lg text-center">
                    <div class="text-4xl mb-4">🚧</div>
                    <h3 class="text-lg font-bold text-primary-800 mb-2">Kommer snart!</h3>
                    <p class="text-neutral-700">
                        Lærerressurser for denne leksjonen er under utvikling.<br>
                        Har du forslag til lærerressurser? Ta kontakt!
                    </p>
                </div>
                <div class="mt-8 text-center">
                    <button class="next-tab-btn bg-neutral-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-neutral-600 transition-colors" data-next-tab="ovelser">
                        ← Tilbake til øvelser
                    </button>
                </div>
            </div>
        `;

      // Re-attach event listeners for the new button
      import('../ui.js').then(module => {
        module.setupNextTabButtons();
      });
    }
    return;
  }

  const container = document.getElementById('classroom-dialog-container');
  if (!container) {
    console.warn('Classroom dialog container not found');
    return;
  }

  // Clear existing content
  container.innerHTML = '';

  // If we have konjugations-karussell data, load the game
  if (konjugationsKarussell) {
    await loadKonjugationsKarussellGame(container, konjugationsKarussell, chapterId);
  }

  // If we have ord-battle data, load the game
  if (ordBattle) {
    await loadOrdBattleGame(container, ordBattle, chapterId);
  }

  // If we have tier-rennen data, load the game
  if (tierRennenData) {
    await loadTierRennenGame(container, tierRennenData, chapterId);
  }

  // If we have jeopardy data, load the game
  if (jeopardyData) {
    await loadJeopardyGame(container, jeopardyData, chapterId);
  }

  // If we have bingo data, load the bingo game
  if (bingo) {
    loadBingoGame(container, bingo, chapterId);
  }

  // If we have dialog data, load the dialog slides
  if (dialogData) {
    loadDialogSlides(container, dialogData, chapterId);
  }
}

/**
 * Loads Konjugations-Karussell game content
 */
async function loadKonjugationsKarussellGame(container, konjugationsKarussellData, chapterId) {
  // Create konjugations-karussell container
  const karussellSection = document.createElement('div');
  karussellSection.className = 'mb-8';
  karussellSection.id = 'konjugations-karussell-game-container';
  container.appendChild(karussellSection);

  // Dynamically import and setup konjugations-karussell
  try {
    const { setupKonjugationsKarussell } = await import('./konjugations-karussell.js');
    setupKonjugationsKarussell('konjugations-karussell-game-container', konjugationsKarussellData);
    debug(`✅ Loaded Konjugations-Karussell game for ${chapterId}`);
  } catch (error) {
    console.error('Failed to load Konjugations-Karussell game:', error);
    karussellSection.innerHTML = `
      <div class="bg-error-50 border-l-4 border-error-500 p-6 rounded-r-xl">
        <p class="text-error-700">Kunne ikke laste Konjugations-Karussell-spillet. Prøv å laste siden på nytt.</p>
      </div>
    `;
  }
}

/**
 * Loads Ord-Battle game content
 */
async function loadOrdBattleGame(container, ordBattleConfig, chapterId) {
  // Create ord-battle container
  const ordBattleSection = document.createElement('div');
  ordBattleSection.className = 'mb-8';
  ordBattleSection.id = 'ord-battle-game-container';
  container.appendChild(ordBattleSection);

  // Dynamically import and setup ord-battle
  try {
    const { setupOrdBattle } = await import('./ord-battle.js');
    setupOrdBattle(ordBattleSection, ordBattleConfig);
    debug(`✅ Loaded Ord-Battle game for ${chapterId}`);
  } catch (error) {
    console.error('Failed to load Ord-Battle game:', error);
    ordBattleSection.innerHTML = `
      <div class="bg-error-50 border-l-4 border-error-500 p-6 rounded-r-xl">
        <p class="text-error-700">Kunne ikke laste Ord-Battle-spillet. Prøv å laste siden på nytt.</p>
      </div>
    `;
  }
}

/**
 * Loads tier-rennen game content
 */
async function loadTierRennenGame(container, tierRennenGameData, chapterId) {
  // Create tier-rennen container
  const tierRennenSection = document.createElement('div');
  tierRennenSection.className = 'mb-8';
  tierRennenSection.id = 'tier-rennen-game-container';
  container.appendChild(tierRennenSection);

  // Dynamically import and setup tier-rennen
  try {
    const { setupTierRennen } = await import('./tier-rennen.js');
    setupTierRennen('tier-rennen-game-container', tierRennenGameData);
    debug(`✅ Loaded tier-rennen game for ${chapterId}`);
  } catch (error) {
    console.error('Failed to load tier-rennen game:', error);
    tierRennenSection.innerHTML = `
      <div class="bg-error-50 border-l-4 border-error-500 p-6 rounded-r-xl">
        <p class="text-error-700">Kunne ikke laste Tier-Rennen-spillet. Prøv å laste siden på nytt.</p>
      </div>
    `;
  }
}

/**
 * Loads jeopardy game content
 */
async function loadJeopardyGame(container, jeopardyGameData, chapterId) {
  // Create jeopardy container
  const jeopardySection = document.createElement('div');
  jeopardySection.className = 'mb-8';
  jeopardySection.id = 'jeopardy-game-container';
  container.appendChild(jeopardySection);

  // Dynamically import and setup jeopardy
  try {
    const { setupJeopardy } = await import('./jeopardy.js');
    setupJeopardy('jeopardy-game-container', jeopardyGameData);
    debug(`✅ Loaded jeopardy game for ${chapterId}`);
  } catch (error) {
    console.error('Failed to load jeopardy game:', error);
    jeopardySection.innerHTML = `
      <div class="bg-error-50 border-l-4 border-error-500 p-6 rounded-r-xl">
        <p class="text-error-700">Kunne ikke laste Jeopardy-spillet. Prøv å laste siden på nytt.</p>
      </div>
    `;
  }
}

/**
 * Loads bingo game content
 */
async function loadBingoGame(container, bingoGameData, chapterId) {
  // Create bingo container
  const bingoSection = document.createElement('div');
  bingoSection.className = 'mb-8';
  bingoSection.id = 'bingo-game-container';
  container.appendChild(bingoSection);

  // Dynamically import and setup bingo
  try {
    const { setupBingo } = await import('./bingo.js');
    setupBingo('bingo-game-container', bingoGameData);
    debug(`✅ Loaded bingo game for ${chapterId}`);
  } catch (error) {
    console.error('Failed to load bingo game:', error);
    bingoSection.innerHTML = `
      <div class="bg-error-50 border-l-4 border-error-500 p-6 rounded-r-xl">
        <p class="text-error-700">Kunne ikke laste bingo-spillet. Prøv å laste siden på nytt.</p>
      </div>
    `;
  }
}

/**
 * Loads dialog slides content
 */
function loadDialogSlides(container, data, chapterId) {
  // Generate header
  const header = generateHeader();
  container.appendChild(header);

  // Generate slide counter
  const counter = generateSlideCounter(data.slides.length);
  container.appendChild(counter);

  // Generate slides
  data.slides.forEach((slide, index) => {
    const slideElement = generateSlide(slide, index);
    container.appendChild(slideElement);
  });

  // Generate navigation buttons
  const navigation = generateNavigation();
  container.appendChild(navigation);

  // Generate separator and footer
  const footer = generateFooter();
  container.appendChild(footer);

  // Initialize slide navigation
  totalSlides = data.slides.length;
  currentSlideIndex = 0;
  showSlide(0);
  setupKeyboardNavigation();

  debug(`✅ Loaded classroom dialog for ${chapterId} (${totalSlides} slides)`);
}

/**
 * Generates the classroom context header
 */
function generateHeader() {
  const isInternational = document.body?.dataset?.uiLanguage === 'en';
  const header = document.createElement('div');
  header.className = 'bg-primary-50 border-l-4 border-primary-500 p-6 rounded-r-xl mb-8 text-center';
  header.innerHTML = `
    <div class="flex items-center justify-center gap-3 mb-3">
      <span class="text-3xl">🖥️</span>
      <h1 class="text-2xl font-bold text-primary-800">${isInternational ? 'Classroom Dialog' : 'Klasseromsdialog'}</h1>
      <span class="text-3xl">📚</span>
    </div>
    <p class="text-primary-700 font-medium">${isInternational ? 'Designed for use on projector or smartboard in the classroom' : 'Designet for bruk på projektor eller smartboard i klasserommet'}</p>
    <p class="text-neutral-600 mt-2">${isInternational ? 'Navigate between dialogs with the arrow buttons or use arrow keys on your keyboard' : 'Naviger mellom dialogene med pilknappene eller bruk piltaster på tastaturet'}</p>
  `;
  return header;
}

/**
 * Generates the slide counter
 */
function generateSlideCounter(total) {
  const counter = document.createElement('div');
  counter.className = 'fixed top-4 right-4 z-20 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full font-semibold shadow-lg';
  counter.innerHTML = `
    <span id="current-slide">1</span> / <span id="total-slides">${total}</span>
  `;
  return counter;
}

/**
 * Generates a single slide
 */
function generateSlide(slide, index) {
  const slideDiv = document.createElement('div');
  slideDiv.className = 'dialog-slide bg-surface p-8 rounded-xl shadow-sm space-y-8';
  if (index === 0) {
    slideDiv.classList.add('active');
  } else {
    slideDiv.style.display = 'none';
  }

  // Title
  const title = document.createElement('h2');
  title.className = 'text-3xl font-bold text-primary-700 border-b-4 border-primary-700 pb-4';
  title.textContent = slide.title;
  slideDiv.appendChild(title);

  // Dialog box
  const dialogBox = generateDialogBox(slide.dialog);
  slideDiv.appendChild(dialogBox);

  // Keywords and phrases grid
  const grid = generateKeywordsPhrasesGrid(slide);
  slideDiv.appendChild(grid);

  return slideDiv;
}

/**
 * Generates the dialog box with example conversation
 */
function generateDialogBox(dialog) {
  const box = document.createElement('div');
  box.className = 'bg-success-50 border-l-4 border-success-500 p-6 rounded-r-lg';

  const isInternational = document.body?.dataset?.uiLanguage === 'en';

  const heading = document.createElement('h3');
  heading.className = 'font-bold text-lg mb-3';
  heading.textContent = isInternational ? 'Example dialog:' : 'Eksempel-dialog:';
  box.appendChild(heading);

  const dialogContent = document.createElement('div');
  dialogContent.className = 'space-y-2 text-neutral-800 leading-relaxed';

  dialog.forEach(line => {
    const p = document.createElement('p');
    p.innerHTML = `<strong>${line.speaker}:</strong> ${line.text}`;
    dialogContent.appendChild(p);
  });

  box.appendChild(dialogContent);
  return box;
}

/**
 * Generates the keywords and phrases grid
 */
function generateKeywordsPhrasesGrid(slide) {
  const grid = document.createElement('div');
  grid.className = 'grid md:grid-cols-2 gap-8 mt-8';

  // Check if this is an international page (uses english field instead of norwegian)
  const isInternational = document.body?.dataset?.uiLanguage === 'en';

  // Keywords column
  const keywordsCol = document.createElement('div');
  keywordsCol.className = 'bg-info-50 border-l-4 border-info-500 p-6 rounded-r-lg';

  const keywordsHeading = document.createElement('h3');
  keywordsHeading.className = 'font-bold text-lg mb-4 flex items-center';
  keywordsHeading.textContent = slide.keywordsTitle;
  keywordsCol.appendChild(keywordsHeading);

  const keywordsList = document.createElement('ul');
  keywordsList.className = 'space-y-3';
  slide.keywords.forEach(kw => {
    const li = document.createElement('li');
    const translation = isInternational ? kw.english : kw.norwegian;
    li.innerHTML = `<span class="bg-primary-200 px-3 py-1 rounded-full font-semibold">${kw.german}</span> - ${translation}`;
    keywordsList.appendChild(li);
  });
  keywordsCol.appendChild(keywordsList);

  // Phrases column
  const phrasesCol = document.createElement('div');
  phrasesCol.className = 'bg-pink-50 border-l-4 border-pink-500 p-6 rounded-r-lg';

  const phrasesHeading = document.createElement('h3');
  phrasesHeading.className = 'font-bold text-lg mb-4 flex items-center';
  phrasesHeading.textContent = slide.phrasesTitle;
  phrasesCol.appendChild(phrasesHeading);

  const phrasesList = document.createElement('ul');
  phrasesList.className = 'space-y-3';
  slide.phrases.forEach(phrase => {
    const li = document.createElement('li');
    const translation = isInternational ? phrase.english : phrase.norwegian;
    li.innerHTML = `<strong>${phrase.german}</strong> - ${translation}`;
    phrasesList.appendChild(li);
  });
  phrasesCol.appendChild(phrasesList);

  grid.appendChild(keywordsCol);
  grid.appendChild(phrasesCol);

  return grid;
}

/**
 * Generates navigation buttons
 */
function generateNavigation() {
  const isInternational = document.body?.dataset?.uiLanguage === 'en';
  const nav = document.createElement('div');
  nav.className = 'mt-8 mb-6 flex justify-center gap-4';
  nav.innerHTML = `
    <button class="bg-neutral-600 text-white px-8 py-4 rounded-full font-bold hover:bg-neutral-700 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-all duration-300 text-lg shadow-lg" id="prevBtn">
      ← ${isInternational ? 'Previous dialog' : 'Forrige dialog'}
    </button>
    <button class="bg-neutral-600 text-white px-8 py-4 rounded-full font-bold hover:bg-neutral-700 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-all duration-300 text-lg shadow-lg" id="nextBtn">
      ${isInternational ? 'Next dialog' : 'Neste dialog'} →
    </button>
  `;

  // Add event listeners
  const prevBtn = nav.querySelector('#prevBtn');
  const nextBtn = nav.querySelector('#nextBtn');

  prevBtn.addEventListener('click', previousSlide);
  nextBtn.addEventListener('click', nextSlide);

  return nav;
}

/**
 * Generates footer
 */
function generateFooter() {
  const isInternational = document.body?.dataset?.uiLanguage === 'en';
  const container = document.createElement('div');

  const separator = document.createElement('hr');
  separator.className = 'border-neutral-300 my-8';
  container.appendChild(separator);

  const footer = document.createElement('div');
  footer.className = 'mt-12 p-6 bg-neutral-100/60 rounded-lg text-center';
  footer.innerHTML = `
    <div class="text-neutral-600 mb-3 font-medium">${isInternational ? 'You have now completed the entire lesson!' : 'Du har nå fullført hele leksjonen!'}</div>
    <p class="text-neutral-500 text-sm">${isInternational ? 'Use the menu above to navigate to other parts of the lesson or go to the next lesson.' : 'Bruk menyen øverst for å navigere til andre deler av leksjonen eller gå til neste leksjon.'}</p>
  `;
  container.appendChild(footer);

  return container;
}

/**
 * Shows a specific slide
 */
function showSlide(n) {
  const slides = document.querySelectorAll('.dialog-slide');
  if (slides.length === 0) return;

  slides.forEach((slide, index) => {
    if (index === n) {
      slide.style.display = 'block';
      slide.classList.add('active');
    } else {
      slide.style.display = 'none';
      slide.classList.remove('active');
    }
  });

  // Update counter
  const currentSlideEl = document.getElementById('current-slide');
  if (currentSlideEl) {
    currentSlideEl.textContent = n + 1;
  }

  // Update button states
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  if (prevBtn) prevBtn.disabled = (n === 0);
  if (nextBtn) nextBtn.disabled = (n === totalSlides - 1);
}

/**
 * Go to next slide
 */
function nextSlide() {
  if (currentSlideIndex < totalSlides - 1) {
    currentSlideIndex++;
    showSlide(currentSlideIndex);
  }
}

/**
 * Go to previous slide
 */
function previousSlide() {
  if (currentSlideIndex > 0) {
    currentSlideIndex--;
    showSlide(currentSlideIndex);
  }
}

/**
 * Setup keyboard navigation
 */
function setupKeyboardNavigation() {
  // Remove any existing keyboard listeners to avoid duplicates
  document.removeEventListener('keydown', handleKeyboardNav);
  document.addEventListener('keydown', handleKeyboardNav);
}

/**
 * Handle keyboard navigation
 */
function handleKeyboardNav(event) {
  // Only handle keyboard navigation when dialog tab is active
  const dialogTab = document.getElementById('dialog');
  if (dialogTab && !dialogTab.classList.contains('hidden')) {
    if (event.key === 'ArrowRight' || event.key === ' ') {
      event.preventDefault();
      nextSlide();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      previousSlide();
    }
  }
}
