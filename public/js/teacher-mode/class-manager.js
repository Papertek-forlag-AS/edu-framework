/**
 * Class Manager Module
 * Handles Firestore operations for Teacher Dashboard
 *
 * Cross-Platform Master Spec v3.3 - Aligned with iOS implementation
 *
 * Firestore Structure:
 * - classes/{classId} - Class document with students array
 * - users/{uid}/vocabData/profile - Student profile with classIds array
 */

import * as firebaseClient from '../auth/firebase-client.js';

// Helper to get firestore after ensuring initialization
function getFirestore() {
    firebaseClient.isAuthAvailable(); // Triggers initialization
    return firebaseClient.firestore;
}

function getCurrentUser() {
    return firebaseClient.getCurrentUser();
}

/**
 * Returns the ISO date string (YYYY-MM-DD) of the Monday for the current week.
 * Used to check if stored weeklyPoints belong to the current week.
 */
function _getCurrentMonday() {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
}

/**
 * Checks if the stored weekStartDate matches the current week.
 * If not, weeklyPoints are stale (from a previous week) and should be treated as 0.
 */
function _isCurrentWeek(weekStartDate) {
    return weekStartDate === _getCurrentMonday();
}

/**
 * Resolves weekly points for a student given a target week.
 * Handles three cases:
 * 1. targetWeek is null/current week → use weeklyPoints if weekStartDate matches current week
 * 2. targetWeek matches weekStartDate → use weeklyPoints (student hasn't reset yet)
 * 3. targetWeek is a past week → look up weeklyPointsHistory
 */
function _resolveWeeklyPoints(data, targetWeek) {
    const currentMonday = _getCurrentMonday();
    const effectiveTarget = targetWeek || currentMonday;

    // If the student's weekStartDate matches the requested week, use their live weeklyPoints
    if (data.weekStartDate === effectiveTarget) {
        return {
            weeklyPoints: data.weeklyPoints || 0,
            languagePoints: data.languagePoints || {}
        };
    }

    // Otherwise look in history
    const histEntry = (data.weeklyPointsHistory || {})[effectiveTarget];
    if (histEntry) {
        return {
            weeklyPoints: histEntry.points || 0,
            languagePoints: histEntry.languagePoints || {}
        };
    }

    // No data for this week
    return { weeklyPoints: 0, languagePoints: {} };
}

// =============================================================================
// CLASS CODE GENERATION
// =============================================================================

/**
 * Generates a random 6-character class code
 * Format: XXX-XXX (excluding I, O, 0, 1 to avoid confusion)
 * @returns {string} e.g. "TR-92X"
 */
function generateClassCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1
    let result = '';
    for (let i = 0; i < 3; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    result += '-';
    for (let i = 0; i < 3; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
}

// =============================================================================
// CLASS CRUD OPERATIONS
// =============================================================================

/**
 * Creates a new class in Firestore
 * @param {string} className - Name of the class (e.g. "Tysk 10A")
 * @param {Object} options - Optional settings
 * @param {boolean} options.allowNicknames - If true, students can use nicknames; if false (default), real names are required
 * @returns {Promise<Object>} The created class object
 */
export async function createClass(className, options = {}) {
    const { allowNicknames = false } = options;
    const user = getCurrentUser();
    if (!user) throw new Error("Du må være logget inn for å opprette en klasse");

    // Generate unique code (check for collisions)
    let classCode = generateClassCode();
    let attempts = 0;
    while (attempts < 5) {
        const existing = await getFirestore().collection('classes').doc(classCode).get();
        if (!existing.exists) break;
        classCode = generateClassCode();
        attempts++;
    }

    const classData = {
        code: classCode,
        name: className,
        teacherUid: user.uid,
        teacherName: user.displayName || 'Ukjent Lærer',
        created: Date.now(),
        joinPolicy: 'open',
        allowNicknames: allowNicknames, // false = real names required, true = nicknames allowed
        students: [], // Array of student UIDs
        studentDetails: {} // Map of uid -> { realName, joinedAt }
    };

    // Create the class document (use code as document ID for easy lookup)
    await getFirestore().collection('classes').doc(classCode).set(classData);

    return classData;
}

/**
 * Fetches all classes owned by the current teacher
 * @returns {Promise<Array>} List of class objects
 */
export async function getTeacherClasses() {
    const user = getCurrentUser();
    if (!user) return [];

    try {
        const snapshot = await getFirestore().collection('classes')
            .where('teacherUid', '==', user.uid)
            .orderBy('created', 'desc')
            .get();

        return snapshot.docs.map(doc => ({
            ...doc.data(),
            memberCount: doc.data().students?.length || 0
        }));
    } catch (error) {
        console.error("Error fetching teacher classes:", error);
        // Fallback without orderBy if index doesn't exist
        const snapshot = await getFirestore().collection('classes')
            .where('teacherUid', '==', user.uid)
            .get();

        const classes = snapshot.docs.map(doc => ({
            ...doc.data(),
            memberCount: doc.data().students?.length || 0
        }));

        // Client-side sort
        return classes.sort((a, b) => b.created - a.created);
    }
}

/**
 * Finds a class by its code
 * @param {string} code - The class code (e.g. "TR-92X")
 * @returns {Promise<Object|null>} The class data or null if not found
 */
export async function findClassByCode(code) {
    const doc = await getFirestore().collection('classes').doc(code).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
}

/**
 * Deletes a class (teacher only)
 * @param {string} classCode - The class code to delete
 */
export async function deleteClass(classCode) {
    const user = getCurrentUser();
    if (!user) throw new Error("Du må være logget inn");

    const classDoc = await getFirestore().collection('classes').doc(classCode).get();
    if (!classDoc.exists) throw new Error("Klassen finnes ikke");

    const classData = classDoc.data();
    if (classData.teacherUid !== user.uid) {
        throw new Error("Du har ikke tilgang til å slette denne klassen");
    }

    // Remove classId from all student profiles
    const batch = getFirestore().batch();
    for (const studentUid of classData.students || []) {
        const profileRef = getFirestore().collection('users').doc(studentUid)
            .collection('vocabData').document('profile');
        batch.update(profileRef, {
            classIds: firebase.firestore.FieldValue.arrayRemove(classCode)
        });
    }

    // Delete the class document
    batch.delete(getFirestore().collection('classes').doc(classCode));
    await batch.commit();
}

// =============================================================================
// CLASS SETTINGS
// =============================================================================

/**
 * Updates class settings
 * @param {string} classCode - The class code
 * @param {Object} settings - Settings to update
 * @param {boolean} settings.allowNicknames - Whether to allow student nicknames
 * @returns {Promise<void>}
 */
export async function updateClassSettings(classCode, settings) {
    const user = getCurrentUser();
    if (!user) throw new Error("Du må være logget inn");

    const classDoc = await getFirestore().collection('classes').doc(classCode).get();
    if (!classDoc.exists) throw new Error("Klassen finnes ikke");

    const classData = classDoc.data();
    if (classData.teacherUid !== user.uid) {
        throw new Error("Du har ikke tilgang til å endre innstillinger for denne klassen");
    }

    const updates = {};
    if (typeof settings.allowNicknames === 'boolean') {
        updates.allowNicknames = settings.allowNicknames;
    }

    if (Object.keys(updates).length > 0) {
        await getFirestore().collection('classes').doc(classCode).update(updates);
    }
}

// =============================================================================
// STUDENT MANAGEMENT
// =============================================================================

/**
 * Removes a student from a class (teacher only)
 * @param {string} classCode - The class code
 * @param {string} studentUid - The student's UID to remove
 * @returns {Promise<void>}
 */
export async function removeStudentFromClass(classCode, studentUid) {
    const user = getCurrentUser();
    if (!user) throw new Error("Du må være logget inn");

    const classDoc = await getFirestore().collection('classes').doc(classCode).get();
    if (!classDoc.exists) throw new Error("Klassen finnes ikke");

    const classData = classDoc.data();
    if (classData.teacherUid !== user.uid) {
        throw new Error("Du har ikke tilgang til å fjerne elever fra denne klassen");
    }

    // Remove student from class
    await getFirestore().collection('classes').doc(classCode).update({
        students: firebase.firestore.FieldValue.arrayRemove(studentUid),
        [`studentDetails.${studentUid}`]: firebase.firestore.FieldValue.delete()
    });

    // Also remove classId from student's profile
    try {
        await getFirestore()
            .collection('users')
            .doc(studentUid)
            .collection('vocabData')
            .doc('profile')
            .update({
                classIds: firebase.firestore.FieldValue.arrayRemove(classCode)
            });
    } catch (err) {
        console.warn("Could not update student profile:", err);
        // Continue - the important part is removing from class
    }
}

/**
 * Gets detailed student info for a class (including real names)
 * @param {string} classCode - The class code
 * @returns {Promise<Array>} List of students with details
 */
export async function getClassStudentDetails(classCode) {
    const user = getCurrentUser();
    if (!user) return [];

    const classDoc = await getFirestore().collection('classes').doc(classCode).get();
    if (!classDoc.exists) return [];

    const classData = classDoc.data();
    if (classData.teacherUid !== user.uid) {
        throw new Error("Du har ikke tilgang til denne klassen");
    }

    const studentDetails = classData.studentDetails || {};
    const students = classData.students || [];

    // Combine with profile data
    const result = [];
    for (const uid of students) {
        const details = studentDetails[uid] || {};

        // Fetch current profile for display name and stats
        try {
            const profileDoc = await getFirestore()
                .collection('users')
                .doc(uid)
                .collection('vocabData')
                .doc('profile')
                .get();

            const profile = profileDoc.exists ? profileDoc.data() : {};

            result.push({
                uid,
                realName: details.realName || 'Ukjent',
                displayName: profile.displayName || 'Anonym Elev',
                joinedAt: details.joinedAt || null,
                weeklyPoints: profile.weeklyPoints || 0,
                currentStreak: profile.currentStreak || 0
            });
        } catch (err) {
            result.push({
                uid,
                realName: details.realName || 'Ukjent',
                displayName: 'Ukjent',
                joinedAt: details.joinedAt || null,
                weeklyPoints: 0,
                currentStreak: 0
            });
        }
    }

    return result;
}

// =============================================================================
// LEADERBOARD OPERATIONS
// =============================================================================

/**
 * SRS Score Calculator (matches iOS SRSScoreCalculator)
 * Time Period: Rolling 28 days
 */
const SRS_SCORING_PERIOD_DAYS = 28;

/**
 * Calculate SRS optimization score from review log and training days
 * Matches iOS SRSScoreCalculator implementation
 */
function calculateSRSScore(reviewLog, trainingDays, words) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - SRS_SCORING_PERIOD_DAYS);
    const cutoffString = cutoffDate.toISOString().split('T')[0];

    // Filter to scoring period
    const relevantReviews = (reviewLog || []).filter(r => r.reviewDate >= cutoffString);
    const relevantDays = (trainingDays || []).filter(d => d >= cutoffString);

    // 1. TIMING ADHERENCE (40% - max 400 points)
    let totalTimingScore = 0;
    for (const review of relevantReviews) {
        const daysDiff = Math.abs(daysBetween(review.scheduledDate, review.reviewDate));
        let score;
        if (daysDiff === 0) score = 1.0;
        else if (daysDiff === 1) score = 0.8;
        else if (daysDiff === 2) score = 0.5;
        else score = 0.2;
        totalTimingScore += score;
    }
    const timingScore = relevantReviews.length > 0
        ? totalTimingScore / relevantReviews.length
        : 0;

    // 2. WORD GRADUATION (35% - max 350 points)
    let graduationScore = 0;
    for (const [wordId, progress] of Object.entries(words || {})) {
        const interval = progress.interval || 0;
        if (interval >= 60) graduationScore += 100;
        else if (interval >= 30) graduationScore += 50;
        else if (interval >= 14) graduationScore += 25;
        else if (interval >= 7) graduationScore += 10;
    }

    // 3. SESSION REGULARITY (25% - max 250 points)
    let regularityScore = 0;
    if (relevantDays.length >= 2) {
        const sortedDays = [...relevantDays].sort();
        const gaps = [];
        for (let i = 1; i < sortedDays.length; i++) {
            gaps.push(daysBetween(sortedDays[i - 1], sortedDays[i]));
        }

        if (gaps.length > 0) {
            const meanGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
            const variance = gaps.reduce((sum, gap) => sum + Math.pow(gap - meanGap, 2), 0) / gaps.length;
            const stdDev = Math.sqrt(variance);
            // Lower std dev = more regular = higher score
            // Ideal is daily (stdDev ≈ 0)
            regularityScore = Math.max(0, 1 - (stdDev / 7));
        }
    } else if (relevantDays.length === 1) {
        regularityScore = 0.3; // Some credit for at least one session
    }

    // Composite score (max 1000)
    const timingComponent = Math.round(timingScore * 400);
    const graduationComponent = Math.min(graduationScore, 350);
    const regularityComponent = Math.round(regularityScore * 250);
    const composite = timingComponent + graduationComponent + regularityComponent;

    return {
        timingScore,
        graduationScore: graduationComponent,
        regularityScore,
        composite,
        reviewCount: relevantReviews.length,
        trainingDayCount: relevantDays.length
    };
}

/**
 * Calculate days between two YYYY-MM-DD date strings
 */
function daysBetween(from, to) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const diffTime = toDate - fromDate;
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Fetches the leaderboard for a specific class
 * @param {string} classCode - The class code
 * @param {string} mode - 'points' or 'srsOptimization'
 * @param {string} language - 'all', 'german', or 'spanish' (only applies to points mode)
 * @param {string|null} targetWeek - Monday date string (YYYY-MM-DD) to view a specific week, or null for current week
 * @returns {Promise<Array>} List of student objects with ranking
 */
export async function getClassLeaderboard(classCode, mode = 'points', language = 'all', targetWeek = null) {
    try {
        // Get the class document to get student UIDs and real names
        const classDoc = await getFirestore().collection('classes').doc(classCode).get();
        if (!classDoc.exists) {
            console.warn("Class not found:", classCode);
            return [];
        }

        const classData = classDoc.data();
        const studentUids = classData.students || [];
        const studentDetails = classData.studentDetails || {}; // Real names stored here

        if (studentUids.length === 0) {
            return [];
        }

        // Check if current user is the teacher (to show real names)
        const isTeacher = classData.teacherUid === getCurrentUser()?.uid;

        let students;

        if (mode === 'srsOptimization') {
            // SRS mode needs full profile data (reviewLog, trainingDays, words)
            // Fall back to individual profile reads
            students = await _fetchLeaderboardFromProfiles(studentUids, studentDetails, isTeacher, mode, language, targetWeek);
        } else {
            // Points mode: use leaderboard cache (1 collection read instead of N profile reads)
            students = await _fetchLeaderboardFromCache(classCode, studentUids, studentDetails, isTeacher, language, targetWeek);
        }

        // Sort by score descending
        students.sort((a, b) => b.score - a.score);

        // Add rank
        return students.map((s, index) => ({
            ...s,
            rank: index + 1,
            isCurrentUser: s.uid === getCurrentUser()?.uid
        }));

    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        return [];
    }
}

/**
 * Fetch leaderboard data from the leaderboard cache subcollection.
 * Uses 1 collection read instead of N individual profile reads.
 * Falls back to individual reads if cache is empty (students haven't saved yet).
 * @private
 */
async function _fetchLeaderboardFromCache(classCode, studentUids, studentDetails, isTeacher, language, targetWeek = null) {
    const students = [];

    try {
        const cacheSnapshot = await getFirestore()
            .collection('classes').doc(classCode)
            .collection('leaderboard')
            .get();

        if (cacheSnapshot.empty) {
            // Cache not populated yet, fall back to individual reads
            console.log('Leaderboard cache empty, falling back to profile reads');
            return _fetchLeaderboardFromProfiles(studentUids, studentDetails, isTeacher, 'points', language, targetWeek);
        }

        // Build a set of valid student UIDs for this class
        const validUids = new Set(studentUids);

        cacheSnapshot.forEach(doc => {
            const uid = doc.id;
            if (!validUids.has(uid)) return; // Skip students no longer in class

            const data = doc.data();
            const details = studentDetails[uid] || {};

            // Resolve weekly points for the target week (current or historical)
            const resolved = _resolveWeeklyPoints(data, targetWeek);

            let score;
            if (language === 'all') {
                score = resolved.weeklyPoints;
            } else {
                score = resolved.languagePoints?.[language]?.weekly || 0;
            }

            students.push({
                uid,
                displayName: data.displayName || 'Anonym Elev',
                realName: isTeacher ? (details.realName || null) : null,
                score,
                weeklyPoints: resolved.weeklyPoints,
                germanWeeklyPoints: resolved.languagePoints?.german?.weekly || 0,
                spanishWeeklyPoints: resolved.languagePoints?.spanish?.weekly || 0,
                frenchWeeklyPoints: resolved.languagePoints?.french?.weekly || 0,
                srsScore: null,
                currentStreak: data.currentStreak || 0,
                totalPoints: data.totalPoints || 0
            });
        });

        // Check if any students in the class don't have cache entries yet
        const cachedUids = new Set(students.map(s => s.uid));
        const missingUids = studentUids.filter(uid => !cachedUids.has(uid));

        if (missingUids.length > 0) {
            // Fetch missing students from individual profiles
            const missingStudents = await _fetchLeaderboardFromProfiles(
                missingUids, studentDetails, isTeacher, 'points', language, targetWeek
            );
            students.push(...missingStudents);
        }

    } catch (error) {
        console.warn('Leaderboard cache read failed, falling back to profiles:', error);
        return _fetchLeaderboardFromProfiles(studentUids, studentDetails, isTeacher, 'points', language, targetWeek);
    }

    return students;
}

/**
 * Fetch leaderboard data from individual student profiles (legacy N+1 pattern).
 * Used as fallback when cache is empty or for SRS optimization mode.
 * @private
 */
async function _fetchLeaderboardFromProfiles(studentUids, studentDetails, isTeacher, mode, language, targetWeek = null) {
    const students = [];

    for (const uid of studentUids) {
        try {
            const profileDoc = await getFirestore()
                .collection('users')
                .doc(uid)
                .collection('vocabData')
                .doc('profile')
                .get();

            if (profileDoc.exists) {
                const data = profileDoc.data();

                // Resolve weekly points for the target week (current or historical)
                const resolved = _resolveWeeklyPoints(data, targetWeek);

                let score, srsScore;
                if (mode === 'srsOptimization') {
                    srsScore = calculateSRSScore(
                        data.reviewLog,
                        data.trainingDays,
                        data.words
                    );
                    score = srsScore.composite;
                } else {
                    if (language === 'all') {
                        score = resolved.weeklyPoints;
                    } else {
                        score = resolved.languagePoints?.[language]?.weekly || 0;
                    }
                }

                const details = studentDetails[uid] || {};

                students.push({
                    uid,
                    displayName: data.displayName || 'Anonym Elev',
                    realName: isTeacher ? (details.realName || null) : null,
                    score,
                    weeklyPoints: resolved.weeklyPoints,
                    germanWeeklyPoints: resolved.languagePoints?.german?.weekly || 0,
                    spanishWeeklyPoints: resolved.languagePoints?.spanish?.weekly || 0,
                    frenchWeeklyPoints: resolved.languagePoints?.french?.weekly || 0,
                    srsScore: srsScore || null,
                    currentStreak: data.currentStreak || 0,
                    totalPoints: data.totalPoints || 0
                });
            }
        } catch (err) {
            console.warn(`Failed to fetch profile for ${uid}:`, err);
        }
    }

    return students;
}

/**
 * Gets detailed class statistics
 * @param {string} classCode - The class code
 * @returns {Promise<Object>} Class statistics
 */
export async function getClassStats(classCode) {
    const students = await getClassLeaderboard(classCode, 'points');

    if (students.length === 0) {
        return {
            totalStudents: 0,
            totalPoints: 0,
            averagePoints: 0,
            activeThisWeek: 0,
            averageStreak: 0
        };
    }

    const totalPoints = students.reduce((sum, s) => sum + s.weeklyPoints, 0);
    const activeThisWeek = students.filter(s => s.weeklyPoints > 0).length;
    const totalStreak = students.reduce((sum, s) => sum + s.currentStreak, 0);

    return {
        totalStudents: students.length,
        totalPoints,
        averagePoints: Math.round(totalPoints / students.length),
        activeThisWeek,
        averageStreak: Math.round(totalStreak / students.length)
    };
}
