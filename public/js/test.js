import { loadData, saveData, trackTestCompletion } from './progress/index.js';
import { createSpecialCharsComponent } from './ui.js';
import { LEKSJONS_REKKEFOLGE } from './utils.js';
import { fetchCoreBank } from './vocabulary/vocab-api-client.js';
import { getTargetLanguageCode, getLanguageDir } from './core/language-utils.js';

// Dynamic imports: load question bank and vocabulary for the active language
const langDir = getLanguageDir();
const langCode = getTargetLanguageCode();

let sporsmalsBank = [];
try {
    const qbModule = await import(`../content/${langDir}/question-bank.js`);
    sporsmalsBank = qbModule.sporsmalsBank || [];
} catch (e) {
    console.warn(`No question bank found for ${langDir}. Tests will be empty.`);
}

let verbbank = {}, nounBank = {};
try {
    [verbbank, nounBank] = await Promise.all([
        fetchCoreBank(langCode, 'verbbank'),
        fetchCoreBank(langCode, 'nounbank')
    ]);
} catch {
    console.warn(`No vocabulary banks available for ${langCode}. Vocab-based questions will be skipped.`);
}

/**
 * =============================================================================
 * TESTSYSTEM-LOGIKK (Refaktorert)
 * =============================================================================
 */

const TEST_LENGTHS = {
    leksjon: 5,
    kapittel: 10,
    kumulativ: 10,
};

const questionGenerators = {
    leksjon: (testId) => sporsmalsBank.filter(q => q.leksjon === testId),
    kapittel: (testId) => sporsmalsBank.filter(q => q.kapittel === testId),
    kumulativ: (testId) => {
        const chapterNum = testId.split('.')[0];
        return sporsmalsBank.filter(q => parseInt(q.kapittel) <= parseInt(chapterNum));
    },
    repetisjon_verb: (params) => {
        const chaptersParam = params.get('chapters');
        const chapters = chaptersParam ? chaptersParam.split(',').map(Number) : [];
        const filter = params.get('filter'); // 'regular' or 'strong'

        // Fallback for old links (fra/til)
        if (chapters.length === 0 && params.has('fra') && params.has('til')) {
            const fra = parseInt(params.get('fra'));
            const til = parseInt(params.get('til'));
            for (let i = fra; i <= til; i++) chapters.push(i);
        }

        const isIrregularPresent = (verbData) => {
            if (verbData.type === 'strong') return true; // Explicit override

            const presens = verbData?.conjugations?.presens?.former;
            if (!presens) return false;

            const ich = presens.ich.toLowerCase();
            const du = presens.du.toLowerCase();

            // Handle common irregulars explicitly if needed
            if (ich === 'bin') return true; // sein
            if (ich === 'habe' && du === 'hast') return true; // haben

            // Heuristic: Compare stems after removing endings and 'e's
            // This detects vowel changes (a->ä, e->i/ie) and stem changes (b->null)
            let stemIch = ich.endsWith('e') ? ich.slice(0, -1) : ich;
            let stemDu = du;
            if (stemDu.endsWith('est')) stemDu = stemDu.slice(0, -3);
            else if (stemDu.endsWith('st')) stemDu = stemDu.slice(0, -2);

            // Remove all 'e's to handle e-insertion/deletion (sammeln, arbeiten)
            // Irregular verbs usually have other vowel changes (a->ä, e->i)
            const normIch = stemIch.replace(/e/g, '');
            const normDu = stemDu.replace(/e/g, '');

            return normIch !== normDu;
        };

        const pronomen = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie'];
        const questions = [];
        for (const verbKey in verbbank) {
            const verbData = verbbank[verbKey];
            if (verbData?.conjugations?.presens?.intro) {
                const introKap = parseInt(verbData.conjugations.presens.intro.split('.')[0]);

                if (chapters.includes(introKap)) {
                    // Apply filter
                    if (filter === 'regular' && isIrregularPresent(verbData)) continue;
                    if (filter === 'strong' && !isIrregularPresent(verbData)) continue;

                    for (const p of pronomen) {
                        const korrektForm = verbData.conjugations.presens.former[p];
                        if (korrektForm) {
                            questions.push({
                                type: 'fill-in',
                                sporsmal: `Bøy verbet <strong>${verbKey}</strong> i presens for <strong>${p}</strong>:`,
                                svar: korrektForm
                            });
                        }
                    }
                }
            }
        }
        return questions;
    },
    repetisjon_substantiv: (params) => {
        const fraKap = parseInt(params.get('fra'));
        const tilKap = parseInt(params.get('til'));
        const ovelser = (params.get('ovelser') || '').split(',');
        const questions = [];
        for (const subKey in nounBank) {
            const subData = nounBank[subKey];
            if (subData?.intro) {
                const introKap = parseInt(subData.intro.split('.')[0]);
                if (introKap >= fraKap && introKap <= tilKap) {
                    const artikkel = { m: 'der', f: 'die', n: 'das' }[subData.genus];
                    if (ovelser.includes('genus')) {
                        questions.push({ type: 'multiple-choice', sporsmal: `Hvilken artikkel har <strong>${subKey}</strong>?`, alternativer: ['der', 'die', 'das'], svar: artikkel });
                    }
                    if (ovelser.includes('plural') && subData.plural?.includes('die')) {
                        questions.push({ type: 'fill-in', sporsmal: `Hva er flertall av <strong>${artikkel} ${subKey}</strong>?`, svar: subData.plural });
                    }
                    if (ovelser.includes('akkusativ') && subData.cases?.akkusativ?.bestemt && subData.genus === 'm') {
                        questions.push({ type: 'fill-in', sporsmal: `Hva er <strong>ein ${subKey}</strong> i bestemt form akkusativ?`, svar: subData.cases.akkusativ.bestemt });
                    }
                }
            }
        }
        return questions;
    }
};

const questionRenderers = {
    'multiple-choice': (question) => {
        const shuffledOptions = [...question.alternativer].sort(() => 0.5 - Math.random());
        return shuffledOptions.map(option =>
            `<button class="w-full text-left p-4 border-2 rounded-lg hover:bg-neutral-100 mc-option" data-answer="${option}">${option}</button>`
        ).join('');
    },
    'fill-in': () => `
        <input type="text" id="fill-in-answer" class="w-full p-3 border-2 border-neutral-300 rounded-md text-lg" placeholder="Skriv svaret ditt her...">
        <div id="test-special-chars" class="mt-4 flex items-center gap-2"></div>
    `,
    'drag-and-drop': (question) => {
        const shuffledWords = [...question.ord].sort(() => 0.5 - Math.random());
        const wordButtons = shuffledWords.map(word => `<div class="clickable-word rounded-md">${word}</div>`).join('');
        return `
            <div class="space-y-4">
                <p class="text-sm text-neutral-600 font-semibold">Svar:</p>
                <div id="sentence-zone" class="drop-zone rounded-md flex flex-wrap gap-2 items-center min-h-[50px]"></div>
                <p class="text-sm text-neutral-600 font-semibold mt-4">Ordbank:</p>
                <div id="word-bank-zone" class="drop-zone rounded-md flex flex-wrap gap-2 items-center min-h-[50px]">${wordButtons}</div>
            </div>
        `;
    }
};

export function setupTestPage() {
    const testContainer = document.getElementById('test-container');
    if (!testContainer) return;

    const dom = {
        loadingView: document.getElementById('loading-view'),
        questionView: document.getElementById('question-view'),
        resultView: document.getElementById('result-view'),
        testTitle: document.getElementById('test-title'),
        progressIndicator: document.getElementById('progress-indicator'),
        progressBar: document.getElementById('progress-bar'),
        questionArea: document.getElementById('question-area'),
        feedbackArea: document.getElementById('feedback-area'),
        nextQuestionBtn: document.getElementById('next-question-btn'),
        scoreText: document.getElementById('score-text'),
        scoreFeedback: document.getElementById('score-feedback'),
        retryTestBtn: document.getElementById('retry-test-btn'),
        cancelTestBtn: document.getElementById('cancel-test-btn'),
        exitTestBtn: document.getElementById('exit-test-btn'),
        nextChallengeContainer: document.getElementById('next-challenge-container'),
        chapterTestPromo: document.getElementById('chapter-test-promo'),
        startChapterTestBtn: document.getElementById('start-chapter-test-btn'),
        cumulativeTestPromo: document.getElementById('cumulative-test-promo'),
        startCumulativeTestBtn: document.getElementById('start-cumulative-test-btn'),
    };

    const testState = {
        questions: [],
        currentIndex: 0,
        score: 0,
        userHasAnswered: false,
        params: new URLSearchParams(window.location.search),
    };

    function startTest() {
        const testType = testState.params.get('type');
        const testId = testState.params.get('id');
        const returnTo = testState.params.get('returnTo') || 'index.html';

        let returnUrl = returnTo.includes('leksjon-') ? `${returnTo}#test-start-punkt` : returnTo;
        dom.cancelTestBtn.href = returnUrl;
        dom.exitTestBtn.href = returnUrl;
        dom.retryTestBtn.href = window.location.href;

        const generator = questionGenerators[testType];
        if (!generator) {
            showError("Ukjent testtype.");
            return;
        }

        const allQuestions = generator(testType.startsWith('repetisjon') ? testState.params : testId);
        const testLength = testState.params.get('antall') || TEST_LENGTHS[testType] || 10;

        dom.testTitle.textContent = getTestTitle(testType, testId, testState.params);
        testState.questions = allQuestions.sort(() => 0.5 - Math.random()).slice(0, testLength);

        if (testState.questions.length === 0) {
            showError("Fant ingen spørsmål for dette utvalget. Prøv å justere kapitler eller øvelsestyper.");
            return;
        }

        testState.currentIndex = 0;
        testState.score = 0;
        dom.loadingView.classList.add('hidden');
        dom.questionView.classList.remove('hidden');
        displayQuestion();
    }

    function showError(message) {
        dom.questionArea.innerHTML = `<p class="text-center font-semibold text-error-600">${message}</p>`;
        dom.nextQuestionBtn.classList.add('hidden');
        dom.loadingView.classList.add('hidden');
        dom.questionView.classList.remove('hidden');
    }

    function getTestTitle(type, id, params) {
        switch (type) {
            case 'leksjon': return `Test: Leksjon ${id}`;
            case 'kapittel': return `Test: Kapittel ${id}`;
            case 'kumulativ': return `Stor Repetisjonstest (Kap. 1-${id.split('.')[0]})`;
            case 'repetisjon_verb':
                const chapters = params.get('chapters');
                return chapters ? `Verbtrening (Kap. ${chapters})` : `Verbtrening (Kap. ${params.get('fra')}-${params.get('til')})`;
            case 'repetisjon_substantiv': return `Substantivtrening (Kap. ${params.get('fra')}-${params.get('til')})`;
            default: return "Test";
        }
    }

    function displayQuestion() {
        testState.userHasAnswered = false;
        const question = testState.questions[testState.currentIndex];
        const renderer = questionRenderers[question.type];

        dom.progressIndicator.textContent = `Spørsmål ${testState.currentIndex + 1} / ${testState.questions.length}`;
        dom.progressBar.style.width = `${((testState.currentIndex + 1) / testState.questions.length) * 100}%`;

        dom.questionArea.innerHTML = `
            <p class="text-xl font-semibold mb-4">${question.sporsmal}</p>
            <div class="space-y-3">${renderer ? renderer(question) : ''}</div>
        `;

        if (question.type === 'fill-in') {
            createSpecialCharsComponent('test-special-chars');
        }

        if (question.type === 'drag-and-drop') {
            const wordBankZone = document.getElementById('word-bank-zone');
            const sentenceZone = document.getElementById('sentence-zone');

            const handleWordClick = (event) => {
                const clickedWord = event.target;
                if (!clickedWord.classList.contains('clickable-word')) return;

                if (clickedWord.parentElement === wordBankZone) {
                    sentenceZone.appendChild(clickedWord);
                } else {
                    wordBankZone.appendChild(clickedWord);
                }

                testState.userHasAnswered = sentenceZone.children.length > 0;
                dom.nextQuestionBtn.disabled = !testState.userHasAnswered;
            };

            wordBankZone.addEventListener('click', handleWordClick);
            sentenceZone.addEventListener('click', handleWordClick);
        }

        dom.feedbackArea.innerHTML = '';
        dom.nextQuestionBtn.disabled = true;

        if (question.type === 'multiple-choice') {
            document.querySelectorAll('.mc-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.mc-option').forEach(b => b.classList.remove('ring-2', 'ring-primary-500'));
                    btn.classList.add('ring-2', 'ring-primary-500');
                    testState.userHasAnswered = true;
                    dom.nextQuestionBtn.disabled = false;
                });
            });
        } else if (question.type === 'fill-in') {
            const fillInInput = document.getElementById('fill-in-answer');
            fillInInput.addEventListener('input', () => {
                testState.userHasAnswered = fillInInput.value.trim() !== '';
                dom.nextQuestionBtn.disabled = !testState.userHasAnswered;
            });
            fillInInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' && !dom.nextQuestionBtn.disabled) {
                    event.preventDefault();
                    dom.nextQuestionBtn.click();
                }
            });
        }
    }

    function checkAnswer() {
        if (!testState.userHasAnswered) return;
        dom.nextQuestionBtn.disabled = true;

        const question = testState.questions[testState.currentIndex];
        let userAnswer = '';

        if (question.type === 'multiple-choice') {
            const selectedOption = document.querySelector('.mc-option.ring-2');
            userAnswer = selectedOption ? selectedOption.dataset.answer : '';
            document.querySelectorAll('.mc-option').forEach(btn => btn.disabled = true);
        } else if (question.type === 'fill-in') {
            const fillInInput = document.getElementById('fill-in-answer');
            userAnswer = fillInInput.value.trim();
            fillInInput.disabled = true;
        } else if (question.type === 'drag-and-drop') {
            const wordsInSentence = document.querySelectorAll('#sentence-zone .clickable-word');
            userAnswer = Array.from(wordsInSentence).map(word => word.textContent).join(' ');
            document.querySelectorAll('.clickable-word').forEach(word => word.style.pointerEvents = 'none');
        }

        let feedbackHtml = '';
        if (userAnswer.toLowerCase() === question.svar.toLowerCase()) {
            testState.score++;
            feedbackHtml = `<p class="text-success-600 font-bold text-lg text-center">Riktig!</p>`;
        } else {
            feedbackHtml = `<p class="text-error-600 font-bold text-lg text-center">Feil. Riktig svar var: <strong>${question.svar}</strong></p>`;
        }
        dom.feedbackArea.innerHTML = feedbackHtml;

        setTimeout(() => {
            testState.currentIndex++;
            if (testState.currentIndex < testState.questions.length) {
                displayQuestion();
            } else {
                displayResults();
            }
        }, 1500);
    }

    function displayResults() {
        dom.questionView.classList.add('hidden');
        dom.resultView.classList.remove('hidden');

        dom.scoreText.textContent = `${testState.score} / ${testState.questions.length}`;
        const percentage = (testState.score / testState.questions.length) * 100;
        let feedback = '';
        if (percentage === 100) feedback = 'Perfekt! Fantastisk jobbet!';
        else if (percentage >= 75) feedback = 'Veldig bra!';
        else if (percentage >= 50) feedback = 'Bra jobbet! Repeter gjerne litt.';
        else feedback = 'God innsats! Ta en titt på leksjonen igjen.';
        dom.scoreFeedback.textContent = feedback;

        const testType = testState.params.get('type');
        const testId = testState.params.get('id');
        saveTestResult(testType, testId, testState.score, testState.questions.length);

        dom.nextChallengeContainer.classList.add('hidden');
        dom.chapterTestPromo.classList.add('hidden');
        dom.cumulativeTestPromo.classList.add('hidden');

        const chapterId = testId.split('.')[0];
        const lessonIdForUrl = testType === 'leksjon' ? testId.replace('.', '-') : null;

        const currentIndex = LEKSJONS_REKKEFOLGE.indexOf(lessonIdForUrl);
        const hasNextLesson = currentIndex > -1 && currentIndex < LEKSJONS_REKKEFOLGE.length - 1;
        const nextLessonChapter = hasNextLesson ? LEKSJONS_REKKEFOLGE[currentIndex + 1].split('-')[0] : null;
        const isLastLessonInChapter = testType === 'leksjon' && (nextLessonChapter !== chapterId || !hasNextLesson);

        if (isLastLessonInChapter) {
            dom.nextChallengeContainer.classList.remove('hidden');
            dom.chapterTestPromo.classList.remove('hidden');
            dom.startChapterTestBtn.href = `test.html?type=kapittel&id=${chapterId}&returnTo=${testState.params.get('returnTo')}`;
        }

        if (testType === 'kapittel' && parseInt(chapterId) >= 2) {
            dom.nextChallengeContainer.classList.remove('hidden');
            dom.cumulativeTestPromo.classList.remove('hidden');
            dom.startCumulativeTestBtn.href = `test.html?type=kumulativ&id=${chapterId}&returnTo=${testState.params.get('returnTo')}`;
        }
    }

    dom.nextQuestionBtn.addEventListener('click', checkAnswer);
    startTest();
}

function saveTestResult(testType, testId, score, totalQuestions) {
    const key = `tysk-test-resultat-${testType}-${testId}`;
    const resultData = {
        score: score,
        total: totalQuestions,
        timestamp: new Date().toISOString()
    };
    saveData(key, resultData);

    if (testType === 'leksjon') {
        const lessonId = testId.replace('.', '-');
        trackTestCompletion('leksjon', lessonId, score, totalQuestions);
    } else if (testType === 'kapittel') {
        const chapterNum = testId;
        const lessonId = chapterNum + '-3';
        trackTestCompletion('kapittel', lessonId, score, totalQuestions);
    } else if (testType === 'kumulativ') {
        const chapterNum = testId;
        const lessonId = chapterNum + '-3';
        trackTestCompletion('kumulativ', lessonId, score, totalQuestions);
    }
}

export function setupProgressPage() {
    const container = document.getElementById('progress-container');
    if (!container) return;

    const results = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('tysk-test-resultat-')) {
            const data = loadData(key);
            const keyParts = key.split('-');
            results.push({
                type: keyParts[3],
                id: keyParts.slice(4).join('-'),
                score: data.score,
                total: data.total,
                timestamp: new Date(data.timestamp)
            });
        }
    }

    if (results.length === 0) {
        document.getElementById('no-progress').classList.remove('hidden');
        return;
    }

    const groupedResults = {};
    results.forEach(res => {
        const chapter = res.id.split('.')[0];
        if (!groupedResults[chapter]) {
            groupedResults[chapter] = [];
        }
        groupedResults[chapter].push(res);
    });

    const sortedChapters = Object.keys(groupedResults).sort((a, b) => a - b);

    sortedChapters.forEach(chapter => {
        const chapterTitle = document.createElement('h2');
        chapterTitle.className = 'text-2xl font-bold text-neutral-800 border-b-2 border-primary-500 pb-2 mt-8';
        chapterTitle.textContent = `Kapittel ${chapter}`;
        container.appendChild(chapterTitle);

        const testsInChapter = groupedResults[chapter].sort((a, b) => b.timestamp - a.timestamp);

        testsInChapter.forEach(res => {
            const resultLink = document.createElement('a');
            resultLink.className = 'block bg-surface p-4 rounded-lg shadow-sm hover:shadow-md hover:ring-2 hover:ring-primary-500 transition-all duration-200';
            resultLink.href = `test.html?type=${res.type}&id=${res.id}&returnTo=min-progresjon.html`;

            let title = '';
            if (res.type === 'leksjon') title = `Leksjon ${res.id}`;
            else if (res.type === 'kapittel') title = `Kapittel ${res.id} Test`;
            else if (res.type === 'kumulativ') title = `Stor Repetisjonstest (Kap. 1-${chapter})`;

            const dateString = res.timestamp.toLocaleDateString('no-NO', { day: '2-digit', month: 'long', year: 'numeric' });

            resultLink.innerHTML = `
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="font-bold text-lg">${title}</h3>
                        <p class="text-sm text-neutral-500">Sist tatt ${dateString}</p>
                    </div>
                    <p class="text-xl font-bold text-primary-700">${res.score} / ${res.total}</p>
                </div>
            `;
            container.appendChild(resultLink);
        });
    });
}

export function setupLessonEndNavigation() {
    const chapterId = document.body.dataset.chapterId;
    if (!chapterId) return;

    const chapterTestContainer = document.getElementById('chapter-test-unlockable');
    const cumulativeTestContainer = document.getElementById('cumulative-test-unlockable');

    const chapterNumber = chapterId.split('-')[0];
    const lessonTestKey = `tysk-test-resultat-leksjon-${chapterId.replace('-', '.')}`;
    const chapterTestKey = `tysk-test-resultat-kapittel-${chapterNumber}`;
    const cumulativeTestKey = `tysk-test-resultat-kumulativ-${chapterNumber}`;

    if (chapterTestContainer && loadData(lessonTestKey)) {
        chapterTestContainer.classList.remove('hidden');
    }
    if (cumulativeTestContainer && loadData(chapterTestKey)) {
        cumulativeTestContainer.classList.remove('hidden');
    }

    const nextLessonContainer = document.getElementById('next-lesson-unlockable');
    if (nextLessonContainer) {
        let prerequisiteTestKey = '';
        const currentIndex = LEKSJONS_REKKEFOLGE.indexOf(chapterId);
        const isLastInChapter = (currentIndex + 1 === LEKSJONS_REKKEFOLGE.length) || !LEKSJONS_REKKEFOLGE[currentIndex + 1].startsWith(chapterNumber);

        if (isLastInChapter) {
            if (cumulativeTestContainer) {
                prerequisiteTestKey = cumulativeTestKey;
            } else {
                prerequisiteTestKey = chapterTestKey;
            }
        } else {
            prerequisiteTestKey = lessonTestKey;
        }

        if (prerequisiteTestKey && loadData(prerequisiteTestKey)) {
            const nextLessonId = LEKSJONS_REKKEFOLGE[currentIndex + 1];
            if (nextLessonId) {
                const nextLessonLink = nextLessonContainer.querySelector('a');
                nextLessonLink.href = `leksjon-${nextLessonId}.html`;
                nextLessonContainer.classList.remove('hidden');
            }
        }
    }
}