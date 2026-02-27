#!/usr/bin/env node

/**
 * enrich-curriculum-words.js
 *
 * Reads all bank files from shared/vocabulary/core/de/ and generates
 * enriched dictionary bank files at shared/vocabulary/dictionary/de/.
 *
 * Adds: curriculum: true, cefr (derived from intro), frequency (null placeholder)
 *
 * Usage: node scripts/dictionary/enrich-curriculum-words.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');

const CORE_PATH = path.join(ROOT, 'shared', 'vocabulary', 'core', 'de');
const DICT_PATH = path.join(ROOT, 'shared', 'vocabulary', 'dictionary', 'de');
const VERB_CLASS_PATH = path.join(ROOT, 'shared', 'vocabulary', 'dictionary', 'verb-classification-de.json');

// CEFR mapping based on lesson intro number
// VG1 tysk1: lessons 1.x-2.x = A1, 3.x-5.x = A2, 6.x-7.x = B1
function introToCefr(intro) {
  if (!intro) return 'A1'; // Default for words without intro
  const chapter = parseFloat(intro);
  if (isNaN(chapter)) return 'A1';
  if (chapter < 3) return 'A1';
  if (chapter < 6) return 'A2';
  return 'B1';
}

// Bank files to process (everything except manifest.json)
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

function enrichBank(bankFile) {
  const coreBankPath = path.join(CORE_PATH, bankFile);

  if (!fs.existsSync(coreBankPath)) {
    console.warn(`  Skipping ${bankFile} (not found)`);
    return { entries: 0 };
  }

  const coreData = JSON.parse(fs.readFileSync(coreBankPath, 'utf-8'));
  const enriched = {};
  let entryCount = 0;

  // Copy metadata, update for dictionary context
  enriched._metadata = {
    source: bankFile,
    type: 'dictionary',
    targetLanguage: 'german',
    generatedAt: new Date().toISOString(),
    description: `Dictionary data for german ${bankFile.replace('.json', '')} (includes curriculum words)`,
  };

  for (const [wordId, entry] of Object.entries(coreData)) {
    if (wordId === '_metadata') continue;

    // Determine the best intro value from the entry or its cases/conjugations
    let intro = entry.intro || null;

    // For verbs, try to find intro from the earliest conjugation
    if (!intro && entry.conjugations) {
      for (const tense of Object.values(entry.conjugations)) {
        if (tense.intro) {
          if (!intro || parseFloat(tense.intro) < parseFloat(intro)) {
            intro = tense.intro;
          }
        }
      }
    }

    // For nouns, try to find intro from the earliest case
    if (!intro && entry.cases) {
      for (const caseData of Object.values(entry.cases)) {
        if (caseData.intro) {
          if (!intro || parseFloat(caseData.intro) < parseFloat(intro)) {
            intro = caseData.intro;
          }
        }
      }
    }

    const enrichedEntry = {
      ...entry,
      curriculum: true,
      cefr: introToCefr(intro),
      frequency: null, // Placeholder, populated in Phase 2 with corpus data
    };

    // Add verbClass from classification data if available
    if (verbClassification[wordId]) {
      enrichedEntry.verbClass = verbClassification[wordId];
    }

    // Ensure separable flag is set from both core data and verb classification
    if (entry.separable) {
      enrichedEntry.separable = true;
    }
    if (verbClassification[wordId]?.separable) {
      enrichedEntry.separable = true;
      enrichedEntry.separablePrefix = verbClassification[wordId].separable;
    }

    enriched[wordId] = enrichedEntry;

    entryCount++;
  }

  // Write enriched bank
  const dictBankPath = path.join(DICT_PATH, bankFile);
  fs.writeFileSync(dictBankPath, JSON.stringify(enriched, null, 2), 'utf-8');
  console.log(`  ${bankFile}: ${entryCount} entries`);

  return { entries: entryCount };
}

function generateManifest(bankStats) {
  const totalWords = Object.values(bankStats).reduce((sum, s) => sum + s.entries, 0);

  const manifest = {
    _metadata: {
      packId: 'dictionary-german',
      type: 'dictionary',
      targetLanguage: 'german',
      targetLanguageName: 'German',
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      totalWords,
      curriculumWords: totalWords, // All words are curriculum in Phase 1
      dictionaryOnlyWords: 0,
      files: {},
    },
  };

  for (const [bankFile, stats] of Object.entries(bankStats)) {
    manifest._metadata.files[bankFile] = stats.entries;
  }

  const manifestPath = path.join(DICT_PATH, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`\n  manifest.json: ${totalWords} total words`);
}

// Load verb classification data
let verbClassification = {};
if (fs.existsSync(VERB_CLASS_PATH)) {
  const raw = JSON.parse(fs.readFileSync(VERB_CLASS_PATH, 'utf-8'));
  const { _metadata, ...verbs } = raw;
  verbClassification = verbs;
  console.log(`Loaded verb classification for ${Object.keys(verbClassification).length} verbs\n`);
}

// Main
console.log('Enriching curriculum words for dictionary...\n');
console.log(`  Source: ${CORE_PATH}`);
console.log(`  Output: ${DICT_PATH}\n`);

// Ensure output directory exists
fs.mkdirSync(DICT_PATH, { recursive: true });

const bankStats = {};

for (const bankFile of BANK_FILES) {
  bankStats[bankFile] = enrichBank(bankFile);
}

generateManifest(bankStats);

console.log('\nDone! Dictionary bank files generated.');
