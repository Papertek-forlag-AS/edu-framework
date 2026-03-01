# Papertek — Framework for Education

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green.svg)](https://nodejs.org)

An open-source framework for building **offline-first educational web apps** (PWAs). Designed to be built by AI agents — not hand-coded by humans.

Describe your course in natural language. An AI agent builds it. Deploy anywhere.

**See it in action:** [papertek.no/tysk](https://papertek.no/tysk) — a complete German course for Norwegian high school students, built with this framework.

## Why Papertek?

Most educational apps require a team of developers. Papertek flips that: the **AI is the developer**. An educator describes what they want, and an AI agent (Claude Code, Cursor, etc.) reads the framework's CLAUDE.md, schemas, and skills to build a complete, working app.

The framework provides the engine — 17 exercise types, spaced repetition vocabulary training, progress tracking, offline support, and more. You just provide the content.

**Key properties:**

- **AI-as-developer** — CLAUDE.md and JSON schemas are the primary interface, not docs for humans
- **Offline-first** — Service Worker + localStorage, works without internet after first load
- **Zero JS dependencies** — Vanilla JavaScript with ES modules, no React, no build step
- **Convention over configuration** — Rigid file structure means fewer AI mistakes
- **Schema-driven content** — JSON schemas validate everything the AI generates
- **Language-agnostic** — Built for German, but works for any language (or non-language subjects like math)

## Quick Start

### Create a new course

```bash
# Interactive
node cli/create-edu-app.js

# Or with flags
node cli/create-edu-app.js --name "French A1" --lang fr --chapters 8 --lessons 3
```

This scaffolds a complete project with config, content stubs, engine, schemas, and AI skill files.

### Build content with AI

Open the scaffolded project in Claude Code (or any AI coding tool) and use the built-in skills:

```
/create-lesson 1-1      → Generate lesson dialog, goals, checklist
/create-exercises 1-1    → Generate exercises for that lesson
/create-grammar 1        → Generate grammar modules for chapter 1
/create-vocabulary       → Build vocabulary banks
/create-test             → Build question banks
/audit-content           → Validate everything
```

The AI reads `CLAUDE.md` and the JSON schemas to generate content that conforms to the framework's conventions.

### Run locally

```bash
npm install
npm run dev
# Opens http://localhost:8000
```

## What's in the Box

### Engine (17 Exercise Types)

Fill-in-the-blank, matching, true/false, quiz, drag & drop, writing, mini dialog, dilemma, image matching, chronology, checklist, flashcards, interactive map, number grids, color picker, verb trainer — plus a true/false variant with pictures.

### Vocabulary Trainer (5 Modes)

Flashcards, write, match, test, and gender training — powered by SM-2 spaced repetition.

### Progress System

Achievement stars, celebrations, completion tracking, milestone tests, import/export. All stored in localStorage with optional Firebase cloud sync.

### Offline Support

Service Worker caches everything. Students can use the app without internet after the first load.

### Teacher Dashboard

Optional classroom management: create classes, assign vocabulary tests, track student progress.

### Classroom Games

Bingo, Tier-Rennen (animal race), Jeopardy, Konjugations-Karussell, Ord-Battle — built for projecting in class.

## Project Structure

```
papertek.config.js              ← The educator's touchpoint
content/{lang}/                 ← AI-generated course content
  lessons-data/chapter-{N}.js
  exercises-data/{curriculum}/chapter-{N}.js
  grammar-data/chapter-{N}.js
public/js/                      ← Framework engine (don't edit)
schemas/                        ← JSON schemas (content contracts)
.claude/skills/                 ← AI workflow instructions
cli/                            ← Project scaffolder
```

**Rule:** Content is data, not HTML. All course content lives in JS/JSON data files. Lesson HTML is auto-generated from templates.

## Examples

The `examples/` directory contains proof-of-concept courses:

- **`german-a1/`** — German for beginners (2 chapters, lessons + exercises + grammar)
- **`math-basics/`** — Basic algebra (proves the framework works beyond languages)

## Documentation

| Document | Audience | Purpose |
|----------|----------|---------|
| [CLAUDE.md](CLAUDE.md) | AI agents | Primary interface — read this first |
| [AGENTS.md](AGENTS.md) | AI agents | AAIF standard agent protocol |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Developers | Engine internals and abstraction layer |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contributors | How to add exercise types, skills, content |
| [docs/exercise-catalog.md](docs/exercise-catalog.md) | Content authors | All 17 exercise types with data formats |
| [schemas/](schemas/) | AI + developers | JSON schemas for content validation |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Vanilla JS (ES Modules) |
| Styling | CSS custom properties + semantic classes |
| Offline | Service Worker + localStorage |
| Auth | Firebase (optional) — FEIDE, Google |
| Cloud sync | Firestore (optional) |
| Content | Static JS/JSON data files |
| Deploy | Any static host (Vercel, Netlify, GitHub Pages) |

## Built with Papertek

| App | Subject | Students | Link |
|-----|---------|----------|------|
| Wir sprechen Deutsch | German for Norwegian high school | 100+ | [papertek.no/tysk](https://papertek.no/tysk) |

*Using Papertek in production? Open a PR to add your app here.*

## Origin

Papertek was extracted from **Wir sprechen Deutsch** ([papertek.no/tysk](https://papertek.no/tysk)), a German language learning app for Norwegian high school students, built by [Papertek Forlag](https://papertek.no). The framework is the engine; the content stays with the publisher.

## License

MIT — see [LICENSE](LICENSE).

Content in `examples/` is also MIT (minimal, for demonstration only).

---

*Built by educators, for educators. Powered by AI.*
