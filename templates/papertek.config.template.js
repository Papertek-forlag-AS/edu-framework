/**
 * papertek.config.js — Course Configuration
 *
 * This is the educator's primary touchpoint. All course settings live here.
 * AI agents read this to understand the course structure.
 *
 * After editing, run: node scripts/config-parser.js
 */

export default {
  // ─── Course Metadata ───────────────────────────────────────────
  course: {
    name: '{{COURSE_NAME}}',
    description: '{{COURSE_DESCRIPTION}}',
    version: '1.0.0',
    author: '{{AUTHOR_NAME}}',
    organization: '{{ORGANIZATION}}',
    audience: '{{AUDIENCE}}',           // e.g., "High school students (16-17)"
    cefrLevel: '{{CEFR_LEVEL}}',        // e.g., "A1", "A2", "B1"
  },

  // ─── Target Language ───────────────────────────────────────────
  targetLanguage: {
    code: '{{LANG_CODE}}',              // ISO 639-1, e.g., "de", "fr", "es"
    name: '{{LANG_NAME}}',              // e.g., "German", "French", "Spanish"

    // Gender system: 'none' | 'two' | 'three'
    genderSystem: '{{GENDER_SYSTEM}}',
    // Articles per gender (if applicable)
    articles: {
      // Example for German: { masculine: 'der', feminine: 'die', neuter: 'das' }
      // Example for French: { masculine: 'le', feminine: 'la' }
      // Example for none: {}
    },

    // Special characters for the on-screen keyboard
    specialCharacters: [/* e.g., 'ä', 'ö', 'ü', 'ß' */],

    // Text-to-speech configuration
    tts: {
      lang: '{{TTS_LANG}}',            // e.g., "de-DE", "fr-FR"
      voice: 'default',
    },
  },

  // ─── UI Languages ──────────────────────────────────────────────
  uiLanguages: [
    { code: '{{UI_LANG_CODE}}', name: '{{UI_LANG_NAME}}', default: true },
    // Add more UI languages as needed:
    // { code: 'en', name: 'English' },
  ],

  // ─── Curricula ─────────────────────────────────────────────────
  curricula: [
    {
      id: '{{CURRICULUM_ID}}',          // e.g., "french-a1", "german-vg1"
      label: '{{CURRICULUM_LABEL}}',    // e.g., "French A1", "Tysk Vg1"
      chapters: {{NUM_CHAPTERS}},
      lessonsPerChapter: {{LESSONS_PER_CHAPTER}},
      prefix: '{{LESSON_PREFIX}}',      // e.g., "a1", "vg1" — used in filenames
    },
  ],

  // ─── Vocabulary API ────────────────────────────────────────────
  vocabularyApi: {
    baseUrl: 'https://papertek-vocabulary.vercel.app/api/vocab/v1',
    endpoints: {
      coreBank: '/core/{{LANG_CODE}}',
      translations: '/translations/{{LANG_CODE}}-{{UI_LANG_CODE}}',
      curriculum: '/curriculum',
    },
  },

  // ─── Feature Flags ─────────────────────────────────────────────
  features: {
    offlineMode: true,
    cloudSync: false,
    teacherDashboard: false,
    classroomGames: false,
    vocabTrainer: true,
    spacedRepetition: true,
    printableExercises: false,
  },

  // ─── Firebase (optional) ───────────────────────────────────────
  firebase: null,
  // To enable: replace null with Firebase config object
  // firebase: {
  //   dev: { apiKey: '...', projectId: '...' },
  //   staging: { apiKey: '...', projectId: '...' },
  //   production: { apiKey: '...', projectId: '...' },
  // },
};
