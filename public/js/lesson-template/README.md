# Lesson Template System

## Overview

This system generates lesson HTML files from a template and metadata, eliminating 85-95% duplication across lesson files.

## Architecture

```
lesson-template/
├── README.md                    (this file)
├── lessons-metadata.js          (lesson-specific metadata)
├── template.html                (HTML template structure)
└── template-generator.js        (Node.js script to generate files)
```

## How It Works

### 1. **Template** (`template.html`)
Contains the common HTML structure with placeholders:
- Head section (meta tags, stylesheets)
- Body structure with tabs
- Scripts section
- Placeholders: `{{TITLE}}`, `{{CHAPTER_ID}}`, `{{CURRICULUM_PREFIX}}`, etc.

### 2. **Metadata** (`lessons-metadata.js`)
Stores lesson-specific data:
```javascript
{
  "1-1": {
    title: "Hallo! Wie heißt du?",
    hasExtraExercises: false,
    hasDialog: false,
    nextLesson: "1-2"
  }
}
```

### 3. **Generator** (`template-generator.js`)
Node.js script that:
- Reads template.html
- Reads lessons-metadata.js
- Replaces placeholders with lesson-specific data
- Writes generated HTML files (e.g., `vg1-1-1.html`, `us-1-1.html`)

## Benefits

✅ **DRY Principle**: Change template once, regenerate all files
✅ **Consistency**: All lessons have identical structure
✅ **Easy Updates**: Modify template, run script, done
✅ **Unique Content Preserved**: Content loaders still inject lesson-specific data
✅ **No Runtime Overhead**: Generates static HTML files

## Unique Content Still Works

The template only generates **boilerplate HTML structure**. All unique content continues to work through existing content loaders:

| Content Type | Where It Lives | How It Loads |
|--------------|----------------|--------------|
| Dialog | `lessons-data.js` | `lessons-content-loader.js` |
| Learning goals | `lessons-data.js` | `lessons-content-loader.js` |
| Checklist | `lessons-data.js` | `lessons-content-loader.js` |
| Exercises | `chapter-X.js` | `exercises-content-loader.js` |
| Grammar | `chapter-X.js` | `grammar-content-loader.js` |
| Flashcards | `wordbank.js`, `verbbank.js` | `interactive-flashcards.js` |
| Teacher content | `chapter-X.js` | `teacher-content-loader.js` |

**Example**: Lesson 1.1's unique flashcard vocabulary
- Template creates: `<div id="flashcard-container"></div>`
- `interactive-flashcards.js` reads: `wordBank.filter(ord => ord.intro === "1.1")`
- Result: Lesson 1.1 gets its unique vocabulary

## Usage

### Generate Files for a Specific Curriculum

```bash
# Generate VG1 files (chapters 1-12)
node public/js/lesson-template/template-generator.js vg1

# Generate Ungdomsskole files (chapters 1-8)
node public/js/lesson-template/template-generator.js us
```

### Generate All Files

```bash
node public/js/lesson-template/template-generator.js all
```

### Add a New Lesson

1. Add metadata to `lessons-metadata.js`:
   ```javascript
   "13-1": {
     title: "New Lesson Title",
     hasExtraExercises: true,
     hasDialog: false,
     nextLesson: "13-2"
   }
   ```

2. Run generator:
   ```bash
   node public/js/lesson-template/template-generator.js vg1
   ```

3. Add lesson content to data files:
   - Dialog: `js/lessons-data.js`
   - Exercises: `js/exercises-data/chapter-13.js`
   - Vocabulary: `js/wordbanks/wordbank.js`

### Modify Template Structure

1. Edit `template.html`
2. Run generator to update all files:
   ```bash
   node public/js/lesson-template/template-generator.js all
   ```

## Future Enhancements

- [ ] CLI with better options (`--lesson=1-1`, `--curriculum=vg1`)
- [ ] Automatic detection of extra exercises from EXERCISE_DATABASE
- [ ] Automatic detection of dialog content from chapter data files
- [ ] Git pre-commit hook to regenerate files if metadata changed
- [ ] Validation: Check all placeholders are replaced
