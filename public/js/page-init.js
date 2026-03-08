/**
 * Page Initialization Module
 * Contains page-specific initialization functions for different pages
 */

import { safeExecute, safeExecuteAsync, ErrorType } from './error-handler.js';
import { debug as logDebug } from './logger.js';
import { setupContinueButton, setupImportExport, renderAllLessonProgress, setupProgressPage, setupCurriculumSelector, setupChapterResetButtons, renderLessonList } from './progress/index.js';
import { setupInstallButton, renderPageHeader, setupTabs, loadLastLocation, setupNextTabButtons, setupInteractiveTooltips, setupWordLookups, setupGrammarTermLookups, setupLandeskunde, setupUttale } from './ui.js';
import { autoSetupMatchingGames, autoSetupImageMatchingGames, autoSetupFillInTasks, autoSetupTrueFalseGames, autoSetupDilemmaTasks, autoSetupDragDropTasks, setupFillInTask, setupDragDropSentenceTask, setupNumberGrid, setupNumberGrid3_3, setupColorPicker, setupChecklist, setupWritingTask, setupFlashcards, setupInteractiveClock, setupInteractiveClock23, setupInteractiveMap, initializeQuiz, setupJeopardy } from './exercises.js';
import { setupTestPage, setupLessonEndNavigation } from './test.js';
import { setupProjectPage, setupProjectPageDel2, setupProjectPageDel3 } from './project.js';
import { initializeVocabTrainerMulti, setupVocabTrainerSingleLesson } from './vocab-trainer-multi/index.js';
import { VocabProfileService } from './core/VocabProfileService.js';
import { BlobAdapter } from './core/adapters/BlobAdapter.js';
import { loadContent } from './utils/content-loader.js';
import { loadLessonContent } from './lessons-content-loader.js';
import { loadGrammatikkInnhold } from './grammar-content-loader.js';
import { loadExercisesContent } from './exercises-content-loader.js';
import { loadClassroomDialog } from './dialog/classroom-dialog-loader.js';

import { configureTooltips } from './utils/word-tooltips.js';
import { getCurriculumConfig, getCurriculumTabs } from './progress/curriculum-registry.js';
import { getActiveCurriculum } from './progress/store.js';

// AbortControllers for cleanup of event listeners
let homePageController = null;
let lessonPageController = null;

/**
 * Initialize the home page (index.html)
 */
export async function initHomePage() {
    // Abort any previous listeners to prevent accumulation
    if (homePageController) {
        homePageController.abort();
    }
    homePageController = new AbortController();
    const { signal } = homePageController;

    setupContinueButton();
    setupImportExport();
    setupInstallButton();
    setupCurriculumSelector();

    // Initial render of lesson list
    const content = await safeExecuteAsync(() => loadContent(), { type: ErrorType.NETWORK, userMessage: 'Kunne ikke laste innholdet.' });
    if (content) {
        renderLessonList(content.lessonsData, content.chapterTitles);
    }

    renderAllLessonProgress();
    setupChapterResetButtons();

    // Handle curriculum changes - re-render the entire list
    document.addEventListener('curriculum-changed', async () => {
        const newContent = await safeExecuteAsync(() => loadContent(), { type: ErrorType.NETWORK, showToast: false });
        if (newContent) {
            renderLessonList(newContent.lessonsData, newContent.chapterTitles);
            renderAllLessonProgress();
            setupChapterResetButtons();
            setupContinueButton();
        }
    }, { signal });

    // Handle curriculum changes from other tabs (e.g. Ordtrener)
    window.addEventListener('storage', (e) => {
        if (e.key === 'progressData') {
            const data = JSON.parse(e.newValue);
            const activeCurriculum = data.studentProfile?.activeCurriculum;
            if (activeCurriculum) {
                // Dispatch event to trigger existing update logic
                document.dispatchEvent(new CustomEvent('curriculum-changed', {
                    detail: { curriculumId: activeCurriculum }
                }));
            }
        }
    }, { signal });
}

import { AppShell } from './layout/shell.js';

/**
 * Initialize a lesson page
 */
export async function initLessonPage() {
    // Abort any previous listeners to prevent accumulation
    if (lessonPageController) {
        lessonPageController.abort();
    }
    lessonPageController = new AbortController();
    const { signal } = lessonPageController;

    logDebug('🎯 LESSON PAGE DETECTED - Starting initialization...');

    // Resolve language, title, and theme from curriculum config (no hardcoded maps)
    const earlyConfig = getCurriculumConfig(getActiveCurriculum());
    const language = earlyConfig?.languageConfig?.code || 'nb';
    const appTitle = earlyConfig?.title || 'Papertek';
    const theme = earlyConfig?.theme || 'default';

    // Explicitly initialize AppShell to ensure language consistency
    // Note: isLessonPage=true skips the full header, install button, and curriculum selector
    const shell = new AppShell({
        appTitle: appTitle,
        language: language,
        theme: theme,
        isLessonPage: true
    });
    shell.init();

    renderPageHeader();

    // 1. Load Content Dynamically
    logDebug('📦 Loading content...');
    const content = await safeExecuteAsync(() => loadContent(), { type: ErrorType.NETWORK, userMessage: 'Kunne ikke laste innholdet.' });
    if (!content) {
        console.error('CRITICAL: Content failed to load.');
        return;
    }

    const curriculumId = getActiveCurriculum();
    const config = getCurriculumConfig(curriculumId);

    // Configure tooltips with loaded content and effective language config
    configureTooltips(content, config);

    const { wordBanks } = content;

    // Update start button text from curriculum config (replaces hardcoded Spanish/French checks)
    const startBtnText = earlyConfig?.startButtonText;
    if (startBtnText) {
        const startBtn = document.getElementById('show-german-btn');
        if (startBtn) startBtn.textContent = startBtnText;
    }

    // Load dynamic lesson content (goals, dialog, checklist)
    logDebug('📦 About to call loadLessonContent()...');
    // Pass config to loaders to ensure consistency
    await safeExecuteAsync(() => loadLessonContent(config), { type: ErrorType.EXERCISE, showToast: false });
    logDebug('📦 loadLessonContent() call completed');

    // Load dynamic grammar content
    logDebug('📦 About to call loadGrammatikkInnhold()...');
    await safeExecuteAsync(() => loadGrammatikkInnhold(config), { type: ErrorType.EXERCISE, showToast: false });
    logDebug('📦 loadGrammatikkInnhold() call completed');

    // Load dynamic exercise content
    logDebug('📦 About to call loadExercisesContent()...');
    await safeExecuteAsync(() => loadExercisesContent(config), { type: ErrorType.EXERCISE, showToast: false });
    logDebug('📦 loadExercisesContent() call completed');

    // Load dynamic classroom dialog content
    logDebug('📦 About to call loadClassroomDialog()...');
    await safeExecuteAsync(() => loadClassroomDialog(config), { type: ErrorType.EXERCISE, showToast: false });
    logDebug('📦 loadClassroomDialog() call completed');

    setupTabs();
    loadLastLocation();
    setupLessonEndNavigation();
    setupNextTabButtons();
    setupLandeskunde();
    setupUttale();
    setupInteractiveTooltips();
    setupWordLookups();
    setupGrammarTermLookups();

    // Determine if this lesson uses terms (science mode) or word banks (language mode)
    const chapterIdForTerms = document.body.dataset.chapterId;
    const currentLessonData = content.lessonsData[chapterIdForTerms];
    const hasTerms = currentLessonData?.terms && currentLessonData.terms.length > 0;
    const hasWordBanks = wordBanks && Object.keys(wordBanks.wordBank || {}).length > 0;

    if (hasTerms && document.getElementById('flashcard-container')) {
        // Science mode: render term flashcards + definition list
        loadTermsContent(currentLessonData.terms);
    } else if (document.getElementById('flashcard-container')) {
        // Language mode: vocabulary flashcards
        safeExecuteAsync(() => setupFlashcards(wordBanks), { type: ErrorType.EXERCISE, showToast: false });
    }

    // Legacy auto-setup for inline HTML exercises (skip if exercises were dynamically loaded)
    // The exercises-content-loader handles dynamic exercises — autoSetup is only for static HTML
    safeExecute(() => autoSetupMatchingGames(), { type: ErrorType.EXERCISE, showToast: false });
    safeExecute(() => autoSetupImageMatchingGames(), { type: ErrorType.EXERCISE, showToast: false });
    safeExecute(() => autoSetupFillInTasks(), { type: ErrorType.EXERCISE, showToast: false });
    safeExecute(() => autoSetupTrueFalseGames(), { type: ErrorType.EXERCISE, showToast: false });
    safeExecute(() => autoSetupDilemmaTasks(), { type: ErrorType.EXERCISE, showToast: false });
    safeExecute(() => autoSetupDragDropTasks(), { type: ErrorType.EXERCISE, showToast: false });
    safeExecute(() => initializeQuiz(), { type: ErrorType.EXERCISE, showToast: false });

    // Vocab trainer: only for language courses with actual word banks, not science terms
    if (document.getElementById('vocab-trainer-module') && hasWordBanks && !hasTerms) {
        // Create VocabProfileService and BlobAdapter for point tracking
        const vocabService = new VocabProfileService();
        const blobAdapter = new BlobAdapter(vocabService);

        // Set language on adapter based on curriculum config
        const language = config?.languageDir || (config?.languageConfig?.code === 'es' ? 'spanish' : 'german');
        blobAdapter.setLanguage(language);

        initializeVocabTrainerMulti({
            ordbank: wordBanks.wordBank,
            verbbank: wordBanks.verbbank,
            substantivbank: wordBanks.nounBank,
            adjektivbank: wordBanks.adjectiveBank,
            config: config, // Pass curriculum config for language awareness
            storageKey: 'vocab-trainer-multi',
            adapter: blobAdapter // Enable point tracking for lesson-specific training
        });
        const chapterId = document.body.dataset.chapterId;
        if (chapterId) {
            const lessonId = chapterId.replace('-', '.');
            setupVocabTrainerSingleLesson('vocab-trainer-module', lessonId);
        }
    }
    if (document.getElementById('interactive-map-container')) {
        setupInteractiveMap();
    }
    if (document.getElementById('interactive-clock-container')) {
        setupInteractiveClock();
        setupInteractiveClock23();
    }

    // Auto-refresh flashcards when switching to 'ordforrad' tab (only if tab exists in config)
    const configTabs = getCurriculumTabs(curriculumId);
    const hasOrdforradTab = configTabs.some(ct => ct.id === 'ordforrad');
    if (hasOrdforradTab && !hasTerms) {
        // Language mode: refresh vocabulary flashcards on tab switch
        document.addEventListener('tab-changed', (e) => {
            if (e.detail.tabId === 'ordforrad') {
                safeExecuteAsync(() => setupFlashcards(wordBanks), { type: ErrorType.EXERCISE, showToast: false });
            }
        }, { signal });

        // Auto-refresh when vocab is updated from the Trainer
        document.addEventListener('vocab-updated', () => {
            safeExecuteAsync(() => setupFlashcards(wordBanks), { type: ErrorType.EXERCISE, showToast: false });
        }, { signal });
    }
}

/**
 * Load begrepstrening (term training) content into the ordforrad tab.
 * Renders accordion-style term cards into #flashcard-container and a
 * scannable reference list into #vocab-trainer-module.
 *
 * Design: Terms are NOT vocabulary. Language vocab is short translations
 * (Hallo → Hei) suited for small flip-cards in a grid. Science terms are
 * conceptual definitions (1-2 sentences) that need room to breathe.
 * The accordion pattern — click to expand — is a better fit.
 *
 * @param {Array} terms - Array of { term, definition } objects
 */
function loadTermsContent(terms) {
    if (!terms || terms.length === 0) return;

    // --- 1. Accordion cards in #flashcard-container ---
    const flashcardContainer = document.getElementById('flashcard-container');
    if (flashcardContainer) {
        // Reset the container's grid classes from the vocab template
        flashcardContainer.className = '';

        // Update section header
        const parentSection = flashcardContainer.parentElement;
        if (parentSection) {
            const sectionTitle = parentSection.querySelector('h2, h3');
            if (sectionTitle) sectionTitle.textContent = 'Begrepskort';

            const introEl = parentSection.querySelector('p');
            if (introEl) introEl.textContent = 'Klikk på et begrep for å se forklaringen.';
        }

        let html = '<div class="space-y-3">';
        terms.forEach((t, i) => {
            html += `
                <div class="term-accordion" data-term-index="${i}">
                    <button class="term-accordion-header w-full flex items-center justify-between bg-surface border-2 border-primary-200 rounded-xl px-5 py-4 text-left hover:border-primary-400 hover:shadow-sm transition-all duration-200 cursor-pointer" aria-expanded="false">
                        <span class="flex items-center gap-2">
                            <span class="text-base">📘</span>
                            <span class="text-lg font-bold text-primary-700">${t.term}</span>
                        </span>
                        <span class="term-accordion-arrow text-primary-400 transition-transform duration-200 text-sm select-none">▶</span>
                    </button>
                    <div class="term-accordion-body hidden">
                        <div class="bg-primary-50 border-2 border-t-0 border-primary-200 rounded-b-xl px-5 py-4">
                            <p class="text-neutral-700 leading-relaxed">${t.definition}</p>
                        </div>
                    </div>
                </div>`;
        });
        html += '</div>';

        // Expand / collapse all buttons
        html += `
            <div class="flex gap-3 justify-center mt-4">
                <button class="term-toggle-all-btn bg-primary-100 text-primary-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-200 transition-colors" data-action="expand">
                    Vis alle forklaringer
                </button>
                <button class="term-toggle-all-btn bg-primary-100 text-primary-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-200 transition-colors" data-action="collapse">
                    Skjul alle
                </button>
            </div>`;

        flashcardContainer.innerHTML = html;

        // --- Accordion toggle logic ---
        const toggleAccordion = (accordion, forceOpen) => {
            const header = accordion.querySelector('.term-accordion-header');
            const body = accordion.querySelector('.term-accordion-body');
            const arrow = header.querySelector('.term-accordion-arrow');
            const isOpen = header.getAttribute('aria-expanded') === 'true';
            const shouldOpen = forceOpen !== undefined ? forceOpen : !isOpen;

            if (shouldOpen && !isOpen) {
                body.classList.remove('hidden');
                arrow.textContent = '▼';
                header.setAttribute('aria-expanded', 'true');
                header.classList.remove('rounded-xl');
                header.classList.add('rounded-t-xl');
            } else if (!shouldOpen && isOpen) {
                body.classList.add('hidden');
                arrow.textContent = '▶';
                header.setAttribute('aria-expanded', 'false');
                header.classList.remove('rounded-t-xl');
                header.classList.add('rounded-xl');
            }
        };

        // Wire up individual accordion headers
        flashcardContainer.querySelectorAll('.term-accordion-header').forEach(header => {
            header.addEventListener('click', () => {
                toggleAccordion(header.closest('.term-accordion'));
            });
        });

        // Wire up expand/collapse all buttons
        flashcardContainer.querySelectorAll('.term-toggle-all-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const expand = btn.dataset.action === 'expand';
                flashcardContainer.querySelectorAll('.term-accordion').forEach(acc => {
                    toggleAccordion(acc, expand);
                });
            });
        });
    }

    // --- 2. Definition list in #vocab-trainer-module ---
    const trainerModule = document.getElementById('vocab-trainer-module');
    if (trainerModule) {
        // Update section header
        const trainerParent = trainerModule.parentElement;
        if (trainerParent) {
            const sectionTitle = trainerParent.querySelector('h2, h3');
            if (sectionTitle) sectionTitle.textContent = 'Begrepsreferanse';

            const introEl = trainerParent.querySelector('p');
            if (introEl) introEl.textContent = 'Oversikt over alle begreper i denne leksjonen.';
        }

        let html = '<dl class="space-y-4">';
        terms.forEach(t => {
            html += `
                <div class="border-b border-neutral-200 pb-3">
                    <dt class="font-bold text-primary-700 text-lg">${t.term}</dt>
                    <dd class="text-neutral-600 mt-1 ml-4">${t.definition}</dd>
                </div>`;
        });
        html += '</dl>';

        trainerModule.innerHTML = html;
    }

    // --- 3. Hide language-specific UI that doesn't apply to science terms ---
    const showGermanBtn = document.getElementById('show-german-btn');
    const showNorwegianBtn = document.getElementById('show-norwegian-btn');
    if (showGermanBtn) showGermanBtn.style.display = 'none';
    if (showNorwegianBtn) showNorwegianBtn.style.display = 'none';
}

/**
 * Initialize the progress page
 */
export function initProgressPage() {
    setupProgressPage();
}

/**
 * Initialize the test page
 */
export function initTestPage() {
    setupTestPage();
}

/**
 * Initialize project pages
 */
export function initProjectPages() {
    if (document.getElementById('projekt-del1-container')) setupProjectPage();
    if (document.getElementById('projekt-del2-container')) setupProjectPageDel2();
    if (document.getElementById('projekt-del3-container')) setupProjectPageDel3();
}

/**
 * Initialize common exercises that may appear on any page
 */
export function initCommonExercises() {
    if (document.getElementById('interactive-clock-2-3')) {
        setupInteractiveClock23();
    }

    // Drag-drop sentence tasks (check for global variables)
    if (typeof window.dragDropSentences !== 'undefined') {
        setupDragDropSentenceTask('extra-exercise-6-2-1', window.dragDropSentences);
    }
    if (typeof window.schoolDragDropSentences !== 'undefined') {
        setupDragDropSentenceTask('extra-exercise-9-2-1', window.schoolDragDropSentences);
    }
    if (typeof window.shoppingDragDropSentences !== 'undefined') {
        setupDragDropSentenceTask('drag-drop-shopping-task', window.shoppingDragDropSentences);
    }
    if (typeof window.weekdayDragDropSentences !== 'undefined') {
        setupDragDropSentenceTask('drag-drop-weekdays-task', window.weekdayDragDropSentences);
    }
    if (typeof window.dayDragDropSentences !== 'undefined') {
        setupDragDropSentenceTask('drag-drop-day-task', window.dayDragDropSentences);
    }

    // Setup Jeopardy game if container exists
    const jeopardyContainer = document.getElementById('jeopardy-game-container');
    if (jeopardyContainer) {
        const chapterId = document.body.dataset.chapterId;
        if (chapterId) {
            const chapterNum = chapterId.split('-')[0];
            import(`./exercises-data/chapter-${chapterNum}.js`)
                .then(module => {
                    const lessonData = module.exercisesData[chapterId];
                    if (lessonData && lessonData.jeopardy) {
                        setupJeopardy('jeopardy-game-container', lessonData.jeopardy);
                    }
                })
                .catch(err => {
                    console.error('Error loading Jeopardy game:', err);
                });
        }
    }

    if (document.getElementById('number-grid')) setupNumberGrid();
    if (document.getElementById('number-grid-3-3')) setupNumberGrid3_3();
    if (document.getElementById('color-picker')) setupColorPicker();
    setupChecklist();
    document.querySelectorAll('.writing-task').forEach(task => setupWritingTask(task.id));

    // Setup specific fill-in tasks for lesson 3-1
    if (document.getElementById('extra-exercise-1-familie')) {
        setupFillInTask('extra-exercise-1-familie');
    }
    if (document.getElementById('extra-exercise-2-skole')) {
        setupFillInTask('extra-exercise-2-skole');
    }
    if (document.getElementById('extra-exercise-9a-kaufen')) {
        setupFillInTask('extra-exercise-9a-kaufen');
    }
    if (document.getElementById('extra-exercise-9b-brauchen')) {
        setupFillInTask('extra-exercise-9b-brauchen');
    }
    if (document.getElementById('extra-exercise-10-mogen')) {
        setupFillInTask('extra-exercise-10-mogen');
    }
    if (document.getElementById('extra-exercise-11-shopping')) {
        setupWritingTask('extra-exercise-11-shopping');
    }
}

/**
 * Detect the current page type
 * @returns {string} The page type: 'home', 'lesson', 'progress', 'test', 'project', or 'other'
 */
export function detectPageType() {
    // Home page
    if (document.getElementById('continue-btn')) {
        return 'home';
    }

    // Project pages (check before lesson page since they share some elements)
    if (document.getElementById('projekt-del1-container') ||
        document.getElementById('projekt-del2-container') ||
        document.getElementById('projekt-del3-container')) {
        return 'project';
    }

    // Lesson pages
    if (document.getElementById('page-header-placeholder')) {
        return 'lesson';
    }

    // Progress page
    if (document.getElementById('progress-container')) {
        return 'progress';
    }

    // Test page
    if (document.getElementById('test-container')) {
        return 'test';
    }

    return 'other';
}
