#!/usr/bin/env node
/**
 * Vocabulary Validation Script
 *
 * Validates that all word IDs in manifests exist in vocabulary banks.
 * Reports missing entries and duplicates.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const VOCAB_DIR = path.join(__dirname, '../shared/vocabulary/german');
const MANIFEST_DIR = path.join(__dirname, '../apps/german-trainer/Resources/Manifests/levels');

// Load all vocabulary banks
function loadVocabularyBanks() {
    const banks = {};
    const bankFiles = [
        'nounbank.json',
        'verbbank.json',
        'adjectivebank.json',
        'generalbank.json',
        'numbersbank.json',
        'pronounsbank.json',
        'articlesbank.json',
        'phrasesbank.json'
    ];

    for (const file of bankFiles) {
        const filePath = path.join(VOCAB_DIR, file);
        if (fs.existsSync(filePath)) {
            const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            // Remove _metadata key
            const words = Object.keys(content).filter(k => k !== '_metadata');
            banks[file] = words;
        }
    }

    return banks;
}

// Get all word IDs across all banks
function getAllWordIds(banks) {
    const allIds = new Set();
    for (const [bankName, wordIds] of Object.entries(banks)) {
        for (const id of wordIds) {
            allIds.add(id);
        }
    }
    return allIds;
}

// Find which bank contains a word ID
function findWordInBanks(wordId, banks) {
    for (const [bankName, wordIds] of Object.entries(banks)) {
        if (wordIds.includes(wordId)) {
            return bankName;
        }
    }
    return null;
}

// Load manifest
function loadManifest(level) {
    const filePath = path.join(MANIFEST_DIR, `${level}.json`);
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

// Main validation
function validate() {
    console.log('='.repeat(60));
    console.log('VOCABULARY VALIDATION REPORT');
    console.log('='.repeat(60));

    const banks = loadVocabularyBanks();
    const allWordIds = getAllWordIds(banks);

    console.log('\n📚 Vocabulary Banks Loaded:');
    for (const [bankName, wordIds] of Object.entries(banks)) {
        console.log(`   ${bankName}: ${wordIds.length} words`);
    }
    console.log(`   TOTAL UNIQUE: ${allWordIds.size} words\n`);

    // Load A1 manifest
    const manifest = loadManifest('a1');

    console.log('📋 A1 Manifest Themes:\n');

    const missingWords = [];
    const themeStats = [];

    for (const theme of manifest.themes) {
        const words = theme.words || [];
        const missing = words.filter(w => !allWordIds.has(w));

        themeStats.push({
            id: theme.id,
            name: theme.name.en,
            total: words.length,
            missing: missing.length
        });

        if (missing.length > 0) {
            missingWords.push({ theme: theme.name.en, words: missing });
        }

        const status = missing.length === 0 ? '✅' : '⚠️';
        console.log(`${status} ${theme.name.en} (${theme.id})`);
        console.log(`   Words: ${words.length}`);
        if (missing.length > 0) {
            console.log(`   Missing: ${missing.length}`);
            missing.forEach(w => console.log(`      - ${w}`));
        }
        console.log('');
    }

    // Summary
    console.log('='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));

    const totalWords = themeStats.reduce((sum, t) => sum + t.total, 0);
    const totalMissing = themeStats.reduce((sum, t) => sum + t.missing, 0);

    console.log(`\nTotal words in manifest: ${totalWords}`);
    console.log(`Words found in banks: ${totalWords - totalMissing}`);
    console.log(`Missing words: ${totalMissing}`);

    if (totalMissing > 0) {
        console.log('\n❌ MISSING WORDS NEED TO BE ADDED:');
        for (const { theme, words } of missingWords) {
            console.log(`\n${theme}:`);
            words.forEach(w => console.log(`   ${w}`));
        }
    } else {
        console.log('\n✅ All manifest words exist in vocabulary banks!');
    }

    // Theme expansion recommendations
    console.log('\n📊 THEME EXPANSION RECOMMENDATIONS:');
    console.log('(Targeting 25-35 words per theme for A1)\n');

    for (const stat of themeStats) {
        let recommendation = '';
        if (stat.total < 20) {
            recommendation = '🔴 Needs significant expansion';
        } else if (stat.total < 25) {
            recommendation = '🟡 Could use more words';
        } else if (stat.total < 30) {
            recommendation = '🟢 Good';
        } else {
            recommendation = '✅ Well populated';
        }
        console.log(`${stat.name}: ${stat.total} words - ${recommendation}`);
    }
}

validate();
