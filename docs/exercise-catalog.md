# Exercise Type Catalog

This document shows all 17 exercise types supported by the Papertek Edu-Framework, with data format examples and descriptions of how each renders.

## Quick Reference

| # | Type | Key | Interaction | Best For |
|---|---|---|---|---|
| 1 | Fill-in-the-blank | `fill-in` | Text input | Grammar, vocab, sentence completion |
| 2 | Matching | `matching` | Click pairs | Vocabulary, translations |
| 3 | True/False | `true-false` | Button select | Comprehension, fact checking |
| 4 | True/False Pictures | `true-false-pictures` | Image + button | Visual comprehension |
| 5 | Quiz | `quiz` | Multiple choice | General knowledge testing |
| 6 | Writing | `writing` | Free text area | Production, creative tasks |
| 7 | Drag & Drop | `drag-drop` | Drag words | Sentence building, word order |
| 8 | Mini Dialog | `minidialoge` | Role selection | Conversation practice |
| 9 | Dilemma | `dilemma` | Dropdown select | Grammar choices in context |
| 10 | Image Matching | `image-matching` | Image-text pairs | Visual vocabulary |
| 11 | Chronology | `chronology` | Drag to reorder | Sequencing, timelines |
| 12 | Checklist | `checklist` | Checkboxes | Self-assessment |
| 13 | Flashcards | `interactive-flashcards` | Flip cards | Vocabulary review |
| 14 | Interactive Map | `interactive-map` | Click regions | Geography, spatial |
| 15 | Number Grids | `number-grids` | Grid input | Number practice |
| 16 | Color Picker | `color-picker` | Color selection | Color vocabulary |
| 17 | Verb Trainer | `embedded-verb-trainer` | Dynamic drill | Conjugation practice |

---

## 1. Fill-in-the-blank (`fill-in`)

Students type the correct word into blank fields within sentences.

**Data format:**
```javascript
{
  "id": "aufgabeA",
  "type": "fill-in",
  "title": "Exercise A: Complete the sentences",
  "badges": [{ "text": "Grammar" }],
  "description": "Fill in the correct verb form.",
  "items": [
    { "pre": "1. I", "answer": "am", "post": "a student.", "width": "w-20" },
    { "pre": "2. She", "answer": "is", "post": "a teacher.", "width": "w-20" }
  ]
}
```

**Multi-part answers** (e.g., separable verbs): Use empty `pre` to group inputs on the same line:
```javascript
{ "pre": "1. Ich", "answer": "stehe", "post": "um 7 Uhr", "width": "w-28" },
{ "pre": "", "answer": "auf", "post": ".", "width": "w-20" }
// Renders: 1. Ich [stehe] um 7 Uhr [auf].
```

**Accepts alternatives**: Use comma-separated values: `"answer": "am,is"`.

---

## 2. Matching (`matching`)

Students click items on the left to match with items on the right. Correct pairs highlight in green.

**Data format:**
```javascript
{
  "type": "matching",
  "isIconGame": false,
  "variableName": "food-matching-3-1",
  "pairs": [
    { "id": 1, "q": "bread", "a": "Brot" },
    { "id": 2, "q": "water", "a": "Wasser" },
    { "id": 3, "q": "milk", "a": "Milch" },
    { "id": 4, "q": "cheese", "a": "Käse" }
  ]
}
```

Set `"isIconGame": true` to use emoji/icon matching instead of text.

---

## 3. True/False (`true-false`)

Students evaluate statements as true or false.

**Data format:**
```javascript
{
  "type": "true-false",
  "variableName": "tf-comprehension-2-1",
  "statements": [
    { "q": "Berlin is the capital of Germany.", "a": true },
    { "q": "The Rhine flows through Paris.", "a": false }
  ]
}
```

---

## 4. True/False Pictures (`true-false-pictures`)

Like true/false, but with an image for each statement.

**Data format:**
```javascript
{
  "type": "true-false-pictures",
  "items": [
    { "image": "images/cat.jpg", "statement": "This is a dog.", "answer": false },
    { "image": "images/sun.jpg", "statement": "The sun is shining.", "answer": true }
  ]
}
```

---

## 5. Quiz (`quiz`)

Multiple-choice questions with 2-4 options.

**Data format:**
```javascript
{
  "type": "quiz",
  "questions": [
    {
      "question": "What is the correct article for 'Haus'?",
      "options": ["der", "die", "das", "den"],
      "correctIndex": 2
    }
  ]
}
```

**Structured quiz** (with categories):
```javascript
{
  "type": "quiz",
  "isStructured": true,
  "questions": [
    {
      "category": "Grammar",
      "question": "Which is correct?",
      "options": ["He go", "He goes"],
      "correctIndex": 1,
      "explanation": "'Goes' is the third-person singular form."
    }
  ]
}
```

---

## 6. Writing (`writing`)

Free-text writing area with optional template suggestions and auto-save.

**Data format:**
```javascript
{
  "type": "writing",
  "template": ["Write about your morning routine", "Include at least 5 sentences"],
  "placeholder": "Every morning I wake up at..."
}
```

---

## 7. Drag & Drop (`drag-drop`)

Students arrange scrambled words into the correct sentence order.

**Data format:**
```javascript
{
  "type": "drag-drop",
  "sentences": [
    {
      "q": "I go to school.",
      "words": ["Ich", "gehe", "in", "die", "Schule"],
      "svar": "Ich gehe in die Schule",
      "punctuation": "."
    }
  ]
}
```

---

## 8. Mini Dialog (`minidialoge`)

Students practice short dialog scenarios by selecting roles.

**Data format:**
```javascript
{
  "type": "minidialoge",
  "scenarios": {
    "at-the-bakery": {
      "title": "At the Bakery",
      "description": "Practice ordering bread.",
      "dialog": [
        { "speaker": "Customer", "text": "Guten Morgen! Ich hätte gern ein Brot." },
        { "speaker": "Baker", "text": "Natürlich! Welches Brot möchten Sie?" },
        { "speaker": "Customer", "text": "Ein Vollkornbrot, bitte." }
      ]
    }
  }
}
```

---

## 9. Dilemma (`dilemma`)

Dropdown selection within sentences — choose the correct word from options.

**Data format:**
```javascript
{
  "type": "dilemma",
  "items": [
    { "pre": "Ich möchte", "options": ["ein", "eine", "einen"], "correct": "einen", "post": "Kaffee." },
    { "pre": "Das ist", "options": ["der", "die", "das"], "correct": "die", "post": "Schule." }
  ]
}
```

---

## 10. Image Matching (`image-matching`)

Match images with their text descriptions.

**Data format:**
```javascript
{
  "type": "image-matching",
  "pairs": [
    { "id": 1, "image": "images/apple.jpg", "text": "der Apfel" },
    { "id": 2, "image": "images/bread.jpg", "text": "das Brot" }
  ]
}
```

---

## 11. Chronology (`chronology`)

Arrange items in the correct order (timeline, process, story).

**Data format:**
```javascript
{
  "type": "chronology",
  "title": "Put the daily routine in order",
  "items": [
    "Wake up",
    "Eat breakfast",
    "Go to school",
    "Come home",
    "Do homework",
    "Go to bed"
  ]
}
```

---

## 12. Checklist (`checklist`)

Self-assessment checkboxes — students check off what they can do.

**Data format:**
```javascript
{
  "type": "checklist",
  "items": [
    "I can greet someone in German",
    "I can introduce myself",
    "I can count to 20",
    "I understand basic verb conjugation"
  ]
}
```

---

## 13. Flashcards (`interactive-flashcards`)

Flip cards showing target language on front, translation on back.

**Data format:**
```javascript
{
  "type": "interactive-flashcards",
  "cards": [
    { "front": "der Hund", "back": "the dog" },
    { "front": "die Katze", "back": "the cat" },
    { "front": "das Haus", "back": "the house" }
  ]
}
```

---

## 14. Interactive Map (`interactive-map`)

Clickable regions on a map or image.

**Data format:**
```javascript
{
  "type": "interactive-map",
  "image": "images/germany-map.svg",
  "regions": [
    { "id": "berlin", "label": "Berlin", "x": 52, "y": 13, "info": "Capital of Germany" },
    { "id": "munich", "label": "München", "x": 48, "y": 11, "info": "Capital of Bavaria" }
  ]
}
```

---

## 15. Number Grids (`number-grids`)

Grid-based number practice (counting, arithmetic).

**Data format:**
```javascript
{
  "type": "number-grids",
  "gridSize": 10,
  "tasks": [
    { "prompt": "Write the number: zwölf", "answer": 12 },
    { "prompt": "Write the number: dreißig", "answer": 30 }
  ]
}
```

---

## 16. Color Picker (`color-picker`)

Color identification and vocabulary practice.

**Data format:**
```javascript
{
  "type": "color-picker",
  "items": [
    { "color": "#FF0000", "name": "rot", "translation": "red" },
    { "color": "#0000FF", "name": "blau", "translation": "blue" },
    { "color": "#008000", "name": "grün", "translation": "green" }
  ]
}
```

---

## 17. Verb Trainer (`embedded-verb-trainer`)

Dynamic conjugation drills that pull verbs from the verbbank.

**Data format:**
```javascript
{
  "type": "embedded-verb-trainer",
  "config": {
    "chapters": [1, 2, 3],
    "strongOnly": false,
    "questionCount": 10,
    "timed": false
  }
}
```

The verb trainer automatically loads conjugation data from the vocabulary system and generates random drill questions. Set `strongOnly: true` to focus on irregular verbs.

---

## Schema Reference

All exercise data must conform to `schemas/exercise.schema.json`. Run `npm run validate:schemas` to check your content.
