/**
 * =================================================================
 * DATA MIGRATION MODULE - DISABLED (v285)
 * =================================================================
 *
 * Migration has been REMOVED because:
 * 1. Cloud sync for known words has existed since Nov 18, 2025 (commit 683b09f)
 * 2. Known words are automatically synced via cloud-sync.js every time user marks "Denne kan jeg"
 * 3. initializeKnownWords() in known-words.js already loads from cloud and merges with local
 * 4. Most logged-in users already have their vocabulary in Firebase
 * 5. Users who aren't logged in aren't paying customers (data loss acceptable)
 *
 * This file is kept for backwards compatibility but functions are no-ops.
 *
 * TIMELINE:
 * - Nov 18, 2025: Cloud sync for vocabulary implemented
 * - Dec 20, 2025: Multi-curriculum added (exercise ID structure change)
 * - Dec 23, 2025: Migration simplified to vocabulary-only (v284)
 * - Dec 23, 2025: Migration removed entirely (v285)
 */

import { loadData } from '../progress/index.js';
import { firestore, isAuthAvailable } from '../auth/firebase-client.js';

/**
 * Migrate vocabulary and preferences to cloud (called on first login)
 * NO-OP: Migration disabled - cloud sync handles everything automatically
 * @param {string} userId - User's Firebase UID
 * @returns {Promise<boolean>} True (always succeeds)
 */
export async function migrateLocalDataToCloud(userId) {
  console.log('Migration disabled - vocabulary auto-syncs via cloud-sync.js');
  return true;
}

// Migration functions removed - vocabulary auto-syncs via cloud-sync.js

/**
 * Reset migration status (for testing or manual reset)
 * NO-OP: Migration disabled
 * @param {string} userId - User's Firebase UID
 */
export function resetMigrationStatus(userId) {
  console.log('Migration disabled - no status to reset');
}
