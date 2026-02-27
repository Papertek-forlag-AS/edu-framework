#!/usr/bin/env node

/**
 * generate-dict-translations.js
 *
 * Generates Norwegian (nb) and English (en) translations for dictionary-only
 * words (words not in the curriculum). Translations are written to:
 *   shared/vocabulary/translations/de-nb-dict/{bank}.json
 *   shared/vocabulary/translations/de-en-dict/{bank}.json
 *
 * These are picked up by the search index builder and lookup API as
 * lower-priority fallbacks (curriculum translations always take precedence).
 *
 * Usage: node scripts/dictionary/generate-dict-translations.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');

const DICT_PATH = path.join(ROOT, 'shared', 'vocabulary', 'dictionary', 'de');
const TRANSLATIONS_BASE = path.join(ROOT, 'shared', 'vocabulary', 'translations');

const BANK_FILES = [
  'adjectivebank.json',
  'articlesbank.json',
  'generalbank.json',
  'nounbank.json',
  'numbersbank.json',
  'phrasesbank.json',
  'pronounsbank.json',
  'verbbank.json',
];

/**
 * Load translation maps from the data files.
 * Returns { nb: { wordId: translation }, en: { wordId: translation } }
 */
function loadTranslationMaps() {
  const nbPath = path.join(__dirname, 'data', 'translations-nb.json');
  const enPath = path.join(__dirname, 'data', 'translations-en.json');

  let nb = {};
  let en = {};

  if (fs.existsSync(nbPath)) {
    nb = JSON.parse(fs.readFileSync(nbPath, 'utf-8'));
    console.log(`  Loaded ${Object.keys(nb).length} Norwegian translations from data file`);
  } else {
    console.warn(`  WARNING: ${nbPath} not found`);
  }

  if (fs.existsSync(enPath)) {
    en = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
    console.log(`  Loaded ${Object.keys(en).length} English translations from data file`);
  } else {
    console.warn(`  WARNING: ${enPath} not found`);
  }

  return { nb, en };
}

function generate() {
  console.log('Generating dictionary translations...\n');

  const translations = loadTranslationMaps();

  const outputDirs = {
    nb: path.join(TRANSLATIONS_BASE, 'de-nb-dict'),
    en: path.join(TRANSLATIONS_BASE, 'de-en-dict'),
  };

  // Create output directories
  for (const dir of Object.values(outputDirs)) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  let totalWords = 0;
  let translatedNb = 0;
  let translatedEn = 0;

  for (const bankFile of BANK_FILES) {
    const dictBankPath = path.join(DICT_PATH, bankFile);
    if (!fs.existsSync(dictBankPath)) continue;

    const data = JSON.parse(fs.readFileSync(dictBankPath, 'utf-8'));

    // Collect dictionary-only entries
    const dictOnlyIds = Object.keys(data).filter(
      id => id !== '_metadata' && !data[id].curriculum
    );

    if (dictOnlyIds.length === 0) continue;

    totalWords += dictOnlyIds.length;

    // Build translation files for each language
    for (const lang of ['nb', 'en']) {
      const transMap = translations[lang];
      const bankTranslations = {
        _metadata: {
          source: 'dictionary-translations',
          language: lang,
          bank: bankFile,
          generatedAt: new Date().toISOString(),
        },
      };

      let count = 0;
      for (const wordId of dictOnlyIds) {
        const trans = transMap[wordId];
        if (trans) {
          bankTranslations[wordId] = { translation: trans };
          count++;
        }
      }

      if (count > 0) {
        const outPath = path.join(outputDirs[lang], bankFile);
        fs.writeFileSync(outPath, JSON.stringify(bankTranslations, null, 2), 'utf-8');

        if (lang === 'nb') translatedNb += count;
        if (lang === 'en') translatedEn += count;
      }
    }

    console.log(`  ${bankFile}: ${dictOnlyIds.length} dict-only words`);
  }

  console.log(`\n  Total dictionary-only words: ${totalWords}`);
  console.log(`  Norwegian translations: ${translatedNb} (${(translatedNb / totalWords * 100).toFixed(1)}%)`);
  console.log(`  English translations: ${translatedEn} (${(translatedEn / totalWords * 100).toFixed(1)}%)`);
  console.log('\nDone! Dictionary translations generated.');
}

generate();
