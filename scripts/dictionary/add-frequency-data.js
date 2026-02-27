#!/usr/bin/env node

/**
 * add-frequency-data.js
 *
 * Reads word frequency data from de_50k.txt and assigns frequency ranks
 * to all words in the dictionary bank files.
 *
 * The frequency source (hermitdave/FrequencyWords, CC BY-SA 4.0) contains
 * inflected word forms from OpenSubtitles. Since our dictionary uses lemmas
 * (base forms), we look up each word in multiple ways:
 *   1. Exact match on the lemma (e.g., "Familie" → "familie")
 *   2. For nouns: also check with lowercase (German nouns are capitalised)
 *   3. For verbs: check the infinitive form
 *   4. Combined rank: use the best (lowest/most common) rank found
 *
 * Usage: node scripts/dictionary/add-frequency-data.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');

const DICT_PATH = path.join(ROOT, 'shared', 'vocabulary', 'dictionary', 'de');
const FREQ_PATH = path.join(ROOT, 'shared', 'vocabulary', 'dictionary', 'frequency', 'de_50k.txt');

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
 * Load frequency data from de_50k.txt
 * Returns a map: { word_lowercase: rank } where rank 1 = most common
 */
function loadFrequencyData() {
  if (!fs.existsSync(FREQ_PATH)) {
    console.error(`Frequency file not found: ${FREQ_PATH}`);
    console.error('Run: curl -o shared/vocabulary/dictionary/frequency/de_50k.txt https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/de/de_50k.txt');
    process.exit(1);
  }

  const lines = fs.readFileSync(FREQ_PATH, 'utf-8').trim().split('\n');
  const freqMap = {};

  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split(' ');
    const word = parts[0].toLowerCase();
    // Rank is 1-indexed position (i+1); lower = more common
    if (!freqMap[word]) {
      freqMap[word] = i + 1;
    }
  }

  return freqMap;
}

/**
 * Look up frequency rank for a word, trying multiple strategies.
 * Returns the best (lowest) rank found, or null if not found.
 */
function lookupFrequency(freqMap, word, wordId, type) {
  const candidates = [];

  // 1. Exact lowercase match
  const lower = word.toLowerCase();
  if (freqMap[lower]) {
    candidates.push(freqMap[lower]);
  }

  // 2. For multi-word entries (e.g., "sich freuen", "guten Morgen"),
  //    try the main content word (skip function words)
  if (word.includes(' ')) {
    const parts = word.split(' ');
    const skipWords = new Set([
      'sich', 'der', 'die', 'das', 'ein', 'eine', 'mich', 'dich',
      'auf', 'an', 'ab', 'aus', 'bei', 'ein', 'mit', 'nach', 'um',
      'vor', 'weg', 'zu', 'über', 'in', 'von', 'für', 'im',
    ]);
    // Find the main content word (first non-skip word, typically the verb/noun root)
    for (const part of parts) {
      const partLower = part.toLowerCase();
      if (skipWords.has(partLower)) continue;
      if (freqMap[partLower]) {
        candidates.push(freqMap[partLower]);
        break; // Only take the first content word match
      }
    }
  }

  // 3. For separable verbs (e.g., "aufstehen"), try the base verb
  //    aufstehen → stehen, einkaufen → kaufen, mitnehmen → nehmen
  if (type === 'verb' || wordId.endsWith('_verb')) {
    // Common separable prefixes
    const prefixes = ['auf', 'an', 'ab', 'aus', 'bei', 'ein', 'fern', 'her', 'hin',
                      'los', 'mit', 'nach', 'um', 'vor', 'weg', 'zu', 'zurück',
                      'zusammen', 'weiter', 'fest', 'teil'];
    for (const prefix of prefixes) {
      if (lower.startsWith(prefix) && lower.length > prefix.length + 2) {
        const baseVerb = lower.slice(prefix.length);
        if (freqMap[baseVerb]) {
          // Use a slightly worse rank for base verb match (add 10% penalty)
          candidates.push(Math.round(freqMap[baseVerb] * 1.1));
        }
      }
    }
  }

  // 4. For verbs with umlauts or special forms in the frequency list
  //    e.g., "können" might appear as "kann", "konnte" etc.
  //    Try common conjugated forms
  if (type === 'verb' || wordId.endsWith('_verb')) {
    // The frequency list has inflected forms, so common verbs might
    // appear as their conjugated forms. We just use the infinitive match.
    // This is good enough — the most common verbs will match.
  }

  // 5. Try without umlauts (frequency list might not have them)
  const noUmlauts = lower
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss');
  if (noUmlauts !== lower && freqMap[noUmlauts]) {
    candidates.push(freqMap[noUmlauts]);
  }

  // 6. For compound nouns (e.g., "Schultasche" = Schul+Tasche),
  //    try common splitting patterns. Use the head noun's rank with a penalty.
  if (candidates.length === 0 && (type === 'noun' || wordId.endsWith('_noun'))) {
    // Try suffixes of decreasing length (the head noun is usually the last part)
    for (let i = 3; i < lower.length - 2; i++) {
      const suffix = lower.slice(i);
      if (freqMap[suffix] && suffix.length >= 3) {
        // Compound noun penalty: rank * 1.5 (less common than base word)
        candidates.push(Math.round(freqMap[suffix] * 1.5));
        break; // Take the longest matching suffix
      }
    }
  }

  // 7. For words with trailing punctuation or special chars
  //    e.g., "Hallo!" → "hallo", "Super!" → "super"
  const cleaned = lower.replace(/[!?.,;:]+$/g, '').replace(/^[!?.,;:]+/g, '');
  if (cleaned !== lower && freqMap[cleaned]) {
    candidates.push(freqMap[cleaned]);
  }

  // 8. For ordinal numbers like "sechszehn", "dreizehnten" etc.
  //    Try removing ordinal suffix
  if (type === 'num' || wordId.endsWith('_num')) {
    const ordinalBase = lower.replace(/(st)?en$/, '').replace(/ten$/, '');
    if (ordinalBase !== lower && freqMap[ordinalBase]) {
      candidates.push(freqMap[ordinalBase]);
    }
    // Also try without "und" compound (einunddreißigsten → einunddreißig → dreißig)
    if (lower.includes('und')) {
      const afterUnd = lower.split('und').pop().replace(/(st)?en$/, '');
      if (freqMap[afterUnd]) {
        candidates.push(Math.round(freqMap[afterUnd] * 1.5));
      }
    }
    // Try base number without ß→ss and ordinal suffix
    const numCleaned = noUmlauts.replace(/(st)?en$/, '').replace(/ten$/, '');
    if (numCleaned !== noUmlauts && freqMap[numCleaned]) {
      candidates.push(freqMap[numCleaned]);
    }
  }

  // 9. For prefix-adjectives like "Lieblings-" → try "lieblings"
  if (lower.endsWith('-')) {
    const withoutDash = lower.slice(0, -1);
    if (freqMap[withoutDash]) {
      candidates.push(freqMap[withoutDash]);
    }
  }

  // 10. For phrases with "..." → try base phrase
  const withoutEllipsis = lower.replace(/\.{2,}/g, '').trim();
  if (withoutEllipsis !== lower && freqMap[withoutEllipsis]) {
    candidates.push(freqMap[withoutEllipsis]);
  }

  // Return best (lowest) rank
  if (candidates.length > 0) {
    return Math.min(...candidates);
  }
  return null;
}

function addFrequencyData() {
  console.log('Adding frequency data to dictionary banks...\n');

  const freqMap = loadFrequencyData();
  console.log(`  Loaded ${Object.keys(freqMap).length} frequency entries\n`);

  let totalWords = 0;
  let wordsWithFreq = 0;
  let wordsWithoutFreq = 0;
  const missingWords = [];

  for (const bankFile of BANK_FILES) {
    const bankPath = path.join(DICT_PATH, bankFile);
    if (!fs.existsSync(bankPath)) {
      console.warn(`  Skipping ${bankFile} (not found)`);
      continue;
    }

    const data = JSON.parse(fs.readFileSync(bankPath, 'utf-8'));
    let bankUpdated = 0;
    let bankMissing = 0;

    for (const [wordId, entry] of Object.entries(data)) {
      if (wordId === '_metadata') continue;

      totalWords++;

      const word = entry.word;
      const type = entry.type || bankFile.replace('bank.json', '');

      const rank = lookupFrequency(freqMap, word, wordId, type);

      if (rank !== null) {
        entry.frequency = rank;
        wordsWithFreq++;
        bankUpdated++;
      } else {
        entry.frequency = null;
        wordsWithoutFreq++;
        bankMissing++;
        missingWords.push({ wordId, word });
      }
    }

    // Write updated bank
    fs.writeFileSync(bankPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`  ${bankFile}: ${bankUpdated} ranked, ${bankMissing} missing`);
  }

  // Summary
  const coverage = ((wordsWithFreq / totalWords) * 100).toFixed(1);
  console.log(`\n  Total: ${totalWords} words`);
  console.log(`  With frequency: ${wordsWithFreq} (${coverage}%)`);
  console.log(`  Without frequency: ${wordsWithoutFreq}`);

  if (missingWords.length > 0 && missingWords.length <= 50) {
    console.log(`\n  Words without frequency data:`);
    for (const { wordId, word } of missingWords) {
      console.log(`    - ${word} (${wordId})`);
    }
  } else if (missingWords.length > 50) {
    console.log(`\n  First 30 words without frequency data:`);
    for (const { wordId, word } of missingWords.slice(0, 30)) {
      console.log(`    - ${word} (${wordId})`);
    }
    console.log(`    ... and ${missingWords.length - 30} more`);
  }

  console.log('\nDone! Frequency data added.');
}

addFrequencyData();
