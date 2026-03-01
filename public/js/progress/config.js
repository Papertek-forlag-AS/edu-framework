/**
 * =================================================================
 * CONFIGURATION - Static configuration data
 * =================================================================
 *
 * This module contains all static configuration constants used by
 * the progress tracking system. It has no dependencies.
 */

/**
 * Exercise count database per lesson
 * Structure: { lessonId: { exercises: count, extraExercises: count, tests: array } }
 */
export const EXERCISE_DATABASE = {
    '1-1': { exercises: 4, extraExercises: 10, tests: ['lesson'] },
    '1-2': { exercises: 4, extraExercises: 10, tests: ['lesson'] },
    '1-3': { exercises: 4, extraExercises: 10, tests: ['lesson', 'chapter'] },
    '2-1': { exercises: 6, extraExercises: 9, tests: ['lesson'] },
    '2-2': { exercises: 6, extraExercises: 6, tests: ['lesson'] },
    '2-3': { exercises: 5, extraExercises: 6, tests: ['lesson', 'chapter', 'cumulative'] },
    '3-1': { exercises: 4, extraExercises: 12, tests: ['lesson'] },
    '3-2': { exercises: 6, extraExercises: 10, tests: ['lesson'] },
    '3-3': { exercises: 6, extraExercises: 9, tests: ['lesson', 'chapter', 'cumulative'] },
    '4-1': { exercises: 5, extraExercises: 10, tests: ['lesson'] },
    '4-2': { exercises: 5, extraExercises: 10, tests: ['lesson'] },
    '4-3': { exercises: 5, extraExercises: 10, tests: ['lesson', 'chapter', 'cumulative'] },
    '5-1': { exercises: 4, extraExercises: 0, tests: ['lesson'] },
    '5-2': { exercises: 4, extraExercises: 10, tests: ['lesson'] },
    '5-3': { exercises: 4, extraExercises: 10, tests: ['lesson', 'chapter', 'cumulative'] },
    '6-1': { exercises: 6, extraExercises: 10, tests: ['lesson'] },
    '6-2': { exercises: 6, extraExercises: 10, tests: ['lesson'] },
    '6-3': { exercises: 5, extraExercises: 10, tests: ['lesson', 'chapter', 'cumulative'] },
    '7-1': { exercises: 6, extraExercises: 10, tests: ['lesson'] },
    '7-2': { exercises: 6, extraExercises: 10, tests: ['lesson'] },
    '7-3': { exercises: 6, extraExercises: 10, tests: ['lesson', 'chapter', 'cumulative'] },
    '8-1': { exercises: 6, extraExercises: 10, tests: ['lesson'] },
    '8-2': { exercises: 6, extraExercises: 10, tests: ['lesson'] },
    '8-3': { exercises: 6, extraExercises: 10, tests: ['lesson', 'chapter', 'cumulative'] },
    '9-1': { exercises: 6, extraExercises: 10, tests: ['lesson'] },
    '9-2': { exercises: 6, extraExercises: 10, tests: ['lesson'] },
    '9-3': { exercises: 6, extraExercises: 10, tests: ['lesson', 'chapter', 'cumulative'] },
    '10-1': { exercises: 3, extraExercises: 0, tests: ['lesson'] },
    '10-2': { exercises: 3, extraExercises: 0, tests: ['lesson'] },
    '10-3': { exercises: 3, extraExercises: 0, tests: ['lesson', 'chapter', 'cumulative'] }
};

/**
 * Event name for regular exercises completion
 * Dispatched when all regular exercises are completed to unlock extra exercises tab
 */
export const REGULAR_EXERCISES_EVENT = 'regular-exercises-updated';

/**
 * Curriculum configuration mapping
 * DEPRECATED: Use CURRICULUM_REGISTRY from ./curriculum-registry.js instead.
 * Re-exported here for backward compatibility.
 */
import { CURRICULUM_REGISTRY } from './curriculum-registry.js';
export const CURRICULUM_CONFIG = CURRICULUM_REGISTRY;
