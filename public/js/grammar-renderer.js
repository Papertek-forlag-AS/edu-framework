/**
 * grammar-renderer.js
 * Shared module for rendering grammar content modules
 *
 * This module contains all rendering functions used by both:
 * - Individual lesson pages (via grammar-content-loader.js)
 * - Grammar overview page (grammatikk.html)
 */


/**
 * Render a single grammar module
 * @param {Object} module - Grammar module object from grammar-data.js
 * @param {Object} context - Context containing wordBanks, languageConfig, etc.
 * @returns {HTMLElement|null} Rendered DOM element or null
 */
export function renderModule(module, context = {}) {
  // Defensive check for context
  if (!context.languageConfig) {
    context.languageConfig = {};
  }
  if (!context.wordBanks) {
    context.wordBanks = {};
  }

  // Helper values for cleaner code - support both dataKeys (registry) and codes (legacy)
  const keys = context.languageConfig.dataKeys || context.languageConfig.codes || { target: 'target', native: 'native' };
  context.targetKey = keys.target;
  context.nativeKey = keys.native;

  switch (module.type) {
    case 'tittel':
      return renderTittel(module, context);
    case 'forklaring':
      return renderForklaring(module, context);
    case 'liste':
      return renderListe(module, context);
    case 'pronomen-grid':
      return renderPronomenGrid(module, context);
    case 'verbtabell':
      return renderVerbtabell(module, context);
    case 'regel-boks':
    case 'regel-tabell':
      return renderRegelTabell(module, context);
    case 'infoboks':
      return renderInfoboks(module, context);
    case 'eksempel-boks':
    case 'eksempel':
      return renderEksempel(module, context);
    case 'custom-html':
      return renderCustomHtml(module, context);
    case 'egne-notater':
      return null;
    case 'custom-tool':
      return renderCustomTool(module, context);
    default:
      console.warn('Unknown module type:', module.type);
      return null;
  }
}

/**
 * Grammar Tool Registry
 *
 * Maps toolId → module path for dynamic loading.
 * Content authors define custom-tool modules in grammar data;
 * the registry resolves each toolId to its ES module.
 *
 * To register tools from content packages, call registerGrammarTool().
 */
const GRAMMAR_TOOL_REGISTRY = {
  // Empty by default — content packages register their tools at runtime
  // via registerGrammarTool() or registerGrammarTools().
  //
  // Example (in a German content package's init script):
  //   import { registerGrammarTools } from './grammar-renderer.js';
  //   registerGrammarTools({
  //     'separable-verbs':        './grammar-modules/separable-verbs.js',
  //     'dativ-trainer':          './grammar-modules/dativ-trainer.js',
  //     'cases-prepositions':     './grammar-modules/cases-prepositions.js',
  //   });
};

/**
 * Register a grammar tool module at runtime.
 * Content packages can call this to add language-specific tools.
 * @param {string} toolId - Unique tool identifier
 * @param {string} modulePath - Path to ES module (relative to grammar-renderer.js)
 */
export function registerGrammarTool(toolId, modulePath) {
  GRAMMAR_TOOL_REGISTRY[toolId] = modulePath;
}

/**
 * Register multiple grammar tools at once.
 * @param {Object} toolMap - { toolId: modulePath, ... }
 */
export function registerGrammarTools(toolMap) {
  Object.assign(GRAMMAR_TOOL_REGISTRY, toolMap);
}

/**
 * Get all registered grammar tool IDs.
 * @returns {string[]}
 */
export function getRegisteredTools() {
  return Object.keys(GRAMMAR_TOOL_REGISTRY);
}

/**
 * Render custom interactive tool — uses the grammar tool registry
 * for dynamic resolution instead of hardcoded if/else chains.
 */
export function renderCustomTool(module, context) {
  const container = document.createElement('div');
  container.id = `tool-${module.toolId}-${Math.random().toString(36).substr(2, 9)}`;
  container.className = 'my-6 min-h-[200px] flex items-center justify-center';

  container.innerHTML = `
        <div class="flex flex-col items-center text-neutral-400">
            <svg class="animate-spin h-8 w-8 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="text-sm">Laster øvelse...</span>
        </div>
    `;

  const toolConfig = { ...module.config, context };

  // Look up the module path from the registry
  const modulePath = GRAMMAR_TOOL_REGISTRY[module.toolId];

  if (!modulePath) {
    container.innerHTML = `<div class="text-error-500">Unknown tool ID: ${module.toolId}</div>`;
    return container;
  }

  import(modulePath)
    .then(toolModule => {
      if (toolModule && typeof toolModule.init === 'function') {
        toolModule.init(container, toolConfig);
      } else {
        container.innerHTML = '<div class="text-error-500">Could not initialize tool</div>';
      }
    })
    .catch(err => {
      console.error(`Failed to load grammar tool '${module.toolId}':`, err);
      container.innerHTML = '<div class="text-error-500">Feil ved lasting av øvelse</div>';
    });

  return container;
}

/**
   * Render title (h2 or h3)
   */
export function renderTittel(module, context) {
  const tag = module.nivå === 3 ? 'h3' : 'h2';
  const element = document.createElement(tag);

  if (tag === 'h2') {
    element.className = 'text-2xl font-bold text-primary-700 mb-4';
  } else {
    element.className = 'text-xl font-bold text-neutral-800 mb-2 mt-6';
  }

  element.innerHTML = module.tekst;
  return element;
}

/**
 * Render explanation paragraph
 */
export function renderForklaring(module, context) {
  const p = document.createElement('p');
  p.className = 'mb-4';
  p.innerHTML = module.tekst;
  return p;
}

/**
 * Render list
 */
export function renderListe(module, context) {
  const ul = document.createElement('ul');
  ul.className = 'list-disc list-inside space-y-2 text-neutral-700 mb-4';

  module.punkter.forEach(punkt => {
    const li = document.createElement('li');
    li.innerHTML = punkt;
    ul.appendChild(li);
  });

  return ul;
}

/**
 * Render pronomen grid (as a table for accusative pronouns)
 */
export function renderPronomenGrid(module, context) {
  const { targetKey, nativeKey } = context;

  // Check if this is a pronoun table with overskrifter and personer
  if (module.overskrifter && module.personer) {
    const container = document.createElement('div');
    container.className = 'overflow-x-auto mt-4 mb-6';

    const table = document.createElement('table');
    table.className = 'min-w-full bg-surface border border-neutral-200';

    // Header
    const thead = document.createElement('thead');
    thead.className = 'bg-neutral-100';
    const headerRow = document.createElement('tr');

    module.overskrifter.forEach(header => {
      const th = document.createElement('th');
      th.className = 'p-3 text-left font-semibold';
      th.innerHTML = header;
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');

    module.personer.forEach((person, index) => {
      const tr = document.createElement('tr');
      if (index < module.personer.length - 1) {
        tr.className = 'border-b';
      }

      // Nominativ column (assuming 'person' property or generic 'c1')
      const td1 = document.createElement('td');
      td1.className = 'p-3 font-bold';
      // Fallback for property names if they are hardcoded not targetKey (e.g. 'person' is standard)
      td1.textContent = person.person || person[targetKey];
      tr.appendChild(td1);

      // Akkusativ column
      const td2 = document.createElement('td');
      td2.className = 'p-3 font-bold';
      td2.innerHTML = `<strong>${person.akkusativ}</strong>`;
      tr.appendChild(td2);

      // Native column
      const td3 = document.createElement('td');
      td3.className = 'p-3 text-neutral-600';
      td3.textContent = person[nativeKey] || person.native || person.norsk || '';
      tr.appendChild(td3);

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);

    return container;
  }

  // Fallback: original grid layout for simple items
  const gridDiv = document.createElement('div');
  gridDiv.className = `grid md:grid-cols-${module.kolonner} gap-4 my-6`;

  module.items.forEach(item => {
    const cell = document.createElement('div');
    cell.className = 'bg-neutral-100 p-4 rounded-lg text-center';

    const targetText = item[targetKey] || item.tysk;
    const nativeText = item[nativeKey] || item.norsk;

    const tysk = document.createElement('p');
    tysk.className = 'text-xl font-bold';
    tysk.textContent = targetText;
    cell.appendChild(tysk);

    const norsk = document.createElement('p');
    norsk.className = 'text-lg text-neutral-600';
    norsk.textContent = nativeText;
    cell.appendChild(norsk);

    if (item.merknad) {
      const merknad = document.createElement('p');
      merknad.className = 'text-sm mt-1';
      merknad.textContent = item.merknad;
      cell.appendChild(merknad);
    }

    // Add ring for polite/formal form (language-agnostic: check if native text indicates formality)
    if (nativeText && (nativeText.includes('høflig') || nativeText.includes('formal') || nativeText.includes('formell'))) {
      cell.classList.add('ring-2', 'ring-primary-500');
    }

    gridDiv.appendChild(cell);
  });

  return gridDiv;
}

/**
 * Render verb table (from verbbank)
 */
export function renderVerbtabell(module, context) {
  const verbbank = context.wordBanks?.verbbank || {};

  // Try direct lookup first, then try with suffix
  const verbKey = module.verb;
  const verb = verbbank[verbKey] || verbbank[`${verbKey}_verb`];

  if (!verb) {
    console.warn(`Verb not found in verbbank: ${verbKey}`);
    return null;
  }

  // Create table container
  const container = document.createElement('div');
  container.className = 'overflow-x-auto mt-4';

  const table = document.createElement('table');
  table.className = 'min-w-full bg-surface border border-neutral-200';

  // Header
  const thead = document.createElement('thead');
  thead.className = 'bg-neutral-100';
  const headerRow = document.createElement('tr');

  const th1 = document.createElement('th');
  th1.className = 'p-3 text-left font-semibold';
  th1.textContent = 'Pronomen';
  headerRow.appendChild(th1);

  const th2 = document.createElement('th');
  th2.className = 'p-3 text-left font-semibold';

  // Get translation from the native language (derive code from key)
  const nativeKey = context.nativeKey || 'native';
  const keyToCode = { 'norsk': 'nb', 'english': 'en', 'deutsch': 'de' };
  const nativeCode = keyToCode[nativeKey] || 'nb';
  const verbTranslation = verb.translations?.[nativeCode] || '';

  th2.textContent = `${module.verb} (${verbTranslation})`;
  headerRow.appendChild(th2);

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Body
  const tbody = document.createElement('tbody');

  // Language-agnostic: uses pronouns from config, falls back to conjugation keys
  const conjugation = verb.conjugations?.presens;

  if (conjugation && conjugation.former) {
    const former = conjugation.former;
    // Get pronouns from language config, or fall back to keys in the data
    const pronouns = context.languageConfig?.grammar?.pronouns || Object.keys(former);

    pronouns.forEach((pronoun, index) => {
      const tr = document.createElement('tr');
      if (index < pronouns.length - 1) {
        tr.className = 'border-b';
      }

      const td1 = document.createElement('td');
      td1.className = 'p-3 font-bold';
      td1.textContent = pronoun;
      tr.appendChild(td1);

      const td2 = document.createElement('td');
      td2.className = 'p-3';
      td2.textContent = former[pronoun] || '';
      tr.appendChild(td2);

      tbody.appendChild(tr);
    });
  } else {
    // Fallback for missing conjugation data
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 2;
    td.textContent = 'Ingen bøyningsdata tilgjengelig';
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  container.appendChild(table);

  return container;
}

/**
 * Render rule table
 */
export function renderRegelTabell(module, context) {
  const container = document.createElement('div');
  container.className = 'overflow-x-auto mt-4';

  const table = document.createElement('table');
  table.className = 'min-w-full bg-surface border border-neutral-200';

  // Header
  // Some regel-tables might miss overskrifter (e.g. simple lists)
  if (module.overskrifter && Array.isArray(module.overskrifter)) {
    const thead = document.createElement('thead');
    thead.className = 'bg-neutral-100';
    const headerRow = document.createElement('tr');

    module.overskrifter.forEach(header => {
      const th = document.createElement('th');
      th.className = 'p-3 text-left font-semibold';
      th.innerHTML = header;
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);
  }

  // Body
  const tbody = document.createElement('tbody');

  if (module.rader && Array.isArray(module.rader)) {
    module.rader.forEach((row, index) => {
      const tr = document.createElement('tr');
      if (index < module.rader.length - 1) {
        tr.className = 'border-b';
      }

      row.forEach(cell => {
        const td = document.createElement('td');
        td.className = 'p-3';
        td.innerHTML = cell;
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
  }

  table.appendChild(tbody);
  container.appendChild(table);

  return container;
}

/**
 * Render info box
 */
export function renderInfoboks(module, context) {
  const div = document.createElement('div');
  div.className = 'mt-4 p-4 rounded-lg';

  // Set background color based on box type
  switch (module.boksType) {
    case 'husk':
      div.classList.add('bg-primary-100/60');
      break;
    case 'nb':
      div.classList.add('bg-error-100/60');
      break;
    case 'tips':
      div.classList.add('bg-success-100/60');
      break;
    case 'eksempel':
      div.classList.add('bg-info-100/60');
      break;
    case 'advarsel':
      div.classList.add('bg-error-100/60');
      break;
    case 'grammarekspert':
      div.classList.add('bg-accent3-50', 'border-l-4', 'border-accent3-600', 'shadow-sm');
      break;
    case 'info':
    default:
      div.classList.add('bg-info-100/60');
      break;
  }

  // Title
  const h4 = document.createElement('h4');
  h4.className = 'font-bold mb-2';
  h4.innerHTML = module.tittel;
  div.appendChild(h4);

  // Content
  const contentDiv = document.createElement('div');
  contentDiv.innerHTML = module.innhold;
  div.appendChild(contentDiv);

  return div;
}

/**
 * Render custom HTML content
 */
export function renderCustomHtml(module, context) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = module.html;
  return wrapper.firstElementChild || wrapper;
}

/**
 * Render example sentences
 */
export function renderEksempel(module, context) {
  const container = document.createElement('div');
  container.className = 'my-4';

  const { targetKey, nativeKey } = context;

  // Optional heading
  if (module.tittel) {
    const heading = document.createElement('p');
    heading.className = 'font-semibold text-neutral-700 mb-2';
    heading.textContent = module.tittel;
    container.appendChild(heading);
  }

  // Render sentences as responsive grid of boxes
  const items = module.setninger || module.eksempler;
  if (items && Array.isArray(items)) {
    const grid = document.createElement('div');
    // Support 2 or 3 columns: 3 cols at md+, 2 cols at sm, 1 col on mobile
    const cols = module.kolonner === 3
      ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-2'
      : 'grid grid-cols-1 md:grid-cols-2 gap-3 mt-2';
    grid.className = cols;

    items.forEach(setning => {
      const box = document.createElement('div');
      box.className = 'border-l-4 border-primary-400 bg-primary-50/30 p-3 rounded-r-lg';

      const targetText = setning[targetKey] || setning.tysk;
      const nativeText = setning[nativeKey] || setning.norsk;

      // Target sentence
      const targetP = document.createElement('p');
      targetP.className = 'text-neutral-800 font-medium mb-1';
      targetP.innerHTML = targetText;
      box.appendChild(targetP);

      // Native translation
      const nativeP = document.createElement('p');
      nativeP.className = 'text-neutral-600 text-sm';
      nativeP.innerHTML = `→ ${nativeText}`;
      box.appendChild(nativeP);

      grid.appendChild(box);
    });

    container.appendChild(grid);
  }

  return container;
}
