# CLAUDE.md — Papertek: Framework for Education

> This file is the primary interface for AI agents working with Papertek projects.
> Read this FIRST before making any changes.

## What This Is

Papertek — Framework for Education is an open-source framework for building **offline-first educational web apps** (PWAs). It uses vanilla JavaScript (ES modules), zero-dependency CSS, and convention-over-configuration design.

The framework is designed to be **built by AI agents** reading this file — not hand-coded by humans.

## Critical Rules

1. **NEVER edit engine files** in `public/js/` — these are the framework runtime
2. **NEVER edit generated lesson HTML files** (`vg1-*.html`, `us-*.html`) — they are auto-generated
3. **ALWAYS run `npm run validate` after making content changes**
4. **ALWAYS use skills** (`/create-lesson`, `/create-exercises`, etc.) for content creation
5. **Content is data, not HTML** — all course content lives in JS/JSON data files, never in HTML
6. **Vocabulary comes from the API** — run `npm run fetch:vocabulary` at build time, never bundle static vocab

## Project Configuration

All project settings are in `papertek.config.js`:
- Course metadata (name, description, version)
- Target language config (gender system, special characters, TTS)
- Curricula definitions (chapters, levels, prefixes)
- Feature flags (offline, cloud sync, teacher dashboard, etc.)
- Vocabulary API endpoints

Run `node scripts/config-parser.js` to validate the config.

## File Structure Convention

| To change... | Edit this file | Then run |
|---|---|---|
| Course configuration | `papertek.config.js` | `npm run generate:lessons` |
| Lesson content (dialog, goals) | `content/{lang}/lessons-data/chapter-{N}.js` | `npm run validate` |
| Exercises | `content/{lang}/exercises-data/{curriculum}/chapter-{N}.js` | `npm run validate` |
| Grammar modules | `content/{lang}/grammar-data/chapter-{N}.js` | `npm run validate` |
| Vocabulary | Fetched from API at build time | `npm run fetch:vocabulary` |
| UI translations | `public/js/locales/{locale}.js` | nothing |
| Template structure | `public/js/lesson-template/template.html` | `npm run generate:lessons` |
| Lesson config (tabs, features) | `public/js/lesson-template/lessons-metadata.js` | `npm run generate:lessons` |

## Schemas

All content must conform to JSON schemas in `schemas/`:

| Schema | Validates |
|---|---|
| `exercise.schema.json` | Exercise data (19 types, fill-in, matching, quiz, etc.) |
| `vocabulary.schema.json` | Vocabulary banks, translations, curriculum manifests |
| `lesson.schema.json` | Lesson data (dialog, goals, checklist) + metadata |
| `grammar.schema.json` | Grammar modules (7 types: heading, explanation, rule-table, etc.) |
| `curriculum.schema.json` | Curriculum registry + exercise database config |
| `question-bank.schema.json` | Test questions (fill-in, drag-drop, multiple-choice) |
| `language.schema.json` | Language-specific config (gender, cases, characters) |

## Exercise Types (19)

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
| Gender Trainer | `embedded-gender-trainer` | Grammatical gender practice |
| Categorize | `categorize` | Sorting items into category buckets |

## Naming Conventions

- **Exercise IDs**: `{type}-{number}-{chapterId}` (e.g., `fill-in-1-3-2`)
- **Extra exercise IDs**: `extra-exercise-{N}-{chapterId}` (e.g., `extra-exercise-1-3-1`)
- **Storage keys**: `{curriculum}-{lessonId}-{exerciseType}-{exerciseId}`
- **Lesson IDs**: `{chapter}-{lesson}` (e.g., `3-1`, `5-2`)
- **Lesson files**: `{prefix}-{chapter}-{lesson}.html` (e.g., `vg1-3-2.html`)
- **Word IDs**: `{stem}_{type}` (e.g., `abend_noun`, `spielen_verb`)

## Validation Commands

```bash
npm run validate              # All validators
npm run validate:schemas      # Content matches JSON schemas
node scripts/config-parser.js # Validate papertek.config.js
npm run verify:lessons        # Generated files match templates
npm run fetch:vocabulary      # Fetch vocab from API (build time)
npm run build:vocab           # Full vocab pipeline (fetch + enrich + copy)
```

## Available Skills

| Skill | Purpose |
|---|---|
| `/create-project` | Scaffold a new Papertek app (interactive CLI) |
| `/create-lesson` | Generate lesson data (dialog, goals, checklist) |
| `/create-exercises` | Generate exercises and extra exercises for a lesson |
| `/create-grammar` | Generate grammar modules (7 types + interactive tools) |
| `/create-vocabulary` | Build vocabulary banks with translations |
| `/create-test` | Build question banks (lesson, chapter, cumulative) |
| `/add-curriculum` | Add a new curriculum track to an existing project |
| `/audit-content` | Validate content, check completeness, find issues |

## Engine Architecture (read-only)

```
public/js/
  exercises/          # ExerciseBase factory + 19 exercise type renderers
  progress/           # ProgressHub, achievements, celebrations, store
  vocab-trainer-multi/# 5-mode vocabulary trainer (flashcards, write, match, test, gender)
  core/               # SM-2 spaced repetition, VocabProfileService
  layout/             # AppShell, tabs, modals
  auth/               # Firebase auth (optional), FEIDE, Google
  sync/               # Cloud sync (optional)
  teacher-mode/       # Teacher dashboard, class management
  vocabulary/         # Vocab API client, merger, provider
  dialog/             # Classroom games (Bingo, Tier-Rennen, Jeopardy, etc.)
  gloseproeve/        # Teacher-created vocabulary tests
  offline/            # Download manager
  lesson-template/    # Lesson HTML generator
  utils/              # i18n, word-tooltips, content-loader, etc.
  locales/            # UI translations (nb.js, en.js)
```

## Commit Message Format

```
feat: Add new exercise type for sentence building
fix: Correct umlaut normalization in fill-in validation
refactor: Extract grammar renderer into module registry
```

All AI-generated commits include:
```
🤖 Generated with Papertek — Framework for Education

Co-Authored-By: Claude <noreply@anthropic.com>
```
