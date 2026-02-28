# CLAUDE.md — Papertek Edu-Framework

> This file is the primary interface for AI agents working with Papertek projects.
> Read this FIRST before making any changes.

## What This Is

Papertek Edu-Framework is an open-source framework for building **offline-first educational web apps** (PWAs). It uses vanilla JavaScript (ES modules), zero-dependency CSS, and convention-over-configuration design.

The framework is designed to be **built by AI agents** reading this file — not hand-coded by humans. An educator describes what they want; an AI agent reads this file, the JSON schemas, and the skills to build a complete, working app.

**Key constraints:**

- No build-time transpilation of application JS (ES modules loaded natively)
- No virtual DOM — every DOM mutation is explicit and intentional
- Offline-first: the app works 100% without network via localStorage + Service Worker
- Cloud sync is additive (enhances, never gates functionality)
- Targets resource-constrained devices (school Chromebooks, older tablets)

## Critical Rules

1. **NEVER edit engine files** in `public/js/` — these are the framework runtime
2. **NEVER edit generated lesson HTML files** (`vg1-*.html`, `us-*.html`) — they are auto-generated
3. **ALWAYS run `npm run validate:schemas` after making content changes**
4. **ALWAYS use skills** (`/create-lesson`, `/create-exercises`, etc.) for content creation
5. **Content is data, not HTML** — all course content lives in JS/JSON data files, never in HTML
6. **Vocabulary comes from the API** — run `npm run fetch:vocabulary` at build time, never bundle static vocab
7. **No external JS frameworks** — no React, Vue, Svelte, jQuery, or similar
8. **Content files are the only files AI should create or edit** — everything in `content/{lang}/`

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:8000)
npm run dev

# Scaffold a new course project
node cli/create-edu-app.js --name "French A1" --lang fr --chapters 8 --lessons 3

# Validate everything
npm run validate:schemas
```

## Project Configuration

All project settings are in `papertek.config.js`:

- **course** — name, description, version, author, license
- **targetLanguage** — ISO code, gender system (`none`/`two`/`three`), special characters, TTS voice, articles, verb config, case system
- **uiLanguages** — available UI translations (one must have `default: true`)
- **curricula** — course tracks with id, filePrefix, chapters, lessonsPerChapter, CEFR level, contentPath
- **vocabularyApi** — base URL, CDN URL, languages, translation pairs
- **features** — feature flags (offlineMode, cloudSync, teacherDashboard, vocabTrainer, spacedRepetition, etc.)
- **auth** — authentication providers (Firebase/FEIDE/Google, all optional)
- **firebase** — Firebase config (null to disable)

Run `node scripts/config-parser.js` to validate the config.

## Repository Structure

```
edu-framework/
├── papertek.config.js          # Educator's primary config file
├── CLAUDE.md                   # AI agent instructions (this file)
├── AGENTS.md                   # AAIF standard agent protocol
├── ARCHITECTURE.md             # Engine internals (ExerciseBase, ProgressHub, etc.)
├── CONTRIBUTING.md             # Contribution guide
├── package.json                # Node 18+, ES modules ("type": "module")
│
├── cli/
│   └── create-edu-app.js       # Project scaffolder CLI
│
├── content/                    # Course content (AI-generated, initially empty)
│   └── {lang}/
│       ├── lessons-data/chapter-{N}.js
│       ├── exercises-data/{curriculum}/chapter-{N}.js
│       └── grammar-data/chapter-{N}.js
│
├── public/                     # Static web root
│   ├── js/                     # Framework engine (READ-ONLY)
│   ├── papertek.css            # Design system (CSS custom properties)
│   ├── stylesheet.css          # Additional styles
│   └── sw.js                   # Service Worker (offline support)
│
├── schemas/                    # JSON schemas (content contracts)
│   ├── exercise.schema.json
│   ├── lesson.schema.json
│   ├── grammar.schema.json
│   ├── vocabulary.schema.json
│   ├── curriculum.schema.json
│   ├── question-bank.schema.json
│   └── language.schema.json
│
├── scripts/                    # Build and validation scripts
│   ├── config-parser.js        # Validates papertek.config.js
│   ├── validate-schemas.js     # Validates content against JSON schemas
│   ├── validate-vocabulary.js  # Validates vocabulary data
│   ├── fetch-vocabulary.cjs    # Fetches vocab from external API
│   ├── update-version.js       # Bumps project version
│   ├── migrate-tailwind.cjs    # CSS migration utility
│   └── dictionary/             # Dictionary build pipeline
│       ├── enrich-curriculum-words.js
│       ├── import-goethe-words.js
│       ├── add-frequency-data.js
│       ├── generate-dict-translations.js
│       ├── build-search-index.js
│       ├── add-frequency-words.js
│       └── parse-goethe-pdf.js
│
├── templates/
│   └── papertek.config.template.js  # Config template for scaffolder
│
├── examples/                   # Example courses
│   ├── german-a1/              # German A1 (2 chapters, full content)
│   ├── math-basics/            # Math (proves non-language use)
│   └── minimal-course/         # Minimal example
│
├── tests/
│   ├── setup.js                # Vitest setup (localStorage mock, console mock)
│   ├── unit/                   # Unit tests (Vitest)
│   │   ├── progress.test.js
│   │   ├── error-handler.test.js
│   │   └── sw-logic.test.js
│   └── e2e/                    # E2E tests (Playwright)
│       └── homepage.spec.js
│
├── docs/
│   └── exercise-catalog.md     # All 17 exercise types with data formats
│
├── .claude/skills/             # AI agent skill files
│   ├── create-project.md
│   ├── create-lesson.md
│   ├── create-exercises.md
│   ├── create-grammar.md
│   ├── create-vocabulary.md
│   ├── create-test.md
│   ├── add-curriculum.md
│   ├── audit-content.md
│   └── vocabulary-api.md
│
├── .github/workflows/
│   └── validate-vocabulary.yml  # CI: validates vocab on push/PR
│
├── eslint.config.js            # ESLint 9 flat config
├── .prettierrc                 # Prettier config
├── vitest.config.js            # Vitest config (jsdom env)
└── playwright.config.js        # Playwright config (Chromium, Firefox, WebKit, mobile)
```

## File Editing Convention

| To change... | Edit this file | Then run |
|---|---|---|
| Course configuration | `papertek.config.js` | `npm run generate:lessons` |
| Lesson content (dialog, goals) | `content/{lang}/lessons-data/chapter-{N}.js` | `npm run validate:schemas` |
| Exercises | `content/{lang}/exercises-data/{curriculum}/chapter-{N}.js` | `npm run validate:schemas` |
| Grammar modules | `content/{lang}/grammar-data/chapter-{N}.js` | `npm run validate:schemas` |
| Vocabulary | Fetched from API at build time | `npm run fetch:vocabulary` |
| UI translations | `public/js/locales/{locale}.js` | nothing |
| Template structure | `public/js/lesson-template/template.html` | `npm run generate:lessons` |
| Lesson config (tabs, features) | `public/js/lesson-template/lessons-metadata.js` | `npm run generate:lessons` |

## Schemas

All content must conform to JSON schemas in `schemas/`. The validator uses AJV with draft 2020-12 support.

| Schema | Validates |
|---|---|
| `exercise.schema.json` | Exercise data (17 types, fill-in, matching, quiz, etc.) |
| `vocabulary.schema.json` | Vocabulary banks, translations, curriculum manifests |
| `lesson.schema.json` | Lesson data (dialog, goals, checklist) + metadata |
| `grammar.schema.json` | Grammar modules (7 types: tittel, forklaring, tabell, etc.) |
| `curriculum.schema.json` | Curriculum registry + exercise database config |
| `question-bank.schema.json` | Test questions (fill-in, drag-drop, multiple-choice) |
| `language.schema.json` | Language-specific config (gender, cases, characters) |

### Validating content

```bash
# Validate all content against schemas
node scripts/validate-schemas.js

# Validate only exercises
node scripts/validate-schemas.js --schema exercise

# Validate a single file
node scripts/validate-schemas.js --file content/german/exercises-data/german-a1/chapter-1.js --schema exercise
```

## Exercise Types (17)

| Type | Key | Description |
|---|---|---|
| Fill-in-the-blank | `fill-in` | Text with input fields, supports separable verbs |
| Matching | `matching` | Pair matching game |
| True/False | `true-false` | Statement evaluation |
| True/False Pictures | `true-false-pictures` | Image-based true/false |
| Quiz | `quiz` | Multiple choice (simple or structured) |
| Writing | `writing` | Free-text with auto-save |
| Drag & Drop | `drag-drop` | Word ordering / sentence building |
| Mini Dialog | `minidialog` | Role-play scenarios |
| Dilemma | `dilemma` | Dropdown selection |
| Image Matching | `image-matching` | Image-to-text pairs |
| Chronology | `chronology` | Timeline ordering |
| Checklist | `checklist` | Self-assessment |
| Flashcards | `interactive-flashcards` | Flip cards |
| Interactive Map | `interactive-map` | Clickable geography |
| Number Grids | `number-grids` | Number practice |
| Color Picker | `color-picker` | Color identification |
| Verb Trainer | `embedded-verb-trainer` | Conjugation drills |

See `docs/exercise-catalog.md` for full data format examples of each type.

## Naming Conventions

- **Exercise IDs**: `{type}-{number}-{chapterId}` (e.g., `fill-in-1-3-2`)
- **Extra exercise IDs**: `ekstraovelse-{N}-{chapterId}` (e.g., `ekstraovelse-1-3-1`)
- **Storage keys**: `{curriculum}-{lessonId}-{exerciseType}-{exerciseId}`
- **Lesson IDs**: `{chapter}-{lesson}` (e.g., `3-1`, `5-2`)
- **Lesson files**: `{prefix}-{chapter}-{lesson}.html` (e.g., `vg1-3-2.html`)
- **Word IDs**: `{stem}_{type}` (e.g., `abend_noun`, `spielen_verb`)
- **Content paths**: `content/{language}/lessons-data/chapter-{N}.js`

## NPM Scripts Reference

### Development

```bash
npm run dev                 # Start http-server on port 8000 (no cache)
npm run create              # Run the CLI scaffolder interactively
```

### Validation

```bash
npm run validate:schemas    # Content matches JSON schemas (AJV)
npm run validate:config     # Validate papertek.config.js
npm run verify:lessons      # Generated HTML files match templates
```

### Build

```bash
npm run fetch:vocabulary    # Fetch vocab from Papertek Vocabulary API
npm run build:dictionary    # Enrich words, import Goethe list, add frequency, generate translations, build search index
npm run build:vocab         # Full vocab pipeline (fetch + dictionary + copy to public/)
npm run build               # Alias for build:vocab
npm run generate:lessons    # Generate lesson HTML from templates
```

### Code Quality

```bash
npm run lint                # ESLint (flat config, ESLint 9)
npm run lint:fix            # ESLint with auto-fix
npm run format              # Prettier
```

### Testing

```bash
npm test                    # Vitest (unit tests, jsdom environment)
npm run test:e2e            # Playwright (Chromium, Firefox, WebKit, mobile viewports)
```

## Testing Details

### Unit Tests (Vitest)

- Environment: `jsdom`
- Setup: `tests/setup.js` (mocks localStorage and console)
- Globals: enabled (`describe`, `it`, `expect` available without import)
- Coverage: v8 provider with text, JSON, and HTML reporters
- Location: `tests/unit/*.test.js`

### E2E Tests (Playwright)

- Browsers: Chromium, Firefox, WebKit, Mobile Chrome (Pixel 5), Mobile Safari (iPhone 12)
- Base URL: `http://localhost:3000`
- Web server: auto-starts `npx http-server . -p 3000`
- Retries: 2 in CI, 0 locally
- Location: `tests/e2e/*.spec.js`

## Code Style

Configured in `eslint.config.js` and `.prettierrc`:

- **Semicolons**: always
- **Quotes**: single (with `avoidEscape`)
- **Trailing commas**: ES5
- **Print width**: 100
- **Tab width**: 2 (spaces, not tabs)
- **Arrow parens**: avoid (`x => x`, not `(x) => x`)
- **Curly braces**: always required (`if (x) { ... }`, not `if (x) ...`)
- **Brace style**: 1tbs
- **No var**: error (use `const`/`let`)
- **Strict equality**: always (`===`, never `==`)
- **No eval**: error
- **ESLint ignores**: `public/`, `node_modules/`, `*.min.js`

## CI/CD

### GitHub Actions

- **validate-vocabulary.yml** — runs on push/PR affecting `shared/vocabulary/**`
  - Validates vocabulary data
  - Checks audio file coverage
  - Verifies iOS and webapp symlinks

## Engine Architecture (read-only)

The engine lives in `public/js/` and must NEVER be edited by content authors or AI agents creating content. It is only modified by engine developers.

```
public/js/
├── main.js                     # Entry point → page-init.js
├── page-init.js                # Page-type detection → specialized init
├── ui.js                       # Tabs, header, special chars, PWA install
├── exercises.js                # Exercise orchestrator
├── exercises-content-loader.js # Loads exercise data from content files
├── lessons-content-loader.js   # Loads lesson data from content files
├── grammar-content-loader.js   # Loads grammar data from content files
├── grammar-renderer.js         # Grammar module renderer (7 types + tool registry)
├── error-handler.js            # Global error handling
├── logger.js                   # Logging utility
│
├── exercises/                  # ExerciseBase factory + 17 exercise type renderers
│   ├── exercise-base.js        # Factory pattern: createExercise(), notifyStorageChange()
│   ├── embedded-verb-trainer-v2.js  # Reference impl using ExerciseBase
│   ├── fill-in.js              # Legacy exercise modules (direct addEventListener)
│   ├── matching-game.js
│   ├── quiz.js
│   ├── true-false.js
│   ├── drag-drop-sentences.js
│   ├── writing.js
│   ├── minidialog.js
│   ├── dilemma.js
│   ├── image-matching-game.js
│   ├── chronology.js
│   ├── checklist.js
│   ├── interactive-flashcards.js
│   ├── interactive-map.js
│   ├── number-grids.js
│   ├── color-picker.js
│   ├── embedded-gender-trainer.js
│   ├── interactive-clock.js
│   ├── interactive-clock-2-3.js
│   ├── core-reset.js
│   └── storage-utils.js        # Exercise-level localStorage helpers
│
├── progress/                   # Progress tracking system
│   ├── index.js                # Barrel re-export (public API)
│   ├── store.js                # Low-level localStorage (saveData/loadData)
│   ├── achievements.js         # Exercise completion → achievement counters
│   ├── config.js               # EXERCISE_DATABASE (exercise counts per lesson)
│   ├── progress-hub.js         # ProgressHub pub/sub singleton
│   ├── total-progress-bar.js   # Global progress bar widget
│   ├── curriculum-registry.js  # Runtime curriculum config (CURRICULUM_REGISTRY)
│   ├── curriculum.js           # Curriculum logic
│   ├── celebrations.js         # Milestone celebrations
│   ├── icons.js                # Progress icons
│   ├── import-export.js        # Progress data import/export
│   ├── migration.js            # Data migration
│   ├── repair.js               # Data repair utilities
│   ├── reset.js                # Progress reset
│   ├── tests.js                # Chapter/cumulative tests
│   └── ui.js                   # Lesson list icons, progress page
│
├── vocab-trainer-multi/        # 5-mode vocabulary trainer
│   ├── index.js                # Trainer entry point
│   ├── flashcards.js           # Mode 1: Flip cards
│   ├── write.js                # Mode 2: Type answers
│   ├── match.js                # Mode 3: Matching pairs
│   ├── test.js                 # Mode 4: Vocabulary test
│   ├── gender.js               # Mode 5: Gender training
│   ├── verb-test.js            # Verb conjugation testing
│   ├── vocabulary-loader.js    # Loads vocab data
│   ├── known-words-view.js     # Known words display
│   ├── i18n-helper.js          # Trainer-specific i18n
│   ├── utils.js                # Trainer utilities
│   └── utils/
│       ├── answer-validation.js
│       ├── storage.js
│       ├── known-words.js
│       └── levenshtein.js      # Fuzzy matching
│
├── core/                       # Domain algorithms
│   ├── SM2Algorithm.js         # Spaced repetition (SuperMemo 2)
│   ├── VocabProfileService.js  # Vocabulary profile management
│   ├── language-utils.js       # Central language abstraction layer
│   └── adapters/
│       ├── LocalStorageAdapter.js
│       ├── BlobAdapter.js
│       └── DataAdapter.js
│
├── vocabulary/                 # Vocabulary API integration
│   ├── vocab-api-client.js     # API client
│   ├── vocabulary-merger.js    # Merges vocab from multiple sources
│   └── vocabulary-provider.js  # Provides vocab to consumers
│
├── auth/                       # Authentication (optional)
│   ├── auth-provider-registry.js  # Pluggable auth providers
│   ├── auth-ui.js              # Auth UI components
│   ├── firebase-client.js      # Firebase client
│   ├── firebase-feide-auth.js  # FEIDE auth via Firebase
│   └── google-auth.js          # Google auth
│
├── sync/                       # Cloud sync (optional)
│   ├── cloud-sync.js           # Firestore ↔ localStorage merge
│   └── migration.js            # Sync data migration
│
├── teacher-mode/               # Teacher dashboard (optional)
│   ├── dashboard-ui.js
│   ├── class-manager.js
│   └── teacher-content-loader.js
│
├── dialog/                     # Classroom games
│   ├── classroom-dialog-loader.js
│   ├── bingo.js
│   ├── jeopardy.js
│   ├── konjugations-karussell.js
│   ├── ord-battle.js
│   └── tier-rennen.js
│
├── gloseproeve/                # Teacher-created vocabulary tests
│   ├── glossary-test-service.js
│   ├── glossary-test-teacher-ui.js
│   └── glossary-test-student-ui.js
│
├── feedback/                   # User feedback system
│   ├── index.js
│   ├── feedback-widget.js
│   ├── feedback-reports.js
│   ├── error-capture.js
│   ├── context-collector.js
│   └── page-source-map.js
│
├── layout/                     # App shell
│   ├── shell.js
│   └── modals.js
│
├── offline/                    # Offline support
│   └── download-manager.js
│
├── utils/                      # Shared utilities
│   ├── i18n.js                 # Internationalization
│   ├── content-loader.js       # Generic content loading
│   ├── word-tooltips.js        # Vocabulary word tooltips
│   ├── answer-reports.js       # Answer reporting
│   ├── debug-utils.js          # Debug helpers
│   └── environment-indicator.js
│
├── locales/                    # UI translations
│   ├── no.js                   # Norwegian bokmål
│   └── en.js                   # English
│
├── lesson-template/            # Lesson HTML generator
│   ├── template-generator.js   # Generates HTML from templates
│   ├── lessons-metadata.js     # Lesson config (tabs, features)
│   └── verify-generated.js     # Verifies generated files
│
├── config/
│   └── env.js                  # Environment configuration
│
├── classes/
│   └── student-class-service.js
│
└── project.js                  # Project-level utilities
```

## Language Abstraction Layer

The engine is language-agnostic. All language-specific behavior is driven by configuration:

```
papertek.config.js          ← Educator's config
    │
    ▼
curriculum-registry.js      ← Runtime config (CURRICULUM_REGISTRY)
    │
    ▼
language-utils.js           ← Central abstraction (public/js/core/)
    │                          Exports: genusToArticle, getArticles, getPronouns,
    │                          normalizeChars, getSpecialChars, getDataKeys, etc.
    ▼
Engine modules              ← Import from language-utils, never hardcode
```

Never hardcode language-specific values (articles, pronouns, special characters) in engine modules. Always use `language-utils.js`.

## Available Skills

Skills are AI workflow instructions in `.claude/skills/`. They read `papertek.config.js` to adapt to the configured language and course structure.

| Skill | Purpose | Usage |
|---|---|---|
| `/create-project` | Scaffold a new Papertek app | Interactive CLI |
| `/create-lesson` | Generate lesson data (dialog, goals, checklist) | `/create-lesson 1-1` |
| `/create-exercises` | Generate exercises + extra exercises for a lesson | `/create-exercises german-a1 3 2` |
| `/create-grammar` | Generate grammar modules (7 types + interactive tools) | `/create-grammar 1` |
| `/create-vocabulary` | Build vocabulary banks with translations | `/create-vocabulary` |
| `/create-test` | Build question banks (lesson, chapter, cumulative) | `/create-test` |
| `/add-curriculum` | Add a new curriculum track to an existing project | `/add-curriculum` |
| `/audit-content` | Validate content, check completeness, find issues | `/audit-content` |

The `/vocabulary-api` skill documents the Papertek Vocabulary API endpoints.

## Vocabulary Pipeline

Vocabulary is **never bundled statically**. It is fetched from the external Papertek Vocabulary API at build time:

```bash
# 1. Fetch word banks, translations, and audio from API
npm run fetch:vocabulary

# 2. Enrich, import Goethe words, add frequency data, generate translations, build search index
npm run build:dictionary

# 3. Copy to public/ for serving
# (build:vocab does all three steps)
npm run build:vocab
```

The API serves word banks (nounbank, verbbank, generalbank, etc.), translation pairs (de-nb, de-en), and audio files.

## Commit Message Format

Use conventional commits:

```
feat: Add new exercise type for sentence building
fix: Correct umlaut normalization in fill-in validation
refactor: Extract grammar renderer into module registry
docs: Update architecture documentation
```

All AI-generated commits include:
```
🤖 Generated with Papertek Edu-Framework

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Related Documentation

| Document | Purpose |
|---|---|
| `ARCHITECTURE.md` | Engine internals: ExerciseBase factory, ProgressHub pub/sub, TotalProgressBar widget, migration guide |
| `AGENTS.md` | AAIF standard agent protocol (Linux Foundation) |
| `CONTRIBUTING.md` | How to contribute: add exercise types, language presets, skills, CSS |
| `docs/exercise-catalog.md` | All 17 exercise types with full data format examples |
| `schemas/` | JSON schemas — the source of truth for content structure |
