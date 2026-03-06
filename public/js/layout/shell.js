/**
 * shell.js
 * Renders the common application shell (Header, Navigation, Footer, Modals)
 * Replaces hardcoded HTML in index.html files.
 */

import { renderDebugModal, setupDebugTools } from './modals.js';
import { getCurriculumConfig } from '../progress/curriculum-registry.js';
import { getActiveCurriculum, setActiveCurriculum } from '../progress/store.js';
import { t } from '../utils/i18n.js';
import { checkMediaStatus, downloadMedia, deleteMedia, getStorageInfo, formatBytes } from '../offline/download-manager.js';

export class AppShell {
    constructor(config) {
        const defaultTitles = { 'es': "Hablamos Español 1", 'fr': "Nous parlons Français 1", 'de': "Wir sprechen Deutsch 1" };
        this.appTitle = config.appTitle || defaultTitles[config.language] || config.language || 'Papertek';
        this.language = config.language || "nb";
        this.theme = config.theme || { 'es': 'spanish', 'fr': 'french', 'de': 'german' }[this.language] || 'default';
        this.uiLanguage = config.uiLanguage || 'no'; // 'no' or 'en' - UI language for translations

        // Control whether this is a lesson page (minimal header) or index page (full header)
        // Lesson pages should not show the app title, curriculum selector, or install button
        this.isLessonPage = config.isLessonPage === true; // Default false

        // Auto-calculate rootPath if not provided
        if (config.rootPath) {
            this.rootPath = config.rootPath;
        } else {
            // Heuristic: Count slashes in pathname relative to search for /content/ or portals
            const path = window.location.pathname;
            if (path.includes('/content/')) {
                // Lessons are typically 4-5 levels deep from public/
                this.rootPath = '../../../../';
            } else if (path.includes('/tysk/') || path.includes('/spansk/')) {
                this.rootPath = '../';
            } else {
                this.rootPath = './';
            }
        }
    }

    /**
     * Initialize the shell
     */
    init() {
        this.enforceLanguageConsistency();
        this.applyTheme();
        this.renderStructure();

        // Only render full header and install button on index/home pages, not lesson pages
        if (!this.isLessonPage) {
            this.renderHeader();
            this.renderInstallButton();
            this.renderToolsSection();
            this.renderFooterButtons();

            // Setup functionality
            setupDebugTools();

            // Initialize Curriculum Selector logic
            this.setupCurriculumSelector();

            // Trigger curriculum content caching after a short delay
            // (let the page render first, then cache in background)
            setTimeout(() => {
                this.triggerCurriculumCache();
            }, 2000);

            // Render offline download card after tools section
            setTimeout(() => {
                this.renderOfflineDownloadCard();
            }, 500);
        }
    }

    /**
     * Triggers the service worker to cache curriculum content in the background.
     * Shows a subtle loading indicator while caching.
     */
    triggerCurriculumCache() {
        if (!('serviceWorker' in navigator)) {
            console.log('[Shell] Service Worker not supported, skipping curriculum cache');
            return;
        }

        const curriculumId = getActiveCurriculum();
        if (!curriculumId) {
            console.log('[Shell] No active curriculum, skipping cache');
            return;
        }

        // Only cache supported curricula
        const supportedCurricula = ['tysk1-vg1', 'spansk1-vg1'];
        if (!supportedCurricula.includes(curriculumId)) {
            console.log(`[Shell] Curriculum ${curriculumId} not yet supported for offline caching`);
            return;
        }

        console.log(`[Shell] Requesting curriculum cache for: ${curriculumId}`);

        // Listen for progress messages from SW
        navigator.serviceWorker.addEventListener('message', this.handleCacheMessage.bind(this));

        // Send message to SW to start caching
        navigator.serviceWorker.ready.then(registration => {
            if (registration.active) {
                registration.active.postMessage({
                    type: 'CACHE_CURRICULUM',
                    curriculumId: curriculumId
                });
            }
        });
    }

    /**
     * Handles messages from the service worker about curriculum caching progress.
     */
    handleCacheMessage(event) {
        const data = event.data;
        if (!data) return;

        switch (data.type) {
            case 'CURRICULUM_CACHE_START':
                console.log(`[Shell] 📥 Starting to cache curriculum: ${data.curriculumId}`);
                this.showCacheIndicator(t('pwa_caching_start', 'Laster ned innhold for offline bruk...'));
                break;

            case 'CURRICULUM_CACHE_PROGRESS':
                console.log(`[Shell] 📥 Caching progress: ${data.percent}% (${data.cached}/${data.total})`);
                this.updateCacheIndicator(data.percent);
                break;

            case 'CURRICULUM_CACHE_COMPLETE':
                console.log(`[Shell] ✅ Curriculum cached: ${data.fileCount} files`);
                if (data.fromCache) {
                    // Already cached, no need to show anything
                    this.hideCacheIndicator();
                } else {
                    this.showCacheIndicator(t('pwa_caching_complete', 'Innhold lagret for offline bruk!'), true);
                    setTimeout(() => this.hideCacheIndicator(), 3000);
                }
                break;

            case 'CURRICULUM_CACHE_ERROR':
                console.error(`[Shell] ❌ Curriculum cache error: ${data.error}`);
                this.hideCacheIndicator();
                break;
        }
    }

    /**
     * Shows a subtle cache progress indicator.
     */
    showCacheIndicator(message, isComplete = false) {
        let indicator = document.getElementById('cache-progress-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'cache-progress-indicator';
            indicator.className = 'fixed bottom-4 left-4 bg-surface rounded-lg shadow-lg p-3 flex items-center gap-3 z-50 transition-all duration-300';
            indicator.innerHTML = `
                <div class="w-8 h-8 rounded-full bg-accent2-100 flex items-center justify-center">
                    <span id="cache-icon" class="text-lg">📥</span>
                </div>
                <div class="flex-1">
                    <p id="cache-message" class="text-sm font-medium text-neutral-700">${message}</p>
                    <div id="cache-progress-bar" class="h-1 bg-neutral-200 rounded-full mt-1 overflow-hidden">
                        <div id="cache-progress-fill" class="h-full bg-accent2-500 transition-all duration-300" style="width: 0%"></div>
                    </div>
                </div>
            `;
            document.body.appendChild(indicator);
        } else {
            const msgEl = indicator.querySelector('#cache-message');
            if (msgEl) msgEl.textContent = message;
        }

        if (isComplete) {
            const icon = indicator.querySelector('#cache-icon');
            const progressBar = indicator.querySelector('#cache-progress-bar');
            if (icon) icon.textContent = '✅';
            if (progressBar) progressBar.classList.add('hidden');
        }
    }

    /**
     * Updates the cache progress indicator.
     */
    updateCacheIndicator(percent) {
        const fill = document.getElementById('cache-progress-fill');
        if (fill) {
            fill.style.width = `${percent}%`;
        }
    }

    /**
     * Hides the cache progress indicator.
     */
    hideCacheIndicator() {
        const indicator = document.getElementById('cache-progress-indicator');
        if (indicator) {
            indicator.classList.add('opacity-0');
            setTimeout(() => indicator.remove(), 300);
        }
    }

    /**
     * Ensures the active curriculum matches the current portal's language.
     * Prevents "Sticky State" where a Spanish user visiting the German portal
     * sees Spanish content because of localStorage.
     */
    enforceLanguageConsistency() {
        const activeId = getActiveCurriculum();
        const activeConfig = getCurriculumConfig(activeId);
        const activeLangCode = activeConfig?.languageConfig?.code || 'nb';

        // If the current saved curriculum does not match the Portal's language...
        if (activeLangCode !== this.language) {
            console.warn(`[Shell] Language mismatch! Portal: ${this.language}, Saved: ${activeLangCode}. Switching to default.`);

            // ...Force switch to the default curriculum for this language
            let defaultId;
            switch (this.language) {
                case 'es': defaultId = 'spansk1-vg1'; break;
                case 'fr': defaultId = 'fransk1-vg1'; break;
                case 'nb': defaultId = 'naturfag-vg1'; break;
                default: defaultId = 'tysk1-vg1';
            }
            setActiveCurriculum(defaultId);
        }
    }

    applyTheme() {
        // Theme application is handled by CSS classes mostly, 
        // but we can inject specific overrides if needed (like the Spanish red override)
        if (this.theme === 'spanish') {
            const style = document.createElement('style');
            style.textContent = `
                .text-accent3-600 { color: #dc2626 !important; }
                .text-accent3-500 { color: #ef4444 !important; }
                .bg-accent3-600 { background-color: #dc2626 !important; }
                .hover\\:bg-accent3-700:hover { background-color: #b91c1c !important; }
                .bg-accent3-500 { background-color: #ef4444 !important; }
                .border-accent3-500 { border-color: #ef4444 !important; }
                .hover\\:ring-accent3-500:hover { --tw-ring-color: #ef4444 !important; }
                
                /* Amber overrides (for Continue buttons etc) */
                .bg-primary-500 { background-color: #ea580c !important; } /* Orange-600 */
                .hover\\:bg-primary-600:hover { background-color: #c2410c !important; } /* Orange-700 */
                .text-primary-500 { color: #ea580c !important; }
                .border-primary-500 { border-color: #ea580c !important; }
            `;
            document.head.appendChild(style);
        } else if (this.theme === 'french') {
            const style = document.createElement('style');
            style.textContent = `
                /* French Theme: Blue, White, Red */
                .text-accent3-600 { color: #002395 !important; } /* French Blue */
                .text-accent3-500 { color: #002395 !important; }
                .bg-accent3-600 { background-color: #002395 !important; }
                .hover\\:bg-accent3-700:hover { background-color: #001b73 !important; }
                .bg-accent3-500 { background-color: #ed2939 !important; } /* French Red for secondary */
                .border-accent3-500 { border-color: #ed2939 !important; }
                .hover\\:ring-accent3-500:hover { --tw-ring-color: #ed2939 !important; }
                
                /* Amber overrides */
                .bg-primary-500 { background-color: #ed2939 !important; } /* Red for action buttons */
                .hover\\:bg-primary-600:hover { background-color: #c41e2b !important; }
                .text-primary-500 { color: #ed2939 !important; }
                .border-primary-500 { border-color: #002395 !important; }
            `;
            document.head.appendChild(style);
        }
    }

    renderStructure() {
        const body = document.body;
        // Ensure container exists
        if (!document.querySelector('.container')) {
            body.innerHTML = `<div class="container relative mx-auto p-4 sm:p-6 md:p-8"></div>`;
        }

        // Inject Modals relative to body
        const debugModalHTML = renderDebugModal();

        // Append modals to body if not present
        if (!document.getElementById('debug-modal')) {
            const div = document.createElement('div');
            div.innerHTML = debugModalHTML;
            body.appendChild(div.firstElementChild);
        }
    }

    renderHeader() {
        const container = document.querySelector('.container');
        const header = document.createElement('header');
        header.className = "text-center my-8 md:my-12";

        // Determine active curriculum (should be corrected by enforceLanguageConsistency now)
        const activeId = getActiveCurriculum();

        // Selector HTML (Simplified for PoC - can be made fully dynamic from Registry later)
        let selectorOptions = '';
        if (this.language === 'es') {
            // Spanish portal - only Spanish curricula available
            selectorOptions = `
                 <optgroup label="${t('curriculum_spansk_label')}">
                    <option value="spansk1-vg1" selected>${t('curriculum_spansk1_vg1')}</option>
                </optgroup>

            `;
        } else if (this.language === 'fr') {
            // French portal
            selectorOptions = `
                 <optgroup label="${t('curriculum_fransk_label')}">
                    <option value="fransk1-vg1" selected>${t('curriculum_fransk1_vg1')}</option>
                </optgroup>
            `;
        } else if (this.uiLanguage === 'en') {
            // International (English UI) - only A1 level available for now
            selectorOptions = `
                <optgroup label="${t('curriculum_international_label')}">
                    <option value="tysk1-vg1" selected>${t('curriculum_international_a1')}</option>
                </optgroup>
            `;
        } else {
            // Norwegian portal - all German curricula available
            selectorOptions = `
                <optgroup label="${t('curriculum_us_label')}">
                    <option value="us-8" ${activeId === 'us-8' ? 'selected' : ''}>${t('curriculum_us_8')}</option>
                    <option value="us-9" ${activeId === 'us-9' ? 'selected' : ''}>${t('curriculum_us_9')}</option>
                    <option value="us-10" ${activeId === 'us-10' ? 'selected' : ''}>${t('curriculum_us_10')}</option>
                </optgroup>
                <optgroup label="${t('curriculum_vg_tysk1_label')}">
                    <option value="tysk1-vg1" ${activeId === 'tysk1-vg1' ? 'selected' : ''}>${t('curriculum_tysk1_vg1')}</option>
                    <option value="tysk1-vg2" ${activeId === 'tysk1-vg2' ? 'selected' : ''}>${t('curriculum_tysk1_vg2')}</option>
                </optgroup>
                <optgroup label="${t('curriculum_vg_tysk2_label')}">
                    <option value="tysk2-vg1" ${activeId === 'tysk2-vg1' ? 'selected' : ''}>${t('curriculum_tysk2_vg1')}</option>
                    <option value="tysk2-vg2" ${activeId === 'tysk2-vg2' ? 'selected' : ''}>${t('curriculum_tysk2_vg2')}</option>
                </optgroup>
             `;
        }

        const accentColor = this.theme === 'spanish' ? 'red' : (this.theme === 'french' ? 'indigo' : 'amber'); // Border color logic

        header.innerHTML = `
            <h1 id="main-app-title" class="text-5xl md:text-6xl font-bold text-neutral-900">${this.appTitle}</h1>
            <div class="mt-6 flex flex-col items-center gap-3">
                <label for="curriculum-selector" class="text-sm font-medium text-neutral-600">
                    ${t('shell_select_level')}
                </label>
                <select id="curriculum-selector"
                    class="bg-surface border-2 border-${accentColor}-500 text-neutral-800 font-semibold py-2 px-4 rounded-lg hover:border-${accentColor}-600 focus:outline-none focus:ring-2 focus:ring-${accentColor}-500 transition-colors">
                    ${selectorOptions}
                </select>
                <p class="text-xs text-neutral-500 max-w-md">
                    ${t('shell_vocab_follows')}
                </p>
            </div>
        `;

        // Prepend header to container
        container.insertBefore(header, container.firstChild);
    }

    renderInstallButton() {
        const container = document.querySelector('.container');
        const installDiv = document.createElement('div');
        installDiv.id = "install-container";
        installDiv.className = "text-center mb-8"; // removed hidden, logic can handle that

        // Dynamic Button Colors
        const btnColor = this.theme === 'spanish' ? 'red' : (this.theme === 'french' ? 'indigo' : 'indigo');
        const continueColor = this.theme === 'spanish' ? 'amber' : (this.theme === 'french' ? 'red' : 'amber');

        let ordtrenerPath = 'ordtrener/tysk/index.html';
        if (this.language === 'es') ordtrenerPath = 'ordtrener/spansk/index.html';
        if (this.language === 'fr') ordtrenerPath = 'ordtrener/fransk/index.html';


        // All languages get both: PWA install button (hidden until ready) + link to ordtrener
        const ordtrenerBtnColor = this.language === 'es' ? 'amber' : (this.language === 'fr' ? 'blue' : 'sky');
        installDiv.innerHTML = `
            <div class="flex flex-col items-center gap-4">
                <button id="install-btn"
                    class="hidden bg-${btnColor}-600 text-white font-bold py-3 px-5 rounded-lg hover:bg-${btnColor}-700 transition-colors shadow-lg">
                    ${t('btn_install_app', { appName: this.appTitle })}
                </button>
                <a href="${this.rootPath}${ordtrenerPath}" class="inline-block bg-${ordtrenerBtnColor}-600 text-white font-bold py-3 px-5 rounded-lg hover:bg-${ordtrenerBtnColor}-700 transition-colors shadow-lg">
                    ${t('btn_go_to_vocab_trainer')}
                </a>
            </div>
        `;
        container.appendChild(installDiv);

        // Re-append Main if it exists, or create it
        let main = document.querySelector('main');
        if (!main) {
            main = document.createElement('main');
            main.innerHTML = `
                <div class="max-w-3xl mx-auto">
                    <a href="#" id="continue-btn" class="hidden mb-8 w-full block bg-${continueColor}-500 text-white text-center font-bold py-3 px-4 rounded-lg hover:bg-${continueColor}-600 transition-colors">
                        ${t('btn_continue')}
                    </a>
                    <div id="lessons-container" class="space-y-12"></div>
                </div>
            `;
            container.appendChild(main);
        } else {
            // ensure correct order if main already existed
            container.appendChild(main);
        }
    }

    renderToolsSection() {
        const mainInner = document.querySelector('main .max-w-3xl');
        if (!mainInner) return;

        const borderColor = this.theme === 'spanish' ? 'border-error-500' : (this.theme === 'french' ? 'border-accent3-500' : 'border-accent3-500');

        // NOTE: Icons omitted for brevity in this initial port, using simple SVG placeholders
        const toolColor = this.theme === 'spanish' ? 'red' : (this.theme === 'french' ? 'indigo' : 'indigo');

        // Use different paths for international pages (stay within /international/ folder)
        const isInternational = this.uiLanguage === 'en';
        const basePath = isInternational ? './' : this.rootPath;

        // Define tool links - international uses different page names
        const grammarWordlistLink = isInternational ? basePath + 'grammar-glossary.html' : this.rootPath + 'grammar-wordlist.html';
        const cultureLink = isInternational ? basePath + 'culture.html' : this.rootPath + 'landeskunde.html';
        const pronunciationLink = isInternational ? basePath + 'pronunciation.html' : this.rootPath + 'uttale.html';
        const grammarLink = isInternational ? basePath + 'grammar.html' : this.rootPath + 'grammatikk.html';
        const progressLink = isInternational ? basePath + 'progress.html' : this.rootPath + 'min-progresjon.html';
        const reviewCenterLink = isInternational ? basePath + 'review-center.html' : this.rootPath + 'repetisjon.html';

        const toolsHTML = `
            <div class="mb-12 mt-12">
                <h2 class="text-3xl font-bold text-neutral-800 mb-4 border-b-2 ${borderColor} pb-2">${t('shell_tools_resources')}</h2>
                <div class="space-y-4 mt-4">
                     ${this.createToolCard(grammarWordlistLink, t('shell_grammar_wordlist'), t('shell_grammar_wordlist_desc'), 'book', toolColor)}
                     ${this.createToolCard(cultureLink, t('shell_landeskunde'), t('shell_landeskunde_desc'), 'globe', toolColor)}
                     ${this.createToolCard(pronunciationLink, t('shell_pronunciation'), t('shell_pronunciation_desc'), 'microphone', toolColor)}
                     ${this.createToolCard(grammarLink, t('shell_grammar'), t('shell_grammar_desc'), 'academic-cap', toolColor)}
                     ${this.createToolCard(progressLink, t('shell_my_progress'), t('shell_my_progress_desc'), 'chart-bar', toolColor)}
                </div>
                 <div class="space-y-4 mt-4">
                    ${this.createToolCard(reviewCenterLink, t('shell_review_center'), t('shell_review_center_desc'), 'refresh', toolColor)}
                 </div>
            </div>
            `;

        const toolsDiv = document.createElement('div');
        toolsDiv.innerHTML = toolsHTML;
        mainInner.appendChild(toolsDiv);
    }

    /**
     * Renders the offline download card for images and audio.
     */
    async renderOfflineDownloadCard() {
        const mainInner = document.querySelector('main .max-w-3xl');
        if (!mainInner) return;

        const curriculumId = getActiveCurriculum();
        if (!curriculumId) return;

        // Only show for supported curricula
        const supportedCurricula = ['tysk1-vg1', 'spansk1-vg1'];
        if (!supportedCurricula.includes(curriculumId)) return;

        // Check current media status
        const mediaStatus = await checkMediaStatus(curriculumId);
        const storageInfo = await getStorageInfo();

        const borderColor = this.theme === 'spanish' ? 'border-error-500' : (this.theme === 'french' ? 'border-info-500' : 'border-primary-500');
        const btnColor = this.theme === 'spanish' ? 'red' : (this.theme === 'french' ? 'blue' : 'amber');

        // Get curriculum name for display
        const curriculumConfig = getCurriculumConfig(curriculumId);
        const curriculumName = curriculumConfig?.name || curriculumId;

        const offlineCardHTML = `
            <div id="offline-download-section" class="mb-12 mt-8">
                <h2 class="text-2xl font-bold text-neutral-800 mb-4 border-b-2 ${borderColor} pb-2">
                    ${t('offline_section_title', 'Offline-tilgang')}
                </h2>
                <div class="bg-surface rounded-xl shadow-sm p-6">
                    <div class="flex items-start gap-4">
                        <div class="w-12 h-12 bg-${btnColor}-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <span class="text-2xl">${mediaStatus.downloaded ? '✅' : '📥'}</span>
                        </div>
                        <div class="flex-1">
                            <h3 class="text-lg font-bold text-neutral-800">
                                ${t('offline_download_title', 'Last ned bilder og lyd')}
                            </h3>
                            <p class="text-neutral-600 text-sm mt-1">
                                ${t('offline_download_desc', 'Last ned bilder og lydfiler for {{curriculum}} slik at du kan bruke appen uten internett.', { curriculum: curriculumName })}
                            </p>

                            ${mediaStatus.downloaded ? `
                                <div class="mt-3 flex items-center gap-2 text-success-600">
                                    <span class="text-sm font-medium">
                                        ${t('offline_downloaded', '✓ Lastet ned')} - ${mediaStatus.fileCount} ${t('offline_files', 'filer')} (${mediaStatus.sizeEstimate})
                                    </span>
                                </div>
                            ` : `
                                <div class="mt-3 text-neutral-500 text-sm">
                                    ${t('offline_size_estimate', 'Estimert størrelse: ~57 MB')}
                                </div>
                            `}

                            <!-- Progress bar (hidden by default) -->
                            <div id="offline-download-progress" class="hidden mt-4">
                                <div class="h-2 bg-neutral-200 rounded-full overflow-hidden">
                                    <div id="offline-progress-fill" class="h-full bg-${btnColor}-500 transition-all duration-300" style="width: 0%"></div>
                                </div>
                                <p id="offline-progress-text" class="text-sm text-neutral-500 mt-1">0%</p>
                            </div>
                        </div>
                    </div>

                    <div class="mt-4 flex flex-wrap gap-3">
                        ${mediaStatus.downloaded ? `
                            <button id="delete-media-btn" class="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg font-medium transition-colors">
                                ${t('offline_delete_btn', 'Slett nedlastet innhold')}
                            </button>
                        ` : `
                            <button id="download-media-btn" class="px-4 py-2 bg-${btnColor}-500 hover:bg-${btnColor}-600 text-white rounded-lg font-medium transition-colors shadow-sm">
                                ${t('offline_download_btn', '📥 Last ned for offline bruk')}
                            </button>
                        `}
                    </div>

                    <!-- Storage info -->
                    <div class="mt-4 pt-4 border-t border-neutral-100 text-xs text-neutral-400">
                        ${t('offline_storage_used', 'Lagring brukt')}: ${formatBytes(storageInfo.used)} / ${formatBytes(storageInfo.quota)} (${storageInfo.percentUsed}%)
                    </div>
                </div>
            </div>
        `;

        const offlineDiv = document.createElement('div');
        offlineDiv.innerHTML = offlineCardHTML;
        mainInner.appendChild(offlineDiv);

        // Setup button handlers
        this.setupOfflineDownloadHandlers(curriculumId);
    }

    /**
     * Setup click handlers for offline download buttons.
     */
    setupOfflineDownloadHandlers(curriculumId) {
        const downloadBtn = document.getElementById('download-media-btn');
        const deleteBtn = document.getElementById('delete-media-btn');

        if (downloadBtn) {
            downloadBtn.addEventListener('click', async () => {
                downloadBtn.disabled = true;
                downloadBtn.textContent = t('offline_downloading', 'Laster ned...');

                const progressDiv = document.getElementById('offline-download-progress');
                const progressFill = document.getElementById('offline-progress-fill');
                const progressText = document.getElementById('offline-progress-text');

                if (progressDiv) progressDiv.classList.remove('hidden');

                const result = await downloadMedia(curriculumId, (percent, cached, total) => {
                    if (progressFill) progressFill.style.width = `${percent}%`;
                    if (progressText) progressText.textContent = `${percent}% (${cached}/${total} ${t('offline_files', 'filer')})`;
                });

                if (result.success || result.fileCount > 0) {
                    // Refresh the card to show downloaded state
                    const section = document.getElementById('offline-download-section');
                    if (section) section.remove();
                    this.renderOfflineDownloadCard();
                } else {
                    downloadBtn.disabled = false;
                    downloadBtn.textContent = t('offline_download_btn', '📥 Last ned for offline bruk');
                    if (progressDiv) progressDiv.classList.add('hidden');
                }
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
                if (confirm(t('offline_delete_confirm', 'Er du sikker på at du vil slette nedlastet innhold?'))) {
                    deleteBtn.disabled = true;
                    deleteBtn.textContent = t('offline_deleting', 'Sletter...');

                    await deleteMedia(curriculumId);

                    // Refresh the card
                    const section = document.getElementById('offline-download-section');
                    if (section) section.remove();
                    this.renderOfflineDownloadCard();
                }
            });
        }
    }

    createToolCard(href, title, desc, iconName, color) {
        // Simplified card renderer
        return `
            <a href="${href}" class="block bg-surface p-6 rounded-xl shadow-sm hover:shadow-lg hover:ring-2 hover:ring-${color}-500 transition-all duration-300">
                <div class="flex items-center gap-4">
                    <div class="flex-shrink-0 bg-${color}-500 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold">
                        <!-- ICON PLACEHOLDER -->
                        <span class="text-xl">🛠️</span>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-neutral-800">${title}</h3>
                        <p class="text-neutral-600 mt-1">${desc}</p>
                    </div>
                    <div class="ml-auto text-${color}-500">&rarr;</div>
                </div>
            </a>
        `;
    }

    renderFooterButtons() {
        const container = document.querySelector('.container');
        const footer = document.createElement('div');
        footer.className = "text-center mt-12 mb-6 flex flex-col gap-2";
        footer.innerHTML = `
            <button id="debug-achievements-btn" class="text-neutral-300 hover:text-neutral-500 text-xs transition-colors">
                ${t('shell_debug_achievement')}
            </button>
        `;
        container.appendChild(footer);
    }

    setupCurriculumSelector() {
        const selector = document.getElementById('curriculum-selector');
        if (selector) {
            selector.addEventListener('change', (e) => {
                const newCurriculum = e.target.value;
                setActiveCurriculum(newCurriculum);

                // Reload content (this event is listened to by initHomePage in page-init.js)
                // We dispatch a custom event
                const event = new Event('curriculum-changed');
                document.dispatchEvent(event);

                // Trigger curriculum caching for the new curriculum
                setTimeout(() => {
                    this.triggerCurriculumCache();
                }, 1000);
            });
        }
    }
}
