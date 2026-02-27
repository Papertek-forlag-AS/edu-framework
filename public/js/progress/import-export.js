/**
 * =================================================================
 * IMPORT/EXPORT - Progress data portability
 * =================================================================
 *
 * This module handles exporting and importing progress data.
 * Works directly with localStorage (no dependencies on other progress modules).
 */

import { showAlertModal } from '../modals.js';

/**
 * Eksporterer all progresjonsdata til JSON-fil
 */
export async function exportProgress() {
    const progressData = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('tysk-')) {
            progressData[key] = localStorage.getItem(key);
        }
    }

    if (Object.keys(progressData).length === 0) {
        await showAlertModal(
            'Ingen progresjon å lagre!',
            '⚠️ Ingen data',
            'error'
        );
        return;
    }

    const jsonString = JSON.stringify(progressData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    const date = new Date().toISOString().slice(0, 10);
    anchor.download = `tysk1-progresjon-${date}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}

/**
 * Importerer progresjonsdata fra JSON-fil
 * @param {Event} event - File input change event
 */
export function importProgress(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            const data = JSON.parse(e.target.result);
            let importedCount = 0;
            for (const key in data) {
                if (key.startsWith('tysk-')) {
                    localStorage.setItem(key, data[key]);
                    importedCount++;
                }
            }
            if (importedCount > 0) {
                await showAlertModal(
                    `Progresjon lastet opp!\n\n${importedCount} elementer ble importert.\n\nSiden vil nå laste på nytt.`,
                    `✅ Import vellykket`,
                    'success'
                );
                window.location.reload();
            } else {
                await showAlertModal(
                    'Fant ingen gyldig progresjonsdata i filen.',
                    '⚠️ Ingen data funnet',
                    'error'
                );
            }
        } catch (error) {
            await showAlertModal(
                'Filen er ikke en gyldig progresjonsfil.',
                '❌ Feil',
                'error'
            );
            console.error("Feil ved parsing av JSON:", error);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

/**
 * Setter opp event listeners for import/export-knapper
 */
export function setupImportExport() {
    const exportBtn = document.getElementById('export-btn');
    const importInput = document.getElementById('import-input');

    if (exportBtn) exportBtn.addEventListener('click', exportProgress);
    if (importInput) importInput.addEventListener('change', importProgress);
}
