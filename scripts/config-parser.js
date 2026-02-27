/**
 * config-parser.js
 *
 * Leser og validerer papertek.config.js.
 * Brukes av build-skript, generatorer og validatorer.
 *
 * Bruk:
 *   import { loadConfig } from './scripts/config-parser.js';
 *   const config = await loadConfig();
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

// Standardverdier for valgfrie felter
const DEFAULTS = {
  course: {
    version: '1.0.0',
    license: 'CC-BY-SA-4.0',
  },
  targetLanguage: {
    scriptDirection: 'ltr',
    characterNormalization: {},
    ttsVoice: null,
    caseSystem: null,
  },
  vocabularyApi: {
    baseUrl: 'https://papertek-vocabulary.vercel.app/api/vocab/v1',
    cdnUrl: 'https://papertek-vocabulary.vercel.app',
    fetchAudio: true,
  },
  features: {
    offlineMode: true,
    cloudSync: false,
    teacherDashboard: false,
    classroomGames: false,
    vocabTrainer: true,
    spacedRepetition: true,
    wordTooltips: true,
    specialCharKeyboard: true,
    celebrations: true,
    glossaryTest: false,
  },
  firebase: null,
};

/**
 * Laster og validerer papertek.config.js
 * @param {string} [configPath] — valgfri sti (standard: prosjektrot)
 * @returns {Promise<object>} — validert konfigurasjon
 */
export async function loadConfig(configPath) {
  const fullPath = configPath
    ? resolve(configPath)
    : resolve(PROJECT_ROOT, 'papertek.config.js');

  if (!existsSync(fullPath)) {
    throw new Error(
      `papertek.config.js ikke funnet: ${fullPath}\n` +
      `Kjør 'npx create-edu-app' for å opprette et nytt prosjekt.`
    );
  }

  // Dynamisk import av ES module
  const configModule = await import(pathToFileURL(fullPath).href);
  const raw = configModule.default;

  if (!raw || typeof raw !== 'object') {
    throw new Error('papertek.config.js må eksportere et objekt som default export.');
  }

  // Valider påkrevde felter
  const errors = validateRequired(raw);
  if (errors.length > 0) {
    throw new Error(
      `papertek.config.js har ${errors.length} feil:\n` +
      errors.map(e => `  ✗ ${e}`).join('\n')
    );
  }

  // Merk inn standardverdier
  const config = mergeDefaults(raw);

  return config;
}

/**
 * Validerer påkrevde felter
 */
function validateRequired(config) {
  const errors = [];

  // course
  if (!config.course?.name) errors.push('course.name er påkrevd');

  // targetLanguage
  if (!config.targetLanguage?.code) errors.push('targetLanguage.code er påkrevd');
  if (!config.targetLanguage?.name) errors.push('targetLanguage.name er påkrevd');
  if (!config.targetLanguage?.genderSystem) errors.push('targetLanguage.genderSystem er påkrevd');
  if (config.targetLanguage?.genderSystem &&
      !['none', 'two', 'three'].includes(config.targetLanguage.genderSystem)) {
    errors.push(`targetLanguage.genderSystem må være 'none', 'two', eller 'three' (fikk: '${config.targetLanguage.genderSystem}')`);
  }

  // uiLanguages
  if (!Array.isArray(config.uiLanguages) || config.uiLanguages.length === 0) {
    errors.push('uiLanguages må ha minst ett språk');
  } else {
    const hasDefault = config.uiLanguages.some(l => l.default === true);
    if (!hasDefault) errors.push('uiLanguages må ha ett språk med default: true');
  }

  // curricula
  if (!Array.isArray(config.curricula) || config.curricula.length === 0) {
    errors.push('curricula må ha minst én pensum-oppføring');
  } else {
    config.curricula.forEach((c, i) => {
      if (!c.id) errors.push(`curricula[${i}].id er påkrevd`);
      if (!c.chapters || c.chapters < 1) errors.push(`curricula[${i}].chapters må være >= 1`);
      if (!c.title) errors.push(`curricula[${i}].title er påkrevd`);
    });
  }

  return errors;
}

/**
 * Slår sammen standardverdier med brukerens konfigurasjon
 */
function mergeDefaults(raw) {
  return {
    course: { ...DEFAULTS.course, ...raw.course },
    targetLanguage: { ...DEFAULTS.targetLanguage, ...raw.targetLanguage },
    uiLanguages: raw.uiLanguages,
    curricula: raw.curricula,
    vocabularyApi: { ...DEFAULTS.vocabularyApi, ...raw.vocabularyApi },
    features: { ...DEFAULTS.features, ...raw.features },
    firebase: raw.firebase ?? DEFAULTS.firebase,
  };
}

// Tillat direkte kjøring for testing
if (process.argv[1] && process.argv[1].endsWith('config-parser.js')) {
  loadConfig()
    .then(config => {
      console.log('✅ papertek.config.js er gyldig');
      console.log(`   Kurs: ${config.course.name}`);
      console.log(`   Språk: ${config.targetLanguage.name} (${config.targetLanguage.code})`);
      console.log(`   Pensum: ${config.curricula.map(c => c.id).join(', ')}`);
      console.log(`   UI-språk: ${config.uiLanguages.map(l => l.code).join(', ')}`);
    })
    .catch(err => {
      console.error(`❌ ${err.message}`);
      process.exit(1);
    });
}
