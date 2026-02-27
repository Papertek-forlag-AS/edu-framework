/**
 * Papertek Configuration — German A1 Example
 *
 * This is a minimal working configuration for a German A1 course.
 * For full documentation, see the main framework's CLAUDE.md.
 */
export default {
  // ─── Course Metadata ─────────────────────────────────────
  name: 'German A1 — Beginners',
  description: 'A beginner German course following CEFR A1 level, designed for Norwegian-speaking students.',
  version: '1.0.0',
  author: 'Papertek Example',

  // ─── Target Language ─────────────────────────────────────
  language: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    uiLocale: 'nb',
    gender: {
      enabled: true,
      system: 'three',
      genders: ['maskulin', 'feminin', 'nøytrum'],
      articles: {
        maskulin: { bestemt: 'der', ubestemt: 'ein' },
        feminin: { bestemt: 'die', ubestemt: 'eine' },
        noytrum: { bestemt: 'das', ubestemt: 'ein' },
      },
      colors: {
        maskulin: '#3B82F6',
        feminin: '#EC4899',
        noytrum: '#10B981',
      },
    },
    specialCharacters: ['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü'],
    characterNormalization: { 'ö': 'oe', 'ä': 'ae', 'ü': 'ue', 'ß': 'ss' },
    tts: { enabled: true, lang: 'de-DE' },
  },

  // ─── Curricula ───────────────────────────────────────────
  curricula: [
    {
      id: 'german-a1',
      filePrefix: 'a1',
      folderName: 'german-a1',
      chapters: 2,
      lessonsPerChapter: 2,
      title: 'German A1 — Beginners',
      description: 'CEFR A1 level German for Norwegian speakers',
      cefrLevel: 'A1',
      contentPath: 'content/german',
    },
  ],

  // ─── Features ────────────────────────────────────────────
  features: {
    offline: true,
    cloudSync: false,
    teacherDashboard: false,
    vocabTrainer: true,
    grammarModules: true,
    achievements: true,
  },

  // ─── Auth (disabled for this example) ────────────────────
  auth: {
    enabled: false,
    providers: [],
  },
};
