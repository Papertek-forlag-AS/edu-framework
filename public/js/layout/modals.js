/**
 * modals.js
 * Handles rendering and logic for Debug modals.
 */

import { getProgressData, getFullProgressData } from '../progress/store.js';
import { EXERCISE_DATABASE } from '../progress/config.js';
import { getAchievementColor } from '../progress/achievements.js';

export function renderDebugModal() {
    return `
    <div id="debug-modal"
        class="hidden fixed inset-0 bg-neutral-900 bg-opacity-50 z-50 flex items-center justify-center overflow-y-auto p-4">
        <div class="bg-surface rounded-xl shadow-2xl p-6 max-w-4xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-4 sticky top-0 bg-surface pb-4 border-b">
                <h2 class="text-2xl font-bold text-neutral-800">🔍 Achievement Debug Tool</h2>
                <button id="debug-close" class="text-neutral-400 hover:text-neutral-600 text-2xl">×</button>
            </div>
            <div id="debug-content" class="space-y-4">
            </div>
        </div>
    </div>`;
}

export function setupDebugTools() {
    const debugBtn = document.getElementById('debug-achievements-btn');
    const debugModal = document.getElementById('debug-modal');
    const debugClose = document.getElementById('debug-close');
    const debugContent = document.getElementById('debug-content');

    debugBtn?.addEventListener('click', () => {
        renderDebugData(debugContent);
        debugModal.classList.remove('hidden');
    });

    debugClose?.addEventListener('click', () => {
        debugModal.classList.add('hidden');
    });
}

function renderDebugData(container) {
    const progressData = getProgressData();
    // Simplified debug render for shell integration
    let html = '<h3 class="font-bold">Raw Progress Data</h3>';
    html += `<pre class="text-xs bg-neutral-100 p-4 rounded overflow-auto">${JSON.stringify(progressData, null, 2)}</pre>`;
    container.innerHTML = html;
}

/**
 * Viser en modal når brukeren prøver å åpne innhold offline som ikke er lastet ned
 */
export function showOfflineModal(onClose) {
    const overlay = document.createElement('div');
    overlay.id = 'offline-warning-overlay';
    overlay.className = 'fixed inset-0 bg-neutral-900 bg-opacity-50 z-50 flex items-center justify-center p-4';

    const modal = document.createElement('div');
    modal.className = 'bg-surface rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all duration-300 scale-100';
    modal.innerHTML = `
        <div class="p-6 text-center">
            <div class="flex justify-center mb-4">
                <div class="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center">
                    <span class="text-neutral-500 text-3xl">📡</span>
                </div>
            </div>
            <h3 class="text-xl font-bold text-neutral-900 mb-2">Du er offline</h3>
            <div class="mb-6">
                <p class="text-neutral-600 leading-relaxed">Du mangler internettforbindelse og har ikke besøkt denne leksjonen før.</p>
                <p class="text-neutral-500 text-sm mt-2">Koble til internett for å laste ned innholdet.</p>
            </div>
            <div class="flex justify-center">
                <button id="offline-modal-close" class="px-6 py-2.5 text-base font-medium text-white bg-neutral-600 hover:bg-neutral-700 rounded-lg transition-colors shadow-sm">
                    Forstått
                </button>
            </div>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const closeBtn = modal.querySelector('#offline-modal-close');

    function closeModal() {
        overlay.style.opacity = '0';
        modal.style.transform = 'scale(95%)';
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
            if (onClose) onClose();
        }, 300);
    }

    closeBtn.addEventListener('click', closeModal);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeModal();
        }
    });

    // Animation
    setTimeout(() => {
        overlay.style.opacity = '1';
    }, 10);
}
