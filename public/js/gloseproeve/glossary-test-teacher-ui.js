/**
 * Glossary Test Teacher UI (Gloseprøve - Teacher Dashboard)
 *
 * Renders within the teacher dashboard leaderboard section.
 * Handles:
 * - Creating new glossary tests
 * - Viewing results per test
 * - Student progression history
 * - Class-level statistics
 */

import {
    createGlossaryTest,
    getClassGlossaryTests,
    getTestResults,
    getStudentTestHistory,
    getClassTestStats,
    toggleTestActive,
    getTestActiveStatus,
    grantBonusAttempts,
    extendTestTime
} from './glossary-test-service.js';

// State
let currentClassCode = null;
let currentClassStudentDetails = {};
let currentAllowNicknames = false;
let currentLanguage = 'german'; // Default to german

// Curriculum options per language (only fully implemented ones)
const CURRICULUM_BY_LANGUAGE = {
    german: [
        { value: 'tysk1-vg1', label: 'Tysk 1 Vg1' }
    ],
    spanish: [
        { value: 'spansk1-vg1', label: 'Spansk 1 Vg1' }
    ],
    french: [
        { value: 'fransk1-vg1', label: 'Fransk 1 Vg1' }
    ]
};

/**
 * Initialize the glossary test tab with class context.
 * Called by dashboard-ui.js when switching to the glossary tab.
 *
 * @param {string} classCode
 * @param {Object} studentDetails - Map of uid -> { realName }
 * @param {boolean} allowNicknames
 * @param {string} language - Current language ('german', 'spanish', 'french')
 */
export function initGlossaryTab(classCode, studentDetails, allowNicknames, language = 'german') {
    currentClassCode = classCode;
    currentClassStudentDetails = studentDetails || {};
    currentAllowNicknames = allowNicknames;
    currentLanguage = language || 'german';
}

/**
 * Renders the full glossary test panel into the leaderboard body area.
 * Replaces the leaderboard table content with the glossary test UI.
 *
 * @param {HTMLElement} container - The container to render into
 * @param {string} classCode
 */
export async function renderGlossaryTestPanel(container, classCode) {
    currentClassCode = classCode;

    container.innerHTML = `
        <div class="p-6">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-lg font-bold text-neutral-800">Gloseprøver</h3>
                <button id="gt-create-btn" class="bg-accent3-600 hover:bg-accent3-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm">
                    + Ny gloseprøve
                </button>
            </div>
            <div id="gt-stats-area" class="mb-6"></div>
            <div id="gt-tests-list" class="space-y-4">
                <div class="text-center py-8 text-neutral-400 animate-pulse">Laster gloseprøver...</div>
            </div>
            <div id="gt-detail-view" class="hidden"></div>
        </div>
    `;

    container.querySelector('#gt-create-btn').addEventListener('click', () => showCreateModal(classCode));

    await loadTestsList(container, classCode);
    await loadStats(container, classCode);
}

/**
 * Loads and renders the list of glossary tests for the class.
 */
async function loadTestsList(container, classCode) {
    const listEl = container.querySelector('#gt-tests-list');

    try {
        const tests = await getClassGlossaryTests(classCode);

        if (tests.length === 0) {
            listEl.innerHTML = `
                <div class="text-center py-12 bg-neutral-50 rounded-xl border-2 border-dashed border-neutral-300">
                    <div class="text-4xl mb-3">📝</div>
                    <p class="font-bold text-neutral-500 mb-1">Ingen gloseprøver enda</p>
                    <p class="text-sm text-neutral-400">Klikk "+ Ny gloseprøve" for å opprette den første.</p>
                </div>
            `;
            return;
        }

        // Load result counts for each test and compute status
        const testsWithResults = await Promise.all(tests.map(async (test) => {
            const results = await getTestResults(test.code);
            const status = getTestActiveStatus(test);
            return { ...test, results, completions: results.length, _status: status };
        }));

        listEl.innerHTML = testsWithResults.map(test => {
            const avgScore = test.completions > 0
                ? Math.round(test.results.reduce((sum, r) => sum + (r.bestScore || 0), 0) / test.completions)
                : 0;
            const date = new Date(test.createdAt).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' });
            const status = test._status;

            // Determine badge style and text
            let badgeClass, badgeText;
            if (status.isExpired) {
                badgeClass = 'bg-primary-100 text-primary-700';
                badgeText = 'Utløpt';
            } else if (status.isActive) {
                badgeClass = 'bg-success-100 text-success-700';
                badgeText = 'Aktiv';
            } else {
                badgeClass = 'bg-neutral-100 text-neutral-500';
                badgeText = 'Inaktiv';
            }

            // Show countdown for active tests with expiration
            let countdownHtml = '';
            if (status.isActive && status.minutesRemaining !== null) {
                const mins = status.minutesRemaining;
                if (mins <= 10) {
                    countdownHtml = `<span class="text-xs text-primary-600 font-bold animate-pulse">⏱️ ${mins} min igjen</span>`;
                } else if (mins <= 60) {
                    countdownHtml = `<span class="text-xs text-neutral-500">⏱️ ${mins} min igjen</span>`;
                } else {
                    const hours = Math.floor(mins / 60);
                    const remainMins = mins % 60;
                    countdownHtml = `<span class="text-xs text-neutral-500">⏱️ ${hours}t ${remainMins}m igjen</span>`;
                }
            }

            // Button text depends on status
            let toggleBtnClass, toggleBtnText;
            if (status.isExpired) {
                toggleBtnClass = 'bg-primary-50 text-primary-600 hover:bg-primary-100';
                toggleBtnText = 'Reaktiver';
            } else if (status.isActive) {
                toggleBtnClass = 'bg-neutral-100 text-neutral-500 hover:bg-error-50 hover:text-error-600';
                toggleBtnText = 'Deaktiver';
            } else {
                toggleBtnClass = 'bg-success-50 text-success-600 hover:bg-success-100';
                toggleBtnText = 'Aktiver';
            }

            return `
                <div class="bg-surface border border-neutral-200 rounded-xl p-4 hover:shadow-md transition-shadow gt-test-card" data-code="${test.code}">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <h4 class="font-bold text-neutral-800">${escapeHtml(test.title)}</h4>
                            <p class="text-xs text-neutral-500 mt-0.5">${date} — ${test.chapterMode === 'teacher' ? `Kap. ${test.chapters.join(', ')}` : 'Elev velger kapitler'}</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="font-mono text-xs bg-neutral-100 px-2 py-1 rounded select-all cursor-pointer" title="Klikk for å kopiere"
                                  onclick="event.stopPropagation(); navigator.clipboard.writeText('${test.code}'); this.textContent='Kopiert!'; setTimeout(() => this.textContent='${test.code}', 1500)">
                                ${test.code}
                            </span>
                            <span class="text-xs px-2 py-0.5 rounded-full ${badgeClass}">
                                ${badgeText}
                            </span>
                        </div>
                    </div>
                    <div class="flex gap-4 text-sm text-neutral-600 mb-3 flex-wrap">
                        <span>👥 ${test.completions} fullført</span>
                        <span>📊 Snitt: ${avgScore}%</span>
                        <span>🔄 Maks ${test.maxAttempts} forsøk</span>
                        ${countdownHtml}
                    </div>
                    <div class="flex gap-2">
                        <button class="gt-view-results flex-1 py-2 bg-accent3-50 text-accent3-700 font-bold text-sm rounded-lg hover:bg-accent3-100 transition-colors" data-code="${test.code}">
                            Se resultater
                        </button>
                        ${status.isActive && status.expiresAt ? `
                            <button class="gt-extend-time py-2 px-3 bg-primary-50 text-primary-600 text-sm rounded-lg hover:bg-primary-100 transition-colors" data-code="${test.code}" title="Forleng tid">
                                +⏱️
                            </button>
                        ` : ''}
                        <button class="gt-toggle-active py-2 px-3 text-sm rounded-lg transition-colors ${toggleBtnClass}"
                                data-code="${test.code}" data-active="${status.isActive}" data-expired="${status.isExpired}">
                            ${toggleBtnText}
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Event listeners
        listEl.querySelectorAll('.gt-view-results').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const test = testsWithResults.find(t => t.code === btn.dataset.code);
                if (test) showTestResults(container, test);
            });
        });

        // Extend time button
        listEl.querySelectorAll('.gt-extend-time').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                showExtendTimeModal(btn.dataset.code, classCode, container);
            });
        });

        listEl.querySelectorAll('.gt-toggle-active').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const isCurrentlyActive = btn.dataset.active === 'true';
                const isExpired = btn.dataset.expired === 'true';

                try {
                    if (isExpired || !isCurrentlyActive) {
                        // Reactivating - show time selection modal
                        showReactivateModal(btn.dataset.code, classCode, container);
                    } else {
                        // Deactivating - show confirmation dialog
                        showDeactivateConfirmModal(btn.dataset.code, classCode, container);
                    }
                } catch (err) {
                    alert('Feil: ' + err.message);
                }
            });
        });

    } catch (err) {
        listEl.innerHTML = `<div class="text-center py-8 text-error-500">${err.message}</div>`;
    }
}

/**
 * Loads and renders class-level statistics.
 */
async function loadStats(container, classCode) {
    const statsEl = container.querySelector('#gt-stats-area');
    try {
        const stats = await getClassTestStats(classCode);
        if (stats.totalTests === 0) {
            statsEl.innerHTML = '';
            return;
        }

        statsEl.innerHTML = `
            <div class="grid grid-cols-3 gap-4 text-center">
                <div class="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                    <div class="text-2xl font-bold text-neutral-800">${stats.totalTests}</div>
                    <div class="text-xs text-neutral-500">Prøver opprettet</div>
                </div>
                <div class="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                    <div class="text-2xl font-bold ${stats.averageScore >= 80 ? 'text-success-600' : 'text-primary-600'}">${stats.averageScore}%</div>
                    <div class="text-xs text-neutral-500">Gjennomsnittscore</div>
                </div>
                <div class="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                    <div class="text-2xl font-bold text-accent3-600">${stats.completionRate}%</div>
                    <div class="text-xs text-neutral-500">Gjennomføring</div>
                </div>
            </div>
        `;
    } catch (err) {
        statsEl.innerHTML = '';
    }
}

/**
 * Shows detailed results for a specific test.
 */
function showTestResults(container, test) {
    const listEl = container.querySelector('#gt-tests-list');
    const detailEl = container.querySelector('#gt-detail-view');
    const statsEl = container.querySelector('#gt-stats-area');
    const createBtn = container.querySelector('#gt-create-btn');

    listEl.classList.add('hidden');
    statsEl.classList.add('hidden');
    createBtn.classList.add('hidden');
    detailEl.classList.remove('hidden');

    const results = test.results || [];

    detailEl.innerHTML = `
        <div>
            <button id="gt-back-to-list" class="text-xs font-bold text-neutral-500 hover:text-neutral-800 mb-4 flex items-center gap-1">
                <span>←</span> TILBAKE TIL PRØVER
            </button>

            <div class="mb-6">
                <h3 class="text-xl font-bold text-neutral-800">${escapeHtml(test.title)}</h3>
                <p class="text-sm text-neutral-500 mt-1">
                    Kode: <span class="font-mono bg-neutral-100 px-2 py-0.5 rounded">${test.code}</span>
                    — ${test.chapterMode === 'teacher' ? `Kap. ${test.chapters.join(', ')}` : 'Elev velger'}
                    — Maks ${test.maxAttempts} forsøk
                </p>
            </div>

            ${results.length === 0 ? `
                <div class="text-center py-12 bg-neutral-50 rounded-xl">
                    <div class="text-4xl mb-3">🏆</div>
                    <p class="text-neutral-500">Ingen resultater enda</p>
                </div>
            ` : `
                <table class="w-full text-left">
                    <thead class="text-neutral-500 text-xs uppercase tracking-wider border-b border-neutral-100">
                        <tr>
                            <th class="pb-3 px-4 w-12 text-center">#</th>
                            <th class="pb-3 px-4">Elev</th>
                            ${test.chapterMode === 'student' ? '<th class="pb-3 px-4">Kapitler</th>' : ''}
                            <th class="pb-3 px-4 text-center">Prosent</th>
                            <th class="pb-3 px-4 text-center">Score</th>
                            <th class="pb-3 px-4 text-center" title="Kjønnsartikkel-nøyaktighet (der/die/das)">Kjønn</th>
                            <th class="pb-3 px-4 text-center">Forsøk</th>
                            <th class="pb-3 px-4 text-right">Dato</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${results.map((r, i) => {
                            const name = getStudentName(r);
                            const date = r.completedAt
                                ? new Date(r.completedAt).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                                : (r.inProgress ? 'Pågår...' : '—');
                            const scoreDisplay = r.bestFinalScore !== undefined && r.totalVocab
                                ? `${r.bestFinalScore}/${r.totalVocab}`
                                : '—';
                            const genderDisplay = r.genderAccuracy !== undefined && r.genderAccuracy !== null
                                ? `${r.genderAccuracy}%`
                                : '—';
                            const genderColor = r.genderAccuracy >= 80 ? 'text-success-600' : r.genderAccuracy >= 50 ? 'text-primary-600' : r.genderAccuracy !== null && r.genderAccuracy !== undefined ? 'text-error-600' : 'text-neutral-400';

                            return `
                                <tr class="border-b border-neutral-100 hover:bg-neutral-50 transition-colors cursor-pointer gt-student-row" data-uid="${r.studentUid}">
                                    <td class="py-3 px-4 text-center font-mono text-neutral-400">${i + 1}</td>
                                    <td class="py-3 px-4">
                                        <span class="font-bold text-neutral-800">${escapeHtml(name)}</span>
                                    </td>
                                    ${test.chapterMode === 'student' ? `<td class="py-3 px-4 text-neutral-600 text-sm">${(r.chapters || []).join(', ') || '—'}</td>` : ''}
                                    <td class="py-3 px-4 text-center">
                                        ${r.bestScore !== undefined ? `
                                            <span class="py-1 px-3 rounded-full font-bold text-sm ${r.bestScore >= 80 ? 'bg-success-100 text-success-800' : r.bestScore >= 50 ? 'bg-primary-100 text-primary-800' : 'bg-error-100 text-error-800'}">
                                                ${r.bestScore}%
                                            </span>
                                        ` : `<span class="text-neutral-400 text-sm">${r.inProgress ? 'Pågår' : '—'}</span>`}
                                    </td>
                                    <td class="py-3 px-4 text-center text-neutral-700 text-sm font-medium">${scoreDisplay}</td>
                                    <td class="py-3 px-4 text-center text-sm font-medium ${genderColor}">${genderDisplay}</td>
                                    <td class="py-3 px-4 text-center text-neutral-600 text-sm">${r.attemptsUsed || 0}/${test.maxAttempts + (r.bonusAttempts || 0)}${r.bonusAttempts ? ` <span class="text-success-600 text-xs">(+${r.bonusAttempts})</span>` : ''}</td>
                                    <td class="py-3 px-4 text-right text-neutral-500 text-sm">${date}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `}
        </div>
    `;

    // Back button
    detailEl.querySelector('#gt-back-to-list').addEventListener('click', () => {
        detailEl.classList.add('hidden');
        listEl.classList.remove('hidden');
        statsEl.classList.remove('hidden');
        createBtn.classList.remove('hidden');
    });

    // Student row click -> show student actions modal
    detailEl.querySelectorAll('.gt-student-row').forEach(row => {
        row.addEventListener('click', () => {
            const studentResult = results.find(r => r.studentUid === row.dataset.uid);
            if (studentResult) {
                showStudentActionsModal(container, test, studentResult);
            }
        });
    });
}

/**
 * Shows a student's progression across all glossary tests.
 */
async function showStudentProgression(container, studentUid, studentName) {
    const detailEl = container.querySelector('#gt-detail-view');

    detailEl.innerHTML = `
        <div>
            <button id="gt-back-to-results" class="text-xs font-bold text-neutral-500 hover:text-neutral-800 mb-4 flex items-center gap-1">
                <span>←</span> TILBAKE TIL RESULTATER
            </button>

            <h3 class="text-xl font-bold text-neutral-800 mb-2">Progresjon: ${escapeHtml(studentName)}</h3>
            <div id="gt-progression-content" class="text-center py-8 text-neutral-400 animate-pulse">
                Laster historikk...
            </div>
        </div>
    `;

    detailEl.querySelector('#gt-back-to-results').addEventListener('click', () => {
        // Go back to the parent view - reload tests list
        renderGlossaryTestPanel(container, currentClassCode);
    });

    try {
        const history = await getStudentTestHistory(currentClassCode, studentUid);
        const contentEl = detailEl.querySelector('#gt-progression-content');

        if (history.length === 0) {
            contentEl.innerHTML = `
                <div class="text-center py-8">
                    <p class="text-neutral-500">Ingen gloseprøve-resultater for denne eleven.</p>
                </div>
            `;
            return;
        }

        // Calculate progression stats
        const scores = history.filter(h => h.bestScore !== undefined).map(h => h.bestScore);
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        const trend = scores.length >= 2 ? scores[scores.length - 1] - scores[0] : 0;

        contentEl.innerHTML = `
            <!-- Summary Stats -->
            <div class="grid grid-cols-3 gap-4 text-center mb-6">
                <div class="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                    <div class="text-xl font-bold text-neutral-800">${history.length}</div>
                    <div class="text-xs text-neutral-500">Prøver tatt</div>
                </div>
                <div class="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                    <div class="text-xl font-bold ${avgScore >= 80 ? 'text-success-600' : 'text-primary-600'}">${avgScore}%</div>
                    <div class="text-xs text-neutral-500">Gjennomsnitt</div>
                </div>
                <div class="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                    <div class="text-xl font-bold ${trend > 0 ? 'text-success-600' : trend < 0 ? 'text-error-600' : 'text-neutral-600'}">
                        ${trend > 0 ? '+' : ''}${trend}%
                    </div>
                    <div class="text-xs text-neutral-500">Utvikling</div>
                </div>
            </div>

            <!-- Score Progression Chart (simple bar chart) -->
            <div class="mb-6 bg-neutral-50 p-4 rounded-lg border border-neutral-200">
                <h4 class="text-sm font-bold text-neutral-700 mb-3">Score-utvikling</h4>
                <div class="flex items-end gap-2 h-32">
                    ${history.map((h, i) => {
                        const score = h.bestScore || 0;
                        const height = Math.max(score, 5); // Minimum bar height
                        const color = score >= 80 ? 'bg-success-400' : score >= 50 ? 'bg-primary-400' : 'bg-error-400';
                        return `
                            <div class="flex-1 flex flex-col items-center gap-1">
                                <span class="text-xs font-bold text-neutral-600">${score}%</span>
                                <div class="${color} rounded-t w-full transition-all" style="height: ${height}%"></div>
                                <span class="text-[10px] text-neutral-400 truncate w-full text-center" title="${h.testTitle}">${i + 1}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- Detailed History Table -->
            <table class="w-full text-left">
                <thead class="text-neutral-500 text-xs uppercase tracking-wider border-b border-neutral-100">
                    <tr>
                        <th class="pb-2 px-3">Prøve</th>
                        <th class="pb-2 px-3">Kapitler</th>
                        <th class="pb-2 px-3 text-center">Prosent</th>
                        <th class="pb-2 px-3 text-center">Score</th>
                        <th class="pb-2 px-3 text-center" title="Kjønnsartikkel-nøyaktighet (der/die/das)">Kjønn</th>
                        <th class="pb-2 px-3 text-center">Forsøk</th>
                        <th class="pb-2 px-3 text-right">Dato</th>
                    </tr>
                </thead>
                <tbody>
                    ${history.map(h => {
                        const date = h.completedAt
                            ? new Date(h.completedAt).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
                            : '—';
                        const scoreDisplay = h.bestFinalScore !== undefined && h.totalVocab
                            ? `${h.bestFinalScore}/${h.totalVocab}`
                            : '—';
                        const genderDisplay = h.genderAccuracy !== undefined && h.genderAccuracy !== null
                            ? `${h.genderAccuracy}%`
                            : '—';
                        const genderColor = h.genderAccuracy >= 80 ? 'text-success-600' : h.genderAccuracy >= 50 ? 'text-primary-600' : h.genderAccuracy !== null && h.genderAccuracy !== undefined ? 'text-error-600' : 'text-neutral-400';

                        return `
                            <tr class="border-b border-neutral-100">
                                <td class="py-2 px-3 font-medium text-neutral-800 text-sm">${escapeHtml(h.testTitle)}</td>
                                <td class="py-2 px-3 text-neutral-600 text-sm">${(h.chapters || []).join(', ') || '—'}</td>
                                <td class="py-2 px-3 text-center">
                                    <span class="py-0.5 px-2 rounded-full text-xs font-bold ${h.bestScore >= 80 ? 'bg-success-100 text-success-800' : h.bestScore >= 50 ? 'bg-primary-100 text-primary-800' : 'bg-error-100 text-error-800'}">
                                        ${h.bestScore !== undefined ? h.bestScore + '%' : '—'}
                                    </span>
                                </td>
                                <td class="py-2 px-3 text-center text-neutral-700 text-sm font-medium">${scoreDisplay}</td>
                                <td class="py-2 px-3 text-center text-sm font-medium ${genderColor}">${genderDisplay}</td>
                                <td class="py-2 px-3 text-center text-neutral-500 text-sm">${h.attemptsUsed || 0}/${h.maxAttempts || '?'}</td>
                                <td class="py-2 px-3 text-right text-neutral-500 text-sm">${date}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        detailEl.querySelector('#gt-progression-content').innerHTML = `
            <div class="text-error-500 py-8">${err.message}</div>
        `;
    }
}

/**
 * Shows the create glossary test modal.
 */
function showCreateModal(classCode) {
    const existing = document.getElementById('gt-create-modal');
    if (existing) existing.remove();

    // Get curriculums for current language
    const curriculums = CURRICULUM_BY_LANGUAGE[currentLanguage] || CURRICULUM_BY_LANGUAGE.german;
    const curriculumOptions = curriculums.map((c, i) =>
        `<option value="${c.value}"${i === 0 ? ' selected' : ''}>${c.label}</option>`
    ).join('');

    const modal = document.createElement('div');
    modal.id = 'gt-create-modal';
    modal.className = 'fixed inset-0 bg-neutral-900 bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-surface rounded-xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 class="text-xl font-bold text-neutral-800 mb-4">Opprett gloseprøve</h3>

            <label class="block text-sm font-bold text-neutral-700 mb-1">Tittel</label>
            <input type="text" id="gt-title" placeholder="F.eks. Uke 5 gloseprøve"
                   class="w-full px-4 py-2 border-2 border-neutral-300 rounded-lg focus:border-accent3-500 focus:outline-none mb-4" maxlength="50">

            <label class="block text-sm font-bold text-neutral-700 mb-1">Pensum</label>
            <select id="gt-curriculum" class="w-full px-4 py-2 border-2 border-neutral-300 rounded-lg focus:border-accent3-500 focus:outline-none mb-4">
                ${curriculumOptions}
            </select>

            <label class="block text-sm font-bold text-neutral-700 mb-1">Hvem velger kapitler?</label>
            <div class="flex gap-3 mb-4">
                <label class="flex-1 flex items-center gap-2 p-3 bg-neutral-50 rounded-lg border-2 border-neutral-200 cursor-pointer has-[:checked]:border-accent3-500 has-[:checked]:bg-accent3-50">
                    <input type="radio" name="gt-chapter-mode" value="teacher" checked class="text-accent3-600">
                    <span class="text-sm font-medium">Lærer velger</span>
                </label>
                <label class="flex-1 flex items-center gap-2 p-3 bg-neutral-50 rounded-lg border-2 border-neutral-200 cursor-pointer has-[:checked]:border-accent3-500 has-[:checked]:bg-accent3-50">
                    <input type="radio" name="gt-chapter-mode" value="student" class="text-accent3-600">
                    <span class="text-sm font-medium">Elev velger</span>
                </label>
            </div>

            <div id="gt-chapter-select" class="mb-4">
                <label class="block text-sm font-bold text-neutral-700 mb-2">Velg kapitler</label>
                <div id="gt-chapter-bubbles" class="flex flex-wrap gap-2">
                    ${Array.from({ length: 12 }, (_, i) => i + 1).map(ch => `
                        <button class="gt-create-ch w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-neutral-100 text-neutral-500 border-2 border-transparent transition-all hover:border-accent3-300"
                                data-chapter="${ch}" type="button">
                            ${ch}
                        </button>
                    `).join('')}
                </div>
            </div>

            <label class="block text-sm font-bold text-neutral-700 mb-1">Antall forsøk</label>
            <select id="gt-attempts" class="w-full px-4 py-2 border-2 border-neutral-300 rounded-lg focus:border-accent3-500 focus:outline-none mb-4">
                <option value="1">1 forsøk</option>
                <option value="2">2 forsøk</option>
                <option value="3" selected>3 forsøk</option>
                <option value="5">5 forsøk</option>
                <option value="10">10 forsøk (ubegrenset)</option>
            </select>

            <!-- Auto-expiration settings -->
            <div class="mb-4 p-3 bg-primary-50 rounded-lg border border-primary-200">
                <label class="flex items-center gap-2 cursor-pointer mb-2">
                    <input type="checkbox" id="gt-auto-expire" checked class="w-4 h-4 text-primary-600 rounded">
                    <span class="text-sm font-bold text-neutral-700">Deaktiver automatisk etter:</span>
                </label>
                <select id="gt-expire-time" class="w-full px-3 py-2 border-2 border-neutral-300 rounded-lg focus:border-primary-500 focus:outline-none text-sm">
                    <option value="30">30 minutter</option>
                    <option value="45">45 minutter</option>
                    <option value="60" selected>60 minutter (1 time)</option>
                    <option value="90">90 minutter</option>
                    <option value="120">2 timer</option>
                    <option value="480">Hele dagen (8 timer)</option>
                </select>
                <p class="text-xs text-primary-700 mt-2">Prøven deaktiveres automatisk når tiden er ute. Elever som holder på får 60 sekunder til å fullføre.</p>
            </div>

            <div id="gt-create-error" class="hidden mb-4 bg-error-50 p-3 rounded-lg border border-error-200 text-error-700 text-sm"></div>

            <div class="flex gap-3">
                <button id="gt-cancel-create" class="flex-1 px-4 py-3 bg-neutral-200 text-neutral-700 font-bold rounded-lg hover:bg-neutral-300 transition-colors">
                    Avbryt
                </button>
                <button id="gt-confirm-create" class="flex-1 px-4 py-3 bg-accent3-600 text-white font-bold rounded-lg hover:bg-accent3-700 transition-colors">
                    Opprett
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const selectedChapters = new Set();
    const chapterSelectDiv = modal.querySelector('#gt-chapter-select');
    const autoExpireCheckbox = modal.querySelector('#gt-auto-expire');
    const expireTimeSelect = modal.querySelector('#gt-expire-time');

    // Chapter mode toggle
    modal.querySelectorAll('input[name="gt-chapter-mode"]').forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'student') {
                chapterSelectDiv.classList.add('hidden');
            } else {
                chapterSelectDiv.classList.remove('hidden');
            }
        });
    });

    // Auto-expire toggle
    autoExpireCheckbox.addEventListener('change', () => {
        expireTimeSelect.disabled = !autoExpireCheckbox.checked;
        expireTimeSelect.classList.toggle('opacity-50', !autoExpireCheckbox.checked);
    });

    // Chapter bubble toggle
    modal.querySelectorAll('.gt-create-ch').forEach(btn => {
        btn.addEventListener('click', () => {
            const ch = parseInt(btn.dataset.chapter, 10);
            if (selectedChapters.has(ch)) {
                selectedChapters.delete(ch);
                btn.classList.remove('bg-accent3-500', 'text-white', 'border-accent3-500');
                btn.classList.add('bg-neutral-100', 'text-neutral-500', 'border-transparent');
            } else {
                selectedChapters.add(ch);
                btn.classList.remove('bg-neutral-100', 'text-neutral-500', 'border-transparent');
                btn.classList.add('bg-accent3-500', 'text-white', 'border-accent3-500');
            }
        });
    });

    // Close
    modal.querySelector('#gt-cancel-create').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    // Create
    modal.querySelector('#gt-confirm-create').addEventListener('click', async () => {
        const title = modal.querySelector('#gt-title').value.trim() || 'Gloseprøve';
        const curriculum = modal.querySelector('#gt-curriculum').value;
        const chapterMode = modal.querySelector('input[name="gt-chapter-mode"]:checked').value;
        const maxAttempts = parseInt(modal.querySelector('#gt-attempts').value, 10);
        const autoExpire = modal.querySelector('#gt-auto-expire').checked;
        const expireMinutes = autoExpire ? parseInt(modal.querySelector('#gt-expire-time').value, 10) : null;
        const errorEl = modal.querySelector('#gt-create-error');

        // Map curriculum to language
        const langMap = { 'tysk1-vg1': 'german', 'tysk2-vg2': 'german', 'spansk1-vg1': 'spanish', 'spansk2-vg2': 'spanish', 'fransk1-vg1': 'french' };
        const language = langMap[curriculum] || 'german';

        if (chapterMode === 'teacher' && selectedChapters.size === 0) {
            errorEl.textContent = 'Velg minst ett kapittel.';
            errorEl.classList.remove('hidden');
            return;
        }

        const confirmBtn = modal.querySelector('#gt-confirm-create');
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Oppretter...';
        errorEl.classList.add('hidden');

        try {
            const testData = await createGlossaryTest({
                classCode,
                curriculum,
                language,
                chapterMode,
                chapters: chapterMode === 'teacher' ? Array.from(selectedChapters).sort((a, b) => a - b) : [],
                maxAttempts,
                title,
                autoExpireMinutes: expireMinutes
            });

            modal.remove();

            // Show success with code
            showCodeReveal(testData.code, title);

            // Reload the tests list
            const container = document.querySelector('#gt-tests-list')?.closest('.p-6')?.parentElement;
            if (container) {
                await loadTestsList(container.querySelector('.p-6') ? container : container.parentElement, classCode);
                await loadStats(container.querySelector('.p-6') ? container : container.parentElement, classCode);
            }

        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.classList.remove('hidden');
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Opprett';
        }
    });
}

/**
 * Shows a modal with the test code prominently displayed for sharing.
 */
function showCodeReveal(code, title) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-neutral-900 bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-surface rounded-xl shadow-2xl max-w-sm w-full p-6 text-center">
            <div class="text-4xl mb-3">✅</div>
            <h3 class="text-lg font-bold text-neutral-800 mb-2">${escapeHtml(title)}</h3>
            <p class="text-sm text-neutral-600 mb-4">Del denne koden med elevene:</p>
            <div class="bg-accent3-50 border-2 border-accent3-200 rounded-xl p-4 mb-4 cursor-pointer select-all"
                 onclick="navigator.clipboard.writeText('${code}'); document.getElementById('gt-code-copied').classList.remove('hidden')">
                <span class="text-3xl font-mono font-black text-accent3-700 tracking-widest">${code}</span>
                <p class="text-xs text-accent3-500 mt-1">Klikk for å kopiere</p>
                <p id="gt-code-copied" class="hidden text-xs text-success-600 font-bold mt-1">Kopiert!</p>
            </div>
            <button class="w-full py-3 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 font-bold rounded-lg transition-colors"
                    onclick="this.closest('.fixed').remove()">
                Lukk
            </button>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

/**
 * Shows a confirmation modal before deactivating a test.
 * Warns the teacher about the impact on students currently taking the test.
 */
function showDeactivateConfirmModal(testCode, classCode, container) {
    const existing = document.getElementById('gt-deactivate-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'gt-deactivate-modal';
    modal.className = 'fixed inset-0 bg-neutral-900 bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-surface rounded-xl shadow-2xl max-w-md w-full p-6">
            <div class="flex items-center gap-3 mb-4">
                <span class="text-3xl">⚠️</span>
                <h3 class="text-lg font-bold text-neutral-800">Deaktiver gloseprøve?</h3>
            </div>

            <div class="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-4">
                <p class="text-sm text-primary-800 mb-2 font-medium">Dette vil:</p>
                <ul class="text-sm text-primary-700 space-y-1 list-disc list-inside">
                    <li>Gi elever som holder på <strong>60 sekunder</strong> til å fullføre</li>
                    <li>Avslutte prøven automatisk etter nådeperioden</li>
                    <li>Telle forsøket som brukt (også for ufullførte prøver)</li>
                </ul>
            </div>

            <p class="text-sm text-neutral-600 mb-4">
                Du kan reaktivere prøven senere. Kun elever med gjenværende forsøk kan da ta prøven på nytt.
            </p>

            <div class="flex gap-3">
                <button id="gt-deact-cancel" class="flex-1 px-4 py-3 bg-neutral-200 text-neutral-700 font-bold rounded-lg hover:bg-neutral-300 transition-colors">
                    Avbryt
                </button>
                <button id="gt-deact-confirm" class="flex-1 px-4 py-3 bg-error-600 text-white font-bold rounded-lg hover:bg-error-700 transition-colors">
                    Deaktiver
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Cancel
    modal.querySelector('#gt-deact-cancel').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    // Confirm deactivation
    modal.querySelector('#gt-deact-confirm').addEventListener('click', async () => {
        const confirmBtn = modal.querySelector('#gt-deact-confirm');
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Deaktiverer...';

        try {
            await toggleTestActive(testCode, false);
            modal.remove();
            await loadTestsList(container, classCode);
        } catch (err) {
            alert('Feil: ' + err.message);
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Deaktiver';
        }
    });
}

/**
 * Shows a modal to reactivate an expired or inactive test with a new expiration time.
 */
function showReactivateModal(testCode, classCode, container) {
    const existing = document.getElementById('gt-reactivate-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'gt-reactivate-modal';
    modal.className = 'fixed inset-0 bg-neutral-900 bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-surface rounded-xl shadow-2xl max-w-sm w-full p-6">
            <h3 class="text-lg font-bold text-neutral-800 mb-4">Reaktiver gloseprøve</h3>

            <label class="flex items-center gap-2 cursor-pointer mb-3">
                <input type="checkbox" id="gt-react-auto-expire" checked class="w-4 h-4 text-primary-600 rounded">
                <span class="text-sm font-medium text-neutral-700">Deaktiver automatisk etter:</span>
            </label>
            <select id="gt-react-expire-time" class="w-full px-3 py-2 border-2 border-neutral-300 rounded-lg focus:border-primary-500 focus:outline-none text-sm mb-4">
                <option value="30">30 minutter</option>
                <option value="45">45 minutter</option>
                <option value="60" selected>60 minutter (1 time)</option>
                <option value="90">90 minutter</option>
                <option value="120">2 timer</option>
                <option value="480">Hele dagen (8 timer)</option>
            </select>

            <div class="flex gap-3">
                <button id="gt-react-cancel" class="flex-1 px-4 py-2 bg-neutral-200 text-neutral-700 font-bold rounded-lg hover:bg-neutral-300 transition-colors">
                    Avbryt
                </button>
                <button id="gt-react-confirm" class="flex-1 px-4 py-2 bg-success-600 text-white font-bold rounded-lg hover:bg-success-700 transition-colors">
                    Reaktiver
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const autoExpireCheckbox = modal.querySelector('#gt-react-auto-expire');
    const expireTimeSelect = modal.querySelector('#gt-react-expire-time');

    // Toggle handler
    autoExpireCheckbox.addEventListener('change', () => {
        expireTimeSelect.disabled = !autoExpireCheckbox.checked;
        expireTimeSelect.classList.toggle('opacity-50', !autoExpireCheckbox.checked);
    });

    // Cancel
    modal.querySelector('#gt-react-cancel').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    // Confirm
    modal.querySelector('#gt-react-confirm').addEventListener('click', async () => {
        const autoExpire = autoExpireCheckbox.checked;
        const expireMinutes = autoExpire ? parseInt(expireTimeSelect.value, 10) : null;

        const confirmBtn = modal.querySelector('#gt-react-confirm');
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Aktiverer...';

        try {
            await toggleTestActive(testCode, true, expireMinutes);
            modal.remove();
            await loadTestsList(container, classCode);
        } catch (err) {
            alert('Feil: ' + err.message);
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Reaktiver';
        }
    });
}

/**
 * Shows a modal to extend the time for an active test.
 */
function showExtendTimeModal(testCode, classCode, container) {
    const existing = document.getElementById('gt-extend-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'gt-extend-modal';
    modal.className = 'fixed inset-0 bg-neutral-900 bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-surface rounded-xl shadow-2xl max-w-sm w-full p-6">
            <h3 class="text-lg font-bold text-neutral-800 mb-4">Forleng tid</h3>

            <p class="text-sm text-neutral-600 mb-4">
                Velg hvor mye ekstra tid du vil gi. Alle elever som holder på får oppdatert tid automatisk.
            </p>

            <div class="grid grid-cols-3 gap-3 mb-4">
                <button class="gt-extend-btn py-3 bg-primary-50 hover:bg-primary-100 text-primary-700 font-bold rounded-lg transition-colors" data-minutes="15">+15 min</button>
                <button class="gt-extend-btn py-3 bg-primary-50 hover:bg-primary-100 text-primary-700 font-bold rounded-lg transition-colors" data-minutes="30">+30 min</button>
                <button class="gt-extend-btn py-3 bg-primary-50 hover:bg-primary-100 text-primary-700 font-bold rounded-lg transition-colors" data-minutes="60">+1 time</button>
            </div>

            <div id="gt-extend-feedback" class="hidden mb-4 p-3 rounded-lg text-sm"></div>

            <button id="gt-close-extend-modal" class="w-full py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 font-bold rounded-lg transition-colors">
                Avbryt
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelectorAll('.gt-extend-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const minutes = parseInt(btn.dataset.minutes, 10);
            const feedback = modal.querySelector('#gt-extend-feedback');

            try {
                btn.disabled = true;
                const originalText = btn.textContent;
                btn.textContent = '...';
                await extendTestTime(testCode, minutes);

                feedback.className = 'mb-4 p-3 rounded-lg text-sm bg-success-50 text-success-700 border border-success-200';
                feedback.textContent = `Forlenget med ${minutes} minutter. Elever får oppdatert tid automatisk.`;
                feedback.classList.remove('hidden');

                setTimeout(() => {
                    modal.remove();
                    loadTestsList(container, classCode);
                }, 1500);
            } catch (err) {
                feedback.className = 'mb-4 p-3 rounded-lg text-sm bg-error-50 text-error-700 border border-error-200';
                feedback.textContent = err.message;
                feedback.classList.remove('hidden');
                btn.textContent = btn.dataset.minutes === '60' ? '+1 time' : `+${btn.dataset.minutes} min`;
                btn.disabled = false;
            }
        });
    });

    modal.querySelector('#gt-close-extend-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

/**
 * Shows a modal with student actions (bonus attempts, view progression).
 */
function showStudentActionsModal(container, test, studentResult) {
    const existing = document.getElementById('gt-student-actions-modal');
    if (existing) existing.remove();

    const studentName = getStudentName(studentResult);
    const bonusAttempts = studentResult.bonusAttempts || 0;
    const totalUsed = studentResult.attemptsUsed || 0;
    const totalAllowed = test.maxAttempts + bonusAttempts;

    const modal = document.createElement('div');
    modal.id = 'gt-student-actions-modal';
    modal.className = 'fixed inset-0 bg-neutral-900 bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-surface rounded-xl shadow-2xl max-w-sm w-full p-6">
            <h3 class="text-lg font-bold text-neutral-800 mb-4">${escapeHtml(studentName)}</h3>

            <div class="bg-neutral-50 p-3 rounded-lg mb-4">
                <p class="text-sm text-neutral-600">
                    Forsøk brukt: <strong>${totalUsed}</strong> av ${totalAllowed}
                    ${bonusAttempts > 0 ? `<span class="text-success-600">(+${bonusAttempts} ekstra)</span>` : ''}
                </p>
                <p class="text-sm text-neutral-600">
                    Beste resultat: <strong>${studentResult.bestScore || 0}%</strong>
                </p>
            </div>

            <label class="block text-sm font-bold text-neutral-700 mb-2">Gi ekstra forsøk</label>
            <div class="flex gap-2 mb-4">
                <button class="gt-bonus-btn flex-1 py-2 bg-neutral-100 hover:bg-success-100 hover:text-success-700 rounded-lg font-bold transition-colors" data-amount="1">+1</button>
                <button class="gt-bonus-btn flex-1 py-2 bg-neutral-100 hover:bg-success-100 hover:text-success-700 rounded-lg font-bold transition-colors" data-amount="2">+2</button>
                <button class="gt-bonus-btn flex-1 py-2 bg-neutral-100 hover:bg-success-100 hover:text-success-700 rounded-lg font-bold transition-colors" data-amount="3">+3</button>
            </div>

            <div id="gt-bonus-feedback" class="hidden mb-4 p-3 rounded-lg text-sm"></div>

            <button id="gt-view-progression" class="w-full py-2 mb-2 bg-accent3-50 text-accent3-700 font-bold rounded-lg hover:bg-accent3-100 transition-colors">
                Se progresjon
            </button>

            <button id="gt-close-student-modal" class="w-full py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 font-bold rounded-lg transition-colors">
                Lukk
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    // Grant bonus attempts handler
    modal.querySelectorAll('.gt-bonus-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const amount = parseInt(btn.dataset.amount, 10);
            const feedback = modal.querySelector('#gt-bonus-feedback');

            try {
                btn.disabled = true;
                const originalText = btn.textContent;
                btn.textContent = '...';
                await grantBonusAttempts(test.code, studentResult.studentUid, amount);

                feedback.className = 'mb-4 p-3 rounded-lg text-sm bg-success-50 text-success-700 border border-success-200';
                feedback.textContent = `Ga ${amount} ekstra forsøk til ${studentName}`;
                feedback.classList.remove('hidden');

                // Update local state
                studentResult.bonusAttempts = (studentResult.bonusAttempts || 0) + amount;
                const newTotal = test.maxAttempts + studentResult.bonusAttempts;

                // Update display in modal
                modal.querySelector('.bg-neutral-50 p').innerHTML = `
                    Forsøk brukt: <strong>${totalUsed}</strong> av ${newTotal}
                    <span class="text-success-600">(+${studentResult.bonusAttempts} ekstra)</span>
                `;

                btn.textContent = originalText;
                btn.disabled = false;
            } catch (err) {
                feedback.className = 'mb-4 p-3 rounded-lg text-sm bg-error-50 text-error-700 border border-error-200';
                feedback.textContent = err.message;
                feedback.classList.remove('hidden');
                btn.textContent = `+${btn.dataset.amount}`;
                btn.disabled = false;
            }
        });
    });

    // View progression
    modal.querySelector('#gt-view-progression').addEventListener('click', () => {
        modal.remove();
        showStudentProgression(container, studentResult.studentUid, studentName);
    });

    // Close handler
    modal.querySelector('#gt-close-student-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

// =============================================================================
// HELPERS
// =============================================================================

function getStudentName(result) {
    if (currentAllowNicknames) {
        return result.displayName || 'Elev';
    }
    return result.realName || result.displayName || 'Elev';
}

function getStudentNameByUid(uid, results) {
    const r = results.find(r => r.studentUid === uid);
    return r ? getStudentName(r) : 'Elev';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}
