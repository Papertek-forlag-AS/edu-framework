/**
 * Known Words View Component
 * Displays known words organized by chapter with option to review them
 * Matches iOS: KnownWordsListView.swift
 */

import { showConfirmModal } from '../modals.js';

/**
 * Render the Known Words view
 * @param {HTMLElement} container - Container element
 * @param {Object} context - Context with vocabService, manifest, wordbanks, config
 * @param {Function} onBack - Callback when user navigates back
 * @param {Function} onStartReview - Callback to start review flashcard mode
 */
export function renderKnownWordsView(container, context, onBack, onStartReview) {
    const { vocabService, manifest, wordbanks, config } = context;

    // Debug logging
    console.log('[KnownWordsView] Rendering with context:', {
        hasVocabService: !!vocabService,
        hasManifest: !!manifest,
        hasWordbanks: !!wordbanks,
        vocabServiceMethods: vocabService ? Object.getOwnPropertyNames(Object.getPrototypeOf(vocabService)) : []
    });

    // Validate that vocabService has the required method
    if (!vocabService || typeof vocabService.getKnownWordsByChapter !== 'function') {
        console.error('[KnownWordsView] vocabService.getKnownWordsByChapter is not available!');
        container.innerHTML = `
            <div class="p-6 text-center">
                <h3 class="text-xl font-bold text-error-600 mb-4">Feil ved lasting</h3>
                <p class="text-neutral-600 mb-4">Kunne ikke laste kjente ord. Prøv å laste siden på nytt (Ctrl+Shift+R).</p>
                <button id="back-btn-error" class="bg-primary-500 text-white font-bold py-3 px-6 rounded-lg">
                    Tilbake
                </button>
            </div>
        `;
        container.querySelector('#back-btn-error')?.addEventListener('click', onBack);
        return;
    }

    // Get translation language (default to Norwegian)
    const translationLang = config?.translationLang || 'nb';

    // Get known words by chapter
    const chapterStats = vocabService.getKnownWordsByChapter(manifest, wordbanks, translationLang);

    // Calculate totals
    let totalKnown = 0;
    let totalWords = 0;
    chapterStats.forEach(ch => {
        totalKnown += ch.known;
        totalWords += ch.total;
    });

    // Get all known word IDs for the review button
    const allKnownWordIds = vocabService.getAllKnownWordIds();

    // Build chapter rows HTML
    const chapterRowsHtml = chapterStats.map(ch => {
        const progressPercent = Math.round(ch.progress * 100);
        const isComplete = ch.known === ch.total && ch.total > 0;

        return `
            <div class="chapter-row flex items-center gap-4 p-4 bg-surface rounded-xl shadow-sm border border-neutral-100 cursor-pointer hover:bg-neutral-50 transition-colors"
                 data-chapter="${ch.chapter}" data-known-count="${ch.known}">
                <div class="flex-1">
                    <div class="flex items-center justify-between mb-2">
                        <span class="font-bold text-neutral-800">Kapittel ${ch.chapter}</span>
                        <span class="text-neutral-500 text-sm">${ch.known}/${ch.total}</span>
                    </div>
                    <div class="h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div class="h-full ${isComplete ? 'bg-success-500' : 'bg-accent2-500'} rounded-full transition-all duration-500"
                             style="width: ${progressPercent}%"></div>
                    </div>
                </div>
                ${isComplete ? `
                    <div class="w-8 h-8 bg-success-100 rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-success-600" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                ` : `
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-neutral-300" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                    </svg>
                `}
            </div>
        `;
    }).join('');

    // Render main view
    container.innerHTML = `
        <div class="known-words-view min-h-screen bg-neutral-50 pb-24">
            <!-- Header -->
            <div class="sticky top-0 bg-surface border-b border-neutral-200 px-4 py-4 z-10">
                <div class="flex items-center justify-between max-w-2xl mx-auto">
                    <button id="back-btn" class="p-2 -ml-2 hover:bg-neutral-100 rounded-full transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 class="text-lg font-bold text-neutral-800">Ord du kan</h1>
                    <span class="text-neutral-500 font-medium">${totalKnown}/${totalWords}</span>
                </div>
            </div>

            <!-- Content -->
            <div class="max-w-2xl mx-auto px-4 py-6 space-y-6">
                <!-- Review Button Card -->
                ${totalKnown > 0 ? `
                    <div id="review-btn" class="bg-surface p-5 rounded-2xl shadow-sm border border-neutral-100 cursor-pointer hover:bg-accent2-50 hover:border-accent2-200 transition-all">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 bg-accent2-100 rounded-xl flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-accent2-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </div>
                            <div class="flex-1">
                                <h3 class="font-bold text-neutral-800 text-lg">Gjennomgå kjente ord</h3>
                                <p class="text-neutral-500 text-sm">${totalKnown} ord • Få poeng for å repetere</p>
                            </div>
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-neutral-300" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                            </svg>
                        </div>
                    </div>
                ` : `
                    <div class="bg-neutral-100 p-5 rounded-2xl text-center">
                        <p class="text-neutral-500">Du har ingen kjente ord ennå.</p>
                        <p class="text-neutral-400 text-sm mt-1">Øv på ordkort og merk ord du kan som "kjent"!</p>
                    </div>
                `}

                <!-- Chapter List -->
                <div>
                    <h2 class="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-3 px-1">Kapitler</h2>
                    <div class="space-y-3" id="chapter-list">
                        ${chapterRowsHtml}
                    </div>
                </div>
            </div>
        </div>
    `;

    // Event Listeners
    container.querySelector('#back-btn').addEventListener('click', () => {
        onBack();
    });

    const reviewBtn = container.querySelector('#review-btn');
    if (reviewBtn) {
        reviewBtn.addEventListener('click', () => {
            onStartReview(allKnownWordIds);
        });
    }

    // Chapter row click handlers
    container.querySelectorAll('.chapter-row').forEach(row => {
        row.addEventListener('click', () => {
            const chapter = parseInt(row.dataset.chapter, 10);
            const knownCount = parseInt(row.dataset.knownCount, 10);
            if (knownCount > 0) {
                showChapterDetail(container, context, chapter, chapterStats, onBack, onStartReview);
            }
        });
    });
}

/**
 * Show detailed view for a single chapter's known words
 */
function showChapterDetail(container, context, chapterNum, allChapterStats, onBack, onStartReview) {
    const { vocabService } = context;

    // Find chapter data
    const chapterData = allChapterStats.find(ch => ch.chapter === chapterNum);
    if (!chapterData) return;

    // Get word type colors and labels
    const typeConfig = {
        verb: { label: 'Verb', bg: 'bg-info-100', text: 'text-info-700', border: 'border-info-200' },
        noun: { label: 'Substantiv', bg: 'bg-success-100', text: 'text-success-700', border: 'border-success-200' },
        adj: { label: 'Adjektiv', bg: 'bg-warning-100', text: 'text-warning-700', border: 'border-warning-200' },
        adv: { label: 'Adverb', bg: 'bg-accent4-100', text: 'text-accent4-700', border: 'border-accent4-200' },
        prep: { label: 'Preposisjon', bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
        conj: { label: 'Konjunksjon', bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200' },
        phrase: { label: 'Frase', bg: 'bg-accent3-100', text: 'text-accent3-700', border: 'border-accent3-200' },
        interj: { label: 'Interjeksjon', bg: 'bg-lime-100', text: 'text-lime-700', border: 'border-lime-200' },
        num: { label: 'Tall', bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' },
        pron: { label: 'Pronomen', bg: 'bg-primary-100', text: 'text-primary-700', border: 'border-primary-200' },
        interr: { label: 'Spørreord', bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
        propn: { label: 'Egennavn', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' }
    };

    // Build word list HTML
    const wordListHtml = chapterData.knownWords.map(word => {
        const config = typeConfig[word.type] || { label: word.type, bg: 'bg-neutral-100', text: 'text-neutral-600', border: 'border-neutral-200' };

        return `
            <div class="word-item flex items-center justify-between p-4 bg-surface rounded-xl shadow-sm border border-neutral-100 group"
                 data-word-id="${word.id}">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="font-bold text-neutral-800">${word.german}</span>
                        <span class="px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text} ${config.border} border">${config.label}</span>
                    </div>
                    <span class="text-neutral-500 text-sm">${word.norwegian}</span>
                </div>
                <button class="demote-btn opacity-0 group-hover:opacity-100 p-2 hover:bg-error-50 rounded-full transition-all"
                        title="Legg tilbake i læringsbunken">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-error-400 hover:text-error-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        `;
    }).join('');

    // Render chapter detail view
    container.innerHTML = `
        <div class="chapter-detail-view min-h-screen bg-neutral-50 pb-24">
            <!-- Header -->
            <div class="sticky top-0 bg-surface border-b border-neutral-200 px-4 py-4 z-10">
                <div class="flex items-center justify-between max-w-2xl mx-auto">
                    <button id="back-to-list-btn" class="p-2 -ml-2 hover:bg-neutral-100 rounded-full transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 class="text-lg font-bold text-neutral-800">Kapittel ${chapterNum}</h1>
                    <span class="text-neutral-500 font-medium">${chapterData.known}/${chapterData.total}</span>
                </div>
            </div>

            <!-- Content -->
            <div class="max-w-2xl mx-auto px-4 py-6 space-y-6">
                <!-- Review Chapter Button -->
                ${chapterData.known > 0 ? `
                    <div id="review-chapter-btn" class="bg-surface p-4 rounded-xl shadow-sm border border-neutral-100 cursor-pointer hover:bg-accent2-50 hover:border-accent2-200 transition-all">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-accent2-100 rounded-lg flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-accent2-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </div>
                            <div class="flex-1">
                                <h3 class="font-bold text-neutral-800">Gjennomgå dette kapittelet</h3>
                                <p class="text-neutral-500 text-sm">${chapterData.known} ord</p>
                            </div>
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-neutral-300" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                            </svg>
                        </div>
                    </div>
                ` : ''}

                <!-- Word List -->
                <div>
                    <h2 class="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-3 px-1">Kjente ord</h2>
                    <div class="space-y-2" id="word-list">
                        ${wordListHtml || '<p class="text-neutral-400 text-center py-4">Ingen kjente ord i dette kapittelet.</p>'}
                    </div>
                </div>

                <!-- Info text -->
                <p class="text-neutral-400 text-sm text-center">
                    Hold over et ord for å legge det tilbake i læringsbunken
                </p>
            </div>
        </div>
    `;

    // Event Listeners
    container.querySelector('#back-to-list-btn').addEventListener('click', () => {
        renderKnownWordsView(container, context, onBack, onStartReview);
    });

    const reviewChapterBtn = container.querySelector('#review-chapter-btn');
    if (reviewChapterBtn) {
        reviewChapterBtn.addEventListener('click', () => {
            const chapterWordIds = chapterData.knownWords.map(w => w.id);
            onStartReview(chapterWordIds);
        });
    }

    // Demote button handlers
    container.querySelectorAll('.demote-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const wordItem = btn.closest('.word-item');
            const wordId = wordItem.dataset.wordId;
            const wordName = wordItem.querySelector('.font-bold')?.textContent || 'dette ordet';

            // Confirm before demoting using modal
            const confirmed = await showConfirmModal(
                `Vil du legge "${wordName}" tilbake i læringsbunken?`,
                'Tilbake til læring'
            );
            if (!confirmed) return;

            // Demote word
            vocabService.unmarkWordAsKnown(wordId);

            // Animate removal
            wordItem.style.opacity = '0';
            wordItem.style.transform = 'translateX(-100%)';
            setTimeout(() => {
                wordItem.remove();

                // Update counts in header
                const newKnownCount = container.querySelectorAll('.word-item').length;
                const headerCount = container.querySelector('h1 + span') || container.querySelector('.max-w-2xl span');
                if (headerCount) {
                    headerCount.textContent = `${newKnownCount}/${chapterData.total}`;
                }

                // If no words left, go back to list
                if (newKnownCount === 0) {
                    renderKnownWordsView(container, context, onBack, onStartReview);
                }
            }, 300);
        });
    });
}

/**
 * Create a clickable "Ord du kan" card for use in other views
 * @param {number} knownCount - Number of known words
 * @param {number} totalCount - Total number of words
 * @param {Function} onClick - Click handler
 * @returns {string} HTML string for the card
 */
export function createKnownWordsCard(knownCount, totalCount, onClick) {
    const progressPercent = totalCount > 0 ? Math.round((knownCount / totalCount) * 100) : 0;

    return `
        <div id="known-words-card" class="bg-surface p-4 rounded-2xl shadow-sm border border-neutral-100 cursor-pointer hover:shadow-md transition-all">
            <div class="flex items-center gap-3 mb-2">
                <div class="w-10 h-10 rounded-full bg-success-100 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-success-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                </div>
                <div class="flex-1">
                    <h4 class="text-sm font-medium text-neutral-500">Ord du kan</h4>
                    <p class="text-xl font-black text-success-600">${knownCount}<span class="text-sm font-normal text-neutral-400">/${totalCount}</span></p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-neutral-300" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                </svg>
            </div>
            <div class="h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div class="h-full bg-success-500 rounded-full transition-all duration-1000"
                     style="width: 0%"
                     data-width="${progressPercent}%"></div>
            </div>
        </div>
    `;
}
