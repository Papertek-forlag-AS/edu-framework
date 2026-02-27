# German A1 — Example Course

A minimal but complete example showing how to build a German language course with the Papertek Edu-Framework.

This example includes 2 chapters with 2 lessons each, demonstrating all the key content types: lessons, exercises, and grammar modules.

## Structure

```
german-a1/
  papertek.config.js            Course configuration
  content/german/
    lessons-data/
      chapter-1.js              Lesson dialog, goals, checklist
      chapter-2.js
    exercises-data/german-a1/
      chapter-1.js              6 exercises + 10 extra per lesson
      chapter-2.js
    grammar-data/
      chapter-1.js              Grammar modules (tables, examples, tips)
      chapter-2.js
```

## How to Use This Example

1. Study the data files to understand the content format
2. Compare against `schemas/` to see how content validates
3. Use this as a reference when building your own course with `/create-lesson`, `/create-exercises`, and `/create-grammar`

## Topics Covered

- **Chapter 1**: Greetings, introductions, "Ich bin...", present tense of "sein"
- **Chapter 2**: Family, numbers 1-20, possessive pronouns (mein/dein)
