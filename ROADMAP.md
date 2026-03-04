# Roadmap: Papertek — Framework for Education

> **Last updated:** 2026-03-04
> **Current version:** 0.1.0 (alpha)
> **Target:** v1.0 production-ready by end of June 2026

---

## Where We Are

Papertek is an open-source framework for building offline-first educational web apps (PWAs), designed to be built by AI agents. The engine — 17 exercise types, spaced repetition vocabulary training, progress tracking, offline support — was extracted from **Wir sprechen Deutsch** ([papertek.no/tysk](https://papertek.no/tysk)), a German language learning app used by 100+ Norwegian high school students.

**What works today:**
- Full engine with 17 exercise types and 5-mode vocabulary trainer
- CLI scaffolder (`node cli/create-edu-app.js`)
- 8 AI skills for content creation (`/create-lesson`, `/create-exercises`, etc.)
- 7 JSON schemas for content validation
- Offline-first PWA architecture
- Language-agnostic design (proven with German + Math examples)

**What's not ready yet:**
- 21 of 22 exercise modules use a legacy pattern (no lifecycle cleanup)
- Limited test coverage
- No CI/CD pipeline
- Several features disabled (teacher dashboard, cloud sync, classroom games)
- Not published to npm

---

## The Goal

**By end of June 2026**, Papertek should be a production-ready framework that educators and developers can confidently build on — so that apps are ready for students when school starts in August/September 2026.

**Wir sprechen Deutsch** ([papertek.no/tysk](https://papertek.no/tysk)) will be restructured to run on the finished framework, serving as both the flagship product and a real-world validation of the framework.

---

## Timeline

### Phase 1: Open Source Launch (March 2026)

*Status: In progress*

The framework is public on GitHub. It works, but it's alpha — not production-ready. This phase is about **calling for contributors** and establishing the project.

- [x] Public GitHub repository
- [x] CLAUDE.md, AGENTS.md, ARCHITECTURE.md, CONTRIBUTING.md
- [x] JSON schemas for all content types
- [x] CLI scaffolder with language presets (de, fr, es, nb)
- [x] 8 AI skills for content creation
- [x] Example courses (German A1, Math Basics)
- [x] Roadmap (this document)
- [ ] GitHub issue templates (bug report, feature request, exercise migration)
- [ ] GitHub Discussions enabled
- [ ] "Good first issue" labels on ExerciseBase migration tasks
- [ ] Launch announcement (blog post, social media)

### Phase 2: Engine Quality (March–April 2026)

*The foundation must be solid before building on top of it.*

**ExerciseBase migration** — Migrate all 21 legacy exercise modules to the ExerciseBase factory pattern. This eliminates memory leaks from orphaned event listeners and timers, and gives every exercise a proper lifecycle (`mount` → `render` → `destroy`). Each module is an independent task — ideal for contributors.

- [ ] Migrate fill-in exercise
- [ ] Migrate matching game
- [ ] Migrate true/false
- [ ] Migrate quiz
- [ ] Migrate writing
- [ ] Migrate drag & drop
- [ ] Migrate mini dialog
- [ ] Migrate dilemma
- [ ] Migrate image matching
- [ ] Migrate chronology
- [ ] Migrate checklist
- [ ] Migrate interactive flashcards
- [ ] Migrate interactive map
- [ ] Migrate number grids
- [ ] Migrate color picker
- [ ] Migrate embedded gender trainer
- [ ] Migrate interactive clock (both versions)
- [ ] Migrate categorize
- [ ] Migrate true/false pictures
- [ ] Remove legacy `embedded-verb-trainer.js` (v2 already migrated)

**Testing**

- [ ] Unit tests for all exercise types (Vitest)
- [ ] Unit tests for progress system
- [ ] Unit tests for SM-2 spaced repetition algorithm
- [ ] E2E tests for core user flows (Playwright)
- [ ] Schema validation tests (all examples pass)

**CI/CD**

- [ ] GitHub Actions: lint + format check on PR
- [ ] GitHub Actions: schema validation on PR
- [ ] GitHub Actions: unit tests on PR
- [ ] GitHub Actions: E2E tests on PR

### Phase 3: Feature Completion (April–May 2026)

*Enable the features that are built but disabled.*

**Teacher Dashboard**
- [ ] Enable and stabilize teacher mode
- [ ] Class creation and management
- [ ] Student progress overview
- [ ] Vocabulary test assignment

**Cloud Sync**
- [ ] Enable and stabilize Firebase/Firestore sync
- [ ] Conflict resolution (localStorage vs cloud)
- [ ] Sync status indicator in UI
- [ ] Documentation for Firebase setup

**Classroom Games**
- [ ] Enable and stabilize classroom games
- [ ] Bingo, Tier-Rennen, Jeopardy, Konjugations-Karussell, Ord-Battle
- [ ] Projector-friendly mode (large text, high contrast)

**Glossary Tests**
- [ ] Enable teacher-created vocabulary tests
- [ ] Student test-taking interface
- [ ] Results and grading

### Phase 4: Distribution & Polish (May–June 2026)

*Make it easy for anyone to use.*

**npm Publishing**
- [ ] Publish `@papertek/create-edu-app` to npm
- [ ] `npx create-edu-app` works globally
- [ ] Version management and release automation

**Accessibility**
- [ ] WCAG 2.1 AA audit
- [ ] Keyboard navigation for all exercise types
- [ ] Screen reader testing
- [ ] High contrast mode

**Performance**
- [ ] Benchmark on target devices (Chromebooks, older tablets)
- [ ] Optimize Service Worker caching strategy
- [ ] Bundle size audit (no single file > 50KB)

**Documentation**
- [ ] Documentation website (GitHub Pages)
- [ ] Getting started tutorial (video or written)
- [ ] "Build your first course" guide
- [ ] Skill authoring guide (how to write new skills)

**RTL Support**
- [ ] Right-to-left layout for Arabic, Hebrew, etc.
- [ ] RTL exercise rendering
- [ ] Language preset for Arabic

### v1.0 Release (End of June 2026)

*Production-ready. Stable API. Ready for schools.*

- [ ] All exercise modules on ExerciseBase
- [ ] Full test coverage (unit + E2E)
- [ ] CI/CD green on every PR
- [ ] All features enabled and stable
- [ ] Published to npm
- [ ] WCAG 2.1 AA compliant
- [ ] Documentation website live
- [ ] Wir sprechen Deutsch restructured on framework
- [ ] At least 2 example courses beyond German (community or internal)
- [ ] Changelog and migration guide from v0.x

---

## Beyond v1.0

These are ideas for after the framework is stable. Priorities will depend on community feedback and real-world usage.

**Ecosystem**
- Plugin system for custom exercise types
- More language presets (Japanese, Chinese, Arabic, etc.)
- Course marketplace or directory
- Vercel / Netlify deployment templates

**Analytics & Insights**
- Learning analytics dashboard for teachers
- Spaced repetition effectiveness tracking
- Student engagement metrics
- Export to common formats (CSV, xAPI)

**LMS Integration**
- SCORM package export
- xAPI (Experience API) support
- LTI integration for Moodle, Canvas, etc.

**Advanced AI Features**
- AI-generated adaptive exercises (difficulty scaling)
- AI tutor chat within lessons
- Automatic content quality scoring
- Skill for translating courses between languages

---

## How to Contribute

We're looking for contributors of all kinds during the March–June sprint:

| Role | How you can help |
|------|-----------------|
| **Developers** | Migrate exercise modules to ExerciseBase, write tests, build CI/CD, enable features |
| **Educators** | Test the AI skills, build example courses, give feedback on exercise types |
| **Designers** | Accessibility audit, UI polish, responsive design testing |
| **Translators** | Add UI languages beyond Norwegian and English |
| **Technical writers** | Documentation, tutorials, getting started guides |

### Getting Started

1. Read [CLAUDE.md](CLAUDE.md) — the primary project interface
2. Read [CONTRIBUTING.md](CONTRIBUTING.md) — how to contribute
3. Look for issues labeled **"good first issue"** — especially ExerciseBase migrations
4. Join the discussion on GitHub Discussions

### ExerciseBase Migration (Best First Contribution)

Each of the 21 legacy exercise modules is an independent migration task. It's mechanical, well-documented, and a great way to learn the codebase:

1. Read the [migration guide in ARCHITECTURE.md](ARCHITECTURE.md#how-to-migrate-a-legacy-exercise)
2. Compare `embedded-verb-trainer.js` (legacy) with `embedded-verb-trainer-v2.js` (migrated)
3. Pick an unclaimed module from the list above
4. Open a PR

---

## Timeline Summary

| When | What | Version |
|------|------|---------|
| **March 2026** | Open source launch, call for contributors | v0.1 (alpha) |
| **March–April** | ExerciseBase migration, tests, CI/CD | v0.2 |
| **April–May** | Teacher dashboard, cloud sync, classroom games | v0.3 |
| **May–June** | npm publish, accessibility, docs, RTL | v0.5 |
| **End of June** | Production-ready release | **v1.0** |
| **July–August** | Teachers and developers build courses | — |
| **Aug/Sep** | School year starts, apps ready for students | — |

---

*Built by educators, for educators. Powered by AI. Let's build this together.*
