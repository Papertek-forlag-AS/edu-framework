# /create-grammar

**Purpose**: Generate grammar modules for a chapter — explanations, tables, examples, and interactive tools.

**Usage**: `/create-grammar [chapter]`

**Examples**:
- `/create-grammar 3` - Create grammar modules for chapter 3
- `/create-grammar 7` - Create grammar modules for chapter 7

---

## When invoked, Claude must:

### 1. Read Configuration

```bash
cat papertek.config.js
cat schemas/grammar.schema.json
```

Determine:
- **Target language** and grammar features (gender system, case system, verb config)
- **Content path**: `content/{languageDir}/grammar-data/chapter-{N}.js`
- **CEFR level** for appropriate complexity

### 2. Analyze Context

- Read lesson data for the chapter to understand what grammar is taught
- Read previous chapter grammar to understand progression
- Check what grammar tools are registered (verb trainer, gender trainer, etc.)

### 3. Grammar Module Types

The grammar renderer supports 7 module types:

| Type | Key | Purpose |
|---|---|---|
| Title | `tittel` | Section heading |
| Explanation | `forklaring` | Text paragraph explaining a concept |
| List | `liste` | Bulleted list of rules or examples |
| Pronoun Grid | `pronomen-grid` | Pronoun/case table |
| Verb Table | `verbtabell` | Verb conjugation display |
| Rule Table | `regel-tabell` | Grammar rule with structured rows |
| Info Box | `infoboks` | Highlighted tip, warning, or memory aid |
| Example | `eksempel` | Side-by-side example sentences |
| Custom Tool | `custom-tool` | Interactive grammar exercise |

### 4. Module Data Format

```javascript
export const grammarModules = {
  "{chapter}": [
    // Title
    { "type": "tittel", "tekst": "Grammar Topic Name", "nivå": 2 },

    // Explanation
    { "type": "forklaring", "tekst": "Clear explanation of the grammar point." },

    // Rule table
    {
      "type": "regel-tabell",
      "overskrifter": ["Rule", "Example", "Translation"],
      "rader": [
        ["Rule 1", "<strong>example</strong>", "meaning"],
        ["Rule 2", "<strong>example</strong>", "meaning"]
      ]
    },

    // Example sentences (2-column layout)
    {
      "type": "eksempel",
      "tittel": "Examples",
      "setninger": [
        { "tysk": "Target language sentence", "norsk": "Translation" },
        { "tysk": "Another sentence", "norsk": "Translation" }
      ]
    },

    // Info box
    {
      "type": "infoboks",
      "boksType": "husk",    // husk | tips | nb | info | advarsel | grammarekspert
      "tittel": "Remember!",
      "innhold": "Important point to remember."
    },

    // Verb table (renders from verbbank data)
    { "type": "verbtabell", "verb": "spielen" },

    // Pronoun grid
    {
      "type": "pronomen-grid",
      "kolonner": 3,
      "items": [
        { "tysk": "ich", "norsk": "jeg" },
        { "tysk": "du", "norsk": "du" }
      ]
    },

    // Custom interactive tool
    {
      "type": "custom-tool",
      "toolId": "embedded-verb-trainer",
      "config": { "chapters": [1, 2, 3] }
    }
  ]
};
```

### 5. Info Box Types

| Type | Use | Color |
|---|---|---|
| `husk` | "Remember!" memory aids | Primary (blue) |
| `tips` | Helpful tips and shortcuts | Success (green) |
| `nb` | "Note:" important exceptions | Error (red) |
| `info` | General information | Info (blue) |
| `advarsel` | Warnings about common mistakes | Error (red) |
| `grammarekspert` | Advanced grammar notes | Accent (purple) |

### 6. Grammar Progression Guidelines

Structure each chapter's grammar as:
1. **Title** — name the grammar topic
2. **Explanation** — introduce the concept simply
3. **Rule table or list** — show the pattern/rules
4. **Examples** — demonstrate in context (from the lesson dialog)
5. **Info box** — highlight exceptions or memory aids
6. **More examples** — additional practice sentences
7. **Interactive tool** (optional) — verb trainer, gender trainer, etc.

### 7. Data Keys

Grammar modules use the language config's `dataKeys` for bilingual content:
- `targetKey` (e.g., `tysk`, `spansk`, `fransk`) — target language text
- `nativeKey` (e.g., `norsk`) — UI language translation

For framework compatibility, also support generic keys: `target` and `native`.

### 8. Quality Checklist

- [ ] All grammar explanations are accurate
- [ ] Examples demonstrate the grammar point clearly
- [ ] Bilingual text uses correct data keys
- [ ] Module types are varied (not all explanations)
- [ ] Info boxes highlight genuinely important points
- [ ] Progression is logical (simple to complex)
- [ ] Interactive tools reference valid chapter ranges

### 9. Output

Write to `content/{languageDir}/grammar-data/chapter-{N}.js`:

```javascript
/**
 * Chapter {N} — Grammar Modules
 * @see schemas/grammar.schema.json
 */
export const grammarModules = {
  "{chapter}": [
    // ... modules
  ]
};
```
