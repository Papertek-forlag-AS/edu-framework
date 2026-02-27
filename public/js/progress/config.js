/**
 * =================================================================
 * CONFIGURATION - Static configuration data
 * =================================================================
 *
 * This module contains all static configuration constants used by
 * the progress tracking system. It has no dependencies.
 */

/**
 * Database over antall øvelser per leksjon og fane
 * Struktur: { leksjonId: { ovelser: antall, ekstraovelser: antall, tests: array } }
 */
export const EXERCISE_DATABASE = {
    '1-1': { ovelser: 4, ekstraovelser: 10, tests: ['leksjon'] },
    '1-2': { ovelser: 4, ekstraovelser: 10, tests: ['leksjon'] },
    '1-3': { ovelser: 4, ekstraovelser: 10, tests: ['leksjon', 'kapittel'] },
    '2-1': { ovelser: 6, ekstraovelser: 9, tests: ['leksjon'] },
    '2-2': { ovelser: 6, ekstraovelser: 6, tests: ['leksjon'] },
    '2-3': { ovelser: 5, ekstraovelser: 6, tests: ['leksjon', 'kapittel', 'kumulativ'] },
    '3-1': { ovelser: 4, ekstraovelser: 12, tests: ['leksjon'] },
    '3-2': { ovelser: 6, ekstraovelser: 10, tests: ['leksjon'] },
    '3-3': { ovelser: 6, ekstraovelser: 9, tests: ['leksjon', 'kapittel', 'kumulativ'] },
    '4-1': { ovelser: 5, ekstraovelser: 10, tests: ['leksjon'] },
    '4-2': { ovelser: 5, ekstraovelser: 10, tests: ['leksjon'] },
    '4-3': { ovelser: 5, ekstraovelser: 10, tests: ['leksjon', 'kapittel', 'kumulativ'] },
    '5-1': { ovelser: 4, ekstraovelser: 0, tests: ['leksjon'] },
    '5-2': { ovelser: 4, ekstraovelser: 10, tests: ['leksjon'] },
    '5-3': { ovelser: 4, ekstraovelser: 10, tests: ['leksjon', 'kapittel', 'kumulativ'] },
    '6-1': { ovelser: 6, ekstraovelser: 10, tests: ['leksjon'] },
    '6-2': { ovelser: 6, ekstraovelser: 10, tests: ['leksjon'] },
    '6-3': { ovelser: 5, ekstraovelser: 10, tests: ['leksjon', 'kapittel', 'kumulativ'] },
    '7-1': { ovelser: 6, ekstraovelser: 10, tests: ['leksjon'] },
    '7-2': { ovelser: 6, ekstraovelser: 10, tests: ['leksjon'] },
    '7-3': { ovelser: 6, ekstraovelser: 10, tests: ['leksjon', 'kapittel', 'kumulativ'] },
    '8-1': { ovelser: 6, ekstraovelser: 10, tests: ['leksjon'] },
    '8-2': { ovelser: 6, ekstraovelser: 10, tests: ['leksjon'] },
    '8-3': { ovelser: 6, ekstraovelser: 10, tests: ['leksjon', 'kapittel', 'kumulativ'] },
    '9-1': { ovelser: 6, ekstraovelser: 10, tests: ['leksjon'] },
    '9-2': { ovelser: 6, ekstraovelser: 10, tests: ['leksjon'] },
    '9-3': { ovelser: 6, ekstraovelser: 10, tests: ['leksjon', 'kapittel', 'kumulativ'] },
    '10-1': { ovelser: 3, ekstraovelser: 0, tests: ['leksjon'] },
    '10-2': { ovelser: 3, ekstraovelser: 0, tests: ['leksjon'] },
    '10-3': { ovelser: 3, ekstraovelser: 0, tests: ['leksjon', 'kapittel', 'kumulativ'] }
};

/**
 * Event name for regular exercises completion
 * Dispatched when all regular exercises are completed to unlock ekstraøvelser tab
 */
export const REGULAR_EXERCISES_EVENT = 'regular-exercises-updated';

/**
 * Curriculum configuration mapping
 * DEPRECATED: Use CURRICULUM_REGISTRY from ./curriculum-registry.js instead.
 * Re-exported here for backward compatibility.
 */
import { CURRICULUM_REGISTRY } from './curriculum-registry.js';
export const CURRICULUM_CONFIG = CURRICULUM_REGISTRY;
