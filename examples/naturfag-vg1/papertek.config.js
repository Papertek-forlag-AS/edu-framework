/**
 * Papertek Configuration — Naturfag VG1 Example
 *
 * Demonstrates non-language usage of the framework with real NDLA content.
 * Gender, TTS, special characters, and vocab trainer are all disabled.
 * Content sourced from NDLA (CC-BY-SA-4.0).
 */
export default {
  // ─── Course Metadata ─────────────────────────────────────
  name: 'Naturfag VG1 — Celler og fotosyntese',
  description: 'Grunnleggende biologi: celler, celledeling, fotosyntese og energi. Basert på NDLA-innhold (CC-BY-SA-4.0).',
  version: '1.0.0',
  author: 'Papertek Example (NDLA content)',

  // ─── Subject (not a foreign language) ────────────────────
  language: {
    code: 'nb',
    name: 'Natural Sciences',
    nativeName: 'Naturfag',
    uiLocale: 'nb',
    gender: { enabled: false },
    specialCharacters: [],
    characterNormalization: {},
    tts: { enabled: false },
  },

  // ─── Curricula ───────────────────────────────────────────
  curricula: [
    {
      id: 'naturfag-vg1',
      filePrefix: 'nf',
      folderName: 'naturfag-vg1',
      chapters: 2,
      lessonsPerChapter: 2,
      title: 'Naturfag VG1 — Biologi',
      description: 'Celler, fotosyntese og energi',
      cefrLevel: null,
      contentPath: 'content/naturfag',
      tabs: [
        { id: 'leksjon', i18nKey: 'tab_lesson', label: 'Leksjon' },
        { id: 'grammatikk', i18nKey: 'tab_reference', label: 'Fagstoff' },
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
    grammarModules: true,
    achievements: true,
  },

  // ─── Auth ────────────────────────────────────────────────
  auth: {
    enabled: false,
    providers: [],
  },
};
