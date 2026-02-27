/**
 * Teacher Content Loader
 *
 * Dynamically loads and renders teacher resources for lessons.
 * This keeps teacher resources DRY and maintainable.
 */

import { debug } from '../logger.js';
import { getActiveCurriculum } from '../progress/store.js';
import { getCurriculumConfig } from '../progress/curriculum-registry.js';

/**
 * Renders a "Gruppeoppgave" activity card
 */
function renderGruppeoppgave(activity) {
    const learningGoalsHTML = activity.learningGoals
        .map(goal => `<li>${goal}</li>`)
        .join('');

    const timeOverviewHTML = activity.timeOverview
        .map(item => `<li>• <strong>${item.duration}:</strong> ${item.activity}</li>`)
        .join('');

    return `
        <div class="bg-surface p-6 rounded-xl shadow-sm">
            <div class="flex items-start gap-4 mb-4">
                <div class="flex-shrink-0 text-4xl">${activity.icon}</div>
                <div class="flex-1">
                    <h3 class="text-xl font-bold text-neutral-800 mb-2">${activity.title}</h3>
                    <p class="text-neutral-600 mb-4">${activity.description}</p>

                    <div class="bg-info-50 border-l-4 border-info-500 p-4 rounded-r-lg mb-4">
                        <h4 class="font-bold text-info-900 mb-2">📚 Læringsmål:</h4>
                        <ul class="list-disc list-inside text-info-900 space-y-1 text-sm">
                            ${learningGoalsHTML}
                        </ul>
                    </div>

                    <div class="bg-success-50 border-l-4 border-success-500 p-4 rounded-r-lg mb-4">
                        <h4 class="font-bold text-success-900 mb-2">⏱️ Tidsoversikt:</h4>
                        <ul class="list-none text-success-900 space-y-1 text-sm">
                            ${timeOverviewHTML}
                        </ul>
                    </div>

                    <a href="${activity.documentUrl}" target="_blank"
                       class="inline-block bg-primary-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-700 transition-colors">
                        ${activity.documentLabel}
                    </a>
                </div>
            </div>
        </div>
    `;
}

/**
 * Renders a placeholder for lessons without teacher resources
 */
function renderPlaceholder() {
    return `
        <div class="bg-neutral-50 border-2 border-dashed border-neutral-300 p-6 rounded-xl text-center">
            <div class="text-6xl mb-4">🚧</div>
            <h3 class="text-xl font-bold text-neutral-700 mb-2">Kommer snart!</h3>
            <p class="text-neutral-600">Lærerressurser for denne leksjonen er under utvikling.</p>
            <p class="text-sm text-neutral-500 mt-2">Har du forslag til lærerressurser? Ta kontakt!</p>
        </div>
    `;
}

/**
 * Loads teacher resources for a specific lesson
 * @param {object} externalConfig - Optional config to use (overrides getActiveCurriculum)
 */
export async function loadTeacherContent(externalConfig) {
    const contentContainer = document.getElementById('teacher-content-container');
    if (!contentContainer) {
        debug('No teacher content container found');
        return;
    }

    const lessonId = document.body.dataset.chapterId;
    if (!lessonId) {
        debug('No lesson ID found');
        return;
    }

    const curriculumId = externalConfig?.id || getActiveCurriculum();
    const config = externalConfig || getCurriculumConfig(curriculumId);
    const languageDir = config?.languageDir || 'german';

    debug(`Loading teacher resources for lesson ${lessonId} (${languageDir})`);

    let resources = null;
    try {
        const module = await import(`../../content/${languageDir}/teacher-mode/teacher-resources-data.js`);
        resources = module.teacherResources[lessonId];
    } catch (e) {
        debug(`No teacher resources data file found for ${languageDir}`);
    }

    // If no resources defined or empty activities array, show placeholder
    if (!resources || !resources.activities || resources.activities.length === 0) {
        contentContainer.innerHTML = renderPlaceholder();
        return;
    }

    // Render each activity
    const activitiesHTML = resources.activities.map(activity => {
        switch (activity.type) {
            case 'gruppeoppgave':
            case 'servering':
                return renderGruppeoppgave(activity);
            // Add more activity types here as needed
            default:
                console.warn(`Unknown activity type: ${activity.type}`);
                return '';
        }
    }).join('');

    // Add "More resources coming soon" section if there are activities
    const footerHTML = `
        <div class="bg-neutral-50 border-2 border-dashed border-neutral-300 p-6 rounded-xl mt-6 text-center">
            <p class="text-neutral-500 italic">Flere lærerressurser kommer snart...</p>
        </div>
    `;

    contentContainer.innerHTML = activitiesHTML + footerHTML;
    debug(`Teacher resources loaded successfully for lesson ${lessonId}`);
}
