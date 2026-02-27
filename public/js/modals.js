/**
 * =================================================================
 * MODAL DIALOGS
 * =================================================================
 *
 * Reusable modal dialog utilities for confirmations and alerts.
 * Replaces browser confirm() and alert() for better device compatibility.
 */

/**
 * Viser en bekreftelsesmodal med Ja/Nei-knapper
 * @param {string} message - Meldingen som skal vises
 * @param {string} title - Tittel på modalen (default: "Bekreft")
 * @returns {Promise<boolean>} - Promise som resolver til true hvis bruker bekrefter, false hvis avbryt
 */
export function showConfirmModal(message, title = "Bekreft") {
    return new Promise((resolve) => {
        // Opprett modal struktur
        const modalHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900 bg-opacity-50" id="confirm-modal-backdrop">
                <div class="bg-surface rounded-xl shadow-2xl max-w-md w-full p-6 transform transition-all">
                    <h3 class="text-xl font-bold text-neutral-800 mb-4">${title}</h3>
                    <div class="text-neutral-700 mb-6 whitespace-pre-line">${message}</div>
                    <div class="flex gap-3 justify-end">
                        <button class="confirm-modal-cancel px-5 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-semibold rounded-lg transition-colors">
                            Avbryt
                        </button>
                        <button class="confirm-modal-confirm px-5 py-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-lg transition-colors">
                            Ja, fortsett
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Sett inn modal i DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const backdrop = document.getElementById('confirm-modal-backdrop');
        const cancelBtn = backdrop.querySelector('.confirm-modal-cancel');
        const confirmBtn = backdrop.querySelector('.confirm-modal-confirm');

        // Funksjon for å fjerne modal
        const closeModal = (result) => {
            backdrop.remove();
            resolve(result);
        };

        // Event listeners
        cancelBtn.addEventListener('click', () => closeModal(false));
        confirmBtn.addEventListener('click', () => closeModal(true));
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) closeModal(false);
        });

        // ESC-tast for å lukke
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', escHandler);
                closeModal(false);
            }
        };
        document.addEventListener('keydown', escHandler);

        // Fokuser på bekreft-knappen
        confirmBtn.focus();
    });
}

/**
 * Viser en informasjonsmodal med OK-knapp
 * @param {string} message - Meldingen som skal vises
 * @param {string} title - Tittel på modalen (default: "Informasjon")
 * @param {string} type - Type melding: 'success', 'error', 'info' (default: 'info')
 * @returns {Promise<void>} - Promise som resolver når bruker lukker modalen
 */
export function showAlertModal(message, title = "Informasjon", type = "info") {
    return new Promise((resolve) => {
        // Remove any existing alert modal to prevent duplicate ID issues
        const existingModal = document.getElementById('alert-modal-backdrop');
        if (existingModal) {
            existingModal.remove();
        }

        // Bestem farger basert på type
        let iconColor = 'text-info-500';
        let buttonColor = 'bg-info-500 hover:bg-info-600';

        if (type === 'success') {
            iconColor = 'text-success-600';
            buttonColor = 'bg-success-600 hover:bg-success-700';
        } else if (type === 'error') {
            iconColor = 'text-error-600';
            buttonColor = 'bg-error-600 hover:bg-error-700';
        }

        // Opprett modal struktur
        const modalHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900 bg-opacity-50" id="alert-modal-backdrop">
                <div class="bg-surface rounded-xl shadow-2xl max-w-md w-full p-6 transform transition-all">
                    <h3 class="text-xl font-bold ${iconColor} mb-4">${title}</h3>
                    <div class="text-neutral-700 mb-6 whitespace-pre-line">${message}</div>
                    <div class="flex justify-end">
                        <button class="alert-modal-ok px-6 py-2 ${buttonColor} text-white font-semibold rounded-lg transition-colors">
                            OK
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Sett inn modal i DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const backdrop = document.getElementById('alert-modal-backdrop');
        const okBtn = backdrop.querySelector('.alert-modal-ok');

        // Funksjon for å fjerne modal
        const closeModal = () => {
            backdrop.remove();
            resolve();
        };

        // Event listeners
        okBtn.addEventListener('click', closeModal);
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) closeModal();
        });

        // ESC-tast for å lukke
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', escHandler);
                closeModal();
            }
        };
        document.addEventListener('keydown', escHandler);

        // Fokuser på OK-knappen
        okBtn.focus();
    });
}

/**
 * Viser en modal med en liste over valg
 * @param {Array} items - Liste over objekter { id, title, description }
 * @param {Object} options - Instillinger { title, currentId }
 * @returns {Promise<string>} - Resolver til valgt ID
 */
export function showListSelectorModal(items, options = {}) {
    return new Promise((resolve) => {
        const title = options.title || "Velg";
        const currentId = options.currentId || null;

        const itemsHTML = items.map(item => `
            <button class="list-modal-item w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between group ${item.id === currentId ? 'border-accent2-500 bg-accent2-50' : 'border-neutral-100 hover:border-accent2-200 hover:bg-neutral-50'}" 
                    data-id="${item.id}">
                <div>
                    <div class="font-bold ${item.id === currentId ? 'text-accent2-700' : 'text-neutral-800'} group-hover:text-accent2-600">${item.title}</div>
                    ${item.description ? `<div class="text-xs text-neutral-500">${item.description}</div>` : ''}
                </div>
                ${item.id === currentId ? '<div class="w-5 h-5 bg-accent2-500 rounded-full flex items-center justify-center"><svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor font-bold"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M5 13l4 4L19 7" /></svg></div>' : ''}
            </button>
        `).join('');

        const modalHTML = `
            <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-neutral-900 bg-opacity-50" id="list-modal-backdrop">
                <div class="bg-surface rounded-t-2xl sm:rounded-xl shadow-2xl max-w-md w-full p-6 animate-slide-up sm:animate-fade-in max-h-[85vh] flex flex-col">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="text-xl font-bold text-neutral-800">${title}</h3>
                        <button class="list-modal-close p-2 text-neutral-400 hover:text-neutral-600">
                            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    
                    <div class="overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                        ${itemsHTML}
                    </div>
                    
                    <div class="mt-6 sm:hidden pb-safe">
                        <button class="list-modal-close w-full py-3 bg-neutral-100 text-neutral-600 font-bold rounded-xl">Lukk</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const backdrop = document.getElementById('list-modal-backdrop');
        const itemElements = backdrop.querySelectorAll('.list-modal-item');
        const closeBtns = backdrop.querySelectorAll('.list-modal-close');

        const closeModal = (result) => {
            backdrop.remove();
            if (result) resolve(result);
        };

        itemElements.forEach(item => {
            item.addEventListener('click', () => closeModal(item.dataset.id));
        });

        closeBtns.forEach(btn => btn.addEventListener('click', () => closeModal(null)));

        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) closeModal(null);
        });
    });
}

/**
 * Specialized curriculum selector modal
 */
export async function showCurriculumSelectorModal(currentId, languageFilter = null) {
    const { CURRICULUM_REGISTRY } = await import('./progress/curriculum-registry.js');

    // Sort curricula for better list (VG1 before VG2, etc.)
    const sortedIds = Object.keys(CURRICULUM_REGISTRY).sort((a, b) => {
        const titleA = CURRICULUM_REGISTRY[a].title;
        const titleB = CURRICULUM_REGISTRY[b].title;
        return titleA.localeCompare(titleB);
    });

    // Filter by language if provided
    let filteredIds = sortedIds;
    if (languageFilter) {
        filteredIds = sortedIds.filter(id => {
            const config = CURRICULUM_REGISTRY[id];
            const cLang = config.languageDir || (config.languageConfig?.code === 'es' ? 'spanish' : 'german');
            return cLang === languageFilter;
        });
    }

    const items = filteredIds.map(id => ({
        id: id,
        title: CURRICULUM_REGISTRY[id].title,
        description: CURRICULUM_REGISTRY[id].description
    }));

    return showListSelectorModal(items, {
        title: "Velg Nivå",
        currentId: currentId
    });
}
