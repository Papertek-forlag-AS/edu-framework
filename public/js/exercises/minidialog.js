/**
 * Minidialoge — Migrated to ExerciseBase
 *
 * Multi-scenario dialog exercise. Students select scenarios,
 * step through dialog lines, and complete all scenarios for credit.
 */

import { createExercise } from './exercise-base.js';
import { loadData, saveData, trackExerciseCompletion, removeExerciseCompletion, getProgressData, getActiveCurriculum } from '../progress/index.js';
import { handleReset } from './core-reset.js';
import { saveExerciseState, loadExerciseState, getExerciseStorageKey } from './storage-utils.js';

export function setupMinidialoge(containerId, scenarios) {
    if (!scenarios) {
        console.warn(`Could not setup minidialoge for #${containerId}. Missing data.`);
        return null;
    }

    const chapterId = document.body.dataset.chapterId;
    if (!chapterId) return null;

    const curriculum = getActiveCurriculum();

    const exercise = createExercise(containerId, {
        onMount(ctx) {
            const dom = {
                scenarioButtons: ctx.$('.scenario-buttons'),
                dialogArea: ctx.$('.dialog-area'),
                dialogContent: ctx.$('.dialog-content'),
                scenarioTitle: ctx.$('.scenario-title'),
                prevButton: ctx.$('.prev-step'),
                nextButton: ctx.$('.next-step'),
                restartButton: ctx.$('.restart-dialog'),
                backButton: ctx.$('.back-to-scenarios'),
                resetButton: ctx.$('.reset'),
            };

            if (!dom.scenarioButtons || !dom.dialogArea || !dom.dialogContent) {
                console.warn(`Missing required elements for minidialoge #${containerId}`);
                return;
            }

            const state = {
                currentScenario: null,
                currentStep: 0,
                completedScenarios: [],
            };

            function renderScenarioButtons() {
                dom.scenarioButtons.innerHTML = '';

                Object.entries(scenarios).forEach(([key, scenario]) => {
                    const isCompleted = state.completedScenarios.includes(key);
                    const button = document.createElement('button');
                    button.className = `scenario-btn p-4 rounded-lg border-2 transition-all ${
                        isCompleted
                            ? 'border-success-500 bg-success-50 hover:bg-success-100'
                            : 'border-neutral-300 bg-surface hover:bg-neutral-50'
                    }`;
                    button.dataset.scenario = key;

                    button.innerHTML = `
                        <div class="text-lg font-semibold mb-1">${scenario.title}</div>
                        <div class="text-sm text-neutral-600">${scenario.description}</div>
                        ${isCompleted ? '<div class="text-xs text-success-600 mt-2">✓ Fullført</div>' : ''}
                    `;

                    dom.scenarioButtons.appendChild(button);
                });

                dom.scenarioButtons.classList.remove('hidden');
                dom.dialogArea.classList.add('hidden');
            }

            function renderDialog() {
                if (!state.currentScenario) return;

                const scenario = scenarios[state.currentScenario];
                if (!scenario || !scenario.dialog) return;

                if (dom.scenarioTitle) {
                    dom.scenarioTitle.textContent = scenario.title;
                }

                dom.dialogContent.innerHTML = '';

                const windowSize = 4;
                const startIndex = Math.max(0, state.currentStep - windowSize + 1);

                for (let i = state.currentStep; i >= startIndex; i--) {
                    const line = scenario.dialog[i];
                    if (!line) continue;

                    const isStudent1 = line.speaker === 'Elev 1';
                    const isNewest = i === state.currentStep;

                    const bubble = document.createElement('div');

                    if (!isNewest) {
                        bubble.style.opacity = '0.4';
                        bubble.style.filter = 'grayscale(30%)';
                    }

                    bubble.className = `dialog-bubble ${
                        isStudent1
                            ? 'ml-auto bg-primary-100 border-primary-300'
                            : 'mr-auto bg-neutral-100 border-neutral-300'
                    } max-w-[80%] p-3 rounded-lg border-2 ${isNewest ? 'shadow-lg border-4' : 'shadow-sm'} transition-all`;

                    bubble.innerHTML = `
                        <div class="font-semibold text-sm mb-1 ${isStudent1 ? 'text-primary-700' : 'text-neutral-700'}">${line.speaker}</div>
                        <div class="text-base">${line.text}</div>
                    `;

                    dom.dialogContent.appendChild(bubble);
                }

                if (dom.prevButton) {
                    dom.prevButton.disabled = state.currentStep === 0;
                    dom.prevButton.classList.toggle('opacity-50', state.currentStep === 0);
                    dom.prevButton.classList.toggle('cursor-not-allowed', state.currentStep === 0);
                }

                if (dom.nextButton) {
                    const isLastStep = state.currentStep >= scenario.dialog.length - 1;
                    dom.nextButton.disabled = isLastStep;
                    dom.nextButton.classList.toggle('opacity-50', isLastStep);
                    dom.nextButton.classList.toggle('cursor-not-allowed', isLastStep);

                    if (isLastStep && !state.completedScenarios.includes(state.currentScenario)) {
                        state.completedScenarios.push(state.currentScenario);
                        saveProgress();
                        checkAllCompleted();
                    }
                }

                ctx.setTimeout(() => {
                    if (dom.dialogContent) {
                        dom.dialogContent.scrollTop = 0;
                    }
                }, 50);
            }

            function selectScenario(scenarioKey) {
                state.currentScenario = scenarioKey;
                state.currentStep = 0;
                dom.scenarioButtons.classList.add('hidden');
                dom.dialogArea.classList.remove('hidden');
                renderDialog();
            }

            function saveProgress() {
                saveExerciseState(curriculum, chapterId, 'minidialog', containerId, { completedScenarios: state.completedScenarios });
            }

            function checkAllCompleted() {
                const totalScenarios = Object.keys(scenarios).length;
                if (state.completedScenarios.length === totalScenarios) {
                    trackExerciseCompletion(containerId);
                }
            }

            // Load saved progress
            const savedState = loadExerciseState(curriculum, chapterId, 'minidialog', containerId, null);
            if (savedState) {
                state.completedScenarios = savedState.completedScenarios || [];
            }

            renderScenarioButtons();

            // Event listeners
            ctx.listen(dom.scenarioButtons, 'click', e => {
                const button = e.target.closest('.scenario-btn');
                if (button) selectScenario(button.dataset.scenario);
            });

            if (dom.prevButton) {
                ctx.listen(dom.prevButton, 'click', () => {
                    if (state.currentStep > 0) { state.currentStep--; renderDialog(); }
                });
            }

            if (dom.nextButton) {
                ctx.listen(dom.nextButton, 'click', () => {
                    const scenario = scenarios[state.currentScenario];
                    if (scenario && state.currentStep < scenario.dialog.length - 1) {
                        state.currentStep++;
                        renderDialog();
                    }
                });
            }

            if (dom.restartButton) {
                ctx.listen(dom.restartButton, 'click', () => { state.currentStep = 0; renderDialog(); });
            }

            if (dom.backButton) {
                ctx.listen(dom.backButton, 'click', () => {
                    state.currentScenario = null;
                    state.currentStep = 0;
                    renderScenarioButtons();
                });
            }

            if (dom.resetButton) {
                ctx.listen(dom.resetButton, 'click', () => {
                    const progress = getProgressData();
                    const lessonId = document.body.dataset.chapterId;
                    const lessonProgress = progress[lessonId] || { exercises: {} };
                    const wasCompleted = lessonProgress.exercises[containerId] === true;

                    const performReset = () => {
                        removeExerciseCompletion(containerId);
                        const storageKey = getExerciseStorageKey(curriculum, chapterId, 'minidialog', containerId);
                        localStorage.removeItem(storageKey);
                        state.completedScenarios = [];
                        state.currentScenario = null;
                        state.currentStep = 0;
                        renderScenarioButtons();
                    };

                    handleReset(containerId, performReset, wasCompleted);
                });
            }

            checkAllCompleted();
        },
    });

    if (exercise) exercise.mount();
    return exercise;
}
