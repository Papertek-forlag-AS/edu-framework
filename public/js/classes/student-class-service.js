/**
 * Student Class Service
 * Handles class joining/leaving operations for students in the ordtrener
 *
 * Cross-Platform Master Spec v3.3 - Aligned with iOS implementation
 *
 * Firestore Structure:
 * - classes/{classCode} - Class document with students array
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
 */
function _getCurrentMonday() {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
}

// =============================================================================
// CLASS LOOKUP
// =============================================================================

/**
 * Finds a class by its code
 * @param {string} code - The class code (e.g. "TR-92X")
 * @returns {Promise<Object|null>} The class data or null if not found
 */
export async function findClassByCode(code) {
    if (!code || code.length < 5) return null;

    const normalizedCode = code.toUpperCase().trim();
    const doc = await getFirestore().collection('classes').doc(normalizedCode).get();

    if (!doc.exists) return null;

    const data = doc.data();
    return {
        id: doc.id,
        code: data.code,
        name: data.name,
        teacherName: data.teacherName || 'Ukjent Lærer',
        memberCount: (data.students || []).length,
        joinPolicy: data.joinPolicy || 'open',
        allowNicknames: data.allowNicknames ?? false // Default to false (real names required)
    };
}

// =============================================================================
// JOIN/LEAVE CLASS
// =============================================================================

/**
 * Joins a class as a student
 * @param {string} classCode - The class code to join
 * @param {string} displayName - The student's display name for leaderboard
 * @param {Object} vocabService - Reference to VocabProfileService instance
 * @returns {Promise<Object>} Result with success status
 */
export async function joinClass(classCode, displayName, vocabService) {
    const user = getCurrentUser();
    if (!user) {
        throw new Error("Du må være logget inn for å bli med i en klasse");
    }

    const normalizedCode = classCode.toUpperCase().trim();

    // Verify class exists
    const classDoc = await getFirestore().collection('classes').doc(normalizedCode).get();
    if (!classDoc.exists) {
        throw new Error("Fant ingen klasse med denne koden");
    }

    const classData = classDoc.data();

    // Check if already a member
    if (classData.students?.includes(user.uid)) {
        throw new Error("Du er allerede medlem av denne klassen");
    }

    // Add student to class's students array with their real name for teacher visibility
    // Store as object with uid and realName so teacher can see actual identity
    const studentEntry = {
        uid: user.uid,
        realName: user.displayName || user.email || 'Ukjent',
        joinedAt: Date.now()
    };

    await getFirestore().collection('classes').doc(normalizedCode).update({
        students: firebase.firestore.FieldValue.arrayUnion(user.uid),
        // Store student details in a separate map for teacher reference
        [`studentDetails.${user.uid}`]: studentEntry
    });

    // Update local profile with classId and displayName
    if (!vocabService.profile.classIds) {
        vocabService.profile.classIds = [];
    }
    if (!vocabService.profile.classIds.includes(normalizedCode)) {
        vocabService.profile.classIds.push(normalizedCode);
    }

    // Set display name if provided
    if (displayName && displayName.trim()) {
        vocabService.profile.displayName = displayName.trim();
    }

    // Save profile (syncs to cloud)
    await vocabService.saveProfile();

    return {
        success: true,
        className: classData.name,
        classCode: normalizedCode
    };
}

/**
 * Leaves a class
 * @param {string} classCode - The class code to leave
 * @param {Object} vocabService - Reference to VocabProfileService instance
 * @returns {Promise<Object>} Result with success status
 */
export async function leaveClass(classCode, vocabService) {
    const user = getCurrentUser();
    if (!user) {
        throw new Error("Du må være logget inn");
    }

    const normalizedCode = classCode.toUpperCase().trim();

    // Remove student from class's students array
    try {
        await getFirestore().collection('classes').doc(normalizedCode).update({
            students: firebase.firestore.FieldValue.arrayRemove(user.uid)
        });
    } catch (e) {
        console.warn("Could not update class document:", e);
        // Continue anyway - class might have been deleted
    }

    // Remove classId from local profile
    if (vocabService.profile.classIds) {
        vocabService.profile.classIds = vocabService.profile.classIds.filter(
            id => id !== normalizedCode
        );
    }

    // Save profile (syncs to cloud)
    await vocabService.saveProfile();

    return { success: true };
}

// =============================================================================
// GET STUDENT'S CLASSES
// =============================================================================

/**
 * Gets all classes the current student is a member of
 * @param {Object} vocabService - Reference to VocabProfileService instance
 * @returns {Promise<Array>} List of class membership objects
 */
export async function getStudentClasses(vocabService) {
    const user = getCurrentUser();
    if (!user) return [];

    const classIds = vocabService.profile.classIds || [];
    if (classIds.length === 0) return [];

    const classes = [];

    for (const classCode of classIds) {
        try {
            const doc = await getFirestore().collection('classes').doc(classCode).get();
            if (doc.exists) {
                const data = doc.data();
                classes.push({
                    code: data.code,
                    name: data.name,
                    teacherName: data.teacherName || 'Ukjent Lærer',
                    memberCount: (data.students || []).length
                });
            }
        } catch (e) {
            console.warn(`Could not fetch class ${classCode}:`, e);
        }
    }

    return classes;
}

/**
 * Gets the student's display name
 * @param {Object} vocabService - Reference to VocabProfileService instance
 * @returns {string} The display name or empty string
 */
export function getDisplayName(vocabService) {
    return vocabService.profile.displayName || '';
}

/**
 * Updates the student's display name
 * @param {string} displayName - The new display name
 * @param {Object} vocabService - Reference to VocabProfileService instance
 */
export async function setDisplayName(displayName, vocabService) {
    vocabService.profile.displayName = displayName.trim();
    await vocabService.saveProfile();
}

// =============================================================================
// CLASS LEADERBOARD (for students)
// =============================================================================

/**
 * Gets the leaderboard for a class (student-facing view)
 * Students see display names only, not real names
 * @param {string} classCode - The class code
 * @returns {Promise<Array>} Sorted array of student rankings
 */
export async function getClassLeaderboard(classCode) {
    const user = getCurrentUser();
    if (!user) return [];

    try {
        // Get the class document
        const classDoc = await getFirestore().collection('classes').doc(classCode).get();
        if (!classDoc.exists) {
            console.warn("Class not found:", classCode);
            return [];
        }

        const classData = classDoc.data();
        const studentUids = classData.students || [];
        const studentDetails = classData.studentDetails || {};

        if (studentUids.length === 0) {
            return [];
        }

        // Fetch all student profiles
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
                    // Use displayName from profile, fall back to realName from studentDetails, then 'Anonym Elev'
                    const studentDetail = studentDetails[uid];
                    const displayName = data.displayName || studentDetail?.realName || 'Anonym Elev';

                    // Check if weeklyPoints belong to the current week
                    const currentWeek = data.weekStartDate === _getCurrentMonday();

                    students.push({
                        uid,
                        displayName,
                        weeklyPoints: currentWeek ? (data.weeklyPoints || 0) : 0,
                        currentStreak: data.currentStreak || 0,
                        isCurrentUser: uid === user.uid
                    });
                }
            } catch (err) {
                console.warn(`Failed to fetch profile for ${uid}:`, err);
            }
        }

        // Sort by weekly points descending
        students.sort((a, b) => b.weeklyPoints - a.weeklyPoints);

        // Add rank
        return students.map((s, index) => ({
            ...s,
            rank: index + 1
        }));

    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        return [];
    }
}
