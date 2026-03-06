/**
 * =================================================================
 * UI - General UI rendering and setup
 * =================================================================
 *
 * This module handles rendering progress icons on the index page,
 * setting up the continue button, and rendering the progress page.
 */

import { EXERCISE_DATABASE } from './config.js';
import { getProgressData, loadData, getFullProgressData, getActiveCurriculum } from './store.js';
import { getAchievementColor, areChaptersCompleted } from './achievements.js';
import { renderChapterResetButtons } from './reset.js';
import { getCurriculumConfig } from './curriculum-registry.js';
import { showOfflineModal } from '../layout/modals.js';

// SVG Icons
const bookIconSVG = `<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>`;
const pencilIconSVG = `<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>`;
const starIconSVG = `<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.539 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.539-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.98 9.11c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>`;
const testIconSVG = `<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>`;

/**
 * Viser progresjonsikoner for alle leksjoner på index.html
 */
export function renderAllLessonProgress() {
    const progress = getProgressData();
    const lessonLinks = document.querySelectorAll('.leksjon-link');

    lessonLinks.forEach(link => {
        const lessonId = link.dataset.leksjonId;
        const lessonProgress = progress[lessonId];

        // Hent default values hvis leksjonen ikke eksisterer ennå
        const achievements = lessonProgress?.achievements || { leksjon: false, exercises: 0, extraExercises: 0 };
        const tests = lessonProgress?.tests || [];

        // Migrer gamle boolean-verdier til integers (sikkerhetssjekk)
        const exercisesCount = typeof achievements.exercises === 'boolean' ? (achievements.exercises ? 1 : 0) : (achievements.exercises || 0);
        const extraCount = typeof achievements.extraExercises === 'boolean' ? (achievements.extraExercises ? 1 : 0) : (achievements.extraExercises || 0);

        const exerciseData = EXERCISE_DATABASE[lessonId] || { exercises: 0, extraExercises: 0, tests: [] };
        const hasExtraTab = exerciseData.extraExercises > 0;

        // Sjekk om alle påkrevde tester er fullført
        const testsCompleted = exerciseData.tests.every(testType =>
            tests.some(test => test.type === testType)
        );

        let iconsHTML = '';
        // 📗 Grønn bok: Les fra achievements.leksjon
        iconsHTML += `<span title="Leksjon lest">${achievements.leksjon ? `<span class="text-success-500">${bookIconSVG}</span>` : `<span class="text-neutral-300">${bookIconSVG}</span>`}</span>`;

        // ✏️ Progressiv blyant: Vis earned achievement-nivå
        // Simplified: Just show the earned achievement level (no "next level" logic)
        const pencilDisplayLevel = exercisesCount;
        const pencilColor = getAchievementColor(pencilDisplayLevel);
        const pencilTitle = pencilDisplayLevel > 0 ? `Øvelser fullført ${pencilDisplayLevel} ${pencilDisplayLevel === 1 ? 'gang' : 'ganger'}` : 'Øvelser ikke fullført';
        iconsHTML += `<span title="${pencilTitle}"><span class="${pencilColor}">${pencilIconSVG}</span></span>`;

        // ⭐ Progressiv stjerne: Vis earned achievement-nivå
        // Simplified: Just show the earned achievement level (no "next level" logic)
        if (hasExtraTab) {
            const starDisplayLevel = extraCount;
            const starColor = getAchievementColor(starDisplayLevel);
            const starTitle = starDisplayLevel > 0 ? `Ekstraøvelser fullført ${starDisplayLevel} ${starDisplayLevel === 1 ? 'gang' : 'ganger'}` : 'Ekstraøvelser ikke fullført';
            iconsHTML += `<span title="${starTitle}"><span class="${starColor}">${starIconSVG}</span></span>`;
        }
        // 📝 Grønt skjema: Beregn fra tester
        iconsHTML += `<span title="Tester fullført">${testsCompleted ? `<span class="text-success-500">${testIconSVG}</span>` : `<span class="text-neutral-300">${testIconSVG}</span>`}</span>`;

        link.querySelector('.progress-icons-desktop').innerHTML = iconsHTML;
        link.querySelector('.progress-icons-mobile').innerHTML = iconsHTML;
    });

    // Handle conditional visibility of milestone tests (config-driven)
    const milestoneTests = document.querySelectorAll('[data-milestone-test]');
    milestoneTests.forEach(section => {
        const chapters = JSON.parse(section.dataset.milestoneChapters || '[]');
        const lessonsPerCh = parseInt(section.dataset.milestoneLessons || '3', 10);
        if (chapters.length > 0 && areChaptersCompleted(chapters, lessonsPerCh)) {
            section.classList.remove('hidden');
        } else {
            section.classList.add('hidden');
        }
    });

    // Vis/skjul kapittel-nullstillingsknapper basert på achievements
    renderChapterResetButtons();
}

/**
 * Setter opp fortsett-knappen på index.html
 */
export function setupContinueButton() {
    const continueButton = document.getElementById('continue-btn');
    if (continueButton) {
        const lastLocation = loadData('lastLocation');
        if (lastLocation && lastLocation.chapter) {
            const config = getCurriculumConfig(getActiveCurriculum());
            const filePrefix = config.filePrefix;
            const folderName = config.folderName;

            // Check if we're on the international page
            const isInternational = window.location.pathname.includes('/international/');

            const isSubdirectory = window.location.pathname.includes('/tysk/') || window.location.pathname.includes('/spansk/') || window.location.pathname.includes('/fransk/');
            const langConfig = config.languageConfig;
            const langCode = langConfig?.code || 'nb';
            const langDirs = { 'de': 'german', 'es': 'spanish', 'fr': 'french' };
            const langFolder = config.languageDir || langDirs[langCode] || langCode;
            const pathPrefix = isSubdirectory ? '../' : '';

            // Build base URL
            const baseUrl = isInternational
                ? `int-${lastLocation.chapter}.html`
                : `${pathPrefix}content/${langFolder}/lessons/${folderName}/${filePrefix}-${lastLocation.chapter}.html`;

            // Add tab parameter for deep linking
            const tabParam = lastLocation.tab ? `?tab=${lastLocation.tab}` : '';
            continueButton.href = baseUrl + tabParam;
            continueButton.classList.remove('hidden');
        }
    }
}

/**
 * Renders the list of lessons dynamically into #lessons-container
 * based on the provided lessonsData and chapterTitles.
 * 
 * @param {Object} lessonsData - Map of lesson IDs to lesson objects
 * @param {Object} chapterTitles - Map of chapter IDs to chapter titles
 */
export function renderLessonList(lessonsData, chapterTitles) {
    const container = document.getElementById('lessons-container');
    if (!container) return;

    container.innerHTML = '';

    const config = getCurriculumConfig(getActiveCurriculum());
    const filePrefix = config.filePrefix;
    const folderName = config.folderName;

    // Check if we're on the international page
    const isInternational = window.location.pathname.includes('/international/');

    const isSubdirectory = window.location.pathname.includes('/tysk/') || window.location.pathname.includes('/spansk/') || window.location.pathname.includes('/fransk/');
    const langConfig = config.languageConfig;
    const langCode = langConfig?.code || 'nb';
    const langDirs = { 'de': 'german', 'es': 'spanish', 'fr': 'french' };
    const langFolder = config.languageDir || langDirs[langCode] || langCode;
    const pathPrefix = isSubdirectory ? '../' : '';

    // Use default chapters if chapterTitles is missing (fallback)
    const chapters = chapterTitles ? Object.keys(chapterTitles).map(Number).sort((a, b) => a - b) : [];

    chapters.forEach(chapterId => {
        const chapterTitle = chapterTitles[chapterId];

        // Find lessons for this chapter
        const chapterLessons = Object.keys(lessonsData)
            .filter(id => id.startsWith(`${chapterId}-`))
            .sort((a, b) => {
                const [c1, l1] = a.split('-').map(Number);
                const [c2, l2] = b.split('-').map(Number);
                if (c1 !== c2) return c1 - c2;
                return l1 - l2;
            });

        if (chapterLessons.length === 0) return; // Skip empty chapters

        // Create chapter HTML
        const chapterDiv = document.createElement('div');
        chapterDiv.className = 'mb-12';

        // Check if chapter is "In development" (optional logic, based on content?)
        // For now, render standard header

        let lessonsHTML = `<div class="space-y-4 mt-4">`;

        chapterLessons.forEach(lessonId => {
            const lesson = lessonsData[lessonId];
            const displayId = lessonId.replace('-', '.'); // 1-1 -> 1.1

            // International pages use int-X-Y.html in the same folder
            // Standard pages use content/{lang}/lessons/{folder}/{prefix}-X-Y.html
            const lessonUrl = isInternational
                ? `int-${lessonId}.html`
                : `${pathPrefix}content/${langFolder}/lessons/${folderName}/${filePrefix}-${lessonId}.html`;

            lessonsHTML += `
                <a href="${lessonUrl}"
                    class="leksjon-link block bg-surface p-6 rounded-xl shadow-sm hover:shadow-lg hover:ring-2 hover:ring-primary-500 transition-all duration-300 cursor-pointer"
                    data-leksjon-id="${lessonId}">
                    <div class="flex items-center gap-4">
                        <div class="flex-shrink-0 bg-primary-500 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold">
                            ${displayId}
                        </div>

                        <div class="flex-grow">
                            <h3 class="text-xl font-bold text-neutral-800">${lesson.targetTitle || lesson.dialog?.title || 'Uten tittel'}</h3>
                            <p class="text-neutral-600 mt-1">${lesson.learningGoals ? lesson.learningGoals[0] : (lesson.dialog?.description || '')}</p>

                            <div class="progress-icons-mobile flex md:hidden items-center gap-3 mt-3">
                            </div>
                        </div>

                        <div class="progress-icons-desktop hidden md:flex items-center gap-3 ml-4">
                        </div>

                        <div class="ml-auto text-primary-500 flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none"
                                viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </div>
                </a>
            `;
        });

        lessonsHTML += `</div>`; // End space-y-4

        // Reset button container
        lessonsHTML += `
            <div class="mt-6 text-center hidden" id="reset-chapter-${chapterId}-container">
                <button
                    class="reset-chapter-btn inline-flex items-center gap-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold py-2 px-4 rounded-lg transition-colors border-2 border-neutral-300"
                    data-chapter="${chapterId}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Nullstill øvelser i Kapittel ${chapterId}
                </button>
                <p class="text-xs text-neutral-500 mt-2">Nullstiller øvelsene slik at du kan gjøre dem på nytt. Achievements bevares.</p>
            </div>
        `;

        chapterDiv.innerHTML = `
            <h2 class="text-3xl font-bold text-neutral-800 mb-4 border-b-2 border-primary-500 pb-2">Kapittel ${chapterId}: ${chapterTitle}</h2>
            ${lessonsHTML}
        `;

        container.appendChild(chapterDiv);

        // Config-driven milestone tests: insert after the configured chapter
        const milestones = config.milestoneTests || [];
        milestones.forEach(milestone => {
            if (milestone.afterChapter === chapterId) {
                const testSection = document.createElement('div');
                testSection.className = 'mb-12 hidden';
                testSection.dataset.milestoneTest = 'true';
                testSection.dataset.milestoneChapters = JSON.stringify(milestone.chaptersRequired || []);
                testSection.dataset.milestoneLessons = String(milestone.lessonsPerChapter || 3);
                testSection.innerHTML = `
                    <div class="bg-gradient-to-r from-primary-500 to-warning-500 text-white p-6 rounded-xl shadow-lg">
                        <div class="text-center">
                            <h2 class="text-2xl font-bold mb-2">🏆 ${milestone.title}</h2>
                            <p class="mb-4">${milestone.description}</p>
                            <a href="${pathPrefix}${milestone.link}"
                                class="inline-block bg-surface text-primary-600 font-bold py-3 px-6 rounded-lg hover:bg-neutral-100 transition-colors shadow-md">
                                Start test →
                            </a>
                        </div>
                    </div>
                `;
                container.appendChild(testSection);
            }
        });
    });

    // After rendering, ensure reset buttons are functional
    // renderAllLessonProgress calls renderChapterResetButtons which attaches listeners

    // Attach Offline Handling Listeners
    const links = container.querySelectorAll('.leksjon-link');
    links.forEach(link => {
        link.addEventListener('click', async (e) => {
            if (!navigator.onLine) {
                e.preventDefault();
                const url = link.href;
                try {
                    // Check if the page is in the cache
                    const cacheName = 'tysk-ordtrener-german-v2'; // Hardcoded for now, ideal to get from config/const
                    // Note: This matches the cache name in sw.js relative to tysk/
                    // But accessing cache via window.caches is global
                    // We need to check if ANY cache has it, or specifically our SW cache
                    const match = await window.caches.match(url);
                    if (match) {
                        window.location.href = url;
                    } else {
                        showOfflineModal();
                    }
                } catch (err) {
                    console.error('Error checking cache', err);
                    // Fallback: try to navigate, let SW handle it (will show offline.html)
                    window.location.href = url;
                }
            }
        });
    });
}

/**
 * Setter opp progress page (repetisjon.html eller liknende)
 */
export function setupProgressPage() {
    const container = document.getElementById('progress-container');
    const noProgressMessage = document.getElementById('no-progress');
    const progressData = getProgressData();

    if (!container || !noProgressMessage) return;

    const lessons = Object.keys(progressData).sort((a, b) => {
        const [a1, a2] = a.split('-').map(Number);
        const [b1, b2] = b.split('-').map(Number);
        if (a1 !== b1) return a1 - b1;
        return a2 - b2;
    });

    // Check for vocabulary test results
    // Try new multi-curriculum structure first, fallback to old format
    const fullProgressData = loadData('progressData');
    const vocabHistory = (fullProgressData && fullProgressData.vocabTestHistory)
        ? fullProgressData.vocabTestHistory
        : (loadData('vocab-test-history') || []);

    // Show "no progress" only if there are no lessons AND no vocab tests
    if (lessons.length === 0 && vocabHistory.length === 0) {
        noProgressMessage.classList.remove('hidden');
        return;
    }

    noProgressMessage.classList.add('hidden');
    // Render vocabulary test results at the top

    if (vocabHistory.length > 0) {
        // Sort by score percentage (highest first)
        vocabHistory.sort((a, b) => {
            const percentA = (a.score / a.totalVocab) * 100;
            const percentB = (b.score / b.totalVocab) * 100;
            return percentB - percentA;
        });

        const vocabSection = document.createElement('div');
        vocabSection.className = 'mb-8 p-6 bg-surface rounded-lg shadow-md';
        vocabSection.innerHTML = `
            <h2 class="text-2xl font-bold text-neutral-800 border-b pb-2 mb-4">Ordtestresultater</h2>
            <ul class="space-y-2">
                ${vocabHistory.slice(0, 10).map(result => {
            const percentage = Math.round((result.score / result.totalVocab) * 100);
            const date = new Date(result.timestamp).toLocaleDateString('no-NO', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            const scoreClass = percentage >= 80 ? 'text-success-600' : percentage >= 60 ? 'text-primary-600' : 'text-neutral-600';
            return `
                        <li class="flex justify-between items-center py-2 border-b border-neutral-200">
                            <span class="text-neutral-700">${date}</span>
                            <div class="text-right">
                                <span class="font-bold ${scoreClass}">${result.score} / ${result.totalVocab} (${percentage}%)</span>
                                ${result.genderTotal > 0 ? `<div class="text-xs text-neutral-500">Kjønn: ${result.genderPercentage}% (${result.genderCorrectCount}/${result.genderTotal})</div>` : ''}
                            </div>
                        </li>
                    `;
        }).join('')}
            </ul>
        `;
        container.appendChild(vocabSection);
    }

    lessons.forEach(lessonId => {
        const lessonProgress = progressData[lessonId];
        const exerciseData = EXERCISE_DATABASE[lessonId];
        if (!exerciseData) return;

        const lessonElement = document.createElement('div');
        lessonElement.className = 'bg-surface p-6 rounded-lg shadow-md';
        lessonElement.innerHTML = `
            <h2 class="text-2xl font-bold text-neutral-800 border-b pb-2 mb-4">Leksjon ${lessonId}</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${renderTestProgress(lessonProgress.tests || [], exerciseData.tests)}
            </div>
        `;
        container.appendChild(lessonElement);
    });
}

/**
 * Rendrer testprogresjon for en leksjon
 * @param {Array} completedTests - Array av fullførte tester
 * @param {Array} requiredTests - Array av påkrevde tester
 * @returns {string} HTML for testprogresjon
 */
function renderTestProgress(completedTests, requiredTests) {
    if (!requiredTests || requiredTests.length === 0) {
        return '<div><h3 class="font-bold text-lg text-neutral-700">Tester</h3><p class="text-neutral-500">Ingen tester for denne leksjonen.</p></div>';
    }

    let html = '<div><h3 class="font-bold text-lg text-neutral-700 mb-2">Fullførte Tester</h3><ul class="space-y-2">';
    requiredTests.forEach(testType => {
        const completedTest = completedTests.find(t => t.type === testType);
        const isCompleted = !!completedTest;
        const testName = {
            'leksjon': 'Leksjonstest',
            'kapittel': 'Kapitteltest',
            'kumulativ': 'Kumulativ test'
        }[testType];

        html += `
            <li class="flex items-center justify-between">
                <div class="flex items-center">
                    <span class="w-5 h-5 rounded-full mr-3 flex items-center justify-center ${isCompleted ? 'bg-success-500' : 'bg-neutral-300'}">
                        ${isCompleted ? '<svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>' : ''}
                    </span>
                    <span class="${isCompleted ? 'text-neutral-800' : 'text-neutral-500'}">${testName}</span>
                </div>
                ${isCompleted ? `<span class="font-bold text-primary-700">${completedTest.score} / ${completedTest.total}</span>` : ''}
            </li>
        `;
    });
    html += '</ul></div>';
    return html;
}

// Set up event listeners for achievements and curriculum events
if (typeof document !== 'undefined') {
    // Listen for progress updates from achievements.js
    document.addEventListener('progress-updated', () => {
        renderAllLessonProgress();
    });

    // Listen for curriculum changes from curriculum.js
    // Listen for curriculum changes from curriculum.js
    // Note: renderAllLessonProgress is now called manually after content reload in main.js
    // so we don't need to listen for curriculum-changed here to avoid double rendering/race conditions
    // document.addEventListener('curriculum-changed', () => {
    //    renderAllLessonProgress();
    // });
}
