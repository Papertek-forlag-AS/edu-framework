import { showConfirmModal } from '../modals.js';
import { vt, getNativeLabel, getTargetLabel } from './i18n-helper.js';

// iOS-aligned: Maximum 20 words per session
const SESSION_SIZE = 20;

/**
 * Get the unique identifier for a word (for known words storage)
 * Uses wordId (wordbank key) if available, falls back to target for backwards compatibility
 * @param {Object} word - Vocabulary word object
 * @returns {string} - Unique identifier (e.g., "heissen_verb", "schule_substantiv")
 */
function getWordKey(word) {
    return word.wordId || word.target;
}

export function renderFlashcards(container, context, mode = 'normal') {
    const { vocabulary, knownWords, saveKnownWords, adapter, config, isLessonMode } = context;

    // Determine language code for audio paths (ISO 639-1: de, es, fr)
    const langCode = config?.languageConfig?.code || 'de';
    // Legacy language name for content/ symlink paths
    const language = langCode === 'es' ? 'spanish' : (langCode === 'fr' ? 'french' : 'german');

    // 1. Filter words based on mode
    let allAvailableWords;
    if (mode === 'review') {
        // Review mode: ONLY show known words
        allAvailableWords = vocabulary.filter(word => knownWords.has(getWordKey(word)));
    } else if (isLessonMode) {
        // Lesson-specific mode: Show ALL learning words (no SSR filtering)
        // This is because lessons have fewer words and SSR would make them run out quickly
        allAvailableWords = vocabulary.filter(word => !knownWords.has(getWordKey(word)));
    } else {
        // Normal mode (V3.7 Spec): Show ONLY words that are DUE for review
        // First, filter out known words
        const learningWords = vocabulary.filter(word => !knownWords.has(getWordKey(word)));

        // Then, if we have an adapter with SM-2 scheduling, filter for due words only
        if (adapter && adapter.getDueWords) {
            const allWordIds = learningWords.map(word => getWordKey(word));
            const dueWordIds = new Set(adapter.getDueWords(allWordIds));
            allAvailableWords = learningWords.filter(word => dueWordIds.has(getWordKey(word)));
        } else {
            // Fallback for legacy mode (no adapter): show all learning words
            allAvailableWords = learningWords;
        }
    }

    // Shuffle all available words
    allAvailableWords = allAvailableWords.sort(() => Math.random() - 0.5);

    // iOS-aligned: Limit session to SESSION_SIZE (20) words
    let flashcardVocab = allAvailableWords.slice(0, SESSION_SIZE);

    // If no words to show
    if (flashcardVocab.length === 0) {
        if (mode === 'review') {
            // No known words to review
            container.innerHTML = `
                <div class="p-6 border rounded-lg bg-surface shadow-lg text-center">
                    <h3 class="text-xl font-bold text-neutral-700 mb-4">${vt('fc_no_known')}</h3>
                    <p class="text-neutral-600 mb-6">${vt('fc_no_known_desc')}</p>
                    <button id="back-to-menu-btn" class="bg-primary-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-600 transition-colors">
                        ${vt('fc_back_to_menu')}
                    </button>
                </div>
            `;
            container.querySelector('#back-to-menu-btn').addEventListener('click', () => {
                if (context.onExit) {
                    context.onExit();
                } else {
                    window.location.reload();
                }
            });
            return;
        }
        // V3.7 Spec: Different empty states depending on whether words exist but aren't due
        const hasLearningWords = vocabulary.filter(word => !knownWords.has(getWordKey(word))).length > 0;

        if (hasLearningWords) {
            // Words exist but none are due for review (SM-2 scheduling)
            // Check if there are words that need Write training (lastMode = flashcards)
            const learningWordIds = vocabulary.filter(word => !knownWords.has(getWordKey(word))).map(word => getWordKey(word));
            const hasWordsForWrite = adapter && adapter.hasWordsNeedingWriteMode ? adapter.hasWordsNeedingWriteMode(learningWordIds) : false;
            const hasKnownWords = knownWords.size > 0;

            // Build smart navigation buttons
            let navigationButtons = '';
            if (hasWordsForWrite) {
                navigationButtons = `
                    <p class="text-neutral-500 text-sm mb-4">${vt('fc_words_waiting_write')}</p>
                    <div class="flex flex-col gap-3 mb-4">
                        <button id="go-to-skriv-btn" class="bg-accent2-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-accent2-600 transition-colors">
                            ${vt('fc_continue_write')}
                        </button>
                    </div>
                `;
            } else {
                navigationButtons = `
                    <p class="text-neutral-500 text-sm mb-4">${vt('fc_tip_match_test')}</p>
                `;
            }

            container.innerHTML = `
                <div class="p-6 border rounded-lg bg-surface shadow-lg text-center">
                    <h3 class="text-xl font-bold text-accent2-700 mb-4">${vt('fc_no_words_now')}</h3>
                    <p class="text-neutral-600 mb-4">${vt('fc_words_scheduled')}</p>
                    <p class="text-neutral-600 mb-4">${vt('fc_come_back')}</p>
                    ${navigationButtons}
                    <div class="flex flex-col gap-3">
                        ${hasKnownWords ? `
                            <button id="view-known-btn" class="bg-accent4-100 text-accent4-700 font-medium py-2 px-4 rounded-lg hover:bg-accent4-200 transition-colors border border-accent4-200">
                                ${vt('fc_view_known', { count: knownWords.size })}
                            </button>
                        ` : ''}
                        <button id="back-to-menu-btn" class="bg-primary-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-600 transition-colors">
                            ${vt('fc_back_to_menu')}
                        </button>
                    </div>
                </div>
            `;

            // Event listeners
            container.querySelector('#back-to-menu-btn').addEventListener('click', () => {
                if (context.onExit) {
                    context.onExit();
                } else {
                    window.location.reload();
                }
            });

            if (hasWordsForWrite) {
                container.querySelector('#go-to-skriv-btn')?.addEventListener('click', () => {
                    if (context.onExit) {
                        context.onExit();
                    }
                    // Note: The actual navigation to Skriv is handled by the parent app
                    // This button returns to menu where user can select Skriv
                });
            }

            if (hasKnownWords) {
                container.querySelector('#view-known-btn')?.addEventListener('click', () => {
                    renderFlashcards(container, context, 'review');
                });
            }
            return;
        }

        // All words marked as known
        container.innerHTML = `
                <div class="p-6 border rounded-lg bg-surface shadow-lg text-center">
                    <h3 class="text-xl font-bold text-success-700 mb-4">${vt('fc_congratulations')}</h3>
                    <p class="text-neutral-600 mb-6">${vt('fc_all_known')}</p>
                    <p class="text-neutral-600 mb-6">${vt('fc_reset_info')}</p>
                    <button id="reset-known-btn" class="bg-neutral-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-neutral-600 transition-colors">
                        ${vt('fc_reset_known')}
                    </button>
                </div>
            `;

        container.querySelector('#reset-known-btn').addEventListener('click', async () => {
            const confirmed = await showConfirmModal(
                vt('fc_reset_confirm'),
                vt('fc_reset_title')
            );
            if (confirmed) {
                // Remove current chapter words from knownWords
                vocabulary.forEach(word => knownWords.delete(getWordKey(word)));
                saveKnownWords();
                renderFlashcards(container, context); // Re-render
            }
        });
        return;
    }

    // Track all available words for "Next Session" functionality
    let remainingWords = allAvailableWords.slice(SESSION_SIZE); // Words after current session

    let currentIndex = 0;
    let isFlipped = false;
    let hasFlipped = false; // Track if user has flipped the card
    let canProceed = false; // Track if 2 seconds have passed after flipping
    let isProcessingClick = false; // Prevent rapid double-clicks from skipping multiple cards
    let sessionPoints = 0; // Track points earned in this session
    let sessionKnownWords = new Set(); // Words marked as known in this session
    let sessionRemovedWords = new Set(); // Words removed from known in review mode
    let activeFullscreenListener = null;

    // Audio settings - load from localStorage (default: muted)
    let isAudioMuted = localStorage.getItem('flashcard-audio-muted') !== 'false';

    // Auto-fullscreen on start
    const enterFullscreen = () => {
        try {
            if (container.requestFullscreen) container.requestFullscreen();
            else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
            else if (container.msRequestFullscreen) container.msRequestFullscreen();
            container.classList.add('bg-surface', 'overflow-y-auto', 'flex', 'items-center', 'justify-center', 'h-screen', 'w-screen', 'fixed', 'top-0', 'left-0', 'z-50');
        } catch (e) { console.warn('Fullscreen failed:', e); }
    };

    // Trigger fullscreen immediately if possible, or show a button to enter it
    // Browsers often require user interaction for fullscreen
    const startButtonText = mode === 'review'
        ? vt('fc_start_review')
        : vt('fc_start_fullscreen');
    const startMessage = mode === 'review'
        ? vt('fc_ready_review', { count: flashcardVocab.length })
        : vt('fc_ready_practice');

    container.innerHTML = `
            <div class="p-8 text-center">
                <p class="mb-4 text-lg">${startMessage}</p>
                <button id="start-flashcards-btn" class="bg-primary-500 text-white font-bold py-4 px-8 rounded-xl text-xl hover:bg-primary-600 shadow-lg transition-transform hover:scale-105">
                    ${startButtonText}
                </button>
            </div>
        `;

    container.querySelector('#start-flashcards-btn').addEventListener('click', () => {
        enterFullscreen();

        // Add fullscreen listener
        activeFullscreenListener = () => {
            if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
                // Check if we are still in the flashcard view (container has the flashcard)
                if (container.querySelector('#flashcard')) {
                    finishSession(true); // Early exit - just go back to menu
                }
            }
        };

        document.addEventListener('fullscreenchange', activeFullscreenListener);
        document.addEventListener('webkitfullscreenchange', activeFullscreenListener);
        document.addEventListener('mozfullscreenchange', activeFullscreenListener);
        document.addEventListener('MSFullscreenChange', activeFullscreenListener);

        showCard();
    });

    function showCard() {
        // Reset click processing flag for the new card
        isProcessingClick = false;

        if (currentIndex >= flashcardVocab.length) {
            // Session finished
            finishSession();
            return;
        }

        const word = flashcardVocab[currentIndex];
        isFlipped = false;
        hasFlipped = false;
        canProceed = false;

        // Main card UI (Adopting Test UI Layout)
        container.innerHTML = `
            <!-- Flex Container for Centering (Test Style) -->
            <div class="w-full h-full min-h-screen flex items-center justify-center p-4">
                
                <div class="w-full max-w-2xl p-6 bg-surface rounded-2xl shadow-xl mx-auto border-2 border-neutral-100 flex flex-col gap-6 relative overflow-visible">

                     <!-- Top Bar -->
                    <div class="flex justify-between items-center text-neutral-500 border-b border-neutral-100 pb-4 relative z-20">
                        <span class="font-bold text-lg text-primary-900/40">${vt('fc_card_count', { current: currentIndex + 1, total: flashcardVocab.length })}</span>
                        <!-- MASTERY BUTTON (In top bar for better clickability) -->
                        ${mode !== 'review' ? `
                        <div class="transition-opacity duration-500 opacity-0 pointer-events-none" id="mastery-container">
                            <button id="btn-mastery" disabled class="flex items-center gap-2 bg-accent4-100 text-accent4-700 px-4 py-2 rounded-full font-bold shadow-lg hover:bg-accent4-200 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                                <span class="text-xl">⭐</span>
                                <span class="text-sm">${vt('fc_mastery_btn')}</span>
                            </button>
                        </div>` : '<div></div>'}
                        <div class="flex items-center gap-2">
                            <button id="mute-btn" class="p-2 hover:bg-neutral-100 rounded-full transition-colors" title="${isAudioMuted ? vt('fc_unmute') : vt('fc_mute')}">
                                <span class="text-2xl">${isAudioMuted ? '🔇' : '🔊'}</span>
                            </button>
                            <button id="exit-flashcards-btn" class="p-2 hover:bg-neutral-100 rounded-full transition-colors text-neutral-400 hover:text-neutral-600" title="${vt('fc_exit_save')}">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <!-- Card Content Area -->
                    <div id="flashcard" class="flex flex-col items-center justify-center py-12 px-4 cursor-pointer transition-all duration-300 relative min-h-[300px]">
                        
                        <!-- Front (Native language) -->
                        <div id="card-front" class="text-center w-full transition-opacity duration-300 absolute inset-0 flex flex-col items-center justify-center z-10" style="opacity: 1;">
                            <p class="text-xs text-neutral-400 uppercase tracking-[0.2em] mb-6 font-bold">${getNativeLabel()}</p>
                            <h2 class="text-5xl md:text-6xl font-black text-neutral-800 tracking-tight leading-tight mb-4">${word.native}</h2>
                            ${word.norsk_synonymer && word.norsk_synonymer.length > 0 ? `<p class="text-neutral-400 mt-2 text-lg italic">(${word.norsk_synonymer.join(', ')})</p>` : ''}
                            <p class="text-neutral-300 mt-12 text-sm font-medium">${vt('fc_tap_to_flip')}</p>
                        </div>

                        <!-- Back (Target language) -->
                        <div id="card-back" class="text-center w-full transition-opacity duration-300 absolute inset-0 flex flex-col items-center justify-center z-0 opacity-0 pointer-events-none">
                            <p class="text-xs text-primary-600 uppercase tracking-[0.2em] mb-6 font-bold">${getTargetLabel(language)}</p>
                            <h2 class="text-5xl md:text-6xl font-black text-neutral-800 tracking-tight leading-tight mb-4">${word.target}</h2>

                            ${word.artikel ? `<span class="inline-block px-4 py-1.5 rounded-full text-sm font-bold mb-6 shadow-sm border ${word.artikel === 'der' ? 'bg-info-50 text-info-700 border-info-100' :
                word.artikel === 'die' ? 'bg-error-50 text-error-700 border-error-100' :
                    'bg-success-50 text-success-700 border-success-100'
                }">${word.artikel}</span>` : ''}

                            ${word.forklaring ? `
                                <div class="mt-2 p-4 bg-neutral-50 rounded-xl text-left max-w-lg border border-neutral-100 w-full">
                                    <p class="text-sm text-neutral-600 leading-relaxed">${word.forklaring}</p>
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Controls -->
                    <div class="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-100">
                        ${mode === 'review' ? `
                            <!-- Review Mode Buttons -->
                             <button id="btn-action" disabled class="bg-error-50 text-error-700 hover:bg-error-100 font-bold rounded-xl py-4 transition-colors text-lg flex flex-col items-center justify-center border border-error-200 disabled:opacity-50 disabled:cursor-not-allowed">
                                <span>${vt('fc_put_back')}</span>
                                <span class="text-xs font-normal opacity-70">${vt('fc_practice_again')}</span>
                            </button>
                            <button id="btn-next" disabled class="bg-neutral-100 text-neutral-600 hover:bg-neutral-200 font-bold rounded-xl py-4 transition-colors text-lg flex flex-col items-center justify-center border border-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed">
                                <span>${vt('fc_next')}</span>
                                <span class="text-xs font-normal opacity-60">${vt('fc_keep_known')}</span>
                            </button>
                        ` : `
                            <!-- Normal Mode Buttons (SM-2) -->
                            <button id="btn-action" disabled class="bg-success-50 hover:bg-success-100 text-success-700 font-bold rounded-xl py-4 transition-colors text-lg flex flex-col items-center justify-center border border-success-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group">
                                <span class="group-hover:scale-105 transition-transform">${vt('fc_correct_now')}</span>
                                <span class="text-xs font-normal opacity-60">${vt('fc_easy')}</span>
                                <span id="timer-action" class="absolute inset-0 bg-success-200/30 w-0 transition-all duration-[2000ms] ease-linear"></span>
                            </button>
                            <button id="btn-next" disabled class="bg-warning-50 hover:bg-warning-100 text-warning-800 font-bold rounded-xl py-4 transition-colors text-lg flex flex-col items-center justify-center border border-warning-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group">
                                <span class="group-hover:scale-105 transition-transform">${vt('fc_dont_know')}</span>
                                <span class="text-xs font-normal opacity-60">${vt('fc_hard')}</span>
                                <span id="timer-next" class="absolute inset-0 bg-warning-200/30 w-0 transition-all duration-[2000ms] ease-linear"></span>
                            </button>
                        `}
                    </div>

                </div>
            </div>
            `;

        const card = container.querySelector('#flashcard');
        const front = container.querySelector('#card-front');
        const back = container.querySelector('#card-back');
        const btnNext = container.querySelector('#btn-next');
        const btnAction = container.querySelector('#btn-action');
        const btnExit = container.querySelector('#exit-flashcards-btn');
        const btnMute = container.querySelector('#mute-btn');
        const timerAction = container.querySelector('#timer-action');
        const timerNext = container.querySelector('#timer-next');
        const btnMastery = container.querySelector('#btn-mastery');
        const masteryContainer = container.querySelector('#mastery-container');

        // ... (Audio Helpers: normalizeChars, getAudioPath) ...
        const normalizeChars = (text) => {
            return text
                // German umlauts
                .replace(/ö/g, 'oe').replace(/ä/g, 'ae').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
                .replace(/Ö/g, 'Oe').replace(/Ä/g, 'Ae').replace(/Ü/g, 'Ue')
                // French accented characters
                .replace(/[éèêë]/g, 'e').replace(/[ÉÈÊË]/g, 'E')
                .replace(/[àâä]/g, 'a').replace(/[ÀÂÄ]/g, 'A')
                .replace(/[ùûü]/g, 'u').replace(/[ÙÛÜ]/g, 'U')
                .replace(/[îï]/g, 'i').replace(/[ÎÏ]/g, 'I')
                .replace(/[ôö]/g, 'o').replace(/[ÔÖ]/g, 'O')
                .replace(/[ç]/g, 'c').replace(/[Ç]/g, 'C')
                .replace(/[œ]/g, 'oe').replace(/[Œ]/g, 'Oe')
                .replace(/[æ]/g, 'ae').replace(/[Æ]/g, 'Ae')
                // Remove apostrophes and special punctuation
                .replace(/[''`]/g, '');
        };

        const getAudioPath = (wordObj) => {
            if (wordObj.audio) {
                return [
                    `/shared/vocabulary/core/${langCode}/audio/${wordObj.audio}`,
                    `/content/${language}/vocab-audio/${wordObj.audio}`
                ];
            }
            const cleanWord = wordObj.target.replace(/^(der|die|das|el|la|los|las|le|la|les|l'|un|une|des)\s+/i, '').trim();
            const normalizedKey = normalizeChars(cleanWord.toLowerCase().replace(/\s+/g, '_').replace(/\//g, '-'));

            // Use absolute paths (works from any page depth)
            const paths = [];
            const searchBases = [
                `/shared/vocabulary/core/${langCode}/audio/`,
                `/content/${language}/vocab-audio/`,
            ];

            // Map word type to file prefix (supports both old Norwegian and new English types)
            const typeToPrefix = {
                'verb': 'verb_',
                'noun': 'substantiv_',      // New English type -> old Norwegian audio prefix
                'substantiv': 'substantiv_', // Legacy
                'adj': 'adjektiv_',         // New English type
                'adjektiv': 'adjektiv_',    // Legacy
                'pron': 'pronomen_',        // New English type
                'pronomen': 'pronomen_',    // Legacy
                'propn': 'land_',           // New English type (proper noun)
                'land': 'land_',            // Legacy
                'num': 'tall_',             // New English type
                'tall': 'tall_',            // Legacy
                'art': 'artikkel_',         // New English type
                'artikkel': 'artikkel_',    // Legacy
                'phrase': 'frase_',         // New English type
                'frase': 'frase_',          // Legacy
                'prep': 'ord_',             // New English type
                'preposisjon': 'ord_',      // Legacy
                'interr': 'ord_',           // New English type (interrogative)
                'spørreord': 'ord_',        // Legacy
                'conj': 'ord_',             // New English type
                'konjunksjon': 'ord_',      // Legacy
                'interj': 'ord_',           // New English type
                'interjeksjon': 'ord_',     // Legacy
                'adv': 'ord_',              // New English type
                'adverb': 'ord_',           // Legacy
                'word': 'ord_'
            };

            searchBases.forEach(base => {
                if (wordObj.type && typeToPrefix[wordObj.type]) {
                    paths.push(`${base}${typeToPrefix[wordObj.type]}${normalizedKey}.mp3`);
                }
                // Fallback: try common prefixes when type is unknown (for French etc. without manifest)
                if (!wordObj.type || !typeToPrefix[wordObj.type]) {
                    paths.push(`${base}verb_${normalizedKey}.mp3`);
                    paths.push(`${base}substantiv_${normalizedKey}.mp3`);
                    paths.push(`${base}adjektiv_${normalizedKey}.mp3`);
                }
                if (wordObj.type !== 'word' && wordObj.type !== 'verb' &&
                    wordObj.type !== 'noun' && wordObj.type !== 'substantiv' &&
                    wordObj.type !== 'adj' && wordObj.type !== 'adjektiv') {
                    paths.push(`${base}ord_${normalizedKey}.mp3`);
                }
                paths.push(`${base}${normalizedKey}.mp3`);
            });

            return paths;
        };

        // Flip logic with audio and delay
        card.addEventListener('click', () => {
            isFlipped = !isFlipped;
            if (isFlipped) {
                // Show Back (German)
                front.style.opacity = '0';
                front.style.pointerEvents = 'none';
                front.style.zIndex = '0';

                back.style.opacity = '1';
                back.style.pointerEvents = 'auto';
                back.style.zIndex = '10';

                card.classList.add('bg-primary-50', 'border-primary-200');

                // Mark that user has flipped the card
                hasFlipped = true;

                // Play audio
                if (!isAudioMuted) {
                    const audioPaths = getAudioPath(word);
                    if (audioPaths && audioPaths.length > 0) {
                        const audio = new Audio(audioPaths[0]);
                        const tryPath = (index) => {
                            if (index >= audioPaths.length) return;
                            if (index > 0) audio.src = audioPaths[index];
                            audio.play().catch(() => tryPath(index + 1));
                        };
                        tryPath(0);
                    }
                }

                // Start 2-second timer
                canProceed = false;

                // Animate timer bars
                if (timerAction) setTimeout(() => { timerAction.style.width = '100%'; }, 10);
                if (timerNext) setTimeout(() => { timerNext.style.width = '100%'; }, 10);

                // Enable buttons after 2 seconds
                setTimeout(() => {
                    canProceed = true;
                    btnAction.disabled = false;
                    btnNext.disabled = false;

                    // Show Mastery Button
                    if (btnMastery) {
                        masteryContainer.style.opacity = '1';
                        masteryContainer.classList.remove('pointer-events-none');
                        btnMastery.disabled = false;
                    }
                }, 2000);

            } else {
                // Show Front (Norwegian)
                back.style.opacity = '0';
                back.style.pointerEvents = 'none';
                back.style.zIndex = '0';

                front.style.opacity = '1';
                front.style.pointerEvents = 'auto';
                front.style.zIndex = '10';

                card.classList.remove('bg-primary-50', 'border-primary-200');
            }
        });

        // 1. MASTERY BUTTON (New)
        if (btnMastery) {
            btnMastery.addEventListener('click', async (e) => {
                e.stopPropagation();

                // Prevent rapid double-clicks
                if (isProcessingClick) return;
                isProcessingClick = true;

                // Mark as Known
                const wordKey = getWordKey(word);

                // V3.0 SM-2 Update (quality 5 for mastery)
                // In lesson mode, use exposure credit only (no full SM-2 scheduling)
                if (context.updateProgress) {
                    context.updateProgress(wordKey, 5, 'flashcards', { exposureOnly: isLessonMode });
                    sessionPoints++; // Track point for UI
                }

                // Use adapter if available (V3.0), else fallback
                if (context.adapter && context.adapter.markWordAsKnown) {
                    await context.adapter.markWordAsKnown(wordKey);
                }

                // Also update local knownWords for session logic
                knownWords.add(wordKey);
                sessionKnownWords.add(wordKey);

                // Confetti
                if (typeof confetti === 'function') {
                    confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 0.8 },
                        colors: ['#a855f7', '#ecc94b'] // Purple & Goal
                    });
                }

                // Visual Feedback
                btnMastery.classList.add('scale-110', 'bg-accent4-300');

                setTimeout(() => {
                    currentIndex++;
                    showCard();
                }, 500);
            });
        }

        // 2. GREEN BUTTON (Husker / Enkelt)
        btnAction.addEventListener('click', (e) => {
            e.stopPropagation();

            // Prevent rapid double-clicks
            if (isProcessingClick) return;
            isProcessingClick = true;

            if (mode === 'review') {
                // Review mode: Put word back into learning stack
                const wordKey = getWordKey(word);
                sessionRemovedWords.add(wordKey);
                knownWords.delete(wordKey);

                // Use adapter to unmark (returns to learning status)
                if (context.adapter && context.adapter.unmarkWordAsKnown) {
                    context.adapter.unmarkWordAsKnown(wordKey);
                }

                btnAction.classList.add('scale-110', 'bg-error-700');
                setTimeout(() => { currentIndex++; showCard(); }, 500);
            } else {
                // NORMAL MODE: "Husker" (Quality 5)
                const wordKey = getWordKey(word);
                // V3.0 SM-2 Update
                // In lesson mode, use exposure credit only (no full SM-2 scheduling)
                if (context.updateProgress) {
                    context.updateProgress(wordKey, 5, 'flashcards', { exposureOnly: isLessonMode });
                    sessionPoints++; // Track point for UI
                }

                btnAction.classList.add('scale-110', 'bg-success-300');
                setTimeout(() => {
                    currentIndex++;
                    showCard();
                }, 500);
            }
        });

        // 3. ORANGE BUTTON (Øv mer / Vanskelig)
        btnNext.addEventListener('click', (e) => {
            e.stopPropagation();

            // Prevent rapid double-clicks
            if (isProcessingClick) return;
            isProcessingClick = true;

            if (mode === 'review') {
                // Review mode: Keep as known - award points for reviewing
                const wordKey = getWordKey(word);

                // Award points for reviewing known words (reinforces long-term memory)
                if (context.updateProgress) {
                    context.updateProgress(wordKey, 5, 'flashcards');
                    sessionPoints++; // Track point for UI
                }

                btnNext.classList.add('scale-110', 'bg-neutral-300');
                setTimeout(() => {
                    currentIndex++;
                    showCard();
                }, 500);
            } else {
                // NORMAL MODE: "Øv mer" (Quality 3)
                const wordKey = getWordKey(word);
                // V3.0 SM-2 Update
                // In lesson mode, use exposure credit only (no full SM-2 scheduling)
                if (context.updateProgress) {
                    context.updateProgress(wordKey, 3, 'flashcards', { exposureOnly: isLessonMode });
                    sessionPoints++; // Track point for UI
                }

                btnNext.classList.add('scale-110', 'bg-warning-300');
                setTimeout(() => {
                    currentIndex++;
                    // Optional: Push to end of queue if "Hard"?
                    // For now, standard flow is just next card.
                    showCard();
                }, 500);
            }
        });

        // Mute button
        btnMute.addEventListener('click', (e) => {
            e.stopPropagation();
            isAudioMuted = !isAudioMuted;
            localStorage.setItem('flashcard-audio-muted', isAudioMuted.toString());

            // Update button icon and title
            const muteIcon = btnMute.querySelector('span');
            muteIcon.textContent = isAudioMuted ? '🔇' : '🔊';
            btnMute.title = isAudioMuted ? vt('fc_unmute') : vt('fc_mute');
        });

        // Exit button
        btnExit.addEventListener('click', (e) => {
            e.stopPropagation();
            finishSession(true); // Early exit - just go back to menu
        });
    }

    function finishSession(earlyExit = false) {
        // Remove fullscreen listener
        if (activeFullscreenListener) {
            document.removeEventListener('fullscreenchange', activeFullscreenListener);
            document.removeEventListener('webkitfullscreenchange', activeFullscreenListener);
            document.removeEventListener('mozfullscreenchange', activeFullscreenListener);
            document.removeEventListener('MSFullscreenChange', activeFullscreenListener);
            activeFullscreenListener = null;
        }

        // 1. Save changes based on mode
        if (mode === 'review') {
            // Review mode: Save removed words
            if (sessionRemovedWords.size > 0) {
                saveKnownWords(); // knownWords Set already updated
                document.dispatchEvent(new CustomEvent('vocab-updated'));
            }
        } else {
            // Normal mode: Save newly known words
            if (sessionKnownWords.size > 0) {
                sessionKnownWords.forEach(word => knownWords.add(word));
                saveKnownWords();
                document.dispatchEvent(new CustomEvent('vocab-updated'));
            }
        }

        // 1.5 Final sync of points and streak to cloud
        if (context.adapter && context.adapter.save) {
            context.adapter.save();
        }

        // 2. Exit fullscreen
        if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
            if (document.exitFullscreen) document.exitFullscreen().catch(e => console.log(e));
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
            else if (document.msExitFullscreen) document.msExitFullscreen();
        }
        container.classList.remove('bg-surface', 'overflow-y-auto', 'flex', 'items-center', 'justify-center', 'h-screen', 'w-screen', 'fixed', 'top-0', 'left-0', 'z-50');

        // 2b. Track words completed for summary (even on early exit)
        const wordsCompleted = currentIndex; // How many words were answered before exit

        // 3. Show summary based on mode
        if (mode === 'review') {
            // Review mode summary - with points earned
            const reviewPointsHtml = sessionPoints > 0 ? `
                <div class="flex items-center justify-center gap-2 mb-4">
                    <span class="text-3xl font-bold text-primary-500">+${sessionPoints}</span>
                    <span class="text-lg text-neutral-600">${vt('fc_points')}</span>
                </div>
            ` : '';

            // Show actual words completed (may be less than total if early exit)
            const wordsReviewedText = earlyExit && wordsCompleted < flashcardVocab.length
                ? `${wordsCompleted} / ${flashcardVocab.length}`
                : `${flashcardVocab.length}`;

            container.innerHTML = `
                <div class="p-6 border rounded-lg bg-surface shadow-lg text-center">
                    <h3 class="text-2xl font-bold text-neutral-800 mb-4">${earlyExit ? vt('fc_session_ended') : vt('fc_review_done')}</h3>
                    ${reviewPointsHtml}
                    <p class="text-lg mb-2">${vt('fc_went_through')} <span class="font-bold text-accent4-600">${wordsReviewedText}</span> ${vt('fc_known_words')}.</p>
                    ${sessionRemovedWords.size > 0 ? `
                        <p class="text-lg mb-6">${vt('fc_put_back_count', { count: sessionRemovedWords.size })}</p>
                        <p class="text-neutral-600 mb-6">${vt('fc_back_in_training')}</p>
                    ` : `
                        <p class="text-neutral-600 mb-6">${vt('fc_all_still_known')}</p>
                    `}
                    <button id="back-to-menu-btn" class="bg-primary-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-600 transition-colors">
                        ${vt('fc_back_to_menu')}
                    </button>
                </div>
            `;
        } else {
            // Normal mode summary - with option to review known words or continue with next session
            // Count only known words from the current vocabulary selection
            const knownWordsInSelection = vocabulary.filter(word => knownWords.has(getWordKey(word))).length;
            const reviewButtonHtml = knownWordsInSelection > 0 && !earlyExit ? `
                <button id="review-known-btn" class="bg-info-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-info-600 transition-colors">
                    ${vt('fc_review_known', { count: knownWordsInSelection })}
                </button>
            ` : '';

            // Points display (iOS-aligned)
            const pointsHtml = sessionPoints > 0 ? `
                <div class="flex items-center justify-center gap-2 mb-4">
                    <span class="text-3xl font-bold text-primary-500">+${sessionPoints}</span>
                    <span class="text-lg text-neutral-600">${vt('fc_points')}</span>
                </div>
            ` : '';

            // iOS-aligned: Calculate remaining words (excluding newly known words from this session)
            const updatedRemainingWords = remainingWords.filter(word => !sessionKnownWords.has(getWordKey(word)));
            const hasMoreWords = updatedRemainingWords.length > 0 && !earlyExit;
            const nextSessionSize = Math.min(updatedRemainingWords.length, SESSION_SIZE);

            // "Next session" button (iOS-aligned) - only show if not early exit
            const nextSessionButtonHtml = hasMoreWords ? `
                <button id="next-session-btn" class="bg-accent2-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-accent2-600 transition-colors flex items-center gap-2">
                    <span>${vt('fc_next_session', { count: nextSessionSize })}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                </button>
            ` : '';

            // Encouragement text (iOS-aligned)
            const encouragementHtml = hasMoreWords ? `
                <p class="text-accent2-600 text-sm mt-4">${vt('fc_remaining', { count: updatedRemainingWords.length })}</p>
            ` : '';

            // Show actual words completed (may be less than total if early exit)
            const wordsCompletedText = earlyExit && wordsCompleted < flashcardVocab.length
                ? `${wordsCompleted} / ${flashcardVocab.length}`
                : `${flashcardVocab.length}`;

            // Ordtrener link (only in lesson mode)
            const ordtrenerLinkHtml = isLessonMode ? `
                <div class="mt-6 pt-4 border-t border-neutral-200">
                    <p class="text-neutral-600 text-sm mb-3">${vt('fc_more_chapters_question')}</p>
                    <a href="/ordtrener/" class="inline-flex items-center gap-2 bg-info-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-info-700 transition-colors">
                        <span>${vt('fc_go_to_ordtrener')}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
                        </svg>
                    </a>
                </div>
            ` : '';

            container.innerHTML = `
                <div class="p-6 border rounded-lg bg-surface shadow-lg text-center">
                    <h3 class="text-2xl font-bold text-neutral-800 mb-4">${earlyExit ? vt('fc_session_ended') : vt('fc_session_done')}</h3>
                    ${pointsHtml}
                    <p class="text-lg mb-2">${vt('fc_went_through')} <span class="font-bold text-accent2-600">${wordsCompletedText}</span> ${vt('fc_words')}.</p>
                    <p class="text-neutral-600 mb-2">${vt('fc_marked_known', { count: sessionKnownWords.size })}</p>
                    ${encouragementHtml}
                    <div class="flex gap-3 justify-center flex-wrap mt-6">
                        ${nextSessionButtonHtml}
                        ${reviewButtonHtml}
                        <button id="back-to-menu-btn" class="bg-primary-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-600 transition-colors">
                            ${vt('fc_back_to_menu')}
                        </button>
                    </div>
                    ${ordtrenerLinkHtml}
                </div>
            `;

            // Add next session button handler
            const nextSessionBtn = container.querySelector('#next-session-btn');
            if (nextSessionBtn) {
                nextSessionBtn.addEventListener('click', () => {
                    startNextSession(updatedRemainingWords);
                });
            }

            // Add review button handler if it exists
            const reviewBtn = container.querySelector('#review-known-btn');
            if (reviewBtn) {
                reviewBtn.addEventListener('click', () => {
                    renderFlashcards(container, context, 'review');
                });
            }
        }

        container.querySelector('#back-to-menu-btn').addEventListener('click', () => {
            if (context.onExit) {
                context.onExit();
            } else {
                window.location.reload();
            }
        });

        // 4. Scroll completion message into view (especially important when in lesson context)
        setTimeout(() => {
            container.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }

    /**
     * Start next session with remaining words (iOS-aligned)
     * @param {Array} wordsForNextSession - Remaining words to practice
     */
    function startNextSession(wordsForNextSession) {
        // Reset session state
        currentIndex = 0;
        sessionPoints = 0;
        sessionKnownWords = new Set();
        sessionRemovedWords = new Set();
        isFlipped = false;
        hasFlipped = false;
        canProceed = false;
        isProcessingClick = false;

        // Shuffle and take next batch
        const shuffled = wordsForNextSession.sort(() => Math.random() - 0.5);
        flashcardVocab = shuffled.slice(0, SESSION_SIZE);
        remainingWords = shuffled.slice(SESSION_SIZE);

        console.log(`📚 Started next flashcard session: ${flashcardVocab.length} words (of ${wordsForNextSession.length} remaining)`);

        // Enter fullscreen and start
        enterFullscreen();

        // Re-add fullscreen listener
        activeFullscreenListener = () => {
            if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
                if (container.querySelector('#flashcard')) {
                    finishSession(true); // Early exit - just go back to menu
                }
            }
        };

        document.addEventListener('fullscreenchange', activeFullscreenListener);
        document.addEventListener('webkitfullscreenchange', activeFullscreenListener);
        document.addEventListener('mozfullscreenchange', activeFullscreenListener);
        document.addEventListener('MSFullscreenChange', activeFullscreenListener);

        showCard();
    }
}
