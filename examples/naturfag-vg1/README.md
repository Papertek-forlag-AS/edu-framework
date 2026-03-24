# Naturfag VG1 — Papertek Example

> **Live demo:** [papertek-forlag-as.github.io/edu-framework](https://papertek-forlag-as.github.io/edu-framework/)

Demonstrates that the Papertek framework works for **non-language subjects** using real educational content from [NDLA](https://ndla.no) (Nasjonal digital læringsarena).

## Content

| Chapter | Topic | Lessons | Source |
|---------|-------|---------|--------|
| 1 | Celler og celledeling | 1-1: Mitose, 1-2: Meiose og arvestoff | [NDLA #6454](https://ndla.no/article/6454) |
| 2 | Fotosyntese og energi | 2-1: Fotosyntesen, 2-2: Hva er energi? | [NDLA #9806](https://ndla.no/article/9806), [#38328](https://ndla.no/article/38328) |

## Exercise Types Used

This example showcases 8 exercise types working for science education:

- **matching** — Link terms to definitions (e.g., cell organelles)
- **true-false** — Evaluate scientific statements
- **fill-in** — Complete sentences with key terms
- **categorize** — Sort items (e.g., mitose vs meiose, fornybare vs ikke-fornybare)
- **quiz** — Multiple choice on concepts
- **interactive-flashcards** — Study key terms
- **chronology** — Order events (e.g., cell cycle, evolution)
- **writing** — Explain concepts in own words

## Disabled Features

Since this is not a language course, these features are turned off:

| Feature | Status | Why |
|---------|--------|-----|
| Vocabulary trainer | Off | No foreign language vocabulary |
| Grammar modules | **On** | Repurposed as "Theory" modules |
| Gender system | Off | No grammatical gender |
| Special characters | Off | No foreign characters |
| Text-to-speech | Off | No pronunciation practice |

## License

Content is sourced from NDLA and licensed under [CC-BY-SA-4.0](https://creativecommons.org/licenses/by-sa/4.0/).

## Rebuild from NDLA

```bash
# Fetch and transform NDLA articles
npm run fetch:ndla

# Build the demo
node scripts/build-demo.js naturfag-vg1
```
