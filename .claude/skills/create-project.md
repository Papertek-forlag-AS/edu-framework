# /create-project

**Purpose**: Scaffold a new Papertek Edu-Framework project from scratch.

**Usage**: `/create-project`

---

## When invoked, Claude must:

### 1. Gather Requirements

Ask the user for:
- **Course name** (e.g., "French for Beginners")
- **Target language** (ISO 639-1 code, e.g., "fr")
- **CEFR level** (A1, A2, B1, B2, C1, C2)
- **Number of chapters** (typically 6-12)
- **Lessons per chapter** (typically 2-4)
- **Output directory** (where to create the project)

### 2. Run the CLI Scaffolder

```bash
node cli/create-edu-app.js \
  --name "Course Name" \
  --lang fr \
  --chapters 8 \
  --lessons 3 \
  --cefr A1 \
  --output ./output-dir
```

If running from within a Papertek framework checkout, the CLI is at `cli/create-edu-app.js`.

### 3. Verify the Scaffolded Project

After scaffolding, verify:
```bash
cd output-dir
node --check papertek.config.js         # Syntax OK
ls content/                              # Content directory exists
ls schemas/                              # Schemas copied
ls public/js/                            # Engine copied
```

### 4. Customize Configuration

Open `papertek.config.js` and help the user customize:
- Course metadata (name, description, author)
- Language-specific settings (articles, gender system, special characters)
- Feature flags (which features to enable)

### 5. Next Steps

Tell the user:
```
Your project is ready! Next steps:
  1. cd output-dir && npm install
  2. npm run dev  (starts local server)
  3. Use /create-lesson to build your first lesson
  4. Use /create-exercises to add exercises
  5. Use /create-grammar to add grammar modules
```

---

## Supported Language Presets

The CLI includes presets for: German (de), French (fr), Spanish (es), Norwegian (nb).

For other languages, the CLI generates a minimal config that the user can customize. The key fields to fill in for a custom language:

- `articles` — definite articles by gender
- `genderSystem` — 'none', 'two', or 'three'
- `specialCharacters` — on-screen keyboard chars
- `characterNormalization` — accent folding map
- `pronouns` — personal pronoun list
- `ttsVoice` — BCP 47 language tag for text-to-speech
