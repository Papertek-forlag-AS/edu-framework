#!/usr/bin/env node

/**
 * add-frequency-words.js
 *
 * Adds high-frequency German words from de_50k.txt that aren't already
 * in the dictionary. This fills gaps between the Goethe Wortlisten
 * and the frequency list, targeting common everyday words.
 *
 * Only adds words that:
 * 1. Are in the top N most frequent (default: 5000)
 * 2. Are not already in any dictionary bank
 * 3. Pass basic validation (length, no numbers, not a name, etc.)
 * 4. Look like valid German lemmas (not inflected forms)
 *
 * CEFR assignment by frequency rank:
 *   1-1000    → A1 (but most are already in dictionary)
 *   1001-2000 → A2
 *   2001-4000 → B1
 *   4001+     → B2
 *
 * Usage: node scripts/dictionary/add-frequency-words.js [--limit 5000]
 *
 * Run AFTER import-goethe-words.js but BEFORE add-frequency-data.js.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');

const DICT_PATH = path.join(ROOT, 'shared', 'vocabulary', 'dictionary', 'de');
const FREQ_PATH = path.join(ROOT, 'shared', 'vocabulary', 'dictionary', 'frequency', 'de_50k.txt');

const BANK_FILES = {
  noun: 'nounbank.json',
  verb: 'verbbank.json',
  adj: 'adjectivebank.json',
  other: 'generalbank.json',
};

// Parse CLI arguments
const args = process.argv.slice(2);
function getArgValue(name, defaultVal) {
  const idx = args.indexOf(name);
  return idx >= 0 && args[idx + 1] ? parseInt(args[idx + 1]) : defaultVal;
}

const FREQ_LIMIT = getArgValue('--limit', 5000);

/**
 * Generate a word ID from the word and type.
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
 * Determine CEFR level based on frequency rank.
 */
function rankToCefr(rank) {
  if (rank <= 1000) return 'A1';
  if (rank <= 2000) return 'A2';
  if (rank <= 4000) return 'B1';
  return 'B2';
}

/**
 * Detect word type from a German word.
 * Uses heuristics since frequency list doesn't include POS.
 */
function detectType(word) {
  // Capitalised = likely noun (German nouns are always capitalised)
  if (/^[A-ZÄÖÜ]/.test(word) && word.length >= 3) {
    return 'noun';
  }

  // Ends in common verb infinitive endings
  if (/^[a-zäöüß]/.test(word) && /(?:en|eln|ern)$/.test(word) && word.length >= 4) {
    return 'verb';
  }

  // Ends in common adjective suffixes
  if (/(?:ig|lich|isch|bar|sam|los|haft|voll|reich|frei|mäßig|förmig)$/.test(word)) {
    return 'adj';
  }

  return 'other';
}

/**
 * Validate a frequency word before adding to dictionary.
 * Filters out inflected forms, names, abbreviations, etc.
 */
function isValidFrequencyWord(word, rank) {
  // Must be at least 2 characters
  if (word.length < 2) return false;

  // No numbers
  if (/\d/.test(word)) return false;

  // No special characters (except German letters and hyphens)
  if (/[^a-zA-ZäöüÄÖÜß-]/.test(word)) return false;

  // No very long words (likely compounds or errors)
  if (word.length > 25) return false;

  // Skip common stop words that don't add value to a learner dictionary
  const stopWords = new Set([
    'ne', 'na', 'hm', 'oh', 'ah', 'ey', 'ach', 'aha', 'tja',
    'ok', 'okay', 'hä', 'nö', 'jo', 'ähm', 'ohh', 'mmm',
    'ha', 'ho', 'eh', 'äh', 'hmm', 'ooh', 'wow', 'hey',
  ]);
  if (stopWords.has(word.toLowerCase())) return false;

  // Skip very common function words already in most dictionaries
  // (they should already be in the dictionary from curriculum/Goethe)
  const functionWords = new Set([
    'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr',
    'mich', 'dich', 'sich', 'uns', 'euch',
    'mir', 'dir', 'ihm', 'ihr', 'uns',
    'mein', 'dein', 'sein', 'ihr', 'unser', 'euer',
    'der', 'die', 'das', 'den', 'dem', 'des',
    'ein', 'eine', 'einen', 'einem', 'einer', 'eines',
    'nicht', 'kein', 'keine', 'keinen', 'keinem', 'keiner',
    'und', 'oder', 'aber', 'denn', 'weil', 'wenn', 'als', 'dass',
    'in', 'an', 'auf', 'aus', 'bei', 'mit', 'nach', 'von', 'zu',
    'für', 'um', 'über', 'unter', 'vor', 'hinter', 'neben', 'zwischen',
    'ja', 'nein', 'doch', 'schon', 'noch', 'auch', 'nur', 'sehr',
    'so', 'da', 'hier', 'dort', 'dann', 'jetzt', 'immer', 'nie',
  ]);
  if (functionWords.has(word.toLowerCase())) return false;

  // Skip likely inflected verb forms (conjugated forms in the frequency list)
  // Present tense: -st, -t (but also legitimate adjectives end in -t)
  // Past tense: -te, -ten
  // These appear in the frequency list as their own entries
  const lower = word.toLowerCase();

  // Skip conjugated verb forms: "machst", "geht", "kommt"
  // But keep infinitives (-en, -eln, -ern) and adjectives (-ig, -lich, etc.)
  if (/^[a-zäöüß]/.test(lower)) {
    // Skip words ending in -st (2nd person: "machst", "gehst")
    // unless they're common adjectives/adverbs
    if (/st$/.test(lower) && lower.length > 4 && !/(Kunst|Dienst|Gunst|Wurst|Durst|Frost)$/i.test(word)) {
      // Only skip if it looks like a conjugation (short word, no adj suffix)
      if (!/(?:ig|lich|isch|bar|sam|los|haft)st$/.test(lower)) {
        // Skip common conjugations
        if (lower.length <= 8) return false;
      }
    }

    // Skip past tense forms ending in -te (but not nouns ending in -te)
    if (/te$/.test(lower) && /^[a-zäöüß]/.test(word) && lower.length <= 10) {
      // Allow words ending in common non-past-tense -te patterns
      if (!/(?:ite|ote|ute|äte|öte|üte)$/.test(lower)) {
        // Check: is this a known suffix that looks like past tense?
        // "hatte", "sagte", "machte" — skip these
        if (!/(?:leute|seite|sorte|rente|karte|liste|ernte)$/.test(lower)) {
          return false;
        }
      }
    }

    // Skip past participle forms: ge...t, ge...en
    if (/^ge[a-zäöüß]+(?:t|en)$/.test(lower)) return false;
    // Separable prefix past participles
    if (/^[a-zäöüß]+ge[a-zäöüß]+(?:t|en)$/.test(lower)) return false;

    // Skip plural forms of nouns that leaked to lowercase
    // (frequency list has both "Kinder" and "kinder")
    // Skip -er, -en, -es endings that look like inflected forms
    if (/(?:es|er)$/.test(lower) && lower.length <= 8 && !/(?:wasser|feuer|messer|finger|zimmer|fenster)$/.test(lower)) {
      // These could be inflected: "großes", "kleiner", "neues"
      // But also legitimate: "Wasser", "besser"
      // For safety, only skip if lowercase and short
    }
  }

  // Skip capitalised words that are likely proper names
  if (/^[A-ZÄÖÜ]/.test(word) && word.length >= 3) {
    // Common German names to skip
    const namePatterns = /^(Hans|Peter|Karl|Anna|Maria|Thomas|Michael|Christian|Martin|David|Daniel|Stefan|Frank|Markus|Paul|Max|Klaus|Werner|Andreas|Helga|Erich|Fritz|Heinrich|Gerhard|Walter|Ludwig|Rudolf|Helmut|Günter|Horst|Jürgen|Manfred|Rolf|Dieter|Wolfgang|Bernd|Uwe|Volker|Norbert|Gerd|Detlef|Ingo|Olaf|Rainer|Siegfried|Ulrich|Axel|Claus|Erwin|Hartmut|Jochen|Lothar|Ralf|Torsten|Wilfried)$/;
    if (namePatterns.test(word)) return false;
  }

  return true;
}

function main() {
  console.log(`Adding high-frequency words to dictionary (top ${FREQ_LIMIT})...\n`);

  // Load frequency data
  if (!fs.existsSync(FREQ_PATH)) {
    console.error(`Frequency file not found: ${FREQ_PATH}`);
    process.exit(1);
  }

  const freqLines = fs.readFileSync(FREQ_PATH, 'utf-8').trim().split('\n');
  console.log(`  Loaded ${freqLines.length} frequency entries`);

  // Parse top N frequency words
  const topWords = [];
  for (let i = 0; i < Math.min(FREQ_LIMIT, freqLines.length); i++) {
    const parts = freqLines[i].split(' ');
    const word = parts[0];
    const count = parseInt(parts[1]);
    topWords.push({ word, count, rank: i + 1 });
  }
  console.log(`  Using top ${topWords.length} words (rank 1-${topWords.length})\n`);

  // Load existing dictionary banks
  const bankData = {};
  for (const [bankType, bankFile] of Object.entries(BANK_FILES)) {
    const bankPath = path.join(DICT_PATH, bankFile);
    if (fs.existsSync(bankPath)) {
      bankData[bankType] = JSON.parse(fs.readFileSync(bankPath, 'utf-8'));
      const count = Object.keys(bankData[bankType]).filter(k => k !== '_metadata').length;
      console.log(`  Loaded ${bankFile}: ${count} entries`);
    }
  }

  // Also load banks we don't add to (for existence checking)
  const otherBanks = ['articlesbank.json', 'numbersbank.json', 'phrasesbank.json', 'pronounsbank.json'];
  const allExistingWords = new Map();
  for (const [bankType, data] of Object.entries(bankData)) {
    for (const [wordId, entry] of Object.entries(data)) {
      if (wordId === '_metadata') continue;
      allExistingWords.set(entry.word.toLowerCase(), { wordId, bankType, entry });
    }
  }
  for (const bankFile of otherBanks) {
    const bankPath = path.join(DICT_PATH, bankFile);
    if (fs.existsSync(bankPath)) {
      const data = JSON.parse(fs.readFileSync(bankPath, 'utf-8'));
      for (const [wordId, entry] of Object.entries(data)) {
        if (wordId === '_metadata') continue;
        allExistingWords.set(entry.word.toLowerCase(), { wordId, entry });
      }
    }
  }
  console.log(`  Total existing words: ${allExistingWords.size}\n`);

  // Process frequency words
  let added = 0;
  let alreadyExists = 0;
  let invalid = 0;
  const newWordsByBank = { noun: 0, verb: 0, adj: 0, other: 0 };

  for (const { word, rank } of topWords) {
    // Skip if already in dictionary
    if (allExistingWords.has(word.toLowerCase())) {
      alreadyExists++;
      continue;
    }

    // Validate
    if (!isValidFrequencyWord(word, rank)) {
      invalid++;
      continue;
    }

    // Determine type and target bank
    const type = detectType(word);
    const bankType = type === 'noun' ? 'noun'
      : type === 'verb' ? 'verb'
      : type === 'adj' ? 'adj'
      : 'other';

    const wordId = generateWordId(word, bankType);

    // Skip if ID already exists
    if (bankData[bankType] && bankData[bankType][wordId]) {
      alreadyExists++;
      continue;
    }

    // Create entry
    const entry = {
      word,
      _id: wordId,
      curriculum: false,
      cefr: rankToCefr(rank),
      frequency: rank,
    };

    if (type === 'noun') {
      // For nouns, we don't know the genus from frequency data alone
      // Set to null — can be enriched later from external sources
      entry.genus = null;
      entry.plural = null;
    }

    if (!bankData[bankType]) {
      // Create bank if it doesn't exist
      bankData[bankType] = {
        _metadata: {
          source: BANK_FILES[bankType],
          type: 'dictionary',
          targetLanguage: 'german',
          generatedAt: new Date().toISOString(),
        },
      };
    }

    bankData[bankType][wordId] = entry;
    newWordsByBank[bankType]++;
    allExistingWords.set(word.toLowerCase(), { wordId, bankType, entry });
    added++;
  }

  // Write updated banks
  console.log('  Writing updated banks:');
  for (const [bankType, bankFile] of Object.entries(BANK_FILES)) {
    if (!bankData[bankType]) continue;
    const bankPath = path.join(DICT_PATH, bankFile);
    const count = Object.keys(bankData[bankType]).filter(k => k !== '_metadata').length;
    fs.writeFileSync(bankPath, JSON.stringify(bankData[bankType], null, 2), 'utf-8');
    console.log(`    ${bankFile}: ${count} entries (+${newWordsByBank[bankType]} new)`);
  }

  // Update manifest
  const manifestPath = path.join(DICT_PATH, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const allBankFiles = [...Object.values(BANK_FILES), ...otherBanks];
    let totalWords = 0;
    let curriculumWords = 0;

    for (const bankFile of allBankFiles) {
      const bankPath = path.join(DICT_PATH, bankFile);
      if (!fs.existsSync(bankPath)) continue;
      const data = JSON.parse(fs.readFileSync(bankPath, 'utf-8'));
      for (const [wordId, entry] of Object.entries(data)) {
        if (wordId === '_metadata') continue;
        totalWords++;
        if (entry.curriculum === true) curriculumWords++;
      }
    }

    manifest.totalWords = totalWords;
    manifest.curriculumWords = curriculumWords;
    manifest.dictionaryOnlyWords = totalWords - curriculumWords;
    manifest.updatedAt = new Date().toISOString();
    if (!manifest.sources) manifest.sources = [];
    if (!manifest.sources.includes('frequency-de_50k')) {
      manifest.sources.push('frequency-de_50k');
    }

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    console.log(`\n  Manifest: ${totalWords} total (${curriculumWords} curriculum, ${totalWords - curriculumWords} dictionary-only)`);
  }

  // Summary
  console.log('\n  Summary:');
  console.log(`    Frequency words checked: ${topWords.length}`);
  console.log(`    Already in dictionary: ${alreadyExists}`);
  console.log(`    Invalid/filtered: ${invalid}`);
  console.log(`    New words added: ${added}`);
  console.log(`      Nouns: ${newWordsByBank.noun}`);
  console.log(`      Verbs: ${newWordsByBank.verb}`);
  console.log(`      Adjectives: ${newWordsByBank.adj}`);
  console.log(`      Other: ${newWordsByBank.other}`);

  console.log('\nDone! Run add-frequency-data.js and build-search-index.js next.');
}

main();
