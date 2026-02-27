/**
 * =================================================================
 * CELEBRATIONS - Achievement modal UI rendering
 * =================================================================
 *
 * This module handles the visual celebration modals shown when
 * achievements are earned. Pure UI rendering with no dependencies.
 */

/**
 * Viser stjerne-feiring når siste ekstraøvelse fullføres
 * @param {string} lessonId - ID for leksjonen
 * @param {number} completionCount - Antall ganger ekstraøvelsene er fullført
 */
export async function showStarCelebration(lessonId, completionCount = 1) {
    const levels = {
        1: { color: 'grønn', colorClass: 'green', cssBg: 'bg-success-50', cssBorder: 'border-success-500', cssText: 'text-success-600', title: 'Den grønne stjernen er din!' },
        2: { color: 'blå', colorClass: 'blue', cssBg: 'bg-info-50', cssBorder: 'border-info-500', cssText: 'text-info-600', title: 'Blåstjernen er din!' },
        3: { color: 'rubin', colorClass: 'red', cssBg: 'bg-error-50', cssBorder: 'border-error-600', cssText: 'text-error-700', title: 'Rubinstjernen er din!' },
        4: { color: 'gull', colorClass: 'amber', cssBg: 'bg-primary-50', cssBorder: 'border-primary-500', cssText: 'text-primary-600', title: 'Gullstjernen er din!' }
    };

    const level = completionCount <= 4 ? levels[completionCount] : levels[4];
    const starIconSVG = `<svg class="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.539 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.539-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.98 9.11c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>`;

    // Custom messages for each level
    let message;
    if (completionCount === 1) {
        message = `Fantastisk! 🎉 Du har fullført alle ekstraøvelsene i leksjon ${lessonId}. Som belønning har du gjort deg fortjent til en ${level.color} stjerne for denne leksjonen! Den ${level.color}e stjernen vises i kapitteloversikten i appen.`;
    } else if (completionCount === 2) {
        message = `Fantastisk! 🎉 Du har fullført alle ekstraøvelsene i leksjon ${lessonId} hele to ganger. Som belønning har du gjort deg fortjent til en blåstjerne for denne leksjonen! Blåstjernen vises i kapitteloversikten i appen.`;
    } else if (completionCount === 3) {
        message = `Fantastisk! 🎉 Du har fullført alle ekstraøvelsene i leksjon ${lessonId} hele tre ganger. Som belønning har du gjort deg fortjent til en rubinstjerne for denne leksjonen! Rubinstjernen vises i kapitteloversikten i appen.`;
    } else {
        message = `Fantastisk! 🎉 Du har fullført alle ekstraøvelsene i leksjon ${lessonId} hele ${completionCount} ganger. Som belønning har du gjort deg fortjent til en gullstjerne for denne leksjonen! Gullstjernen vises i kapitteloversikten i appen.`;
    }

    await showAchievementModal(
        message,
        level.title,
        starIconSVG,
        level.cssBg,
        level.cssBorder,
        level.cssText
    );
}

/**
 * Viser blyant-feiring når siste øvelse fullføres
 * @param {string} lessonId - ID for leksjonen
 * @param {number} completionCount - Antall ganger øvelsene er fullført
 */
export async function showPencilCelebration(lessonId, completionCount = 1) {
    const levels = {
        1: { color: 'grønn', colorClass: 'green', cssBg: 'bg-success-50', cssBorder: 'border-success-500', cssText: 'text-success-600', title: 'Den grønne blyanten er din!' },
        2: { color: 'blå', colorClass: 'blue', cssBg: 'bg-info-50', cssBorder: 'border-info-500', cssText: 'text-info-600', title: 'Blåblyanten er din!' },
        3: { color: 'rubin', colorClass: 'red', cssBg: 'bg-error-50', cssBorder: 'border-error-600', cssText: 'text-error-700', title: 'Rubinblyanten er din!' },
        4: { color: 'gull', colorClass: 'amber', cssBg: 'bg-primary-50', cssBorder: 'border-primary-500', cssText: 'text-primary-600', title: 'Gullblyanten er din!' }
    };

    const level = completionCount <= 4 ? levels[completionCount] : levels[4];
    const pencilIconSVG = `<svg class="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>`;

    // Custom messages for each level
    let message;
    if (completionCount === 1) {
        message = `Gratulerer! 🎉 Du har fullført alle øvelsene i leksjon ${lessonId}. Som belønning har du gjort deg fortjent til en ${level.color} blyant for denne leksjonen! Den ${level.color}e blyanten vises i kapitteloversikten i appen.`;
    } else if (completionCount === 2) {
        message = `Gratulerer! 🎉 Du har fullført alle øvelsene i leksjon ${lessonId} hele to ganger. Som belønning har du gjort deg fortjent til en blåblyant for denne leksjonen! Blåblyanten vises i kapitteloversikten i appen.`;
    } else if (completionCount === 3) {
        message = `Gratulerer! 🎉 Du har fullført alle øvelsene i leksjon ${lessonId} hele tre ganger. Som belønning har du gjort deg fortjent til en rubinblyant for denne leksjonen! Rubinblyanten vises i kapitteloversikten i appen.`;
    } else {
        message = `Gratulerer! 🎉 Du har fullført alle øvelsene i leksjon ${lessonId} hele ${completionCount} ganger. Som belønning har du gjort deg fortjent til en gullblyant for denne leksjonen! Gullblyanten vises i kapitteloversikten i appen.`;
    }

    await showAchievementModal(
        message,
        level.title,
        pencilIconSVG,
        level.cssBg,
        level.cssBorder,
        level.cssText
    );
}

/**
 * Viser achievement modal med SVG-ikon og level-baserte farger
 * @param {string} message - Meldingen som skal vises
 * @param {string} title - Tittel på modalen
 * @param {string} iconSVG - SVG-kode for ikonet
 * @param {string} bgClass - CSS background class (e.g., 'bg-success-50')
 * @param {string} borderClass - CSS border class (e.g., 'border-success-500')
 * @param {string} textClass - CSS text color class (e.g., 'text-success-600')
 * @returns {Promise<void>}
 */
async function showAchievementModal(message, title, iconSVG, bgClass, borderClass, textClass) {
    return new Promise((resolve) => {
        const modalHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900 bg-opacity-50" id="achievement-modal-backdrop">
                <div class="bg-surface rounded-xl shadow-2xl max-w-md w-full p-6 transform transition-all">
                    <div class="${bgClass} border-l-4 ${borderClass} p-6 rounded-r-lg text-center">
                        <div class="flex justify-center mb-4 ${textClass}">
                            ${iconSVG}
                        </div>
                        <h3 class="text-xl font-bold ${textClass} mb-3">${title}</h3>
                        <div class="text-neutral-700 leading-relaxed">${message}</div>
                    </div>
                    <div class="flex justify-center mt-6">
                        <button class="achievement-modal-ok px-6 py-2 ${bgClass} ${textClass} font-semibold rounded-lg hover:opacity-80 transition-opacity border-2 ${borderClass}">
                            OK
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const backdrop = document.getElementById('achievement-modal-backdrop');
        const okBtn = backdrop.querySelector('.achievement-modal-ok');

        const closeModal = () => {
            backdrop.remove();
            resolve();
        };

        okBtn.addEventListener('click', closeModal);
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) closeModal();
        });

        const escHandler = (e) => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', escHandler);
                closeModal();
            }
        };
        document.addEventListener('keydown', escHandler);

        okBtn.focus();
    });
}
