/**
 * Glossary Test Service (Gloseprøve)
 *
 * Firestore CRUD for teacher-created vocabulary tests.
 * Shared by both teacher dashboard and student ordtrener.
 *
 * Firestore structure:
 *   glossary_tests/{testCode}           - Test configuration
 *   glossary_tests/{testCode}/results/{uid} - Per-student result
 */

import * as firebaseClient from '../auth/firebase-client.js';

function getFirestore() {
    firebaseClient.isAuthAvailable();
    return firebaseClient.firestore;
}

function getCurrentUser() {
    return firebaseClient.getCurrentUser();
}

// =============================================================================
// TEST CODE GENERATION
// =============================================================================

/**
 * Generates a 3-character test code (e.g. A2B).
 * 3 chars is sufficient since class membership is already verified.
 */
function generateTestCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 3; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// =============================================================================
// TEACHER: CREATE TEST
// =============================================================================

/**
 * Creates a new glossary test.
 * @param {Object} config
 * @param {string} config.classCode - Class this test belongs to
 * @param {string} config.curriculum - e.g. "tysk1-vg1"
 * @param {string} config.language - e.g. "german"
 * @param {string} config.chapterMode - "teacher" or "student"
 * @param {number[]} config.chapters - Chapters (if teacher mode); empty if student mode
 * @param {number} config.maxAttempts - Number of allowed attempts (1-10)
 * @param {string} config.title - Display title for the test
 * @param {number|null} config.autoExpireMinutes - Minutes until auto-deactivation (null = never)
 * @returns {Promise<Object>} The created test document data
 */
export async function createGlossaryTest(config) {
    const user = getCurrentUser();
    if (!user) throw new Error('Du må være logget inn');

    // Verify teacher owns the class
    const classDoc = await getFirestore().collection('classes').doc(config.classCode).get();
    if (!classDoc.exists) throw new Error('Klassen finnes ikke');
    if (classDoc.data().teacherUid !== user.uid) throw new Error('Du har ikke tilgang');

    // Generate unique code
    let testCode = generateTestCode();
    let attempts = 0;
    while (attempts < 5) {
        const existing = await getFirestore().collection('glossary_tests').doc(testCode).get();
        if (!existing.exists) break;
        testCode = generateTestCode();
        attempts++;
    }

    const now = Date.now();
    const autoExpireMinutes = config.autoExpireMinutes || null;
    const expiresAt = autoExpireMinutes ? now + (autoExpireMinutes * 60 * 1000) : null;

    const testData = {
        code: testCode,
        classCode: config.classCode,
        teacherUid: user.uid,
        curriculum: config.curriculum,
        language: config.language || 'german',
        chapterMode: config.chapterMode, // "teacher" or "student"
        chapters: config.chapters || [],
        maxAttempts: Math.min(Math.max(config.maxAttempts || 1, 1), 10),
        title: config.title || 'Gloseprøve',
        active: true,
        createdAt: now,
        autoExpireMinutes: autoExpireMinutes,
        expiresAt: expiresAt,
        deactivatedAt: null // Set when teacher manually deactivates
    };

    await getFirestore().collection('glossary_tests').doc(testCode).set(testData);
    return testData;
}

// =============================================================================
// TEACHER: MANAGE TESTS
// =============================================================================

/**
 * Fetches all glossary tests for a class.
 */
export async function getClassGlossaryTests(classCode) {
    const snapshot = await getFirestore().collection('glossary_tests')
        .where('classCode', '==', classCode)
        .get();

    const tests = snapshot.docs.map(doc => doc.data());
    tests.sort((a, b) => b.createdAt - a.createdAt);
    return tests;
}

/**
 * Grants bonus attempts to a specific student for a test.
 * Only teachers who own the test can grant bonus attempts.
 *
 * @param {string} testCode - The test code
 * @param {string} studentUid - The student's UID
 * @param {number} extraAttempts - Number of additional attempts to grant
 * @returns {Promise<Object>} { newBonusTotal }
 */
export async function grantBonusAttempts(testCode, studentUid, extraAttempts) {
    const user = getCurrentUser();
    if (!user) throw new Error('Du må være logget inn');

    const testDoc = await getFirestore().collection('glossary_tests').doc(testCode).get();
    if (!testDoc.exists) throw new Error('Testen finnes ikke');
    if (testDoc.data().teacherUid !== user.uid) throw new Error('Ingen tilgang');

    const resultRef = getFirestore().collection('glossary_tests')
        .doc(testCode).collection('results').doc(studentUid);
    const resultDoc = await resultRef.get();

    const currentBonus = resultDoc.exists ? (resultDoc.data().bonusAttempts || 0) : 0;
    const newBonusTotal = currentBonus + extraAttempts;

    await resultRef.set({ bonusAttempts: newBonusTotal }, { merge: true });

    return { newBonusTotal };
}

/**
 * Extends the expiration time for an active test.
 * Updates expiresAt timestamp. Connected students receive the update via realtime listener.
 *
 * @param {string} testCode - The test code
 * @param {number} additionalMinutes - Minutes to add to current expiration
 * @returns {Promise<Object>} { newExpiresAt, minutesAdded }
 */
export async function extendTestTime(testCode, additionalMinutes) {
    const user = getCurrentUser();
    if (!user) throw new Error('Du må være logget inn');

    const docRef = getFirestore().collection('glossary_tests').doc(testCode);
    const doc = await docRef.get();

    if (!doc.exists) throw new Error('Testen finnes ikke');
    if (doc.data().teacherUid !== user.uid) throw new Error('Ingen tilgang');

    const currentData = doc.data();
    const now = Date.now();

    // Calculate new expiration: from current expiration or from now if expired
    const baseTime = (currentData.expiresAt && currentData.expiresAt > now)
        ? currentData.expiresAt
        : now;
    const newExpiresAt = baseTime + (additionalMinutes * 60 * 1000);

    await docRef.update({
        expiresAt: newExpiresAt,
        active: true // Ensure test is active
    });

    return {
        newExpiresAt,
        minutesAdded: additionalMinutes
    };
}

/**
 * Toggle active state of a test.
 * When deactivating, sets deactivatedAt timestamp for grace period handling.
 * When reactivating, clears deactivatedAt and optionally extends expiresAt.
 */
export async function toggleTestActive(testCode, active, extendMinutes = null) {
    const user = getCurrentUser();
    if (!user) throw new Error('Du må være logget inn');

    const doc = await getFirestore().collection('glossary_tests').doc(testCode).get();
    if (!doc.exists) throw new Error('Testen finnes ikke');
    if (doc.data().teacherUid !== user.uid) throw new Error('Ingen tilgang');

    const updateData = { active };

    if (active) {
        // Reactivating - clear deactivatedAt
        updateData.deactivatedAt = null;
        // Optionally extend expiration time
        if (extendMinutes) {
            updateData.expiresAt = Date.now() + (extendMinutes * 60 * 1000);
            updateData.autoExpireMinutes = extendMinutes;
        }
    } else {
        // Deactivating - set timestamp for grace period
        updateData.deactivatedAt = Date.now();
    }

    await getFirestore().collection('glossary_tests').doc(testCode).update(updateData);
}

/**
 * Helper: Check if a test is effectively active (considering expiration).
 * @param {Object} test - Test document data
 * @returns {Object} { isActive, isExpired, expiresAt, minutesRemaining }
 */
export function getTestActiveStatus(test) {
    const now = Date.now();

    // Check if manually deactivated
    if (!test.active) {
        return { isActive: false, isExpired: false, reason: 'manual', expiresAt: test.expiresAt, minutesRemaining: null };
    }

    // Check if auto-expired
    if (test.expiresAt && now > test.expiresAt) {
        return { isActive: false, isExpired: true, reason: 'expired', expiresAt: test.expiresAt, minutesRemaining: 0 };
    }

    // Active - calculate remaining time
    let minutesRemaining = null;
    if (test.expiresAt) {
        minutesRemaining = Math.max(0, Math.ceil((test.expiresAt - now) / 60000));
    }

    return { isActive: true, isExpired: false, reason: null, expiresAt: test.expiresAt, minutesRemaining };
}

/**
 * Fetches all student results for a specific test.
 * Returns array sorted by bestScore descending.
 */
export async function getTestResults(testCode) {
    const snapshot = await getFirestore().collection('glossary_tests')
        .doc(testCode).collection('results').get();

    const results = snapshot.docs.map(doc => doc.data());
    results.sort((a, b) => b.bestScore - a.bestScore);
    return results;
}

/**
 * Fetches all glossary test results for a specific student across all tests in a class.
 * Used for the teacher's progression view.
 */
export async function getStudentTestHistory(classCode, studentUid) {
    const tests = await getClassGlossaryTests(classCode);
    const history = [];

    for (const test of tests) {
        try {
            const resultDoc = await getFirestore().collection('glossary_tests')
                .doc(test.code).collection('results').doc(studentUid).get();

            if (resultDoc.exists) {
                const data = resultDoc.data();
                history.push({
                    testCode: test.code,
                    testTitle: test.title,
                    curriculum: test.curriculum,
                    chapters: data.chapters || test.chapters,
                    bestScore: data.bestScore,
                    bestCorrect: data.bestCorrect,
                    bestTotal: data.bestTotal,
                    bestFinalScore: data.bestFinalScore,
                    totalVocab: data.totalVocab,
                    genderAccuracy: data.genderAccuracy,
                    attemptsUsed: data.attemptsUsed,
                    maxAttempts: test.maxAttempts,
                    completedAt: data.completedAt,
                    testCreatedAt: test.createdAt
                });
            }
        } catch (err) {
            console.warn(`Failed to fetch result for test ${test.code}:`, err);
        }
    }

    history.sort((a, b) => (a.testCreatedAt || 0) - (b.testCreatedAt || 0));
    return history;
}

/**
 * Calculates aggregate statistics for all glossary tests in a class.
 */
export async function getClassTestStats(classCode) {
    const tests = await getClassGlossaryTests(classCode);
    if (tests.length === 0) {
        return { totalTests: 0, averageScore: 0, completionRate: 0, testStats: [] };
    }

    // Get the class to know total students
    const classDoc = await getFirestore().collection('classes').doc(classCode).get();
    const totalStudents = classDoc.exists ? (classDoc.data().students || []).length : 0;

    const testStats = [];
    let totalScoreSum = 0;
    let totalCompletions = 0;

    for (const test of tests) {
        const results = await getTestResults(test.code);
        const completions = results.length;
        const avgScore = completions > 0
            ? Math.round(results.reduce((sum, r) => sum + r.bestScore, 0) / completions)
            : 0;

        testStats.push({
            code: test.code,
            title: test.title,
            chapters: test.chapters,
            chapterMode: test.chapterMode,
            createdAt: test.createdAt,
            active: test.active,
            completions,
            totalStudents,
            averageScore: avgScore
        });

        totalScoreSum += results.reduce((sum, r) => sum + r.bestScore, 0);
        totalCompletions += completions;
    }

    return {
        totalTests: tests.length,
        averageScore: totalCompletions > 0 ? Math.round(totalScoreSum / totalCompletions) : 0,
        completionRate: totalStudents > 0 ? Math.round((totalCompletions / (totalStudents * tests.length)) * 100) : 0,
        testStats
    };
}

// =============================================================================
// REALTIME LISTENER (for student deactivation detection)
// =============================================================================

/**
 * Subscribes to realtime changes on a glossary test document.
 * Used by students to detect when teacher deactivates the test.
 *
 * @param {string} testCode - The test code to watch
 * @param {Function} onStatusChange - Callback called with status updates
 * @returns {Function} Unsubscribe function
 */
export function subscribeToTestStatus(testCode, onStatusChange) {
    const db = getFirestore();
    const docRef = db.collection('glossary_tests').doc(testCode);

    const unsubscribe = docRef.onSnapshot(
        (snapshot) => {
            if (!snapshot.exists) {
                onStatusChange({ exists: false, isActive: false, reason: 'deleted' });
                return;
            }

            const test = snapshot.data();
            const status = getTestActiveStatus(test);

            onStatusChange({
                exists: true,
                ...status,
                deactivatedAt: test.deactivatedAt || null
            });
        },
        (error) => {
            console.error('[GlossaryTest] Realtime listener error:', error);
            // Don't call onStatusChange on error - just log it
        }
    );

    return unsubscribe;
}

// =============================================================================
// STUDENT: TAKE TEST
// =============================================================================

/**
 * Fetches a glossary test by its code.
 * Validates student is in the class.
 * Checks if test is expired.
 */
export async function getGlossaryTest(testCode) {
    const user = getCurrentUser();
    if (!user) throw new Error('Du må være logget inn');

    const doc = await getFirestore().collection('glossary_tests').doc(testCode).get();
    if (!doc.exists) return null;

    const testData = doc.data();

    // Verify student is in the class
    const classDoc = await getFirestore().collection('classes').doc(testData.classCode).get();
    if (!classDoc.exists) return null;

    const classData = classDoc.data();
    const isTeacher = classData.teacherUid === user.uid;
    const isStudent = (classData.students || []).includes(user.uid);

    if (!isTeacher && !isStudent) {
        throw new Error('Du er ikke med i denne klassen');
    }

    // Check expiration status
    const status = getTestActiveStatus(testData);

    // For students: if expired, mark as inactive
    if (!isTeacher && status.isExpired) {
        testData.active = false;
    }

    // Add computed status info to the returned data
    testData._status = status;

    return testData;
}

/**
 * Gets the student's current result for a specific test (if any).
 */
export async function getStudentResult(testCode) {
    const user = getCurrentUser();
    if (!user) return null;

    const doc = await getFirestore().collection('glossary_tests')
        .doc(testCode).collection('results').doc(user.uid).get();

    if (!doc.exists) return null;
    return doc.data();
}

/**
 * Marks the start of a test attempt.
 * Increments attemptsUsed and sets inProgress = true.
 * Must be called BEFORE the first question is shown.
 *
 * @returns {Object} { attemptsUsed, attemptsRemaining, allowed }
 */
export async function startTestAttempt(testCode) {
    const user = getCurrentUser();
    if (!user) throw new Error('Du må være logget inn');

    const testDoc = await getFirestore().collection('glossary_tests').doc(testCode).get();
    if (!testDoc.exists) throw new Error('Testen finnes ikke');
    const test = testDoc.data();

    if (!test.active) throw new Error('Denne testen er ikke lenger aktiv');

    const resultRef = getFirestore().collection('glossary_tests')
        .doc(testCode).collection('results').doc(user.uid);
    const resultDoc = await resultRef.get();

    let currentResult = resultDoc.exists ? resultDoc.data() : null;

    // If there's a stale inProgress flag, count that attempt as used already
    if (currentResult && currentResult.inProgress) {
        // Previous attempt was interrupted - it was already counted
        // Just clear the flag and check if they can go again
    }

    const attemptsUsed = currentResult ? (currentResult.attemptsUsed || 0) : 0;
    const bonusAttempts = currentResult ? (currentResult.bonusAttempts || 0) : 0;
    const totalAllowed = test.maxAttempts + bonusAttempts;

    if (attemptsUsed >= totalAllowed) {
        return { attemptsUsed, attemptsRemaining: 0, allowed: false, bonusAttempts };
    }

    // Get student display info
    const classDoc = await getFirestore().collection('classes').doc(test.classCode).get();
    const classData = classDoc.exists ? classDoc.data() : {};
    const studentDetails = classData.studentDetails || {};
    const details = studentDetails[user.uid] || {};

    // Load profile for display name
    let displayName = 'Elev';
    try {
        const profileDoc = await getFirestore().collection('users').doc(user.uid)
            .collection('vocabData').doc('profile').get();
        if (profileDoc.exists) {
            displayName = profileDoc.data().displayName || 'Elev';
        }
    } catch (_) { /* use fallback */ }

    const newAttemptsUsed = attemptsUsed + 1;

    const updateData = {
        studentUid: user.uid,
        displayName,
        realName: details.realName || null,
        attemptsUsed: newAttemptsUsed,
        inProgress: true
    };

    // Preserve existing best score fields if they exist
    if (currentResult && currentResult.bestScore !== undefined) {
        updateData.bestScore = currentResult.bestScore;
        updateData.bestCorrect = currentResult.bestCorrect;
        updateData.bestTotal = currentResult.bestTotal;
        updateData.bestFinalScore = currentResult.bestFinalScore;
        updateData.totalVocab = currentResult.totalVocab;
        updateData.genderAccuracy = currentResult.genderAccuracy;
        updateData.chapters = currentResult.chapters;
        updateData.completedAt = currentResult.completedAt;
    }

    await resultRef.set(updateData, { merge: true });

    return {
        attemptsUsed: newAttemptsUsed,
        attemptsRemaining: totalAllowed - newAttemptsUsed,
        bonusAttempts,
        allowed: true
    };
}

/**
 * Submits a completed test result.
 * Only keeps the best score (percentage). All extended fields update with the best attempt.
 *
 * @param {string} testCode
 * @param {Object} result
 * @param {number} result.percentage - Score as percentage (0-100)
 * @param {number} result.correct - Number of correct answers
 * @param {number} result.total - Number of questions
 * @param {number} result.finalScore - Extrapolated word-mastery score (percentage * totalVocab / 100)
 * @param {number} result.totalVocab - Total words in the tested chapters
 * @param {number} result.genderAccuracy - Gender accuracy percentage (0-100), informational only
 * @param {number[]} result.chapters - Chapters tested
 */
export async function submitTestResult(testCode, result) {
    const user = getCurrentUser();
    if (!user) throw new Error('Du må være logget inn');

    const resultRef = getFirestore().collection('glossary_tests')
        .doc(testCode).collection('results').doc(user.uid);
    const resultDoc = await resultRef.get();

    if (!resultDoc.exists) throw new Error('Ingen pågående forsøk funnet');

    const current = resultDoc.data();
    const currentBest = current.bestScore || 0;
    const newScore = result.percentage;

    const updateData = {
        inProgress: false
    };

    // Only update if new score is better (or first completion)
    if (newScore > currentBest) {
        updateData.bestScore = newScore;
        updateData.bestCorrect = result.correct;
        updateData.bestTotal = result.total;
        updateData.bestFinalScore = result.finalScore || 0;
        updateData.totalVocab = result.totalVocab || 0;
        updateData.genderAccuracy = result.genderAccuracy ?? null;
        updateData.chapters = result.chapters;
        updateData.completedAt = Date.now();
    }

    await resultRef.update(updateData);

    const testDoc = await getFirestore().collection('glossary_tests').doc(testCode).get();
    const test = testDoc.data();
    const bonusAttempts = current.bonusAttempts || 0;
    const totalAllowed = test.maxAttempts + bonusAttempts;

    return {
        isNewBest: newScore > currentBest,
        bestScore: Math.max(newScore, currentBest),
        bestFinalScore: newScore > currentBest ? (result.finalScore || 0) : (current.bestFinalScore || 0),
        totalVocab: result.totalVocab || current.totalVocab || 0,
        genderAccuracy: newScore > currentBest ? (result.genderAccuracy ?? null) : (current.genderAccuracy ?? null),
        attemptsUsed: current.attemptsUsed,
        attemptsRemaining: totalAllowed - current.attemptsUsed,
        bonusAttempts
    };
}
