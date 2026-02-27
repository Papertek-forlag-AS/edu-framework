# /add-curriculum

**Purpose**: Add a new curriculum track to an existing Papertek project (e.g., add an A2 level to a project that already has A1).

**Usage**: `/add-curriculum [curriculum-id]`

**Examples**:
- `/add-curriculum german-a2` - Add a German A2 curriculum
- `/add-curriculum french-b1` - Add a French B1 curriculum

---

## When invoked, Claude must:

### 1. Read Existing Configuration

```bash
cat papertek.config.js
cat public/js/progress/curriculum-registry.js
```

Understand:
- What curricula already exist
- What language is configured
- Existing content structure

### 2. Gather Requirements

Ask the user for:
- **Curriculum ID** (e.g., "german-a2")
- **Title** (e.g., "German A2 — Intermediate")
- **CEFR level** (should be different from existing curricula)
- **Number of chapters**
- **Lessons per chapter**
- **File prefix** (for lesson HTML files)

### 3. Update papertek.config.js

Add the new curriculum to the `curricula` array:

```javascript
curricula: [
  // ... existing curriculum
  {
    id: 'german-a2',
    filePrefix: 'a2',
    folderName: 'german-a2',
    chapters: 10,
    lessonsPerChapter: 3,
    title: 'German A2 — Intermediate',
    description: 'German A2 level',
    cefrLevel: 'A2',
    contentPath: 'content/german',
  },
],
```

### 4. Update Curriculum Registry

Add entry to `public/js/progress/curriculum-registry.js`:

```javascript
'german-a2': {
    id: 'german-a2',
    filePrefix: 'a2',
    folderName: 'german-a2',
    chapters: 10,
    title: 'German A2 — Intermediate',
    description: 'German A2',
    contentPath: '../../content/german',
    languageDir: 'german',
    paths: {
        homeLink: '../../../../index.html'
    },
    languageConfig: GERMAN_LANGUAGE_CONFIG  // Reuse existing language config
},
```

### 5. Create Content Directories

```bash
mkdir -p content/{languageDir}/exercises-data/{curriculum-id}
```

### 6. Generate Content Stubs

Create empty chapter files for the new curriculum:
- `content/{languageDir}/exercises-data/{curriculum-id}/chapter-{N}.js` for each chapter
- Lesson data can be shared or separate (ask the user)

### 7. Update EXERCISE_DATABASE

Add entries to `public/js/progress/config.js` for the new curriculum's lessons.

### 8. Verify

```bash
node scripts/config-parser.js   # Validate config
```

### 9. Next Steps

Tell the user:
```
Curriculum "{curriculum-id}" has been added. Next:
  1. Use /create-lesson to build lessons
  2. Use /create-exercises to add exercises
  3. Use /create-grammar to add grammar modules
  4. The curriculum selector in the app will now show the new track
```
