/**
 * papertek.config.js — Course Configuration
 *
 * This is the educator's primary touchpoint.
 * An AI agent or human edits this file to configure the course.
 * Then run: npm run generate:lessons
 *
 * @see schemas/curriculum.schema.json for validation
 * @see schemas/language.schema.json for language config options
 */

export default {
  // ──────────────────────────────────────────────
  // Course metadata
  // ──────────────────────────────────────────────
  course: {
    name: 'My Course',
    description: 'An educational web app built with Papertek',
    version: '1.0.0',
    author: '',
    license: 'CC-BY-SA-4.0',
  },

  // ──────────────────────────────────────────────
  // Target language being taught
  // ──────────────────────────────────────────────
  targetLanguage: {
    code: 'de',                           // ISO 639-1
    name: 'German',
    nativeName: 'Deutsch',
    genderSystem: 'three',                // 'none' | 'two' | 'three'
    scriptDirection: 'ltr',               // 'ltr' | 'rtl'
    specialCharacters: ['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü'],
    characterNormalization: {
      'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss',
      'Ä': 'Ae', 'Ö': 'Oe', 'Ü': 'Ue',
    },
    ttsVoice: 'de-DE-Chirp3-HD',
    articles: { m: 'der', f: 'die', n: 'das', pl: 'die' },
    genderLabels: { m: 'Maskulin', f: 'Feminin', n: 'Neutrum', pl: 'Flertall' },
    genderColors: { m: '#3B82F6', f: '#EC4899', n: '#10B981', pl: '#8B5CF6' },
    verbConfig: {
      infinitiveParticle: 'zu',
      acceptInfinitiveParticle: true,
      pronouns: ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie'],
    },
    caseSystem: {
      cases: ['nominativ', 'akkusativ', 'dativ', 'genitiv'],
      progressionGating: {
        nominativ: 1,
        akkusativ: 4,
        dativ: 7,
        genitiv: null,    // null = not introduced in this course
      },
    },
  },

  // ──────────────────────────────────────────────
  // UI languages available to students
  // ──────────────────────────────────────────────
  uiLanguages: [
    { code: 'nb', name: 'Norsk bokmål', default: true },
    { code: 'en', name: 'English' },
  ],

  // ──────────────────────────────────────────────
  // Curricula (course tracks)
  // ──────────────────────────────────────────────
  curricula: [
    {
      id: 'tysk1-vg1',
      filePrefix: 'vg1',
      folderName: 'tysk',
      chapters: 8,
      lessonsPerChapter: 3,
      title: 'Wir sprechen Deutsch 1 — VG1',
      description: 'Tysk nivå 1 for videregående',
      cefrLevel: 'A1',
      contentPath: 'content/german',
    },
  ],

  // ──────────────────────────────────────────────
  // Vocabulary API
  // ──────────────────────────────────────────────
  vocabularyApi: {
    baseUrl: 'https://papertek-vocabulary.vercel.app/api/vocab/v1',
    cdnUrl: 'https://papertek-vocabulary.vercel.app',
    languages: ['de'],
    translationPairs: ['de-nb', 'de-en'],
    fetchAudio: true,
  },

  // ──────────────────────────────────────────────
  // Feature flags
  // ──────────────────────────────────────────────
  features: {
    offlineMode: true,
    cloudSync: false,
    classroomGames: false,
    vocabTrainer: true,
    spacedRepetition: true,
    wordTooltips: true,
    specialCharKeyboard: true,
    celebrations: true,
  },

  // ──────────────────────────────────────────────
  // Authentication providers (optional)
  // ──────────────────────────────────────────────
  auth: {
    enabled: false,
    providers: [
      // { id: 'feide', enabled: true },
      // { id: 'google', enabled: true },
    ],
  },

  // ──────────────────────────────────────────────
  // Backend provider (auth + database)
  // ──────────────────────────────────────────────
  // Supported: 'firebase' | 'supabase' | 'none'
  // Set to 'none' for offline-only mode (default).
  backend: {
    provider: 'none',

    // Firebase config (when provider === 'firebase'):
    // firebase: {
    //   apiKey: '...',
    //   authDomain: '...',
    //   projectId: '...',
    //   storageBucket: '...',
    //   messagingSenderId: '...',
    //   appId: '...'
    // },

    // Supabase config (when provider === 'supabase'):
    // supabase: {
    //   url: 'https://your-project.supabase.co',
    //   anonKey: 'eyJ...'
    // },
  },
};
