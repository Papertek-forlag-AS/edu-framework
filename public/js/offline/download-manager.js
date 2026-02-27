/**
 * Download Manager for PWA Offline Media
 * Handles downloading images and audio files for offline use.
 */

import { t } from '../utils/i18n.js';

// Media cache prefix
const MEDIA_CACHE_PREFIX = 'papertek-media-';

// Manifest file names (relative to app root)
const MEDIA_MANIFEST_FILES = {
    'tysk1-vg1': 'manifests/media-tysk1-vg1.json',
    'spansk1-vg1': 'manifests/media-spansk1-vg1.json'
};

/**
 * Calculate root path based on current page location
 * Similar to shell.js logic for consistent path handling
 * @returns {string} Root path prefix (e.g., './', '../', '../../')
 */
function getRootPath() {
    const path = window.location.pathname;
    if (path.includes('/content/')) {
        // Lesson pages are typically 4-5 levels deep
        return '../../../../';
    } else if (path.includes('/tysk/') || path.includes('/spansk/') || path.includes('/franske/')) {
        // Portal pages are 1 level deep - need to go up to parent for shared/
        return '../';
    } else {
        return './';
    }
}

/**
 * Get the full manifest path for a curriculum
 * @param {string} curriculumId
 * @returns {string|null} Full path to manifest or null if unknown curriculum
 */
function getManifestPath(curriculumId) {
    const manifestFile = MEDIA_MANIFEST_FILES[curriculumId];
    if (!manifestFile) return null;
    return getRootPath() + manifestFile;
}

/**
 * Check if media is already downloaded for a curriculum
 * @param {string} curriculumId
 * @returns {Promise<{downloaded: boolean, fileCount: number, sizeEstimate: string}>}
 */
export async function checkMediaStatus(curriculumId) {
    const cacheName = `${MEDIA_CACHE_PREFIX}${curriculumId}`;

    try {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();

        if (keys.length > 5) {
            return {
                downloaded: true,
                fileCount: keys.length,
                sizeEstimate: await estimateCacheSize(cacheName)
            };
        }

        return { downloaded: false, fileCount: 0, sizeEstimate: '0 MB' };
    } catch (error) {
        console.error('[DownloadManager] Error checking media status:', error);
        return { downloaded: false, fileCount: 0, sizeEstimate: '0 MB' };
    }
}

/**
 * Estimate cache size (approximate)
 * @param {string} cacheName
 * @returns {Promise<string>}
 */
async function estimateCacheSize(cacheName) {
    try {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        let totalSize = 0;

        for (const request of keys) {
            const response = await cache.match(request);
            if (response) {
                const blob = await response.clone().blob();
                totalSize += blob.size;
            }
        }

        const sizeMB = (totalSize / (1024 * 1024)).toFixed(1);
        return `${sizeMB} MB`;
    } catch (error) {
        return '? MB';
    }
}

/**
 * Get storage quota information
 * @returns {Promise<{used: number, quota: number, available: number, percentUsed: number}>}
 */
export async function getStorageInfo() {
    if (!navigator.storage || !navigator.storage.estimate) {
        return { used: 0, quota: 0, available: 0, percentUsed: 0 };
    }

    try {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const quota = estimate.quota || 0;
        const available = quota - used;
        const percentUsed = quota > 0 ? Math.round((used / quota) * 100) : 0;

        return { used, quota, available, percentUsed };
    } catch (error) {
        console.error('[DownloadManager] Error getting storage info:', error);
        return { used: 0, quota: 0, available: 0, percentUsed: 0 };
    }
}

/**
 * Format bytes to human readable string
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Download media files for a curriculum
 * @param {string} curriculumId
 * @param {function} onProgress - Callback for progress updates (percent, cached, total)
 * @returns {Promise<{success: boolean, fileCount: number, failedCount: number}>}
 */
export async function downloadMedia(curriculumId, onProgress) {
    const manifestPath = getManifestPath(curriculumId);
    if (!manifestPath) {
        console.error(`[DownloadManager] Unknown curriculum: ${curriculumId}`);
        return { success: false, fileCount: 0, failedCount: 0 };
    }

    try {
        // Check storage availability
        const storageInfo = await getStorageInfo();
        const requiredSpace = 60 * 1024 * 1024; // Assume ~60MB needed

        if (storageInfo.available > 0 && storageInfo.available < requiredSpace) {
            console.warn('[DownloadManager] Low storage space available');
            // Don't block, just warn
        }

        // Fetch manifest
        const manifestResponse = await fetch(manifestPath);
        if (!manifestResponse.ok) {
            throw new Error(`Failed to fetch media manifest: ${manifestResponse.status}`);
        }
        const manifest = await manifestResponse.json();

        // Collect all media files
        const allFiles = [
            ...(manifest.files.audio || []),
            ...(manifest.files.images || [])
        ];

        if (allFiles.length === 0) {
            console.log('[DownloadManager] No media files to download');
            return { success: true, fileCount: 0, failedCount: 0 };
        }

        console.log(`[DownloadManager] Downloading ${allFiles.length} media files...`);

        // Open media cache
        const cacheName = `${MEDIA_CACHE_PREFIX}${curriculumId}`;
        const cache = await caches.open(cacheName);

        // Download in batches
        const batchSize = 5; // Smaller batches for larger files
        let cachedCount = 0;
        let failedCount = 0;

        for (let i = 0; i < allFiles.length; i += batchSize) {
            const batch = allFiles.slice(i, i + batchSize);
            const results = await Promise.allSettled(
                batch.map(async (url) => {
                    try {
                        const response = await fetch(url);
                        if (response.ok) {
                            await cache.put(url, response);
                            return true;
                        }
                        return false;
                    } catch (err) {
                        console.warn(`[DownloadManager] Failed to cache ${url}:`, err.message);
                        return false;
                    }
                })
            );

            cachedCount += results.filter(r => r.status === 'fulfilled' && r.value).length;
            failedCount += results.filter(r => r.status === 'rejected' || !r.value).length;

            // Progress callback
            if (onProgress) {
                const percent = Math.round((cachedCount / allFiles.length) * 100);
                onProgress(percent, cachedCount, allFiles.length);
            }
        }

        console.log(`[DownloadManager] Download complete: ${cachedCount} files (${failedCount} failed)`);

        return {
            success: failedCount === 0,
            fileCount: cachedCount,
            failedCount
        };

    } catch (error) {
        console.error('[DownloadManager] Download error:', error);
        return { success: false, fileCount: 0, failedCount: 0 };
    }
}

/**
 * Delete downloaded media for a curriculum
 * @param {string} curriculumId
 * @returns {Promise<boolean>}
 */
export async function deleteMedia(curriculumId) {
    const cacheName = `${MEDIA_CACHE_PREFIX}${curriculumId}`;

    try {
        const deleted = await caches.delete(cacheName);
        console.log(`[DownloadManager] Media cache deleted: ${cacheName} (${deleted})`);
        return deleted;
    } catch (error) {
        console.error('[DownloadManager] Error deleting media:', error);
        return false;
    }
}

/**
 * Delete all media caches (for storage cleanup)
 * @returns {Promise<number>} Number of caches deleted
 */
export async function deleteAllMedia() {
    try {
        const cacheNames = await caches.keys();
        const mediaCaches = cacheNames.filter(name => name.startsWith(MEDIA_CACHE_PREFIX));

        let deletedCount = 0;
        for (const cacheName of mediaCaches) {
            const deleted = await caches.delete(cacheName);
            if (deleted) deletedCount++;
        }

        console.log(`[DownloadManager] Deleted ${deletedCount} media caches`);
        return deletedCount;
    } catch (error) {
        console.error('[DownloadManager] Error deleting all media:', error);
        return 0;
    }
}
