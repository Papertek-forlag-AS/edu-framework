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
import { getCurriculumConfig } from './progress/curriculum-registry.js';
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

    // Resolve language from URL if not already set
    const isSpanish = window.location.pathname.includes('/spanish/') || window.location.pathname.includes('/spansk/');
    const isFrench = window.location.pathname.includes('/french/') || window.location.pathname.includes('/fransk/');
    const language = isSpanish ? 'es' : (isFrench ? 'fr' : 'de');

    // Determine app title and theme based on language
    let appTitle, theme;
    if (isSpanish) {
        appTitle = "Hablamos Español 1";
        theme = "spanish";
    } else if (isFrench) {
        appTitle = "Nous parlons Français 1";
        theme = "french";
    } else {
        appTitle = "Wir sprechen Deutsch 1";
        theme = "default";
    }

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

    // Update UI labels for Spanish/French
    if (isSpanish) {
        const startTyskBtn = document.getElementById('show-german-btn');
        if (startTyskBtn) startTyskBtn.textContent = 'Start med spansk';
    } else if (isFrench) {
        const startTyskBtn = document.getElementById('show-german-btn');
        if (startTyskBtn) startTyskBtn.textContent = 'Start med fransk';
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
    safeExecute(() => loadClassroomDialog(config), { type: ErrorType.EXERCISE, showToast: false });
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

    // Initialize all exercises with error boundaries
    safeExecute(() => setupFlashcards(wordBanks), { type: ErrorType.EXERCISE, showToast: false });
    safeExecute(() => autoSetupMatchingGames(), { type: ErrorType.EXERCISE, showToast: false });
    safeExecute(() => autoSetupImageMatchingGames(), { type: ErrorType.EXERCISE, showToast: false });
    safeExecute(() => autoSetupFillInTasks(), { type: ErrorType.EXERCISE, showToast: false });
    safeExecute(() => autoSetupTrueFalseGames(), { type: ErrorType.EXERCISE, showToast: false });
    safeExecute(() => autoSetupDilemmaTasks(), { type: ErrorType.EXERCISE, showToast: false });
    safeExecute(() => autoSetupDragDropTasks(), { type: ErrorType.EXERCISE, showToast: false });
    safeExecute(() => initializeQuiz(), { type: ErrorType.EXERCISE, showToast: false });

    if (document.getElementById('vocab-trainer-module')) {
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

    // Auto-refresh flashcards when switching to 'ordforrad' tab
    document.addEventListener('tab-changed', (e) => {
        if (e.detail.tabId === 'ordforrad') {
            safeExecute(() => setupFlashcards(wordBanks), { type: ErrorType.EXERCISE, showToast: false });
        }
    }, { signal });

    // Auto-refresh when vocab is updated from the Trainer
    document.addEventListener('vocab-updated', () => {
        safeExecute(() => setupFlashcards(wordBanks), { type: ErrorType.EXERCISE, showToast: false });
    }, { signal });
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

    setupNumberGrid();
    setupNumberGrid3_3();
    setupColorPicker();
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
