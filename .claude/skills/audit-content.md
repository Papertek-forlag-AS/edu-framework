# /audit-content

**Purpose**: Validate all content files against schemas, check for consistency issues, missing content, and quality problems.

**Usage**: `/audit-content [scope]`

**Scope options**: `all` (default), `exercises`, `lessons`, `grammar`, `vocabulary`, `config`

**Examples**:
- `/audit-content` - Full audit of all content
- `/audit-content exercises` - Audit only exercise data
- `/audit-content lessons` - Audit only lesson data

---

## When invoked, Claude must:

### 1. Read Configuration

```bash
cat papertek.config.js
```

Determine:
- All configured curricula
- Content paths
- Expected chapter/lesson counts

### 2. Run Schema Validation

```bash
npm run validate:schemas
npm run validate:config
```

Report any schema violations.

### 3. Content Completeness Check

For each curriculum, check:

#### Lessons
- [ ] Every chapter has a lesson data file
- [ ] Every lesson ID (`{chapter}-{lesson}`) exists for the expected range
- [ ] All lessons have: title, goals (3+), dialog (5+ exchanges)
- [ ] No empty dialogs or placeholder content

#### Exercises
- [ ] Every lesson has an exercise data file
- [ ] Each lesson has the expected number of regular exercises (6)
- [ ] Each lesson has the expected number of extra exercises (10)
- [ ] Exercise IDs follow naming convention
- [ ] No duplicate exercise IDs within a chapter
- [ ] Exercise types are varied (no 3+ consecutive same type)

#### Grammar
- [ ] Every chapter that introduces new grammar has a grammar file
- [ ] Grammar modules use correct type keys
- [ ] Bilingual content uses correct data keys

#### Vocabulary
- [ ] Vocabulary word IDs follow convention (`{stem}_{type}`)
- [ ] No duplicate word IDs across chapters
- [ ] Gender annotations present for all nouns

### 4. EXERCISE_DATABASE Sync Check

Verify that `public/js/progress/config.js` matches actual content:

```javascript
// For each lesson in EXERCISE_DATABASE:
// - Check ovelser count matches exercises.length
// - Check ekstraovelser count matches extraExercises.length
// - Check tests array is valid
```

Report any mismatches.

### 5. Cross-Reference Check

- [ ] Vocabulary used in exercises exists in wordbanks
- [ ] Verbs referenced in verb tables exist in verbbank
- [ ] Grammar topics match lesson goals
- [ ] Test questions don't reference future content

### 6. Quality Checks

- [ ] No TODO/placeholder text in content files
- [ ] No empty arrays where content is expected
- [ ] All translations are non-empty
- [ ] Fill-in answers have reasonable alternatives
- [ ] Matching pairs have at least 4 items
- [ ] Dialog has both speakers contributing

### 7. Output Report

Generate a structured report:

```
=== Content Audit Report ===
Date: YYYY-MM-DD
Curriculum: {id}

SCHEMA VALIDATION
  ✅ Config valid
  ✅ Exercise schemas pass
  ❌ Grammar schema: chapter-5.js missing "type" field

COMPLETENESS
  Lessons: 24/24 complete
  Exercises: 22/24 (missing: 7-2, 8-3)
  Grammar: 8/8 complete
  Vocabulary: 6/8 (missing: ch7, ch8)

CONFIG SYNC
  ✅ EXERCISE_DATABASE matches content (22 lessons)
  ❌ Mismatch: 5-2 has 5 exercises, config says 6

QUALITY
  ⚠️ chapter-3.js: 3 exercises of same type (fill-in) in a row
  ⚠️ chapter-6.js: extra exercise badges missing source lesson

SUMMARY
  Errors: 2
  Warnings: 2
  OK: 46 checks passed
```

### 8. Auto-Fix Suggestions

For each issue found, suggest the fix:
- Missing files → Run `/create-exercises`, `/create-lesson`, etc.
- Config mismatches → Update `EXERCISE_DATABASE` with correct counts
- Schema violations → Show the specific fix needed
- Quality issues → Suggest improvements
