import { saveData, loadData, logProgress, getProgressData, EXERCISE_DATABASE, REGULAR_EXERCISES_EVENT } from './progress/index.js';
import { loadContent } from './utils/content-loader.js';
// Tooltip system moved to separate module
export { setupInteractiveTooltips, setupWordLookups, setupGrammarTermLookups } from './utils/word-tooltips.js';
import { isLessonUnlocked, PRONOUN_UNLOCK_LEVELS } from './utils.js';
import { debug } from './logger.js';
import { initI18n, t } from './utils/i18n.js';
import { getCurriculumConfig, getCurriculumTabs } from './progress/curriculum-registry.js';
import { getActiveCurriculum } from './progress/store.js';

/**
 * @file ui.js
 * This file contains functions for dynamically creating and managing UI components.
 */

// Initialize i18n on load - respect body's data-ui-language attribute
document.addEventListener('DOMContentLoaded', () => {
    const locale = document.body?.dataset?.uiLanguage || 'no';
    initI18n(locale);
});

let deferredPrompt; // For PWA installation
let lastFocusedTextElement = null;
// Tooltip system moved to separate module
/**
 * Creates a standardized "Landeskunde" (culture) section.
 * @param {string} content.title - The title of the fact box (e.g., "Visste du at...?").
 * @param {string} content.body - The main HTML content of the fact box.
 * @param {string} [content.intro] - Optional introductory paragraph before the fact box.
 * @param {string} [content.lesson] - Optional lesson name to display.
 * @param {boolean} [isLessonPage=false] - Flag to determine if it's a lesson page or the main list.
 * @returns {HTMLElement} The complete Landeskunde section element.
 */
export function createLandeskundeSection(content, isLessonPage = false) {
    const container = document.createElement('div');
    container.className = 'bg-surface p-6 rounded-xl shadow-sm';

    const introText = isLessonPage && content.intro ? content.intro : '';
    const titleIcon = content.title.startsWith('💡') ? '' : '💡 ';
    const lessonInfo = !isLessonPage && content.lesson ? `<p class="text-sm text-neutral-500 mb-2">${content.lesson}</p>` : '';

    container.innerHTML = `
        ${isLessonPage ? `<h2 class="text-2xl font-bold text-primary-700 mb-4">${t('culture_title', 'Kultur (Landeskunde)')}</h2>` : ''}
        ${introText ? `<p class="mb-4">${introText}</p>` : ''}
        <div class="bg-neutral-100 border-l-4 border-primary-500 p-4 rounded-r-lg">
            ${lessonInfo}
            <div class="prose max-w-none">
                <h3 class="font-bold text-lg mt-0">${titleIcon}${content.title}</h3>
                <div class="mt-2 text-neutral-700">
                    ${content.body}
                </div>
            </div>
        </div>
    `;
    return container;
}

/**
 * Automatically sets up landeskunde sections for lesson pages.
 * Looks for a placeholder element and replaces it with the appropriate content.
 */
export async function setupLandeskunde() {
    const placeholder = document.getElementById('landeskunde-placeholder');
    if (!placeholder) return;

    const lessonId = document.body.dataset.chapterId;
    if (!lessonId) return;

    try {
        const content = await loadContent();
        const cultureContent = content.cultureData[lessonId];

        if (cultureContent) {
            placeholder.replaceWith(createLandeskundeSection(cultureContent, true));
        }
    } catch (error) {
        console.error('Error loading landeskunde data:', error);
    }
}

/**
 * Creates a pronunciation (Uttale/Aussprache) section.
 * @param {Object} content - The pronunciation content
 * @param {string} content.title - The title (e.g., "Uttale (Aussprache)")
 * @param {string} content.intro - Introductory text
 * @param {string} content.audioFile - Path to the audio file
 * @param {string} content.audioType - MIME type of the audio file
 * @param {Array} content.sounds - Array of sound explanations
 * @param {string} [content.layout] - Layout type: "single" for one column, default is two columns
 * @returns {HTMLElement} The complete Uttale section element
 */
export function createUttaleSection(content) {
    const container = document.createElement('div');
    container.className = 'bg-surface p-6 rounded-xl shadow-sm';

    // Determine grid layout
    const gridClass = content.layout === 'single' ? 'grid-cols-1' : 'md:grid-cols-2';

    // Build sounds HTML
    let soundsHTML = '';
    if (content.sounds && content.sounds.length > 0) {
        soundsHTML = `
            <div class="grid ${gridClass} gap-4">
                ${content.sounds.map(sound => `
                    <div class="bg-primary-100/60 p-4 rounded-lg">
                        ${sound.heading ? `<h3 class="font-bold text-lg">${sound.heading}</h3>` : ''}
                        ${sound.explanation ? `<p>${sound.explanation}</p>` : ''}
                        ${sound.examples ? `<p class="mt-2 font-semibold">${sound.examples}</p>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }

    container.innerHTML = `
        <h2 class="text-2xl font-bold text-primary-700 mb-4">${content.title}</h2>
        ${content.intro ? `<p class="mb-4">${content.intro}</p>` : ''}
        ${content.audioFile ? `
            <audio controls class="w-full mb-6">
                <source src="${content.audioFile}" type="${content.audioType || 'audio/mpeg'}">
                ${t('audio_not_supported')}
            </audio>
        ` : ''}
        ${soundsHTML}
    `;

    return container;
}

/**
 * Automatically sets up uttale (pronunciation) sections for lesson pages.
 * Looks for a placeholder element and replaces it with the appropriate content.
 */
export async function setupUttale() {
    const placeholder = document.getElementById('uttale-placeholder');
    if (!placeholder) return;

    const lessonId = document.body.dataset.chapterId;
    if (!lessonId) return;

    try {
        const content = await loadContent();
        const pronunciationContent = content.pronunciationData[lessonId];

        if (pronunciationContent) {
            placeholder.replaceWith(createUttaleSection(pronunciationContent));
        }
    } catch (error) {
        console.error('Error loading uttale data:', error);
    }
}

function getLessonExerciseStatus(lessonId) {
    if (!lessonId) {
        return {
            exercises: {},
            completedRegular: 0,
            requiredRegular: 0,
            hasExtraTab: false,
            isUnlocked: false
        };
    }

    const progress = getProgressData();
    const lessonProgress = progress[lessonId] || {};
    const exercises = lessonProgress.exercises || {};
    const exerciseData = EXERCISE_DATABASE[lessonId] || { exercises: 0, extraExercises: 0 };

    // Count completed regular exercises (exercises is now an object: { "ovelse-1-3-1": true, ... })
    const completedRegular = Object.entries(exercises)
        .filter(([exerciseId, completed]) =>
            completed === true && !exerciseId.includes('ekstra')
        ).length;

    const requiredRegular = exerciseData.exercises || 0;
    const hasExtraTabConfigured = (exerciseData.extraExercises || 0) > 0;
    const hasExtraTabElement = Boolean(document.getElementById('extra-exercises'));
    const hasExtraTab = hasExtraTabConfigured && hasExtraTabElement;
    const isUnlocked = requiredRegular === 0 || completedRegular >= requiredRegular;

    return { exercises, completedRegular, requiredRegular, hasExtraTab, isUnlocked };
}

function applyExtraTabLock(lessonId) {
    const extraTabButton = document.querySelector(".tab-button[data-tab-id='extra-exercises']");
    const extraTabContent = document.getElementById('extra-exercises');
    const nextButton = document.querySelector(".next-tab-btn[data-next-tab='extra-exercises']");
    const ovelserTab = document.getElementById('exercises');

    if (!extraTabButton || !extraTabContent) {
        if (nextButton) {
            nextButton.classList.remove('pointer-events-none', 'opacity-50', 'cursor-not-allowed');
            nextButton.removeAttribute('aria-disabled');
            delete nextButton.dataset.locked;
            if (nextButton.dataset.originalLabel) {
                nextButton.textContent = nextButton.dataset.originalLabel;
            }
        }
        return;
    }

    const { hasExtraTab, isUnlocked } = getLessonExerciseStatus(lessonId);

    const shouldUnlock = isUnlocked;

    if (!hasExtraTab) {
        extraTabButton.classList.add('hidden');
        extraTabButton.dataset.locked = 'true';
        extraTabContent.classList.add('hidden');
        extraTabContent.dataset.locked = 'true';
        if (nextButton) {
            nextButton.classList.add('hidden');
            nextButton.dataset.locked = 'true';
        }
        return;
    }

    if (shouldUnlock) {
        console.log(`🔓 Unlocking extra exercises UI elements for lesson ${lessonId}`);
        extraTabButton.classList.remove('hidden');
        delete extraTabButton.dataset.locked;
        delete extraTabContent.dataset.locked;

        if (nextButton) {
            nextButton.classList.remove('hidden');
            delete nextButton.dataset.locked;
            nextButton.classList.remove('pointer-events-none', 'opacity-50', 'cursor-not-allowed');
            nextButton.removeAttribute('aria-disabled');
            if (nextButton.dataset.originalLabel) {
                nextButton.textContent = nextButton.dataset.originalLabel;
            }
        }

        // Remove lock message from exercises tab if it exists
        if (ovelserTab) {
            const existingLockMessage = ovelserTab.querySelector('.extra-tab-lock-message');
            if (existingLockMessage) {
                existingLockMessage.remove();
            }

            // Add navigation button(s) to extra exercises tab
            const existingNavButton = ovelserTab.querySelector('.extra-tab-nav-button');
            if (!existingNavButton) {
                const hasJeopardy = !!document.getElementById('jeopardy-game-container');
                const navButton = document.createElement('div');
                navButton.className = 'extra-tab-nav-button mt-8 p-6 bg-neutral-100/60 rounded-lg';

                if (hasJeopardy) {
                    // Show both buttons side-by-side
                    navButton.innerHTML = `
                        <div class="flex flex-col lg:flex-row gap-4">
                            <div class="flex-1 text-center">
                                <div class="mb-3">
                                    <div class="inline-flex items-center gap-2 text-neutral-600 font-medium mb-2">
                                        <span class="text-2xl">✏️</span>
                                        <span>${t('msg_need_more_practice')}</span>
                                    </div>
                                </div>
                                <button data-next-tab="extra-exercises" class="next-tab-btn w-full bg-info-500 text-white font-bold py-3 px-5 rounded-lg hover:bg-info-600 transition-colors">
                                    ${t('btn_next_extra_exercises')}
                                </button>
                            </div>
                            <div class="flex-1 text-center">
                                <div class="mb-3">
                                    <div class="inline-flex items-center gap-2 text-neutral-600 font-medium mb-2">
                                        <span class="text-2xl">🎮</span>
                                        <span>${t('msg_test_yourself_game')}</span>
                                    </div>
                                </div>
                                <button data-next-tab="dialog" class="next-tab-btn w-full bg-primary-500 text-white font-bold py-3 px-5 rounded-lg hover:bg-primary-600 transition-colors">
                                    Spill Jeopardy →
                                </button>
                            </div>
                        </div>
                    `;
                } else {
                    // Show only extra exercises button (centered)
                    navButton.classList.add('text-center');
                    navButton.innerHTML = `
                        <button data-next-tab="extra-exercises" class="next-tab-btn bg-info-500 text-white font-bold py-3 px-5 rounded-lg hover:bg-info-600 transition-colors">
                            ${t('btn_next_extra_exercises')}
                        </button>
                    `;
                }

                // Add event listeners to all dynamically created buttons
                const buttons = navButton.querySelectorAll('.next-tab-btn');
                buttons.forEach(button => {
                    button.addEventListener('click', () => {
                        if (button.dataset.locked === 'true') {
                            return;
                        }

                        const nextTabId = button.dataset.nextTab;
                        if (!nextTabId) {
                            return;
                        }

                        // Special handling for dialog tab - unhide it when accessed
                        if (nextTabId === 'dialog') {
                            const dialogButton = document.querySelector(`.tab-button[data-tab-id='dialog']`);
                            if (dialogButton && dialogButton.classList.contains('hidden')) {
                                dialogButton.classList.remove('hidden');
                            }
                            // Save that dialog was accessed for this lesson
                            const chapterId = document.body.dataset.chapterId;
                            if (chapterId) {
                                saveData(`dialog-accessed-${chapterId}`, true);
                            }
                        }

                        const targetButton = document.querySelector(`.tab-button[data-tab-id='${nextTabId}']`);
                        const isLocked = targetButton && targetButton.dataset.locked === 'true';
                        if (isLocked) {
                            return;
                        }

                        showTab(nextTabId, true);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    });
                });

                ovelserTab.appendChild(navButton);
            }
        }
    } else {
        extraTabButton.classList.add('hidden');
        extraTabButton.dataset.locked = 'true';
        extraTabContent.classList.add('hidden');
        extraTabContent.dataset.locked = 'true';

        if (nextButton) {
            nextButton.classList.add('hidden'); // Hide the button when locked
            nextButton.dataset.locked = 'true';
            if (!nextButton.dataset.originalLabel) {
                nextButton.dataset.originalLabel = nextButton.textContent.trim();
            }
            nextButton.textContent = nextButton.dataset.originalLabel; // Keep original text
            nextButton.classList.add('pointer-events-none', 'opacity-50', 'cursor-not-allowed');
            nextButton.setAttribute('aria-disabled', 'true');
        }

        // Add lock message to øvelser tab
        if (ovelserTab) {
            // Remove existing lock message if it exists
            const existingLockMessage = ovelserTab.querySelector('.extra-tab-lock-message');
            if (existingLockMessage) {
                existingLockMessage.remove();
            }

            // Remove navigation button if it exists
            const existingNavButton = ovelserTab.querySelector('.extra-tab-nav-button');
            if (existingNavButton) {
                existingNavButton.remove();
            }

            // Create and add new lock message
            const lockMessage = document.createElement('div');
            lockMessage.className = 'extra-tab-lock-message bg-info-100 border-l-4 border-info-500 p-4 rounded-lg mt-6';
            lockMessage.innerHTML = `
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        <span class="text-info-600 text-xl">🔒</span>
                    </div>
                    <div class="ml-3">
                        <p class="text-info-800 font-medium">${t('msg_extra_tab_lock')}</p>
                    </div>
                </div>
            `;
            ovelserTab.appendChild(lockMessage);
        }

        const activeButton = document.querySelector('.tab-button.active');
        if (activeButton && activeButton.dataset.tabId === 'extra-exercises') {
            const fallbackTab = document.getElementById('exercises') ? 'exercises' : 'leksjon';
            showTab(fallbackTab, false);
        }
    }
}


/**
 * Viser en custom modal for stjerne-varsel
 * @param {string} message - Meldingen som skal vises
 * @param {Function} onConfirm - Callback som kalles hvis bruker bekrefter
 * @param {Function} onCancel - Callback som kalles hvis bruker avbryter
 */
export function showStarWarningModal(message, onConfirm, onCancel) {
    const overlay = document.createElement('div');
    overlay.id = 'star-warning-overlay';
    overlay.className = 'fixed inset-0 bg-neutral-900 bg-opacity-50 z-50 flex items-center justify-center p-4';

    const modal = document.createElement('div');
    modal.className = 'bg-surface rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all duration-300 scale-100';
    modal.innerHTML = `
        <div class="p-6">
            <div class="flex items-center mb-4">
                <div class="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <span class="text-primary-600 text-xl">⚠️</span>
                </div>
                <div class="ml-3">
                    <h3 class="text-lg font-medium text-neutral-900">${t('modal_important_notice')}</h3>
                </div>
            </div>
            <div class="mb-6">
                <p class="text-sm text-neutral-600 leading-relaxed">${message}</p>
            </div>
            <div class="flex gap-3 justify-end">
                <button id="star-warning-cancel" class="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors">
                    ${t('modal_cancel')}
                </button>
                <button id="star-warning-confirm" class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md transition-colors">
                    ${t('modal_continue')}
                </button>
            </div>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const confirmBtn = modal.querySelector('#star-warning-confirm');
    const cancelBtn = modal.querySelector('#star-warning-cancel');

    function closeModal() {
        overlay.style.opacity = '0';
        modal.style.transform = 'scale(95%)';
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 300);
    }

    confirmBtn.addEventListener('click', () => {
        closeModal();
        if (onConfirm) onConfirm();
    });

    cancelBtn.addEventListener('click', () => {
        closeModal();
        if (onCancel) onCancel();
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeModal();
            if (onCancel) onCancel();
        }
    });

    const handleKeydown = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            if (onCancel) onCancel();
            document.removeEventListener('keydown', handleKeydown);
        }
    };
    document.addEventListener('keydown', handleKeydown);

    setTimeout(() => {
        overlay.style.opacity = '1';
    }, 10);
}

/**
 * Viser en "Tidligere fullført" melding hvis leksjonen har achievements men øvelser er reset
 * Dette skjer etter migrering når achievements er bevart men øvelser er nullstilt for repetisjon
 * NOTE: getProgressData() already returns curriculum-specific data for the active curriculum
 * @param {string} chapterId - Leksjons-ID (f.eks. '1-1')
 */
function showPreviouslyCompletedBanner(chapterId) {
    // Hent leksjonsprogresjon for CURRENT curriculum only
    // getProgressData() returns progress for active curriculum only
    const progressData = getProgressData();
    const lessonProgress = progressData[chapterId];

    if (!lessonProgress) return;

    const achievements = lessonProgress.achievements || { leksjon: false, exercises: false, extraExercises: false };
    const exercises = lessonProgress.exercises || {};
    const earnedDate = achievements.earnedDate;

    // Sjekk om noen achievements er opptjent
    const hasAnyAchievement = achievements.leksjon || achievements.exercises || achievements.extraExercises;

    if (!hasAnyAchievement) return;

    // Sjekk om alle øvelser er reset (false eller ikke eksisterer)
    const exerciseValues = Object.values(exercises);
    const allExercisesReset = exerciseValues.length === 0 || exerciseValues.every(val => val === false);

    if (!allExercisesReset) return;

    // VIKTIG: Kun vis banner hvis kapittelet NETTOPP ble nullstilt
    // Dette forhindrer at banneret vises ved curriculum-bytte eller andre scenarioer
    const chapterNum = chapterId.split('-')[0]; // Hent kapittel-nummer (f.eks. "1" fra "1-2")
    const resetFlag = `chapter-${chapterNum}-just-reset`;
    const wasJustReset = sessionStorage.getItem(resetFlag);

    if (!wasJustReset) return; // Ikke vis banner hvis kapittelet ikke nettopp ble nullstilt

    // Fjern flagget så banneret kun vises én gang
    sessionStorage.removeItem(resetFlag);

    // Vis banner
    const bannerContainer = document.querySelector('main');
    if (!bannerContainer) return;

    // Formater dato
    const formattedDate = earnedDate ? new Date(earnedDate).toLocaleDateString('nb-NO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }) : 'en tidligere dato';

    // Lag liste over opptjente achievements med progressive farger
    const achievementsList = [];
    if (achievements.leksjon) achievementsList.push('📗 Grønn bok (leksjon lest)');

    // Get progressive color names based on achievement count
    const getColorName = (count) => {
        if (count === 0) return 'grå';
        if (count === 1) return 'grønn';
        if (count === 2) return 'blå';
        if (count === 3) return 'rubin';
        return 'gull';
    };

    if (achievements.exercises) {
        const exercisesCount = typeof achievements.exercises === 'boolean' ? 1 : (achievements.exercises || 0);
        const colorName = getColorName(exercisesCount);
        achievementsList.push(`✏️ ${colorName.charAt(0).toUpperCase() + colorName.slice(1)} blyant (øvelser fullført ${exercisesCount} ${exercisesCount === 1 ? 'gang' : 'ganger'})`);
    }

    if (achievements.extraExercises) {
        const ekstraCount = typeof achievements.extraExercises === 'boolean' ? 1 : (achievements.extraExercises || 0);
        const colorName = getColorName(ekstraCount);
        achievementsList.push(`⭐ ${colorName.charAt(0).toUpperCase() + colorName.slice(1)} stjerne (ekstraøvelser fullført ${ekstraCount} ${ekstraCount === 1 ? 'gang' : 'ganger'})`);
    }

    const achievementsHTML = achievementsList.map(a => `<li>${a}</li>`).join('');

    const bannerHTML = `
        <div class="bg-success-50 border-l-4 border-success-500 p-6 rounded-r-xl shadow-sm mb-8 animate-fade-in" id="previously-completed-banner">
            <div class="flex items-start gap-4">
                <div class="text-3xl">✅</div>
                <div class="flex-1">
                    <h3 class="text-xl font-bold text-success-800 mb-2">Du fullførte denne leksjonen ${formattedDate}</h3>
                    <p class="text-success-700 mb-3">Dine achievements er bevart:</p>
                    <ul class="list-none space-y-1 text-success-700 mb-3">
                        ${achievementsHTML}
                    </ul>
                    <p class="text-success-600 text-sm">
                        💡 <strong>Øvelsene er tilbakestilt</strong> slik at du kan gjøre dem på nytt for repetisjon.
                        Dine achievements forblir selv om du gjør øvelsene flere ganger.
                    </p>
                </div>
            </div>
        </div>
    `;

    // Sett inn banner i Øvelser tab (ikke i Leksjon/Ordforråd/Grammatikk tabs)
    const exercisesTab = document.getElementById('exercises');
    if (exercisesTab) {
        exercisesTab.insertAdjacentHTML('afterbegin', bannerHTML);
    }

    // Hvis ekstraøvelser achievement finnes, vis også i Ekstraøvelser tab
    if (achievements.extraExercises) {
        const ekstraTab = document.getElementById('extra-exercises');
        if (ekstraTab) {
            ekstraTab.insertAdjacentHTML('afterbegin', bannerHTML);
        }
    }
}

export function renderPageHeader() {
    const placeholder = document.getElementById('page-header-placeholder');
    const pageTitle = document.title;
    const body = document.querySelector('body');
    const chapterId = body.dataset.chapterId;

    if (!placeholder || !pageTitle || !chapterId) return;

    const [mainChapter, subChapter] = chapterId.split('-');
    const lessonNumber = `${mainChapter}.${subChapter}`;
    const lessonTitle = pageTitle.split(':')[1]?.trim() || "Leksjon";

    const existingTabs = document.querySelectorAll('.tab-content');
    let tabButtonsHTML = '';

    // Config-driven tab system: read which tabs this curriculum uses
    const curriculumId = document.body.dataset.curriculumId || getActiveCurriculum();
    const configuredTabs = getCurriculumTabs(curriculumId);
    const configuredTabIds = new Set(configuredTabs.map(ct => ct.id));

    // Fallback i18n keys for standard tab IDs
    const defaultI18nKeys = {
        'leksjon': 'tab_lesson',
        'ordforrad': 'tab_vocabulary',
        'grammatikk': 'tab_grammar',
        'dialog': 'tab_dialog',
        'exercises': 'tab_exercises',
        'extra-exercises': 'tab_extra_exercises'
    };

    // Check if dialog tab was previously accessed for this lesson
    const dialogAccessKey = `dialog-accessed-${chapterId}`;
    const dialogPreviouslyAccessed = loadData(dialogAccessKey);

    existingTabs.forEach(tab => {
        const tabId = tab.id;
        // Skip removed/internal tabs
        if (tabId === 'larer') return;

        // If tab is not in the curriculum's configured tabs AND it's not a special conditional tab, hide it
        const isConditionalTab = (tabId === 'extra-exercises' || tabId === 'dialog');
        if (!configuredTabIds.has(tabId) && !isConditionalTab) {
            tab.classList.add('hidden');
            return; // Don't create a button for it
        }
        // If it's a conditional tab but not in config, also hide
        if (isConditionalTab && !configuredTabIds.has(tabId)) {
            tab.classList.add('hidden');
            return;
        }

        // Resolve tab label: config label > i18n key > fallback
        const configTab = configuredTabs.find(ct => ct.id === tabId);
        const i18nKey = configTab?.i18nKey || defaultI18nKeys[tabId];
        const i18nLabel = i18nKey ? t(i18nKey) : null;
        const tabName = configTab?.label || i18nLabel || tabId;

        // Hide Dialog tab button by default UNLESS it was previously accessed
        const shouldHideDialog = (tabId === 'dialog') && !dialogPreviouslyAccessed;
        // Hide Extra Exercises tab button by default (will be shown by applyExtraTabLock if unlocked)
        const shouldHideEkstra = (tabId === 'extra-exercises');
        const hiddenClass = (shouldHideDialog || shouldHideEkstra) ? ' hidden' : '';
        tabButtonsHTML += `<button class="tab-button${hiddenClass} text-lg font-semibold p-4 border-b-4 border-transparent hover:text-primary-600" data-tab-id="${tabId}">${tabName}</button>`;
    });

    const config = getCurriculumConfig(document.body.dataset.curriculumId || getActiveCurriculum());

    // Dynamic Home Link Generation
    // Check if we're on an international page first
    const isInternational = window.location.pathname.includes('/international/');
    let homeLink;
    if (isInternational) {
        // International lessons link back to /international/index.html
        homeLink = './index.html';
    } else {
        // Standard lessons link to the language portal (e.g. /tysk/index.html or /spansk/index.html)
        const targetLang = config.languageConfig?.dataKeys?.target || 'tysk';
        homeLink = `../../../../${targetLang}/index.html`;
    }

    const headerHTML = `
        <nav class="mb-8 flex items-center justify-between flex-wrap">
            <a href="${homeLink}" class="text-primary-600 hover:text-primary-800">${t('nav_back_to_home')}</a>
        </nav>
        <header class="text-center mb-8">
            <h1 class="text-4xl md:text-5xl font-bold text-neutral-900">${t('tab_lesson')} ${lessonNumber}: ${lessonTitle}</h1>
        </header>
        <nav class="flex justify-center border-b-2 border-neutral-200 mb-8 flex-wrap">
            ${tabButtonsHTML}
        </nav>
    `;

    placeholder.innerHTML = headerHTML;

    // Add event listener for classroom dialog button
    const dialogBtn = document.querySelector('.classroom-dialog-btn');
    if (dialogBtn) {
        dialogBtn.addEventListener('click', () => {
            // Show the dialog tab button
            const dialogButton = document.querySelector(`.tab-button[data-tab-id='dialog']`);
            if (dialogButton && dialogButton.classList.contains('hidden')) {
                dialogButton.classList.remove('hidden');
            }
            // Save that dialog was accessed for this lesson
            if (chapterId) {
                saveData(`dialog-accessed-${chapterId}`, true);
            }
            // Switch to dialog tab
            showTab('dialog', true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Show "Previously completed" message if applicable
    showPreviouslyCompletedBanner(chapterId);

    applyExtraTabLock(chapterId);
}

/**
 * Shows a custom pre-install modal explaining what PWA installation means.
 * When user clicks "Install", it triggers the actual browser install prompt.
 * @param {string} appName - The name of the app to display in the modal
 * @returns {Promise<boolean>} - True if user chose to install, false if cancelled
 */
function showPWAInstallModal(appName) {
    return new Promise((resolve) => {
        // Create modal backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'fixed inset-0 bg-neutral-900/50 z-50 flex items-center justify-center p-4';
        backdrop.id = 'pwa-install-modal-backdrop';

        // Create modal content
        const modal = document.createElement('div');
        modal.className = 'bg-surface rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto';

        modal.innerHTML = `
            <div class="p-6">
                <div class="text-center mb-6">
                    <div class="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                        <span class="text-3xl">📲</span>
                    </div>
                    <h2 class="text-2xl font-bold text-neutral-800">${t('pwa_modal_title')}</h2>
                    <p class="text-neutral-600 mt-2">${t('pwa_modal_intro', { appName: appName })}</p>
                </div>

                <div class="space-y-4 mb-6">
                    <div class="flex gap-4 items-start">
                        <div class="w-10 h-10 bg-accent2-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <span class="text-xl">📴</span>
                        </div>
                        <div>
                            <h3 class="font-semibold text-neutral-800">${t('pwa_modal_benefit_offline')}</h3>
                            <p class="text-sm text-neutral-600">${t('pwa_modal_benefit_offline_desc')}</p>
                        </div>
                    </div>

                    <div class="flex gap-4 items-start">
                        <div class="w-10 h-10 bg-success-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <span class="text-xl">🏠</span>
                        </div>
                        <div>
                            <h3 class="font-semibold text-neutral-800">${t('pwa_modal_benefit_icon')}</h3>
                            <p class="text-sm text-neutral-600">${t('pwa_modal_benefit_icon_desc')}</p>
                        </div>
                    </div>

                    <div class="flex gap-4 items-start">
                        <div class="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <span class="text-xl">⚡</span>
                        </div>
                        <div>
                            <h3 class="font-semibold text-neutral-800">${t('pwa_modal_benefit_fast')}</h3>
                            <p class="text-sm text-neutral-600">${t('pwa_modal_benefit_fast_desc')}</p>
                        </div>
                    </div>

                    <div class="flex gap-4 items-start">
                        <div class="w-10 h-10 bg-accent4-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <span class="text-xl">🔄</span>
                        </div>
                        <div>
                            <h3 class="font-semibold text-neutral-800">${t('pwa_modal_benefit_updates')}</h3>
                            <p class="text-sm text-neutral-600">${t('pwa_modal_benefit_updates_desc')}</p>
                        </div>
                    </div>
                </div>

                <div class="flex flex-col gap-3">
                    <button id="pwa-modal-install-btn" class="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-lg">
                        ${t('pwa_modal_btn_install')}
                    </button>
                    <button id="pwa-modal-cancel-btn" class="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium py-3 px-6 rounded-xl transition-colors">
                        ${t('pwa_modal_btn_cancel')}
                    </button>
                </div>
            </div>
        `;

        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);

        // Handle install button click
        const installBtn = modal.querySelector('#pwa-modal-install-btn');
        installBtn.addEventListener('click', () => {
            backdrop.remove();
            resolve(true);
        });

        // Handle cancel button click
        const cancelBtn = modal.querySelector('#pwa-modal-cancel-btn');
        cancelBtn.addEventListener('click', () => {
            backdrop.remove();
            resolve(false);
        });

        // Handle backdrop click (close modal)
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                backdrop.remove();
                resolve(false);
            }
        });

        // Handle escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                backdrop.remove();
                document.removeEventListener('keydown', handleEscape);
                resolve(false);
            }
        };
        document.addEventListener('keydown', handleEscape);
    });
}

export function setupInstallButton() {
    const installContainer = document.getElementById('install-container');
    const installBtn = document.getElementById('install-btn');

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        // Show both the container AND the button (button may have hidden class)
        if (installContainer) {
            installContainer.classList.remove('hidden');
        }
        if (installBtn) {
            installBtn.classList.remove('hidden');
        }
    });

    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                // Get app name from button text or use default
                const appName = document.title || 'appen';

                // Show custom pre-install modal first
                const userWantsToInstall = await showPWAInstallModal(appName);

                if (userWantsToInstall && deferredPrompt) {
                    // User confirmed, trigger browser's native install prompt
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    debug(`Brukerens valg: ${outcome}`);
                    deferredPrompt = null;
                    if (installContainer) {
                        installContainer.classList.add('hidden');
                    }
                }
            }
        });
    }

    window.addEventListener('appinstalled', () => {
        if (installContainer) {
            installContainer.classList.add('hidden');
        }
        deferredPrompt = null;
        debug('App ble installert!');
    });
}

export function setupTabs() {
    const tabs = document.querySelectorAll('.tab-button');
    tabs.forEach(tab => {
        tab.addEventListener('click', (event) => {
            const button = event.currentTarget;
            if (button.dataset.locked === 'true' || button.classList.contains('hidden')) {
                return;
            }

            const tabId = button.dataset.tabId;
            showTab(tabId, true);
        });
    });
}

export function showTab(tabId, shouldSave = false) {
    const tabs = document.querySelectorAll('.tab-button');
    const activeButton = document.querySelector(`.tab-button[data-tab-id='${tabId}']`);
    const activeContent = document.getElementById(tabId);

    if (activeButton && (activeButton.dataset.locked === 'true' || activeButton.classList.contains('hidden'))) {
        return;
    }

    if (activeContent && activeContent.dataset && activeContent.dataset.locked === 'true') {
        return;
    }

    const tabContents = document.querySelectorAll('.tab-content');
    const lessonId = document.body.dataset.chapterId;

    tabContents.forEach(content => {
        content.classList.add('hidden');
        content.classList.remove('active');
    });
    tabs.forEach(tab => tab.classList.remove('active'));

    if (activeContent) {
        activeContent.classList.remove('hidden');
        activeContent.classList.add('active');
    }

    if (activeButton) {
        activeButton.classList.add('active');
    }

    // Log progress for any configured tab (config-driven, not hardcoded whitelist)
    if (lessonId) {
        const currId = document.body.dataset.curriculumId || getActiveCurriculum();
        const cfgTabs = getCurriculumTabs(currId);
        const cfgTabIds = new Set(cfgTabs.map(ct => ct.id));
        // Also allow extra-exercises since it's always a valid progress tab
        cfgTabIds.add('extra-exercises');
        if (cfgTabIds.has(tabId)) {
            logProgress(lessonId, 'tabs', tabId);
        }
    }

    // Dispatch event for other components to react (e.g., refresh flashcards)
    document.dispatchEvent(new CustomEvent('tab-changed', { detail: { tabId } }));

    // Show completion icons when visiting exercises or extra-exercises tabs
    if (tabId === 'exercises' || tabId === 'extra-exercises') {
        // Import and call the function dynamically to avoid circular imports
        import('./progress/index.js').then(module => {
            module.renderExerciseCompletionIcons();
        });
    }

    if (shouldSave) {
        saveLastLocation(tabId);
    }
}

function saveLastLocation(tabId) {
    const body = document.querySelector('body');
    if (body && body.dataset.chapterId) {
        const chapterId = body.dataset.chapterId;
        const location = { chapter: chapterId, tab: tabId };
        saveData('lastLocation', location);
    }
}

export function loadLastLocation() {
    // Priority 1: Check URL parameter for deep linking
    const params = new URLSearchParams(window.location.search);
    const urlTab = params.get('tab');

    if (urlTab) {
        const targetButton = document.querySelector(`.tab-button[data-tab-id='${urlTab}']`);
        const tabExists = targetButton !== null;

        if (tabExists) {
            const isLocked = targetButton.dataset.locked === 'true' || targetButton.classList.contains('hidden');

            // Teacher mode bypasses all locks
            if (isTeacherMode() || !isLocked) {
                showTab(urlTab, false);
                return;
            }
        }
        // If tab doesn't exist or is locked for non-teachers, fall through to localStorage
    }

    // Priority 2: LocalStorage (Resume where you left off)
    const lastLocation = loadData('lastLocation');
    const body = document.querySelector('body');

    if (lastLocation && body && body.dataset.chapterId === lastLocation.chapter) {
        const targetButton = document.querySelector(`.tab-button[data-tab-id='${lastLocation.tab}']`);
        const isLocked = targetButton && (targetButton.dataset.locked === 'true' || targetButton.classList.contains('hidden'));

        if (!isLocked) {
            showTab(lastLocation.tab, false);
            return;
        }

        if (lastLocation.tab === 'extra-exercises') {
            const fallbackButton = document.querySelector(`.tab-button[data-tab-id='exercises']`);
            const fallbackLocked = fallbackButton && (fallbackButton.dataset.locked === 'true' || fallbackButton.classList.contains('hidden'));
            if (!fallbackLocked) {
                showTab('exercises', false);
                return;
            }
        }
    }

    showTab('leksjon', false);
}

export function setupNextTabButtons() {
    // Build ordered tab list from config for skipping unconfigured tabs
    const currId = document.body.dataset.curriculumId || getActiveCurriculum();
    const cfgTabs = getCurriculumTabs(currId);
    const cfgTabIds = cfgTabs.map(ct => ct.id);

    document.querySelectorAll('.next-tab-btn').forEach(button => {
        const nextTabId = button.dataset.nextTab;
        if (!nextTabId) return;

        // If the target tab doesn't exist in config, find the next configured tab
        // Tab order in template: leksjon → ordforrad → grammatikk → exercises → extra-exercises → dialog
        // extra-exercises is exempt (dynamically shown/hidden by applyExtraTabLock)
        const fullTabOrder = ['leksjon', 'ordforrad', 'grammatikk', 'exercises', 'extra-exercises', 'dialog'];
        let resolvedTab = nextTabId;
        if (!cfgTabIds.includes(nextTabId) && nextTabId !== 'extra-exercises') {
            // Find the next available tab after the target in the full order
            const targetIdx = fullTabOrder.indexOf(nextTabId);
            if (targetIdx !== -1) {
                for (let i = targetIdx + 1; i < fullTabOrder.length; i++) {
                    if (cfgTabIds.includes(fullTabOrder[i])) {
                        resolvedTab = fullTabOrder[i];
                        break;
                    }
                }
            }
            // If no configured tab found after this one, hide the button entirely
            if (resolvedTab === nextTabId) {
                button.classList.add('hidden');
                return;
            }
            // Update the button's data attribute to the resolved tab
            button.dataset.nextTab = resolvedTab;
        }

        button.addEventListener('click', () => {
            if (button.dataset.locked === 'true') {
                return;
            }

            const targetTabId = button.dataset.nextTab;
            if (!targetTabId) return;

            // Special handling for dialog/jeopardy tab - unhide it when accessed
            if (targetTabId === 'dialog') {
                const tabButton = document.querySelector(`.tab-button[data-tab-id='dialog']`);
                if (tabButton && tabButton.classList.contains('hidden')) {
                    tabButton.classList.remove('hidden');
                }
                // Save that dialog was accessed for this lesson
                const chapterId = document.body.dataset.chapterId;
                if (chapterId) {
                    saveData(`dialog-accessed-${chapterId}`, true);
                }
            }

            const targetButton = document.querySelector(`.tab-button[data-tab-id='${targetTabId}']`);
            const isLocked = targetButton && targetButton.dataset.locked === 'true';
            if (isLocked) {
                return;
            }

            showTab(targetTabId, true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

export function createSpecialCharsComponent(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Fetch characters from the active curriculum config
    const activeId = getActiveCurriculum();
    const config = getCurriculumConfig(activeId);
    const specialChars = config?.languageConfig?.specialChars || [];

    if (specialChars.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `<span class="text-sm text-neutral-600">${t('special_chars_prompt')}</span>`;

    specialChars.forEach(char => {
        const button = document.createElement('button');
        button.textContent = char;
        button.className = 'char-btn bg-neutral-200 hover:bg-neutral-300 font-serif text-lg px-3 py-1 rounded-md transition-colors';
        button.dataset.char = char;

        button.addEventListener('click', () => {
            if (lastFocusedTextElement) {
                const start = lastFocusedTextElement.selectionStart;
                const end = lastFocusedTextElement.selectionEnd;
                const value = lastFocusedTextElement.value;
                lastFocusedTextElement.value = value.substring(0, start) + char + value.substring(end);
                lastFocusedTextElement.focus();
                lastFocusedTextElement.setSelectionRange(start + 1, start + 1);
                lastFocusedTextElement.dispatchEvent(new Event('input'));
            }
        });
        container.appendChild(button);
    });
}




document.addEventListener(REGULAR_EXERCISES_EVENT, (event) => {
    const body = document.querySelector('body');
    if (!body || !event.detail || event.detail.lessonId !== body.dataset.chapterId) {
        console.log('⚠️ REGULAR_EXERCISES_EVENT ignored - lesson mismatch or missing data');
        return;
    }

    console.log(`📢 REGULAR_EXERCISES_EVENT received for lesson ${event.detail.lessonId}`);
    applyExtraTabLock(body.dataset.chapterId);
});

// Listener to track the last focused text element for the special characters component
document.addEventListener('focusin', (e) => {
    if (e.target.matches('input[type="text"], textarea')) {
        lastFocusedTextElement = e.target;
    }
});