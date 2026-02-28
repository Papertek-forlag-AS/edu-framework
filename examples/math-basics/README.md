# Math Basics — Non-Language Example

This example demonstrates that Papertek Framework for Education is **not limited to language courses**. It can be used for any subject that benefits from structured lessons, exercises, and progress tracking.

This mini-course teaches basic algebra concepts to middle school students, using Norwegian as the UI language.

## Structure

```
math-basics/
  papertek.config.js              Course configuration (no gender, no TTS)
  content/math/
    lessons-data/
      chapter-1.js                Lesson content (explanations, examples, goals)
    exercises-data/math-basics/
      chapter-1.js                Exercises (fill-in, quiz, drag-drop, etc.)
```

## Key Differences from Language Courses

| Feature | Language Course | Math Course |
|---------|---------------|-------------|
| Gender system | Enabled (der/die/das) | Disabled |
| TTS | Enabled (de-DE) | Disabled |
| Special characters | ä ö ü ß | None |
| Vocabulary trainer | Enabled | Disabled |
| Grammar modules | Enabled | Disabled |
| Exercise types used | All 17 | fill-in, quiz, drag-drop, true-false, writing |

## Topics Covered

- **Chapter 1**: Introduction to variables and simple equations (x + 3 = 7, solve for x)
