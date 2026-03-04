# Roadmap vs. Current Structure — Review

> **Date:** 2026-03-04
> **Reviewer:** Claude (AI agent)
> **Scope:** Compare ROADMAP.md claims against actual codebase state

---

## Executive Summary

The ROADMAP.md is largely **accurate and well-aligned** with the actual codebase. A few items marked as incomplete are actually done, and a couple of claims need minor corrections. The project is firmly in Phase 1 with significant Phase 2 progress already made on ExerciseBase migrations.

---

## Phase 1: Open Source Launch — Detailed Audit

| Roadmap Claim | Status | Evidence |
|---|---|---|
| Public GitHub repository | **Correct** | Repository exists with full history |
| CLAUDE.md, AGENTS.md, ARCHITECTURE.md, CONTRIBUTING.md | **Correct** | All four files present at root |
| JSON schemas for all content types | **Correct** | 7 schema files in `schemas/` (exercise, vocabulary, lesson, grammar, curriculum, question-bank, language) |
| CLI scaffolder with language presets | **Correct** | `cli/create-edu-app.js` exists, `bin` entry in package.json |
| 8 AI skills for content creation | **Correct** | Listed in CLAUDE.md (create-lesson, create-exercises, create-grammar, create-vocabulary, create-test, create-project, add-curriculum, audit-content) |
| Example courses (German A1, Math Basics) | **Correct** | `examples/german-a1/`, `examples/math-basics/`, plus `examples/minimal-course/` |
| Roadmap document | **Correct** | `ROADMAP.md` present |
| GitHub issue templates | **Actually DONE** | `bug_report.md` and `feature_request.md` exist in `.github/ISSUE_TEMPLATE/` — roadmap shows `[ ]` but templates are present. Missing: exercise migration template. |
| GitHub Discussions enabled | **Cannot verify** | Requires GitHub settings check, not a codebase artifact |
| "Good first issue" labels | **Cannot verify** | Requires GitHub issue label check |
| Launch announcement | **Not done** | No blog post or announcement found |

### Discrepancy Found

**Issue templates** are marked `[ ]` in the roadmap but two of them already exist (bug report, feature request). The roadmap should be updated to reflect this. The exercise migration template mentioned contextually is still missing.

---

## Phase 2: Engine Quality — Major Finding

### ExerciseBase Migration — Much Further Along Than Roadmap Suggests

The roadmap lists all 21 exercise modules as unmigrated (`[ ]`). In reality, **the vast majority are already migrated**:

| Module | Roadmap Status | Actual Status |
|---|---|---|
| fill-in | `[ ]` | **Migrated** — header says "Migrated to ExerciseBase" |
| matching game | `[ ]` | **Migrated** |
| true/false | `[ ]` | **Migrated** |
| quiz | `[ ]` | **Migrated** |
| writing | `[ ]` | **Migrated** |
| drag & drop | `[ ]` | **Migrated** |
| mini dialog | `[ ]` | **Migrated** |
| dilemma | `[ ]` | **Migrated** |
| image matching | `[ ]` | **Migrated** |
| chronology | `[ ]` | **Migrated** |
| checklist | `[ ]` | **Migrated** |
| interactive flashcards | `[ ]` | **Migrated** |
| interactive map | `[ ]` | **Migrated** |
| number grids | `[ ]` | **Migrated** |
| color picker | `[ ]` | **Migrated** |
| embedded gender trainer | `[ ]` | **No migration header found** — may still be legacy |
| interactive clock (both) | `[ ]` | **One migrated** (`interactive-clock-2-3.js` has migration header) |
| categorize | `[ ]` | **Built on ExerciseBase** (new module, not a migration) |
| true/false pictures | `[ ]` | **No dedicated file found** — may be handled by `true-false.js` |
| Remove legacy verb trainer | `[ ]` | `embedded-verb-trainer-v2.js` exists as migrated; need to verify if v1 is removed |

**Summary:** At least **18 of 21** modules show ExerciseBase migration headers. The roadmap significantly understates current progress. Only `embedded-gender-trainer`, one clock variant, and `true-false-pictures` may remain unmigrated.

### Testing

| Roadmap Item | Actual Status |
|---|---|
| Unit tests for exercise types | **3 unit test files exist** (`error-handler.test.js`, `progress.test.js`, `sw-logic.test.js`) — none are exercise-specific |
| Unit tests for progress system | **Exists** — `progress.test.js` |
| Unit tests for SM-2 algorithm | **Not found** |
| E2E tests for core user flows | **1 E2E test** (`homepage.spec.js`) — minimal |
| Schema validation tests | **Not found as test files** — `validate-schemas.js` is a script, not a test suite |

**Assessment:** Test infrastructure is set up (Vitest + Playwright configs exist, `tests/setup.js` present) but coverage is minimal. The roadmap correctly identifies this as incomplete.

### CI/CD

| Roadmap Item | Actual Status |
|---|---|
| Lint + format check on PR | **Not done** — no workflow for this |
| Schema validation on PR | **Partial** — `validate-vocabulary.yml` exists but only for vocabulary |
| Unit tests on PR | **Not done** |
| E2E tests on PR | **Not done** |

**Assessment:** Only 1 GitHub Actions workflow exists (`validate-vocabulary.yml`). The roadmap correctly identifies CI/CD as missing.

---

## Phase 3: Feature Completion — Codebase Readiness

The roadmap says these features are "built but disabled." Verification:

| Feature | Code Exists? | Evidence |
|---|---|---|
| Teacher Dashboard | **Yes** | `public/js/teacher-mode/` directory with multiple files |
| Cloud Sync (Firebase) | **Yes** | `public/js/sync/cloud-sync.js`, `public/js/backends/firebase/` |
| Cloud Sync (Supabase) | **Yes** | `public/js/backends/supabase/` (not mentioned in roadmap — bonus) |
| Classroom Games | **Yes** | `public/js/dialog/` with bingo, jeopardy, tier-rennen, konjugations-karussell, ord-battle |
| Glossary Tests | **Yes** | Implied by `public/js/gloseproeve/` directory |
| Auth (Firebase, FEIDE, Google) | **Yes** | `public/js/auth/` with providers |
| Feature flags | **Yes** | `papertek.config.js` has `features: {}` section controlling all of these |

**Assessment:** The roadmap claim that these are "built but disabled" is accurate. The code exists; `papertek.config.js` has feature flags set to control enablement. The `backendProvider: 'none'` setting confirms cloud features are disabled.

---

## Phase 4: Distribution & Polish — Readiness Check

| Item | Current State |
|---|---|
| npm publishing | `"private": true` in package.json — not publishable yet |
| Accessibility | `public/js/accessibility.js` exists — foundation is there |
| Performance | Service worker (`sw.js`), download manager exist |
| Documentation | `docs/exercise-catalog.md` exists; no documentation website |
| RTL support | `template-international.html` exists — possible RTL groundwork |

---

## "Where We Are" Section — Accuracy Check

| Claim | Accurate? |
|---|---|
| "17 exercise types" | **Understated** — at least 22 exercise files exist in `public/js/exercises/` |
| "5-mode vocabulary trainer" | **Correct** — flashcards, write, match, test, gender modes in `vocab-trainer-multi/` |
| "8 AI skills" | **Correct** — 8 skills listed in CLAUDE.md |
| "7 JSON schemas" | **Correct** — 7 `.schema.json` files in `schemas/` |
| "21 of 22 use legacy pattern" | **Outdated** — most are already migrated (see above) |
| "Limited test coverage" | **Correct** — only 3 unit tests and 1 E2E test |
| "No CI/CD pipeline" | **Mostly correct** — 1 workflow exists for vocab validation only |
| "Several features disabled" | **Correct** — teacher mode, cloud sync, classroom games all feature-flagged off |

---

## Recommendations

### 1. Update Roadmap to Reflect ExerciseBase Progress
The most significant discrepancy. ~18 of 21 modules are already migrated. The roadmap should mark these `[x]` and identify the 2-3 remaining ones clearly.

### 2. Mark Issue Templates as Partially Done
Bug report and feature request templates exist. Only the exercise migration template is missing. Update Phase 1 checkbox.

### 3. Add Missing `validate` Script
CLAUDE.md references `npm run validate` as the primary validation command, but it does not exist in `package.json`. Only `validate:schemas` and `validate:config` exist. Consider adding a composite `validate` script.

### 4. Correct Exercise Count
The "17 exercise types" claim appears in multiple places (ROADMAP.md, CLAUDE.md). The actual count in `public/js/exercises/` is 22+ files. Either the extra files are variants (not distinct types) or the count should be updated.

### 5. Mention Supabase Backend
The roadmap only mentions Firebase for cloud sync, but a full Supabase backend adapter exists (`public/js/backends/supabase/`). This is a significant capability worth documenting.

### 6. Add Feedback System to Roadmap
A complete feedback system exists in `public/js/feedback/` (widget, error capture, context collector, reports). This isn't mentioned anywhere in the roadmap.

### 7. Prioritize Testing (Phase 2)
With ExerciseBase migration nearly complete, testing becomes the real Phase 2 bottleneck. The 3 existing unit tests and 1 E2E test are a thin foundation for the "full test coverage" v1.0 goal.

---

## Summary Scorecard

| Phase | Roadmap Accuracy | Actual Progress |
|---|---|---|
| Phase 1: Open Source Launch | Good (minor checkbox misses) | ~85% complete |
| Phase 2: Engine Quality | **Understated** (ExerciseBase nearly done) | ~65% complete (migrations done, tests/CI lacking) |
| Phase 3: Feature Completion | Accurate | 0% (code exists, features disabled as stated) |
| Phase 4: Distribution & Polish | Accurate | ~10% (foundations laid) |

**Overall:** The project is ahead of its own roadmap on Phase 2 migrations but behind on testing and CI/CD. The roadmap is a solid document that needs a checkpoint update to reflect the ExerciseBase migration progress.
