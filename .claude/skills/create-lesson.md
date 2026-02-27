# /create-lesson

**Purpose**: Generate complete lesson data (dialog, goals, vocabulary) for a chapter lesson.

**Usage**: `/create-lesson [chapter] [lesson]`

**Examples**:
- `/create-lesson 3 1` - Create lesson data for chapter 3, lesson 1
- `/create-lesson 5 2` - Create lesson data for chapter 5, lesson 2

---

## When invoked, Claude must:

### 1. Read Configuration

```bash
cat papertek.config.js
```

Determine:
- **Target language** and its properties
- **Content path**: `content/{languageDir}/lessons-data/chapter-{N}.js`
- **CEFR level** for appropriate difficulty
- **Chapter/lesson count** for context

### 2. Analyze Context

- Read existing lessons in the same chapter
- Read previous chapter lessons to understand progression
- Check what grammar has been introduced (from grammar data if available)
- Check vocabulary scope (from wordbanks or vocabulary API manifests)

### 3. Generate Lesson Data

The lesson data file exports a `lessonsData` object:

```javascript
/**
 * Chapter {N} — Lesson Data
 * @see schemas/lesson.schema.json
 */
export const lessonsData = {
  "{chapter}-{lesson}": {
    "title": "Lesson title (in target language)",
    "subtitle": "Descriptive subtitle (in UI language)",
    "goals": [
      "Learning goal 1 (in UI language)",
      "Learning goal 2",
      "Learning goal 3"
    ],
    "dialog": [
      {
        "speaker": "Character Name",
        "text": "Utterance in target language",
        "translation": "Translation in UI language"
      }
    ],
    "checklist": [
      "I can do X (self-assessment item)",
      "I understand Y",
      "I can use Z in conversation"
    ],
    "vocabulary": [
      "Key vocabulary word or phrase 1",
      "Key vocabulary word or phrase 2"
    ]
  }
};
```

### 4. Dialog Guidelines

The dialog is the centerpiece of each lesson. Follow these principles:

- **2-4 characters** in the dialog (give them names from the target culture)
- **10-20 exchanges** per dialog (enough context, not overwhelming)
- **Progressive complexity**: start simple, build to more complex sentences
- **Natural conversation**: make it feel like a real situation
- **Introduce new vocabulary** naturally within the dialog
- **Grammar in context**: new grammar structures should appear in dialog
- **Cultural context**: include culturally relevant situations

### 5. CEFR Level Guidelines

| Level | Vocabulary | Grammar | Dialog Complexity |
|---|---|---|---|
| A1 | ~100 words/chapter | Present tense, basic sentences | Simple exchanges, concrete topics |
| A2 | ~150 words/chapter | Past tense, modal verbs | Short narratives, daily situations |
| B1 | ~200 words/chapter | Complex tenses, subjunctive | Extended discussions, opinions |
| B2 | ~250 words/chapter | All tenses, passive voice | Abstract topics, argumentation |

### 6. Goals Guidelines

Each lesson should have 3-5 learning goals:
- **At least 1 communication goal** ("I can introduce myself")
- **At least 1 grammar goal** ("I understand present tense verb endings")
- **At least 1 vocabulary goal** ("I know 10 new words about food")

### 7. Quality Checklist

- [ ] Dialog is natural and contextually appropriate
- [ ] All target language text is grammatically correct
- [ ] Translations are accurate
- [ ] New vocabulary is introduced in context
- [ ] Goals are specific and measurable
- [ ] Checklist items match the goals
- [ ] Difficulty matches the CEFR level
- [ ] Character names are culturally appropriate

### 8. Output

Write the complete `chapter-{N}.js` file, or if the file exists, add/update the specific lesson entry. Always export as `lessonsData`.
