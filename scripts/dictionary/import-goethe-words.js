#!/usr/bin/env node

/**
 * import-goethe-words.js
 *
 * Imports new words from parsed Goethe-Institut A1/A2 word lists into
 * the dictionary bank files. Skips words that already exist in the
 * curriculum (core) banks.
 *
 * This script:
 * 1. Reads parsed Goethe word lists from sources/goethe-a1-words.json
 *    and sources/goethe-a2-words.json
 * 2. Reads all existing dictionary bank files
 * 3. Identifies new words not already in the dictionary
 * 4. Adds them to the appropriate bank file (nounbank, verbbank, etc.)
 * 5. Sets cefr based on Goethe source level (A1 or A2)
 * 6. Sets curriculum: false for new dictionary-only words
 *
 * Run AFTER enrich-curriculum-words.js (which populates dictionary banks
 * from curriculum data).
 *
 * Usage: node scripts/dictionary/import-goethe-words.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');

const DICT_PATH = path.join(ROOT, 'shared', 'vocabulary', 'dictionary', 'de');
const SOURCES_PATH = path.join(ROOT, 'shared', 'vocabulary', 'dictionary', 'sources');

// Banks that Goethe words can be IMPORTED INTO (target banks)
const TARGET_BANK_FILES = {
  noun: 'nounbank.json',
  verb: 'verbbank.json',
  adj: 'adjectivebank.json',
  other: 'generalbank.json',
};

// ALL dictionary bank files (used for cross-bank duplicate detection)
const ALL_BANK_FILES = {
  noun: 'nounbank.json',
  verb: 'verbbank.json',
  adj: 'adjectivebank.json',
  other: 'generalbank.json',
  pronouns: 'pronounsbank.json',
  articles: 'articlesbank.json',
  numbers: 'numbersbank.json',
  phrases: 'phrasesbank.json',
};

/**
 * Generate a word ID from the word and type.
 * Follows the convention: lowercase_word_type
 * e.g., "Familie" + "noun" → "familie_noun"
 * e.g., "sich freuen" + "verb" → "sich_freuen_verb"
 */
function generateWordId(word, type) {
  const suffix = type === 'noun' ? 'noun'
    : type === 'verb' ? 'verb'
    : type === 'adj' ? 'adj'
    : 'general';

  const base = word
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  return `${base}_${suffix}`;
}

/**
 * Determine which bank a word type maps to.
 */
function getTargetBank(type) {
  if (type === 'noun') return 'noun';
  if (type === 'verb') return 'verb';
  // Adjectives and adverbs
  if (type === 'adj' || type === 'adjective') return 'adj';
  // Everything else goes to generalbank
  return 'other';
}

/**
 * Build a set of all existing words (by lowercase word text).
 */
function getExistingWords(bankData) {
  const existing = new Map();
  for (const [bankType, data] of Object.entries(bankData)) {
    for (const [wordId, entry] of Object.entries(data)) {
      if (wordId === '_metadata') continue;
      const key = entry.word.toLowerCase();
      existing.set(key, { wordId, bankType, entry });
    }
  }
  return existing;
}

/**
 * Validate a Goethe word entry before importing.
 * Returns true if the entry is valid for import.
 */
function isValidEntry(entry) {
  const word = entry.word;

  // Must have a word
  if (!word || word.length < 2) return false;

  // Skip entries with question marks, exclamation marks (likely sentence fragments)
  if (/[?!"]/.test(word)) return false;

  // Skip entries with numbers
  if (/\d/.test(word)) return false;

  // Skip entries that are too long (likely parsing artifacts)
  if (word.length > 25) return false;

  // Skip multi-word entries with more than 3 words (likely sentence fragments)
  if (word.split(/\s+/).length > 3) return false;

  // Skip entries that look like sentence fragments
  if (/^(ich|du|er|sie|es|wir|ihr|mein|dein|sein|hat|ist|war|hatte)\s/i.test(word)) return false;

  // Skip entries with parentheses (likely parsing artifacts like "(Pl.)", "(Sg.)")
  if (/^\(/.test(word) || /\)$/.test(word)) return false;

  // Skip entries with slashes (like "der/die", "geben/sagen")
  if (word.includes('/')) return false;

  // Skip entries that look like concatenated words from two-column PDF extraction
  // These often have two capital letters in the middle: "Feierfeiern"
  if (/[a-z][A-Z]/.test(word) && !word.includes(' ')) return false;

  // Skip concatenated lowercase words: look for repeated patterns or unusually long
  // single-word entries that don't exist in German vocabulary
  // e.g., "deindenn", "diesdir", "jedjetzt", "bestbestellen"
  // Heuristic: if removing a common prefix/suffix leaves another valid-looking word,
  // it's probably two words concatenated
  if (!word.includes(' ') && word.length > 6 && entry.type !== 'noun') {
    // Check for repeated syllable patterns
    const half = Math.floor(word.length / 2);
    const first = word.slice(0, half).toLowerCase();
    const second = word.slice(half).toLowerCase();
    if (first === second) return false; // e.g., "neinein" (never happens but safe)

    // Check for common German word endings appearing mid-word
    // suggesting concatenation point
    const midPatterns = /^(dies|dein|jed|best|lieb|unser|ander|eigen|feier|nächst|nein|mein|sein|kein)/i;
    const midMatch = word.toLowerCase().match(midPatterns);
    if (midMatch) {
      const withoutPrefix = word.slice(midMatch[0].length);
      // If the remainder looks like a standalone word (3+ chars, starts lowercase)
      if (withoutPrefix.length >= 3 && /^[a-zäöü]/.test(withoutPrefix)) return false;
    }
  }

  // Skip entries with trailing periods, dashes, or other artifacts
  if (/[."]$/.test(word) || /^[-]/.test(word)) return false;

  // Skip entries that are grammatical notation
  if (/^(-[a-z]|Sg\.|Pl\.)/.test(word)) return false;

  // Skip entries with comma-separated variants (e.g., "nächste, -er, -es")
  if (/,\s*-/.test(word)) return false;

  // Skip entries with "der, die, das" or similar article lists
  if (/^(der|die|das),/.test(word)) return false;

  // Skip compound entries with dashes that are notation (e.g., "dort, -her, -hin")
  if (word.split(',').length >= 2 && word.includes('-')) return false;

  // Skip entries ending with common verb conjugation endings if classified as 'other'
  // (they might be misclassified verb forms)
  if (entry.type === 'other') {
    // Skip words that look like conjugated verbs or past participles
    if (/^ge\w+t$/.test(word) || /^ge\w+en$/.test(word)) return false;
  }

  return true;
}

/**
 * Create a dictionary entry from a Goethe word.
 */
function createDictionaryEntry(goetheWord, wordId) {
  const entry = {
    word: goetheWord.word,
    _id: wordId,
    curriculum: false,
    cefr: goetheWord.cefr,
    frequency: null, // Will be filled by add-frequency-data.js
  };

  if (goetheWord.type === 'noun') {
    entry.genus = goetheWord.genus;
    if (goetheWord.plural) {
      entry.plural = goetheWord.plural;
    }
  }

  if (goetheWord.reflexive) {
    entry.reflexive = true;
  }

  return entry;
}

function main() {
  console.log('Importing Goethe-Institut words into dictionary banks...\n');

  // Load Goethe word lists
  const goetheFiles = [
    { path: path.join(SOURCES_PATH, 'goethe-a1-words.json'), level: 'A1' },
    { path: path.join(SOURCES_PATH, 'goethe-a2-words.json'), level: 'A2' },
    { path: path.join(SOURCES_PATH, 'goethe-b1-words.json'), level: 'B1' },
  ];

  let allGoetheWords = [];
  for (const { path: filePath, level } of goetheFiles) {
    if (!fs.existsSync(filePath)) {
      console.log(`  Skipping ${level} (file not found: ${filePath})`);
      console.log(`  Run: node scripts/dictionary/parse-goethe-pdf.js`);
      continue;
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`  Loaded ${level}: ${data.words.length} words`);
    allGoetheWords = allGoetheWords.concat(data.words);
  }

  if (allGoetheWords.length === 0) {
    console.log('\n  No Goethe words to import. Run parse-goethe-pdf.js first.');
    process.exit(0);
  }

  // Load ALL dictionary banks for cross-bank duplicate detection
  const allBankData = {};
  for (const [bankType, bankFile] of Object.entries(ALL_BANK_FILES)) {
    const bankPath = path.join(DICT_PATH, bankFile);
    if (fs.existsSync(bankPath)) {
      allBankData[bankType] = JSON.parse(fs.readFileSync(bankPath, 'utf-8'));
      const count = Object.keys(allBankData[bankType]).filter(k => k !== '_metadata').length;
      console.log(`  Loaded ${bankFile}: ${count} entries`);
    }
  }

  // Ensure target banks exist (create if missing)
  const bankData = {};
  for (const [bankType, bankFile] of Object.entries(TARGET_BANK_FILES)) {
    if (allBankData[bankType]) {
      bankData[bankType] = allBankData[bankType];
    } else {
      console.warn(`  Warning: ${bankFile} not found. Creating empty bank.`);
      bankData[bankType] = {
        _metadata: {
          source: bankFile,
          type: 'dictionary',
          targetLanguage: 'german',
          generatedAt: new Date().toISOString(),
          description: `Dictionary data for german ${bankFile} (includes curriculum words)`,
        },
      };
      allBankData[bankType] = bankData[bankType];
    }
  }

  // Build index of existing words across ALL banks (cross-bank duplicate detection)
  const existingWords = getExistingWords(allBankData);
  console.log(`\n  Total existing dictionary words (all banks): ${existingWords.size}`);

  // Process Goethe words
  let added = 0;
  let skipped = 0;
  let invalid = 0;
  let duplicateInGoethe = 0;
  let crossBankDuplicates = 0;
  const newWordsByBank = { noun: 0, verb: 0, adj: 0, other: 0 };
  const processedWords = new Set(); // Track within this import

  // Deduplicate: A1 entries take priority (lower CEFR level)
  // Sort so A1 comes before A2
  allGoetheWords.sort((a, b) => {
    if (a.cefr === 'A1' && b.cefr === 'A2') return -1;
    if (a.cefr === 'A2' && b.cefr === 'A1') return 1;
    return 0;
  });

  // Also track CEFR upgrades — if existing curriculum word is A2 but Goethe says A1
  let cefrUpgrades = 0;

  for (const goetheWord of allGoetheWords) {
    // Skip invalid entries
    if (!isValidEntry(goetheWord)) {
      invalid++;
      continue;
    }

    const wordKey = goetheWord.word.toLowerCase();

    // Skip if already processed in this import (dedup A1/A2 overlap)
    if (processedWords.has(wordKey)) {
      duplicateInGoethe++;
      continue;
    }
    processedWords.add(wordKey);

    // Check if word already exists in ANY dictionary bank (cross-bank check)
    const existing = existingWords.get(wordKey);
    if (existing) {
      // Word exists — but maybe we can update the CEFR level if Goethe says it's lower
      const existingCefr = existing.entry.cefr;
      const goetheCefr = goetheWord.cefr;
      if (existingCefr && goetheCefr) {
        const cefrOrder = { 'A1': 1, 'A2': 2, 'B1': 3, 'B2': 4, 'C1': 5, 'C2': 6 };
        if ((cefrOrder[goetheCefr] || 99) < (cefrOrder[existingCefr] || 99)) {
          // Goethe says this word is at a lower level — update
          existing.entry.cefr = goetheCefr;
          cefrUpgrades++;
        }
      }
      // Log cross-bank duplicates (word would go to target bank but exists in different bank)
      const targetBankType = getTargetBank(goetheWord.type);
      if (existing.bankType !== targetBankType) {
        crossBankDuplicates++;
      }
      skipped++;
      continue;
    }

    // New word — add to appropriate bank
    const bankType = getTargetBank(goetheWord.type);
    const bankFile = TARGET_BANK_FILES[bankType];
    const wordId = generateWordId(goetheWord.word, bankType);

    // Skip if ID already exists (different word mapped to same ID)
    if (bankData[bankType][wordId]) {
      skipped++;
      continue;
    }

    const entry = createDictionaryEntry(goetheWord, wordId);
    bankData[bankType][wordId] = entry;
    newWordsByBank[bankType]++;
    added++;
  }

  // Write updated target banks (only banks that Goethe words are imported into)
  console.log('\n  Writing updated banks:');
  for (const [bankType, bankFile] of Object.entries(TARGET_BANK_FILES)) {
    const bankPath = path.join(DICT_PATH, bankFile);
    const count = Object.keys(bankData[bankType]).filter(k => k !== '_metadata').length;
    fs.writeFileSync(bankPath, JSON.stringify(bankData[bankType], null, 2), 'utf-8');
    console.log(`    ${bankFile}: ${count} entries (+${newWordsByBank[bankType]} new)`);
  }

  // Update manifest (count words across ALL banks, not just target banks)
  const manifestPath = path.join(DICT_PATH, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const totalWords = Object.values(allBankData).reduce((sum, bank) =>
      sum + Object.keys(bank).filter(k => k !== '_metadata').length, 0);
    const curriculumWords = Object.values(allBankData).reduce((sum, bank) =>
      sum + Object.values(bank).filter(e => e.curriculum === true).length, 0);
    const dictionaryOnlyWords = totalWords - curriculumWords;

    manifest.totalWords = totalWords;
    manifest.curriculumWords = curriculumWords;
    manifest.dictionaryOnlyWords = dictionaryOnlyWords;
    manifest.updatedAt = new Date().toISOString();
    manifest.sources = [
      ...(manifest.sources || []).filter(s => !s.startsWith('goethe-')),
      'goethe-a1-wortliste',
      'goethe-a2-wortliste',
      'goethe-b1-wortliste',
    ];

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    console.log(`\n  Manifest updated: ${totalWords} total (${curriculumWords} curriculum, ${dictionaryOnlyWords} dictionary-only)`);
  }

  // Summary
  console.log('\n  Import summary:');
  console.log(`    Goethe entries processed: ${processedWords.size}`);
  console.log(`    New words added: ${added}`);
  console.log(`      Nouns: ${newWordsByBank.noun}`);
  console.log(`      Verbs: ${newWordsByBank.verb}`);
  console.log(`      Adjectives: ${newWordsByBank.adj}`);
  console.log(`      Other: ${newWordsByBank.other}`);
  console.log(`    Already in dictionary: ${skipped}`);
  console.log(`      (of which cross-bank duplicates: ${crossBankDuplicates})`);
  console.log(`    Invalid/skipped: ${invalid}`);
  console.log(`    Duplicates (A1/A2 overlap): ${duplicateInGoethe}`);
  console.log(`    CEFR level upgrades: ${cefrUpgrades}`);

  console.log('\nDone! Run add-frequency-data.js and build-search-index.js next.');
}

main();
