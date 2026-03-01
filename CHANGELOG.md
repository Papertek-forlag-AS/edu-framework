# Changelog

All notable changes to Papertek — Framework for Education will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-02-28

### Added
- Multi-user localStorage isolation for shared devices (Chromebooks, school computers)
- User-namespaced storage keys (`{userId}:key` format) — transparent to exercise code
- Automatic guest-to-authenticated data migration on login
- `user-session.js` module for user identity management

### Changed
- Logout no longer wipes localStorage — data stays dormant under user namespace
- `safeStorage` wrapper now namespaces all keys automatically

## [0.1.0] - 2026-02-28

### Added
- Initial open-source release of the framework
- 17 exercise types (fill-in, matching, true/false, quiz, drag & drop, writing, mini dialog, dilemma, image matching, chronology, checklist, flashcards, interactive map, number grids, color picker, verb trainer, true/false pictures)
- 5-mode vocabulary trainer with SM-2 spaced repetition
- Progress tracking with achievements, celebrations, and milestone tests
- Offline-first PWA with Service Worker
- CLI scaffolder (`create-edu-app`) for new projects
- JSON schemas for all content types
- AI agent skills for content creation (`/create-lesson`, `/create-exercises`, `/create-grammar`, `/create-vocabulary`, `/create-test`, `/audit-content`)
- Grammar module system (7 types: title, explanation, table, example, tip, exercise, interactive tool)
- Classroom games (Bingo, Tier-Rennen, Jeopardy, Konjugations-Karussell, Ord-Battle)
- Optional Firebase authentication (FEIDE, Google)
- Optional Firestore cloud sync
- Teacher dashboard with class management
- Language-agnostic engine (works for any language or non-language subjects)
- Example courses: German A1, Math Basics, Minimal Course
- CLAUDE.md, AGENTS.md, ARCHITECTURE.md, CONTRIBUTING.md documentation
