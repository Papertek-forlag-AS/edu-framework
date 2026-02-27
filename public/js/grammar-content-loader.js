/**
 * grammar-content-loader.js
 * Dynamically loads grammar content using content-loader.js
 */

import { renderModule } from './grammar-renderer.js';
import { debug } from './logger.js';
import { setupWordLookups, setupGrammarTermLookups } from './ui.js';
import { loadContent } from './utils/content-loader.js';
import { getCurriculumConfig } from './progress/curriculum-registry.js';
import { getActiveCurriculum } from './progress/store.js';

debug('🔧 grammatikk-innhold-loader.js loaded');

/**
 * Load grammar content for current lesson
 * @param {object} externalConfig - Optional config to use (overrides getActiveCurriculum)
 */
export async function loadGrammatikkInnhold(externalConfig) {
  debug('🔧 loadGrammatikkInnhold() CALLED');

  const chapterId = document.body.dataset.chapterId;
  debug('📝 Chapter ID from body:', chapterId);

  if (!chapterId) {
    console.warn('❌ No chapter ID found on body');
    return;
  }

  try {
    // Dynamic content loading
    const content = await loadContent(externalConfig);
    const grammarData = content.grammarData;
    const modules = grammarData[chapterId];

    if (!modules) {
      console.warn(`❌ No grammar data found for lesson ${chapterId}`);
      return;
    }

    debug(`📚 Found ${modules.length} grammar modules for ${chapterId}`);

    const grammatikkSection = document.getElementById('grammatikk');
    if (!grammatikkSection) {
      console.warn('❌ No #grammatikk section found');
      return;
    }

    // Clear existing content (except navigation button)
    const contentBoxes = grammatikkSection.querySelectorAll('.bg-surface.shadow-sm');
    contentBoxes.forEach(box => box.remove());

    const container = document.createElement('div');
    container.className = 'bg-surface p-6 rounded-xl shadow-sm';

    // Prepare context for renderer
    const curriculumId = externalConfig?.id || getActiveCurriculum();
    const config = externalConfig || getCurriculumConfig(curriculumId);

    // Default config if missing (fallback for tests)
    const context = {
      wordBanks: content.wordBanks,
      languageConfig: config.languageConfig || { codes: { target: 'tysk', native: 'norsk' } }
    };

    modules.forEach(module => {
      const element = renderModule(module, context);
      if (element) {
        container.appendChild(element);
      }
    });

    const navButton = grammatikkSection.querySelector('.bg-neutral-100\\/60');
    if (navButton) {
      grammatikkSection.insertBefore(container, navButton);
    } else {
      grammatikkSection.appendChild(container);
    }

    debug(`✅ Grammar content loaded for ${chapterId}`);

    setupWordLookups();
    setupGrammarTermLookups();

  } catch (error) {
    console.error('Failed to load grammar content:', error);
  }
}
