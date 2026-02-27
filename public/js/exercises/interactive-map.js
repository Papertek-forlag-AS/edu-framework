/**
 * Interactive Map of German States — Migrated to ExerciseBase
 *
 * Clickable SVG map showing Bundesländer with tooltips and info panel.
 * No state persistence (pure UI).
 *
 * Listeners on .bundesland paths and document (deselect) are all
 * registered via ctx.listen() — cleaned up on destroy.
 */

import { createExercise } from './exercise-base.js';

const STATE_DATA = {
    'baden-wuerttemberg': { name: 'Baden-Württemberg', capital: 'Stuttgart', description: 'Teknologi- og innovasjonssenter, hjemsted for Mercedes-Benz og Porsche. Kombinerer industri med vakker natur.', area: '35.748 km²', population: '11,1 mill.', founded: '1952' },
    'bayern': { name: 'Bayern', capital: 'München', description: 'Den største delstaten, kjent for Alpene, Oktoberfest og sterke tradisjoner. Økonomisk kraftsentrum.', area: '70.542 km²', population: '13,1 mill.', founded: '1949' },
    'berlin': { name: 'Berlin', capital: 'Berlin', description: 'Tysklands hovedstad og største by. Politisk, kulturelt og økonomisk sentrum med rik historie.', area: '892 km²', population: '3,7 mill.', founded: '1990' },
    'brandenburg': { name: 'Brandenburg', capital: 'Potsdam', description: 'Omgir hovedstaden Berlin og er kjent for sine slott, spesielt Sanssouci. Viktig for fornybar energi.', area: '29.654 km²', population: '2,5 mill.', founded: '1990' },
    'bremen': { name: 'Bremen', capital: 'Bremen', description: 'Den minste delstaten, bestående av byene Bremen og Bremerhaven. Viktig handels- og skipsfartssenter.', area: '419 km²', population: '0,7 mill.', founded: '1947' },
    'hamburg': { name: 'Hamburg', capital: 'Hamburg', description: 'Tysklands andre største by og viktigste havneby. En by-delstat kjent for sitt natteliv.', area: '755 km²', population: '1,9 mill.', founded: '1949' },
    'hessen': { name: 'Hessen', capital: 'Wiesbaden', description: 'Hjemsted for Frankfurt am Main, Europas finanssentrum. Blander moderne forretningsliv med historiske byer.', area: '21.116 km²', population: '6,3 mill.', founded: '1945' },
    'mecklenburg-vorpommern': { name: 'Mecklenburg-Vorpommern', capital: 'Schwerin', description: 'Kjent for sine mange slott, nasjonalparker og Østersjøkyst. Har lavest befolkningstetthet i Tyskland.', area: '23.295 km²', population: '1,6 mill.', founded: '1990' },
    'niedersachsen': { name: 'Niedersachsen', capital: 'Hannover', description: 'Den nest største delstaten i areal, med variert landskap fra kyst til fjell. Viktig for bilindustrien.', area: '47.709 km²', population: '8,0 mill.', founded: '1946' },
    'nordrhein-westfalen': { name: 'Nordrhein-Westfalen', capital: 'Düsseldorf', description: 'Tysklands mest folkerike delstat og industrielle hjerte. Kjent for Ruhr-området og fotball.', area: '34.110 km²', population: '17,9 mill.', founded: '1946' },
    'rheinland-pfalz': { name: 'Rheinland-Pfalz', capital: 'Mainz', description: 'Tysklands største vinregion med pittoreske vinbyer langs Rhinen. Kjent for Rhindalen.', area: '19.858 km²', population: '4,1 mill.', founded: '1946' },
    'saarland': { name: 'Saarland', capital: 'Saarbrücken', description: 'En liten delstat med sterk fransk påvirkning. Tidligere sentrum for kull- og stålindustri.', area: '2.571 km²', population: '1,0 mill.', founded: '1957' },
    'sachsen': { name: 'Sachsen', capital: 'Dresden', description: 'Kjent for sine vakre byer Dresden og Leipzig, samt rik kulturarv. Viktig for teknologi.', area: '18.450 km²', population: '4,1 mill.', founded: '1990' },
    'sachsen-anhalt': { name: 'Sachsen-Anhalt', capital: 'Magdeburg', description: 'Hjemsted for mange UNESCO-verdensarvsteder, inkludert Bauhaus og historiske byer.', area: '20.464 km²', population: '2,2 mill.', founded: '1990' },
    'schleswig-holstein': { name: 'Schleswig-Holstein', capital: 'Kiel', description: 'Den nordligste delstaten, kjent for sine kystlinjer langs Nord- og Østersjøen og maritime tradisjoner.', area: '15.763 km²', population: '2,9 mill.', founded: '1946' },
    'thueringen': { name: 'Thüringen', capital: 'Erfurt', description: 'Kjent som "Tysklands grønne hjerte" med rik kulturhistorie. Hjemsted for Weimar og Wartburg-slottet.', area: '16.202 km²', population: '2,1 mill.', founded: '1990' },
};

export function setupInteractiveMap() {
    const exercise = createExercise('interactive-map-container', {
        onMount(ctx) {
            const tooltip = document.getElementById('map-tooltip');
            const tooltipTitle = document.getElementById('tooltip-title');
            const tooltipContent = document.getElementById('tooltip-content');
            const infoPanel = document.getElementById('info-panel');
            const selectedStateName = document.getElementById('selected-state-name');
            const selectedStateDescription = document.getElementById('selected-state-description');
            const statsGrid = document.getElementById('stats-grid');

            let selectedState = null;

            ctx.$$('.bundesland').forEach(path => {
                ctx.listen(path, 'click', (e) => {
                    const stateKey = e.target.dataset.state;
                    const data = STATE_DATA[stateKey];
                    if (!data) return;

                    if (selectedState) {
                        const prev = ctx.container.querySelector(`.bundesland[data-state="${selectedState}"]`);
                        if (prev) prev.classList.remove('selected');
                    }

                    e.target.classList.add('selected');
                    selectedState = stateKey;

                    selectedStateName.textContent = data.name;
                    selectedStateDescription.textContent = data.description;

                    statsGrid.innerHTML = `
                        <div class="bg-surface bg-opacity-70 p-3 rounded-lg text-center"><div class="text-lg font-bold text-primary-800">${data.area}</div><div class="text-sm text-neutral-600">Areal</div></div>
                        <div class="bg-surface bg-opacity-70 p-3 rounded-lg text-center"><div class="text-lg font-bold text-primary-800">${data.population}</div><div class="text-sm text-neutral-600">Befolkning</div></div>
                        <div class="bg-surface bg-opacity-70 p-3 rounded-lg text-center"><div class="text-lg font-bold text-primary-800">${data.capital}</div><div class="text-sm text-neutral-600">Hovedstad</div></div>
                        <div class="bg-surface bg-opacity-70 p-3 rounded-lg text-center"><div class="text-lg font-bold text-primary-800">${data.founded}</div><div class="text-sm text-neutral-600">Grunnlagt</div></div>`;

                    infoPanel.classList.remove('hidden');
                    infoPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                });

                ctx.listen(path, 'mousemove', (e) => {
                    const stateKey = e.target.dataset.state;
                    const data = STATE_DATA[stateKey];
                    if (!data || !tooltip) return;

                    tooltipTitle.textContent = data.name;
                    tooltipContent.textContent = `Hovedstad: ${data.capital}`;

                    const containerRect = ctx.container.getBoundingClientRect();
                    tooltip.style.left = (e.clientX - containerRect.left) + 'px';
                    tooltip.style.top = (e.clientY - containerRect.top) + 'px';
                    tooltip.classList.add('visible');
                });

                ctx.listen(path, 'mouseleave', () => {
                    if (tooltip) tooltip.classList.remove('visible');
                });
            });

            // Click outside any state → deselect
            ctx.listen(document, 'click', (e) => {
                if (!e.target.closest('.bundesland') && selectedState) {
                    const prev = ctx.container.querySelector(`.bundesland[data-state="${selectedState}"]`);
                    if (prev) prev.classList.remove('selected');
                    selectedState = null;
                }
            });
        },
    });

    if (exercise) exercise.mount();
    return exercise;
}
