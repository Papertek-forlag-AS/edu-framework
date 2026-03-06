/**
 * =================================================================
 * CURRICULUM REGISTRY - Central Configuration
 * =================================================================
 *
 * Defines all available curricula and their specific language rules.
 * This replaces the simple config object in config.js.
 */

// --- Shared Language Configurations ---

const GERMAN_LANGUAGE_CONFIG = {
    code: 'de',
    grammar: {
        genderCount: 3,
        articles: { m: 'der', f: 'die', n: 'das', pl: 'die' },
        genderLabels: {
            m: 'Maskulinum (Hankjønn)',
            f: 'Femininum (Hunkjønn)',
            n: 'Nøytrum (Intetkjønn)'
        },
        genderColors: { m: 'blue', f: 'red', n: 'green', pl: 'gray' },
        verbLogic: {
            infinitiveParticle: 'zu',
            acceptInfinitiveParticle: true
        },
        pronouns: ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie']
    },
    dataKeys: {
        target: 'tysk',
        native: 'norsk'
    },
    specialChars: ['ß', 'ä', 'ö', 'ü'],
    characterNormalization: { 'ö': 'oe', 'ä': 'ae', 'ü': 'ue', 'ß': 'ss' }
};

const SPANISH_LANGUAGE_CONFIG = {
    code: 'es',
    grammar: {
        genderCount: 2,
        articles: { m: 'el', f: 'la', pl: 'los/las' },
        genderLabels: {
            m: 'Maskulinum (Hankjønn)',
            f: 'Femininum (Hunkjønn)'
        },
        genderColors: { m: 'blue', f: 'red', pl: 'gray' },
        pronouns: ['yo', 'tú', 'él/ella/usted', 'nosotros/nosotras', 'vosotros/vosotras', 'ellos/ellas/ustedes']
    },
    dataKeys: {
        target: 'spansk',
        native: 'norsk'
    },
    specialChars: ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ', '¿', '¡'],
    characterNormalization: { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ü': 'u', 'ñ': 'n' }
};

const FRENCH_LANGUAGE_CONFIG = {
    code: 'fr',
    grammar: {
        genderCount: 2,
        articles: { m: 'le', f: 'la', pl: 'les' },
        elidedArticle: "l'",  // Used before vowels
        genderLabels: {
            m: 'Masculin (Hankjønn)',
            f: 'Féminin (Hunkjønn)'
        },
        genderColors: { m: 'blue', f: 'red', pl: 'gray' },
        pronouns: ['je', 'tu', 'il/elle/on', 'nous', 'vous', 'ils/elles']
    },
    dataKeys: {
        target: 'fransk',
        native: 'norsk'
    },
    specialChars: ['é', 'è', 'ê', 'ë', 'à', 'â', 'ù', 'û', 'ô', 'î', 'ï', 'ç', 'œ', 'æ'],
    characterNormalization: { 'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e', 'à': 'a', 'â': 'a', 'ù': 'u', 'û': 'u', 'ô': 'o', 'î': 'i', 'ï': 'i', 'ç': 'c', 'œ': 'oe', 'æ': 'ae' }
};

const NATURFAG_LANGUAGE_CONFIG = {
    code: 'nb',
    grammar: {
        genderCount: 0,
        articles: {},
        genderLabels: {},
        genderColors: {},
        pronouns: []
    },
    dataKeys: {
        target: 'naturfag',
        native: 'norsk'
    },
    specialChars: [],
    characterNormalization: {}
};

export const CURRICULUM_REGISTRY = {
    'us-8': {
        id: 'us-8',
        filePrefix: 'us8',
        folderName: 'us-8',
        chapters: 8,
        title: 'Wir sprechen 8',
        description: '8. klasse ungdomsskole',
        contentPath: '../../content/german',
        paths: {
            homeLink: '../../../../index.html'
        },
        languageConfig: GERMAN_LANGUAGE_CONFIG
    },
    'us-9': {
        id: 'us-9',
        filePrefix: 'us9',
        folderName: 'us-9',
        chapters: 8,
        title: 'Wir sprechen 9',
        description: '9. klasse ungdomsskole',
        contentPath: '../../content/german',
        paths: {
            homeLink: '../../../../index.html'
        },
        chapterMapping: {
            1: 9, 2: 10, 3: 11, 4: 12, 5: 13, 6: 14, 7: 15, 8: 16
        },
        languageConfig: GERMAN_LANGUAGE_CONFIG
    },
    'us-10': {
        id: 'us-10',
        filePrefix: 'us10',
        folderName: 'us-10',
        chapters: 8,
        title: 'Wir sprechen 10',
        description: '10. klasse ungdomsskole',
        contentPath: '../../content/german',
        paths: {
            homeLink: '../../../../index.html'
        },
        languageConfig: GERMAN_LANGUAGE_CONFIG
    },
    'tysk1-vg1': {
        id: 'tysk1-vg1',
        filePrefix: 'vg1',
        folderName: 'vg1-tysk1',
        chapters: 12,
        title: 'Wir sprechen Deutsch 1 VG1',
        description: 'VG1 Tysk Nivå I',
        contentPath: '../../content/german',
        languageDir: 'german',
        paths: {
            homeLink: '../../../../index.html'
        },
        // Milestone tests — shown after completing all lessons in specified chapter range
        milestoneTests: [
            {
                afterChapter: 4,
                title: 'Stor Test: Kapittel 1-4',
                description: 'Test din kunnskap fra de første fire kapitlene i én omfattende test!',
                link: 'test-kapittel-1-4.html',
                chaptersRequired: [1, 2, 3, 4],
                lessonsPerChapter: 3
            }
        ],
        languageConfig: GERMAN_LANGUAGE_CONFIG
    },
    'tysk1-vg2': {
        id: 'tysk1-vg2',
        filePrefix: 'vg2-t1',
        folderName: 'vg2-tysk1',
        chapters: 12,
        title: 'Wir sprechen Deutsch 1 VG2',
        description: 'VG2 Tysk Nivå I',
        contentPath: '../../content/german',
        paths: {
            homeLink: '../../../../index.html'
        },
        languageConfig: GERMAN_LANGUAGE_CONFIG
    },
    'tysk2-vg1': {
        id: 'tysk2-vg1',
        filePrefix: 'vg1-t2',
        folderName: 'vg1-tysk2',
        chapters: 12,
        title: 'Wir sprechen Deutsch 2 VG1',
        description: 'VG1 Tysk Nivå II',
        contentPath: '../../content/german',
        paths: {
            homeLink: '../../../../index.html'
        },
        languageConfig: GERMAN_LANGUAGE_CONFIG
    },
    'tysk2-vg2': {
        id: 'tysk2-vg2',
        filePrefix: 'vg2-t2',
        folderName: 'vg2-tysk2',
        chapters: 12,
        title: 'Wir sprechen Deutsch 2 VG2',
        description: 'VG2 Tysk Nivå II',
        contentPath: '../../content/german',
        paths: {
            homeLink: '../../../../index.html'
        },
        languageConfig: GERMAN_LANGUAGE_CONFIG
    },
    'german-a1': {
        id: 'german-a1',
        filePrefix: 'a1',
        folderName: 'german-a1',
        chapters: 2,
        lessonsPerChapter: 2,
        title: 'German A1 — Beginners',
        description: 'CEFR A1 level German for Norwegian speakers',
        contentPath: '../../content/german',
        languageDir: 'german',
        perChapterContent: true,
        paths: {
            homeLink: '../index.html'
        },
        languageConfig: GERMAN_LANGUAGE_CONFIG
    },
    'spansk1-vg1': {
        id: 'spansk1-vg1',
        filePrefix: 'spa1',
        folderName: 'vg1-spansk1',
        chapters: 12,
        title: 'Hablamos Español 1 VG1',
        description: 'VG1 Spansk Nivå I',
        contentPath: '../../content/spanish',
        languageDir: 'spanish',
        paths: {
            homeLink: '../../../../spansk/index.html'
        },
        startButtonText: 'Start med spansk',
        languageConfig: SPANISH_LANGUAGE_CONFIG
    },
    'naturfag-vg1': {
        id: 'naturfag-vg1',
        filePrefix: 'nf',
        folderName: 'naturfag-vg1',
        chapters: 2,
        lessonsPerChapter: 2,
        title: 'Naturfag VG1 — Biologi',
        description: 'Celler, fotosyntese og energi',
        contentPath: '../../content/naturfag',
        languageDir: 'naturfag',
        paths: {
            homeLink: '../index.html'
        },
        languageConfig: NATURFAG_LANGUAGE_CONFIG
    },
    'fransk1-vg1': {
        id: 'fransk1-vg1',
        filePrefix: 'fra1',
        folderName: 'vg1-fransk1',
        chapters: 12,
        title: 'Nous parlons Français 1 VG1',
        description: 'VG1 Fransk Nivå I',
        contentPath: '../../content/french',
        languageDir: 'french',
        paths: {
            homeLink: '../../../../fransk/index.html'
        },
        startButtonText: 'Start med fransk',
        languageConfig: FRENCH_LANGUAGE_CONFIG
    }
};


/**
 * Accessor for easy registry lookup
 */
export function getCurriculumConfig(id) {
    return CURRICULUM_REGISTRY[id] || Object.values(CURRICULUM_REGISTRY)[0] || {};
}
