/**
 * validate-schemas.js
 *
 * Validerer innholdsfiler mot JSON-skjemaer i schemas/.
 * Brukes som: npm run validate:schemas
 *
 * Kan validere:
 *   - Øvelsesfiler (exercises-data/)
 *   - Leksjonsfiler (lessons-data/)
 *   - Grammatikkfiler (grammar-data/)
 *   - Spørsmålsbanker (question-bank/)
 *   - Pensum-registeret (curriculum-registry)
 *   - Vokabularfiler (vocabulary banks, translations, manifests)
 *
 * Bruk:
 *   node scripts/validate-schemas.js                    # Valider alt
 *   node scripts/validate-schemas.js --schema exercise  # Bare øvelser
 *   node scripts/validate-schemas.js --file path/to/file.js --schema exercise
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';
import { pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const SCHEMAS_DIR = resolve(PROJECT_ROOT, 'schemas');

// ──────────────────────────────────────────────
// AJV oppsett
// ──────────────────────────────────────────────

function createValidator() {
  const ajv = new Ajv({
    allErrors: true,
    verbose: true,
    strict: false,
    validateSchema: false,   // Tillat draft 2020-12 $schema uten meta-skjema
  });
  addFormats(ajv);
  return ajv;
}

function loadSchema(schemaName) {
  const path = resolve(SCHEMAS_DIR, `${schemaName}.schema.json`);
  if (!existsSync(path)) {
    throw new Error(`Skjema ikke funnet: ${path}`);
  }
  return JSON.parse(readFileSync(path, 'utf-8'));
}

// ──────────────────────────────────────────────
// Datainnlasting (JS-moduler med export)
// ──────────────────────────────────────────────

async function loadJSData(filePath) {
  const fullPath = resolve(filePath);
  if (!existsSync(fullPath)) {
    throw new Error(`Fil ikke funnet: ${fullPath}`);
  }

  const ext = extname(fullPath);

  if (ext === '.json') {
    return JSON.parse(readFileSync(fullPath, 'utf-8'));
  }

  // JS-filer: dynamisk import
  const mod = await import(pathToFileURL(fullPath).href);

  // Prøv kjente eksportnavn
  if (mod.exercisesData) return mod.exercisesData;
  if (mod.lessonsData) return mod.lessonsData;
  if (mod.grammarData) return mod.grammarData;
  if (mod.sporsmalsBank) return mod.sporsmalsBank;
  if (mod.CURRICULUM_REGISTRY) return mod.CURRICULUM_REGISTRY;
  if (mod.EXERCISE_DATABASE) return mod.EXERCISE_DATABASE;
  if (mod.default) return mod.default;

  // Fallback: første eksporterte verdi
  const keys = Object.keys(mod).filter(k => k !== '__esModule');
  if (keys.length > 0) return mod[keys[0]];

  throw new Error(`Ingen gjenkjent eksport i ${filePath}`);
}

// ──────────────────────────────────────────────
// Validering
// ──────────────────────────────────────────────

function validateData(data, schema, fileName) {
  const ajv = createValidator();
  const validate = ajv.compile(schema);
  const valid = validate(data);

  if (valid) {
    console.log(`  ✓ ${fileName}`);
    return 0;
  }

  console.log(`  ✗ ${fileName}`);
  const errors = validate.errors || [];
  const shown = errors.slice(0, 10); // Begrens utskrift
  for (const err of shown) {
    const path = err.instancePath || '/';
    console.log(`    ${path}: ${err.message}`);
    if (err.params?.allowedValues) {
      console.log(`      Tillatte verdier: ${err.params.allowedValues.join(', ')}`);
    }
  }
  if (errors.length > 10) {
    console.log(`    ... og ${errors.length - 10} flere feil`);
  }

  return errors.length;
}

// ──────────────────────────────────────────────
// Filsøk
// ──────────────────────────────────────────────

function findContentFiles(contentDir, pattern) {
  const results = [];
  if (!existsSync(contentDir)) return results;

  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (pattern.test(entry.name)) {
        results.push(fullPath);
      }
    }
  }

  walk(contentDir);
  return results;
}

// ──────────────────────────────────────────────
// Hoveddel
// ──────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const schemaFilter = args.includes('--schema')
    ? args[args.indexOf('--schema') + 1]
    : null;
  const singleFile = args.includes('--file')
    ? args[args.indexOf('--file') + 1]
    : null;

  console.log('🔍 Validerer innhold mot skjemaer...\n');

  let totalErrors = 0;
  let totalFiles = 0;

  // Hvis enkeltfil er spesifisert
  if (singleFile && schemaFilter) {
    const schema = loadSchema(schemaFilter);
    const data = await loadJSData(singleFile);
    totalErrors += validateData(data, schema, basename(singleFile));
    totalFiles = 1;
  } else {
    // Finn innholdsfiler basert på mønster
    const contentDir = resolve(PROJECT_ROOT, 'content');
    const publicContentDir = resolve(PROJECT_ROOT, 'public', 'content');
    const searchDirs = [contentDir, publicContentDir].filter(existsSync);

    // Øvelser
    if (!schemaFilter || schemaFilter === 'exercise') {
      console.log('📝 Øvelser (exercise.schema.json):');
      const schema = loadSchema('exercise');
      const files = searchDirs.flatMap(dir =>
        findContentFiles(dir, /chapter-\d+\.js$/i)
          .filter(f => f.includes('exercises-data'))
      );

      if (files.length === 0) {
        console.log('  ⚠ Ingen øvelsesfiler funnet');
      }
      for (const file of files) {
        try {
          const data = await loadJSData(file);
          totalErrors += validateData(data, schema, file.replace(PROJECT_ROOT + '/', ''));
          totalFiles++;
        } catch (err) {
          console.log(`  ✗ ${basename(file)}: ${err.message}`);
          totalErrors++;
          totalFiles++;
        }
      }
      console.log('');
    }

    // Leksjoner
    if (!schemaFilter || schemaFilter === 'lesson') {
      console.log('📖 Leksjoner (lesson.schema.json):');
      const schema = loadSchema('lesson');
      const files = searchDirs.flatMap(dir =>
        findContentFiles(dir, /lessons-data.*\.js$/i)
      );

      if (files.length === 0) {
        console.log('  ⚠ Ingen leksjonsfiler funnet');
      }
      for (const file of files) {
        try {
          const data = await loadJSData(file);
          totalErrors += validateData(data, schema, file.replace(PROJECT_ROOT + '/', ''));
          totalFiles++;
        } catch (err) {
          console.log(`  ✗ ${basename(file)}: ${err.message}`);
          totalErrors++;
          totalFiles++;
        }
      }
      console.log('');
    }

    // Grammatikk
    if (!schemaFilter || schemaFilter === 'grammar') {
      console.log('📐 Grammatikk (grammar.schema.json):');
      const schema = loadSchema('grammar');
      const files = searchDirs.flatMap(dir =>
        findContentFiles(dir, /grammar-data.*\.js$/i)
      );

      if (files.length === 0) {
        console.log('  ⚠ Ingen grammatikkfiler funnet');
      }
      for (const file of files) {
        try {
          const data = await loadJSData(file);
          totalErrors += validateData(data, schema, file.replace(PROJECT_ROOT + '/', ''));
          totalFiles++;
        } catch (err) {
          console.log(`  ✗ ${basename(file)}: ${err.message}`);
          totalErrors++;
          totalFiles++;
        }
      }
      console.log('');
    }

    // Vokabular (JSON-filer)
    if (!schemaFilter || schemaFilter === 'vocabulary') {
      console.log('📦 Vokabular (vocabulary.schema.json):');
      const vocabDir = resolve(PROJECT_ROOT, 'shared', 'vocabulary');
      if (existsSync(vocabDir)) {
        const schema = loadSchema('vocabulary');
        const files = findContentFiles(vocabDir, /\.json$/);
        for (const file of files) {
          if (basename(file) === 'manifest.json' && !file.includes('curricula')) continue;
          try {
            const data = await loadJSData(file);
            totalErrors += validateData(data, schema, file.replace(PROJECT_ROOT + '/', ''));
            totalFiles++;
          } catch (err) {
            console.log(`  ✗ ${basename(file)}: ${err.message}`);
            totalErrors++;
            totalFiles++;
          }
        }
      } else {
        console.log('  ⚠ shared/vocabulary/ ikke funnet (kjør npm run fetch:vocabulary)');
      }
      console.log('');
    }
  }

  // Oppsummering
  console.log('─'.repeat(50));
  if (totalFiles === 0) {
    console.log('⚠  Ingen innholdsfiler funnet å validere.');
    console.log('   Legg til innholdsfiler i content/ eller shared/vocabulary/');
  } else if (totalErrors === 0) {
    console.log(`✅ ${totalFiles} filer validert uten feil`);
  } else {
    console.log(`❌ ${totalErrors} feil i ${totalFiles} filer`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(`Feil: ${err.message}`);
  process.exit(1);
});
