# Architecture: Offline-First Vanilla Learning App

> **Status**: Living document. Last verified against codebase Feb 2026.
> **Audience**: Human developers AND AI coding agents (Claude, Cursor, etc.)

---

## 1. Philosophy

This project targets **resource-constrained devices** (school Chromebooks, older tablets).
We avoid heavy frameworks to minimize bundle size, reduce memory usage, and retain full
control over offline logic (Service Workers / PWA).

**Key constraints:**

- No build-time transpilation of application JS (ES modules loaded natively)
- No virtual DOM — every DOM mutation is explicit and intentional
- Offline-first: the app works 100% without network via localStorage + Service Worker
- Cloud sync is additive (enhances, never gates functionality)

---

## 2. Directory Map

All paths below are relative to `public/js/`.

```
public/js/
├── main.js                        Entry point (delegates to page-init.js)
├── page-init.js                   Page-type detection → specialized init
├── ui.js                          Tabs, header, special chars, PWA install
├── exercises/
│   ├── exercise-base.js           ExerciseBase factory (§2.1)
│   ├── embedded-verb-trainer-v2.js  Reference implementation using ExerciseBase
│   ├── embedded-verb-trainer.js   Legacy version (pre-ExerciseBase)
│   ├── fill-in.js                 Legacy exercise
│   ├── matching-game.js           Legacy exercise
│   ├── quiz.js                    Legacy exercise
│   ├── ... (21 exercise modules)
│   └── storage-utils.js           Exercise-level localStorage helpers
├── progress/
│   ├── index.js                   Barrel re-export (public API)
│   ├── store.js                   Low-level localStorage (saveData / loadData)
│   ├── achievements.js            Exercise completion → achievement counters
│   ├── config.js                  EXERCISE_DATABASE (exercise counts per lesson)
│   ├── progress-hub.js            ProgressHub pub/sub (§2.2)
│   ├── total-progress-bar.js      Global progress bar widget (§2.3)
│   ├── ui.js                      Lesson list icons, progress page
│   └── ...
├── sync/
│   └── cloud-sync.js              Firestore ↔ localStorage merge
├── core/
│   ├── SM2Algorithm.js            Spaced repetition (vocabulary trainer)
│   ├── VocabProfileService.js     Vocabulary profile management
│   └── adapters/                  Storage adapters (LocalStorage, Blob, Data)
└── ...
```

> **Note**: `core/` contains domain algorithms (SM2, vocab profiles). Exercise
> infrastructure lives in `exercises/`. Do not confuse the two.

---

## 2.1 ExerciseBase (Factory Pattern)

**File**: `exercises/exercise-base.js`
**Exports**: `createExercise(containerId, definition)`, `notifyStorageChange(key, value)`

All *new or refactored* exercise modules must use the ExerciseBase factory.
Currently **1 of 22** exercise modules has been migrated (`embedded-verb-trainer-v2.js`).

### Why it exists

Every exercise cycles through multiple screens (start → question → results).
Each screen sets `container.innerHTML`, destroying the old DOM tree but
**orphaning** any listeners registered on `document`, `window`, or elements
outside the container. Timers (`setTimeout`) that fire after the screen change
write to dead DOM. There was no mechanism for one exercise to react when another
module overwrites its storage key.

### How it works

```
createExercise(id, definition)
        │
        ▼
   exercise.mount()
        │
        ▼  creates Phase 1 (AbortController + timer list)
   definition.onMount(ctx)
        │
        │   ctx.listen(el, 'click', fn)  →  signal: controller.signal
        │   ctx.setTimeout(fn, 1500)     →  tracked in phaseTimers[]
        │   ctx.$('.mc-btn')             →  scoped querySelector
        │
        │   ctx.render(showResults)      →  PHASE TRANSITION:
        │       1. controller.abort()    →  all listeners from Phase 1 die
        │       2. clearTimeout(*)       →  all timers from Phase 1 cancelled
        │       3. new AbortController   →  Phase 2 starts
        │       4. showResults(ctx)      →  fresh ctx for Phase 2
        │
        ▼
   exercise.destroy()                    →  final abort + timer cleanup
                                            + unsubscribe storage watchers
```

### Context object (`ctx`)

| Method | Purpose |
|--------|---------|
| `ctx.listen(target, event, handler, options?)` | `addEventListener` with auto-cleanup via `AbortController.signal` |
| `ctx.setTimeout(fn, ms)` | Tracked timeout, cancelled on phase change |
| `ctx.setInterval(fn, ms)` | Tracked interval, cancelled on phase change |
| `ctx.render(renderFn)` | End current phase, start new phase, call `renderFn(newCtx)` |
| `ctx.$(selector)` | `container.querySelector(selector)` |
| `ctx.$$(selector)` | `container.querySelectorAll(selector)` |
| `ctx.container` | The exercise's root DOM element |

### Exercise-level storage sync

Separate from ProgressHub (§2.2). This handles **exercise-internal state**
(e.g. "paused test at question 7"), not global progress.

```js
// Writer side (any module):
import { notifyStorageChange } from '../exercises/exercise-base.js';
saveData(key, value);
notifyStorageChange(key, value);  // fires CustomEvent on window

// Receiver side (exercise definition):
createExercise(id, {
    storageKeys: ['my-progress-key', 'my-completion-key'],

    onStorageChange(ctx, key, newValue) {
        // React to external writes — e.g. cloud-sync restored a paused test
        if (ctx.$('[data-action="start"]')) {
            ctx.render(showStartScreen);  // re-render only if on start screen
        }
    },
});
```

Two channels are watched:
- `window 'storage'` event — fires when **another tab** writes to localStorage
- `window 'exercise-storage-change'` CustomEvent — fires same-tab via `notifyStorageChange()`

### Caller lifecycle

```js
import { setupEmbeddedVerbTrainer } from './exercises/embedded-verb-trainer-v2.js';

const exercise = setupEmbeddedVerbTrainer('verb-1', config);
// exercise.mount() is called internally by setup function

// On SPA navigation or page teardown:
exercise.destroy();  // cleans up everything
```

---

## 2.2 ProgressHub (Global State Pub/Sub)

**File**: `progress/progress-hub.js`
**Export**: `progressHub` (singleton instance, lowercase)

Solves: *"5 different sources write progress data, but UI widgets don't know about each other."*

### Sources → Hub → Widgets

```
 SOURCES (existing code, minimal changes)         HUB                    WIDGETS

 achievements.js                                                     TotalProgressBar
   dispatch('exercise-completed') ─────┐                               .update(snapshot)
   dispatch('exercise-removed')  ─────┤                                  │
   dispatch('progress-updated')  ─────┤     ┌──────────────┐            │
                                       ├───▶│ ProgressHub  │───────────▶│ only mutates:
 cloud-sync.js                         │    │  .on()       │            │  style.width
   progressHub.emit({source:'sync'}) ──┤    │  .emit()     │            │  className
                                       │    │  .getSnapshot │            │  textContent
 Another browser tab                   │    └──────────────┘            │  aria-valuenow
   native 'storage' event ────────────┘
```

### API

```js
import { progressHub } from '../progress/progress-hub.js';

// Subscribe (returns unsubscribe function)
const unsub = progressHub.on('progress-changed', (snapshot) => {
    // snapshot.totalPercent        — 0 to 100
    // snapshot.exercisesCompleted  — e.g. 42
    // snapshot.exercisesTotal      — e.g. 180
    // snapshot.lessonsStarted      — e.g. 8
    // snapshot.lessonsTotal        — e.g. 30
    // snapshot.byLesson            — { '2-1': { percent, completed, total } }
    // snapshot.lessonId            — which lesson triggered (or null)
    // snapshot.source              — 'exercise' | 'achievement' | 'sync' | 'tab'
});

// Emit (from a module that writes progress outside achievements.js)
progressHub.emit({ lessonId: '3-2', source: 'my-module' });

// One-shot read (no subscription)
const snap = progressHub.getSnapshot();
```

### Bridged events

ProgressHub automatically listens to these existing CustomEvents (no changes
to the emitting code were needed):

| Event | Dispatched by | Hub source value |
|-------|---------------|------------------|
| `exercise-completed` | `achievements.js` | `'exercise'` |
| `exercise-removed` | `achievements.js` | `'exercise'` |
| `progress-updated` | `achievements.js` | `'achievement'` |
| `window 'storage'` (key=`progressData`) | Browser (cross-tab) | `'tab'` |

The only code change was adding `progressHub.emit({ source: 'sync' })` in
`cloud-sync.js` after `saveFullProgressData()`, because cloud-sync did not
dispatch any CustomEvent.

---

## 2.3 TotalProgressBar (Widget Pattern)

**File**: `progress/total-progress-bar.js`
**Export**: `mountProgressBar(containerId)`

A reference implementation showing how to build widgets that subscribe to ProgressHub.

### Mount once, update surgically

```js
import { mountProgressBar } from '../progress/total-progress-bar.js';

const bar = mountProgressBar('header-progress-slot');
// That's it. The bar now auto-updates when any source writes progress.

bar.refresh();   // Force re-read (e.g. after bulk import)
bar.destroy();   // Unsubscribe + clear DOM
```

### What "surgical update" means

After the initial `innerHTML` (run once at mount), the `update()` function
**never** sets `innerHTML` again. It touches exactly 5 properties:

```js
function update(snapshot) {
    if (snapshot.totalPercent === lastPercent) return;  // dedup

    fill.style.width     = `${totalPercent}%`;           // CSS transition animates
    fill.className       = `... ${barColorClass(pct)}`;  // color band swap
    label.textContent    = `Total progresjon: ${pct}%`;  // no parsing
    detail.textContent   = `${done} / ${total} øvelser`; // no parsing
    root.setAttribute('aria-valuenow', String(pct));     // accessibility
}
```

No `createElement`, no `innerHTML`, no layout thrash.

---

## 3. Rules for AI Code Generation

When generating code for this project, you **MUST** follow these rules.

### 3.1 Inside exercise modules (`exercises/*.js`)

1. **All DOM interaction through `ctx`.**
   Use `ctx.listen()`, `ctx.setTimeout()`, `ctx.$()`, `ctx.$$()`.
   Never call `addEventListener` or `setTimeout` directly.

2. **Screen transitions via `ctx.render()`.**
   Never set `container.innerHTML = ...` directly. Call `ctx.render(fn)`
   so the previous phase's listeners and timers are cleaned up first.

3. **Return the exercise object** from setup functions so callers can
   call `.destroy()` on navigation.

4. **Storage notifications.** If you write exercise-specific keys with
   `saveData()`, also call `notifyStorageChange(key, value)` so other
   instances of the same exercise (or other tabs) can react.

### 3.2 Inside global widgets (`progress/*.js`, `layout/*.js`)

1. **Subscribe to `progressHub`** for progress changes. Do not listen
   to individual CustomEvents — the hub already bridges them.

2. **Surgical DOM updates only.** After the initial mount, use
   `textContent`, `style.*`, `classList.toggle()`, `setAttribute()`.
   Never use `innerHTML` in an update path.

3. **Always return a `destroy()` function** that unsubscribes from the
   hub and cleans up DOM.

### 3.3 Inside any module that writes progress

1. If writing through `achievements.js` (`trackExerciseCompletion`,
   `removeExerciseCompletion`) — no action needed. These already
   dispatch the events that ProgressHub bridges.

2. If writing through `saveLessonProgress()` or `saveFullProgressData()`
   directly (e.g. cloud-sync, import) — call
   `progressHub.emit({ source: 'your-module' })` after the write.

### 3.4 General

1. **No frameworks.** No React, Vue, Svelte, jQuery, or similar.
2. **No build-time JS transpilation.** ES modules loaded natively.
3. **Offline stability.** All async operations must have a fallback
   if the network disappears. Cloud sync is never a gate.
4. **DOM efficiency.** Never use `.innerHTML = ...` in loops or
   frequent update paths. Use `classList.toggle()`, `style.width`,
   `textContent` for updates.

---

## 4. Migration Status

ExerciseBase and ProgressHub are **new infrastructure**. Adoption is incremental.

| Module | Status | Notes |
|--------|--------|-------|
| `exercise-base.js` | Done | Factory + `notifyStorageChange` |
| `progress-hub.js` | Done | Pub/sub, bridges existing events |
| `total-progress-bar.js` | Done | Reference widget |
| `embedded-verb-trainer-v2.js` | Migrated | Uses ExerciseBase (reference impl) |
| `embedded-verb-trainer.js` | Legacy | Original, no cleanup |
| Other 20 exercise modules | Legacy | Direct `addEventListener`, no cleanup |
| `cloud-sync.js` | Wired | Emits to ProgressHub after merge |
| `achievements.js` | No change needed | Existing events bridged by hub |

### How to migrate a legacy exercise

1. Import `createExercise` from `exercise-base.js`
2. Wrap the setup function body in a `createExercise(id, { onMount(ctx) { ... } })` call
3. Replace all `addEventListener` with `ctx.listen()`
4. Replace all `setTimeout` with `ctx.setTimeout()`
5. Replace `container.innerHTML = ...` screen changes with `ctx.render(fn)`
6. Return the exercise object so callers can call `.destroy()`
7. Add `storageKeys` + `onStorageChange` if the exercise persists state

See `embedded-verb-trainer-v2.js` vs `embedded-verb-trainer.js` for a
before/after comparison.

---

## 5. Framework Abstraction Layer

The engine is language-agnostic. All language-specific behavior is driven by configuration, not code.

### 5.1 Configuration Hierarchy

```
papertek.config.js          ← Educator's primary touchpoint
    │
    ▼
curriculum-registry.js      ← Runtime config (CURRICULUM_REGISTRY)
    │                          Contains language configs per curriculum
    ▼
language-utils.js           ← Central abstraction (public/js/core/)
    │                          Exports: genusToArticle, getArticles, getPronouns,
    │                          normalizeChars, getSpecialChars, getDataKeys, etc.
    ▼
Engine modules              ← Import from language-utils, never hardcode
  word-tooltips.js             language-specific values
  answer-validation.js
  grammar-renderer.js
  gender.js, write.js, test.js
```

### 5.2 Language Config Shape

Each language in `CURRICULUM_REGISTRY` has a `languageConfig` with this shape:

```javascript
{
  code: 'de',                     // ISO 639-1
  grammar: {
    genderCount: 3,               // 0 (none), 2, or 3
    articles: { m: 'der', f: 'die', n: 'das', pl: 'die' },
    genderLabels: { m: 'Maskulin', ... },
    genderColors: { m: 'blue', f: 'red', n: 'green', pl: 'gray' },
    verbLogic: { infinitiveParticle: 'zu', acceptInfinitiveParticle: true },
    pronouns: ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie']
  },
  dataKeys: { target: 'tysk', native: 'norsk' },
  specialChars: ['ß', 'ä', 'ö', 'ü'],
  characterNormalization: { 'ö': 'oe', 'ä': 'ae', 'ü': 'ue', 'ß': 'ss' }
}
```

### 5.3 Grammar Tool Registry

Grammar modules use `custom-tool` type with a `toolId`. The renderer resolves tool IDs via a registry:

```javascript
import { registerGrammarTool } from './grammar-renderer.js';

// Content packages register language-specific tools at runtime
registerGrammarTool('subjunctive-trainer', './grammar-modules/subjunctive.js');
```

Built-in tools: `separable-verbs`, `dativ-trainer`, `cases-prepositions`, `akkusativ-prepositions`, `dativ-prepositions`.

### 5.4 Auth Provider Registry

Authentication providers are pluggable via `auth-provider-registry.js`:

```javascript
import { registerAuthProvider } from './auth/auth-provider-registry.js';

registerAuthProvider({
  id: 'my-sso',
  label: 'Log in with MySSO',
  login: () => mySSO.login(),
  logout: () => mySSO.logout(),
});
```

Default providers (FEIDE, Google) are registered automatically when Firebase is configured.

---

## 6. CLI Scaffolder

**File**: `cli/create-edu-app.js`

Scaffolds a complete project from a single command:

```bash
node cli/create-edu-app.js --name "French A1" --lang fr --chapters 8 --cefr A1
```

Generates: `papertek.config.js`, `CLAUDE.md`, `AGENTS.md`, `package.json`, content stubs for all chapters, engine files, schemas, CSS, build scripts, `.gitignore`, and an initial git commit.

Language presets: German (de), French (fr), Spanish (es), Norwegian (nb). Custom ISO codes are also supported with a minimal config that the user can customize.

---

## 7. Skills (AI Agent Interface)

Skills live in `.claude/skills/` and are invoked by AI coding agents. They are the primary way content is created.

| Skill | Input | Output |
|---|---|---|
| `/create-project` | Course name, language, chapters | Complete project scaffold |
| `/create-lesson` | Chapter, lesson number | Lesson data (dialog, goals, checklist) |
| `/create-exercises` | Curriculum, chapter, lesson | 6 exercises + 10 extra exercises |
| `/create-grammar` | Chapter | Grammar modules (7 types) |
| `/create-vocabulary` | Chapter | Word bank with translations |
| `/create-test` | Chapter, test type | Question bank |
| `/add-curriculum` | Curriculum ID | New curriculum track in existing project |
| `/audit-content` | Scope | Validation report |

Each skill reads `papertek.config.js` to adapt to the configured language and course structure.
