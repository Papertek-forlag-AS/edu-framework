# AGENTS.md

> AAIF standard (Linux Foundation). Universal agent protocol for AI-assisted development.
> Supported by Claude Code, Cursor, Copilot, Gemini CLI.

## Project

- **Name:** Papertek — Framework for Education
- **Type:** Offline-first educational PWA framework
- **Stack:** Vanilla JS (ES Modules), zero-dependency CSS, Firebase (optional)
- **License:** MIT (engine), CC-BY-SA (content)

## Conventions

- All content is **data-driven** — JSON/JS data files, never HTML
- Engine files (`public/js/`) are **read-only** — never modify
- Generated lesson HTML files are **read-only** — regenerate with `npm run generate:lessons`
- Content files (`content/{lang}/`) are the **only files AI should create or edit**
- All content must conform to schemas in `schemas/` directory
- Validation must pass before any commit: `npm run validate`
- Vocabulary is fetched from an external API at build time, never bundled

## Configuration

- `papertek.config.js` — course settings (human-edited, AI can suggest changes)
- `CLAUDE.md` — detailed AI instructions (read this for full context)

## Schemas

| File | Validates |
|---|---|
| `schemas/exercise.schema.json` | 17 exercise types |
| `schemas/vocabulary.schema.json` | Vocab banks, translations, manifests |
| `schemas/lesson.schema.json` | Lesson dialog, goals, checklist |
| `schemas/grammar.schema.json` | Grammar modules (7 types) |
| `schemas/curriculum.schema.json` | Curriculum registry, exercise database |
| `schemas/question-bank.schema.json` | Test/quiz questions |
| `schemas/language.schema.json` | Language-specific configuration |

## Key Commands

```bash
npm run validate          # Validate all content against schemas
npm run fetch:vocabulary  # Fetch vocabulary from API (build time)
npm run build:vocab       # Full vocabulary pipeline
npm run generate:lessons  # Generate lesson HTML from templates
npm run dev               # Local development server (port 8000)
```

## Skills

Skills are AI workflow instructions in `.claude/skills/`:

- `/create-exercises` — Generate exercises for a lesson
- More skills planned for Phase 5

## File Structure

```
papertek.config.js        ← Educator's config (edit this)
CLAUDE.md                 ← AI agent instructions (read this)
AGENTS.md                 ← This file (AAIF standard)
schemas/                  ← JSON schemas (content contracts)
content/{lang}/           ← Course content (AI-generated)
public/js/                ← Framework engine (read-only)
public/sw.js              ← Service Worker (offline)
scripts/                  ← Build scripts
.claude/skills/           ← AI workflow files
```
