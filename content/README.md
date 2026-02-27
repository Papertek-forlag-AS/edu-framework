# Content Directory

This directory is where course content lives. It is **empty in the framework** — courses populate it via AI skills or manually.

## Convention

```
content/{language}/lessons-data/chapter-{N}.js
content/{language}/exercises-data/{curriculum}/chapter-{N}.js
content/{language}/grammar-data/chapter-{N}.js
```

All content must validate against schemas in `schemas/`.

Run `npm run validate:schemas` after adding or modifying content.
