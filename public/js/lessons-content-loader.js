/**
 * Loader for dynamisk innlasting av leksjonsinnhold
 * 
 * Denne filen laster læringsmål, dialog og sjekkliste 
 * dynamisk basert på aktivt pensum (via content-loader).
 * 
 * Oppdatert: 2025-12-26 - Refaktorert for multi-språk (dynamic loading)
 */

import { getActiveCurriculum } from './progress/store.js';
// import { getCharacterName } from '../content/german/characters-data.js'; // REMOVED: Dynamic loading
import { debug as logDebug } from './logger.js';
import { setupWordLookups } from './ui.js';
import { loadContent } from './utils/content-loader.js';

// Module-level variables for wordbanks and maps (initialized dynamically)
let nounBank = {};
let verbbank = {};
let wordBank = [];
let adjectiveBank = {};
let vocabularyData = {};
let getCharacterNameHelper = (name) => name; // Default fallback

let verbFormsMap = new Map();
let adjectiveFormsMap = new Map();
let wordBankMap = new Map();

let isInitialized = false;

/**
 * Initializes the vocabulary maps from loaded wordbanks.
 * Should be called once after content is loaded.
 */
function initializeMaps(wordBanks) {
  if (isInitialized) return;

  // Assign to module vars
  nounBank = wordBanks.nounBank;
  verbbank = wordBanks.verbbank;
  wordBank = wordBanks.wordBank;
  adjectiveBank = wordBanks.adjectiveBank;

  // Bygg kart over verbformer for rask oppslag
  verbFormsMap = new Map();
  Object.entries(verbbank).forEach(([infinitive, data]) => {
    if (data.bøyinger && data.bøyinger.presens && data.bøyinger.presens.former) {
      Object.values(data.bøyinger.presens.former).forEach(form => {
        if (form) {
          verbFormsMap.set(form.toLowerCase(), infinitive);
        }
      });
    }
    verbFormsMap.set(infinitive.toLowerCase(), infinitive);
  });

  // Bygg kart over adjektivformer
  adjectiveFormsMap = new Map();
  Object.entries(adjectiveBank).forEach(([positiv, data]) => {
    adjectiveFormsMap.set(positiv.toLowerCase(), positiv);
    if (data.gradbøying && data.gradbøying.komparativ && data.gradbøying.komparativ.form) {
      adjectiveFormsMap.set(data.gradbøying.komparativ.form.toLowerCase(), positiv);
    }
    if (data.gradbøying && data.gradbøying.superlativ && data.gradbøying.superlativ.form) {
      adjectiveFormsMap.set(data.gradbøying.superlativ.form.toLowerCase(), positiv);
    }
  });

  // Bygg kart over ordforråd (uses 'word' property from JSON banks)
  wordBankMap = new Map();
  Object.values(wordBank).forEach(entry => {
    if (entry && entry.word) {
      wordBankMap.set(entry.word.toLowerCase(), entry);
    }
  });

  isInitialized = true;
  logDebug('✅ Vocabulary maps initialized for dynamic tagging');
}

/**
 * Automatisk tagger vokabular i tekst med <span class="word-lookup">
 * Ignorerer tekst som allerede er tagget.
 */
function autoTagVocabulary(text) {
  if (!text) return text;
  if (!isInitialized) return text; // Cannot tag if not initialized

  const regex = /(<span[^>]*class=["'](?:word-lookup|grammar-term)["'][^>]*>.*?<\/span>)|(<[^>]+>)|(\b[a-zA-ZäöüßÄÖÜ]+(?:\s+[a-zA-ZäöüßÄÖÜ]+)*\b)/g;

  return text.replace(regex, (match, existingSpan, otherTag, word) => {
    if (existingSpan || otherTag) return match;

    if (word) {
      if (nounBank[word]) {
        return `<span class="word-lookup" data-type="noun">${word}</span>`;
      }

      const lowerWord = word.toLowerCase();
      if (verbFormsMap.has(lowerWord)) {
        const infinitive = verbFormsMap.get(lowerWord);
        return `<span class="word-lookup" data-type="verb" data-verb="${infinitive}">${word}</span>`;
      }

      if (wordBankMap.has(lowerWord)) {
        const wordEntry = wordBankMap.get(lowerWord);
        return `<span class="word-lookup" data-type="${wordEntry.type}">${word}</span>`;
      }
    }
    return match;
  });
}

/**
 * Initialiserer og laster alt leksjonsinnhold
 * @param {object} externalConfig - Optional config to use (overrides getActiveCurriculum)
 */
export async function loadLessonContent(externalConfig) {
  logDebug('🔧 loadLessonContent() CALLED');

  const chapterId = document.body.dataset.chapterId;
  logDebug('📝 Chapter ID from body:', chapterId);

  if (!chapterId) {
    console.warn('⚠️ Ingen chapter-id funnet på body element');
    return;
  }

  // Load dynamic content
  try {
    const content = await loadContent(externalConfig);

    // Initialize maps if needed
    initializeMaps(content.wordBanks);

    // Initialize character helper
    if (content.charactersData && content.charactersData.getCharacterName) {
      getCharacterNameHelper = content.charactersData.getCharacterName;
    }

    // Store vocab data
    vocabularyData = content.vocabularyData;

    // Get lessons Data
    const lessonsData = content.lessonsData;
    const data = lessonsData[chapterId];

    if (!data) {
      console.error(`❌ Ingen data funnet for leksjon ${chapterId}`);
      return;
    }

    logDebug('✓ Data found for', chapterId);

    loadLearningGoals(data.learningGoals);
    loadDialog(data.dialog);
    loadAdditionalTexts(data.additionalTexts);
    loadPhraseTables(data.phraseTables);
    loadFactCards(data.factCards);
    loadChecklist(data.checklist);

    if (vocabularyData && vocabularyData[chapterId]) {
      loadVocabularyExplanation(vocabularyData[chapterId]);
    }

    logDebug(`✅ Leksjonsinnhold lastet for ${chapterId}`);

  } catch (error) {
    console.error('Failed to load lesson content:', error);
  }
}

/**
 * Laster læringsmål
 */
function loadLearningGoals(learningGoals) {
  logDebug('  📖 Loading learning goals...');
  const container = document.getElementById('maal-liste');

  if (!container) {
    console.error('  ❌ Element #maal-liste not found in DOM!');
    return;
  }

  if (!learningGoals || learningGoals.length === 0) {
    return;
  }

  container.innerHTML = learningGoals.map(punkt => `<li>${autoTagVocabulary(punkt)}</li>`).join('');
}

/**
 * Laster dialog med metadata
 * Hides the dialog section if no dialog data is provided (for lessons using additionalTexts)
 */
function loadDialog(dialog) {
  const tittelEl = document.getElementById('dialog-tittel');

  // If no dialog data, hide the entire dialog container
  if (!dialog) {
    if (tittelEl) {
      // Find the parent container (the bg-surface section containing the dialog)
      const dialogContainer = tittelEl.closest('.bg-surface');
      if (dialogContainer) {
        dialogContainer.style.display = 'none';
      }
    }
    return;
  }

  if (tittelEl && dialog.title) {
    tittelEl.innerHTML = `${autoTagVocabulary(dialog.title)}`;
  }

  const beskrivelseEl = document.getElementById('dialog-beskrivelse');
  if (beskrivelseEl && dialog.description) {
    beskrivelseEl.innerHTML = autoTagVocabulary(dialog.description);
  }

  const audioEl = document.querySelector('#leksjon audio source');
  if (audioEl && dialog.audioFile) {
    audioEl.src = `audiofiles/${dialog.audioFile}`;
    const audioParent = audioEl.parentElement;
    if (audioParent && audioParent.tagName === 'AUDIO') {
      audioParent.load();
    }
  }

  const bildeEl = document.getElementById('dialog-bilde');
  if (bildeEl && dialog.image) {
    const imagePath = window.location.pathname.includes('/public/') ? '/public/images/' : '/images/';
    bildeEl.src = `${imagePath}${dialog.image}`;
    bildeEl.alt = dialog.imageAlt || '';
  }

  const replikkContainer = document.getElementById('dialog-replikker');
  if (replikkContainer && dialog.lines && dialog.lines.length > 0) {
    const html = dialog.lines.map(r => {
      const characterName = getCharacterNameHelper(r.person);
      const taggedText = autoTagVocabulary(r.tekst);
      if (r.person === 'narrator') {
        return `<p class="italic">${taggedText}</p>`;
      }
      return `<p><strong>${characterName}:</strong> ${taggedText}</p>`;
    }).join('');

    replikkContainer.innerHTML = html;
  }
}

/**
 * Laster tilleggstekster (Tekst B, C, etc.)
 */
function loadAdditionalTexts(additionalTexts) {
  if (!additionalTexts || additionalTexts.length === 0) return;

  additionalTexts.forEach((text, index) => {
    const containerId = text.containerId || `additional-text-${index}`;
    let container = document.getElementById(containerId);

    if (!container) {
      const wrapper = document.getElementById('additional-texts-container');
      if (wrapper) {
        container = document.createElement('div');
        container.id = containerId;
        container.className = 'bg-surface p-6 rounded-xl shadow-sm mb-6';
        wrapper.appendChild(container);
      } else {
        return;
      }
    }

    let html = '';

    if (text.title) {
      html += `<h2 class="text-2xl font-bold text-primary-700 mb-4">${autoTagVocabulary(text.title)}</h2>`;
    }

    if (text.audioFile) {
      html += `
        <audio class="w-full mb-4" controls>
          <source src="audiofiles/${text.audioFile}" type="audio/mpeg"/>
          Nettleseren din støtter ikke lydelementet.
        </audio>
      `;
    }

    if (text.description && text.type === 'dialog') {
      html += `<p class="mb-4">${autoTagVocabulary(text.description)}</p>`;
    }

    if (text.type === 'dialog' && text.lines) {
      html += '<div class="bg-neutral-100 p-6 rounded-lg space-y-3">';
      html += text.lines.map(r => {
        const characterName = getCharacterNameHelper(r.person);
        const taggedText = autoTagVocabulary(r.tekst);
        if (r.person === 'narrator') {
          return `<p class="italic">${taggedText}</p>`;
        }
        return `<p><strong>${characterName}:</strong> ${taggedText}</p>`;
      }).join('');
      html += '</div>';

    } else if (text.type === 'narrative' && text.content) {
      html += `<div class="bg-neutral-100 p-6 rounded-lg space-y-3 prose max-w-none">${autoTagVocabulary(text.content)}</div>`;
    } else if (text.type === 'info' && text.content) {
      if (text.image) {
        html += '<div class="grid md:grid-cols-2 gap-8 items-center">';
        html += `<div class="bg-neutral-100 p-6 rounded-lg space-y-3 prose max-w-none">${autoTagVocabulary(text.content)}</div>`;
        html += `<img alt="${text.imageAlt || text.title}" class="w-full h-auto object-contain rounded-lg bg-neutral-100 p-2" src="/images/${text.image}"/>`;
        html += '</div>';
      } else {
        html += `<div class="bg-neutral-100 p-6 rounded-lg space-y-3 prose max-w-none">${autoTagVocabulary(text.content)}</div>`;
      }
    } else if (text.type === 'postcard' && text.content) {
      html += '<div class="grid md:grid-cols-2 gap-8 items-start">';
      html += `<div class="bg-primary-50 p-6 sm:p-8 rounded-lg shadow-md font-serif text-lg leading-relaxed relative">${autoTagVocabulary(text.content)}</div>`;
      if (text.image) {
        html += `<img alt="${text.imageAlt || text.title}" class="w-full h-auto object-contain rounded-lg bg-neutral-100 p-2" src="/images/${text.image}"/>`;
      }
      html += '</div>';
    }

    container.innerHTML = html;
  });
}

/**
 * Laster frasetabeller
 */
function loadPhraseTables(phraseTables) {
  if (!phraseTables || phraseTables.length === 0) return;

  phraseTables.forEach((table, index) => {
    const containerId = table.containerId || `phrase-table-${index}`;
    const container = document.getElementById(containerId);

    if (!container) return;

    let html = '';

    if (table.title) {
      html += `<h2 class="text-2xl font-bold text-primary-700 mb-4">${autoTagVocabulary(table.title)}</h2>`;
    }

    html += '<div class="overflow-x-auto mt-4">';
    html += '<table class="min-w-full bg-surface border border-neutral-200">';
    html += '<thead class="bg-neutral-100"><tr>';

    if (table.headers) {
      table.headers.forEach(header => {
        html += `<th class="p-3 text-left font-semibold">${autoTagVocabulary(header)}</th>`;
      });
    }

    html += '</tr></thead><tbody>';

    if (table.rows) {
      table.rows.forEach((row, idx) => {
        const borderClass = idx < table.rows.length - 1 ? 'border-b' : '';
        html += `<tr class="${borderClass}">`;
        if (row.label) {
          html += `<td class="p-3 font-bold">${autoTagVocabulary(row.label)}</td>`;
        }
        if (row.content) {
          html += `<td class="p-3"><em>${autoTagVocabulary(row.content)}</em></td>`;
        }
        html += '</tr>';
      });
    }

    html += '</tbody></table></div>';
    container.innerHTML = html;
  });
}

/**
 * Laster faktakort
 */
function loadFactCards(factCards) {
  if (!factCards || factCards.length === 0) return;

  const containerId = factCards.containerId || 'fact-cards-container';
  let container = document.getElementById(containerId);

  if (!container) {
    // Auto-create container if missing (e.g. for Lesson 6.3)
    const parent = document.getElementById('leksjon');
    if (parent) {
      container = document.createElement('div');
      container.id = containerId;
      container.className = 'bg-surface p-6 rounded-xl shadow-sm mb-6';

      // Try to insert before uttale-placeholder or buttons
      const referenceNode = document.getElementById('uttale-placeholder') || parent.lastElementChild;
      parent.insertBefore(container, referenceNode);
    } else {
      return;
    }
  }

  let html = '';

  if (factCards.title) {
    html += `<h2 class="text-2xl font-bold text-primary-700 mb-4">${factCards.title}</h2>`;
  }

  html += '<div class="space-y-8">';

  if (factCards.cards) {
    factCards.cards.forEach(card => {
      html += '<div class="grid sm:grid-cols-3 gap-6 items-center">';
      if (card.image) {
        html += `<img alt="${card.imageAlt || card.title}" class="rounded-lg shadow-sm col-span-1" src="/images/${card.image}"/>`;
      }
      html += '<div class="col-span-2">';
      if (card.title) {
        html += `<h3 class="text-xl font-bold">${card.title}</h3>`;
      }
      if (card.content) {
        html += `<p class="mt-1 text-neutral-700">${card.content}</p>`;
      }
      html += '</div></div>';
    });
  }

  html += '</div>';
  container.innerHTML = html;
}

/**
 * Laster sjekkliste
 */
function loadChecklist(checklist) {
  const container = document.getElementById('checklist');
  if (!container || !checklist || checklist.length === 0) return;

  container.innerHTML = checklist.map(punkt => `
    <li class="flex items-center cursor-pointer">
      <span class="check-box w-6 h-6 border-2 border-neutral-400 rounded-md mr-3 inline-block"></span>
      ${punkt}
    </li>
  `).join('');

  setupChecklistInteractivity();
}

function setupChecklistInteractivity() {
  const checklist = document.getElementById('checklist');
  if (!checklist) return;

  const items = checklist.querySelectorAll('li');
  items.forEach(item => {
    item.addEventListener('click', function () {
      const checkbox = this.querySelector('.check-box');
      if (checkbox) {
        checkbox.classList.toggle('bg-success-500');
        checkbox.classList.toggle('border-success-500');
        if (checkbox.classList.contains('bg-success-500')) {
          checkbox.innerHTML = '<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>';
        } else {
          checkbox.innerHTML = '';
        }
      }
    });
  });
}

/**
 * Eksporter funksjon for manuel re-load (debugging)
 */
export async function reloadLessonContent() {
  logDebug('🔄 Reloading leksjonsinnhold...');
  await loadLessonContent();
}

/**
 * Laster vokabular-forklaringer
 */
function loadVocabularyExplanation(vocabData) {
  if (!vocabData) return;

  // Clock Explanation
  if (vocabData.clockExplanation) {
    const container = document.getElementById('vocabulary-explanation');
    if (container) {
      const data = vocabData.clockExplanation;
      let html = `
              <h2 class="text-2xl font-bold text-primary-700 mb-4">${data.title}</h2>
              <div class="space-y-4 text-neutral-700">
                  <p>${data.intro}</p>
                  <ul class="list-disc list-inside space-y-2 ml-4">
                      ${data.list.map(item => `<li>${item}</li>`).join('')}
                  </ul>
                  ${data.tip ? `
                  <div class="bg-primary-50 p-4 rounded-lg border-l-4 border-primary-500 mt-4">
                      <p class="font-bold text-primary-800">${data.tip.title}</p>
                      <p>${data.tip.text}</p>
                  </div>
                  ` : ''}
              </div>
          `;
      container.innerHTML = html;
    }
  }
}
