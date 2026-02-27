# Vocabulary API Reference

The Vocabulary API has been **moved to a separate Vercel project**.

## External API

- **URL:** `https://papertek-vocabulary.vercel.app/api/vocab/v1`
- **Repository:** Separate `papertek-vocabulary` project

Vocabulary data is fetched from this API **at build time** (`scripts/fetch-vocabulary.cjs`) and written as static JSON files. Users load local files — they never hit the external API.

## Endpoints (served by external API)

### GET /core/{language}/{bankName}
Returns core vocabulary (words, conjugations, declensions).
- Languages: `de`, `es`, `fr`
- Bank names: `verbbank`, `nounbank`, `generalbank`, `adjectivebank`, `numbersbank`, `phrasesbank`, `pronounsbank`, `articlesbank`

### GET /translations/{pair}/{bankName}
Returns translations for a language pair.
- Pairs: `de-nb`, `de-en`, `es-nb`, `es-en`, `fr-nb`, etc.

### GET /curricula/{curriculumId}
Returns curriculum manifest.
- IDs: `tysk1-vg1`, `spansk1-vg1`, `us-8`, `us-9`, `us-10`, etc.

### GET /grammarfeatures
Returns grammar features for progressive disclosure.
- Query: `?language=de` for specific language

## Build Pipeline

`scripts/fetch-vocabulary.cjs` runs during `npm run build:vercel` and fetches:
- 24 core banks (3 languages x 8 banks)
- 40 translation banks (5 pairs x 8 banks)
- 8 curricula manifests

Results are written to `shared/vocabulary/` then copied to `public/shared/` as static files.

To refresh vocabulary manually: `npm run fetch:vocabulary`

## Webapp Client

All vocabulary consumers in the webapp use `vocab-api-client.js` which loads from local static files:

```js
import { fetchCoreBank, fetchTranslationBank, fetchCurriculum } from './js/vocabulary/vocab-api-client.js';

const verbbank = await fetchCoreBank('de', 'verbbank');
const translations = await fetchTranslationBank('de-nb', 'verbbank');
const manifest = await fetchCurriculum('tysk1-vg1');
```

The client has an in-memory cache — repeated calls for the same data return cached results.

## What Stays Local

- `shared/vocabulary/core/*/audio/` — MP3 audio files served locally
- `shared/vocabulary/dictionary/verb-classification-de.json` — used by verb trainer and tooltips
- `shared/vocabulary/downloads/` — bulk audio ZIPs

## Audio

Audio files are still served locally from this repo:

**Audio URL pattern:** `/shared/vocabulary/core/{lang}/audio/{filename}.mp3`

**To re-link audio files:** Run `node scripts/link-audio-files.cjs`

## Adding Grammar Features

Grammar features are managed in the external `papertek-vocabulary` project.
See that project's documentation for how to add new features.

## Adding Example Sentences

Example sentences are stored in translation files in the external project.
See `papertek-vocabulary` documentation for details.
