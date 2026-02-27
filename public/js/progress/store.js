/**
 * =================================================================
 * STORE - Low-level storage operations and data access
 * =================================================================
 *
 * This module handles all localStorage operations and provides
 * core data access functions for the progress tracking system.
 */

import { safeStorage } from '../error-handler.js';
import { CURRICULUM_CONFIG } from './config.js';

/**
 * Lagrer data til localStorage med feilhåndtering
 * @param {string} key - Nøkkel
 * @param {any} value - Verdi (blir JSON-stringified)
 */
export function saveData(key, value) {
    return safeStorage.set(key, value);
}

/**
 * Henter data fra localStorage med feilhåndtering
 * @param {string} key - Nøkkel
 * @returns {any} Parsed verdi eller null
 */
export function loadData(key) {
    return safeStorage.get(key, null);
}

/**
 * Henter komplett progressData (multi-curriculum struktur)
 * @returns {object} Komplett progressData-objekt eller standard struktur
 */
export function getFullProgressData() {
    const data = loadData('progressData');
    if (!data) {
        // Returner standard struktur hvis ingen data finnes
        return {
            studentProfile: {
                name: "Student",
                activeCurriculum: 'tysk1-vg1',
                currentGrade: 'vg1',
                startYear: new Date().getFullYear(),
                migrated: false
            },
            progressByCurriculum: {
                'tysk1-vg1': {}
            },
            knownWords: [],
            vocabTestHistory: []
        };
    }

    // Ensure data has required structure (for backwards compatibility)
    if (!data.progressByCurriculum) {
        data.progressByCurriculum = { 'tysk1-vg1': {} };
    }
    if (!data.studentProfile) {
        data.studentProfile = {
            name: "Student",
            activeCurriculum: 'tysk1-vg1',
            currentGrade: 'vg1',
            startYear: new Date().getFullYear(),
            migrated: false
        };
    }
    if (!data.knownWords) {
        data.knownWords = [];
    }
    if (!data.vocabTestHistory) {
        data.vocabTestHistory = [];
    }

    return data;
}

/**
 * Lagrer komplett progressData
 * @param {object} data - Komplett progressData-objekt
 */
export function saveFullProgressData(data) {
    saveData('progressData', data);
}

/**
 * Henter aktivt curriculum (f.eks. 'vg1-tysk1', 'us-8')
 * @returns {string} Aktivt curriculum ID
 */
export function getActiveCurriculum() {
    const data = getFullProgressData();
    return data.studentProfile?.activeCurriculum || 'tysk1-vg1';
}

/**
 * Setter aktivt curriculum
 * @param {string} curriculumId - Nytt curriculum ID
 */
export function setActiveCurriculum(curriculumId) {
    const data = getFullProgressData();
    data.studentProfile.activeCurriculum = curriculumId;

    // Ensure structure exists
    if (!data.progressByCurriculum[curriculumId]) {
        data.progressByCurriculum[curriculumId] = {};
    }

    saveFullProgressData(data);
}

/**
 * Henter progresjon for en spesifikk leksjon i aktivt curriculum
 * @param {string} lessonId - Leksjons-ID (f.eks. '1-1')
 * @returns {object} Leksjonsprogresjon eller standard objekt
 */
export function getLessonProgress(lessonId) {
    const data = getFullProgressData();
    const curriculum = getActiveCurriculum();

    if (!data.progressByCurriculum[curriculum]) {
        data.progressByCurriculum[curriculum] = {};
    }

    if (!data.progressByCurriculum[curriculum][lessonId]) {
        data.progressByCurriculum[curriculum][lessonId] = {
            completed: false,
            date: null,
            tabs: [],
            exercises: {},
            tests: [],
            achievements: {
                leksjon: false,
                ovelser: 0,           // Integer: completion count (0 = not earned)
                ekstraovelser: 0,     // Integer: completion count (0 = not earned)
                earnedDate: null
            }
        };
    }

    // Migration: Convert old boolean values to integers
    const lesson = data.progressByCurriculum[curriculum][lessonId];
    if (typeof lesson.achievements.ovelser === 'boolean') {
        lesson.achievements.ovelser = lesson.achievements.ovelser ? 1 : 0;
    }
    if (typeof lesson.achievements.ekstraovelser === 'boolean') {
        lesson.achievements.ekstraovelser = lesson.achievements.ekstraovelser ? 1 : 0;
    }

    return lesson;
}

/**
 * Lagrer progresjon for en spesifikk leksjon i aktivt curriculum
 * @param {string} lessonId - Leksjons-ID
 * @param {object} lessonProgress - Leksjonsprogresjon-objekt
 */
export function saveLessonProgress(lessonId, lessonProgress) {
    const data = getFullProgressData();
    const curriculum = getActiveCurriculum();

    if (!data.progressByCurriculum[curriculum]) {
        data.progressByCurriculum[curriculum] = {};
    }

    data.progressByCurriculum[curriculum][lessonId] = lessonProgress;
    saveFullProgressData(data);
}

/**
 * Henter all progresjonsdata fra localStorage.
 * Returnerer progresjon for aktivt curriculum i NYTT format.
 * @returns {object} Et objekt som inneholder all progresjonsdata for aktivt curriculum.
 */
export function getProgressData() {
    const fullData = getFullProgressData();
    const curriculum = getActiveCurriculum();
    return fullData.progressByCurriculum[curriculum] || {};
}

/**
 * Lagrer en spesifikk progresjonstype for en leksjon.
 * @param {string} lessonId - F.eks. "1-1".
 * @param {string} type - 'tabs' eller 'tests'. (exercises håndteres av trackExerciseCompletion)
 * @param {any} value - Verdien som skal lagres. For tester kan dette være et objekt.
 */
export function logProgress(lessonId, type, value) {
    const lessonProgress = getLessonProgress(lessonId);

    if (type === 'tests') {
        const testIndex = lessonProgress.tests.findIndex(t => t.type === value.type);
        if (testIndex > -1) {
            // Oppdater eksisterende testresultat
            lessonProgress.tests[testIndex] = value;
        } else {
            // Legg til nytt testresultat
            lessonProgress.tests.push(value);
        }
    } else if (type === 'tabs') {
        // Legg til tab hvis ikke allerede besøkt
        if (!lessonProgress.tabs.includes(value)) {
            lessonProgress.tabs.push(value);
        }

        // Sjekk om alle påkrevde faner er besøkt og oppdater achievement
        const requiredTabs = ['leksjon', 'ordforrad', 'grammatikk', 'ovelser'];
        const allTabsVisited = requiredTabs.every(tab => lessonProgress.tabs.includes(tab));

        if (allTabsVisited && !lessonProgress.achievements.leksjon) {
            lessonProgress.achievements.leksjon = true;
            if (!lessonProgress.achievements.earnedDate) {
                lessonProgress.achievements.earnedDate = new Date().toISOString().split('T')[0];
            }
        }
    }

    saveLessonProgress(lessonId, lessonProgress);
}
