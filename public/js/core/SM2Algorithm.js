/**
 * SM2Algorithm.js
 * Direct port of iOS `SM2Algorithm` struct (VocabularyModels.swift)
 * 
 * Implements the SM-2 Spaced Repetition Algorithm with "Exposure Credit" extension.
 */

export const SM2Quality = {
    COMPLETE_BLACKOUT: 0,   // No recall
    INCORRECT: 1,           // Wrong answer, but recognized
    INCORRECT_EASY_RECALL: 2, // Wrong, but easy to recall correct
    CORRECT_DIFFICULT: 3,    // Correct with difficulty
    CORRECT_HESITATION: 4,   // Correct with hesitation
    PERFECT_RECALL: 5       // Perfect recall
};

export class SM2Algorithm {
    /**
     * Update word progress based on response quality
     * @param {Object} progress - Current word progress object
     * @param {number} quality - Response quality (0-5)
     * @returns {Object} Updated word progress
     */
    static update(progress, quality) {
        // Clone to avoid mutation
        const updated = { ...progress };
        const q = quality;

        // Update Ease Factor
        // Formula: ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        let newEase = progress.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
        updated.ease = Math.max(1.3, newEase);

        if (quality >= 3) {
            // Correct response
            if (progress.reps === 0) {
                updated.interval = 1;
            } else if (progress.reps === 1) {
                updated.interval = 6;
            } else {
                updated.interval = Math.floor(progress.interval * updated.ease);
            }
            updated.reps = progress.reps + 1;
        } else {
            // Incorrect response - reset
            updated.reps = 0;
            updated.interval = 1;
        }

        // Update Dates
        // Note: Dates are stored as YYYY-MM-DD
        const today = new Date();
        updated.lastSeen = today.toISOString().split('T')[0];

        // Calculate Next Review
        const nextReviewDate = new Date(today);
        nextReviewDate.setDate(today.getDate() + updated.interval);
        updated.nextReview = nextReviewDate.toISOString().split('T')[0];

        return updated;
    }

    /**
     * Record game exposure (lighter than full SM-2 update)
     * Games give "exposure credit" - update lastSeen and slightly reduce interval if correct
     * @param {Object} progress - Current word progress
     * @param {boolean} wasCorrect - Whether the answer was correct
     * @returns {Object} Updated word progress
     */
    static recordGameExposure(progress, wasCorrect) {
        const updated = { ...progress };
        const today = new Date();
        updated.lastSeen = today.toISOString().split('T')[0];

        if (wasCorrect) {
            // Exposure credit: reduce interval by 20% (word stays "fresher" longer)
            // interval = max(1, interval * 0.8)
            updated.interval = Math.max(1, Math.floor(progress.interval * 0.8));
        }
        // Incorrect in games: no penalty

        return updated;
    }
}
