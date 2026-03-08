/**
 * Loader for dynamisk innlasting av øvelsesinnhold
 *
 * Denne filen laster oppgaver og ekstraoppgaver
 * fra chapter-specific data files basert på data-chapter-id.
 *
 * Uses dynamic imports for performance - only loads the chapter you need!
 *
 * Støttede øvelsestyper:
 * - fill-in: Fyll inn blanke felt
 * - matching: Kombiner par (tekst eller ikoner)
 * - true-false: Sant/usant påstander
 * - dilemma: Velg mellom 2+ alternativer fra dropdown
 * - writing: Fritekst skriveoppgave
 * - quiz: Flervalgsoppgaver
 * - drag-drop: Dra og slipp setninger
 * - minidialoge: Scenario-baserte rollespill
 */

import {
  setupFillInTask,
  setupMatchingGame,
  setupImageMatchingGame,
  setupTrueFalseGame,
  setupDilemmaTask,
  setupWritingTask,
  setupDragDropSentenceTask,
  initializeQuiz,
  initializeModularQuiz,
  setupMinidialoge
} from './exercises.js';
import { setupEmbeddedVerbTrainer } from './exercises/embedded-verb-trainer-v2.js';
import { setupEmbeddedGenderTrainer } from './exercises/embedded-gender-trainer.js';
import { setupCategorizeTask } from './exercises/categorize.js';
import { debug } from './logger.js';
import { setupWordLookups, setupGrammarTermLookups } from './ui.js';
import { getCurriculumConfig } from './progress/curriculum-registry.js';
import { getActiveCurriculum } from './progress/store.js';

/**
 * Initialiserer og laster alle øvelser for en leksjon
 * Uses dynamic imports to load only the needed chapter data
 * @param {object} externalConfig - Optional config to use (overrides getActiveCurriculum)
 */
export async function loadExercisesContent(externalConfig) {
  debug('🔧 loadExercisesContent() CALLED');

  const chapterId = document.body.dataset.chapterId; // e.g. "2-1"
  debug('📝 Chapter ID from body:', chapterId);

  if (!chapterId) {
    console.warn('⚠️ Ingen chapter-id funnet på body element');
    return;
  }

  // Extract chapter number from chapterId (e.g. "2-1" -> "2")
  const chapterNum = chapterId.split('-')[0];

  try {
    const curriculumId = externalConfig?.id || getActiveCurriculum();
    const config = externalConfig || getCurriculumConfig(curriculumId);

    // Check if this is an international page
    const isInternational = document.body?.dataset?.uiLanguage === 'en';

    // Determine content path based on page type
    let contentPath;
    if (isInternational) {
      contentPath = '../../content/german-international';
    } else {
      contentPath = config.contentPath || (config.languageConfig?.code === 'es' ? '../../content/spanish' : '../../content/german');
    }

    // Fix path depth mismatch: Registry is in js/progress/ (needs ../../),
    // but this loader is in js/ (needs ../)
    if (contentPath.startsWith('../../')) {
      contentPath = contentPath.substring(3); // Remove first '../' to make it relative to js/ folder
    }

    // Determine folder name - international pages use 'international-a1'
    const exerciseFolderName = isInternational ? 'international-a1' : config.folderName;

    // 🚀 Dynamic import with folder support
    let module;
    try {
      // 1. Try curriculum-specific folder (e.g. exercises-data/us-8/chapter-1.js)
      // contentPath is usually ../content/german relative to this file
      module = await import(`${contentPath}/exercises-data/${exerciseFolderName}/chapter-${chapterNum}.js`);
      debug(`✅ Loaded exercises from specific folder: ${exerciseFolderName}/chapter-${chapterNum}.js`);
    } catch (e) {
      // 2. Fallback to shared root folder (legacy/VG1)
      const mappedChapterNum = config.chapterMapping ? (config.chapterMapping[chapterNum] || chapterNum) : chapterNum;
      debug(`ℹ️ Fallback: Loading shared chapter-${mappedChapterNum}.js (Specific folder load failed: ${e.message})`);
      module = await import(`${contentPath}/exercises-data/chapter-${mappedChapterNum}.js`);
    }

    // If we mapped the chapter number, we likely need to map the ID key as well
    // e.g. "1-1" -> "9-1"
    let lookupId = chapterId;
    if (config.chapterMapping && config.chapterMapping[chapterNum]) {
      const parts = chapterId.split('-');
      if (parts[0] === chapterNum) {
        lookupId = `${mappedChapterNum}-${parts[1]}`;
      }
    }

    const data = module.exercisesData[lookupId];

    if (!data) {
      debug(`ℹ️ Ingen øvelsesdata funnet for leksjon ${chapterId} - bruker inline HTML`);
      return;
    }

    debug('✓ Øvelsesdata found for', chapterId);

    // Last vanlige øvelser
    if (data.exercises && data.exercises.length > 0) {
      loadExercises(data.exercises);
    }

    // Last ekstraøvelser - call even if empty to show "Coming Soon" message if needed
    if (document.getElementById('extra-exercises-content')) {
      loadExtraExercises(data.extraExercises || []);
    }

    debug(`✅ Øvelsesinnhold lastet for ${chapterId}`);

    // Re-initialize tooltips for dynamically loaded content
    setupWordLookups();
    setupGrammarTermLookups();
  } catch (error) {
    // Chapter file not found - that's okay, lesson uses inline HTML
    debug(`ℹ️ Chapter ${chapterNum} file not found - using inline HTML`, error.message);
  }
}

/**
 * Laster vanlige øvelser
 */
function loadExercises(exercises) {
  debug('  📖 Loading exercises...', exercises);
  const container = document.getElementById('exercises');

  if (!container) {
    console.error('  ❌ Element #exercises not found in DOM!');
    return;
  }

  debug('  ✓ Found #exercises container');

  // Finn sjekkliste-elementet (mer kompatibel måte)
  const checklist = document.getElementById('checklist');
  const sjekkliste = checklist ? checklist.closest('.bg-surface') : null;

  debug(`  📝 Rendering ${exercises.length} exercises...`);

  // Generer HTML for hver øvelse
  exercises.forEach((exercise, index) => {
    debug(`  Rendering exercise ${index + 1}/${exercises.length}:`, exercise.id);
    const html = generateExerciseHTML(exercise);

    if (sjekkliste) {
      sjekkliste.insertAdjacentHTML('beforebegin', html);
    } else {
      container.insertAdjacentHTML('beforeend', html);
    }
  });

  debug('  🔧 Initializing exercises...');

  // Initialiser øvelser
  exercises.forEach((exercise, index) => {
    debug(`  Initializing exercise ${index + 1}:`, exercise.id, 'Type:', exercise.type);
    try {
      initializeExercise(exercise);
      debug(`  ✓ Initialized ${exercise.id}`);
    } catch (error) {
      console.error(`  ❌ Error initializing ${exercise.id}:`, error);
    }
  });

  debug(`  ✅ Loaded ${exercises.length} exercises`);
}

/**
 * Laster ekstraøvelser
 */
function loadExtraExercises(extraExercises) {
  debug('  📖 Loading extra exercises...');
  const container = document.getElementById('extra-exercises-content');

  if (!container) {
    console.error('  ❌ Element #extra-exercises-content not found in DOM!');
    return;
  }

  // Check if we have exercises to load
  if (!extraExercises || extraExercises.length === 0) {
    debug('  ℹ️ No extra exercises found - showing "Coming Soon" message');
    container.innerHTML = `
      <div class="bg-primary-50 border-l-4 border-primary-500 p-6 rounded-r-lg text-center my-8">
        <div class="text-4xl mb-4">🚀</div>
        <h3 class="text-xl font-bold text-primary-800 mb-2">Du er foran skjema!</h3>
        <p class="text-neutral-700 mb-4">
          Wow, du jobber raskt! Disse ekstraøvelsene er ikke helt klare ennå.
        </p>
        <p class="text-neutral-600 text-sm">
          Kom tilbake senere for å teste kunnskapene dine ytterligere.
        </p>
      </div>
    `;
    return;
  }

  debug(`  📝 Rendering ${extraExercises.length} extra exercises...`);

  // Generer HTML for hver ekstraøvelse
  extraExercises.forEach(exercise => {
    const html = generateExerciseHTML(exercise);
    container.insertAdjacentHTML('beforeend', html);
  });

  // Initialiser ekstraøvelser
  extraExercises.forEach(exercise => {
    try {
      initializeExercise(exercise);
    } catch (error) {
      console.error(`  ❌ Error initializing ${exercise.id}:`, error);
    }
  });

  debug(`  ✅ Loaded ${extraExercises.length} extra exercises`);
}

/**
 * Validerer at øvelsesdata har påkrevde felter
 * @param {Object} exercise - Øvelsesdata
 * @returns {boolean} - True hvis valid, false hvis ikke
 */
function validateExercise(exercise) {
  // Påkrevde felter for hver øvelsestype
  const requiredFields = {
    'fill-in': ['id', 'type', 'title', 'items'],
    'matching': ['id', 'type', 'title', 'pairs'],
    'image-matching': ['id', 'type', 'title', 'pairs'],
    'true-false': ['id', 'type', 'title', 'statements'],
    'dilemma': ['id', 'type', 'title', 'items'],
    'writing': ['id', 'type', 'title'],
    'quiz': ['id', 'type', 'title', 'questions'],
    'drag-drop': ['id', 'type', 'title', 'sentences'],
    'minidialoge': ['id', 'type', 'title', 'scenarios'],
    'embedded-verb-trainer': ['id', 'type', 'title', 'config'],
    'embedded-gender-trainer': ['id', 'type', 'title', 'config'],
    'chronology': ['id', 'type', 'title', 'items'],
    'categorize': ['id', 'type', 'title', 'categories'],
    'interactive-flashcards': ['id', 'type', 'title', 'cards'],
    'true-false-pictures': ['id', 'type', 'title', 'statements'],
    'interactive-map': ['id', 'type', 'title'],
    'number-grids': ['id', 'type', 'title'],
    'color-picker': ['id', 'type', 'title'],
    'checklist': ['id', 'type', 'title']
  };

  // Sjekk at type er kjent
  if (!exercise.type) {
    console.error(`❌ Validering feilet: Øvelse mangler 'type' felt`, exercise);
    return false;
  }

  const required = requiredFields[exercise.type];
  if (!required) {
    console.error(`❌ Validering feilet: Ukjent øvelsestype "${exercise.type}"`, exercise);
    return false;
  }

  // Sjekk at alle påkrevde felter finnes
  for (const field of required) {
    if (!exercise[field]) {
      console.error(`❌ Validering feilet: Øvelse "${exercise.id || 'unknown'}" mangler påkrevd felt "${field}"`, exercise);
      return false;
    }
  }

  // Type-spesifikk validering
  if (exercise.type === 'fill-in' && !Array.isArray(exercise.items)) {
    console.error(`❌ Validering feilet: "items" må være en array i øvelse "${exercise.id}"`, exercise);
    return false;
  }

  if (exercise.type === 'matching' && !Array.isArray(exercise.pairs)) {
    console.error(`❌ Validering feilet: "pairs" må være en array i øvelse "${exercise.id}"`, exercise);
    return false;
  }

  if (exercise.type === 'image-matching' && !Array.isArray(exercise.pairs)) {
    console.error(`❌ Validering feilet: "pairs" må være en array i øvelse "${exercise.id}"`, exercise);
    return false;
  }

  if (exercise.type === 'true-false' && !Array.isArray(exercise.statements)) {
    console.error(`❌ Validering feilet: "statements" må være en array i øvelse "${exercise.id}"`, exercise);
    return false;
  }

  if (exercise.type === 'dilemma' && !Array.isArray(exercise.items)) {
    console.error(`❌ Validering feilet: "items" må være en array i øvelse "${exercise.id}"`, exercise);
    return false;
  }

  if (exercise.type === 'quiz' && !Array.isArray(exercise.questions)) {
    console.error(`❌ Validering feilet: "questions" må være en array i øvelse "${exercise.id}"`, exercise);
    return false;
  }

  if (exercise.type === 'drag-drop' && !Array.isArray(exercise.sentences)) {
    console.error(`❌ Validering feilet: "sentences" må være en array i øvelse "${exercise.id}"`, exercise);
    return false;
  }

  if (exercise.type === 'minidialoge' && typeof exercise.scenarios !== 'object') {
    console.error(`❌ Validering feilet: "scenarios" må være et objekt i øvelse "${exercise.id}"`, exercise);
    return false;
  }

  if (exercise.type === 'categorize' && !Array.isArray(exercise.categories)) {
    console.error(`❌ Validering feilet: "categories" må være en array i øvelse "${exercise.id}"`, exercise);
    return false;
  }

  return true;
}

/**
 * Genererer HTML for en øvelse
 */
function generateExerciseHTML(exercise) {
  // Valider øvelsesdata før generering
  if (!validateExercise(exercise)) {
    return `
      <div class="bg-error-100 p-6 rounded-xl shadow-sm border-2 border-error-300">
        <h3 class="text-error-800 font-bold mb-2">⚠️ Feil i øvelsesdata</h3>
        <p class="text-error-700">Øvelse "${exercise.id || 'unknown'}" har manglende eller ugyldig data.</p>
        <p class="text-error-600 text-sm mt-2">Se konsollen for detaljer.</p>
      </div>
    `;
  }
  const header = generateHeader(exercise.title, exercise.badges);
  const description = exercise.description ? `<p class="text-neutral-600 mb-4">${exercise.description}</p>` : '';
  const body = generateBody(exercise);

  const taskClass = getTaskClass(exercise.type);

  return `
    <div class="bg-surface p-6 rounded-xl shadow-sm ${taskClass}" id="${exercise.id}" data-dynamic="true" ${getExtraAttributes(exercise)}>
      ${header}
      ${description}
      ${body}
    </div>
  `;
}

/**
 * Genererer header med tittel og badges
 */
function generateHeader(title, badges) {
  if (!badges || badges.length === 0) {
    return `<h3 class="text-xl font-bold mb-4">${title}</h3>`;
  }

  const badgeHTML = badges.map(badge => {
    const colorMap = {
      'strengthening': 'bg-success-100 text-success-800',
      'repetition': 'bg-info-100 text-info-800',
      'lesson': 'bg-slate-100 text-slate-600',
      'new': 'bg-primary-100 text-primary-600'
    };
    const colorClass = colorMap[badge.type] || 'bg-neutral-100 text-neutral-600';
    return `<span class="${colorClass} px-3 py-1 rounded-full text-sm font-medium">${badge.text}</span>`;
  }).join('');

  return `
    <div class="flex items-center gap-4 mb-4">
      <h3 class="text-xl font-bold">${title}</h3>
      <div class="flex gap-2">${badgeHTML}</div>
    </div>
  `;
}

/**
 * Genererer body basert på øvelsestype
 */
function generateBody(exercise) {
  switch (exercise.type) {
    case 'fill-in':
      return generateFillInBody(exercise);
    case 'matching':
      return generateMatchingBody(exercise);
    case 'image-matching':
      return generateImageMatchingBody(exercise);
    case 'true-false':
      return generateTrueFalseBody(exercise);
    case 'dilemma':
      return generateDilemmaBody(exercise);
    case 'writing':
      return generateWritingBody(exercise);
    case 'quiz':
      return generateQuizBody(exercise);
    case 'drag-drop':
      return generateDragDropBody(exercise);
    case 'minidialoge':
      return generateMinidialogeBody(exercise);
    case 'embedded-verb-trainer':
      return generateEmbeddedVerbTrainerBody(exercise);
    case 'embedded-gender-trainer':
      return generateEmbeddedGenderTrainerBody(exercise);
    case 'chronology':
      return generateChronologyBody(exercise);
    case 'categorize':
      return generateCategorizeBody(exercise);
    case 'interactive-flashcards':
      return generateInteractiveFlashcardsBody(exercise);
    default:
      console.error(`Unknown exercise type: ${exercise.type}`);
      return '<p class="text-error-600">Ukjent øvelsestype</p>';
  }
}

/**
 * Genererer fill-in øvelse
 * Støtter både legacy HTML i pre/post og strukturert section/postGrammar format
 */
function generateFillInBody(exercise) {
  let itemsHTML = '';

  // Check if exercise uses sections format (for verb conjugation exercises)
  if (exercise.sections && exercise.sections.length > 0) {
    // Process sectioned format
    itemsHTML = exercise.sections.map(section => {
      const sectionItemsHTML = section.items.map(item => {
        const width = item.width || 'w-32';

        // Generate post-HTML (supports both structured and legacy format)
        let postHTML = item.post || '';
        if (item.postGrammar) {
          postHTML = `<span class="word-lookup" data-type="${item.postGrammar.type}">${item.postGrammar.word}</span>`;
          if (item.postGrammar.suffix) {
            postHTML += `<span>${item.postGrammar.suffix}</span>`;
          }
        }

        // Check if pre/post contain HTML tags (legacy format) - if so, don't wrap in span
        const preHTML = item.pre
          ? (item.pre.trim().startsWith('<') ? item.pre : `<span>${item.pre}</span>`)
          : '';
        const postHTMLWrapped = postHTML
          ? (postHTML.trim().startsWith('<') ? postHTML : `<span>${postHTML}</span>`)
          : '';

        return `
          <div class="flex items-center gap-2 flex-wrap">
            ${preHTML}
            <input class="p-2 border-2 border-neutral-300 rounded-md ${width}"
                   data-answer="${item.answer}"
                   ${item.answerFlexible ? `data-answer-flexible="${item.answerFlexible}"` : ''}
                   type="text"
                   autocomplete="off"
                   autocorrect="off"
                   autocapitalize="off"
                   spellcheck="false" />
            ${postHTMLWrapped}
            <span class="feedback-icon"></span>
          </div>
        `;
      }).join('');

      // Render section with heading and verb info (underlined for grammar table access)
      const verbHTML = section.verb
        ? `<span class="grammar-info underline cursor-pointer" data-type="${section.verb.type}">${section.verb.german}</span> (${section.verb.norwegian})`
        : '';

      return `
        <div class="mb-6">
          <h4 class="text-lg font-semibold mb-3 border-b pb-2">
            ${section.heading}${verbHTML ? `: ${verbHTML}` : ''}
          </h4>
          <div class="space-y-3">
            ${sectionItemsHTML}
          </div>
        </div>
      `;
    }).join('');
  } else {
    // Process simple format (flat items array)
    // Group items: items with empty "pre" field belong to the same line as the previous item
    let currentSection = null;
    const groupedItems = [];
    let currentGroup = [];

    exercise.items.forEach((item, index) => {
      // Check if this item starts a new line (has non-empty pre) or continues previous line (empty pre)
      if (item.pre === '' && currentGroup.length > 0) {
        // Empty pre means this item belongs to the same line as previous
        currentGroup.push(item);
      } else {
        // Non-empty pre means start a new line
        if (currentGroup.length > 0) {
          groupedItems.push(currentGroup);
        }
        currentGroup = [item];
      }

      // Push the last group
      if (index === exercise.items.length - 1 && currentGroup.length > 0) {
        groupedItems.push(currentGroup);
      }
    });

    itemsHTML = groupedItems.map(group => {
      let html = '';

      // Render section header if first item in group has section field
      if (group[0].section && group[0].section !== currentSection) {
        currentSection = group[0].section;
        html += `<h4 class="text-lg font-semibold mt-4 mb-2 border-b pb-1">${group[0].section}</h4>`;
      }

      // Generate HTML for all items in this group (same line)
      const groupInputsHTML = group.map(item => {
        const width = item.width || 'w-32';

        // Generer post-HTML (støtter både strukturert og legacy format)
        let postHTML = item.post || '';
        if (item.postGrammar) {
          // Strukturert format med grammar-info
          postHTML = `<span class="word-lookup" data-type="${item.postGrammar.type}">${item.postGrammar.word}</span>`;
          if (item.postGrammar.suffix) {
            postHTML += `<span>${item.postGrammar.suffix}</span>`;
          }
        }

        // Check if pre/post contain HTML tags (legacy format) - if so, don't wrap in span
        const preHTML = item.pre
          ? (item.pre.trim().startsWith('<') ? item.pre : `<span>${item.pre}</span>`)
          : '';
        const postHTMLWrapped = postHTML
          ? (postHTML.trim().startsWith('<') ? postHTML : `<span>${postHTML}</span>`)
          : '';

        return `
          ${preHTML}
          <input class="p-2 border-2 border-neutral-300 rounded-md ${width}"
                 data-answer="${item.answer}"
                 ${item.answerFlexible ? `data-answer-flexible="${item.answerFlexible}"` : ''}
                 type="text"
                 autocomplete="off"
                 autocorrect="off"
                 autocapitalize="off"
                 spellcheck="false" />
          ${postHTMLWrapped}
        `;
      }).join('');

      html += `
        <div class="flex items-center gap-2 flex-wrap">
          ${groupInputsHTML}
          <span class="feedback-icon"></span>
        </div>
      `;
      return html;
    }).join('');
  }

  return `
    <div class="space-y-4">
      ${itemsHTML}
    </div>
    <div class="special-chars-placeholder mt-4 flex items-center gap-2"></div>
    <div class="mt-6 flex gap-4">
      <button class="check bg-primary-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-600 transition-colors">Sjekk svar</button>
      <button class="reset bg-neutral-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-neutral-600 transition-colors">Start på nytt</button>
    </div>
  `;
}

/**
 * Genererer matching øvelse
 */
function generateMatchingBody(exercise) {
  // Data vil bli satt til window[variableName] av initializeExercise
  return `
    <div class="grid grid-cols-2 gap-2 sm:gap-4 md:gap-6">
      <div class="questions space-y-2 sm:space-y-3"></div>
      <div class="answers space-y-2 sm:space-y-3"></div>
    </div>
    <p class="feedback-message"></p>
    <div class="mt-4 text-center">
      <button class="reset bg-neutral-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-neutral-600 transition-colors">Start på nytt</button>
    </div>
  `;
}

/**
 * Genererer image-matching øvelse
 */
function generateImageMatchingBody(exercise) {
  // Data settes via setupImageMatchingGame
  return `
    <!-- Images (left side) -->
    <div class="grid grid-cols-3 gap-4 mb-6 images"></div>

    <!-- Answers (right side) -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 answers"></div>

    <!-- Feedback message -->
    <div class="feedback-message"></div>

    <!-- Reset button -->
    <div class="mt-4 text-center">
      <button class="reset bg-neutral-200 hover:bg-neutral-300 font-semibold py-2 px-4 rounded-lg transition-colors">
        Start på nytt
      </button>
    </div>
  `;
}

/**
 * Genererer true-false øvelse
 */
function generateTrueFalseBody(exercise) {
  // Data vil bli sett til window[variableName] av initializeExercise
  return `
    <div class="statements-container space-y-3"></div>
    <p class="feedback-message"></p>
    <div class="mt-6 text-center">
      <button class="reset bg-neutral-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-neutral-600 transition-colors">Start på nytt</button>
    </div>
  `;
}

/**
 * Genererer dilemma øvelse (dropdown-basert valg)
 */
function generateDilemmaBody(exercise) {
  const itemsHTML = exercise.items.map((item, index) => {
    return `
      <div class="dilemma-item"
           data-pre="${item.pre || ''}"
           data-options='${JSON.stringify(item.options)}'
           data-correct="${item.correct}"
           data-post="${item.post || ''}">
      </div>
    `;
  }).join('');

  return `
    <div class="space-y-3">
      ${itemsHTML}
    </div>
    <p class="feedback-message"></p>
    <div class="mt-6 flex gap-4">
      <button class="check bg-primary-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-600 transition-colors">Sjekk svar</button>
      <button class="reset bg-neutral-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-neutral-600 transition-colors">Start på nytt</button>
    </div>
  `;
}

/**
 * Genererer writing øvelse
 */
function generateWritingBody(exercise) {
  const templateHTML = exercise.template ? `
    <div class="bg-neutral-100 p-4 rounded-lg italic">
      ${exercise.template.map(line => `<p>${line}</p>`).join('')}
    </div>
  ` : '';

  return `
    ${templateHTML}
    <textarea class="w-full p-2 border-2 border-neutral-300 rounded-md h-32"
              placeholder="${exercise.placeholder || 'Skriv her...'}"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck="false"></textarea>
    <div class="special-chars-placeholder mt-4 flex items-center gap-2"></div>
    <div class="mt-6">
      <button class="reset bg-neutral-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-neutral-600 transition-colors">Start på nytt</button>
    </div>
  `;
}

/**
 * Genererer quiz øvelse
 */
function generateQuizBody(exercise) {
  // Quiz-container vil bli populert av initializeQuiz
  return `
    <div class="quiz-wrapper" id="${exercise.id}-quiz">
      <div class="quiz-container"></div>
    </div>
  `;
}

/**
 * Genererer drag-drop øvelse
 */
function generateDragDropBody(exercise) {
  return `
    <div class="drag-drop-container">
      <!-- Vil bli populert av setupDragDropSentenceTask -->
    </div>
    <p class="feedback-message"></p>
    <div class="mt-6 text-center">
      <button class="reset bg-neutral-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-neutral-600 transition-colors">Start på nytt</button>
    </div>
  `;
}

/**
 * Genererer minidialoge øvelse
 */
function generateMinidialogeBody(exercise) {
  return `
    <!-- Scenario selection buttons -->
    <div class="scenario-buttons grid grid-cols-1 sm:grid-cols-2 gap-4">
      <!-- Vil bli populert av setupMinidialoge -->
    </div>

    <!-- Dialog area (hidden initially) -->
    <div class="dialog-area hidden">
      <h4 class="scenario-title text-lg font-bold mb-4"></h4>

      <!-- Fixed height container for dialog with proper spacing -->
      <div class="dialog-container bg-neutral-50 rounded-lg p-4 mb-6" style="min-height: 400px; max-height: 500px; display: flex; flex-direction: column;">
        <div class="dialog-content flex-1 overflow-y-auto space-y-3 pr-2 pb-6" style="scroll-behavior: smooth;">
          <!-- Dialog bubbles will appear here -->
        </div>
      </div>

      <div class="dialog-controls flex flex-wrap gap-2 justify-center mb-4">
        <button class="prev-step bg-neutral-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-neutral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Forrige</button>
        <button class="next-step bg-primary-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Neste</button>
        <button class="restart-dialog bg-info-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-info-600 transition-colors">Start på nytt</button>
      </div>
      <div class="text-center">
        <button class="back-to-scenarios bg-neutral-400 text-white font-bold py-2 px-4 rounded-lg hover:bg-neutral-500 transition-colors">Tilbake til scenarioer</button>
      </div>
    </div>

    <div class="mt-6 text-center">
      <button class="reset bg-neutral-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-neutral-600 transition-colors">Start på nytt</button>
    </div>
  `;
}

/**
 * Genererer embedded verb trainer body
 */
function generateEmbeddedVerbTrainerBody(exercise) {
  return `
    <!-- Container will be populated by setupEmbeddedVerbTrainer -->
    <div class="verb-trainer-container"></div>
  `;
}

/**
 * Genererer embedded gender trainer body
 */
function generateEmbeddedGenderTrainerBody(exercise) {
  return `
    <!-- Container will be populated by setupEmbeddedGenderTrainer -->
    <div class="gender-trainer-container"></div>
  `;
}

/**
 * Genererer chronology øvelse
 */
function generateChronologyBody(exercise) {
  return `
    <div class="grid md:grid-cols-2 gap-8">
      <!-- Pool (Left/Top) -->
      <div class="chronology-pool space-y-3">
        <!-- Buttons will be generated here -->
      </div>

      <!-- Timeline (Right/Bottom) -->
      <div class="chronology-timeline space-y-3">
        <!-- Slots will be generated here -->
      </div>
    </div>

    <p class="feedback-message"></p>
    
    <div class="mt-6 text-center">
      <button class="reset-btn bg-neutral-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-neutral-600 transition-colors">
        Start på nytt
      </button>
    </div>
  `;
}

/**
 * Genererer categorize øvelse
 */
function generateCategorizeBody(exercise) {
  return `
    <!-- Category buckets -->
    <div class="categorize-buckets grid grid-cols-2 sm:grid-cols-${Math.min(exercise.categories.length, 4)} gap-4 mb-6">
      <!-- Populated by setupCategorizeTask -->
    </div>

    <!-- Item pool -->
    <div class="categorize-pool flex flex-wrap gap-3 justify-center p-4 bg-neutral-50 rounded-lg min-h-[60px]">
      <!-- Populated by setupCategorizeTask -->
    </div>

    <p class="feedback-message"></p>

    <div class="mt-6 text-center">
      <button class="reset bg-neutral-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-neutral-600 transition-colors">Start på nytt</button>
    </div>
  `;
}

/**
 * Genererer interactive-flashcards øvelse (exercise-based, not vocab tab)
 */
function generateInteractiveFlashcardsBody(exercise) {
  return `
    <div class="flashcards-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <!-- Populated by initializeInteractiveFlashcards -->
    </div>
    <div class="mt-6 text-center">
      <button class="reset bg-neutral-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-neutral-600 transition-colors">Start på nytt</button>
    </div>
  `;
}

/**
 * Initialiserer interactive-flashcards øvelse (exercise-based, front/back cards)
 */
function initializeInteractiveFlashcards(exercise) {
  const container = document.getElementById(exercise.id);
  if (!container) return;

  const grid = container.querySelector('.flashcards-grid');
  if (!grid || !exercise.cards) return;

  function render() {
    grid.innerHTML = '';
    // Shuffle cards for each render
    const shuffled = [...exercise.cards].sort(() => Math.random() - 0.5);
    shuffled.forEach(card => {
      const el = document.createElement('div');
      el.className = 'flashcard h-36 bg-transparent cursor-pointer group perspective';
      el.innerHTML = `
        <div class="flashcard-inner relative w-full h-full">
          <div class="flashcard-front absolute w-full h-full flex items-center justify-center bg-primary-100 text-primary-800 rounded-lg p-4 text-center font-semibold">${card.front}</div>
          <div class="flashcard-back absolute w-full h-full flex items-center justify-center bg-primary-500 text-white rounded-lg p-4 text-center font-semibold text-sm">${card.back}</div>
        </div>`;
      el.addEventListener('click', () => el.classList.toggle('flipped'));
      grid.appendChild(el);
    });
  }

  render();

  // Reset button
  const resetBtn = container.querySelector('.reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      render();
    });
  }
}

/**
 * Returnerer CSS-klasse for task-type
 */
function getTaskClass(type) {
  const classMap = {
    'fill-in': 'fill-in-task',
    'matching': 'matching-game-task',
    'image-matching': 'image-matching-game-task',
    'true-false': 'true-false-task',
    'true-false': 'true-false-task',
    'dilemma': 'dilemma-task',
    'writing': 'writing-task',
    'quiz': 'quiz-task',
    'drag-drop': 'drag-drop-task',
    'minidialoge': 'minidialoge-task',
    'embedded-verb-trainer': 'embedded-verb-trainer-task',
    'embedded-gender-trainer': 'embedded-gender-trainer-task',
    'categorize': 'categorize-task',
    'interactive-flashcards': 'interactive-flashcards-task'
  };
  return classMap[type] || '';
}

/**
 * Returnerer ekstra attributter for spesielle øvelsestyper
 */
function getExtraAttributes(exercise) {
  if (exercise.type === 'matching') {
    const variableName = exercise.variableName || `${exercise.id}-pairs`;
    return `data-is-icon-game="${exercise.isIconGame || false}" data-pairs-variable="${variableName}"`;
  }
  if (exercise.type === 'true-false') {
    const variableName = exercise.variableName || `${exercise.id}-statements`;
    return `data-true-false-variable="${variableName}"`;
  }
  if (exercise.type === 'drag-drop') {
    const variableName = exercise.variableName || `${exercise.id}-sentences`;
    return `data-sentences-variable="${variableName}"`;
  }
  return '';
}

/**
 * Initialiserer en øvelse
 */
function initializeExercise(exercise) {
  switch (exercise.type) {
    case 'fill-in':
      setupFillInTask(exercise.id);
      break;

    case 'matching':
      // Pass data directly to setup function (no window variable needed)
      setupMatchingGame(exercise.id, exercise.pairs, exercise.isIconGame || false);
      break;

    case 'image-matching':
      setupImageMatchingGame(exercise.id, exercise.pairs);
      break;

    case 'true-false':
      // Pass data directly to setup function (no window variable needed)
      setupTrueFalseGame(exercise.id, exercise.statements);
      break;

    case 'dilemma':
      // Pass data directly to setup function (no window variable needed)
      setupDilemmaTask(exercise.id, exercise.items);
      break;

    case 'writing':
      setupWritingTask(exercise.id);
      break;

    case 'quiz':
      const quizContainer = document.querySelector(`#${exercise.id} .quiz-container`);
      if (quizContainer) {
        initializeModularQuiz(quizContainer, exercise.questions, exercise.id);
      }
      break;

    case 'drag-drop':
      // Pass data directly to setup function (no window variable needed)
      setupDragDropSentenceTask(exercise.id, exercise.sentences);
      break;

    case 'minidialoge':
      // Pass data directly to setup function (no window variable needed)
      setupMinidialoge(exercise.id, exercise.scenarios);
      break;

    case 'embedded-verb-trainer':
      // Pass configuration directly to setup function, including title
      setupEmbeddedVerbTrainer(exercise.id, { ...exercise.config, title: exercise.title });
      break;

    case 'embedded-gender-trainer':
      // Pass configuration directly to setup function, including title
      setupEmbeddedGenderTrainer(exercise.id, { ...exercise.config, title: exercise.title });
      break;

    case 'chronology':
      import('./exercises/chronology.js').then(module => {
        module.setupChronologyTask(exercise.id, exercise.items);
      });
      break;

    case 'categorize':
      setupCategorizeTask(exercise.id, exercise.categories);
      break;

    case 'interactive-flashcards':
      initializeInteractiveFlashcards(exercise);
      break;

    default:
      console.warn(`No initializer for exercise type: ${exercise.type}`);
  }
}
