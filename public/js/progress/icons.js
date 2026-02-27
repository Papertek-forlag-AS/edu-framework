/**
 * =================================================================
 * ICONS - Rendering completion icons for exercises
 * =================================================================
 *
 * This module handles rendering of completion icons (pencils, stars)
 * on individual exercises within the lesson page.
 */

import { EXERCISE_DATABASE } from './config.js';
import { getLessonProgress, getFullProgressData } from './store.js';
import { getAchievementColor } from './achievements.js';

/**
 * Viser completion-ikoner for øvelser på øvelser-tabben
 */
export function renderExerciseCompletionIcons() {
    const lessonId = document.body.dataset.chapterId;
    if (!lessonId) return;

    const lessonProgress = getLessonProgress(lessonId);
    // Hent liste over fullførte øvelser (exercises er nå et objekt { exerciseId: boolean })
    const completedExercises = Object.keys(lessonProgress.exercises).filter(id => lessonProgress.exercises[id] === true);

    // Get completion counts for progressive icon colors
    const ovelserCount = lessonProgress.achievements.ovelser || 0;
    const ekstraCount = lessonProgress.achievements.ekstraovelser || 0;

    // Simplified: Just show earned achievement levels (no "next level" or migration logic)
    const pencilColor = getAchievementColor(ovelserCount);
    const starColor = getAchievementColor(ekstraCount);

    const pencilIconSVG = `<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>`;
    const starIconSVG = `<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.539 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.539-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.98 9.11c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>`;

    // Clear all existing icons first
    document.querySelectorAll('.completion-icon').forEach(icon => icon.remove());

    // Add icons to standard exercises (aufgabeA, aufgabeB, etc.)
    document.querySelectorAll('#ovelser h3').forEach(title => {
        const exerciseId = title.closest('[id^="aufgabe"]')?.id;
        if (exerciseId && completedExercises.includes(exerciseId)) {
            // Add pencil icon with progressive color based on chapter completion count
            const icon = document.createElement('span');
            icon.className = `completion-icon ml-2 ${pencilColor} inline-flex items-center`;
            icon.innerHTML = pencilIconSVG;
            const completionText = ovelserCount === 1 ? '1. gang' : `${ovelserCount}. gang`;
            icon.title = `Øvelse fullført (${completionText})`;
            title.appendChild(icon);
        }
    });

    // Add icons to ekstraøvelser (all types: fill-in, matching, writing, etc.)
    document.querySelectorAll('#ekstraovelser h3').forEach(title => {
        // Try to find any parent container with ekstraovelse ID
        let container = title.closest('[id^="ekstraovelse"]');
        let isCompleted = false;

        if (container && container.id) {
            // Container has an ekstraovelse ID - check if it or any children are completed
            isCompleted = completedExercises.includes(container.id) ||
                completedExercises.some(completedId => {
                    if (!completedId.includes('ekstraovelse')) return false;
                    // Check if a child element with this completed ID exists in the container
                    try {
                        return container.querySelector(`#${CSS.escape(completedId)}`) !== null;
                    } catch (e) {
                        return container.querySelector(`[id="${completedId}"]`) !== null;
                    }
                });
        } else {
            // No parent with ekstraovelse ID - check if parent has a child with ekstraovelse ID
            const parentDiv = title.closest('.bg-surface, .quiz-wrapper');
            if (parentDiv) {
                const childWithId = parentDiv.querySelector('[id^="ekstraovelse"]');
                if (childWithId && childWithId.id) {
                    // Check if THIS SPECIFIC child ID is completed
                    isCompleted = completedExercises.includes(childWithId.id);
                }
            }
        }

        if (isCompleted) {
            // Add star icon with progressive color based on chapter completion count
            const icon = document.createElement('span');
            icon.className = `completion-icon ml-2 ${starColor} inline-flex items-center`;
            icon.innerHTML = starIconSVG;
            const completionText = ekstraCount === 1 ? '1. gang' : `${ekstraCount}. gang`;
            icon.title = `Ekstraøvelse fullført (${completionText})`;
            title.appendChild(icon);
        }
    });
}

/**
 * Viser completion-ikon for en spesifikk øvelse
 */
export function showExerciseCompletionIcon(exerciseId) {
    const lessonId = document.body.dataset.chapterId;
    if (!lessonId) return;

    // Wait 2 seconds before showing the icon
    setTimeout(() => {
        const isEkstraovelse = exerciseId.includes('ekstraovelse');

        // Get current achievement count to determine progressive color
        const lessonProgress = getLessonProgress(lessonId);
        const achievementCount = isEkstraovelse
            ? (lessonProgress.achievements?.ekstraovelser || 0)
            : (lessonProgress.achievements?.ovelser || 0);

        // Simplified: Show current earned level (no +1 logic)
        const currentCompletionLevel = achievementCount;
        const iconColor = getAchievementColor(currentCompletionLevel);

        const tabSelector = isEkstraovelse ? '#ekstraovelser' : '#ovelser';
        const iconSVG = isEkstraovelse ?
            `<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.539 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.539-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.98 9.11c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>` :
            `<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>`;

        const completionText = currentCompletionLevel === 1 ? '1. gang' : `${currentCompletionLevel}. gang`;
        const iconTitle = isEkstraovelse
            ? `Ekstraøvelse fullført (${completionText})`
            : `Øvelse fullført (${completionText})`;

        // First try to find the exercise container directly
        let exerciseContainer = document.getElementById(exerciseId);

        // For ekstraøvelser, we need to find the parent container that has the h3
        if (exerciseContainer && isEkstraovelse) {
            // Check if this element has an h3, if not, find the parent ekstraovelse container
            const hasH3 = exerciseContainer.querySelector('h3');
            if (!hasH3) {
                // Go to parent first, then find closest ekstraovelse container
                exerciseContainer = exerciseContainer.parentElement?.closest('[id^="ekstraovelse"]');
            }
        }

        // If not found, look for a parent container with ekstraovelse ID
        if (!exerciseContainer) {
            const innerElement = document.getElementById(exerciseId);
            if (innerElement) {
                exerciseContainer = innerElement.closest('[id^="ekstraovelse"]');
            }
        }

        // If still not found, try to find by looking for the exercise ID pattern
        if (!exerciseContainer && exerciseId.includes('ekstraovelse')) {
            // Extract the lesson ID from the exercise ID (e.g., "ekstraovelse-1-familie" -> "3-1")
            const lessonId = document.body.dataset.chapterId;
            if (lessonId) {
                // Try to find the main container with pattern ekstraovelse-X-lessonId
                const mainContainerId = exerciseId.replace(/ekstraovelse-\d+-\w+/, `ekstraovelse-${exerciseId.match(/ekstraovelse-(\d+)/)?.[1]}-${lessonId}`);
                exerciseContainer = document.getElementById(mainContainerId);
            }
        }

        if (exerciseContainer) {
            // Try to find h3 - it might be nested in flex containers
            let title = exerciseContainer.querySelector('h3');

            // If not found and this is an inner element, try to find it in siblings or parent
            if (!title && isEkstraovelse) {
                // The h3 might be in a sibling div before our fill-in-task
                const parentDiv = exerciseContainer.parentElement?.parentElement;
                if (parentDiv) {
                    title = parentDiv.querySelector('h3');
                }
            }

            if (title) {
                // Remove existing icon if any
                const existingIcon = title.querySelector('.completion-icon');
                if (existingIcon) existingIcon.remove();

                // Add new icon
                const icon = document.createElement('span');
                icon.className = `completion-icon ml-2 ${iconColor} inline-flex items-center`;
                icon.innerHTML = iconSVG;
                icon.title = iconTitle;
                title.appendChild(icon);
            }
        }
    }, 2000);
}

/**
 * Fjerner completion-ikon for en spesifikk øvelse
 */
export function hideExerciseCompletionIcon(exerciseId) {
    const isEkstraovelse = exerciseId.includes('ekstraovelse');

    // First try to find the exercise container directly
    let exerciseContainer = document.getElementById(exerciseId);

    // For ekstraøvelser, we need to find the parent container that has the h3
    if (exerciseContainer && isEkstraovelse) {
        // Check if this element has an h3, if not, find the parent ekstraovelse container
        const hasH3 = exerciseContainer.querySelector('h3');
        if (!hasH3) {
            // Go to parent first, then find closest ekstraovelse container
            exerciseContainer = exerciseContainer.parentElement?.closest('[id^="ekstraovelse"]');
        }
    }

    // If not found, look for a parent container with ekstraovelse ID
    if (!exerciseContainer) {
        const innerElement = document.getElementById(exerciseId);
        if (innerElement) {
            exerciseContainer = innerElement.closest('[id^="ekstraovelse"]');
        }
    }

    // If still not found, try to find by looking for the exercise ID pattern
    if (!exerciseContainer && exerciseId.includes('ekstraovelse')) {
        // Extract the lesson ID from the exercise ID (e.g., "ekstraovelse-1-familie" -> "3-1")
        const lessonId = document.body.dataset.chapterId;
        if (lessonId) {
            // Try to find the main container with pattern ekstraovelse-X-lessonId
            const mainContainerId = exerciseId.replace(/ekstraovelse-\d+-\w+/, `ekstraovelse-${exerciseId.match(/ekstraovelse-(\d+)/)?.[1]}-${lessonId}`);
            exerciseContainer = document.getElementById(mainContainerId);
        }
    }

    if (exerciseContainer) {
        // Try to find h3 - it might be nested in flex containers
        let title = exerciseContainer.querySelector('h3');

        // If not found and this is an inner element, try to find it in siblings or parent
        if (!title && isEkstraovelse) {
            // The h3 might be in a sibling div before our fill-in-task
            const parentDiv = exerciseContainer.parentElement?.parentElement;
            if (parentDiv) {
                title = parentDiv.querySelector('h3');
            }
        }

        if (title) {
            const existingIcon = title.querySelector('.completion-icon');
            if (existingIcon) existingIcon.remove();
        }
    }
}

// Set up event listeners for achievements.js events
if (typeof document !== 'undefined') {
    document.addEventListener('exercise-completed', (e) => {
        showExerciseCompletionIcon(e.detail.exerciseId);
    });

    document.addEventListener('exercise-removed', (e) => {
        hideExerciseCompletionIcon(e.detail.exerciseId);
    });
}
