#!/usr/bin/env node

/**
 * create-edu-app — Papertek — Framework for Education Project Scaffolder
 *
 * Usage:
 *   node cli/create-edu-app.js                  # Interactive mode
 *   node cli/create-edu-app.js --name "My Course" --lang de --chapters 8
 *
 * Or via npx (once published):
 *   npx @papertek/create-edu-app
 */

import { createInterface } from 'readline';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, writeFileSync, copyFileSync, existsSync, readdirSync, statSync, readFileSync } from 'fs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FRAMEWORK_ROOT = resolve(__dirname, '..');

// ── Language presets ──────────────────────────────────────────────
const LANGUAGE_PRESETS = {
  de: {
    code: 'de', name: 'German', nativeName: 'Deutsch',
    genderSystem: 'three',
    articles: { m: 'der', f: 'die', n: 'das', pl: 'die' },
    genderLabels: { m: 'Maskulin', f: 'Feminin', n: 'Neutrum' },
    genderColors: { m: '#3B82F6', f: '#EC4899', n: '#10B981' },
    specialCharacters: ['ä', 'ö', 'ü', 'ß'],
    characterNormalization: { 'ö': 'oe', 'ä': 'ae', 'ü': 'ue', 'ß': 'ss' },
    pronouns: ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie'],
    ttsVoice: 'de-DE',
    languageDir: 'german',
  },
  fr: {
    code: 'fr', name: 'French', nativeName: 'Français',
    genderSystem: 'two',
    articles: { m: 'le', f: 'la', pl: 'les' },
    genderLabels: { m: 'Masculin', f: 'Féminin' },
    genderColors: { m: '#3B82F6', f: '#EC4899' },
    specialCharacters: ['é', 'è', 'ê', 'ë', 'à', 'â', 'ù', 'û', 'ô', 'î', 'ï', 'ç', 'œ'],
    characterNormalization: { 'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e', 'à': 'a', 'â': 'a', 'ù': 'u', 'û': 'u', 'ô': 'o', 'î': 'i', 'ï': 'i', 'ç': 'c', 'œ': 'oe' },
    pronouns: ['je', 'tu', 'il/elle/on', 'nous', 'vous', 'ils/elles'],
    ttsVoice: 'fr-FR',
    languageDir: 'french',
  },
  es: {
    code: 'es', name: 'Spanish', nativeName: 'Español',
    genderSystem: 'two',
    articles: { m: 'el', f: 'la', pl: 'los/las' },
    genderLabels: { m: 'Masculino', f: 'Femenino' },
    genderColors: { m: '#3B82F6', f: '#EC4899' },
    specialCharacters: ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ', '¿', '¡'],
    characterNormalization: { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ü': 'u', 'ñ': 'n' },
    pronouns: ['yo', 'tú', 'él/ella/usted', 'nosotros', 'vosotros', 'ellos/ustedes'],
    ttsVoice: 'es-ES',
    languageDir: 'spanish',
  },
  nb: {
    code: 'nb', name: 'Norwegian Bokmål', nativeName: 'Norsk bokmål',
    genderSystem: 'three',
    articles: { m: 'en', f: 'ei', n: 'et', pl: '' },
    genderLabels: { m: 'Hankjønn', f: 'Hunkjønn', n: 'Intetkjønn' },
    genderColors: { m: '#3B82F6', f: '#EC4899', n: '#10B981' },
    specialCharacters: ['æ', 'ø', 'å'],
    characterNormalization: { 'æ': 'ae', 'ø': 'o', 'å': 'a' },
    pronouns: ['jeg', 'du', 'han/hun/det', 'vi', 'dere', 'de'],
    ttsVoice: 'nb-NO',
    languageDir: 'norwegian',
  },
};

// ── Readline helper ──────────────────────────────────────────────
function createPrompt() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return {
    ask: (question, defaultVal) => new Promise(resolve => {
      const suffix = defaultVal ? ` [${defaultVal}]` : '';
      rl.question(`  ${question}${suffix}: `, answer => {
        resolve(answer.trim() || defaultVal || '');
      });
    }),
    close: () => rl.close(),
  };
}

// ── Copy directory recursively ───────────────────────────────────
function copyDirSync(src, dest, filter = () => true) {
  if (!existsSync(src)) return;
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    if (!filter(srcPath, entry)) continue;
    if (statSync(srcPath).isDirectory()) {
      copyDirSync(srcPath, destPath, filter);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

// ── Parse CLI arguments ──────────────────────────────────────────
function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      args[key] = val;
    }
  }
  return args;
}

// ── Slug generator ───────────────────────────────────────────────
function slugify(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv);

  console.log();
  console.log('  ╔══════════════════════════════════════════════╗');
  console.log('  ║   📚  Papertek — Framework for Education     ║');
  console.log('  ║   Create a new educational web app           ║');
  console.log('  ╚══════════════════════════════════════════════╝');
  console.log();

  const prompt = createPrompt();

  // 1. Course name
  const courseName = args.name || await prompt.ask('Course name', 'My Language Course');

  // 2. Target language
  const langChoices = Object.entries(LANGUAGE_PRESETS).map(([k, v]) => `${k} (${v.name})`).join(', ');
  console.log(`\n  Available presets: ${langChoices}`);
  console.log('  Or enter a custom ISO 639-1 code (e.g., "it" for Italian)');
  const langCode = args.lang || await prompt.ask('Target language code', 'de');

  // 3. UI language
  const uiLang = args['ui-lang'] || await prompt.ask('UI language code (student interface)', 'nb');

  // 4. Number of chapters
  const chapters = parseInt(args.chapters || await prompt.ask('Number of chapters', '8'), 10);

  // 5. Lessons per chapter
  const lessonsPerCh = parseInt(args.lessons || await prompt.ask('Lessons per chapter', '3'), 10);

  // 6. CEFR level
  const cefrLevel = args.cefr || await prompt.ask('CEFR level', 'A1');

  // 7. Output directory
  const slug = slugify(courseName);
  const defaultDir = `./${slug}`;
  const outputDir = args.output || await prompt.ask('Output directory', defaultDir);

  prompt.close();

  // Resolve language preset
  const langPreset = LANGUAGE_PRESETS[langCode] || {
    code: langCode,
    name: langCode.toUpperCase(),
    nativeName: langCode.toUpperCase(),
    genderSystem: 'none',
    articles: {},
    genderLabels: {},
    genderColors: {},
    specialCharacters: [],
    characterNormalization: {},
    pronouns: [],
    ttsVoice: `${langCode}-${langCode.toUpperCase()}`,
    languageDir: langCode,
  };

  const projectRoot = resolve(outputDir);
  const curriculumId = `${slug}-${cefrLevel.toLowerCase()}`;

  console.log();
  console.log(`  Creating "${courseName}" in ${projectRoot}`);
  console.log(`  Language: ${langPreset.name} (${langCode}), ${chapters} chapters × ${lessonsPerCh} lessons`);
  console.log();

  // ── Create directory structure ──────────────────────────────────
  const dirs = [
    '',
    'content/' + langPreset.languageDir + '/lessons-data',
    'content/' + langPreset.languageDir + '/exercises-data/' + curriculumId,
    'content/' + langPreset.languageDir + '/grammar-data',
    'public/js',
    'public/css',
    'public/images',
    'schemas',
    'scripts',
    '.claude/skills',
  ];

  for (const dir of dirs) {
    mkdirSync(join(projectRoot, dir), { recursive: true });
  }

  // ── Generate papertek.config.js ─────────────────────────────────
  const configContent = generateConfig({
    courseName, langCode, langPreset, uiLang,
    chapters, lessonsPerCh, cefrLevel, slug, curriculumId,
  });
  writeFileSync(join(projectRoot, 'papertek.config.js'), configContent);

  // ── Generate CLAUDE.md ──────────────────────────────────────────
  const claudeMd = generateClaudeMd({
    courseName, langCode, langPreset, chapters, lessonsPerCh, cefrLevel, curriculumId,
  });
  writeFileSync(join(projectRoot, 'CLAUDE.md'), claudeMd);

  // ── Generate AGENTS.md ──────────────────────────────────────────
  const agentsMd = generateAgentsMd({ courseName, langCode, langPreset });
  writeFileSync(join(projectRoot, 'AGENTS.md'), agentsMd);

  // ── Generate package.json ───────────────────────────────────────
  const packageJson = generatePackageJson({ slug, courseName });
  writeFileSync(join(projectRoot, 'package.json'), JSON.stringify(packageJson, null, 2) + '\n');

  // ── Copy schemas ────────────────────────────────────────────────
  const schemasDir = join(FRAMEWORK_ROOT, 'schemas');
  if (existsSync(schemasDir)) {
    copyDirSync(schemasDir, join(projectRoot, 'schemas'));
    console.log('  ✅ Copied schemas/');
  }

  // ── Copy engine files (public/js, public/css) ──────────────────
  const engineSrc = join(FRAMEWORK_ROOT, 'public/js');
  if (existsSync(engineSrc)) {
    copyDirSync(engineSrc, join(projectRoot, 'public/js'), (path, name) => {
      // Skip node_modules, test files
      return !name.startsWith('.') && name !== 'node_modules';
    });
    console.log('  ✅ Copied engine (public/js/)');
  }

  const cssSrc = join(FRAMEWORK_ROOT, 'public/css');
  if (existsSync(cssSrc)) {
    copyDirSync(cssSrc, join(projectRoot, 'public/css'));
    console.log('  ✅ Copied CSS (public/css/)');
  }

  // ── Copy scripts ────────────────────────────────────────────────
  const scriptsSrc = join(FRAMEWORK_ROOT, 'scripts');
  if (existsSync(scriptsSrc)) {
    copyDirSync(scriptsSrc, join(projectRoot, 'scripts'), (path, name) => {
      return !name.startsWith('.') && name !== 'node_modules';
    });
    console.log('  ✅ Copied build scripts/');
  }

  // ── Generate content stubs ──────────────────────────────────────
  generateContentStubs({
    projectRoot, langPreset, curriculumId, chapters, lessonsPerCh,
  });
  console.log(`  ✅ Generated content stubs (${chapters} chapters × ${lessonsPerCh} lessons)`);

  // ── Generate .gitignore ─────────────────────────────────────────
  writeFileSync(join(projectRoot, '.gitignore'), generateGitignore());

  // ── Generate index.html ─────────────────────────────────────────
  writeFileSync(join(projectRoot, 'public/index.html'), generateIndexHtml({ courseName, chapters, lessonsPerCh }));
  console.log('  ✅ Generated public/index.html');

  // ── Init git ────────────────────────────────────────────────────
  try {
    execSync('git init', { cwd: projectRoot, stdio: 'pipe' });
    execSync('git add -A', { cwd: projectRoot, stdio: 'pipe' });
    execSync(`git commit -m "Initial commit: ${courseName} scaffolded with Papertek Framework for Education"`, { cwd: projectRoot, stdio: 'pipe' });
    console.log('  ✅ Initialized git repository');
  } catch {
    console.log('  ⚠️  Git not available — skipping repo init');
  }

  console.log();
  console.log('  ╔══════════════════════════════════════════════╗');
  console.log('  ║   ✅ Project created successfully!            ║');
  console.log('  ╚══════════════════════════════════════════════╝');
  console.log();
  console.log(`  Next steps:`);
  console.log(`    cd ${outputDir}`);
  console.log(`    npm install`);
  console.log(`    npm run dev`);
  console.log();
  console.log(`  Then open Claude Code and start building content:`);
  console.log(`    /create-lesson 1-1`);
  console.log(`    /create-exercises 1-1`);
  console.log();
}

// ── Generators ───────────────────────────────────────────────────

function generateConfig({ courseName, langCode, langPreset, uiLang, chapters, lessonsPerCh, cefrLevel, slug, curriculumId }) {
  const articlesStr = Object.entries(langPreset.articles || {})
    .map(([k, v]) => `${k}: '${v}'`).join(', ');
  const genderLabelsStr = Object.entries(langPreset.genderLabels || {})
    .map(([k, v]) => `${k}: '${v}'`).join(', ');
  const genderColorsStr = Object.entries(langPreset.genderColors || {})
    .map(([k, v]) => `${k}: '${v}'`).join(', ');

  return `/**
 * papertek.config.js — Course Configuration
 *
 * This is the educator's primary touchpoint.
 * An AI agent or human edits this file to configure the course.
 * Then run: npm run validate:config
 *
 * Generated by create-edu-app on ${new Date().toISOString().split('T')[0]}
 */

export default {
  course: {
    name: '${courseName}',
    description: '${langPreset.name} language course built with Papertek',
    version: '1.0.0',
    author: '',
    license: 'CC-BY-SA-4.0',
  },

  targetLanguage: {
    code: '${langCode}',
    name: '${langPreset.name}',
    nativeName: '${langPreset.nativeName}',
    genderSystem: '${langPreset.genderSystem}',
    scriptDirection: 'ltr',
    specialCharacters: ${JSON.stringify(langPreset.specialCharacters)},
    characterNormalization: ${JSON.stringify(langPreset.characterNormalization)},
    ttsVoice: '${langPreset.ttsVoice}',
    articles: { ${articlesStr} },
    genderLabels: { ${genderLabelsStr} },
    genderColors: { ${genderColorsStr} },
    verbConfig: {
      pronouns: ${JSON.stringify(langPreset.pronouns)},
    },
  },

  uiLanguages: [
    { code: '${uiLang}', name: '${uiLang === 'nb' ? 'Norsk bokmål' : uiLang === 'en' ? 'English' : uiLang}', default: true },
  ],

  curricula: [
    {
      id: '${curriculumId}',
      filePrefix: '${cefrLevel.toLowerCase()}',
      folderName: '${slug}',
      chapters: ${chapters},
      lessonsPerChapter: ${lessonsPerCh},
      title: '${courseName}',
      description: '${langPreset.name} ${cefrLevel}',
      cefrLevel: '${cefrLevel}',
      contentPath: 'content/${langPreset.languageDir}',
    },
  ],

  vocabularyApi: {
    baseUrl: 'https://papertek-vocabulary.vercel.app/api/vocab/v1',
    cdnUrl: 'https://papertek-vocabulary.vercel.app',
    languages: ['${langCode}'],
    translationPairs: ['${langCode}-${uiLang}'],
    fetchAudio: true,
  },

  features: {
    offlineMode: true,
    cloudSync: false,
    teacherDashboard: false,
    classroomGames: false,
    vocabTrainer: true,
    spacedRepetition: true,
    wordTooltips: true,
    specialCharKeyboard: ${langPreset.specialCharacters.length > 0},
    celebrations: true,
    glossaryTest: false,
  },

  auth: {
    enabled: false,
    providers: [],
  },

  firebase: null,
};
`;
}

function generateClaudeMd({ courseName, langCode, langPreset, chapters, lessonsPerCh, cefrLevel, curriculumId }) {
  return `# CLAUDE.md — ${courseName}

> This file is the primary interface for AI agents working with this project.
> Read this FIRST before making any changes.

## What This Is

${courseName} is an educational web app built with the **Papertek Framework for Education**.
It teaches ${langPreset.name} (${cefrLevel}) as an offline-first PWA.

## Critical Rules

1. **NEVER edit engine files** in \`public/js/\` — these are the framework runtime
2. **ALWAYS run \`npm run validate:config\`** after changing papertek.config.js
3. **Content is data, not HTML** — all course content lives in JS/JSON data files
4. **Vocabulary comes from the API** — run \`npm run fetch:vocabulary\` at build time

## File Structure

| To change... | Edit this file | Then run |
|---|---|---|
| Course configuration | \`papertek.config.js\` | \`npm run validate:config\` |
| Lesson content | \`content/${langPreset.languageDir}/lessons-data/chapter-{N}.js\` | nothing |
| Exercises | \`content/${langPreset.languageDir}/exercises-data/${curriculumId}/chapter-{N}.js\` | nothing |
| Grammar modules | \`content/${langPreset.languageDir}/grammar-data/chapter-{N}.js\` | nothing |

## Course Structure

- **Language:** ${langPreset.name} (${langCode})
- **Level:** ${cefrLevel}
- **Chapters:** ${chapters}
- **Lessons per chapter:** ${lessonsPerCh}
- **Total lessons:** ${chapters * lessonsPerCh}
- **Curriculum ID:** \`${curriculumId}\`

## Exercise Types (17)

| Type | Key | Description |
|---|---|---|
| Fill-in-the-blank | \`fill-in\` | Text with input fields |
| Matching | \`matching\` | Pair matching game |
| True/False | \`true-false\` | Statement evaluation |
| Quiz | \`quiz\` | Multiple choice |
| Writing | \`writing\` | Free-text with auto-save |
| Drag & Drop | \`drag-drop\` | Word ordering |
| Mini Dialog | \`minidialog\` | Role-play scenarios |
| Flashcards | \`interactive-flashcards\` | Flip cards |

See \`schemas/exercise.schema.json\` for the full list and data format.

## Validation Commands

\`\`\`bash
npm run validate:config    # Validate papertek.config.js
npm run validate:schemas   # Validate content against schemas
npm run fetch:vocabulary   # Fetch vocab from API
npm run dev                # Start local dev server
\`\`\`

## Commit Message Format

\`\`\`
feat: Add exercises for chapter 3
fix: Correct answer in fill-in exercise 2-1
\`\`\`
`;
}

function generateAgentsMd({ courseName, langCode, langPreset }) {
  return `# AGENTS.md

> AAIF standard (Linux Foundation). Universal agent protocol for AI-assisted development.

## Project

- **Name:** ${courseName}
- **Type:** Offline-first educational PWA (Papertek Framework for Education)
- **Stack:** Vanilla JS (ES Modules), zero-dependency CSS
- **Target Language:** ${langPreset.name} (${langCode})

## Conventions

- All content is **data-driven** — JS/JSON data files, never HTML
- Engine files (\`public/js/\`) are **read-only**
- Content files (\`content/\`) are the **only files to create or edit**
- All content must conform to schemas in \`schemas/\`

## Configuration

- \`papertek.config.js\` — course settings
- \`CLAUDE.md\` — detailed AI instructions

## Key Commands

| Command | Purpose |
|---|---|
| \`npm run dev\` | Start local dev server |
| \`npm run validate:config\` | Validate config |
| \`npm run validate:schemas\` | Validate content |
| \`npm run fetch:vocabulary\` | Fetch vocabulary from API |
`;
}

function generatePackageJson({ slug, courseName }) {
  return {
    name: slug,
    version: '1.0.0',
    type: 'module',
    description: `${courseName} — built with Papertek Framework for Education`,
    private: true,
    license: 'CC-BY-SA-4.0',
    scripts: {
      'dev': 'npx http-server public -p 8000 -c-1',
      'fetch:vocabulary': 'node scripts/fetch-vocabulary.cjs',
      'validate:config': 'node scripts/config-parser.js',
      'validate:schemas': 'node scripts/validate-schemas.js',
      'build': 'npm run fetch:vocabulary',
    },
    engines: { node: '>=18.0.0' },
  };
}

function generateContentStubs({ projectRoot, langPreset, curriculumId, chapters, lessonsPerCh }) {
  const langDir = langPreset.languageDir;

  for (let ch = 1; ch <= chapters; ch++) {
    // Lesson data stub
    const lessonData = {};
    for (let l = 1; l <= lessonsPerCh; l++) {
      lessonData[`${ch}-${l}`] = {
        title: `Chapter ${ch}, Lesson ${l}`,
        goals: ['Goal 1', 'Goal 2'],
        dialog: [],
      };
    }

    writeFileSync(
      join(projectRoot, `content/${langDir}/lessons-data/chapter-${ch}.js`),
      `/**\n * Chapter ${ch} — Lesson Data\n * @see schemas/lesson.schema.json\n */\nexport const lessonsData = ${JSON.stringify(lessonData, null, 2)};\n`
    );

    // Exercise data stub
    const exerciseData = {};
    for (let l = 1; l <= lessonsPerCh; l++) {
      exerciseData[`${ch}-${l}`] = {
        exercises: [
          {
            id: `aufgabeA`,
            type: 'fill-in',
            title: `Exercise A`,
            badges: [],
            description: 'Complete the sentences.',
            items: [
              { pre: '1. ___', answer: 'answer', post: '.', width: 'w-28' },
            ],
          },
        ],
        extraExercises: [],
      };
    }

    writeFileSync(
      join(projectRoot, `content/${langDir}/exercises-data/${curriculumId}/chapter-${ch}.js`),
      `/**\n * Chapter ${ch} — Exercise Data\n * @see schemas/exercise.schema.json\n */\nexport const exercisesData = ${JSON.stringify(exerciseData, null, 2)};\n`
    );

    // Grammar data stub
    writeFileSync(
      join(projectRoot, `content/${langDir}/grammar-data/chapter-${ch}.js`),
      `/**\n * Chapter ${ch} — Grammar Modules\n * @see schemas/grammar.schema.json\n */\nexport const grammarModules = {\n  "${ch}": [\n    { type: "tittel", tekst: "Chapter ${ch} Grammar" },\n    { type: "forklaring", tekst: "Grammar explanation goes here." }\n  ]\n};\n`
    );
  }
}

function generateGitignore() {
  return `node_modules/
.DS_Store
*.log
.env
.env.local
dist/
shared/vocabulary/
public/shared/
.cache/
`;
}

function generateIndexHtml({ courseName, chapters, lessonsPerCh }) {
  const chapterLinks = [];
  for (let ch = 1; ch <= chapters; ch++) {
    const lessonLinks = [];
    for (let l = 1; l <= lessonsPerCh; l++) {
      lessonLinks.push(`            <li><a href="#" class="text-blue-600 hover:underline">Lesson ${ch}.${l}</a></li>`);
    }
    chapterLinks.push(`
        <div class="mb-8">
          <h2 class="text-xl font-bold mb-2">Chapter ${ch}</h2>
          <ul class="space-y-1 ml-4">
${lessonLinks.join('\n')}
          </ul>
        </div>`);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${courseName}</title>
  <link rel="stylesheet" href="css/papertek.css">
</head>
<body class="bg-neutral-50 text-neutral-800">
  <div class="max-w-3xl mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold text-primary-700 mb-8">${courseName}</h1>
    <div id="lessons-container">
${chapterLinks.join('\n')}
    </div>
  </div>
</body>
</html>
`;
}

// ── Run ──────────────────────────────────────────────────────────
main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
