/**
 * Teacher Dashboard UI Controller
 * Cross-Platform Master Spec v3.3 - Aligned with iOS implementation
 *
 * Features:
 * - Class management (create, view, delete)
 * - Leaderboard with two modes: Poeng (weekly points) and SRS-mester
 * - SRS-mester shows composite score based on timing, graduation, regularity
 */

import * as firebaseClient from '../auth/firebase-client.js';
import { createClass, getTeacherClasses, getClassLeaderboard, getClassStats, deleteClass, removeStudentFromClass } from './class-manager.js';
import { getActiveCurriculum } from '../progress/store.js';
import { getCurriculumConfig } from '../progress/curriculum-registry.js';
import { renderGlossaryTestPanel, initGlossaryTab } from '../gloseproeve/glossary-test-teacher-ui.js';

// Map curriculum language codes to leaderboard language keys
const LANGUAGE_CODE_TO_KEY = { de: 'german', es: 'spanish', fr: 'french' };

function getDefaultLanguageFromCurriculum() {
    const config = getCurriculumConfig(getActiveCurriculum());
    return LANGUAGE_CODE_TO_KEY[config?.languageConfig?.code] || 'german';
}

// Language display configuration for leaderboard
// Add new languages here when they are added to VocabProfileService.SUPPORTED_LANGUAGES
const LEADERBOARD_LANGUAGE_CONFIG = {
    german: {
        flag: '🇩🇪',
        name: 'Tysk',
        badgeBg: 'bg-accent2-100',
        badgeText: 'text-accent2-800',
        weeklyPointsKey: 'germanWeeklyPoints'
    },
    spanish: {
        flag: '🇪🇸',
        name: 'Spansk',
        badgeBg: 'bg-primary-100',
        badgeText: 'text-primary-800',
        weeklyPointsKey: 'spanishWeeklyPoints'
    },
    french: {
        flag: '🇫🇷',
        name: 'Fransk',
        badgeBg: 'bg-info-100',
        badgeText: 'text-info-800',
        weeklyPointsKey: 'frenchWeeklyPoints'
    }
};

// =============================================================================
// DOM ELEMENTS
// =============================================================================

const dashboardContent = document.getElementById('dashboard-content');
const authWarning = document.getElementById('auth-warning');
const userProfileEl = document.getElementById('user-profile');
const classesGrid = document.getElementById('classes-grid');
const createClassBtn = document.getElementById('create-class-btn');
const createModal = document.getElementById('create-modal');
const newClassNameInput = document.getElementById('new-class-name');
const confirmCreateBtn = document.getElementById('confirm-create');
const cancelCreateBtn = document.getElementById('cancel-create');

// Leaderboard Elements
const leaderboardSection = document.getElementById('leaderboard-section');
const leaderboardBody = document.getElementById('leaderboard-body');
const closeLeaderboardBtn = document.getElementById('close-leaderboard');
const lbClassName = document.getElementById('lb-class-name');
const lbClassCode = document.getElementById('lb-class-code');
const tabPoints = document.getElementById('tab-points');
const tabSRS = document.getElementById('tab-srs');
const tabGlossary = document.getElementById('tab-glossary');
const lbModeDescription = document.getElementById('lb-mode-description');
const classStatsEl = document.getElementById('class-stats');
const leaderboardTableContainer = document.getElementById('leaderboard-table-container');
const glossaryTestContainer = document.getElementById('glossary-test-container');

// =============================================================================
// STATE
// =============================================================================

let currentClassCode = null;
let currentTab = 'points'; // 'points' or 'srsOptimization'
let currentLanguage = getDefaultLanguageFromCurriculum(); // derived from active curriculum
let currentTargetWeek = null; // null = current week, or Monday date string for past weeks
let currentAllowNicknames = false; // Whether current class allows nicknames
let classes = [];

/**
 * Returns the Monday date string (YYYY-MM-DD) for the current week.
 */
function _getMonday(d = new Date()) {
    d = new Date(d);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

/**
 * Populates the week selector dropdown with current week + 4 past weeks.
 */
function _populateWeekSelector() {
    const weekSelect = document.getElementById('week-select');
    if (!weekSelect) return;

    const today = new Date();
    const monday = _getMonday(today);

    const options = [];

    // Current week
    options.push({ value: '', label: 'Denne uken' });

    // Past 4 weeks
    for (let i = 1; i <= 4; i++) {
        const pastMonday = new Date(monday);
        pastMonday.setDate(pastMonday.getDate() - (7 * i));
        const pastSunday = new Date(pastMonday);
        pastSunday.setDate(pastSunday.getDate() + 6);

        const mondayStr = pastMonday.toISOString().split('T')[0];
        const label = `${pastMonday.getDate()}. ${_shortMonth(pastMonday)} – ${pastSunday.getDate()}. ${_shortMonth(pastSunday)}`;
        options.push({ value: mondayStr, label });
    }

    weekSelect.innerHTML = options.map(o =>
        `<option value="${o.value}">${o.label}</option>`
    ).join('');

    weekSelect.value = currentTargetWeek || '';
}

function _shortMonth(date) {
    return date.toLocaleDateString('nb-NO', { month: 'short' }).replace('.', '');
}

// =============================================================================
// INITIALIZATION
// =============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    // Explicitly trigger lazy initialization
    if (firebaseClient.isAuthAvailable()) {
        firebaseClient.auth.onAuthStateChanged(handleAuthState);
    } else {
        // Fallback or retry if init failed
        console.warn("Auth not available immediately");
        setTimeout(() => {
            if (firebaseClient.isAuthAvailable()) {
                firebaseClient.auth.onAuthStateChanged(handleAuthState);
            }
        }, 1000);
    }
});

// =============================================================================
// AUTHENTICATION
// =============================================================================

function handleAuthState(user) {
    const isTeacherMode = localStorage.getItem('tysk08_teacherMode') === 'true';

    if (user) {
        dashboardContent.classList.remove('hidden');
        authWarning.classList.add('hidden');
        userProfileEl.textContent = user.displayName || user.email;
        loadClasses();
    } else if (isTeacherMode) {
        // Allow local access in Teacher Mode (Offline/Dev)
        dashboardContent.classList.remove('hidden');
        authWarning.classList.add('hidden');
        userProfileEl.textContent = '👨‍🏫 Lærer (Lokalmodus)';
        loadClasses();
    } else {
        dashboardContent.classList.add('hidden');
        authWarning.classList.remove('hidden');
        userProfileEl.textContent = 'Ikke logget inn';
    }
}

// =============================================================================
// CLASS MANAGEMENT
// =============================================================================

async function loadClasses() {
    classesGrid.innerHTML = `
        <div class="col-span-full text-center py-12 text-neutral-500 italic">
            <div class="animate-pulse">Laster klasser...</div>
        </div>
    `;

    try {
        classes = await getTeacherClasses();
        renderClasses();
    } catch (error) {
        console.error("Error loading classes:", error);
        classesGrid.innerHTML = `
            <div class="col-span-full text-center py-12 text-error-500">
                <p class="font-bold mb-2">Kunne ikke laste klasser</p>
                <p class="text-sm">${error.message}</p>
            </div>
        `;
    }
}

function renderClasses() {
    if (classes.length === 0) {
        classesGrid.innerHTML = `
            <div class="col-span-full text-center py-16 bg-surface rounded-xl border-2 border-dashed border-neutral-300">
                <div class="text-5xl mb-4">📚</div>
                <h3 class="text-xl font-bold text-neutral-400 mb-2">Ingen klasser enda</h3>
                <p class="text-neutral-500 mb-6">Opprett din første klasse for å komme i gang.</p>
                <button onclick="document.getElementById('create-class-btn').click()"
                        class="bg-accent3-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-accent3-700 transition-colors">
                    + Opprett klasse
                </button>
            </div>
        `;
        return;
    }

    // Determine base URL for invite links (works on staging and production)
    const baseUrl = window.location.origin;
    const inviteUrlBase = `${baseUrl}/ordtrener/tysk/?join=`;

    classesGrid.innerHTML = classes.map(cls => `
        <div class="bg-surface p-6 rounded-xl shadow-sm border border-neutral-200 hover:shadow-md transition-shadow class-card" data-code="${cls.code}">
            <div class="flex justify-between items-start mb-4">
                <h3 class="text-xl font-bold text-neutral-800">${escapeHtml(cls.name)}</h3>
                <span class="bg-accent3-100 text-accent3-800 text-xs font-mono py-1 px-2 rounded select-all cursor-pointer"
                      title="Klikk for å kopiere koden"
                      onclick="event.stopPropagation(); navigator.clipboard.writeText('${cls.code}'); this.textContent='Kopiert!'; setTimeout(() => this.textContent='${cls.code}', 1500)">
                    ${cls.code}
                </span>
            </div>
            <div class="flex items-center gap-2 text-neutral-500 text-sm mb-4">
                <span>👥 ${cls.memberCount || 0} elever</span>
                <span>•</span>
                <span>📅 ${new Date(cls.created).toLocaleDateString('nb-NO')}</span>
            </div>
            <div class="flex gap-2 mb-2">
                <button class="flex-1 py-2 bg-accent3-50 text-accent3-700 font-bold rounded-lg hover:bg-accent3-100 transition-colors view-leaderboard-btn">
                    📊 Se Leaderboard
                </button>
                <button class="py-2 px-3 bg-neutral-100 text-neutral-500 rounded-lg hover:bg-error-50 hover:text-error-600 transition-colors delete-class-btn"
                        title="Slett klasse">
                    🗑️
                </button>
            </div>
            <button class="w-full py-2 bg-success-50 text-success-700 font-medium rounded-lg hover:bg-success-100 transition-colors text-sm copy-invite-link-btn"
                    data-url="${inviteUrlBase}${cls.code}"
                    title="Kopier invitasjonslenke">
                🔗 Kopier invitasjonslenke
            </button>
        </div>
    `).join('');

    // Add event listeners
    document.querySelectorAll('.class-card').forEach(el => {
        el.querySelector('.view-leaderboard-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openLeaderboard(el.dataset.code);
        });
        el.querySelector('.delete-class-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            confirmDeleteClass(el.dataset.code);
        });
        el.querySelector('.copy-invite-link-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const btn = e.target;
            const url = btn.dataset.url;
            navigator.clipboard.writeText(url).then(() => {
                const originalText = btn.textContent;
                btn.textContent = '✅ Lenke kopiert!';
                btn.classList.remove('bg-success-50', 'text-success-700');
                btn.classList.add('bg-success-100', 'text-success-800');
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.classList.remove('bg-success-100', 'text-success-800');
                    btn.classList.add('bg-success-50', 'text-success-700');
                }, 2000);
            });
        });
    });
}

// =============================================================================
// CREATE CLASS MODAL
// =============================================================================

createClassBtn.addEventListener('click', () => {
    createModal.classList.remove('hidden');
    newClassNameInput.focus();
});

function closeCreateModal() {
    createModal.classList.add('hidden');
    newClassNameInput.value = '';
    // Reset the checkbox
    const allowNicknamesCheckbox = document.getElementById('allow-nicknames-checkbox');
    if (allowNicknamesCheckbox) allowNicknamesCheckbox.checked = false;
}

cancelCreateBtn.addEventListener('click', closeCreateModal);

// Close modal on backdrop click
createModal.addEventListener('click', (e) => {
    if (e.target === createModal) closeCreateModal();
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !createModal.classList.contains('hidden')) {
        closeCreateModal();
    }
});

confirmCreateBtn.addEventListener('click', async () => {
    const name = newClassNameInput.value.trim();
    if (!name) {
        newClassNameInput.focus();
        return;
    }

    // Get the allow nicknames setting
    const allowNicknamesCheckbox = document.getElementById('allow-nicknames-checkbox');
    const allowNicknames = allowNicknamesCheckbox?.checked || false;

    confirmCreateBtn.disabled = true;
    confirmCreateBtn.textContent = 'Oppretter...';

    try {
        const newClass = await createClass(name, { allowNicknames });
        await loadClasses();
        closeCreateModal();

        // Show success message with code
        const namePolicyMsg = allowNicknames ? '' : ' (ekte navn påkrevd)';
        showToast(`Klasse "${name}" opprettet! Kode: ${newClass.code}${namePolicyMsg}`, 'success');
    } catch (error) {
        showToast('Feil ved opprettelse: ' + error.message, 'error');
    } finally {
        confirmCreateBtn.disabled = false;
        confirmCreateBtn.textContent = 'Opprett';
    }
});

// =============================================================================
// DELETE CLASS
// =============================================================================

async function confirmDeleteClass(classCode) {
    const cls = classes.find(c => c.code === classCode);
    if (!cls) return;

    const confirmed = confirm(
        `Er du sikker på at du vil slette klassen "${cls.name}"?\n\n` +
        `Klassekode: ${classCode}\n` +
        `Elever: ${cls.memberCount || 0}\n\n` +
        `Denne handlingen kan ikke angres.`
    );

    if (!confirmed) return;

    try {
        await deleteClass(classCode);
        await loadClasses();
        showToast(`Klassen "${cls.name}" er slettet`, 'success');
    } catch (error) {
        showToast('Feil ved sletting: ' + error.message, 'error');
    }
}

// =============================================================================
// LEADERBOARD
// =============================================================================

async function openLeaderboard(classCode) {
    const cls = classes.find(c => c.code === classCode);
    if (!cls) return;

    currentClassCode = classCode;
    currentAllowNicknames = cls.allowNicknames || false;

    // UI Updates
    classesGrid.classList.add('hidden');
    createClassBtn.classList.add('hidden');
    leaderboardSection.classList.remove('hidden');
    lbClassName.textContent = cls.name;
    lbClassCode.textContent = cls.code;

    // Sync language selector to current curriculum default
    currentLanguage = getDefaultLanguageFromCurriculum();
    const langSelect = document.getElementById('language-select');
    if (langSelect) langSelect.value = currentLanguage;

    // Load stats
    loadClassStats(classCode);

    // Default to points tab
    switchTab('points');
}

closeLeaderboardBtn.addEventListener('click', () => {
    leaderboardSection.classList.add('hidden');
    classesGrid.classList.remove('hidden');
    createClassBtn.classList.remove('hidden');
    currentClassCode = null;
});

// Tab event listeners
tabPoints.addEventListener('click', () => switchTab('points'));
tabSRS.addEventListener('click', () => switchTab('srsOptimization'));
if (tabGlossary) {
    tabGlossary.addEventListener('click', () => switchTab('glossary'));
}

// Language selector event listener
const languageSelect = document.getElementById('language-select');
if (languageSelect) {
    languageSelect.addEventListener('change', (e) => {
        switchLanguage(e.target.value);
    });
}

// Week selector event listener
const weekSelect = document.getElementById('week-select');
if (weekSelect) {
    weekSelect.addEventListener('change', (e) => {
        currentTargetWeek = e.target.value || null;
        loadLeaderboardData();
    });
}

// Populate week selector on load
_populateWeekSelector();

// Refresh leaderboard button
const refreshBtn = document.getElementById('refresh-leaderboard');
if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
        refreshBtn.classList.add('animate-spin');
        refreshBtn.disabled = true;
        try {
            await Promise.all([
                loadLeaderboardData(),
                currentClassCode ? loadClassStats(currentClassCode) : Promise.resolve()
            ]);
        } finally {
            refreshBtn.classList.remove('animate-spin');
            refreshBtn.disabled = false;
        }
    });
}

async function switchTab(tab) {
    currentTab = tab;

    // Update tab button styles
    const activeClass = 'bg-surface shadow-sm text-neutral-800';
    const inactiveClass = 'text-neutral-600 hover:text-neutral-900 bg-transparent shadow-none';

    // Get selector elements
    const languageSelector = document.getElementById('language-selector');
    const weekSelector = document.getElementById('week-selector');
    // Get the info box for SRS
    const infoBox = document.querySelector('#leaderboard-section .px-6.pt-4.pb-0');

    // Reset all tabs to inactive
    tabPoints.className = `px-4 py-2 rounded-md text-sm font-bold transition-all ${inactiveClass}`;
    tabSRS.className = `px-4 py-2 rounded-md text-sm font-bold transition-all ${inactiveClass}`;
    if (tabGlossary) tabGlossary.className = `px-4 py-2 rounded-md text-sm font-bold transition-all ${inactiveClass}`;

    if (tab === 'points') {
        tabPoints.className = `px-4 py-2 rounded-md text-sm font-bold transition-all ${activeClass}`;
        if (lbModeDescription) lbModeDescription.textContent = 'Ukens poeng fra trening og spill';
        if (languageSelector) languageSelector.classList.remove('hidden');
        if (weekSelector) weekSelector.classList.remove('hidden');
        if (infoBox) infoBox.classList.remove('hidden');
        if (leaderboardTableContainer) leaderboardTableContainer.classList.remove('hidden');
        if (glossaryTestContainer) glossaryTestContainer.classList.add('hidden');
        if (classStatsEl) classStatsEl.classList.remove('hidden');
        await loadLeaderboardData();
    } else if (tab === 'srsOptimization') {
        tabSRS.className = `px-4 py-2 rounded-md text-sm font-bold transition-all ${activeClass}`;
        if (lbModeDescription) lbModeDescription.textContent = 'Optimal bruk av repetisjonssystemet (siste 28 dager)';
        if (languageSelector) languageSelector.classList.add('hidden');
        if (weekSelector) weekSelector.classList.add('hidden');
        if (infoBox) infoBox.classList.remove('hidden');
        if (leaderboardTableContainer) leaderboardTableContainer.classList.remove('hidden');
        if (glossaryTestContainer) glossaryTestContainer.classList.add('hidden');
        if (classStatsEl) classStatsEl.classList.remove('hidden');
        await loadLeaderboardData();
    } else if (tab === 'glossary') {
        if (tabGlossary) tabGlossary.className = `px-4 py-2 rounded-md text-sm font-bold transition-all ${activeClass}`;
        if (lbModeDescription) lbModeDescription.textContent = 'Opprett og administrer gloseprøver';
        if (languageSelector) languageSelector.classList.add('hidden');
        if (weekSelector) weekSelector.classList.add('hidden');
        if (infoBox) infoBox.classList.add('hidden');
        if (leaderboardTableContainer) leaderboardTableContainer.classList.add('hidden');
        if (glossaryTestContainer) glossaryTestContainer.classList.remove('hidden');
        if (classStatsEl) classStatsEl.classList.add('hidden');
        // Initialize and render glossary test panel
        const currentLang = getDefaultLanguageFromCurriculum();
        initGlossaryTab(currentClassCode, {}, currentAllowNicknames, currentLang);
        await renderGlossaryTestPanel(glossaryTestContainer, currentClassCode);
    }
}

/**
 * Switch language filter for leaderboard
 * @param {string} language - 'all', 'german', or 'spanish'
 */
async function switchLanguage(language) {
    currentLanguage = language;

    // Update selector UI
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
        languageSelect.value = language;
    }

    await loadLeaderboardData();
}

async function loadLeaderboardData() {
    leaderboardBody.innerHTML = `
        <tr>
            <td colspan="4" class="p-8 text-center text-neutral-500">
                <div class="animate-pulse">Laster rangliste...</div>
            </td>
        </tr>
    `;

    // Pass language filter only for points mode (SRS is always global)
    const languageFilter = currentTab === 'points' ? currentLanguage : 'all';
    // Pass targetWeek only for points mode
    const targetWeek = currentTab === 'points' ? currentTargetWeek : null;
    const students = await getClassLeaderboard(currentClassCode, currentTab, languageFilter, targetWeek);

    // Update description to reflect if viewing a past week
    if (currentTab === 'points' && lbModeDescription) {
        if (currentTargetWeek) {
            const weekDate = new Date(currentTargetWeek + 'T00:00:00');
            const endDate = new Date(weekDate);
            endDate.setDate(endDate.getDate() + 6);
            const label = `${weekDate.getDate()}. ${_shortMonth(weekDate)} – ${endDate.getDate()}. ${_shortMonth(endDate)}`;
            lbModeDescription.textContent = `Poeng fra ${label}`;
        } else {
            lbModeDescription.textContent = 'Ukens poeng fra trening og spill';
        }
    }

    if (students.length === 0) {
        leaderboardBody.innerHTML = `
            <tr>
                <td colspan="4" class="p-12 text-center text-neutral-500">
                    <div class="text-4xl mb-4">🏆</div>
                    <p class="font-bold mb-2">Ingen på ranglisten enda</p>
                    <p class="text-sm">Elevene må trene for å komme på listen</p>
                </td>
            </tr>
        `;
        return;
    }

    leaderboardBody.innerHTML = students.map((s, i) => {
        const rankDisplay = getRankDisplay(i);
        const scoreDisplay = getScoreDisplay(s, currentTab);

        // Name display logic based on allowNicknames setting
        let nameDisplay;
        if (currentAllowNicknames) {
            // Nicknames allowed: Show display name with real name underneath (for teacher visibility)
            nameDisplay = s.realName
                ? `<div>
                       <span class="font-bold text-neutral-800">${escapeHtml(s.displayName)}</span>
                       <div class="text-xs text-neutral-400 mt-0.5">📧 ${escapeHtml(s.realName)}</div>
                   </div>`
                : `<span class="font-bold text-neutral-800">${escapeHtml(s.displayName)}</span>`;
        } else {
            // Real names required: Show real name as primary
            const primaryName = s.realName || s.displayName;
            const showNickname = s.displayName && s.realName && s.displayName !== s.realName;
            nameDisplay = showNickname
                ? `<div>
                       <span class="font-bold text-neutral-800">${escapeHtml(primaryName)}</span>
                       <div class="text-xs text-neutral-400 mt-0.5">💬 ${escapeHtml(s.displayName)}</div>
                   </div>`
                : `<span class="font-bold text-neutral-800">${escapeHtml(primaryName)}</span>`;
        }

        return `
            <tr class="group border-b border-neutral-100 hover:bg-neutral-50 transition-colors ${s.isCurrentUser ? 'bg-info-50' : ''}" data-uid="${s.uid}">
                <td class="py-4 px-4 font-mono font-bold text-neutral-400 text-center w-16">
                    ${rankDisplay}
                </td>
                <td class="py-4 px-4">
                    ${nameDisplay}
                    ${s.isCurrentUser ? '<span class="ml-2 text-xs text-info-600">(deg)</span>' : ''}
                </td>
                <td class="py-4 px-4 text-center text-neutral-600">
                    <span class="text-sm">🔥 ${s.currentStreak}</span>
                </td>
                <td class="py-4 px-4 text-right flex items-center justify-end gap-2">
                    ${scoreDisplay}
                    <button class="remove-student-btn ml-2 p-1.5 rounded-lg text-neutral-400 hover:text-error-500 hover:bg-error-50 transition-colors opacity-0 group-hover:opacity-100"
                            data-uid="${s.uid}" data-name="${escapeHtml(s.realName || s.displayName)}"
                            title="Fjern elev fra klasse">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                        </svg>
                    </button>
                </td>
            </tr>
            ${currentTab === 'srsOptimization' && s.srsScore ? getSRSDetailsRow(s) : ''}
        `;
    }).join('');

    // Add disclaimer for past week view
    if (currentTargetWeek && currentTab === 'points') {
        leaderboardBody.innerHTML += `
            <tr>
                <td colspan="4" class="pt-4 pb-2 px-4 text-center">
                    <p class="text-xs text-neutral-400 italic">
                        Viser kun poeng som ble synkronisert i l&oslash;pet av uken.
                        Poeng trent offline teller for uken de ble synkronisert.
                    </p>
                </td>
            </tr>
        `;
    }

    // Add remove student event listeners
    document.querySelectorAll('.remove-student-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            confirmRemoveStudent(btn.dataset.uid, btn.dataset.name);
        });
    });
}

function getRankDisplay(index) {
    if (index === 0) return '👑';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
}

function getScoreDisplay(student, tab) {
    if (tab === 'points') {
        // Show language-specific badge when filtering
        let badge = '';
        const langConfig = LEADERBOARD_LANGUAGE_CONFIG[currentLanguage];

        if (langConfig) {
            // Language-specific filtering - use configured styles
            const points = student[langConfig.weeklyPointsKey] || 0;
            badge = `
                <span class="${langConfig.badgeBg} ${langConfig.badgeText} py-1 px-3 rounded-full font-bold text-sm" title="${langConfig.name} poeng denne uken">
                    ${points} p
                </span>
            `;
        } else {
            // "all" or unknown language - show global weekly points
            badge = `
                <span class="bg-accent4-100 text-accent4-800 py-1 px-3 rounded-full font-bold text-sm" title="Alle poeng denne uken">
                    ${student.weeklyPoints} p
                </span>
            `;
        }
        return badge;
    } else {
        return `
            <span class="bg-info-100 text-info-800 py-1 px-3 rounded-full font-bold text-sm cursor-help"
                  title="Timing: ${Math.round((student.srsScore?.timingScore || 0) * 100)}% | Gradert: ${student.srsScore?.graduationScore || 0} | Regularitet: ${Math.round((student.srsScore?.regularityScore || 0) * 100)}%">
                ${student.score}
            </span>
        `;
    }
}

function getSRSDetailsRow(student) {
    const srs = student.srsScore;
    if (!srs) return '';

    return `
        <tr class="bg-neutral-50 border-b border-neutral-100 text-xs text-neutral-500">
            <td></td>
            <td colspan="3" class="py-2 px-4">
                <div class="flex gap-6">
                    <span title="Timing adherence">⏱️ Timing: <strong>${Math.round(srs.timingScore * 100)}%</strong></span>
                    <span title="Words graduated to long intervals">📈 Gradert: <strong>${srs.graduationScore}</strong></span>
                    <span title="Session regularity">📅 Regularitet: <strong>${Math.round(srs.regularityScore * 100)}%</strong></span>
                    <span class="text-neutral-400">| ${srs.reviewCount} reviews over ${srs.trainingDayCount} dager</span>
                </div>
            </td>
        </tr>
    `;
}

async function loadClassStats(classCode) {
    if (!classStatsEl) return;

    try {
        const stats = await getClassStats(classCode);
        classStatsEl.innerHTML = `
            <div class="flex gap-6 text-sm">
                <span class="flex items-center gap-1">
                    <span class="text-neutral-500">👥</span>
                    <strong>${stats.totalStudents}</strong> elever
                </span>
                <span class="flex items-center gap-1">
                    <span class="text-neutral-500">✅</span>
                    <strong>${stats.activeThisWeek}</strong> aktive denne uken
                </span>
                <span class="flex items-center gap-1">
                    <span class="text-neutral-500">🔥</span>
                    Snitt streak: <strong>${stats.averageStreak}</strong>
                </span>
            </div>
        `;
    } catch (error) {
        console.error("Error loading class stats:", error);
        classStatsEl.innerHTML = '';
    }
}

// =============================================================================
// REMOVE STUDENT
// =============================================================================

async function confirmRemoveStudent(studentUid, displayName) {
    const confirmed = confirm(
        `Er du sikker på at du vil fjerne "${displayName}" fra klassen?\n\n` +
        `Eleven vil bli fjernet fra ranglisten og mister tilgang til klassekoden.`
    );

    if (!confirmed) return;

    try {
        await removeStudentFromClass(currentClassCode, studentUid);
        showToast(`${displayName} er fjernet fra klassen`, 'success');
        await loadLeaderboardData();
        await loadClassStats(currentClassCode);
    } catch (error) {
        showToast('Feil ved fjerning: ' + error.message, 'error');
    }
}

// =============================================================================
// UTILITIES
// =============================================================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white font-medium z-50 transition-all transform translate-y-0 opacity-100 ${
        type === 'success' ? 'bg-success-600' :
        type === 'error' ? 'bg-error-600' :
        'bg-neutral-800'
    }`;
    toast.textContent = message;

    document.body.appendChild(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
