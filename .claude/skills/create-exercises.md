# /create-exercises

**Purpose**: Generate exercises and extra exercises for a lesson, language-agnostic, using the Papertek — Framework for Education exercise schema.

**Usage**: `/create-exercises [curriculum-id] [chapter] [lesson]`

**Examples**:
- `/create-exercises german-a1 3 2` - Create exercises for German A1, chapter 3, lesson 2
- `/create-exercises french-b1 5 1` - Create exercises for French B1, chapter 5, lesson 1

---

## When invoked, Claude must:

### 1. Read Configuration

```bash
# Read the project config
cat papertek.config.js

# Read the curriculum registry (if it exists)
cat public/js/progress/curriculum-registry.js
```

From the config, determine:
- **Target language** (code, name, special characters)
- **Curriculum ID** and content path
- **Content directory**: `content/{languageDir}/exercises-data/{curriculum}/chapter-{N}.js`

### 2. Analyze Context

- Read the target chapter file: `content/{languageDir}/exercises-data/{curriculum}/chapter-{chapter}.js`
- Read 2-3 previous chapter files to understand what exercises already exist
- Read the lesson data: `content/{languageDir}/lessons-data/chapter-{chapter}.js` for dialog, goals, vocabulary
- If grammar data exists: `content/{languageDir}/grammar-data/chapter-{chapter}.js`
- Check the exercise schema: `schemas/exercise.schema.json`

### 3. Ensure Variety - Exercise Types

Available exercise types (rotate through these, don't repeat same type consecutively):

| Type | Key | Best For |
|---|---|---|
| Fill-in-the-blank | `fill-in` | Grammar, vocab, sentence completion |
| Matching | `matching` | Vocab pairs, translations |
| Drag & Drop | `drag-drop` | Sentence building, word order |
| True/False | `true-false` | Comprehension, fact checking |
| Writing | `writing` | Free-form production |
| Quiz | `quiz` | Multiple choice |
| Dilemma | `dilemma` | Dropdown selection |
| Chronology | `chronology` | Ordering events/sentences |
| Mini Dialog | `minidialoge` | Conversation practice |
| Flashcards | `interactive-flashcards` | Vocabulary review |
| Verb Trainer | `embedded-verb-trainer` | Conjugation drills |
| Gender Trainer | `embedded-gender-trainer` | Noun gender practice |

### 4. Content Variety Check

Before creating exercises, scan previous lessons to avoid:
- Same vocabulary words in matching exercises
- Same sentences in drag-drop exercises
- Same verb conjugation patterns
- Same fill-in sentence structures
- Identical exercise type progressions

---

## 5. Regular Exercises Structure

```javascript
"exercises": [
  {
    "id": "aufgabeA",  // Use aufgabeA through aufgabeF
    "type": "fill-in",
    "title": "Exercise A: [Descriptive title]",
    "badges": [],
    "description": "[Instructions for the student]",
    "items": [...]  // Type-specific content
  }
]
```

**Create exactly 6 exercises** (unless config specifies otherwise):
1. **Exercise A**: Introduction (matching or fill-in with new vocab/grammar)
2. **Exercise B**: Application (different type from A)
3. **Exercise C**: Practice (yet another type)
4. **Exercise D**: Production (writing or complex application)
5. **Exercise E**: Reinforcement (varies by topic)
6. **Exercise F**: Synthesis (combines multiple skills)

---

## 6. Extra Exercises Structure

```javascript
"extraExercises": [
  {
    "id": "extra-exercise-1-{chapter}-{lesson}",
    "type": "fill-in",
    "title": "Extra Exercise 1: [Title]",
    "badges": [
      { "type": "repetition", "text": "Review" },
      { "type": "lesson", "text": "Ch X.Y" }
    ],
    "description": "[Instructions]",
    "items": [...]
  }
]
```

**Create exactly 10 extra exercises**:
- **Extra 1-6**: Review — content from earlier chapters (vary sources)
- **Extra 7-10**: Strengthening — deeper practice of current lesson

---

## 7. Quality Checklist

Before outputting exercises, verify:
- [ ] Exercise IDs are unique and follow naming convention
- [ ] All target language text is grammatically correct
- [ ] Instructions are clear in the UI language
- [ ] Fill-in answers handle common alternatives (comma-separated)
- [ ] Matching pairs have unique IDs
- [ ] Drag-drop sentences are grammatically sound
- [ ] Badge types are correct (repetition vs strengthening)
- [ ] Source lessons in badges are accurate
- [ ] Exercise types are varied (no consecutive same type)

---

## 8. Post-Creation Steps

After creating exercises:

### Step 1: Update EXERCISE_DATABASE
Edit `public/js/progress/config.js`:
```javascript
'{chapter}-{lesson}': { exercises: 6, extraExercises: 10, tests: ['lesson'] }
```

### Step 2: Copy to Equivalent Curricula (if applicable)
Check the curriculum registry for shared content mappings.

### Step 3: Verify Exercise Counts
```bash
node -e "
  const m = await import('./content/{languageDir}/exercises-data/{curriculum}/chapter-{N}.js');
  const d = m.exercisesData['{chapter}-{lesson}'];
  console.log('Exercises:', d.exercises.length, 'ExtraExercises:', d.extraExercises.length);
"
```

---

## 9. Exercise Type Reference

### fill-in
```javascript
{
  "type": "fill-in",
  "items": [
    { "pre": "Text before", "answer": "correct", "post": "text after", "width": "w-24" }
  ]
}
```
For multi-part answers on same line (e.g., separable verbs), use empty `pre`:
```javascript
{ "pre": "1. Subject", "answer": "verb", "post": "middle", "width": "w-24" },
{ "pre": "", "answer": "particle", "post": ".", "width": "w-20" }
```

### matching
```javascript
{
  "type": "matching",
  "isIconGame": false,
  "variableName": "unique-name",
  "pairs": [
    { "id": 1, "q": "Target language", "a": "Native language" }
  ]
}
```

### drag-drop
```javascript
{
  "type": "drag-drop",
  "sentences": [
    { "q": "Translation hint", "words": ["Word", "order"], "svar": "Word order", "punctuation": "." }
  ]
}
```

### true-false
```javascript
{
  "type": "true-false",
  "variableName": "unique-name",
  "statements": [
    { "q": "Statement in target language", "a": true }
  ]
}
```

### writing
```javascript
{
  "type": "writing",
  "template": ["Suggestion 1", "Suggestion 2"],
  "placeholder": "Example text..."
}
```

### quiz
```javascript
{
  "type": "quiz",
  "questions": [
    { "question": "Question text", "options": ["A", "B", "C", "D"], "correctIndex": 0 }
  ]
}
```

### dilemma
```javascript
{
  "type": "dilemma",
  "items": [
    { "pre": "Text", "options": ["a", "b"], "correct": "a", "post": "more text" }
  ]
}
```

### chronology
```javascript
{
  "type": "chronology",
  "items": ["First sentence", "Second sentence", "Third sentence"]
}
```

### minidialoge
```javascript
{
  "type": "minidialoge",
  "scenarios": {
    "scenario-id": {
      "title": "Scenario Title",
      "description": "Short description",
      "dialog": [
        { "speaker": "Person 1", "text": "Utterance" },
        { "speaker": "Person 2", "text": "Response" }
      ]
    }
  }
}
```

### embedded-verb-trainer
```javascript
{
  "type": "embedded-verb-trainer",
  "config": {
    "chapters": [1, 2, 3],
    "strongOnly": true
  }
}
```

### embedded-gender-trainer
```javascript
{
  "type": "embedded-gender-trainer",
  "config": {
    "chapters": [1, 2],
    "questionCount": 10
  }
}
```
