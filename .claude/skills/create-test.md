# /create-test

**Purpose**: Build question banks for chapter tests and cumulative tests.

**Usage**: `/create-test [chapter] [type]`

**Type options**: `leksjon` (lesson test), `kapittel` (chapter test), `kumulativ` (cumulative)

**Examples**:
- `/create-test 3 leksjon` - Create a lesson test for chapter 3
- `/create-test 4 kapittel` - Create a chapter test covering chapter 4
- `/create-test 4 kumulativ` - Create a cumulative test for chapters 1-4

---

## When invoked, Claude must:

### 1. Read Configuration

```bash
cat papertek.config.js
cat schemas/question-bank.schema.json
```

### 2. Analyze Context

- Read lesson and exercise data for the target chapter(s)
- Read vocabulary data to draw questions from
- Understand what grammar has been covered
- For cumulative tests, review all chapters up to the target

### 3. Question Bank Format

```javascript
/**
 * Chapter {N} — Question Bank
 * @see schemas/question-bank.schema.json
 */
export const sporsmalsBank = [
  {
    "id": "q-{chapter}-{number}",
    "type": "fill-in|drag-drop|multiple-choice",
    "difficulty": "easy|medium|hard",
    "chapter": N,
    "topic": "grammar|vocabulary|comprehension",
    "question": "Question text or prompt",
    // Type-specific fields below
  }
];
```

### 4. Question Types

#### Fill-in
```javascript
{
  "type": "fill-in",
  "question": "Complete: Ich ___ Deutsch.",
  "answer": "spreche",
  "alternatives": ["lerne"],  // Also accepted
  "hint": "Present tense of sprechen"
}
```

#### Drag-drop
```javascript
{
  "type": "drag-drop",
  "question": "Build the sentence:",
  "words": ["Ich", "gehe", "in", "die", "Schule"],
  "correctOrder": "Ich gehe in die Schule",
  "punctuation": "."
}
```

#### Multiple-choice
```javascript
{
  "type": "multiple-choice",
  "question": "What is the correct article for 'Haus'?",
  "options": ["der", "die", "das", "den"],
  "correctIndex": 2,
  "explanation": "'Haus' is neuter (das Haus)"
}
```

### 5. Test Composition Guidelines

| Test Type | Questions | Difficulty Mix | Scope |
|---|---|---|---|
| Lesson (`leksjon`) | 10-15 | 50% easy, 35% medium, 15% hard | Current lesson only |
| Chapter (`kapittel`) | 20-25 | 40% easy, 40% medium, 20% hard | All lessons in chapter |
| Cumulative (`kumulativ`) | 30-40 | 30% easy, 40% medium, 30% hard | All chapters up to target |

### 6. Topic Distribution

Each test should cover:
- **30-40% vocabulary** — word meanings, translations, gender
- **30-40% grammar** — verb forms, sentence structure, rules
- **20-30% comprehension** — understanding sentences and situations

### 7. Quality Checklist

- [ ] Question IDs are unique
- [ ] All questions have correct answers
- [ ] Alternatives are reasonable (accept common correct variants)
- [ ] Difficulty ratings are accurate
- [ ] Topic distribution is balanced
- [ ] No questions test content from future chapters
- [ ] Explanations help the student learn from mistakes
- [ ] Drag-drop word order is unambiguous

### 8. Output

Write to `content/{languageDir}/question-bank/chapter-{N}-{type}.js`:

```javascript
export const sporsmalsBank = [
  // ... questions
];
```
