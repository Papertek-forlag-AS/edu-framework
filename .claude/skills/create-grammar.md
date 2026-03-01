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
| Heading | `heading` | Section heading |
| Explanation | `explanation` | Text paragraph explaining a concept |
| List | `list` | Bulleted list of rules or examples |
| Pronoun Grid | `pronoun-grid` | Pronoun/case table |
| Verb Table | `verb-table` | Verb conjugation display |
| Rule Table | `rule-table` | Grammar rule with structured rows |
| Info Box | `info-box` | Highlighted tip, warning, or memory aid |
| Example | `example` | Side-by-side example sentences |
| Custom Tool | `custom-tool` | Interactive grammar exercise |

### 4. Module Data Format

```javascript
export const grammarModules = {
  "{chapter}": [
    // Heading
    { "type": "heading", "text": "Grammar Topic Name", "level": 2 },

    // Explanation
    { "type": "explanation", "text": "Clear explanation of the grammar point." },

    // Rule table
    {
      "type": "rule-table",
      "headers": ["Rule", "Example", "Translation"],
      "rows": [
        ["Rule 1", "<strong>example</strong>", "meaning"],
        ["Rule 2", "<strong>example</strong>", "meaning"]
      ]
    },

    // Example sentences (2-column layout)
    {
      "type": "example",
      "title": "Examples",
      "sentences": [
        { "target": "Target language sentence", "native": "Translation" },
        { "target": "Another sentence", "native": "Translation" }
      ]
    },

    // Info box
    {
      "type": "info-box",
      "boxType": "remember",    // remember | tip | note | info | warning | expert
      "title": "Remember!",
      "content": "Important point to remember."
    },

    // Verb table (renders from verbbank data)
    { "type": "verb-table", "verb": "spielen" },

    // Pronoun grid
    {
      "type": "pronoun-grid",
      "columns": 3,
      "items": [
        { "target": "ich", "native": "jeg" },
        { "target": "du", "native": "du" }
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
| `remember` | "Remember!" memory aids | Primary (blue) |
| `tip` | Helpful tips and shortcuts | Success (green) |
| `note` | "Note:" important exceptions | Error (red) |
| `info` | General information | Info (blue) |
| `warning` | Warnings about common mistakes | Error (red) |
| `expert` | Advanced grammar notes | Accent (purple) |

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
