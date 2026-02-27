# /create-vocabulary

**Purpose**: Build vocabulary banks for a chapter, including word entries with translations, audio references, and grammar annotations.

**Usage**: `/create-vocabulary [chapter]`

**Examples**:
- `/create-vocabulary 3` - Create vocabulary bank for chapter 3
- `/create-vocabulary 5` - Create vocabulary bank for chapter 5

---

## When invoked, Claude must:

### 1. Read Configuration

```bash
cat papertek.config.js
```

Determine:
- **Target language code** and **UI language code**
- **Vocabulary API** endpoint (if configured)
- **Content path** for vocabulary files

### 2. Analyze Context

- Read lesson data for the target chapter to extract vocabulary from dialog
- Read exercise data to find words used in exercises
- Read previous chapter vocabulary to avoid duplicates
- Check the vocabulary schema: `schemas/vocabulary.schema.json`

### 3. Vocabulary Entry Format

Each word entry follows the Papertek vocabulary schema:

```javascript
{
  "id": "word_type",           // e.g., "essen_verb", "haus_noun", "gross_adj"
  "lemma": "word",             // Dictionary form
  "type": "noun|verb|adjective|adverb|preposition|conjunction|pronoun|other",
  "translations": {
    "nb": "Norwegian translation",
    "en": "English translation"
  },
  // For nouns:
  "genus": "m|f|n",           // Grammatical gender
  "plural": "plural form",
  // For verbs:
  "conjugations": {
    "presens": {
      "former": {
        "ich": "form1",
        "du": "form2"
        // ... all pronouns from config
      }
    }
  },
  "isStrong": false,           // Irregular verb flag
  // Metadata:
  "chapter": 3,
  "lesson": "3-1",
  "frequency": "A1|A2|B1",    // CEFR frequency level
  "tags": ["food", "daily"]    // Thematic tags
}
```

### 4. Word Selection Guidelines

For each chapter, aim for:

| CEFR Level | New Words | Recommended Mix |
|---|---|---|
| A1 | 30-50 | 40% nouns, 25% verbs, 15% adjectives, 20% other |
| A2 | 40-60 | 35% nouns, 30% verbs, 15% adjectives, 20% other |
| B1 | 50-80 | 30% nouns, 30% verbs, 20% adjectives, 20% other |

### 5. Quality Checklist

- [ ] All translations are accurate
- [ ] Gender annotations are correct for nouns
- [ ] Verb conjugations are complete and accurate
- [ ] No duplicate entries within the chapter
- [ ] No duplicates with previous chapters (check IDs)
- [ ] Word IDs follow convention: `{stem}_{type}`
- [ ] Frequency/CEFR tags are appropriate
- [ ] Thematic tags help with categorization

### 6. Integration with Vocabulary API

If the project uses the Papertek Vocabulary API:
- Words can be fetched at build time: `npm run fetch:vocabulary`
- The vocabulary bank supplements API data with lesson-specific words
- Use the API as source of truth for conjugations and translations where possible

### 7. Output

Write to `content/{languageDir}/vocabulary/chapter-{N}.js`:

```javascript
/**
 * Chapter {N} — Vocabulary Bank
 * @see schemas/vocabulary.schema.json
 */
export const vocabularyData = {
  "chapter": N,
  "words": [
    // ... word entries
  ]
};
```
