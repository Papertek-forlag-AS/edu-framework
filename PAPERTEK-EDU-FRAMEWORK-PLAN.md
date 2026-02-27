# Papertek Edu-Framework: Full Plan

> **Date:** 2026-02-27
> **Author:** Geir Forbord + Claude Code
> **Status:** Vision document — ready for Phase 1 implementation
> **License intent:** MIT (engine) + CC-BY-SA (content)

---

## Table of Contents

1. [Vision](#1-vision)
2. [Market Research: Does This Exist Already?](#2-market-research-does-this-exist-already)
3. [Can This Compete With React?](#3-can-this-compete-with-react)
4. [Papertek CSS: Zero-Dependency Design System](#4-papertek-css-zero-dependency-design-system)
5. [Architecture Overview](#5-architecture-overview)
6. [What to Extract from Tysk1](#6-what-to-extract-from-tysk1)
7. [The AI-First Documentation Model](#7-the-ai-first-documentation-model)
8. [Package Structure](#8-package-structure)
9. [Skills Library (AI Workflows)](#9-skills-library-ai-workflows)
10. [JSON Schemas](#10-json-schemas)
11. [The Human + AI Workflow](#11-the-human--ai-workflow)
12. [Open Source & Donation Model](#12-open-source--donation-model)
13. [Implementation Roadmap](#13-implementation-roadmap)
14. [Business Strategy: Why Open Source Strengthens Papertek Forlag](#14-business-strategy-why-open-source-strengthens-papertek-forlag)
15. [Risks & Mitigations](#15-risks--mitigations)
16. [Sources & References](#16-sources--references)

---

## 1. Vision

**Papertek Edu-Framework** is an open-source framework for building offline-first educational web apps (PWAs). Its primary interface is not documentation for human developers — it is CLAUDE.md files, JSON schemas, and AI skills designed so that an AI agent (Claude Code, Cursor, GitHub Copilot, etc.) can build a complete educational app from a natural language conversation with an educator.

### The Three Audiences (priority order)

| # | Audience | What they interact with | What they do |
|---|----------|------------------------|--------------|
| 1 | **AI agent** (Claude Code etc.) | CLAUDE.md, schemas, skills, conventions | Builds the app, generates content, configures everything |
| 2 | **Educator** (non-technical) | Natural language conversation with AI | Describes what they want, reviews what AI built |
| 3 | **Developer** (contributor) | Architecture docs, contribution guide | Extends the framework, adds exercise types, fixes bugs |

### Core Principles

- **AI-as-developer**: The framework is designed to be built by AI agents, not hand-coded by humans
- **Offline-first**: localStorage is source of truth, cloud sync is additive, Service Worker caches everything
- **Convention over configuration**: Rigid file structure and naming conventions eliminate AI decision-making errors
- **Schema-driven content**: JSON schemas are the contract between AI-generated content and the rendering engine
- **Vanilla JS + platform APIs**: No React, no build-time transpilation, ES modules, Web Components where useful
- **Papertek CSS**: Own zero-dependency design system using modern CSS — no Tailwind, no preprocessors
- **Open source, donation-funded**: MIT engine, CC-BY-SA content, community-driven

---

## 2. Market Research: Does This Exist Already?

### Short Answer: No.

No existing project combines all five properties: (1) AI agent as primary builder, (2) schema-driven content, (3) education domain, (4) PWA/offline-first, (5) reusable framework. Papertek would be the first.

### What Does Exist

#### AI-Agent Development Tools (domain-agnostic)

| Project | What it does | Comparison to Papertek |
|---------|-------------|----------------------|
| **AGENTS.md** (Linux Foundation / AAIF) | Standard markdown convention for AI agent project guidance. Adopted by 60,000+ repos. Supported by Claude Code, Cursor, Copilot, Gemini CLI. Donated to Linux Foundation (Dec 2025) by OpenAI, Anthropic, Block. | The emerging standard Papertek should adopt. AGENTS.md is a convention, not a framework. |
| **Agent OS** (Builder Methods) | Manages coding standards for AI agents. `/discover-standards` and `/inject-standards`. Works with Claude Code, Cursor. | Closest to Papertek's CLAUDE.md pattern, but domain-agnostic. A meta-tool, not a framework. |
| **GitHub Spec Kit** | Open-source toolkit for spec-driven development. 4 phases: Specify, Plan, Tasks, Implement. `constitution.md` as agent-readable source of truth. | Closest to the workflow, but per-project — not a reusable framework. |
| **BMAD-METHOD** | Multi-agent agile development. Analyst, PM, Architect, Scrum-Master agents. Fully open source. | Most ambitious SDD framework. Domain-agnostic — could build an education framework, but isn't one. |
| **Codified Context** (arXiv 2602.20478) | Academic paper: 3-tier architecture for AI-agent-optimized codebases. Hot-memory constitution + domain-expert agents + cold-memory specs. One developer built 108,000-line system in 70 days. | The theoretical validation of what Papertek does intuitively. Worth reading. |
| **rulesync** | CLI that generates .cursorrules, CLAUDE.md, GEMINI.md, AGENTS.md from a single source. | Utility for multi-agent rule management. Relevant when Papertek targets multiple AI tools. |

#### Prompt-Driven App Builders (one-off, not frameworks)

| Project | What it does | Comparison to Papertek |
|---------|-------------|----------------------|
| **v0** (Vercel) | Generates React UI components from prompts. | Component-level, React-only, no education domain, no offline. |
| **Bolt.new** (StackBlitz) | Prompt to full-stack app in-browser via WebContainers. bolt.diy is open-source. | One-off apps, not a reusable framework. No education domain. |
| **Lovable.dev** | Full-stack app generation for non-technical founders. | One-off. No PWA/offline, no education domain. |
| **create.xyz** | Natural language to apps. 30+ integrations. | One-off. Not suited for "data-heavy projects." |

#### The Closest Structural Analogy

| Project | What it does | Comparison to Papertek |
|---------|-------------|----------------------|
| **Wasp** (wasp-lang) | Declarative DSL for full-stack JS apps. `.wasp` config file declares routes, auth, jobs. AI-compatible by design. 16,000+ GitHub stars, 4,000+ Discord. Y Combinator-backed. | Most structurally similar. Declarative config as primary API = CLAUDE.md + schemas in Papertek. But: targets general SaaS, requires React + Node.js + Prisma, no education domain, no PWA/offline. |

#### Open-Source Education Platforms

| Project | What it does | Comparison to Papertek |
|---------|-------------|----------------------|
| **LibreLingo** | Open-source language learning PWA (AGPLv3). Svelte + PouchDB. YAML-based course files. Content/engine separation. | Most direct education comparison. But: Svelte-based, Python tooling, limited exercise types, no AI-agent conventions whatsoever. Small community. |
| **Moodle** | Dominant open-source LMS. PHP, server-heavy. AI plugins added in 2025. | Antithetical to Papertek. Heavy, server-dependent, human-developer-maintained. |

### Competitive Landscape Summary

| Property | Agent OS | Spec Kit | BMAD | Wasp | LibreLingo | v0/Bolt | **Papertek** |
|----------|----------|----------|------|------|------------|---------|-------------|
| AI as primary builder | Partial | Yes | Yes | Yes | No | Yes | **Yes** |
| Schema-driven content | No | No | No | Partial | Partial | No | **Yes** |
| Education domain | No | No | No | No | Yes | No | **Yes** |
| PWA / offline-first | No | No | No | No | Partial | No | **Yes** |
| Reusable framework | Yes | No | No | Yes | Partial | No | **Yes** |
| Open source | Yes | Yes | Yes | Yes | Yes | Partial | **Yes** |

**Papertek is the only project that would fill all six cells.**

---

## 3. Can This Compete With React?

### The Honest Answer

**No — and it shouldn't try to.** React (82% usage, 15 years of Stack Overflow answers) is a general-purpose UI library. Papertek is a domain-specific education framework. These are different categories.

The real question is: **Can a vanilla JS education framework succeed alongside the React ecosystem?**

### Evidence That It Can

1. **Vanilla JS is resurgent.** Platform APIs (Fetch, ES Modules, Service Workers, Web Components) have matured. Developers with production experience are returning to platform APIs over framework abstractions. (Source: The New Stack, 2025)

2. **For AI agents, vanilla JS is easier to generate correctly** than React with hooks, because there are fewer moving parts and no transpilation step. The less the AI has to know about framework internals, the fewer bugs it creates.

3. **Domain-specific frameworks succeed by being opinionated.** Rails succeeded not by competing with Java EE on features, but by being the best framework for building web apps with convention over configuration. Laravel succeeded the same way in PHP. Wasp is attempting the same in JS. Papertek would succeed the same way in education.

4. **Counter-examples of non-React success:**
   - Svelte/SvelteKit: 180% growth over 2 years, 85,000+ GitHub stars
   - htmx: 16,800 GitHub stars added in 2024 alone (more than React that year)
   - Astro: 55,000+ stars, 900,000+ weekly npm downloads by end of 2025
   - AHA Stack (Astro + htmx + Alpine.js): growing adoption for content-driven apps

5. **What makes frameworks succeed** (research consensus):
   - Documentation quality (Laravel won on docs)
   - Low barrier to entry (single script tag > npm install)
   - Community infrastructure (Discord, tutorials, packages)
   - Opinionated defaults (convention over configuration)
   - Institutional backing or visible champion

### The AI-Agent Advantage

Here's the key insight: **React's moat is training data.** AI agents generate good React code because there are billions of examples in their training data. A new framework has zero training data — which is a problem for human developers searching Stack Overflow, but NOT a problem for AI agents reading CLAUDE.md files.

If your CLAUDE.md, schemas, and skills are well-written, an AI agent can build a Papertek app just as competently as a React app — because it's reading the instructions at build time, not relying on memorized patterns from training data.

This means: **Papertek doesn't need to be popular to be usable.** It just needs good CLAUDE.md files. That's the structural advantage of AI-first design.

### Realistic Positioning

Don't position Papertek as "a replacement for React." Position it as:

> **The fastest way to build an offline-first educational web app.** Describe your course in natural language. An AI agent builds it. Deploy anywhere.

The target market isn't React developers — it's **educators and small teams who want educational apps but don't have developers.** The AI is the developer.

---

## 4. Papertek CSS: Zero-Dependency Design System

### Why Not Tailwind

The same logic as removing React applies to removing TailwindCSS. The framework should have **zero CSS dependencies**:

| Factor | TailwindCSS | Papertek CSS |
|--------|-------------|-------------|
| Dependencies | npm package, PostCSS, build step, config file | Zero — one CSS file |
| Build step | Required (purging, compilation) | None — plain CSS loaded directly |
| AI generation | AI must memorize utility class names | AI just writes semantic class names |
| Breaking changes | Tailwind v3 → v4 migration was painful | CSS spec is forever stable |
| File readability | `class="bg-white p-6 rounded-xl shadow-sm mb-6"` | `class="exercise-card"` |
| CLAUDE.md complexity | Must document hundreds of utility classes | Document ~30 component classes |
| Theming | Requires tailwind.config.js | Just change CSS custom properties |
| Long-term stability | API changes between major versions | CSS custom properties are a W3C standard |

### Legal Considerations

**There are zero copyright concerns.** The Papertek CSS design system is written from scratch:

- **CSS properties are a W3C open standard.** `padding: 1.5rem`, `border-radius: 0.75rem`, `background: white` — these are public specifications. Nobody owns them.
- **The visual design is ours.** The amber/stone color palette, the card layouts, the tab system — all designed for Tysk1. Tailwind was just the tool used to express them.
- **We're not creating a Tailwind clone.** Papertek CSS uses semantic class names (`.exercise-card`, `.lesson-header`) that have nothing to do with Tailwind's utility class system (`.p-6`, `.bg-white`).
- **The approach:** Look at our own app's rendered output (the pixels on screen) and write new CSS that reproduces our own design using standard CSS properties. Completely clean.

What WOULD be a copyright problem (but we're not doing any of this):
- Copying Tailwind's JavaScript source code
- Copying their documentation text
- Copying Tailwind UI (their paid component library)
- Using their name or logo

### Modern CSS Features We Use (all natively supported in 2026)

| Feature | What it replaces | Browser support |
|---------|-----------------|----------------|
| **CSS Nesting** | Sass/Less nesting | All modern browsers |
| **`@layer`** | Tailwind's layer system | All modern browsers |
| **Custom Properties** (`--var`) | Tailwind config theming | All modern browsers |
| **Container Queries** | Media query breakpoints | All modern browsers |
| **`:has()` selector** | JavaScript parent selection | All modern browsers |
| **CSS Grid + Flexbox** | Tailwind grid/flex utilities | All modern browsers |
| **`color-mix()`** | Tailwind color opacity variants | All modern browsers |

### Papertek CSS Architecture

One file, three layers, CSS custom properties for theming:

```css
/* papertek.css — the framework's complete design system */
/* Zero dependencies. Zero build step. Just link it. */

@layer base, components, utilities;

/* ============================================
   BASE LAYER — Reset, typography, theming
   ============================================ */
@layer base {
  :root {
    /* Color system — educators override these for branding */
    --color-primary: #b45309;          /* amber-700 */
    --color-primary-light: #fef3c7;    /* amber-100 */
    --color-primary-dark: #92400e;     /* amber-800 */
    --color-surface: #ffffff;
    --color-surface-alt: #fafaf9;      /* stone-50 */
    --color-text: #1c1917;             /* stone-900 */
    --color-text-muted: #78716c;       /* stone-500 */
    --color-border: #e7e5e4;           /* stone-200 */
    --color-success: #16a34a;
    --color-error: #dc2626;
    --color-info: #2563eb;

    /* Spacing scale */
    --space-xs: 0.25rem;
    --space-sm: 0.5rem;
    --space-md: 1rem;
    --space-lg: 1.5rem;
    --space-xl: 2rem;
    --space-2xl: 3rem;

    /* Shape */
    --radius-sm: 0.375rem;
    --radius-md: 0.75rem;
    --radius-lg: 1rem;
    --radius-full: 9999px;
    --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.05);
    --shadow-md: 0 1px 3px rgb(0 0 0 / 0.1);
    --shadow-lg: 0 4px 6px rgb(0 0 0 / 0.1);

    /* Typography */
    --font-sans: system-ui, -apple-system, sans-serif;
    --font-mono: ui-monospace, monospace;
    --text-sm: 0.875rem;
    --text-base: 1rem;
    --text-lg: 1.125rem;
    --text-xl: 1.25rem;
    --text-2xl: 1.5rem;
    --text-3xl: 1.875rem;
  }

  /* Dark mode via custom property override */
  [data-theme="dark"] {
    --color-surface: #1c1917;
    --color-surface-alt: #292524;
    --color-text: #fafaf9;
    --color-text-muted: #a8a29e;
    --color-border: #44403c;
  }
}

/* ============================================
   COMPONENT LAYER — Education-specific UI
   ============================================ */
@layer components {

  /* --- Cards --- */
  .card {
    background: var(--color-surface);
    padding: var(--space-lg);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-md);
    margin-bottom: var(--space-lg);
  }

  .exercise-card { /* extends .card with exercise-specific styles */ }
  .grammar-card  { /* grammar explanation cards */ }
  .dialog-card   { /* conversation dialog cards */ }
  .vocab-card    { /* vocabulary display cards */ }

  /* --- Navigation --- */
  .tab-bar       { /* horizontal tab navigation */ }
  .tab-button    { /* individual tab button */ }
  .tab-button.active { /* active tab state */ }
  .tab-content   { /* tab panel container */ }

  /* --- Exercises --- */
  .exercise-input    { /* text input for fill-in exercises */ }
  .exercise-feedback { /* correct/incorrect feedback */ }
  .exercise-badge    { /* difficulty/type badge */ }
  .matching-pair     { /* matching game pairs */ }
  .drag-item         { /* draggable exercise items */ }

  /* --- Badges & Tags --- */
  .badge             { /* generic badge */ }
  .badge-success     { /* green completion badge */ }
  .badge-info        { /* blue info badge */ }
  .badge-warning     { /* amber warning badge */ }

  /* --- Buttons --- */
  .btn               { /* base button */ }
  .btn-primary       { /* primary action button */ }
  .btn-secondary     { /* secondary action button */ }
  .btn-check         { /* exercise check/submit button */ }
  .btn-reset         { /* exercise reset button */ }

  /* --- Layout --- */
  .app-shell         { /* main app container */ }
  .app-header        { /* top navigation bar */ }
  .lesson-container  { /* lesson page wrapper */ }
  .content-grid      { /* responsive content grid */ }

  /* --- Modals --- */
  .modal-overlay     { /* modal backdrop */ }
  .modal-content     { /* modal container */ }
  .modal-header      { /* modal title area */ }

  /* --- Progress --- */
  .progress-bar      { /* horizontal progress indicator */ }
  .progress-ring     { /* circular progress indicator */ }
  .achievement-star  { /* lesson completion star */ }

  /* --- Special --- */
  .tooltip           { /* word click tooltip */ }
  .special-chars-kbd { /* special character keyboard */ }
  .confetti          { /* celebration animation */ }
}

/* ============================================
   UTILITY LAYER — Minimal helpers only
   ============================================ */
@layer utilities {
  .hidden    { display: none; }
  .sr-only   { /* screen reader only */ }
  .text-center { text-align: center; }
  .font-bold { font-weight: 700; }
  .mt-1 { margin-top: var(--space-xs); }
  .mt-2 { margin-top: var(--space-sm); }
  .mt-4 { margin-top: var(--space-md); }
  /* Only the most-used utilities — not a full utility framework */
}
```

### Theming for Educators

An educator (or AI agent) customizes the look by overriding CSS custom properties:

```css
/* my-course-theme.css — loaded after papertek.css */
:root {
  --color-primary: #1e40af;        /* blue instead of amber */
  --color-primary-light: #dbeafe;
  --color-primary-dark: #1e3a8a;
  --radius-md: 0.5rem;             /* less rounded corners */
  --font-sans: "Inter", sans-serif; /* custom font */
}
```

No rebuild needed. No config file. Just CSS.

### Migration Strategy from Tailwind

The migration happens during Phase 2 (Engine Extraction) in the framework repo:

1. **Audit**: Scan all templates and JS files for Tailwind utility classes used
2. **Group**: Map utilities to semantic components (~30 component classes cover 95% of usage)
3. **Create**: Write `papertek.css` with those components
4. **Replace**: In templates, replace `class="bg-white p-6 rounded-xl shadow-sm mb-6"` with `class="exercise-card"`
5. **Remove**: Delete `tailwindcss` from `package.json`, remove `tailwind.config.js`, remove `src/input.css`
6. **Verify**: Visual regression testing — app should look identical

### Why This Is Better for AI-First

| Scenario | With Tailwind | With Papertek CSS |
|----------|--------------|-------------------|
| AI creates an exercise card | Must output `class="bg-white p-6 rounded-xl shadow-sm mb-6 border border-stone-200"` | Must output `class="exercise-card"` |
| AI themes a course | Must edit `tailwind.config.js` | Must edit 3 CSS variables |
| AI adds a new component | Must know Tailwind utility names | Must write standard CSS |
| CLAUDE.md instructions | "Use these Tailwind classes for cards: ..." (long list) | "Use `.exercise-card` for exercise containers" |

The AI makes fewer mistakes because there's less to get wrong.

---

## 5. Architecture Overview

### System Diagram

```
+------------------------------------------------------------------+
|  EDUCATOR (human)                                                 |
|  "I want a French course for beginners, 8 chapters,              |
|   focus on travel vocabulary"                                     |
+------------------------------------------------------------------+
         |
         | natural language
         v
+------------------------------------------------------------------+
|  AI AGENT (Claude Code / Cursor / etc.)                          |
|                                                                   |
|  Reads:                          Executes:                        |
|  - CLAUDE.md (conventions)       - /create-project (scaffold)     |
|  - AGENTS.md (agent protocol)    - /create-lesson (content)       |
|  - schemas/*.json (contracts)    - /create-exercises (drills)     |
|  - .claude/skills/*.md (tasks)   - /create-vocabulary (words)     |
|                                  - npm run validate (check)       |
|                                  - npm run build (compile)        |
+------------------------------------------------------------------+
         |
         | generates files
         v
+------------------------------------------------------------------+
|  PAPERTEK PROJECT                                                 |
|                                                                   |
|  papertek.config.js        <- Human's only touchpoint             |
|  content/{lang}/           <- AI-generated lesson content         |
|  shared/vocabulary/        <- AI-generated vocabulary banks       |
|  public/                   <- Framework engine (don't touch)      |
|  schemas/                  <- JSON schemas (from framework)       |
+------------------------------------------------------------------+
         |
         | npm run build
         v
+------------------------------------------------------------------+
|  DEPLOYABLE PWA                                                   |
|                                                                   |
|  - Offline-first (SW + localStorage)                              |
|  - Works without internet after first load                        |
|  - Optional: Firebase auth, cloud sync, teacher dashboard         |
|  - Deploy to: Vercel, Netlify, GitHub Pages, any static host      |
+------------------------------------------------------------------+
         |
         | serves
         v
+------------------------------------------------------------------+
|  STUDENT                                                          |
|  - Lessons, exercises, vocabulary training                        |
|  - Progress tracking, spaced repetition                           |
|  - Works offline on phone/tablet/laptop                           |
+------------------------------------------------------------------+
```

### Technical Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Runtime | Vanilla JS (ES Modules) | No build step for JS, AI generates correctly, platform APIs |
| Styling | Papertek CSS (vanilla CSS) | Zero dependencies, zero build step, CSS custom properties for theming |
| Offline | Service Worker + localStorage | True offline-first, proven in Tysk1 |
| Auth | Firebase (optional) | Free tier generous, Firestore offline persistence |
| Cloud sync | Firestore (optional) | Additive sync, works offline, multi-device |
| Content | Static JSON/JS data files | Cacheable, versionable, no server needed |
| Build | Node.js scripts | Lesson generation, vocabulary fetch (no CSS build needed) |
| Deploy | Any static host | Vercel, Netlify, GitHub Pages, self-hosted |
| Testing | Vitest + Playwright | Unit + E2E, AI can write and run tests |

---

## 6. What to Extract from Tysk1

### Components to Extract (engine)

| Current Location in Tysk1 | Framework Package | Description |
|--------------------------|-------------------|-------------|
| `public/stilark-tailwind.css` (rewritten) | `@papertek/css` | Papertek CSS design system — replaces Tailwind with semantic classes |
| `public/js/exercises/exercise-base.js` | `@papertek/exercises` | ExerciseBase factory with lifecycle management |
| `public/js/exercises/*.js` (22 types) | `@papertek/exercises` | All exercise type implementations |
| `public/js/exercises/storage-utils.js` | `@papertek/exercises` | Exercise state storage |
| `public/js/progress/` (all files) | `@papertek/progress` | ProgressHub, achievements, store, config, celebrations |
| `public/js/vocab-trainer-multi/` | `@papertek/vocab-trainer` | 5-mode vocabulary trainer |
| `public/js/core/SM2Algorithm.js` | `@papertek/spaced-repetition` | SM-2 spaced repetition |
| `public/js/core/VocabProfileService.js` | `@papertek/spaced-repetition` | Per-word learning profiles |
| `public/js/ui.js` + `layout/shell.js` | `@papertek/shell` | Tab system, AppShell, navigation |
| `public/js/utils/i18n.js` | `@papertek/i18n` | UI translation system |
| `public/sw.js` + `offline/` | `@papertek/offline` | Service worker, download manager |
| `public/js/auth/` + `js/sync/` | `@papertek/auth` | Firebase auth, cloud sync |
| `public/js/teacher-mode/` | `@papertek/teacher` | Teacher dashboard, class management |
| `public/js/vocabulary/` | `@papertek/vocabulary` | Vocab API client, merger, provider |
| `public/js/utils/word-tooltips.js` | `@papertek/tooltips` | Click-on-word grammar tooltips |
| `public/js/test.js` | `@papertek/test-engine` | Quiz/test engine |
| `public/js/gloseproeve/` | `@papertek/glossary-test` | Teacher-created vocab tests |
| `public/js/dialog/` | `@papertek/classroom` | Classroom games (Bingo, Tier-Rennen, etc.) |
| `public/js/lesson-template/` | `@papertek/cli` | Lesson HTML generator |
| `public/js/modals.js` | `@papertek/shell` | Modal system |
| `public/js/utils/content-loader.js` | `@papertek/content-loader` | Dynamic content loading |
| `public/js/accessibility.js` | `@papertek/a11y` | Screen reader, ARIA, focus management |
| `scripts/` | `@papertek/cli` | Build scripts, validation |

### Content to Separate (not part of framework)

| Current Location | Separate Package / Repo |
|-----------------|------------------------|
| `public/content/german/` | `@papertek/content-german` |
| `public/content/spanish/` | `@papertek/content-spanish` |
| `public/content/french/` | `@papertek/content-french` |
| `shared/vocabulary/core/de/` | `@papertek/content-german` |
| `shared/vocabulary/translations/de-nb/` | `@papertek/content-german` |
| German question bank | `@papertek/content-german` |
| FEIDE auth provider | `@papertek/auth-feide` (Norway-specific plugin) |

### What Needs Abstraction (currently language-specific)

| Currently Hardcoded | Needs to Become |
|---|---|
| German grammar modules (cases, separable verbs) | Grammar module registry with language plugins |
| 3-gender system (der/die/das) | Gender system config (0, 2, or 3 genders) |
| Umlaut normalization (ö to oe) | Character normalization config per language |
| Word tooltip grammar gating (dative unlocked at chapter 8) | Progression-based feature unlock config |
| German TTS voice (de-DE Chirp3) | TTS config per target language |
| Special characters keyboard (ä, ö, ü, ß) | Configurable special character sets |

---

## 7. The AI-First Documentation Model

### Traditional Framework Documentation

```
Getting Started Guide → API Reference → Tutorials → Examples → FAQ
```

A human reads the getting started guide, copies examples, reads the API reference when stuck.

### Papertek AI-First Documentation

```
CLAUDE.md          → AI reads this FIRST (always loaded into context)
AGENTS.md          → Universal agent protocol (AAIF standard)
schemas/*.json     → Machine-readable content contracts
.claude/skills/    → Step-by-step AI workflows
CONTRIBUTING.md    → For human developers extending the framework
docs/              → Human-readable explanations (secondary)
```

### CLAUDE.md Structure (Framework Version)

The framework ships a CLAUDE.md template that every Papertek project inherits:

```markdown
# CLAUDE.md — Papertek Edu-Framework

## What This Project Is
[auto-filled from papertek.config.js]

## Critical Rules
- NEVER edit files in public/js/ — these are framework engine files
- NEVER edit generated lesson HTML files
- ALWAYS run `npm run validate` after making content changes
- ALWAYS use skills (e.g., /create-lesson) for content creation

## File Structure Convention
| To change... | Edit this file | Then run |
|---|---|---|
| Lesson content | content/{lang}/lessons-data/chapter-{N}.js | npm run validate |
| Exercises | content/{lang}/exercises-data/{curriculum}/chapter-{N}.js | npm run validate |
| Grammar modules | content/{lang}/grammar-data/chapter-{N}.js | npm run validate |
| Vocabulary | shared/vocabulary/core/{lang}/*.json | npm run build:vocab |
| UI translations | i18n/{locale}.js | nothing |
| Course structure | papertek.config.js | npm run generate:lessons |

## Exercise Types Available
[list of all 22 types with their schema references]

## Naming Conventions
- Exercise IDs: {type}-{number}-{chapterId} (e.g., fill-in-1-3-2)
- Storage keys: {curriculum}-{lessonId}-{exerciseType}-{exerciseId}
- Lesson files: {prefix}-{chapter}-{lesson}.html (e.g., vg1-3-2.html)

## Validation Commands
npm run validate              # All validators
npm run validate:schemas      # Content matches JSON schemas
npm run validate:exercises    # Exercise IDs unique, counts match
npm run validate:vocabulary   # No orphan words
npm run validate:lessons      # Generated files match templates

## Available Skills
/create-project    — Scaffold a new Papertek app
/create-lesson     — Generate a complete lesson
/create-exercises  — Generate exercises for a lesson
/create-vocabulary — Build vocabulary banks
/create-grammar    — Generate grammar modules
/create-test       — Build question banks
/add-language      — Add a UI language
/add-curriculum    — Add a curriculum
/audit-content     — Check content quality
```

### AGENTS.md (AAIF Standard)

Following the Linux Foundation AAIF standard adopted by 60,000+ projects:

```markdown
# AGENTS.md

## Project: Papertek Edu-Framework App
## Type: Offline-first educational PWA
## Stack: Vanilla JS (ES Modules), Papertek CSS (zero-dependency), Firebase (optional)

## Conventions
- All content is data-driven (JSON/JS data files, not HTML)
- Framework engine files (public/js/) are read-only
- Content files (content/{lang}/) are the only files AI should edit
- Validation must pass before any commit

## Schemas
All content must conform to schemas in schemas/ directory.
Run `npm run validate:schemas` to check.

## Key Files
- papertek.config.js — course configuration (human-edited)
- CLAUDE.md — detailed AI instructions (auto-generated from framework)
- content/ — all course content (AI-generated)
- shared/vocabulary/ — vocabulary data (AI-generated)
```

---

## 8. Package Structure

### Monorepo Layout

```
github.com/papertek/edu-framework/
  packages/
    core/                       # @papertek/core — shared utilities, types
    css/                        # @papertek/css — Papertek CSS design system (zero deps)
    exercises/                  # @papertek/exercises — ExerciseBase + 22 types
    progress/                   # @papertek/progress — tracking, achievements
    vocab-trainer/              # @papertek/vocab-trainer — 5-mode trainer
    spaced-repetition/          # @papertek/spaced-repetition — SM-2, profiles
    shell/                      # @papertek/shell — AppShell, tabs, modals
    i18n/                       # @papertek/i18n — translation system
    offline/                    # @papertek/offline — SW, download manager
    auth/                       # @papertek/auth — Firebase auth + sync
    teacher/                    # @papertek/teacher — dashboard, classes
    vocabulary/                 # @papertek/vocabulary — vocab loading + merging
    tooltips/                   # @papertek/tooltips — word click tooltips
    test-engine/                # @papertek/test-engine — quiz system
    classroom/                  # @papertek/classroom — games (Bingo, etc.)
    content-loader/             # @papertek/content-loader — dynamic imports
    a11y/                       # @papertek/a11y — accessibility
    cli/                        # @papertek/cli — scaffolder, generators, validators
    schemas/                    # @papertek/schemas — JSON schema definitions
    skills/                     # @papertek/skills — Claude/agent skill files
  templates/
    CLAUDE.md.template          # Template for project CLAUDE.md
    AGENTS.md.template          # Template for project AGENTS.md
    papertek.config.template.js # Config template
  docs/                         # Human-readable documentation
    getting-started.md
    architecture.md
    contributing.md
    exercise-types.md
    creating-content.md
  examples/
    german-a1/                  # Complete German A1 course (extracted from Tysk1)
    spanish-a1/                 # Spanish A1 starter
    math-basics/                # Non-language example (math)
    history-intro/              # Non-language example (history)
```

### Why Vanilla JS + Vanilla CSS, Not React + Tailwind

| Factor | React + Tailwind | Vanilla JS + Papertek CSS |
|--------|-----------------|--------------------------|
| JS dependencies | React (40KB+), build toolchain | 0KB — ES modules run natively |
| CSS dependencies | TailwindCSS, PostCSS, config file | 0KB — one plain CSS file |
| Total build steps | 2 (JSX transpilation + CSS purge) | 0 — everything runs as-is |
| AI code generation | AI must know React patterns + Tailwind classes | AI only needs Papertek conventions |
| Offline caching | Complex (hydration, state rehydration) | Simple (static HTML + JS + CSS) |
| Service Worker | Requires careful SSR/CSR handling | Native — static files just work |
| Theming | Edit tailwind.config.js + rebuild | Change 3 CSS variables — no rebuild |
| New contributor barrier | Must know React, hooks, Tailwind utilities | Must know DOM APIs + standard CSS |
| CLAUDE.md complexity | Must document React + Tailwind patterns | Document only domain conventions |
| Long-term stability | React API changes every 2-3 years, Tailwind major versions break | Platform APIs + CSS spec are stable forever |

The key advantage: **an AI agent generating Papertek code only needs to know the Papertek conventions (from CLAUDE.md). An AI agent generating React + Tailwind code needs to know React conventions AND Tailwind conventions AND Papertek conventions. Fewer layers = fewer bugs.**

---

## 9. Skills Library (AI Workflows)

Each skill is a `.md` file in `.claude/skills/` with precise instructions. The AI reads the skill file and follows the steps.

### Core Skills

#### `/create-project`
**Input:** Natural language course description
**Output:** Complete scaffolded Papertek project
**Steps:**
1. Read papertek.config.js template
2. Ask educator for: course name, target language, UI languages, number of chapters, audience
3. Generate papertek.config.js
4. Create directory structure per conventions
5. Generate CLAUDE.md from template + config
6. Generate AGENTS.md from template + config
7. Install dependencies
8. Run `npm run validate` to verify scaffold

#### `/create-lesson`
**Input:** Chapter number, lesson number, topic description
**Output:** Complete lesson data (dialog, vocabulary, grammar, goals)
**Steps:**
1. Read schemas/lesson.schema.json
2. Read existing lessons for style reference
3. Generate lesson data conforming to schema
4. Generate vocabulary entries for new words
5. Run `npm run validate:schemas`

#### `/create-exercises`
**Input:** Chapter number, lesson number, exercise count, types
**Output:** Exercise definitions conforming to exercise.schema.json
**Steps:**
1. Read schemas/exercise.schema.json
2. Read lesson data for this chapter (for context)
3. Read existing exercises for style reference
4. Generate exercises using vocabulary and grammar from the lesson
5. Update EXERCISE_DATABASE in progress config
6. Run `npm run validate:exercises`

#### `/create-vocabulary`
**Input:** Word list or topic description
**Output:** Core vocabulary bank + translations
**Steps:**
1. Read schemas/vocabulary.schema.json
2. Generate core entries (word, gender, conjugations, examples)
3. Generate translations for each configured language pair
4. Run `npm run validate:vocabulary`

#### `/create-grammar`
**Input:** Grammar topic, chapter, difficulty level
**Output:** Grammar module definitions
**Steps:**
1. Read schemas/grammar.schema.json
2. Read grammar renderer module list (what types are available)
3. Generate grammar data using available module types
4. Run `npm run validate:schemas`

#### `/create-test`
**Input:** Chapter range, question count, difficulty mix
**Output:** Question bank entries
**Steps:**
1. Read schemas/question-bank.schema.json
2. Read vocabulary and grammar for the chapter range
3. Generate questions (multiple choice, fill-in, conjugation)
4. Run `npm run validate:schemas`

#### `/add-curriculum`
**Input:** Curriculum ID, label, chapter count
**Output:** New curriculum entry in config + generated lesson files
**Steps:**
1. Add entry to papertek.config.js
2. Update CURRICULUM_REGISTRY
3. Run lesson generator
4. Create empty content directories

#### `/audit-content`
**Input:** None (audits entire project)
**Output:** Report of quality issues
**Checks:**
- Difficulty progression across chapters
- Vocabulary coverage (are all taught words exercised?)
- Exercise type variety per chapter
- Grammar topic coverage
- Cross-references between lessons
- Missing translations

---

## 10. JSON Schemas

### Schema Files

#### `schemas/lesson.schema.json`
Defines the structure of a lesson: dialog entries, vocabulary goals, grammar topics, pronunciation notes, cultural context, learning checklist.

#### `schemas/exercise.schema.json`
Defines all 22 exercise types. Each type has its own sub-schema:
- `fill-in`: items with `pre`, `answer`, `post`, `width` (supports grouping via empty `pre`)
- `true-false`: items with `statement`, `answer`, `explanation`
- `matching`: pairs with `left`, `right`
- `image-matching`: pairs with `image`, `text`
- `quiz`: items with `question`, `options`, `correct`
- `dilemma`: dropdown multiple choice
- `drag-drop-sentences`: word-order exercises
- `minidialog`: role-play scenarios
- `writing`: free-text prompts
- `chronology`: timeline ordering
- `checklist`: self-assessment
- `interactive-flashcards`: flip cards
- `interactive-map`: clickable geography
- `number-grids`: number practice
- `color-picker`: color selection
- `verb-trainer`: conjugation drills
- `gender-trainer`: noun gender practice

#### `schemas/vocabulary.schema.json`
Core vocabulary entry: word, part of speech, gender (if noun), conjugations (if verb), declensions (if noun/adjective), example sentences, audio file reference.

Translation entry: word ID, translation, native language example.

#### `schemas/grammar.schema.json`
Grammar module types matching the grammar renderer:
- `verb-table`: conjugation tables
- `adjective-chart`: adjective ending tables
- `case-table`: case/preposition tables
- `rule-box`: highlighted grammar rules
- `example-list`: annotated example sentences
- `comparison-table`: before/after or language comparison
- `tip-box`: learning tips
- `exercise-inline`: inline practice within grammar explanation

#### `schemas/curriculum.schema.json`
Curriculum metadata: ID, label, language, level (CEFR), chapters, lessons per chapter, feature flags.

#### `schemas/question-bank.schema.json`
Test questions: question text, type (multiple-choice, fill-in, conjugation), options, correct answer, chapter/lesson reference, difficulty level.

#### `schemas/language.schema.json`
Language-specific configuration: gender system (none/2/3), special characters, character normalization rules, TTS voice config, script direction (LTR/RTL).

---

## 11. The Human + AI Workflow

### Creating a New Course

```
EDUCATOR: "I want to create a French course for Norwegian
           university students. 10 chapters. Focus on academic
           French — reading research papers, writing essays,
           participating in seminars."

AI AGENT:
  1. Reads CLAUDE.md → understands framework
  2. Asks clarifying questions:
     - "CEFR level? (B1-B2 for academic French?)"
     - "How many lessons per chapter? (default: 3)"
     - "Include classroom games?"
     - "Include teacher dashboard?"
  3. Runs /create-project → scaffolds structure
  4. Generates papertek.config.js
  5. Runs /create-vocabulary → academic French word banks
  6. For each chapter:
     - Runs /create-lesson (x3) → lesson content
     - Runs /create-exercises (x3) → exercises
     - Runs /create-grammar → grammar modules
  7. Runs /create-test → question banks
  8. Runs npm run validate → checks everything
  9. Runs npm run build → compiles
  10. Runs npm run dev → educator previews

EDUCATOR: "Chapter 5 needs more exercises on subjunctive mood"
AI AGENT: Runs /create-exercises with specific focus → validates → done

EDUCATOR: "The dialog in lesson 3.2 is too formal, make it casual"
AI AGENT: Reads lesson data → regenerates dialog → validates → done

EDUCATOR: "Add an English UI option for exchange students"
AI AGENT: Runs /add-language → generates en.js translations → done
```

### Modifying an Existing Course

```
EDUCATOR: "Students are struggling with chapter 7 exercises.
           Can we add easier warm-up exercises?"

AI AGENT:
  1. Reads current exercises for chapter 7
  2. Analyzes difficulty level
  3. Generates 3 new easier exercises (warm-up)
  4. Inserts them before existing exercises
  5. Updates EXERCISE_DATABASE
  6. Runs npm run validate
  7. Shows educator the changes
```

### Contributing to the Framework

```
DEVELOPER: "I want to add a new exercise type: sentence-builder"

AI AGENT:
  1. Reads CONTRIBUTING.md
  2. Reads exercise-base.js (factory pattern)
  3. Reads schemas/exercise.schema.json
  4. Creates new exercise module following the pattern
  5. Adds sub-schema to exercise.schema.json
  6. Adds to exercise type registry
  7. Writes tests
  8. Runs npm run test
  9. Creates PR
```

---

## 12. Open Source & Donation Model

### Repository Structure

```
github.com/papertek/
  edu-framework/              # Core framework monorepo (MIT)
  content-german/             # German content (CC-BY-SA)
  content-spanish/            # Spanish content (CC-BY-SA)
  content-french/             # French content (CC-BY-SA)
  create-edu-app/             # CLI scaffolder (MIT)
  docs/                       # Documentation site (CC-BY-SA)
  examples/                   # Example projects (MIT)
```

### Licensing

| Component | License | Why |
|-----------|---------|-----|
| Framework engine | MIT | Maximum adoption, no barriers |
| Content packages | CC-BY-SA | Share-alike ensures community content stays open |
| Documentation | CC-BY-SA | Shareable, attributable |
| Skills / CLAUDE.md templates | MIT | Must be freely usable by AI agents |

### Funding Channels

| Channel | Description |
|---------|-------------|
| **GitHub Sponsors** | Individual and org sponsorship on the Papertek org |
| **Open Collective** | Transparent fund management, community governance |
| **"Built with Papertek" badge** | Free visibility for the project |
| **Grants** | Education technology grants (EU Horizon, national education funds) |
| **Institutional partnerships** | Schools/universities that use Papertek contribute back |

### Contribution Model

| Contribution Type | Process |
|---|---|
| Framework engine (code) | Standard PR process, reviewed by maintainers |
| Content (lessons, exercises) | AI validates schema conformance, human reviews pedagogy |
| Skills (new /create-* workflows) | PR with skill file + usage documentation |
| Language additions | New `content-{language}` package, community-reviewed |
| Exercise type plugins | PR to exercises package, must follow ExerciseBase pattern |
| Translations (UI) | PR to i18n package, reviewed by native speakers |
| Bug reports | GitHub Issues with reproduction steps |

### Community Infrastructure

| Platform | Purpose |
|----------|---------|
| GitHub Discussions | Technical questions, feature requests |
| Discord | Real-time chat, community building |
| Monthly calls | Open community calls for roadmap discussion |
| Blog | Release notes, case studies, tutorials |

---

## 13. Implementation Roadmap

### How to Start: Copy Tysk1, Build From There

```bash
# Step 1: Copy the repository
cp -r Tysk-niv--1-versjon-1.3/ papertek-edu-framework/
cd papertek-edu-framework/

# Step 2: Initialize as new repo
rm -rf .git
git init
git checkout -b main

# Step 3: Begin extraction (Phase 1)
```

### Phase 1: Foundation (Schema + Structure)

**Goal:** Define the framework's contract layer — what AI agents will read.

**Tasks:**
1. Define all JSON schemas (`schemas/*.json`)
   - Start with exercise.schema.json (most complex, best validated by existing data)
   - Then vocabulary.schema.json, lesson.schema.json, grammar.schema.json
   - Then curriculum.schema.json, question-bank.schema.json, language.schema.json
2. Create `papertek.config.js` format and parser
3. Create CLAUDE.md template (framework version)
4. Create AGENTS.md template (AAIF standard)
5. Write validation scripts (`npm run validate:schemas`)
6. Restructure directories to match framework conventions
7. Verify Tysk1 content passes schema validation

**Deliverable:** The schema layer exists and all existing Tysk1 content validates against it.

### Phase 2: Papertek CSS + Engine Extraction

**Goal:** Replace Tailwind with Papertek CSS. Separate framework engine from Tysk1 content.

**CSS Migration Tasks:**
1. Audit all Tailwind utility classes used across templates and JS files
2. Group utilities into ~30 semantic component classes (`.exercise-card`, `.tab-button`, `.badge`, etc.)
3. Write `papertek.css` using CSS custom properties, `@layer`, nesting — zero dependencies
4. Replace Tailwind utility classes in all templates with semantic Papertek CSS classes
5. Remove `tailwindcss` from package.json, delete `tailwind.config.js`, delete `src/input.css`
6. Remove `build:css` and `watch:css` npm scripts (no CSS build step needed)
7. Visual regression testing — app must look identical

**Engine Extraction Tasks:**
8. Create `packages/` monorepo structure
9. Extract ExerciseBase + all 22 exercise types into `@papertek/exercises`
10. Extract progress system into `@papertek/progress`
11. Extract vocab trainer into `@papertek/vocab-trainer`
12. Extract SM-2 + VocabProfileService into `@papertek/spaced-repetition`
13. Extract AppShell, tabs, modals into `@papertek/shell`
14. Extract i18n into `@papertek/i18n`
15. Extract Service Worker + offline into `@papertek/offline`
16. Move German content to `content-german/` (separate repo or package)
17. Verify Tysk1 still works using the extracted packages (no regression)

**Deliverable:** Zero CSS dependencies. Tysk1 runs on framework packages. Engine and content are separate.

### Phase 3: Abstraction ✅

**Goal:** Remove language-specific assumptions from the engine.

**Tasks:**
1. ✅ Language config system — `language-utils.js` central abstraction layer (gender, articles, normalization, pronouns, number words, verb config)
2. ✅ Grammar module registry — `GRAMMAR_TOOL_REGISTRY` in grammar-renderer.js with `registerGrammarTool()` / `registerGrammarTools()` API
3. ✅ Auth provider plugin system — `auth-provider-registry.js` with `registerAuthProvider()` API, FEIDE/Google as default providers
4. Theme/branding — already handled by papertek.css token system (Phase 2)
5. ✅ Configurable special character keyboard — reads from `config.languageConfig.specialChars` (already config-driven)
6. ✅ Progression-gating config — `milestoneTests` in curriculum registry, `areChaptersCompleted()` generic function

**Engine files refactored:**
- `word-tooltips.js` — dynamic language resource loading, config-driven articles/pronouns
- `answer-validation.js` + `utils.js` — language-agnostic normalization via language-utils
- `gender.js` — config-driven gender colors and display words
- `write.js` — config-driven article lookup
- `grammar-renderer.js` — config-driven pronouns, native code, tool registry
- `test.js` — dynamic content imports per language
- `achievements.js` — generic `areChaptersCompleted(chapters, lessonsPerChapter)`
- `ui.js` — config-driven milestone tests and language directory resolution
- `curriculum-registry.js` — added `characterNormalization` and `milestoneTests`

**Deliverable:** Framework can host a non-German course without code changes.

### Phase 4: CLI Scaffolder ✅

**Goal:** `npx create-edu-app` produces a working project.

**Implementation:** `cli/create-edu-app.js` — zero-dependency Node.js CLI

**Tasks:**
1. ✅ CLI tool with `bin` entry in package.json (`npm run create`)
2. ✅ Interactive prompts with `--flag` overrides for non-interactive mode
3. ✅ Scaffolds complete project: config, CLAUDE.md, AGENTS.md, package.json, content stubs
4. ✅ Language presets for German, French, Spanish, Norwegian (custom ISO codes also supported)
5. ✅ Copies engine (public/js), CSS, schemas, and build scripts from framework
6. ✅ Generates schema-conforming content stubs (lessons, exercises, grammar) for all chapters
7. ✅ Initializes git repo with .gitignore and initial commit

**Usage:**
```bash
node cli/create-edu-app.js                              # Interactive
node cli/create-edu-app.js --name "French A1" --lang fr  # Non-interactive
```

**Deliverable:** Anyone (human or AI) can scaffold a new project in 30 seconds.

### Phase 5: Skills Library

**Goal:** AI agents can build complete courses using skills.

**Tasks:**
1. ✅ Port `/create-exercises` to language-agnostic framework format (reads from config, supports all 12 exercise types)
2. ✅ Write `/create-project` skill (wraps CLI scaffolder with interactive guidance)
3. ✅ Write `/create-lesson` skill (dialog, goals, checklist, CEFR-aware)
4. ✅ Write `/create-vocabulary` skill (word entries with translations, gender, conjugations)
5. ✅ Write `/create-grammar` skill (7 module types + interactive tools, data key aware)
6. ✅ Write `/create-test` skill (3 test types: lesson, chapter, cumulative)
7. ✅ Write `/add-curriculum` skill (adds track to existing project)
8. ✅ Write `/audit-content` skill (schema validation, completeness, quality checks)
9. Skills are ready for Claude Code testing — each reads config and adapts to the target language
10. Skill contribution guide deferred to Phase 6 (documentation)

**Skills location:** `.claude/skills/` (8 content skills + 1 vocabulary API reference)

**Deliverable:** An AI agent can build a complete course from a single conversation.

### Phase 6: Documentation & Examples ✅

**Goal:** Both humans and AI agents can understand the framework.

**Tasks:**
1. ✅ Architecture documentation — Extended `ARCHITECTURE.md` with sections on Framework Abstraction Layer, CLI Scaffolder, and Skills Library
2. ✅ Contributing guide — Created `CONTRIBUTING.md` with guides for content authors, engine developers, skill authors, CSS contributors
3. ✅ Exercise type catalog — Created `docs/exercise-catalog.md` with all 17 exercise types, data formats, and usage notes
4. ✅ Example: German A1 course — `examples/german-a1/` with 2 chapters × 2 lessons each (lessons, exercises, grammar, config)
5. ✅ Example: Math basics course — `examples/math-basics/` proving non-language use (algebra, variables, equations)
6. History course example deferred — Math example is sufficient proof of concept
7. Documentation website deferred to Phase 7 (community launch)

**Files created:**
- `CONTRIBUTING.md` — contribution guide
- `docs/exercise-catalog.md` — all 17 exercise types documented
- `examples/german-a1/` — complete German A1 example (papertek.config.js, 2 chapters of lessons, exercises, grammar)
- `examples/math-basics/` — complete math example (papertek.config.js, 1 chapter of lessons, exercises)

**Deliverable:** Framework is documented and has proof-of-concept examples for both language and non-language courses.

### Phase 7: Community Launch

**Goal:** Open source, attract contributors.

**Tasks:**
1. GitHub org setup (github.com/papertek)
2. MIT license for engine, CC-BY-SA for content
3. GitHub Sponsors setup
4. Open Collective setup
5. Discord server
6. Launch blog post: "An AI-First Framework for Education"
7. Submit to Hacker News, Reddit r/webdev, r/learnprogramming
8. Register on AAIF project list (since we use AGENTS.md)

---

## 14. Business Strategy: Why Open Source Strengthens Papertek Forlag

### Papertek Is a Publisher, Not a Software Company

Papertek Forlag sells educational content to Norwegian schools — not software. Open-sourcing the framework is like a book publisher open-sourcing their printing press. It doesn't give away a single book.

### What You're Giving Away (framework — the tool)

The engine: exercise types, progress tracking, tab system, service worker, vocab trainer mechanics. These are tools. They have no educational value by themselves — without content, the framework is an empty shell that can render exercises but has no exercises, can track progress but has nothing to track, can display lessons but has no lessons.

### What You're Keeping (content + expertise — the actual business)

| Asset | Open source? | Why it's your moat |
|-------|-------------|-------------------|
| German course content (Wir sprechen Deutsch) | **No** | Years of pedagogical work, LK20-aligned |
| Spanish course content (Hablamos Español) | **No** | Same |
| French course content (On parle 8) | **No** | Same |
| Følgebøker (printed companion workbooks) | **No** — physical product | Cannot be copied, pirated, or competed away |
| Norwegian, Math, English, Samfunnsfag, Naturfag (2027) | **No** | Your expansion roadmap — 5 new subjects |
| LK20 curriculum alignment expertise | **No** | Deep knowledge of Norwegian education system |
| School relationships (B2B) | **No** | Trust, contracts, Feide integration, support |
| Free storytelling resources | Currently free | Lead generation — schools try before they buy |

### The Proven Model: Open Source Tool, Paid Content

This is not a new strategy. It's how billion-dollar companies operate:

| Company | Open source (free) | Paid product | Result |
|---------|-------------------|-------------|--------|
| **WordPress** | CMS engine | Hosting, themes, support | Powers 43% of the web |
| **Red Hat** | Linux kernel | Enterprise support | Sold to IBM for $34 billion |
| **Laravel** | PHP framework | Forge, Vapor, Nova | Most popular PHP framework |
| **Elastic** | Elasticsearch | Cloud hosting, enterprise | $2B+ revenue |
| **Android** | Mobile OS | Google services, Play Store | 72% global market share |

In every case: **the tool is free, the value built on top is paid.**

### How Open Source Directly Helps Papertek Forlag

**1. Other publishers validate your technology.**
If a French publisher uses Papertek framework to build their course, it proves the technology works. That makes your sales pitch to Norwegian schools stronger: "This is the same technology used by publishers in 5 countries."

**2. Community improves the engine for free.**
Contributors add exercise types, fix bugs, improve offline performance, add accessibility features. Your German, Spanish, and French courses benefit from these improvements without you doing the work. Every contributor is an unpaid developer improving your product.

**3. You become the creator and reference implementation.**
"Papertek framework? That's the company that built Wir sprechen Deutsch." You're the Laravel to Taylor Otwell — the creator gets the credibility, the speaking invitations, the partnerships.

**4. Norwegian schools trust open source more.**
Schools using Feide/Sikt prefer transparent, inspectable technology. Open source removes procurement friction. IT departments can audit the code. No vendor lock-in concerns.

**5. Expansion to new subjects becomes easier.**
When you build Math, English, and Naturfag in 2027, the framework is already battle-tested by the community. You only build content — the hardest, most valuable part.

**6. Recruitment and partnerships.**
Open source projects attract talented developers. Contributors may become hires or partners. Other publishers may want to collaborate rather than build from scratch.

### The Strategic Picture

```
OPEN SOURCE (free)                    PAPERTEK FORLAG (paid, B2B)
────────────────────                  ──────────────────────────────
Papertek Edu-Framework                Content & Services
  - Exercise engine (22 types)          - Wir sprechen Deutsch
  - Progress tracking                   - Hablamos Español
  - Vocab trainer (5 modes)             - On parle 8
  - SM-2 spaced repetition              - Følgebøker (printed workbooks)
  - Service worker / offline            - Norsk (2027)
  - Papertek CSS                        - Matte (2027)
  - Teacher dashboard engine            - Engelsk (2027)
  - Classroom games engine              - Samfunnsfag (2027)
  - i18n system                         - Naturfag (2027)
  - CLI scaffolder                      - LK20 curriculum alignment
  - AI skills library                   - Feide integration & support
  - JSON schemas                        - School onboarding & training
                                        - Custom content development
Community contributions:
  - New exercise types               Revenue streams:
  - Bug fixes & performance            - B2B school licenses
  - Accessibility improvements          - Printed workbook sales
  - UI translations                     - Subject expansion
  - Documentation                       - Institutional partnerships
```

### The Følgebøker Advantage

The printed companion workbooks ("Følgebøker") are strategically brilliant:
- **Cannot be open-sourced** — they're physical products
- **Cannot be pirated** — schools need physical copies for each student
- **Anchor the digital product** — the app and workbook work together
- **Recurring revenue** — new students every year need new workbooks
- **Differentiation** — no competitor can replicate the digital + physical combination with a single open-source download

### What You Must Protect

When extracting the framework, ensure these stay in **private repositories**:

| Keep Private | Why |
|---|---|
| All lesson content data (dialog, exercises, vocabulary, grammar) | This IS your product |
| Følgebøker source files (InDesign, PDFs) | Physical product IP |
| Question banks and test content | Assessment content has high value |
| LK20 mapping documents | Competitive advantage in Norway |
| School contracts and pricing | Business confidential |
| Student data and analytics | Privacy and GDPR |

The framework repository should contain **zero educational content** — only the engine, schemas, skills, and documentation.

### Content Licensing Decision

For the framework's example content (needed for demos), you have two options:

| Option | Content License | Implication |
|--------|----------------|-------------|
| **A: CC-BY-SA examples** | Open, share-alike | Community can build on your example content. Good for adoption. |
| **B: Minimal stub examples** | MIT (trivial content) | Only enough content to demonstrate the framework works. No real educational value. |

**Recommendation:** Option B. Ship the framework with minimal stub content (5 example exercises, a sample dialog, 20 vocabulary words). Enough for an AI agent to understand the pattern. Not enough to be a competing product. Your real courses stay private.

---

## 15. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| AI agents evolve, CLAUDE.md conventions change | Medium | High | Follow AAIF standards (AGENTS.md), keep CLAUDE.md as supplementary |
| Scope creep — trying to be everything | High | High | Stay focused: education PWAs only. Not a general framework. |
| No contributors — solo maintainer burnout | Medium | High | Launch with working examples, make contributing easy, donation fund |
| React ecosystem too dominant | Low | Medium | Don't compete with React. Different market (educators, not developers) |
| Schema rigidity — can't evolve without breaking | Medium | Medium | Version schemas, migration scripts (already proven in Tysk1) |
| Offline-first adds complexity | Low | Low | Already proven in Tysk1 production. The hard problems are solved. |
| Content quality from AI generation | Medium | Medium | Validation scripts + human review of pedagogy |

---

## 16. Sources & References

### AI-Agent Development Tools
- [AGENTS.md / AAIF (Linux Foundation)](https://aaif.io/)
- [Agent OS (Builder Methods)](https://buildermethods.com/agent-os)
- [GitHub Spec Kit](https://github.com/github/spec-kit)
- [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)
- [Codified Context paper (arXiv 2602.20478)](https://arxiv.org/abs/2602.20478)
- [rulesync](https://github.com/dyoshikawa/rulesync)
- [steipete/agent-rules](https://github.com/steipete/agent-rules)

### Prompt-Driven App Builders
- [v0 (Vercel)](https://v0.dev)
- [Bolt.new / bolt.diy (StackBlitz)](https://bolt.new)
- [Lovable.dev](https://lovable.dev)
- [Wasp (wasp-lang)](https://wasp.sh)
- [create.xyz](https://create.xyz)

### Education Platforms
- [LibreLingo](https://github.com/kantord/LibreLingo)

### Framework Adoption Research
- [2025 JavaScript Rising Stars](https://risingstars.js.org/2025/en)
- [Svelte Growth Data](https://dev.to/krish_kakadiya_5f0eaf6342/svelte-in-2025)
- [htmx Adoption](https://www.wearedevelopers.com/en/magazine/537/)
- [Astro Year in Review 2025](https://astro.build/blog/year-in-review-2025/)
- [Vanilla JS Resurgence](https://thenewstack.io/why-developers-are-ditching-frameworks-for-vanilla-javascript/)
- [Wasp Framework Story](https://dev.to/wasp/from-you-will-fail-to-15000-github-stars)

### AI-Agent Trends
- [Anthropic 2026 Agentic Coding Trends Report](https://resources.anthropic.com/2026-agentic-coding-trends-report)
- [8 Trends Summary (Tessl)](https://tessl.io/blog/8-trends-shaping-software-engineering-in-2026)

---

*This document was created on 2026-02-27 by Geir Forbord and Claude Code as the vision and plan for the Papertek Edu-Framework.*
