#!/usr/bin/env node

/**
 * build-search-index.js
 *
 * Reads dictionary bank files and translation files to produce a compact
 * search index at shared/vocabulary/dictionary/de/search-index.json.
 *
 * The search index is used by the v2 search API endpoint for fast
 * prefix/contains matching.
 *
 * Usage: node scripts/dictionary/build-search-index.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');

const DICT_PATH = path.join(ROOT, 'shared', 'vocabulary', 'dictionary', 'de');
const TRANSLATIONS_BASE = path.join(ROOT, 'shared', 'vocabulary', 'translations');

// Translation pairs to include in the search index
const TRANSLATION_PAIRS = [
  { pair: 'de-nb', langCode: 'nb' },
  { pair: 'de-en', langCode: 'en' },
];

// Normalize type values to part-of-speech categories for search filtering.
// The core data uses verb classifications (strong, weak, modal, etc.) as the
// type field for verbs, and Norwegian terms in some cases.
const TYPE_NORMALIZE = {
  strong: 'verb', weak: 'verb', modal: 'verb', reflexive: 'verb',
  separable: 'verb', auxiliary: 'verb', regular: 'verb', irregular: 'verb',
  vanlig: 'verb', sterkt: 'verb', svakt: 'verb', refleksiv: 'verb',
  verbphrase: 'verb',
  adjective: 'adj',
  'possessiv pronomen': 'pron',
  'substantiv (kun flertall)': 'noun',
  land: 'propn',
};

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
 * Load all translations for a given language pair.
 * Loads from both curriculum translations (pair) and dictionary translations (pair-dict).
 * Curriculum translations take priority over dictionary translations.
 * Returns a flat map: { wordId: translationString }
 */
function loadTranslations(pair) {
  const translations = {};

  // 1. Load dictionary-only translations first (lower priority)
  const dictPath = path.join(TRANSLATIONS_BASE, `${pair}-dict`);
  if (fs.existsSync(dictPath)) {
    for (const bankFile of BANK_FILES) {
      const filePath = path.join(dictPath, bankFile);
      if (!fs.existsSync(filePath)) continue;

      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      for (const [wordId, entry] of Object.entries(data)) {
        if (wordId === '_metadata') continue;
        if (entry.translation) {
          translations[wordId] = entry.translation;
        }
      }
    }
  }

  // 2. Load curriculum translations (higher priority, overwrites dict)
  const transPath = path.join(TRANSLATIONS_BASE, pair);
  if (fs.existsSync(transPath)) {
    for (const bankFile of BANK_FILES) {
      const filePath = path.join(transPath, bankFile);
      if (!fs.existsSync(filePath)) continue;

      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      for (const [wordId, entry] of Object.entries(data)) {
        if (wordId === '_metadata') continue;
        if (entry.translation) {
          translations[wordId] = entry.translation;
        }
      }
    }
  }

  if (Object.keys(translations).length === 0) {
    console.warn(`  No translations found for ${pair}`);
  }

  return translations;
}

function buildIndex() {
  console.log('Building search index...\n');

  // Load all translations
  const translationsByLang = {};
  for (const { pair, langCode } of TRANSLATION_PAIRS) {
    translationsByLang[langCode] = loadTranslations(pair);
    const count = Object.keys(translationsByLang[langCode]).length;
    console.log(`  Loaded ${count} translations for ${pair}`);
  }

  // Build index entries from dictionary banks
  const entries = [];

  for (const bankFile of BANK_FILES) {
    const dictBankPath = path.join(DICT_PATH, bankFile);
    if (!fs.existsSync(dictBankPath)) {
      console.warn(`  Dictionary bank ${bankFile} not found, skipping`);
      continue;
    }

    const data = JSON.parse(fs.readFileSync(dictBankPath, 'utf-8'));

    for (const [wordId, entry] of Object.entries(data)) {
      if (wordId === '_metadata') continue;

      // Build compact index entry
      const rawType = entry.type || bankFile.replace('bank.json', '');
      const indexEntry = {
        id: wordId,
        w: entry.word,                       // word
        t: TYPE_NORMALIZE[rawType] || rawType, // normalized part-of-speech
        f: entry.frequency || null,          // frequency rank
        c: entry.cefr || null,               // CEFR level
        cur: entry.curriculum || false,      // curriculum flag
      };

      // Add genus for nouns
      if (entry.genus) {
        indexEntry.g = entry.genus;
      }

      // Add verb class for verbs
      if (entry.verbClass) {
        indexEntry.vc = entry.verbClass.default;  // default verb class
      }

      // Add separable verb flag and prefix
      if (entry.separable) {
        indexEntry.sep = entry.separablePrefix || true;  // prefix string or true
      }

      // Add translations
      const tr = {};
      for (const { langCode } of TRANSLATION_PAIRS) {
        const trans = translationsByLang[langCode][wordId];
        if (trans) {
          tr[langCode] = trans;
        }
      }
      if (Object.keys(tr).length > 0) {
        indexEntry.tr = tr;
      }

      entries.push(indexEntry);
    }
  }

  // Sort entries: by word alphabetically for consistent output
  entries.sort((a, b) => a.w.localeCompare(b.w, 'de'));

  const searchIndex = {
    _meta: {
      language: 'de',
      totalEntries: entries.length,
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
      translationLanguages: TRANSLATION_PAIRS.map(p => p.langCode),
    },
    entries,
  };

  const indexPath = path.join(DICT_PATH, 'search-index.json');
  fs.writeFileSync(indexPath, JSON.stringify(searchIndex), 'utf-8');

  // Also write a pretty-printed version for debugging (gitignored)
  const prettyPath = path.join(DICT_PATH, 'search-index.pretty.json');
  fs.writeFileSync(prettyPath, JSON.stringify(searchIndex, null, 2), 'utf-8');

  const fileSizeKB = (Buffer.byteLength(JSON.stringify(searchIndex)) / 1024).toFixed(1);
  console.log(`\n  search-index.json: ${entries.length} entries (${fileSizeKB} KB)`);
  console.log(`  search-index.pretty.json: written for debugging`);
  console.log('\nDone! Search index generated.');
}

buildIndex();
