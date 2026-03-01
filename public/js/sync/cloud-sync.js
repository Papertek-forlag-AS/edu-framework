/**
 * =================================================================
 * CLOUD SYNC MODULE
 * =================================================================
 *
 * Handles synchronization between localStorage and Firebase Firestore cloud storage.
 * Syncs user progress, vocabulary, and preferences.
 *
 * IMPORTANT: Sync only happens when user is logged in.
 * App works perfectly offline and without login using localStorage only.
 */

import {
  firestore,
  isAuthAvailable,
  getCurrentUser
} from '../auth/firebase-client.js';
import {
  loadData,
  saveData,
  EXERCISE_DATABASE,
  getActiveCurriculum,
  getLessonProgress,
  saveLessonProgress
} from '../progress/index.js';

// Internal imports from progress module (needed for full data access)
import { getFullProgressData, saveFullProgressData } from '../progress/store.js';

// ProgressHub — notify UI widgets when cloud data is merged in
import { progressHub } from '../progress/progress-hub.js';

// Answer reports imports
import { getPendingReports, clearReports } from '../utils/answer-reports.js';

// General feedback imports
import { getPendingFeedback, clearFeedback } from '../feedback/index.js';

// Sync status indicators
let isSyncing = false;
let lastSyncError = null;

/**
 * Check if cloud sync is available
 * @returns {boolean} True if user is logged in and sync available
 */
export function isSyncAvailable() {
  if (!isAuthAvailable()) return false;
  const user = getCurrentUser();
  return user !== null;
}

/**
 * Show sync status in UI
 * @private
 * @param {string} status - 'syncing', 'success', 'error', 'offline'
 * @param {string} message - Optional message
 */
function showSyncStatus(status, message = '') {
  const statusElement = document.getElementById('sync-status');
  if (!statusElement) return;

  const icons = {
    syncing: '🔄',
    success: '✅',
    error: '⚠️',
    offline: '📡'
  };

  const colors = {
    syncing: 'bg-info-100 text-info-800',
    success: 'bg-success-100 text-success-800',
    error: 'bg-error-100 text-error-800',
    offline: 'bg-neutral-100 text-neutral-800'
  };

  statusElement.className = `fixed bottom-4 right-4 px-3 py-2 rounded-lg shadow-lg ${colors[status]}`;
  statusElement.innerHTML = `
    <div class="flex items-center gap-2">
      <span${status === 'syncing' ? ' class="animate-spin"' : ''}>${icons[status]}</span>
      <span>${message || status}</span>
    </div>
  `;
  statusElement.classList.remove('hidden');

  // Auto-hide after 3 seconds for success
  if (status === 'success') {
    setTimeout(() => {
      statusElement.classList.add('hidden');
    }, 3000);
  }
}

/**
 * Sync progress for a single exercise to cloud
 * @param {string} exerciseId - Exercise ID
 * @param {string} lessonId - Lesson ID
 * @returns {Promise<boolean>} True if sync successful
 */
export async function syncExerciseToCloud(exerciseId, lessonId) {
  if (!isSyncAvailable()) {
    return false; // Not logged in - skip cloud sync
  }

  const user = getCurrentUser();
  if (!user) return false;

  try {
    // Get current progress from NEW multi-curriculum structure
    const curriculum = getActiveCurriculum();
    const lessonProgress = getLessonProgress(lessonId);

    // Convert exercises object to array for cloud storage (backwards compatible)
    const exercisesArray = Object.keys(lessonProgress.exercises || {})
      .filter(key => lessonProgress.exercises[key] === true);

    // Update Firestore with curriculum-aware structure
    const progressRef = firestore
      .collection('user_data')
      .doc(user.uid)
      .collection('progress')
      .doc(`${curriculum}_${lessonId}`); // Include curriculum in doc ID

    await progressRef.set({
      curriculum: curriculum,
      lessonId: lessonId,
      tabs: lessonProgress.tabs || [],
      exercises: exercisesArray, // Store as array
      tests: lessonProgress.tests || [],
      achievements: lessonProgress.achievements || {},
      updated_at: new Date().toISOString()
    }, { merge: true });

    // Also sync the exercise state (answers) if it exists
    await syncExerciseStateToCloud(exerciseId, lessonId);

    console.log(`Synced exercise ${exerciseId} in lesson ${lessonId} (${curriculum}) to cloud`);
    return true;
  } catch (error) {
    console.error('Exception syncing exercise to cloud:', error);
    lastSyncError = error;
    return false;
  }
}

/**
 * Sync a single exercise state (answers/selections) to cloud
 * @param {string} exerciseId - Exercise ID
 * @param {string} lessonId - Lesson ID
 * @returns {Promise<boolean>} True if sync successful
 */
export async function syncExerciseStateToCloud(exerciseId, lessonId) {
  if (!isSyncAvailable()) {
    return false;
  }

  const user = getCurrentUser();
  if (!user) return false;

  try {
    // Find all localStorage keys for this exercise
    // Pattern: tysk-{type}-{exerciseId}-{lessonId}
    const exerciseStateKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('tysk-') &&
        key.includes(exerciseId) &&
        key.includes(lessonId) &&
        !key.includes('progress')) {
        exerciseStateKeys.push(key);
      }
    }

    // Sync each state found
    for (const key of exerciseStateKeys) {
      const stateData = localStorage.getItem(key);
      if (!stateData) continue;

      try {
        const state = JSON.parse(stateData);

        const stateRef = firestore
          .collection('user_data')
          .doc(user.uid)
          .collection('exercise_states')
          .doc(key);

        await stateRef.set({
          state: state,
          updated_at: new Date().toISOString()
        }, { merge: true });

        console.log(`Synced exercise state ${key} to cloud`);
      } catch (parseError) {
        console.warn(`Failed to sync state for key ${key}:`, parseError);
      }
    }

    return true;
  } catch (error) {
    console.error('Exception syncing exercise state:', error);
    return false;
  }
}

/**
 * Sync test result to cloud
 * @param {string} lessonId - Lesson ID
 * @param {string} testType - Test type ('leksjon', 'kapittel', 'kumulativ')
 * @param {number} score - Score achieved
 * @param {number} total - Total possible score
 * @returns {Promise<boolean>} True if sync successful
 */
export async function syncTestToCloud(lessonId, testType, score, total) {
  if (!isSyncAvailable()) {
    return false;
  }

  const user = getCurrentUser();
  if (!user) return false;

  try {
    // Get current progress from NEW multi-curriculum structure
    const curriculum = getActiveCurriculum();
    const lessonProgress = getLessonProgress(lessonId);

    // Convert exercises object to array for cloud storage
    const exercisesArray = Object.keys(lessonProgress.exercises || {})
      .filter(key => lessonProgress.exercises[key] === true);

    // Update Firestore with curriculum-aware structure
    const progressRef = firestore
      .collection('user_data')
      .doc(user.uid)
      .collection('progress')
      .doc(`${curriculum}_${lessonId}`);

    await progressRef.set({
      curriculum: curriculum,
      lessonId: lessonId,
      tabs: lessonProgress.tabs || [],
      exercises: exercisesArray,
      tests: lessonProgress.tests || [],
      achievements: lessonProgress.achievements || {},
      updated_at: new Date().toISOString()
    }, { merge: true });

    console.log(`Synced test ${testType} for lesson ${lessonId} (${curriculum}) to cloud`);
    return true;
  } catch (error) {
    console.error('Exception syncing test to cloud:', error);
    return false;
  }
}

/**
 * Sync answer reports to Firestore
 * Uses DUAL WRITE PATTERN: writes to both user subcollection and global collection
 *
 * Why dual write?
 * - User subcollection: preserves user ownership and privacy
 * - Global collection: allows efficient admin queries without collection group queries
 *
 * @returns {Promise<number>} Number of reports synced
 */
async function syncAnswerReports() {
  if (!isSyncAvailable()) {
    return 0;
  }

  const user = getCurrentUser();
  if (!user) return 0;

  try {
    const reports = getPendingReports();
    if (reports.length === 0) {
      return 0;
    }

    console.log(`Syncing ${reports.length} answer reports...`);

    let batch = firestore.batch();
    let operationCount = 0;

    for (const report of reports) {
      // Generate unique ID for this report (same for both locations)
      const reportId = firestore.collection('_').doc().id; // Generate unique ID

      // Reference 1: User subcollection (preserves user ownership)
      const userReportRef = firestore
        .collection('user_data')
        .doc(user.uid)
        .collection('answer_reports')
        .doc(reportId);

      // Reference 2: Global collection (for admin access)
      const globalReportRef = firestore
        .collection('all_answer_reports')
        .doc(reportId);

      // Prepare report data
      const reportData = {
        ...report,
        userId: user.uid,
        synced_at: new Date().toISOString()
      };

      // Prepare global report data (includes review tracking fields)
      const globalReportData = {
        ...reportData,
        reviewed: false, // Admin review status
        reviewedBy: null, // Admin who reviewed
        reviewedAt: null // Review timestamp
      };

      // DUAL WRITE: Write to BOTH locations in same batch
      batch.set(userReportRef, reportData);
      batch.set(globalReportRef, globalReportData);

      operationCount += 2; // Count both writes

      // Firestore batch limit is 500 operations, commit at 400 to be safe
      if (operationCount >= 400) {
        await batch.commit();
        console.log(`Committed batch of ${operationCount / 2} answer reports (dual write)`);
        batch = firestore.batch();
        operationCount = 0;
      }
    }

    if (operationCount > 0) {
      await batch.commit();
      console.log(`Committed final batch of ${operationCount / 2} answer reports (dual write)`);
    }

    // Clear reports from localStorage after successful sync
    clearReports();
    console.log(`Successfully synced and cleared ${reports.length} answer reports`);

    return reports.length;
  } catch (error) {
    console.error('Error syncing answer reports:', error);
    // Don't clear reports if sync failed - they'll be retried next sync
    return 0;
  }
}

/**
 * Sync general feedback to Firestore
 * Uses DUAL WRITE PATTERN: writes to both user subcollection and global collection
 *
 * @returns {Promise<number>} Number of feedback items synced
 */
async function syncGeneralFeedback() {
  if (!isSyncAvailable()) {
    return 0;
  }

  const user = getCurrentUser();
  if (!user) return 0;

  try {
    const feedbackList = getPendingFeedback();
    if (feedbackList.length === 0) {
      return 0;
    }

    console.log(`Syncing ${feedbackList.length} general feedback items...`);

    let batch = firestore.batch();
    let operationCount = 0;

    for (const feedback of feedbackList) {
      // Generate unique ID for this feedback (same for both locations)
      const feedbackId = firestore.collection('_').doc().id;

      // Reference 1: User subcollection (preserves user ownership)
      const userFeedbackRef = firestore
        .collection('user_data')
        .doc(user.uid)
        .collection('general_feedback')
        .doc(feedbackId);

      // Reference 2: Global collection (for admin access)
      const globalFeedbackRef = firestore
        .collection('all_general_feedback')
        .doc(feedbackId);

      // Prepare feedback data
      const feedbackData = {
        ...feedback,
        userId: user.uid,
        userEmail: user.email || null,
        synced_at: new Date().toISOString()
      };

      // Prepare global feedback data (includes review tracking fields)
      const globalFeedbackData = {
        ...feedbackData,
        reviewed: false,
        reviewedBy: null,
        reviewedAt: null,
        resolution: null,
        linkedCommit: null,
        linkedPR: null
      };

      // DUAL WRITE: Write to BOTH locations in same batch
      batch.set(userFeedbackRef, feedbackData);
      batch.set(globalFeedbackRef, globalFeedbackData);

      operationCount += 2;

      // Firestore batch limit is 500 operations, commit at 400 to be safe
      if (operationCount >= 400) {
        await batch.commit();
        console.log(`Committed batch of ${operationCount / 2} general feedback items (dual write)`);
        batch = firestore.batch();
        operationCount = 0;
      }
    }

    if (operationCount > 0) {
      await batch.commit();
      console.log(`Committed final batch of ${operationCount / 2} general feedback items (dual write)`);
    }

    // Clear feedback from localStorage after successful sync
    clearFeedback();
    console.log(`Successfully synced and cleared ${feedbackList.length} general feedback items`);

    return feedbackList.length;
  } catch (error) {
    console.error('Error syncing general feedback:', error);
    // Don't clear feedback if sync failed - they'll be retried next sync
    return 0;
  }
}

/**
 * Sync all local progress to cloud
 * @returns {Promise<boolean>} True if sync successful
 */
export async function syncAllProgressToCloud() {
  if (!isSyncAvailable()) {
    console.log('Sync not available - user not logged in');
    return false;
  }

  isSyncing = true;
  showSyncStatus('syncing', 'Synkroniserer...');

  try {
    // Get progress from NEW multi-curriculum structure
    const fullData = getFullProgressData();
    const curriculum = getActiveCurriculum();
    const progress = fullData.progressByCurriculum[curriculum] || {};

    const user = getCurrentUser();

    if (!user) {
      isSyncing = false;
      return false;
    }

    let batch = firestore.batch();
    let operationCount = 0;

    // Sync each lesson's progress with curriculum-aware structure
    for (const [lessonId, lessonProgress] of Object.entries(progress)) {
      // Convert exercises object to array for cloud storage
      const exercisesArray = Object.keys(lessonProgress.exercises || {})
        .filter(key => lessonProgress.exercises[key] === true);

      const progressRef = firestore
        .collection('user_data')
        .doc(user.uid)
        .collection('progress')
        .doc(`${curriculum}_${lessonId}`);

      batch.set(progressRef, {
        curriculum: curriculum,
        lessonId: lessonId,
        tabs: lessonProgress.tabs || [],
        exercises: exercisesArray,
        tests: lessonProgress.tests || [],
        achievements: lessonProgress.achievements || {},
        updated_at: new Date().toISOString()
      }, { merge: true });

      operationCount++;

      // Commit batch if near limit (Firestore limit is 500)
      if (operationCount >= 400) {
        await batch.commit();
        console.log(`Committed batch of ${operationCount} lessons`);
        batch = firestore.batch();
        operationCount = 0;
      }
    }

    // Commit remaining operations
    if (operationCount > 0) {
      await batch.commit();
      console.log(`Committed final batch of ${operationCount} lessons`);
    }

    // Sync all exercise states
    const exerciseStateKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('tysk-') &&
        !key.includes('progress') &&
        !key.includes('vocabulary') &&
        !key.includes('migration') &&
        key.includes('-')) {
        exerciseStateKeys.push(key);
      }
    }

    if (exerciseStateKeys.length > 0) {
      batch = firestore.batch();
      operationCount = 0;

      for (const key of exerciseStateKeys) {
        const stateData = localStorage.getItem(key);
        if (!stateData) continue;

        try {
          const state = JSON.parse(stateData);

          const stateRef = firestore
            .collection('user_data')
            .doc(user.uid)
            .collection('exercise_states')
            .doc(key);

          batch.set(stateRef, {
            state: state,
            updated_at: new Date().toISOString()
          }, { merge: true });

          operationCount++;

          if (operationCount >= 400) {
            await batch.commit();
            console.log(`Committed batch of ${operationCount} exercise states`);
            batch = firestore.batch();
            operationCount = 0;
          }
        } catch (parseError) {
          console.warn(`Failed to sync state for key ${key}:`, parseError);
        }
      }

      if (operationCount > 0) {
        await batch.commit();
        console.log(`Committed final batch of ${operationCount} exercise states`);
      }
    }

    // Update stats
    const statsRef = firestore
      .collection('user_data')
      .doc(user.uid)
      .collection('progress')
      .doc('_stats');

    await statsRef.set({
      current_lesson: document.body.dataset?.chapterId || '1-1',
      last_activity: new Date().toISOString()
    }, { merge: true });

    // Sync answer reports
    const reportsSynced = await syncAnswerReports();

    // Sync general feedback
    const feedbackSynced = await syncGeneralFeedback();

    // Build status message
    const syncedItems = [];
    if (reportsSynced > 0) syncedItems.push(`${reportsSynced} rapporter`);
    if (feedbackSynced > 0) syncedItems.push(`${feedbackSynced} tilbakemeldinger`);
    const extraMessage = syncedItems.length > 0 ? ` og ${syncedItems.join(', ')}` : '';

    isSyncing = false;
    showSyncStatus('success', `Synkronisert ${Object.keys(progress).length} leksjoner${extraMessage}`);
    console.log(`Synced ${Object.keys(progress).length} lessons, ${exerciseStateKeys.length} exercise states, ${reportsSynced} answer reports, and ${feedbackSynced} general feedback to cloud`);
    return true;
  } catch (error) {
    console.error('Error syncing all progress:', error);
    isSyncing = false;
    showSyncStatus('error', 'Synkronisering feilet');
    return false;
  }
}

/**
 * Pull progress from cloud and merge with local
 * Cloud data wins in case of conflicts (newer timestamp)
 * @returns {Promise<boolean>} True if sync successful
 */
export async function syncProgressFromCloud() {
  if (!isSyncAvailable()) {
    return false;
  }

  showSyncStatus('syncing', 'Laster data fra skyen...');

  const user = getCurrentUser();
  if (!user) return false;

  try {
    // Fetch all user progress from cloud (curriculum-aware structure)
    const progressSnapshot = await firestore
      .collection('user_data')
      .doc(user.uid)
      .collection('progress')
      .get();

    if (progressSnapshot.empty) {
      console.log('No cloud data to sync');
      showSyncStatus('success', 'Ingen ny data');
      return true;
    }

    // Get local progress from NEW structure
    const fullData = getFullProgressData();
    const curriculum = getActiveCurriculum();

    // Ensure curriculum exists in local data
    if (!fullData.progressByCurriculum[curriculum]) {
      fullData.progressByCurriculum[curriculum] = {};
    }

    const localProgress = fullData.progressByCurriculum[curriculum];

    // Merge cloud data into local
    let mergedCount = 0;
    let lessonsMerged = 0;

    progressSnapshot.forEach(doc => {
      const docId = doc.id;

      // Skip the stats document
      if (docId === '_stats') return;

      const cloudData = doc.data();

      // Extract curriculum and lessonId from document ID (format: curriculum_lessonId)
      const parts = docId.split('_');
      const cloudCurriculum = parts[0];
      const lessonId = parts.slice(1).join('_'); // Handle lesson IDs with underscores

      // Only merge data for the active curriculum
      if (cloudCurriculum !== curriculum) return;

      // Initialize lesson if not exists locally
      if (!localProgress[lessonId]) {
        localProgress[lessonId] = {
          completed: false,
          date: null,
          tabs: [],
          exercises: {},
          tests: [],
          achievements: {
            lesson: false,
            exercises: 0,
            extraExercises: 0,
            earnedDate: null
          }
        };
      }

      // Merge tabs (union of both)
      const cloudTabs = cloudData.tabs || [];
      const localTabs = localProgress[lessonId].tabs || [];
      const mergedTabs = [...new Set([...localTabs, ...cloudTabs])];
      if (mergedTabs.length > localTabs.length) {
        mergedCount += (mergedTabs.length - localTabs.length);
      }
      localProgress[lessonId].tabs = mergedTabs;

      // Merge exercises (convert cloud array to local object format)
      const cloudExercises = cloudData.exercises || []; // Array from cloud
      const localExercises = localProgress[lessonId].exercises || {}; // Object locally

      // Merge: add cloud exercises to local object
      cloudExercises.forEach(exerciseId => {
        if (!localExercises[exerciseId]) {
          localExercises[exerciseId] = true;
          mergedCount++;
        }
      });

      localProgress[lessonId].exercises = localExercises;

      // Merge achievements (prefer cloud if they're higher)
      if (cloudData.achievements) {
        const cloudAch = cloudData.achievements;
        const localAch = localProgress[lessonId].achievements;

        // Update if cloud has higher values
        if (cloudAch.leksjon && !localAch.leksjon) {
          localAch.leksjon = true;
          mergedCount++;
        }
        if (typeof cloudAch.exercises === 'number' && cloudAch.exercises > (localAch.exercises || 0)) {
          localAch.exercises = cloudAch.exercises;
          mergedCount++;
        }
        if (typeof cloudAch.extraExercises === 'number' && cloudAch.extraExercises > (localAch.extraExercises || 0)) {
          localAch.extraExercises = cloudAch.extraExercises;
          mergedCount++;
        }
        if (cloudAch.earnedDate && !localAch.earnedDate) {
          localAch.earnedDate = cloudAch.earnedDate;
        }
      }

      // Merge tests (prefer cloud test results if they exist)
      const cloudTests = cloudData.tests || [];
      const localTests = localProgress[lessonId].tests || [];

      // Create a map of test types from local tests
      const testMap = new Map();
      localTests.forEach(test => testMap.set(test.type, test));

      // Add or update with cloud tests
      cloudTests.forEach(cloudTest => {
        const existingTest = testMap.get(cloudTest.type);
        if (!existingTest || (cloudTest.timestamp && cloudTest.timestamp > (existingTest.timestamp || ''))) {
          testMap.set(cloudTest.type, cloudTest);
          if (!existingTest) mergedCount++;
        }
      });

      localProgress[lessonId].tests = Array.from(testMap.values());
      lessonsMerged++;
    });

    // Save merged progress back to NEW structure
    fullData.progressByCurriculum[curriculum] = localProgress;
    saveFullProgressData(fullData);

    // Fetch and restore exercise states
    const exerciseStatesSnapshot = await firestore
      .collection('user_data')
      .doc(user.uid)
      .collection('exercise_states')
      .get();

    let statesRestored = 0;
    if (!exerciseStatesSnapshot.empty) {
      exerciseStatesSnapshot.forEach(doc => {
        const key = doc.id;
        const data = doc.data();

        if (data.state) {
          // Restore to localStorage
          localStorage.setItem(key, JSON.stringify(data.state));
          statesRestored++;
        }
      });

      console.log(`Restored ${statesRestored} exercise states from cloud`);
    }

    showSyncStatus('success', `Lastet ${mergedCount} nye elementer og ${statesRestored} svar`);
    console.log(`Merged ${mergedCount} items from ${lessonsMerged} lessons and ${statesRestored} exercise states from cloud`);

    // Notify ProgressHub so all widgets (progress bar, icons, etc.) update
    progressHub.emit({ source: 'sync' });

    // Refresh UI if on index page
    if (typeof window.renderAllLessonProgress === 'function') {
      window.renderAllLessonProgress();
    }

    return true;
  } catch (error) {
    console.error('Exception syncing from cloud:', error);
    showSyncStatus('error', 'Synkronisering feilet');
    return false;
  }
}

/**
 * @deprecated This function writes duplicate data. Word progress is already tracked
 * in VocabProfileService Big Blob (users/{uid}/vocabData/profile → profile.words).
 * Not called anywhere in the codebase. Kept for backward compatibility.
 */
export async function syncVocabularyToCloud(wordGerman, wordNorwegian, lessonId, correct) {
  if (!isSyncAvailable()) {
    return false;
  }

  const user = getCurrentUser();
  if (!user) return false;

  try {
    const vocabRef = firestore
      .collection('user_data')
      .doc(user.uid)
      .collection('vocabulary')
      .doc(`${lessonId}_${wordGerman}`);

    // Get existing vocabulary data or create new
    const vocabDoc = await vocabRef.get();
    const existingData = vocabDoc.exists ? vocabDoc.data() : {};

    // Update vocabulary review data
    const updatedData = {
      word_german: wordGerman,
      word_norwegian: wordNorwegian,
      lesson_id: lessonId,
      review_count: (existingData.review_count || 0) + 1,
      correct_count: (existingData.correct_count || 0) + (correct ? 1 : 0),
      incorrect_count: (existingData.incorrect_count || 0) + (correct ? 0 : 1),
      last_reviewed: new Date().toISOString(),
      mastery_level: existingData.mastery_level || 0,
      streak: correct ? (existingData.streak || 0) + 1 : 0
    };

    await vocabRef.set(updatedData, { merge: true });

    return true;
  } catch (error) {
    console.error('Exception syncing vocabulary:', error);
    return false;
  }
}

/**
 * Auto-sync progress periodically when online and logged in
 * @param {number} intervalMs - Sync interval in milliseconds (default 5 minutes)
 * @returns {number|null} Interval ID or null
 */
export function startAutoSync(intervalMs = 5 * 60 * 1000) {
  if (!isAuthAvailable()) return null;

  console.log(`Starting auto-sync every ${intervalMs / 1000} seconds`);

  return setInterval(async () => {
    if (isSyncing) {
      console.log('Sync already in progress, skipping');
      return;
    }

    if (!isSyncAvailable()) {
      console.log('User not logged in, skipping sync');
      return;
    }

    if (!navigator.onLine) {
      console.log('Offline, skipping sync');
      showSyncStatus('offline', 'Frakoblet');
      return;
    }

    console.log('Running auto-sync...');
    await syncAllProgressToCloud();
  }, intervalMs);
}

/**
 * Stop auto-sync
 * @param {number} intervalId - Interval ID from startAutoSync
 */
export function stopAutoSync(intervalId) {
  if (intervalId) {
    clearInterval(intervalId);
    console.log('Auto-sync stopped');
  }
}

/**
 * Get last sync error
 * @returns {Error|null} Last error or null
 */
export function getLastSyncError() {
  return lastSyncError;
}

/**
 * Check if currently syncing
 * @returns {boolean} True if sync in progress
 */
export function getIsSyncing() {
  return isSyncing;
}

/**
 * Sync known words (marked as "Denne kan jeg") to cloud
 * @param {string[]} knownWordsArray - Array of German words marked as known
 * @returns {Promise<boolean>} True if sync successful
 */
export async function syncKnownWordsToCloud(knownWordsArray) {
  if (!isSyncAvailable()) {
    return false;
  }

  const user = getCurrentUser();
  if (!user) return false;

  try {
    const knownWordsRef = firestore
      .collection('user_data')
      .doc(user.uid)
      .collection('vocab_trainer')
      .doc('known_words');

    await knownWordsRef.set({
      words: knownWordsArray,
      last_updated: new Date().toISOString(),
      total_count: knownWordsArray.length
    }, { merge: true });

    console.log('Known words synced to cloud:', knownWordsArray.length);
    return true;
  } catch (error) {
    console.error('Exception syncing known words to cloud:', error);
    return false;
  }
}

/**
 * Load known words from cloud
 * @returns {Promise<string[]>} Array of German words marked as known
 */
export async function loadKnownWordsFromCloud() {
  if (!isSyncAvailable()) {
    return [];
  }

  const user = getCurrentUser();
  if (!user) return [];

  try {
    const knownWordsRef = firestore
      .collection('user_data')
      .doc(user.uid)
      .collection('vocab_trainer')
      .doc('known_words');

    const doc = await knownWordsRef.get();

    if (doc.exists) {
      const data = doc.data();
      console.log('Known words loaded from cloud:', data.words?.length || 0);
      return data.words || [];
    }

    return [];
  } catch (error) {
    console.error('Exception loading known words from cloud:', error);
    return [];
  }
}

/**
 * Sync vocab test result to cloud
 * @param {object} result - Test result object
 * @returns {Promise<boolean>} True if sync successful
 */
export async function syncVocabTestResultToCloud(result) {
  if (!isSyncAvailable()) return false;
  const user = getCurrentUser();
  if (!user) return false;

  try {
    // Use timestamp as ID to ensure uniqueness
    const resultId = result.timestamp ? result.timestamp.replace(/[:.]/g, '-') : new Date().toISOString().replace(/[:.]/g, '-');

    const resultRef = firestore
      .collection('user_data')
      .doc(user.uid)
      .collection('vocab_trainer')
      .doc('test_results')
      .collection('history')
      .doc(resultId);

    await resultRef.set(result, { merge: true });
    console.log('Vocab test result synced to cloud');
    return true;
  } catch (error) {
    console.error('Exception syncing vocab test result:', error);
    return false;
  }
}

/**
 * Load vocab test results from cloud
 * @returns {Promise<object[]>} Array of test results
 */
export async function loadVocabTestResultsFromCloud() {
  if (!isSyncAvailable()) return [];
  const user = getCurrentUser();
  if (!user) return [];

  try {
    const historyRef = firestore
      .collection('user_data')
      .doc(user.uid)
      .collection('vocab_trainer')
      .doc('test_results')
      .collection('history');

    const snapshot = await historyRef.get();
    const results = [];
    snapshot.forEach(doc => results.push(doc.data()));

    console.log(`Loaded ${results.length} vocab test results from cloud`);
    return results;
  } catch (error) {
    console.error('Exception loading vocab test results:', error);
    return [];
  }
}
