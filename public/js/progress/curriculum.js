/**
 * =================================================================
 * CURRICULUM - Active curriculum management and UI
 * =================================================================
 *
 * This module handles switching between different curricula
 * (vg1-tysk1, us-8, etc.) and updating lesson links accordingly.
 */

import { CURRICULUM_CONFIG } from './config.js';
import { getFullProgressData, saveFullProgressData, getActiveCurriculum as getActiveCurriculumFromStore, setActiveCurriculum } from './store.js';

/**
 * Henter aktivt curriculum (f.eks. 'vg1-tysk1', 'us-8')
 * @returns {string} Aktivt curriculum ID
 */
export function getActiveCurriculum() {
    return getActiveCurriculumFromStore();
}

/**
 * Alias for backward compatibility
 * @returns {string} Aktivt curriculum ID
 */
export function getCurrentCurriculum() {
    return getActiveCurriculum();
}

/**
 * Henter konfigurasjon for et curriculum
 * @param {string} curriculumId - Curriculum ID (f.eks. 'vg1-tysk1')
 * @returns {object} Curriculum konfigurasjon
 */
export function getCurriculumConfig(curriculumId = null) {
    const id = curriculumId || getActiveCurriculum();
    return CURRICULUM_CONFIG[id] || Object.values(CURRICULUM_CONFIG)[0] || {};
}

/**
 * Bytter aktivt curriculum
 * @param {string} curriculumId - Nytt curriculum ID (f.eks. 'us-8', 'vg1-tysk1')
 */
export function switchCurriculum(curriculumId) {
    // Bruk helper fra store.js for konsistens
    setActiveCurriculum(curriculumId);

    console.log(`✅ Byttet til curriculum: ${curriculumId}`);
}

/**
 * Oppdaterer alle leksjonslenkene basert på aktivt curriculum
 */
export function updateLessonLinks() {
    const config = getCurriculumConfig();
    const filePrefix = config.filePrefix;
    const folderName = config.folderName;
    const maxChapters = config.chapters;

    // Determine language folder from config
    const langCode = config.languageConfig?.code || 'nb';
    const languageDir = config.languageDir || { 'de': 'german', 'es': 'spanish', 'fr': 'french' }[langCode] || langCode;

    // Oppdater alle leksjonslenkene
    const lessonLinks = document.querySelectorAll('.leksjon-link[data-leksjon-id]');
    lessonLinks.forEach(link => {
        const lessonId = link.dataset.leksjonId;
        const [chapter, lesson] = lessonId.split('-').map(Number);

        // Skjul leksjoner som er utenfor curriculum sitt kapittelområde
        const chapterContainer = link.closest('.mb-12');
        if (chapter > maxChapters) {
            if (chapterContainer) {
                chapterContainer.style.display = 'none';
            }
        } else {
            if (chapterContainer) {
                chapterContainer.style.display = '';
            }
            // Oppdater href med riktig prefix og mappestruktur
            link.href = `content/${languageDir}/lessons/${folderName}/${filePrefix}-${lessonId}.html`;
        }
    });

    console.log(`✅ Oppdaterte leksjonslenkene med prefix: ${filePrefix} (kapittel 1-${maxChapters})`);
}

/**
 * Setter opp curriculum selector på index.html
 */
export function setupCurriculumSelector() {
    const selector = document.getElementById('curriculum-selector');
    if (!selector) return;

    // Sett valgt curriculum til aktivt curriculum
    const activeCurriculum = getActiveCurriculum();
    selector.value = activeCurriculum;

    // Update main title on load
    const mainTitle = document.getElementById('main-app-title');
    if (mainTitle) {
        const config = getCurriculumConfig(activeCurriculum);
        // Special case: simpler title for standard VG1
        if (activeCurriculum === 'tysk1-vg1') {
            mainTitle.textContent = 'Wir sprechen Deutsch 1';
        } else {
            mainTitle.textContent = config.title;
        }
    }

    // Oppdater leksjonslenkene ved første lasting
    updateLessonLinks();

    // Lytt til endringer
    selector.addEventListener('change', (e) => {
        const newCurriculum = e.target.value;

        // Bytt curriculum
        switchCurriculum(newCurriculum);

        // Update main title
        if (mainTitle) {
            const config = getCurriculumConfig(newCurriculum);
            if (newCurriculum === 'tysk1-vg1') {
                mainTitle.textContent = 'Wir sprechen Deutsch 1';
            } else {
                mainTitle.textContent = config.title;
            }
        }

        // Oppdater leksjonslenkene
        updateLessonLinks();

        // Oppdater visning av leksjoner (progress icons)
        // This will be dispatched as an event to avoid circular dependency
        if (typeof document !== 'undefined') {
            document.dispatchEvent(new CustomEvent('curriculum-changed', {
                detail: { curriculumId: newCurriculum }
            }));
        }

        // Vis melding til bruker
        showCurriculumSwitchNotification(newCurriculum);
    });
}

/**
 * Viser melding når curriculum byttes
 * @param {string} curriculumId - Nytt curriculum ID
 */
function showCurriculumSwitchNotification(curriculumId) {
    const curriculumNames = {
        'us-8': 'Wir sprechen 8 (8. klasse)',
        'us-9': 'Wir sprechen 9 (9. klasse)',
        'us-10': 'Wir sprechen 10 (10. klasse)',
        'tysk1-vg1': 'Wir sprechen Deutsch 1 VG1',
        'tysk1-vg2': 'Wir sprechen Deutsch 1 VG2',
        'tysk2-vg1': 'Wir sprechen Deutsch 2 VG1',
        'tysk2-vg2': 'Wir sprechen Deutsch 2 VG2'
    };

    const toast = document.createElement('div');
    toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-info-600 text-white px-6 py-4 rounded-lg shadow-xl';
    toast.innerHTML = `
        <div class="flex items-center gap-3">
            <span class="text-2xl">🔄</span>
            <div>
                <div class="font-bold">Byttet til ${curriculumNames[curriculumId]}</div>
                <div class="text-sm opacity-90">Ordforrådet ditt er bevart. Din fremdrift vises nå for dette nivået.</div>
            </div>
        </div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.transition = 'all 0.5s ease-out';
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-20px)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 500);
    }, 4000);
}
