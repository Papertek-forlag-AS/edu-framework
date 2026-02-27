export const PRONOUN_UNLOCK_LEVELS = {
    'ich': '1.1',
    'du': '1.1',
    'er/sie/es': '1.3',
    'wir': '1.3',
    'ihr': '2.1',
    'sie/Sie': '2.1'
};



export const LEKSJONS_REKKEFOLGE = [
    '1-1', '1-2', '1-3',
    '2-1', '2-2', '2-3',
    '3-1', '3-2', '3-3',
    '4-1', '4-2', '4-3',
    '5-1', '5-2', '5-3',
    '6-1', '6-2', '6-3',
    '7-1', '7-2', '7-3',
    '8-1', '8-2', '8-3',
    '9-1', '9-2', '9-3',
    '10-1', '10-2', '10-3',
    '11-1', '11-2', '11-3',
    '12-1', '12-2', '12-3',
    '13-1', '13-2', '13-3'
];

/**
 * Checks if a required lesson is "unlocked" based on the current lesson.
 * @param {string} currentLessonId F.eks. "1-3"
 * @param {string} requiredLessonId F.eks. "1.3"
 * @returns {boolean}
 */
export function isLessonUnlocked(currentLessonId, requiredLessonId) {
    if (!currentLessonId || !requiredLessonId) return false;

    const currentNormalized = currentLessonId.toString().replace('.', '-');
    const requiredNormalized = requiredLessonId.toString().replace('.', '-');

    const currentParts = currentNormalized.split('-');
    const requiredParts = requiredNormalized.split('-');

    const currentBook = currentParts.length > 2 ? currentParts[0] : 'tysk1';
    const requiredBook = requiredParts.length > 2 ? requiredParts[0] : 'tysk1';

    if (currentBook !== requiredBook) {
        return currentBook > requiredBook;
    }

    const currentChapter = parseInt(currentParts[currentParts.length - 2]);
    const currentLesson = parseInt(currentParts[currentParts.length - 1]);
    const requiredChapter = parseInt(requiredParts[requiredParts.length - 2]);
    const requiredLesson = parseInt(requiredParts[requiredParts.length - 1]);

    if (currentChapter > requiredChapter) return true;
    if (currentChapter === requiredChapter) return currentLesson >= requiredLesson;
    return false;
}