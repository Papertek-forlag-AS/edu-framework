#!/usr/bin/env node

/**
 * parse-goethe-pdf.js
 *
 * Parses extracted text from Goethe-Institut A1, A2, and B1 Wortliste PDFs
 * into structured JSON word lists.
 *
 * Input:  Text files extracted from PDFs using `pdftotext` (plain text)
 * Output: JSON files in shared/vocabulary/dictionary/sources/
 *
 * The PDFs have different formats:
 *
 * A1 (Start Deutsch 1):
 *   - Word entries are grouped together, followed by example sentences
 *   - Nouns: "der/die/das Word, -plural" (e.g., "die Adresse,-en")
 *   - Verbs: bare infinitive (e.g., "arbeiten")
 *   - Reflexive: "(sich) anmelden"
 *   - Umlaut plurals: "-Ä" or "-ä, e" or "-ü, e" (Goethe notation)
 *   - Sub-entries indented with spaces
 *   - Alphabetical list starts after "Alphabetische Wortliste"
 *
 * A2 (Goethe-Zertifikat A2):
 *   - Entries interleaved with example sentences
 *   - Verbs include conjugation: "abgeben, gibt ab, hat abgegeben"
 *   - Nouns: "die Adresse, -n"
 *   - Umlaut notation: "¨-e" means umlaut + suffix
 *   - Alphabetical list starts after "ALPHABETISCHER WORTSCHATZ"
 *
 * B1 (Goethe-Zertifikat B1):
 *   - Similar to A2 format, entries interleaved with examples
 *   - Two-column PDF layout: left column has entries, right has examples
 *   - Verbs: "abbiegen, biegt ab, bog ab, ist abgebogen"
 *   - Nouns: "der Abfall, ¨-e"
 *   - Regional variants: "(D)→A, CH: Matura"
 *   - Sub-entries (derivatives): indented under main entry
 *   - Page markers: "VS_03", "WORTLISTE", "ZERTIFIKAT B1"
 *   - Alphabetical list starts after "Alphabetischer Wortschatz" (second occurrence)
 *
 * Usage:
 *   node scripts/dictionary/parse-goethe-pdf.js [--a1 path] [--a2 path] [--b1 path]
 *
 * Defaults:
 *   --a1 /tmp/goethe-a1-text.txt
 *   --a2 /tmp/goethe-a2-text.txt
 *   --b1 /tmp/goethe-b1-text.txt
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const OUTPUT_DIR = path.join(ROOT, 'shared', 'vocabulary', 'dictionary', 'sources');

// Parse CLI arguments
const args = process.argv.slice(2);
function getArg(name, defaultVal) {
  const idx = args.indexOf(name);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : defaultVal;
}

const A1_PATH = getArg('--a1', '/tmp/goethe-a1-text.txt');
const A2_PATH = getArg('--a2', '/tmp/goethe-a2-text.txt');
const B1_PATH = getArg('--b1', '/tmp/goethe-b1-text.txt');

// ─── Common patterns ────────────────────────────────────────────────

const ARTICLE_REGEX = /^(der|die|das)\s+/;
const NOUN_ENTRY_REGEX = /^(der|die|das)\s+(.+?)(?:,\s*(.+))?$/;
const VERB_CONJUGATION_REGEX = /^(.+?),\s+((?:hat|ist|hatte|war)\s+.+)$/;
const REFLEXIVE_PREFIX = /^\(sich\)\s*/;

// Lines to skip in all files
const SKIP_PATTERNS = [
  /^VS_02_280312$/,
  /^VS_03_110716$/,
  /^VS_03$/,
  /^A2_Wortliste_03_200616$/,
  /^A2_Wortliste_03$/,
  /^Seite\s+\d+$/,
  /^Inventare$/,
  /^WORTLISTE$/,
  /^GOETHE-ZERTIFIKAT A2$/,
  /^ZERTIFIKAT B1$/,
  /^ALPHABETISCHER WORTSCHATZ$/,
  /^Alphabetischer Wortschatz$/,
  /^\d+$/,                      // bare page numbers
  /^200616$/,
  /^Felix Brandl/,
  /^Goethe-Institut/,
  /^Dachauer/,
  /^80637/,
  /^Literatur$/,
  /^VORWORT$/,
  /^INHALT$/,
];

// Single-letter section headers (A, B, C, ... Z)
function isSectionHeader(line) {
  return /^[A-ZÄÖÜ]$/.test(line.trim());
}

function shouldSkipLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (isSectionHeader(trimmed)) return true;
  for (const pat of SKIP_PATTERNS) {
    if (pat.test(trimmed)) return true;
  }
  return false;
}

// ─── Noun article/plural parsing ────────────────────────────────────

/**
 * Parse a Goethe-style plural notation into a standard plural form.
 * Examples:
 *   "die Adresse, -n" → { genus: "f", plural: "Adressen" }
 *   "der Apfel, ¨-" → { genus: "m", plural: "Äpfel" }
 *   "der Apfel, -Ä" → { genus: "m", plural: "Äpfel" } (A1 format)
 *   "der Zug, ¨-e" → { genus: "m", plural: "Züge" }
 *   "das Kind, -er" → { genus: "n", plural: "Kinder" }
 *   "der Arzt, ¨-e" → { genus: "m", plural: "Ärzte" }  (A2 umlaut notation)
 *   "der Pass, -ä, e" → { genus: "m", plural: "Pässe" }  (A1 notation)
 *   "die Oma, -s" → { genus: "f", plural: "Omas" }
 *   "der Kalender, -" → { genus: "m", plural: "Kalender" }
 *   "der Käse (Sg.)" → { genus: "m", plural: null }
 *   "das Alter (Sg.)" → { genus: "n", plural: null }
 */
function parseNounEntry(line) {
  const trimmed = line.trim();

  // Match article + noun + optional plural
  // In A2, lines like "das Kaufhaus, -¨er Meine Pullover..." have
  // the entry and example on the same line due to two-column PDF extraction.
  const m = trimmed.match(/^(der|die|das)\s+(.+?)(?:,\s*(.+))?$/);
  if (!m) return null;

  const article = m[1];
  let word = m[2].trim();
  let pluralNotation = m[3] ? m[3].trim() : null;

  // Clean up word: strip trailing example sentence text
  // e.g., "Frühstück Möchtest du ein Ei zum Frühstück?" → "Frühstück"
  // Pattern: a capitalized word, then a space, then an uppercase letter starting a sentence
  if (!pluralNotation) {
    const wordSentence = word.match(/^([A-ZÄÖÜa-zäöüß]+(?:\s*\([^)]+\))?)\s+[A-ZÄÖÜ][a-zäöüß]/);
    if (wordSentence && wordSentence[1].length < word.length) {
      word = wordSentence[1].trim();
    }
  }

  // Reject if the word contains sentence-like content (multiple lowercase words)
  if (word.split(/\s+/).length >= 3 && !/\(/.test(word)) return null;

  // Clean up plural notation: strip trailing example sentence text
  // In A2, two-column PDF extraction can append example text:
  // e.g., "-¨er Meine Pullover kaufe ich immer im Kaufhaus"
  // The plural notation part is just "-¨er", rest is example text.
  if (pluralNotation) {
    // Plural notation consists of: -, ¨, vowels/consonants for suffix, maybe comma-separated parts
    // If we see a capital letter after a space, it's likely the start of an example sentence
    const sentenceStart = pluralNotation.match(/\s+[A-ZÄÖÜ][a-zäöüß]/);
    if (sentenceStart) {
      pluralNotation = pluralNotation.slice(0, sentenceStart.index).trim();
    }
  }

  // Determine genus
  const genus = article === 'der' ? 'm' : article === 'die' ? 'f' : 'n';

  // Handle (Sg.) / (Sg) / (Sing.) / (Singular) - no plural
  if (/\(Sg\.?\)|\(Sing\.?\)|\(Singular\)/.test(word)) {
    word = word.replace(/\s*\((?:Sg|Sing|Singular)\.?\)/, '').trim();
    return { word, genus, plural: null, article };
  }
  if (pluralNotation && (/Sg\.?|Sing\.?|Singular/.test(pluralNotation))) {
    return { word, genus, plural: null, article };
  }

  // Clean trailing punctuation from word
  word = word.replace(/[.,;:!?]+$/, '').trim();
  if (!word) return null;

  // Handle (Pl.) - already plural
  if (word.includes('(Pl.)') || word.includes('(pl.)')) {
    word = word.replace(/\s*\([Pp]l\.?\)/, '').trim();
    // Strip trailing example text: "Lebensmittel 1. Lebensmittel werden..."
    word = word.replace(/\s+\d+\..*$/, '').trim();
    // Strip trailing sentence text
    const plWordParts = word.match(/^([A-ZÄÖÜa-zäöüß]+)/);
    if (plWordParts) word = plWordParts[1];
    return { word, genus, plural: word, article };
  }

  if (!pluralNotation || pluralNotation === '' || pluralNotation === '-') {
    // No change plural (e.g., "der Kalender, -" = "die Kalender")
    // or no plural given at all
    if (pluralNotation === '-') {
      return { word, genus, plural: word, article };
    }
    return { word, genus, plural: null, article };
  }

  // B1-specific: when plural is just "die" or "die\n", it means the PDF
  // merged the masculine noun with a following feminine form line:
  // "der Absender, die Absenderin, -nen" → parsed as "der Absender, die"
  // In this case, the word has no explicit plural — set to word itself (-er nouns)
  if (pluralNotation === 'die') {
    // Most -er masculine nouns have unchanged plural: "der Lehrer" → "die Lehrer"
    return { word, genus, plural: word, article };
  }

  // Strip trailing "→" from regional variant notation in plurals
  // e.g., "Altenheime →" → "Altenheime"
  if (pluralNotation.endsWith('→')) {
    pluralNotation = pluralNotation.replace(/\s*→\s*$/, '').trim();
  }
  // Strip regional variant info: "Aufzüge (D, A) →" → "Aufzüge"
  pluralNotation = pluralNotation.replace(/\s*\((?:D|A|CH)[^)]*\)\s*→?\s*$/, '').trim();

  // If plural notation is empty after cleaning, no plural known
  if (!pluralNotation) {
    return { word, genus, plural: null, article };
  }

  // Build the plural form
  const plural = buildPluralForm(word, pluralNotation);
  return { word, genus, plural, article };
}

function buildPluralForm(word, notation) {
  // Clean up the notation
  let n = notation.trim();

  // A1 format: "-Ä" means umlaut on last vowel of stem, no suffix
  // e.g., "der Apfel, -Ä" → "Äpfel"
  if (n === '-Ä' || n === '-ä') {
    return applyUmlaut(word);
  }

  // A1 format: "-Ä, e" means umlaut + suffix "e"
  // e.g., "der Arzt, -Ä, e" → "Ärzte"
  const a1CapUmlautMatch = n.match(/^-Ä,?\s*(.*)$/);
  if (a1CapUmlautMatch) {
    const suffix = a1CapUmlautMatch[1] || '';
    return applyUmlaut(word) + suffix;
  }

  // A2 format with ¨ (combining diaeresis) indicating umlaut
  // Patterns: "¨-", "-¨", "¨-e", "-¨e", "¨-er", "-¨er", etc.
  // e.g., "der Apfel, ¨-" → "Äpfel"
  // e.g., "der Arzt, ¨-e" → "Ärzte"
  // e.g., "die Ankunft, -¨e" → "Ankünfte"
  // e.g., "das Kaufhaus, -¨er" → "Kaufhäuser"
  if (n.includes('¨')) {
    // Extract the suffix after removing all ¨ and leading dashes
    const suffix = n.replace(/[¨\-–]/g, '').trim();
    if (!suffix) {
      // No suffix, just umlaut (e.g., "¨-" or "-¨")
      return applyUmlaut(word);
    }
    return applyUmlaut(word) + suffix;
  }

  // A1 format: "-ä, e" or "-ü, e" or "-ü, er" means umlaut + suffix
  // e.g., "der Zug, -ü, e" → "Züge", "der Aufzug, -ü, e" → "Aufzüge"
  const a1UmlautMatch = n.match(/^-([äöü]),?\s*(.*)$/);
  if (a1UmlautMatch) {
    const umlautChar = a1UmlautMatch[1];
    const suffix = a1UmlautMatch[2] || '';
    return applySpecificUmlaut(word, umlautChar) + suffix;
  }

  // Simple suffix: "-en", "-n", "-e", "-er", "-s", "-nen" etc.
  if (n.startsWith('-')) {
    const suffix = n.slice(1).trim();
    // Avoid doubling the last letter:
    // "Adresse" + "-en" should be "Adressen" not "Adresseen"
    // If word ends with the first char of suffix, skip it
    if (suffix.length > 0 && word.endsWith(suffix[0])) {
      return word + suffix.slice(1);
    }
    return word + suffix;
  }

  // Handle missing dash — a single lowercase letter is likely a suffix
  // e.g., "der Zeitpunkt, e" means "Zeitpunkte" (dash was lost in PDF extraction)
  if (/^[a-zäöü]{1,3}$/.test(n)) {
    if (n.length > 0 && word.endsWith(n[0])) {
      return word + n.slice(1);
    }
    return word + n;
  }

  // Full plural form given (e.g., "Leute")
  return n;
}

/**
 * Apply umlaut to the last umlaut-able vowel in the word.
 * a→ä, o→ö, u→ü, au→äu
 */
function applyUmlaut(word) {
  // Find the last occurrence of a/o/u/au and replace with ä/ö/ü/äu
  // Work from right to left
  const chars = [...word];
  for (let i = chars.length - 1; i >= 0; i--) {
    const lower = chars[i].toLowerCase();
    if (lower === 'u') {
      // Check for "au" → "äu"
      if (i > 0 && chars[i - 1].toLowerCase() === 'a') {
        chars[i - 1] = chars[i - 1] === 'A' ? 'Ä' : 'ä';
        return chars.join('');
      }
      chars[i] = chars[i] === 'U' ? 'Ü' : 'ü';
      return chars.join('');
    }
    if (lower === 'o') {
      chars[i] = chars[i] === 'O' ? 'Ö' : 'ö';
      return chars.join('');
    }
    if (lower === 'a') {
      chars[i] = chars[i] === 'A' ? 'Ä' : 'ä';
      return chars.join('');
    }
  }
  return word; // No umlaut-able vowel found
}

/**
 * Apply a specific umlaut character to the word.
 * For A1 notation like "-ä, e" → find 'a' and replace with 'ä'
 */
function applySpecificUmlaut(word, umlautChar) {
  const baseChar = umlautChar === 'ä' ? 'a' : umlautChar === 'ö' ? 'o' : 'u';
  const chars = [...word];
  // Find the last occurrence of the base vowel
  for (let i = chars.length - 1; i >= 0; i--) {
    if (chars[i].toLowerCase() === baseChar) {
      chars[i] = chars[i] === chars[i].toUpperCase()
        ? umlautChar.toUpperCase()
        : umlautChar;
      return chars.join('');
    }
  }
  return word;
}

// ─── Word type detection ────────────────────────────────────────────

function detectWordType(line) {
  const trimmed = line.trim();

  // Noun: starts with article
  if (/^(der|die|das)\s+[A-ZÄÖÜ]/.test(trimmed)) {
    return 'noun';
  }

  // Verb with conjugation info (A2 format): "arbeiten, arbeitet, hat gearbeitet"
  if (/,\s+(hat|ist|hatte|war)\s+/.test(trimmed)) {
    return 'verb';
  }

  // Verb: ends with -en, -eln, -ern (common infinitive endings)
  if (/^(\(sich\)\s+)?[a-zäöüß].*(?:en|eln|ern)$/.test(trimmed)) {
    return 'verb';
  }

  // Verb: starts with verb and has conjugation on same line
  // e.g., "anrufen, ruft an,"
  if (/^[a-zäöüß].*,\s+\w+\s+(an|ab|auf|aus|ein|mit|nach|um|vor|weg|zu|zurück)/
    .test(trimmed)) {
    return 'verb';
  }

  // Multi-line verb detection happens in parser context

  return 'other'; // adjective, adverb, preposition, conjunction, etc.
}

// ─── A1 Parser ──────────────────────────────────────────────────────

function parseA1(text) {
  const lines = text.split('\n');
  const words = [];
  const seen = new Set();

  // Find start of alphabetical list
  let startIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === 'Alphabetische' &&
        i + 1 < lines.length && lines[i + 1].trim() === 'Wortliste') {
      startIdx = i + 2;
      break;
    }
  }

  // Find end (Literatur section)
  let endIdx = lines.length;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim() === 'Literatur') {
      endIdx = i;
      break;
    }
  }

  /**
   * A1 format has word entries grouped in blocks, then example sentences.
   * Entries are recognizable because they:
   * - Start with an article (noun)
   * - Are a lowercase word ending in -en/-eln/-ern (verb)
   * - Are a simple word without full sentence structure
   *
   * Example sentences:
   * - Start with a capital letter and contain spaces (are full sentences)
   * - Often have punctuation at the end
   */

  for (let i = startIdx; i < endIdx; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (shouldSkipLine(trimmed)) continue;

    // Check if this is an example sentence (skip)
    if (isExampleSentence(trimmed)) continue;

    // Check for sub-entries (indented with spaces in A1)
    const isSubEntry = line.startsWith('  ') && !line.startsWith('   ');

    // Try to parse as noun
    const nounInfo = parseNounEntry(trimmed);
    if (nounInfo) {
      const key = nounInfo.word.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        words.push({
          word: nounInfo.word,
          type: 'noun',
          genus: nounInfo.genus,
          article: nounInfo.article,
          plural: nounInfo.plural,
          cefr: 'A1',
          source: 'goethe-a1',
          isSubEntry,
        });
      }
      continue;
    }

    // Try to parse as verb or other word
    const type = detectWordType(trimmed);
    let word = trimmed;
    let reflexive = false;

    // Handle reflexive verbs
    if (REFLEXIVE_PREFIX.test(word)) {
      reflexive = true;
      word = word.replace(REFLEXIVE_PREFIX, '').trim();
    }

    // Clean up verb entries
    if (type === 'verb') {
      // Remove conjugation parts if present
      const parts = word.split(',');
      word = parts[0].trim();
    }

    // Skip if it looks like a partial line or continuation
    if (word.length < 2) continue;
    // Skip numbered items
    if (/^\d+\./.test(word)) continue;

    const key = word.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      words.push({
        word,
        type,
        cefr: 'A1',
        source: 'goethe-a1',
        isSubEntry,
        ...(reflexive ? { reflexive: true } : {}),
      });
    }
  }

  return words;
}

// ─── A2 Parser ──────────────────────────────────────────────────────

function parseA2(text) {
  const lines = text.split('\n');
  const words = [];
  const seen = new Set();

  // Find start of alphabetical word list.
  // The A2 PDF has a two-column layout, and pdftotext merges columns,
  // causing some alphabetical entries to appear BEFORE the "ALPHABETISCHER
  // WORTSCHATZ" heading. We use the heading as a reference point, then
  // scan backwards to find where alphabetical entries actually begin.
  // The word groups section ends with ordinals/numbers ("einmal", "zweimal", etc.)
  // followed by page markers, then alphabetical entries start.
  let headingIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === 'ALPHABETISCHER WORTSCHATZ') {
      headingIdx = i;
      break;
    }
  }

  // Scan backwards from heading to find the real start.
  // Look for page/section markers and skip past them.
  let startIdx = headingIdx;
  for (let i = headingIdx - 1; i >= 0; i--) {
    const t = lines[i].trim();
    // Skip empty lines, page markers, and section markers
    if (!t || /^(WORTLISTE|\d+|GOETHE-ZERTIFIKAT A2|A2_Wortliste_03_200616)$/.test(t)) {
      continue;
    }
    // If we hit ordinal/number patterns (end of word groups), stop here
    if (/^(einmal|zweimal|dreimal|viermal|erstens|zweitens|drittens|viertens)$/.test(t) ||
        /^\d+\.\s+(erstens|zweitens|drittens|viertens)$/.test(t) ||
        /^der\/die\s+/.test(t)) {
      startIdx = i + 1;
      break;
    }
    // If we see what looks like an alphabetical entry, keep going back
    if (/^(der|die|das)\s+[A-ZÄÖÜ]/.test(t) || // noun
        /^[a-zäöüß]/.test(t) || // verb/adjective
        /^\(sich\)/.test(t) || // reflexive
        /^(hat|ist)\s+/.test(t) || // verb continuation
        isExampleSentence(t)) { // example sentence
      startIdx = i;
      continue;
    }
    // Unknown — keep scanning back
  }

  // Safety: don't go earlier than line 400 (word groups are before that)
  if (startIdx < 400) startIdx = headingIdx + 1;

  // Find end of word list (usually around line 6570+)
  let endIdx = lines.length;
  for (let i = lines.length - 1; i >= 0; i--) {
    const t = lines[i].trim();
    if (t === 'Felix Brandl | München' || t.startsWith('Felix Brandl')) {
      endIdx = i;
      break;
    }
  }

  /**
   * A2 format interleaves entries with example sentences.
   * Entry patterns:
   * - "die Adresse, -n"  (noun)
   * - "abgeben, gibt ab, hat abgegeben"  (verb with conjugation, multi-line)
   * - "abgeben,"  / "gibt ab," / "hat abgegeben"  (verb split across lines)
   * - "aktiv"  (adjective/adverb)
   * - "(sich) ärgern, ärgert, hat geärgert" (reflexive verb)
   * - "(an-)/(aus)ziehen, zieht (an/aus), hat/ist (an/aus)gezogen" (complex verb)
   */

  let i = startIdx;
  while (i < endIdx) {
    const trimmed = lines[i].trim();

    if (shouldSkipLine(trimmed)) {
      i++;
      continue;
    }

    // Skip example sentences
    if (isExampleSentence(trimmed)) {
      i++;
      continue;
    }

    // Try to parse as noun entry
    const nounInfo = parseNounEntry(trimmed);
    if (nounInfo) {
      const key = nounInfo.word.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        words.push({
          word: nounInfo.word,
          type: 'noun',
          genus: nounInfo.genus,
          article: nounInfo.article,
          plural: nounInfo.plural,
          cefr: 'A2',
          source: 'goethe-a2',
        });
      }
      i++;
      continue;
    }

    // Try to parse as verb entry (may span multiple lines)
    const verbResult = tryParseVerbA2(lines, i, endIdx);
    if (verbResult) {
      const { entry, nextIdx } = verbResult;
      const key = entry.word.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        words.push({
          ...entry,
          cefr: 'A2',
          source: 'goethe-a2',
        });
      }
      i = nextIdx;
      continue;
    }

    // Try to parse as other word (adjective, adverb, preposition, etc.)
    const otherResult = tryParseOtherEntry(trimmed);
    if (otherResult) {
      const key = otherResult.word.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        words.push({
          ...otherResult,
          cefr: 'A2',
          source: 'goethe-a2',
        });
      }
      i++;
      continue;
    }

    i++;
  }

  return words;
}

/**
 * Try to parse a multi-line verb entry in A2 format.
 * Patterns:
 *   "abgeben,"            ← line 1
 *   "gibt ab,"            ← line 2 (3rd person)
 *   "hat abgegeben"       ← line 3 (perfect)
 *
 *   "arbeiten, arbeitet, Wo arbeiten Sie?"  ← all on one line (with example)
 *   "hat gearbeitet"                         ← continuation
 *
 *   "(sich) ärgern,"      ← reflexive
 *   "ärgert,"
 *   "hat geärgert"
 */
function tryParseVerbA2(lines, idx, endIdx) {
  const line = lines[idx].trim();

  // Pattern 1: Full verb entry on one line (with hat/ist)
  // e.g., "abholen, holt ab, hat abgeholt"
  const fullMatch = line.match(
    /^(\(sich\)\s+)?([a-zäöüß]+(?:\s+[a-zäöüß]+)?),\s+.+,\s+(hat|ist)\s+\S+/
  );
  if (fullMatch) {
    let word = fullMatch[2];
    const reflexive = !!fullMatch[1];
    return {
      entry: {
        word: reflexive ? `sich ${word}` : word,
        type: 'verb',
        ...(reflexive ? { reflexive: true } : {}),
      },
      nextIdx: idx + 1,
    };
  }

  // Pattern 2: Verb entry split across lines, starting with "word," on first line
  // Must be a word ending in -en/-eln/-ern followed by a comma
  const verbStartMatch = line.match(
    /^(\(sich\)\s+)?(\(?(?:an-?\)?\/?)?(?:\(?aus\)?)?[a-zäöüß]+(?:en|eln|ern)),?$/
  );
  if (verbStartMatch) {
    let word = verbStartMatch[2];
    const reflexive = !!verbStartMatch[1];

    // Clean up complex verb patterns like "(an-)/(aus)ziehen"
    word = word.replace(/\(an-?\)\/?/g, '').replace(/\(aus\)/g, '').trim();

    // Look ahead for conjugation lines (up to 3 lines)
    let nextIdx = idx + 1;
    for (let j = idx + 1; j < Math.min(idx + 4, endIdx); j++) {
      const nextLine = lines[j].trim();
      if (!nextLine) {
        nextIdx = j + 1;
        continue;
      }
      // Conjugation line: "gibt ab," or "hat abgegeben"
      if (/^(hat|ist|hatte|war)\s+/.test(nextLine) ||
          /,\s*$/.test(nextLine) && !isExampleSentence(nextLine)) {
        nextIdx = j + 1;
      } else {
        break;
      }
    }

    return {
      entry: {
        word: reflexive ? `sich ${word}` : word,
        type: 'verb',
        ...(reflexive ? { reflexive: true } : {}),
      },
      nextIdx,
    };
  }

  return null;
}

/**
 * Try to parse a non-noun, non-verb entry.
 */
function tryParseOtherEntry(line) {
  const trimmed = line.trim();

  // Must be a simple word (no sentence structure)
  // Allow hyphens (e.g., "all-"), parentheses, spaces for compound terms

  // Skip things that are clearly example sentences
  if (isExampleSentence(trimmed)) return null;

  // Skip single characters
  if (trimmed.length < 2) return null;

  // Skip numbered items
  if (/^\d+\./.test(trimmed)) return null;

  // Must start with lowercase letter or (
  if (!/^[a-zäöüß(]/.test(trimmed)) return null;

  // Must not be a continuation line (like "hat gearbeitet" by itself)
  if (/^(hat|ist|hatte|war)\s+\w+/.test(trimmed)) return null;
  // Skip lines that end with comma (likely verb conjugation continuations)
  if (/,\s*$/.test(trimmed)) return null;

  // Must be short (max ~3 words for an entry)
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount > 4) return null;

  // Handle reflexive prefix
  let word = trimmed;
  let reflexive = false;
  if (REFLEXIVE_PREFIX.test(word)) {
    reflexive = true;
    word = word.replace(REFLEXIVE_PREFIX, '').trim();
  }

  // Remove trailing period or comma
  word = word.replace(/[.,;:]+$/, '').trim();

  if (word.length < 2) return null;

  // Determine more specific type
  let type = 'other';
  if (/(?:en|eln|ern)$/.test(word) && /^[a-zäöüß]/.test(word)) {
    type = 'verb';
  }

  return {
    word: reflexive ? `sich ${word}` : word,
    type,
    ...(reflexive ? { reflexive: true } : {}),
  };
}

// ─── Sentence detection ─────────────────────────────────────────────

/**
 * Heuristic to detect if a line is an example sentence rather than a word entry.
 */
function isExampleSentence(line) {
  const trimmed = line.trim();

  // Empty lines
  if (!trimmed) return false;

  // Very short = likely a word entry
  if (trimmed.length <= 15 && !trimmed.includes(' ')) return false;

  // Starts with capital + contains multiple words + sentence-like structure
  if (/^[A-ZÄÖÜ][a-zäöüß]/.test(trimmed) && trimmed.split(/\s+/).length >= 3) {
    // But not if it looks like a noun entry (article + noun)
    if (/^(der|die|das)\s+[A-ZÄÖÜ]/.test(trimmed)) return false;
    // Example sentences often have verbs, punctuation
    if (/[.!?]$/.test(trimmed) || trimmed.includes(',') || trimmed.length > 30) {
      return true;
    }
  }

  // Lines starting with common sentence starters
  if (/^(Ich|Er|Sie|Wir|Du|Es|Mein|Dein|Ihr|Unser|Wo|Wann|Wie|Was|Können|Haben|Ist|Sind|Bitte|Komm|Heute|Morgen|Gestern|Im|In|Am|Der |Die |Das |Den |Dem |Ein |Eine )/.test(trimmed) &&
      trimmed.split(/\s+/).length >= 3) {
    // But not noun entries
    if (/^(der|die|das)\s+[A-ZÄÖÜ]\w+,\s*[-¨]/.test(trimmed)) return false;
    // Not noun entries without comma
    if (/^(der|die|das)\s+[A-ZÄÖÜ]\w+\s*$/.test(trimmed)) return false;
    // This is most likely a sentence
    return true;
  }

  // Long lines with spaces are likely sentences
  // But not if they start with an article + noun (could be noun entry + example text)
  if (trimmed.length > 40 && trimmed.split(/\s+/).length >= 5) {
    if (/^(der|die|das)\s+[A-ZÄÖÜ]/.test(trimmed)) return false;
    return true;
  }

  // Lines ending with punctuation (sentences)
  if (/[.!?…]$/.test(trimmed) && trimmed.split(/\s+/).length >= 3) {
    return true;
  }

  // Lines starting with "– " (dialog-style answers)
  if (/^[–-]\s/.test(trimmed)) return true;

  return false;
}

// ─── B1 Parser ──────────────────────────────────────────────────────

function parseB1(text) {
  const lines = text.split('\n');
  const words = [];
  const seen = new Set();

  // Find start of alphabetical word list.
  // The B1 PDF has "Alphabetischer Wortschatz" in the TOC (line ~211)
  // and then again at line ~1411 where the actual list starts.
  // We want the second occurrence.
  let headingCount = 0;
  let startIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === 'Alphabetischer Wortschatz') {
      headingCount++;
      if (headingCount >= 2) {
        startIdx = i + 1;
        break;
      }
    }
  }

  // If only one heading found, use it
  if (headingCount === 1) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === 'Alphabetischer Wortschatz') {
        startIdx = i + 1;
        break;
      }
    }
  }

  // Find end of word list — look for end-of-document markers
  let endIdx = lines.length;
  for (let i = lines.length - 1; i > startIdx; i--) {
    const t = lines[i].trim();
    // The B1 PDF ends with page number and version marker
    if (t === 'VS_03_110716' || t === 'VS_03') {
      // Check if we're near the end (last 100 lines)
      if (i > lines.length - 100) {
        endIdx = i;
        break;
      }
    }
  }

  // B1-specific skip patterns (in addition to common ones)
  const b1SkipPatterns = [
    /^VS_03_110716$/,
    /^VS_03$/,
    /^ZERTIFIKAT B1$/,
    /^Alphabetischer Wortschatz$/,
    /^VORWORT$/,
    /^INHALT$/,
    /^z\.\s*B\.\s/,              // "z. B. Einzelkind, Einzelzimmer"
    /^→\s*(D|A|CH):/,            // Regional variant references like "→ D, A: Hausmeister"
  ];

  function shouldSkipB1(line) {
    const trimmed = line.trim();
    if (shouldSkipLine(trimmed)) return true;
    for (const pat of b1SkipPatterns) {
      if (pat.test(trimmed)) return true;
    }
    return false;
  }

  let i = startIdx;
  while (i < endIdx) {
    const trimmed = lines[i].trim();

    if (shouldSkipB1(trimmed)) {
      i++;
      continue;
    }

    // Skip example sentences
    if (isExampleSentence(trimmed)) {
      i++;
      continue;
    }

    // Skip B1-specific patterns
    if (isB1SkippableLine(trimmed)) {
      i++;
      continue;
    }

    // Strip regional variant suffix from entry lines
    // e.g., "das Abitur (D)→A, CH:" → "das Abitur"
    // e.g., "das Altenheim, -e → Altersheim" → "das Altenheim, -e"
    let lineToProcess = trimmed
      .replace(/\s*\((?:D|A|CH)\)\s*→.*$/, '')
      .replace(/\s*→\s*(?:D|A|CH)[,:\s].*$/, '')
      .replace(/\s*→\s*[A-ZÄÖÜa-zäöü]+$/, '')  // "→ Altersheim"
      .replace(/\s*\((?:D|A|CH)\)\s*$/, '')
      .trim();

    // Try to parse as noun entry
    const nounInfo = parseNounEntry(lineToProcess);
    if (nounInfo) {
      // Extra B1 validation for nouns
      // Skip feminine form duplicates (e.g., "die Absenderin, -nen" when "der Absender" already exists)
      if (nounInfo.word.endsWith('in') && nounInfo.genus === 'f') {
        const maleForm = nounInfo.word.replace(/in$/, '').replace(/er$/, 'er');
        if (seen.has(maleForm.toLowerCase()) || seen.has((maleForm + 'er').toLowerCase())) {
          // Still add it but check more carefully
        }
      }
      const key = nounInfo.word.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        words.push({
          word: nounInfo.word,
          type: 'noun',
          genus: nounInfo.genus,
          article: nounInfo.article,
          plural: nounInfo.plural,
          cefr: 'B1',
          source: 'goethe-b1',
        });
      }
      i++;
      continue;
    }

    // Try to parse as verb entry (may span multiple lines)
    const verbResult = tryParseVerbB1(lines, i, endIdx);
    if (verbResult) {
      const { entry, nextIdx } = verbResult;
      const key = entry.word.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        words.push({
          ...entry,
          cefr: 'B1',
          source: 'goethe-b1',
        });
      }
      i = nextIdx;
      continue;
    }

    // Try to parse as other word (adjective, adverb, preposition, etc.)
    const otherResult = tryParseOtherEntryB1(lineToProcess);
    if (otherResult) {
      const key = otherResult.word.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        words.push({
          ...otherResult,
          cefr: 'B1',
          source: 'goethe-b1',
        });
      }
      i++;
      continue;
    }

    i++;
  }

  return words;
}

/**
 * Try to parse a multi-line verb entry in B1 format.
 * B1 verbs include past tense forms:
 *   "abbiegen, biegt ab,"            ← line 1
 *   "bog ab, ist abgebogen"          ← line 2
 *
 *   "abhängen, hängt ab, hing"       ← line 1
 *   "ab, hat abgehangen (von)"       ← line 2
 *
 *   "sich lohnen, lohnt sich,"       ← line 1
 *   "lohnte sich,"                   ← line 2
 *   "hat sich gelohnt"               ← line 3
 *
 *   "achten, achtet, achtete,"       ← line 1 (regular verb all on one line)
 *   "hat geachtet (auf)"             ← line 2
 */
function tryParseVerbB1(lines, idx, endIdx) {
  const line = lines[idx].trim();

  // Strip regional variant notation
  const cleanLine = line.replace(/\s*\((?:D|A|CH)\)\s*→.*$/, '').trim()
    .replace(/\s*\((?:D|A|CH)\)\s*$/, '').trim();

  // Pattern 1: Full verb entry on one line with "hat/ist"
  // e.g., "achten, achtet, achtete, hat geachtet"
  const fullMatch = cleanLine.match(
    /^((?:sich\s+)?[a-zäöüß]+(?:\s+[a-zäöüß]+)?),\s+.+,\s+(hat|ist)\s+\S+/
  );
  if (fullMatch) {
    let word = fullMatch[1].trim();
    const reflexive = word.startsWith('sich ');
    if (reflexive) word = word.replace(/^sich\s+/, '');
    return {
      entry: {
        word: reflexive ? `sich ${word}` : word,
        type: 'verb',
        ...(reflexive ? { reflexive: true } : {}),
      },
      nextIdx: idx + 1,
    };
  }

  // Pattern 2: "(sich) verb," or "sich verb," starting a multi-line entry
  const reflexiveVerbMatch = cleanLine.match(
    /^(\(sich\)\s+|sich\s+)([a-zäöüß]+(?:en|eln|ern)),?\s*/
  );
  if (reflexiveVerbMatch) {
    const word = reflexiveVerbMatch[2];
    // Look ahead for conjugation continuation lines
    let nextIdx = idx + 1;
    for (let j = idx + 1; j < Math.min(idx + 5, endIdx); j++) {
      const nextLine = lines[j].trim();
      if (!nextLine) { nextIdx = j + 1; continue; }
      if (shouldSkipLine(nextLine)) { nextIdx = j + 1; continue; }
      // Continuation: "lohnt sich," or "lohnte sich," or "hat sich gelohnt"
      if (/^(hat|ist)\s+/.test(nextLine) ||
          /sich[,\s]/.test(nextLine) && nextLine.split(/\s+/).length <= 4 ||
          /,\s*$/.test(nextLine) && !isExampleSentence(nextLine) && nextLine.split(/\s+/).length <= 4) {
        nextIdx = j + 1;
      } else {
        break;
      }
    }
    return {
      entry: {
        word: `sich ${word}`,
        type: 'verb',
        reflexive: true,
      },
      nextIdx,
    };
  }

  // Pattern 3: Verb starting with infinitive followed by comma
  // e.g., "abbiegen, biegt ab," or "achten, achtet, achtete,"
  const verbStartMatch = cleanLine.match(
    /^([a-zäöüß]+(?:en|eln|ern)),\s+/
  );
  if (verbStartMatch) {
    const word = verbStartMatch[1];

    // Look ahead for continuation lines (conjugation forms, hat/ist lines)
    let nextIdx = idx + 1;
    for (let j = idx + 1; j < Math.min(idx + 5, endIdx); j++) {
      const nextLine = lines[j].trim();
      if (!nextLine) { nextIdx = j + 1; continue; }
      if (shouldSkipLine(nextLine)) { nextIdx = j + 1; continue; }
      // Continuation patterns:
      // "bog ab, ist abgebogen" (past + perfect)
      // "hat abgehoben" (perfect)
      // "ist abgebogen" (perfect with sein)
      // "ab, hat abgehangen (von)" (separated prefix continuation)
      // "stellte ein, hat eingestellt" (past + perfect)
      if (/^(hat|ist)\s+/.test(nextLine) ||
          /^(ab|an|auf|aus|bei|ein|fern|her|hin|los|mit|nach|um|vor|weg|zu|zurück),?\s+(hat|ist)\s+/.test(nextLine) ||
          (/,\s*$/.test(nextLine) && !isExampleSentence(nextLine) && nextLine.split(/\s+/).length <= 5) ||
          (/^[a-zäöüß]/.test(nextLine) && nextLine.split(/\s+/).length <= 4 && /(hat|ist)\s+\S+/.test(nextLine))) {
        nextIdx = j + 1;
      } else {
        break;
      }
    }

    // Only accept if we consumed at least one continuation line
    if (nextIdx > idx + 1) {
      return {
        entry: { word, type: 'verb' },
        nextIdx,
      };
    }
  }

  // Pattern 4: Also try the A2-style patterns (fallback)
  return tryParseVerbA2(lines, idx, endIdx);
}

/**
 * Check if a line should be skipped in B1 parsing.
 * Filters out question fragments, past participles, sentence fragments,
 * and other artifacts from the two-column PDF extraction.
 */
function isB1SkippableLine(line) {
  const trimmed = line.trim();
  // Also check after stripping trailing punctuation (PDF artifacts: "gemacht.")
  const stripped = trimmed.replace(/[.,;:!]+$/, '').trim();

  // Skip lines with question marks (sentence fragments from right column)
  if (trimmed.includes('?')) return true;

  // Skip regional variant references
  if (/\((?:D|A|CH)\)\s*→/.test(trimmed)) return true;
  if (/^→\s*(?:D|A|CH)[,:]/.test(trimmed)) return true;

  // Skip single-word lines ending with period (sentence endings from PDF merging)
  if (trimmed.endsWith('.') && !trimmed.includes(' ') && trimmed.length < 20) return true;

  // Skip past participles — they appear as sentence fragments from examples
  // Use `stripped` (no trailing punctuation) for these checks
  // Patterns: "gemacht", "gegangen", "abgeholt", "abgeschrieben", "eingestiegen"
  // ge + stem + t/en
  if (/^ge[a-zäöüß]+(?:t|en)$/.test(stripped)) return true;
  // prefix + ge + stem + t/en (separable verbs)
  if (/^(?:ab|an|auf|aus|bei|ein|fern|her|hin|los|mit|nach|um|vor|weg|zu|zurück|zusammen|weiter|fest|teil)ge[a-zäöüß]+(?:t|en)$/.test(stripped)) return true;
  // Inseparable prefix past participles: "beschlossen", "entdeckt", "verbessert"
  if (/^(?:be|emp|ent|er|ge|miss|ver|zer)[a-zäöüß]+(?:t|en)$/.test(stripped) && stripped.length <= 15) {
    // But not if they're valid adjectives/adverbs ending in common suffixes
    if (!/(?:lich|ig|isch|bar|sam|los|haft|voll|reich|frei|wert|mäßig)$/.test(stripped)) {
      // Additional check: don't skip if it matches common adjectives
      const knownAdjs = new Set([
        'bekannt', 'beliebt', 'berühmt', 'beschäftigt', 'bestimmt', 'betroffen',
        'besorgt', 'bereit', 'entfernt', 'entspannt', 'erfahren', 'erschöpft',
        'erstaunt', 'erwachsen', 'geschlossen', 'verboten', 'verheiratet',
        'verletzt', 'verrückt', 'verschieden', 'verwandt', 'verzweifelt',
        'verständlich', 'erforderlich', 'erreichbar',
      ]);
      if (!knownAdjs.has(stripped)) return true;
    }
  }
  // Words ending in -t that look like past participles with separable prefix
  // e.g., "abgeholt", "aufgemacht", "eingestiegen"
  if (/^[a-zäöü]+ge[a-zäöüß]+t$/.test(stripped) && !/-/.test(stripped)) return true;

  // Skip lines that are clearly verb conjugation continuations by themselves
  // e.g., "hat abgeholt" or "ist abgefahren" appearing alone
  if (/^(hat|ist|hatte|war)\s+\S+$/.test(trimmed)) return true;

  // Skip "gemacht", "gesehen", "gelesen" etc. (standalone past participles)
  if (/^[a-zäöü]+t$/.test(trimmed) && trimmed.length < 12 && /^ge/.test(trimmed)) return true;

  // Skip short fragments that look like sentence endings
  // e.g., "ganz bestimmt", "leider nicht", "gerne kommen"
  if (trimmed.split(/\s+/).length === 2) {
    const words = trimmed.split(/\s+/);
    // Both words are lowercase and short → likely fragment
    if (/^[a-zäöü]/.test(words[0]) && /^[a-zäöü]/.test(words[1])) {
      // But NOT if first word ends in -en/-eln/-ern (could be verb phrase)
      // and NOT if it's a known pattern like "als ob", "immer noch"
      const knownPhrases = new Set([
        'als ob', 'auch wenn', 'so dass', 'und zwar', 'vor allem',
        'zum Beispiel', 'zum Schluss', 'auf jeden', 'so weit',
        'sowohl als', 'weder noch', 'entweder oder',
      ]);
      if (knownPhrases.has(trimmed)) return false;

      // If first word looks like an adverb and second is a participle/adjective
      // it's probably a sentence fragment
      if (/^(ganz|sehr|leider|wirklich|schon|noch|auch|immer|sofort|wieder|bereits|erst|fast|kaum|nur|trotzdem|ziemlich|bestimmt|natürlich|vielleicht)$/.test(words[0])) {
        return true;
      }
    }
  }

  // Skip lines that contain "hat" or "ist" + word (verb continuation lines)
  if (/^(hat|ist)\s+[a-zäöü]/.test(trimmed) && trimmed.split(/\s+/).length <= 3) return true;

  // Skip standalone verb conjugation forms that leaked through
  // e.g., "bog ab", "stieg ein", "nahm ab" — past tense forms
  if (/^[a-zäöüß]+\s+(ab|an|auf|aus|ein|fern|her|hin|los|mit|nach|um|vor|weg|zu|zurück)$/.test(stripped)) return true;

  return false;
}

/**
 * Try to parse a non-noun, non-verb entry in B1.
 * Stricter than the A2 version to avoid grabbing sentence fragments.
 */
function tryParseOtherEntryB1(line) {
  const trimmed = line.trim();

  // Skip if it would fail general checks
  if (isExampleSentence(trimmed)) return null;
  if (trimmed.length < 2) return null;
  if (/^\d+\./.test(trimmed)) return null;

  // Must start with lowercase letter or (
  if (!/^[a-zäöüß(]/.test(trimmed)) return null;

  // Must not be a continuation line
  if (/^(hat|ist|hatte|war)\s+\w+/.test(trimmed)) return null;
  if (/,\s*$/.test(trimmed)) return null;

  // B1-specific: must be a single word (maybe with hyphen)
  // or a very specific two-word pattern
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount > 2) return null;

  // Two-word entries must match specific patterns
  if (wordCount === 2) {
    // Allowed: "als ob", "vor allem", "ab und"
    // Not allowed: "ganz bestimmt", "leider nicht"
    if (!/^(als|vor|ab|so|und|weder|entweder|sowohl|zum)\s/.test(trimmed)) return null;
  }

  // Skip past participles — these leak through from B1 example sentences
  if (/^ge[a-zäöüß]+(?:t|en)$/.test(trimmed)) return null;
  if (/^[a-zäöüß]+ge[a-zäöüß]+(?:t|en)$/.test(trimmed)) return null;

  // Skip words that look like standalone past participles/verb forms
  // but allow known adjectives that happen to look like participles
  const knownParticipialAdjs = new Set([
    'abhängig', 'abwesend', 'anwesend', 'aufregend', 'ausgezeichnet',
    'bedeutend', 'bekannt', 'beliebt', 'bereit', 'berühmt', 'beschäftigt',
    'bestimmt', 'betroffen', 'besorgt', 'dringend', 'einverstanden',
    'entfernt', 'entspannt', 'enttäuscht', 'erfahren', 'erschöpft',
    'erstaunt', 'erwachsen', 'freiwillig', 'geschlossen', 'geschickt',
    'gewohnt', 'laufend', 'notwendig', 'selbstständig', 'spannend',
    'verboten', 'verheiratet', 'verletzt', 'verrückt', 'verschieden',
    'verwandt', 'verzweifelt', 'zusammen',
  ]);

  if (!knownParticipialAdjs.has(trimmed)) {
    // Check for participle patterns with inseparable prefixes
    if (/^(?:be|emp|ent|er|ge|miss|ver|zer)[a-zäöüß]+(?:t|en)$/.test(trimmed) &&
        !/(?:lich|ig|isch|bar|sam|los|haft|voll|reich|frei|wert|mäßig|ung|heit|keit)$/.test(trimmed)) {
      return null;
    }
  }

  // Handle reflexive prefix
  let word = trimmed;
  let reflexive = false;
  if (REFLEXIVE_PREFIX.test(word)) {
    reflexive = true;
    word = word.replace(REFLEXIVE_PREFIX, '').trim();
  }

  // Remove trailing period, comma, or dash
  word = word.replace(/[.,;:]+$/, '').trim();

  // Skip words ending with dash if short (likely "link-", "einzig-")
  // Keep them — they're prefix entries that are valid

  if (word.length < 2) return null;

  // Determine type
  let type = 'other';
  if (/(?:en|eln|ern)$/.test(word) && /^[a-zäöüß]/.test(word) && word.length >= 4) {
    type = 'verb';
  }

  return {
    word: reflexive ? `sich ${word}` : word,
    type,
    ...(reflexive ? { reflexive: true } : {}),
  };
}

// ─── Main logic ─────────────────────────────────────────────────────

function main() {
  console.log('Parsing Goethe-Institut word lists...\n');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const results = {};

  // Parse A1
  if (fs.existsSync(A1_PATH)) {
    console.log(`  Parsing A1: ${A1_PATH}`);
    const text = fs.readFileSync(A1_PATH, 'utf-8');
    const a1Words = parseA1(text);
    results.a1 = a1Words;

    const a1Output = {
      _meta: {
        source: 'Goethe-Institut Start Deutsch 1 Wortliste',
        cefr: 'A1',
        parsedAt: new Date().toISOString(),
        totalEntries: a1Words.length,
        byType: countByType(a1Words),
      },
      words: a1Words,
    };

    const a1Path = path.join(OUTPUT_DIR, 'goethe-a1-words.json');
    fs.writeFileSync(a1Path, JSON.stringify(a1Output, null, 2), 'utf-8');
    console.log(`  → ${a1Words.length} words → ${a1Path}`);
    printTypeSummary(a1Words, '    ');
  } else {
    console.log(`  Skipping A1 (file not found: ${A1_PATH})`);
  }

  // Parse A2
  if (fs.existsSync(A2_PATH)) {
    console.log(`\n  Parsing A2: ${A2_PATH}`);
    const text = fs.readFileSync(A2_PATH, 'utf-8');
    const a2Words = parseA2(text);
    results.a2 = a2Words;

    const a2Output = {
      _meta: {
        source: 'Goethe-Institut Goethe-Zertifikat A2 Wortliste',
        cefr: 'A2',
        parsedAt: new Date().toISOString(),
        totalEntries: a2Words.length,
        byType: countByType(a2Words),
      },
      words: a2Words,
    };

    const a2Path = path.join(OUTPUT_DIR, 'goethe-a2-words.json');
    fs.writeFileSync(a2Path, JSON.stringify(a2Output, null, 2), 'utf-8');
    console.log(`  → ${a2Words.length} words → ${a2Path}`);
    printTypeSummary(a2Words, '    ');
  } else {
    console.log(`  Skipping A2 (file not found: ${A2_PATH})`);
  }

  // Parse B1
  if (fs.existsSync(B1_PATH)) {
    console.log(`\n  Parsing B1: ${B1_PATH}`);
    const text = fs.readFileSync(B1_PATH, 'utf-8');
    const b1Words = parseB1(text);
    results.b1 = b1Words;

    const b1Output = {
      _meta: {
        source: 'Goethe-Institut Goethe-Zertifikat B1 Wortliste',
        cefr: 'B1',
        parsedAt: new Date().toISOString(),
        totalEntries: b1Words.length,
        byType: countByType(b1Words),
      },
      words: b1Words,
    };

    const b1Path = path.join(OUTPUT_DIR, 'goethe-b1-words.json');
    fs.writeFileSync(b1Path, JSON.stringify(b1Output, null, 2), 'utf-8');
    console.log(`  → ${b1Words.length} words → ${b1Path}`);
    printTypeSummary(b1Words, '    ');
  } else {
    console.log(`  Skipping B1 (file not found: ${B1_PATH})`);
  }

  // Combined summary
  const allSets = {};
  for (const [level, wordList] of Object.entries(results)) {
    allSets[level] = new Set(wordList.map(w => w.word.toLowerCase()));
  }

  if (Object.keys(allSets).length >= 2) {
    console.log(`\n  Combined summary:`);
    const allUnique = new Set();
    for (const [level, words] of Object.entries(results)) {
      console.log(`    ${level.toUpperCase()} words: ${words.length}`);
      words.forEach(w => allUnique.add(w.word.toLowerCase()));
    }
    console.log(`    Total unique across all levels: ${allUnique.size}`);

    // Show overlaps
    if (allSets.a1 && allSets.a2) {
      const a1a2 = [...allSets.a1].filter(w => allSets.a2.has(w));
      console.log(`    Overlap A1 ∩ A2: ${a1a2.length}`);
    }
    if (allSets.a1 && allSets.b1) {
      const a1b1 = [...allSets.a1].filter(w => allSets.b1.has(w));
      console.log(`    Overlap A1 ∩ B1: ${a1b1.length}`);
    }
    if (allSets.a2 && allSets.b1) {
      const a2b1 = [...allSets.a2].filter(w => allSets.b1.has(w));
      console.log(`    Overlap A2 ∩ B1: ${a2b1.length}`);
    }
  }

  console.log('\nDone!');
}

function countByType(words) {
  const counts = {};
  for (const w of words) {
    counts[w.type] = (counts[w.type] || 0) + 1;
  }
  return counts;
}

function printTypeSummary(words, indent = '') {
  const counts = countByType(words);
  for (const [type, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`${indent}${type}: ${count}`);
  }
}

main();
