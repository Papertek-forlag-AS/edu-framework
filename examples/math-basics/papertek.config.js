/**
 * Papertek Configuration — Math Basics Example
 *
 * Demonstrates non-language usage of the framework.
 * Gender, TTS, special characters, and vocab trainer are all disabled.
 */
export default {
  // ─── Course Metadata ─────────────────────────────────────
  name: 'Matte Grunnkurs',
  description: 'Grunnleggende algebra for ungdomsskolen — variabler, likninger og problemløsning.',
  version: '1.0.0',
  author: 'Papertek Example',

  // ─── Subject (not a foreign language) ────────────────────
  language: {
    code: 'nb',
    name: 'Mathematics',
    nativeName: 'Matematikk',
    uiLocale: 'nb',
    gender: { enabled: false },
    specialCharacters: [],
    characterNormalization: {},
    tts: { enabled: false },
  },

  // ─── Curricula ───────────────────────────────────────────
  curricula: [
    {
      id: 'math-basics',
      filePrefix: 'math',
      folderName: 'math-basics',
      chapters: 1,
      lessonsPerChapter: 2,
      title: 'Algebra Grunnkurs',
      description: 'Introduksjon til variabler og likninger',
      cefrLevel: null,
      contentPath: 'content/math',
      tabs: [
        { id: 'leksjon', i18nKey: 'tab_lesson', label: 'Leksjon' },
        { id: 'grammatikk', i18nKey: 'tab_theory', label: 'Teori' },
        { id: 'exercises', i18nKey: 'tab_exercises', label: 'Oppgaver' },
      ],
    },
  ],

  // ─── Features ────────────────────────────────────────────
  features: {
    offline: true,
    cloudSync: false,
    teacherDashboard: false,
    vocabTrainer: false,
    grammarModules: false,
    achievements: true,
  },

  // ─── Auth ────────────────────────────────────────────────
  auth: {
    enabled: false,
    providers: [],
  },
};
