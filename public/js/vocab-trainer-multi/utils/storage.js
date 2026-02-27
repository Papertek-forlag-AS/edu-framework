/**
 * Storage utilities for vocabulary trainer
 * Wraps progress module functions for consistency
 */

import { loadData as progressLoadData, saveData as progressSaveData } from '../../progress/index.js';

/**
 * Load data from localStorage
 * @param {string} key - Storage key
 * @returns {any} - Stored data or null
 */
export function loadData(key) {
    return progressLoadData(key);
}

/**
 * Save data to localStorage
 * @param {string} key - Storage key
 * @param {any} data - Data to save
 */
export function saveData(key, data) {
    progressSaveData(key, data);
}
