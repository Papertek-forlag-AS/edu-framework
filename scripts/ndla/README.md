# NDLA Content Pipeline

Fetches educational content from [NDLA](https://ndla.no) (Nasjonal digital læringsarena) and transforms it into Papertek content files.

## How It Works

```
NDLA API → fetch → parse HTML → transform → generate exercises → write files
```

1. **Fetch** — Downloads articles from NDLA's public API, caches locally
2. **Parse** — Extracts sections, headings, paragraphs, and term definitions from HTML
3. **Transform** — Converts to Papertek lesson format (teacher/student dialog, goals, checklist)
4. **Generate** — Auto-creates exercises from extracted terms (matching, fill-in, quiz, flashcards)
5. **Write** — Outputs standard Papertek content files with CC-BY-SA attribution

## Usage

```bash
# Default: fetch Naturfag VG1 content
node scripts/fetch-ndla.js

# Custom config and output
node scripts/fetch-ndla.js --config scripts/ndla/my-subject.json --output examples/my-subject
```

## Article Mapping Config

Create a JSON file that maps NDLA article IDs to chapters and lessons:

```json
{
  "subject": "Naturfag VG1",
  "chapters": [
    {
      "chapter": 1,
      "title": "Chapter Title",
      "lessons": [
        {
          "lesson": 1,
          "articleId": 6454,
          "title": "Lesson Title",
          "sections": ["Section Heading 1", "Section Heading 2"]
        }
      ]
    }
  ]
}
```

- `articleId` — NDLA article ID (find via search API or ndla.no URL)
- `sections` — Optional filter: only include sections matching these headings
- Multiple lessons can reference the same article (different sections)

## Adding a New Subject

1. Browse NDLA for articles in your subject area
2. Note the article IDs (from the URL: `ndla.no/article/{id}`)
3. Create an article mapping config: `scripts/ndla/my-subject-articles.json`
4. Run the pipeline: `node scripts/fetch-ndla.js --config scripts/ndla/my-subject-articles.json --output examples/my-subject`
5. Create `examples/my-subject/papertek.config.js` (copy from `naturfag-vg1` or `math-basics`)
6. Review and improve the auto-generated exercises

## API Reference

NDLA provides several public APIs at `https://api.ndla.no`:

- **article-api** — Full article content (HTML)
- **search-api** — Search by query, subject, topic
- **taxonomy-api** — Subject hierarchy and structure
- **concept-api** — Concept definitions

All content is licensed CC-BY-SA-4.0. See [api.ndla.no](https://api.ndla.no) for documentation.

## Caching

API responses are cached in `scripts/ndla/.cache/` (gitignored). Delete the cache directory to force re-fetch:

```bash
rm -rf scripts/ndla/.cache/
```
