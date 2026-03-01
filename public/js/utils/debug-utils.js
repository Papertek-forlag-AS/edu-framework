/**
 * Debug utilities for testing migration and data structure compatibility.
 * Exposed to window object for console access.
 */

import { getCurrentUser } from '../auth/firebase-client.js';

// Note: resetMigrationStatus would need to be imported if it exists
// For now, we'll implement the reset inline
function resetMigrationStatus(userId) {
    localStorage.removeItem(`migration_done_${userId}`);
    localStorage.removeItem(`migration_timestamp_${userId}`);
}

/**
 * Test old data structure compatibility
 */
export const testOldDataStructure = {
    /**
     * Simulate old pre-multi-curriculum data (before Dec 20, 2025)
     * Tests how v285 handles student data from before the structural changes
     */
    createOldProgressData: function () {
        console.log('📦 Creating OLD data structure (pre-multi-curriculum)...');

        // Old format: stored at 'tysk08-progress'
        // exercises was an ARRAY, not an object
        // No achievements field
        const oldProgress = {
            '1-1': {
                tabs: ['lesson', 'exercises'],
                exercises: ['exercise-1-1-1', 'exercise-2-1-1', 'aufgabeA', 'aufgabeB'],  // Array format!
                tests: [{ type: 'lesson', score: 85, date: '2025-12-15', passed: true }]
            },
            '1-2': {
                tabs: ['lesson', 'exercises'],
                exercises: ['aufgabeA', 'aufgabeB', 'aufgabeC'],
                tests: [{ type: 'lesson', score: 90, date: '2025-12-16', passed: true }]
            },
            '1-3': {
                tabs: ['lesson', 'exercises'],
                exercises: ['aufgabeA', 'aufgabeB', 'aufgabeC', 'aufgabeD'],
                tests: [
                    { type: 'lesson', score: 88, date: '2025-12-17', passed: true },
                    { type: 'chapter', score: 92, date: '2025-12-18', passed: true }
                ]
            },
            '2-1': {
                tabs: ['lesson'],
                exercises: ['aufgabeA', 'aufgabeB'],
                tests: []
            }
        };

        localStorage.setItem('tysk08-progress', JSON.stringify(oldProgress));

        // Old known words format
        const oldKnownWords = ['der Vater', 'die Mutter', 'das Haus', 'der Hund', 'die Katze'];
        localStorage.setItem('vocab-trainer-known-words', JSON.stringify(oldKnownWords));

        console.log('✅ Old data structure created!');
        console.log('📊 Old progress:', oldProgress);
        console.log('📚 Old known words:', oldKnownWords);
        console.log('');
        console.log('💡 To test:');
        console.log('1. Reload the page: location.reload()');
        console.log('2. Check console for migration messages');
        console.log('3. Go to Framgang page to see if data migrated correctly');
        console.log('4. Check if exercises show up correctly');
    },

    /**
     * Show what's currently in localStorage
     */
    showCurrentData: function () {
        console.log('📊 CURRENT localStorage data:');
        console.log('');

        const oldProgress = localStorage.getItem('tysk08-progress');
        if (oldProgress) {
            console.log('OLD FORMAT (tysk08-progress):');
            console.log(JSON.parse(oldProgress));
        } else {
            console.log('❌ No old format data (tysk08-progress)');
        }

        console.log('');

        const newProgress = localStorage.getItem('progressData');
        if (newProgress) {
            console.log('NEW FORMAT (progressData):');
            console.log(JSON.parse(newProgress));
        } else {
            console.log('❌ No new format data (progressData)');
        }

        console.log('');

        const oldKnownWords = localStorage.getItem('vocab-trainer-known-words');
        if (oldKnownWords) {
            console.log('KNOWN WORDS (old format):');
            console.log(JSON.parse(oldKnownWords));
        }

        const newKnownWords = localStorage.getItem('progressData');
        if (newKnownWords) {
            const data = JSON.parse(newKnownWords);
            if (data.knownWords) {
                console.log('KNOWN WORDS (new format):');
                console.log(data.knownWords);
            }
        }
    },

    /**
     * Clear all progress data to start fresh
     */
    clearAll: function () {
        localStorage.removeItem('tysk08-progress');
        localStorage.removeItem('progressData');
        localStorage.removeItem('vocab-trainer-known-words');
        console.log('✅ All progress data cleared');
        console.log('💡 Reload to start fresh: location.reload()');
    },

    /**
     * Full test scenario: Clear → Create old data → Reload
     */
    runFullTest: function () {
        console.log('🧪 FULL COMPATIBILITY TEST');
        console.log('========================');
        this.clearAll();
        console.log('');
        this.createOldProgressData();
        console.log('');
        console.log('🔄 Reloading in 2 seconds...');
        setTimeout(() => location.reload(), 2000);
    }
};

/**
 * Debug migration utilities
 */
export const debugMigration = {
    /**
     * Reset migration status and trigger a fresh migration
     * Usage: await debugMigration.reset()
     */
    reset: async function () {
        const user = getCurrentUser();
        if (!user) {
            console.error('❌ No user logged in. Please log in first.');
            return;
        }

        console.log('🔄 Resetting migration status for user:', user.uid);
        resetMigrationStatus(user.uid);

        console.log('✅ Migration status reset. Reload page to trigger fresh migration.');
        console.log('💡 Run: location.reload()');
    },

    /**
     * Check migration status
     * Usage: debugMigration.status()
     */
    status: function () {
        const user = getCurrentUser();
        if (!user) {
            console.error('❌ No user logged in');
            return;
        }

        const migrationDone = localStorage.getItem(`migration_done_${user.uid}`);
        const migrationTime = localStorage.getItem(`migration_timestamp_${user.uid}`);

        console.log('=== MIGRATION STATUS ===');
        console.log('User ID:', user.uid);
        console.log('Email:', user.email);
        console.log('Migration done:', migrationDone || 'false');
        console.log('Migration timestamp:', migrationTime || 'never');
        console.log('======================');
    },

    /**
     * Full reset: Clear migration status and reload
     * Usage: debugMigration.fullReset()
     */
    fullReset: function () {
        const user = getCurrentUser();
        if (!user) {
            console.error('❌ No user logged in');
            return;
        }

        console.log('🔄 Full reset: Clearing migration status and reloading...');
        resetMigrationStatus(user.uid);

        setTimeout(() => {
            location.reload();
        }, 500);
    },

    /**
     * Create test vocabulary data in old formats for migration testing
     * Usage: debugMigration.createTestData()
     */
    createTestData: function () {
        console.log('📚 Creating test vocabulary data in old formats...');

        // 1. Create old format known words array
        const oldFormatWords = ['Hund', 'Katze', 'Haus', 'Baum', 'Auto'];
        localStorage.setItem('vocab-trainer-known-words', JSON.stringify(oldFormatWords));
        console.log('✅ Created vocab-trainer-known-words:', oldFormatWords);

        // 2. Create new multi-curriculum format
        const progressData = {
            knownWords: ['Schule', 'Buch', 'Tisch', 'Stuhl'],
            curriculum: 'vg1',
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('progressData', JSON.stringify(progressData));
        console.log('✅ Created progressData.knownWords:', progressData.knownWords);

        // 3. Create vocabulary object with review history
        const vocabData = {
            'Wasser': { reviewCount: 5, masteryLevel: 3 },
            'Brot': { reviewCount: 2, masteryLevel: 1 },
            'Milch': { reviewCount: 8, masteryLevel: 4 },
            'Apfel': { reviewCount: 0, masteryLevel: 0 } // This won't be migrated (no reviews)
        };
        localStorage.setItem('vocabulary', JSON.stringify(vocabData));
        console.log('✅ Created vocabulary object:', vocabData);

        console.log('\n📊 SUMMARY:');
        console.log('- Old format array: 5 words');
        console.log('- New format array: 4 words');
        console.log('- Vocabulary object: 3 words (with reviews)');
        console.log('- Expected total after migration: 12 unique words');
        console.log('\n💡 Now log in to trigger migration, or run debugMigration.reset() if already logged in');
    },

    /**
     * Show current localStorage vocabulary data
     * Usage: debugMigration.showLocalData()
     */
    showLocalData: function () {
        console.log('=== LOCAL VOCABULARY DATA ===');

        const oldFormat = localStorage.getItem('vocab-trainer-known-words');
        const progressData = localStorage.getItem('progressData');
        const vocabulary = localStorage.getItem('vocabulary');

        console.log('\n1. Old format (vocab-trainer-known-words):');
        console.log(oldFormat ? JSON.parse(oldFormat) : 'No data');

        console.log('\n2. New format (progressData.knownWords):');
        if (progressData) {
            const data = JSON.parse(progressData);
            console.log(data.knownWords || 'No knownWords array');
        } else {
            console.log('No progressData');
        }

        console.log('\n3. Vocabulary object:');
        if (vocabulary) {
            const data = JSON.parse(vocabulary);
            console.log(Object.keys(data).length + ' entries');
            console.log(data);
        } else {
            console.log('No vocabulary data');
        }

        console.log('\n============================');
    }
};

/**
 * Initialize debug utilities by exposing them to the window object
 */
export function initDebugUtils() {
    window.testOldDataStructure = testOldDataStructure;
    window.debugMigration = debugMigration;

    console.log('💡 Debug utilities loaded:');
    console.log('  - debugMigration.status() - Check migration status');
    console.log('  - debugMigration.reset() - Reset migration (requires reload)');
    console.log('  - debugMigration.fullReset() - Reset and reload');
    console.log('  - debugMigration.createTestData() - Create test vocabulary data');
    console.log('  - debugMigration.showLocalData() - Show current localStorage vocabulary');
}
