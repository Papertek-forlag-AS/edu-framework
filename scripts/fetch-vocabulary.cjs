/**
 * fetch-vocabulary.cjs
 *
 * Byggetids-skript som henter vokabulardata fra den eksterne API-en
 * og lagrer som statiske JSON-filer i shared/vocabulary/.
 * Henter også lyd-ZIP-filer og pakker ut til public/content/{lang}/vocab-audio/.
 *
 * Kjøres under build:vercel FØR build:dictionary.
 * Brukere laster aldri fra API-en — bare Vercel-bygget gjør det.
 *
 * Bruk: node scripts/fetch-vocabulary.cjs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const API_BASE = 'https://papertek-vocabulary.vercel.app/api/vocab/v1';
const VOCAB_CDN = 'https://papertek-vocabulary.vercel.app';
const SHARED_DIR = path.join(__dirname, '..', 'shared', 'vocabulary');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// Language ISO codes to content folder names
const LANG_FOLDERS = { de: 'german', es: 'spanish', fr: 'french' };

// Konfigurasjoner
const LANGUAGES = ['de', 'es', 'fr'];
const BANK_NAMES = [
    'adjectivebank', 'articlesbank', 'generalbank', 'nounbank',
    'numbersbank', 'phrasesbank', 'pronounsbank', 'verbbank'
];
const TRANSLATION_PAIRS = ['de-nb', 'de-en', 'es-nb', 'es-en', 'fr-nb'];
const CURRICULA = [
    'tysk1-vg1', 'spansk1-vg1', 'us-8', 'us-9', 'us-10',
    'tysk1-vg2', 'tysk2-vg1', 'tysk2-vg2'
];

let fetchCount = 0;
let errorCount = 0;

async function fetchJSON(urlPath, silent404 = false) {
    const url = `${API_BASE}/${urlPath}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            if (silent404 && response.status === 404) return null;
            throw new Error(`HTTP ${response.status}`);
        }
        fetchCount++;
        return await response.json();
    } catch (err) {
        if (!silent404) {
            console.error(`  FEIL: ${urlPath} — ${err.message}`);
            errorCount++;
        }
        return null;
    }
}

function writeJSON(filePath, data) {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

async function fetchCoreBanks() {
    console.log('\n📦 Henter kjernebanker...');
    for (const lang of LANGUAGES) {
        for (const bank of BANK_NAMES) {
            const data = await fetchJSON(`core/${lang}?bank=${bank}`);
            if (data) {
                const outPath = path.join(SHARED_DIR, 'core', lang, `${bank}.json`);
                writeJSON(outPath, data);
                const count = Object.keys(data).filter(k => k !== '_metadata').length;
                console.log(`  ✓ core/${lang}/${bank} (${count} oppføringer)`);
            }
        }
    }
}

async function fetchTranslations() {
    console.log('\n🌐 Henter oversettelser...');
    for (const pair of TRANSLATION_PAIRS) {
        for (const bank of BANK_NAMES) {
            const data = await fetchJSON(`translations/${pair}?bank=${bank}`, true);
            if (data) {
                const outPath = path.join(SHARED_DIR, 'translations', pair, `${bank}.json`);
                writeJSON(outPath, data);
                const count = Object.keys(data).filter(k => k !== '_metadata').length;
                console.log(`  ✓ translations/${pair}/${bank} (${count} oppføringer)`);
            }
        }
    }
}

async function fetchCurricula() {
    console.log('\n📋 Henter pensum-manifester...');
    for (const id of CURRICULA) {
        const data = await fetchJSON(`curricula/${id}`);
        if (data) {
            const outPath = path.join(SHARED_DIR, 'curricula', `vocab-manifest-${id}.json`);
            writeJSON(outPath, data);
            const lessonCount = Object.keys(data.lessons || {}).length;
            console.log(`  ✓ curricula/${id} (${lessonCount} leksjoner)`);
        }
    }
}

async function fetchDictionarySources() {
    console.log('\n📖 Henter ordbok-kildefiler...');
    const DICT_DIR = path.join(SHARED_DIR, 'dictionary');

    // verb-classification-de.json (needed by enrich-curriculum-words.js and runtime imports)
    const verbClassUrl = `${VOCAB_CDN}/vocabulary/dictionary/verb-classification-de.json`;
    try {
        const response = await fetch(verbClassUrl);
        if (response.ok) {
            const data = await response.json();
            const outPath = path.join(DICT_DIR, 'verb-classification-de.json');
            fs.mkdirSync(path.dirname(outPath), { recursive: true });
            fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf-8');
            console.log(`  ✓ dictionary/verb-classification-de.json`);
            fetchCount++;
        }
    } catch (err) {
        console.error(`  FEIL: verb-classification — ${err.message}`);
        errorCount++;
    }

    // frequency/de_50k.txt (needed by add-frequency-data.js)
    const freqUrl = 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/de/de_50k.txt';
    try {
        const response = await fetch(freqUrl);
        if (response.ok) {
            const text = await response.text();
            const outPath = path.join(DICT_DIR, 'frequency', 'de_50k.txt');
            fs.mkdirSync(path.dirname(outPath), { recursive: true });
            fs.writeFileSync(outPath, text, 'utf-8');
            console.log(`  ✓ dictionary/frequency/de_50k.txt`);
            fetchCount++;
        }
    } catch (err) {
        console.warn(`  ⚠ Frekvensliste ikke tilgjengelig (ikke kritisk): ${err.message}`);
    }
}

async function fetchAudioZips() {
    console.log('\n🔊 Henter lyd-ZIP-filer fra CDN...');
    for (const [lang, folder] of Object.entries(LANG_FOLDERS)) {
        const zipUrl = `${VOCAB_CDN}/vocabulary/downloads/audio-${lang}.zip`;
        const audioDir = path.join(PUBLIC_DIR, 'content', folder, 'vocab-audio');

        try {
            const response = await fetch(zipUrl);
            if (!response.ok) {
                console.warn(`  ⚠ Ingen lyd-ZIP for ${lang} (HTTP ${response.status})`);
                continue;
            }

            // Write ZIP to temp file
            const tmpZip = path.join(PUBLIC_DIR, `_audio-${lang}.zip`);
            const buffer = Buffer.from(await response.arrayBuffer());
            fs.writeFileSync(tmpZip, buffer);

            // Remove dangling symlink if present (e.g. checked-in symlinks pointing to non-existent targets)
            try {
                const stat = fs.lstatSync(audioDir);
                if (stat.isSymbolicLink()) {
                    fs.unlinkSync(audioDir);
                    console.log(`  ℹ Fjernet gammel symlink: ${audioDir}`);
                }
            } catch (e) {
                // Path doesn't exist, that's fine
            }

            // Extract to vocab-audio directory
            fs.mkdirSync(audioDir, { recursive: true });
            execSync(`unzip -o -q "${tmpZip}" -d "${audioDir}"`, { stdio: 'pipe' });
            fs.unlinkSync(tmpZip);

            const fileCount = fs.readdirSync(audioDir).filter(f => f.endsWith('.mp3')).length;
            const sizeMB = (buffer.length / 1024 / 1024).toFixed(1);
            console.log(`  ✓ ${lang} → content/${folder}/vocab-audio/ (${fileCount} filer, ${sizeMB} MB ZIP)`);
            fetchCount++;
        } catch (err) {
            // Lyd-feil er ikke kritiske — appen fungerer uten lyd
            console.warn(`  ⚠ Lyd for ${lang} ikke tilgjengelig: ${err.message}`);
        }
    }
}

async function main() {
    console.log('🔄 Henter vokabular fra ekstern API...');
    console.log(`   API: ${API_BASE}`);

    const start = Date.now();

    await fetchCoreBanks();
    await fetchTranslations();
    await fetchCurricula();
    await fetchDictionarySources();
    await fetchAudioZips();

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\n✅ Ferdig! ${fetchCount} filer hentet på ${elapsed}s`);

    if (errorCount > 0) {
        console.error(`⚠️  ${errorCount} feil oppstod under henting`);
        process.exit(1);
    }
}

main();
