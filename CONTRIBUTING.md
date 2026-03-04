# Contributing to Papertek — Framework for Education

Thank you for your interest in contributing! This framework is designed to be built by both humans and AI agents, so contributions of all kinds are welcome.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/papertek-framework.git`
3. Install dependencies: `npm install`
4. Start the dev server: `npm run dev`

## Project Structure

```
papertek-framework/
  cli/              CLI scaffolder (create-edu-app)
  content/          Empty in framework — courses populate this
  examples/         Example courses
  public/
    js/             Engine runtime (read-only for content authors)
    css/            Framework CSS (papertek.css)
  schemas/          JSON schemas for all content types
  scripts/          Build and validation scripts
  templates/        Config templates
  .claude/skills/   AI agent skills
```

## How to Contribute

### Content Authors (no JS knowledge needed)
Create courses using the AI skills (`/create-lesson`, `/create-exercises`, etc.) or by editing content data files directly. All content must conform to the JSON schemas in `schemas/`.

### Engine Developers
The engine lives in `public/js/`. Key rules:

- All exercise modules should use the `ExerciseBase` factory pattern (see `ARCHITECTURE.md` section 2.1)
- Never hardcode language-specific values — use `language-utils.js`
- All DOM event listeners must be cleaned up (use `ctx.listen()` in exercises)
- No external JS frameworks (React, Vue, etc.)
- No build-time transpilation — ES modules only
- Offline-first: every feature must work without network

### Skill Authors
Skills live in `.claude/skills/` as Markdown files. A good skill:

- Reads from `papertek.config.js` to be language-agnostic
- References the correct schemas
- Provides clear step-by-step instructions
- Includes a quality checklist
- Shows the expected output format

### CSS Contributors
The design system uses CSS custom properties (tokens) defined in `public/css/papertek.css`. When adding styles, use the existing token system rather than hardcoding colors or spacing values.

## Commit Messages

Use conventional commits:

```
feat: Add new exercise type for sentence building
fix: Correct umlaut normalization in fill-in validation
refactor: Extract grammar renderer into module registry
docs: Update architecture documentation
```

## Pull Request Process

1. Create a branch from `main`
2. Make your changes
3. Run validation: `npm run validate:schemas && npm run validate:config`
4. Run tests: `npm test`
5. Submit a PR with a clear description of what and why

## Adding a New Exercise Type

1. Create the renderer in `public/js/exercises/`
2. Use the `ExerciseBase` factory (`createExercise`)
3. Add the type to `schemas/exercise.schema.json`
4. Update the exercise content loader to recognize the new type
5. Add an example in `examples/minimal-course/`
6. Update the `/create-exercises` skill to include the new type
7. Document in `CLAUDE.md`

## Adding a New Language Preset

1. Add the language config to `LANGUAGE_PRESETS` in `cli/create-edu-app.js`
2. Add the language config to `curriculum-registry.js` (with all grammar properties)
3. Add number words to `language-utils.js` (for answer validation)
4. Test by scaffolding a project: `node cli/create-edu-app.js --lang xx`

## License

Engine code is MIT licensed. Content (examples, courses) is CC-BY-SA-4.0.
