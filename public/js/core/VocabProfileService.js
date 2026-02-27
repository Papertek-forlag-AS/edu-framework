// Use firebase-client.js for auth - this is the same source FEIDE login uses
// Previously used AuthManager.js which had a separate currentUser tracking
import { getCurrentUser, firestore, isAuthAvailable } from '../auth/firebase-client.js';
import { SM2Algorithm, SM2Quality } from './SM2Algorithm.js';

const COLLECTION_PATH = 'vocabData';
const DOC_PATH = 'profile';
const CURRENT_SCHEMA_VERSION = 1;
const LOCAL_STORAGE_KEY = 'vocabProfile'; // Enables offline/cross-page sync

// Word ID Suffix Migration (Norwegian → English)
// Matches iOS: shared/ios-core/Services/VocabProfileService.swift
const SUFFIX_MIGRATION_MAP = {
    '_substantiv': '_noun',
    '_adjektiv': '_adj',
    '_tallord': '_num',
    '_verbfrase': '_verbphrase',
    '_modalverb': '_modal',
    '_preposisjon': '_prep',
    '_adverb': '_adv',
    '_konjunksjon': '_conj',
    '_pronomen': '_pron',
    '_uttrykk': '_phrase',
    '_fast': '_phrase'  // "fast uttrykk" (fixed expression) → phrase
};

// Umlaut Encoding Migration (underscore → ae/oe/ue)
// Example: k_se_noun → kaese_noun, gr_n_adj → gruen_adj
// Matches iOS: shared/ios-core/Services/VocabProfileService.swift
const UMLAUT_ENCODING_MAP = {
    // Nouns
    'fu_ball_noun': 'fussball_noun',
    'caf__noun': 'cafe_noun',
    'k_se_noun': 'kaese_noun',
    'gem_se_noun': 'gemuese_noun',
    'pr_fung_noun': 'pruefung_noun',
    'br_tchen_noun': 'broetchen_noun',
    'spa__noun': 'spass_noun',
    'fr_hling_noun': 'fruehling_noun',
    'fr_hst_ck_noun': 'fruehstueck_noun',
    'gef_hl_noun': 'gefuehl_noun',
    'l_we_noun': 'loewe_noun',
    'b_r_noun': 'baer_noun',
    'm_sli_noun': 'muesli_noun',
    'zahnb_rste_noun': 'zahnbuerste_noun',
    'getr_nk_noun': 'getraenk_noun',
    'gr__e_noun': 'groesse_noun',
    't_r_noun': 'tuer_noun',
    'j_ger_noun': 'jaeger_noun',
    'j_gerin_noun': 'jaegerin_noun',
    'k_fig_noun': 'kaefig_noun',
    'schildkr_te_noun': 'schildkroete_noun',
    'sch_ler_noun': 'schueler_noun',
    'sch_lerin_noun': 'schuelerin_noun',
    'mitsch_ler_noun': 'mitschueler_noun',
    'mitsch_lerin_noun': 'mitschuelerin_noun',
    'm_rz_noun': 'maerz_noun',
    // Adjectives
    'sch_n_adj': 'schoen_adj',
    'gr_n_adj': 'gruen_adj',
    'wei__adj': 'weiss_adj',
    'gro__adj': 'gross_adj',
    'm_de_adj': 'muede_adj',
    's___adj': 'suess_adj',
    'bl_d_adj': 'bloed_adj',
    'popul_r_adj': 'populaer_adj',
    'gem_tlich_adj': 'gemuetlich_adj',
    'gl_cklich_adj': 'gluecklich_adj',
    'ersch_pft_adj': 'erschoepft_adj',
    'nerv_s_adj': 'nervoes_adj',
    'k_hl_adj': 'kuehl_adj',
    'hei__adj': 'heiss_adj',
    'gef_hrlich_adj': 'gefaehrlich_adj'
};

/**
 * Migrate a single word ID from Norwegian suffix to English suffix
 * @param {string} wordId - Word ID to migrate
 * @returns {string} - Migrated word ID (or original if no migration needed)
 */
function migrateWordIdSuffix(wordId) {
    for (const [oldSuffix, newSuffix] of Object.entries(SUFFIX_MIGRATION_MAP)) {
        if (wordId.endsWith(oldSuffix)) {
            return wordId.slice(0, -oldSuffix.length) + newSuffix;
        }
    }
    return wordId;
}

/**
 * Migrate a single word ID from underscore umlaut encoding to ae/oe/ue encoding
 * @param {string} wordId - Word ID to migrate
 * @returns {string} - Migrated word ID (or original if no migration needed)
 */
function migrateUmlautEncoding(wordId) {
    return UMLAUT_ENCODING_MAP[wordId] || wordId;
}

/**
 * VocabProfileService
 * The "Big Blob" Manager - Fully Aligned with iOS V3.7 Spec
 */
export class VocabProfileService {
    constructor() {
        this.profile = this._loadFromLocalStorage() || this._createEmptyProfile();
        this._wordIdMigrationDone = false;
        this._umlautEncodingMigrationDone = false;
        this._saveTimeout = null; // Debounce timer for Firestore saves
        this._dirtyFields = new Set(); // Track changed fields for incremental writes
        this._cloudWeeklySnapshot = null; // Set during loadProfile for offline excess detection

        // Flush pending saves when user leaves/hides the tab
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.flushSave();
            }
        });
    }

    // --- LocalStorage Support ---

    _loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                console.log('[VocabProfileService] Loaded profile from localStorage');
                return parsed;
            }
        } catch (e) {
            console.warn('[VocabProfileService] Failed to load from localStorage:', e);
        }
        return null;
    }

    _saveToLocalStorage() {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.profile));
        } catch (e) {
            console.warn('[VocabProfileService] Failed to save to localStorage:', e);
        }
    }

    get db() {
        // Ensure Firebase is initialized before accessing firestore
        isAuthAvailable();
        if (!firestore) console.warn("[VocabProfileService] db getter returned null");
        return firestore;
    }

    // --- Profile Management ---

    _createEmptyProfile() {
        const today = new Date().toISOString().split('T')[0];
        const monday = this._getMonday(new Date()).toISOString().split('T')[0];

        return {
            schemaVersion: CURRENT_SCHEMA_VERSION,
            lastUpdated: Date.now(),
            lastDevice: navigator.userAgent,

            // Class & Unlocks
            classIds: [],
            // Unlocks stores PASSED chapter tests, not unlocked chapters
            // Empty by default - chapter 1 is always unlocked via isChapterUnlockedForTraining()
            unlocks: {},

            // Selected Chapters for Training (synced across devices)
            selectedChapters: {},  // {"tysk1-vg1": [1, 2, 3]}

            // Global Stats
            totalPoints: 0,
            dailyPointsEarned: 0,
            lastTrainingDate: null,

            // Weekly Stats
            weeklyPoints: 0,
            weeklyConsistencyScore: 0,
            weekStartDate: monday,
            dailyPointsHistory: {}, // { "YYYY-MM-DD": points }

            // Streak
            currentStreak: 0,
            longestStreak: 0,
            hviledagerUsedThisWeek: 0,
            streakBadges: {
                ukeMester: 0,
                toUkersChampion: 0,
                manedsMaestro: 0,
                hundredagersStrekken: 0,
                arsMester: 0,
                currentStreakMilestonesAwarded: []
            },

            // Vocabulary (SM-2)
            words: {},

            // Language-specific points (for leaderboard filtering)
            // Dynamically generated from SUPPORTED_LANGUAGES
            languagePoints: this._createEmptyLanguagePoints(),

            // Logs
            trainingDays: [],
            reviewLog: [],
            chapterTests: []
        };
    }

    // --- Language Points Configuration ---

    /**
     * Supported target languages for point tracking
     * Add new languages here - they will be automatically initialized
     * Note: Points are tied to TARGET language, not native/interface language
     */
    static SUPPORTED_LANGUAGES = ['german', 'spanish', 'french'];

    /**
     * Create empty language points structure for all supported languages
     * Used by _createEmptyProfile
     * @returns {Object} - Language points object with { langCode: { total: 0, weekly: 0 } }
     */
    _createEmptyLanguagePoints() {
        const points = {};
        for (const lang of VocabProfileService.SUPPORTED_LANGUAGES) {
            points[lang] = { total: 0, weekly: 0 };
        }
        return points;
    }

    // --- Language Points Initialization ---

    /**
     * Initialize language points structure if missing
     * Called on profile load to ensure backward compatibility
     * Automatically adds any new languages from SUPPORTED_LANGUAGES
     */
    _initializeLanguagePoints() {
        if (!this.profile.languagePoints) {
            this.profile.languagePoints = {};
        }
        // Ensure all supported languages exist
        for (const lang of VocabProfileService.SUPPORTED_LANGUAGES) {
            if (!this.profile.languagePoints[lang]) {
                this.profile.languagePoints[lang] = { total: 0, weekly: 0 };
            }
        }
    }

    /**
     * Get points for a specific language
     * @param {string} language - 'german', 'spanish', or 'all'
     * @returns {{total: number, weekly: number}} - Points object
     */
    getLanguagePoints(language) {
        this._initializeLanguagePoints();

        if (language === 'all' || !language) {
            return {
                total: this.profile.totalPoints || 0,
                weekly: this.profile.weeklyPoints || 0
            };
        }

        return this.profile.languagePoints[language] || { total: 0, weekly: 0 };
    }

    // --- Core Logic: Load & Merge ---

    async loadProfile() {
        // Flush any pending debounced saves before reading from Firestore
        // to prevent reading stale data that would overwrite recent changes
        await this.flushSave();

        const user = getCurrentUser();
        console.log('[VocabProfileService] loadProfile called, user:', user ? user.uid : 'none');
        console.log('[VocabProfileService] Current profile unlocks BEFORE load:', JSON.stringify(this.profile.unlocks));

        if (!user) {
            console.log('[VocabProfileService] No user, returning localStorage profile');
            return this.profile;
        }

        try {
            const docRef = this.db.collection('users').doc(user.uid).collection(COLLECTION_PATH).doc(DOC_PATH);
            const doc = await docRef.get();

            if (doc.exists) {
                const cloudProfile = doc.data();
                console.log('[VocabProfileService] Cloud profile unlocks:', JSON.stringify(cloudProfile.unlocks));

                // Schema Check (V3.7 Spec)
                if (cloudProfile.schemaVersion > CURRENT_SCHEMA_VERSION) {
                    console.warn(`Cloud schema (${cloudProfile.schemaVersion}) is newer than app schema (${CURRENT_SCHEMA_VERSION}). Read-only mode.`);
                    // Ideally show UI alert here
                    return cloudProfile;
                }

                // Merge (Cloud Wins Logic)
                // Save cloud weekly state before merge so _checkWeeklyReset can
                // determine synced vs offline points (offline excess carries forward)
                this._cloudWeeklySnapshot = {
                    weekStartDate: cloudProfile.weekStartDate,
                    weeklyPoints: cloudProfile.weeklyPoints || 0,
                    languagePoints: cloudProfile.languagePoints || {},
                    weeklyPointsHistory: cloudProfile.weeklyPointsHistory || {}
                };
                this._mergeProfiles(cloudProfile);
                console.log('[VocabProfileService] Profile unlocks AFTER merge:', JSON.stringify(this.profile.unlocks));

                // Run reset checks BEFORE saving so new weekStartDate gets persisted
                this._checkDailyReset();
                this._checkWeeklyReset();

                // Sync merged profile back to localStorage AND Firestore
                // This ensures local progress (points, unlocks) that may have been earned
                // while offline or before auth confirmed is uploaded to cloud
                await this.saveProfile();
            } else {
                // Initialize new user - run reset checks and upload localStorage profile to cloud
                console.log('[VocabProfileService] No cloud profile exists, saving localStorage profile to cloud');
                this._checkDailyReset();
                this._checkWeeklyReset();
                await this.saveProfile();
            }
        } catch (e) {
            console.error('Failed to load profile from cloud, using localStorage:', e);
            // localStorage profile is already loaded in constructor, so we continue with that
            // Still run reset checks for offline scenario
            this._checkDailyReset();
            this._checkWeeklyReset();
        }

        // Trim old history data to keep document size bounded
        // (reviewLog/trainingDays: 28 days, dailyPointsHistory: 365 days)
        this._trimHistory();

        // Initialize language points if missing (backward compatibility)
        this._initializeLanguagePoints();

        // Migrate word IDs from Norwegian to English suffixes (one-time)
        await this._migrateWordIdSuffixes();

        // Migrate umlaut encoding from underscore to ae/oe/ue (one-time)
        await this._migrateUmlautEncoding();

        // Migrate old "1.1" default unlocks that weren't actual passed tests
        this._migrateOldUnlockDefaults();

        console.log('[VocabProfileService] Final profile unlocks:', JSON.stringify(this.profile.unlocks));
        return this.profile;
    }

    /**
     * Migration: Remove "1.1" from unlocks if it was just the old default (not an actual passed test)
     * Old behavior: unlocks: {"tysk1-vg1": ["1.1"]} was the default for new users
     * New behavior: unlocks: {} is the default (chapter 1 always unlocked via code logic)
     *
     * This migration checks if "1.1" is present without a corresponding chapter test record,
     * which indicates it was just the old default, not an actual passed test.
     */
    _migrateOldUnlockDefaults() {
        const chapterTests = this.profile.chapterTests || [];
        let migrated = false;

        for (const [curriculum, chapters] of Object.entries(this.profile.unlocks || {})) {
            if (!Array.isArray(chapters)) continue;

            // Check if "1.1" or "1" is in unlocks
            const hasLegacy1_1 = chapters.includes("1.1") || chapters.includes("1");
            if (!hasLegacy1_1) continue;

            // Check if there's an actual chapter 1 test passed for this curriculum
            const hasChapter1Test = chapterTests.some(test =>
                test.curriculum === curriculum &&
                test.chapters?.includes(1) &&
                test.percentage >= 80
            );

            if (!hasChapter1Test) {
                // Remove "1.1" and "1" - they were just old defaults
                this.profile.unlocks[curriculum] = chapters.filter(c => c !== "1.1" && c !== "1");
                console.log(`[Migration] Removed old "1.1" default from ${curriculum} unlocks (no chapter 1 test found)`);
                migrated = true;
            }
        }

        if (migrated) {
            // Save the migrated profile
            this.saveProfile();
        }
    }

    async saveProfile() {
        this.profile.lastUpdated = Date.now();
        this.profile.lastDevice = navigator.userAgent;

        // Always save to localStorage first (works offline and without login)
        this._saveToLocalStorage();

        // Write to Firestore immediately
        await this._writeToFirestore();
    }

    /**
     * Save profile with debounced Firestore write.
     * Saves to localStorage immediately but batches Firestore writes
     * to prevent race conditions from rapid successive saves (e.g., during tests).
     */
    saveProfileDebounced() {
        this.profile.lastUpdated = Date.now();
        this.profile.lastDevice = navigator.userAgent;

        // Always save to localStorage immediately
        this._saveToLocalStorage();

        // Debounce Firestore write (2 seconds) to batch rapid saves
        if (this._saveTimeout) {
            clearTimeout(this._saveTimeout);
        }
        this._saveTimeout = setTimeout(() => {
            this._saveTimeout = null;
            this._writeToFirestoreIncremental();
        }, 2000);
    }

    /**
     * Flush any pending debounced save immediately.
     * Call before loadProfile() or when leaving a training session.
     */
    async flushSave() {
        if (this._saveTimeout) {
            clearTimeout(this._saveTimeout);
            this._saveTimeout = null;
            await this._writeToFirestoreIncremental();
        }
    }

    async _writeToFirestore() {
        const user = getCurrentUser();
        if (!user) {
            return;
        }

        const db = this.db;
        if (!db) {
            return;
        }

        try {
            const docRef = db.collection('users').doc(user.uid).collection(COLLECTION_PATH).doc(DOC_PATH);
            await docRef.set(this.profile);

            // Update leaderboard cache for each class the student belongs to
            this._updateLeaderboardCache(db, user.uid);
        } catch (e) {
            console.error('[VocabProfileService] ❌ Failed to save profile to cloud:', e);
        }
    }

    /**
     * Write only changed fields to Firestore instead of the full profile blob.
     * Used by saveProfileDebounced() to reduce write bandwidth during training.
     * Falls back to full set() if too many words changed or on first write.
     */
    async _writeToFirestoreIncremental() {
        const user = getCurrentUser();
        if (!user) return;

        const db = this.db;
        if (!db) return;

        const dirtyWords = this._dirtyFields;
        this._dirtyFields = new Set(); // Reset before async write

        try {
            const docRef = db.collection('users').doc(user.uid).collection(COLLECTION_PATH).doc(DOC_PATH);

            // If too many words changed (e.g., bulk import) or no dirty tracking, do full write
            if (dirtyWords.size > 50 || dirtyWords.size === 0) {
                await docRef.set(this.profile);
            } else {
                // Build incremental update with only changed fields
                const updateData = {
                    // Stats fields (small, always include)
                    lastUpdated: this.profile.lastUpdated,
                    lastDevice: this.profile.lastDevice,
                    totalPoints: this.profile.totalPoints,
                    dailyPointsEarned: this.profile.dailyPointsEarned,
                    weeklyPoints: this.profile.weeklyPoints,
                    languagePoints: this.profile.languagePoints,
                    currentStreak: this.profile.currentStreak,
                    longestStreak: this.profile.longestStreak,
                    lastTrainingDate: this.profile.lastTrainingDate,
                    dailyPointsHistory: this.profile.dailyPointsHistory,
                    trainingDays: this.profile.trainingDays,
                    weeklyConsistencyScore: this.profile.weeklyConsistencyScore,
                    hviledagerUsedThisWeek: this.profile.hviledagerUsedThisWeek,
                    weeklyPointsHistory: this.profile.weeklyPointsHistory || {},
                    weekStartDate: this.profile.weekStartDate,
                    streakBadges: this.profile.streakBadges
                };

                // Add only changed words using dot notation
                for (const wordId of dirtyWords) {
                    if (this.profile.words[wordId]) {
                        updateData[`words.${wordId}`] = this.profile.words[wordId];
                    }
                }

                await docRef.update(updateData);
            }

            // Update leaderboard cache
            this._updateLeaderboardCache(db, user.uid);
        } catch (e) {
            if (e.code === 'not-found') {
                // Document doesn't exist yet, fall back to full set()
                try {
                    const docRef = db.collection('users').doc(user.uid).collection(COLLECTION_PATH).doc(DOC_PATH);
                    await docRef.set(this.profile);
                    this._updateLeaderboardCache(db, user.uid);
                } catch (setErr) {
                    console.error('[VocabProfileService] ❌ Failed to create profile in cloud:', setErr);
                }
            } else {
                console.error('[VocabProfileService] ❌ Failed incremental save to cloud:', e);
                // On error, add dirty words back for next attempt
                for (const wordId of dirtyWords) {
                    this._dirtyFields.add(wordId);
                }
            }
        }
    }

    /**
     * Write lightweight leaderboard entries for all classes the student belongs to.
     * Teachers read this collection instead of individual profiles (1 read vs N reads).
     * Fire-and-forget: errors here don't block the main save.
     */
    _updateLeaderboardCache(db, uid) {
        const classIds = this.profile.classIds;
        if (!classIds || classIds.length === 0) return;

        // Initialize language points if needed
        this._initializeLanguagePoints();

        const entry = {
            displayName: this.profile.displayName || 'Anonym Elev',
            weeklyPoints: this.profile.weeklyPoints || 0,
            totalPoints: this.profile.totalPoints || 0,
            currentStreak: this.profile.currentStreak || 0,
            languagePoints: this.profile.languagePoints || {},
            weekStartDate: this.profile.weekStartDate || null,
            weeklyPointsHistory: this.profile.weeklyPointsHistory || {},
            lastUpdated: Date.now()
        };

        for (const classCode of classIds) {
            db.collection('classes').doc(classCode)
                .collection('leaderboard').doc(uid)
                .set(entry)
                .catch(e => console.warn(`[VocabProfileService] Leaderboard cache update failed for ${classCode}:`, e));
        }
    }

    /**
     * V3.7 Spec: Timestamp-Based Conflict Resolution
     * Matches iOS: shared/ios-core/Services/VocabProfileService.swift
     */
    _mergeProfiles(cloud) {
        const local = this.profile;
        const cloudIsNewer = cloud.lastUpdated > local.lastUpdated;

        console.log(`☁️ Merging. Cloud Newer: ${cloudIsNewer}`);
        console.log(`☁️ Local streak: ${local.currentStreak}, lastTraining: ${local.lastTrainingDate}`);
        console.log(`☁️ Cloud streak: ${cloud.currentStreak}, lastTraining: ${cloud.lastTrainingDate}`);

        // 1. Scalar Fields: Use newer OR higher for streak-related fields
        // Streak is special: if cloud has higher streak with more recent lastTrainingDate, use cloud
        const cloudLastTraining = cloud.lastTrainingDate || '';
        const localLastTraining = local.lastTrainingDate || '';
        const cloudHasNewerTraining = cloudLastTraining > localLastTraining;

        if (cloudIsNewer || cloudHasNewerTraining) {
            // Use cloud's streak data if cloud is newer OR has more recent training
            if ((cloud.currentStreak || 0) > (local.currentStreak || 0) || cloudHasNewerTraining) {
                console.log(`☁️ Using cloud streak: ${cloud.currentStreak}, lastTraining: ${cloud.lastTrainingDate}`);
                local.currentStreak = cloud.currentStreak || 0;
                local.lastTrainingDate = cloud.lastTrainingDate;
                local.hviledagerUsedThisWeek = cloud.hviledagerUsedThisWeek || 0;
            }
        }
        console.log(`☁️ Final streak after merge: ${local.currentStreak}, lastTraining: ${local.lastTrainingDate}`);

        // Daily points: use cloud if it's for the same day, otherwise reset check will handle it
        if (cloudIsNewer) {
            local.dailyPointsEarned = cloud.dailyPointsEarned;
        }

        // 2. Max Fields (Can only increase)
        local.longestStreak = Math.max(local.longestStreak || 0, cloud.longestStreak || 0);
        local.totalPoints = Math.max(local.totalPoints || 0, cloud.totalPoints || 0);

        // 3. Weekly Stats (Complex Logic)
        if (cloud.weekStartDate === local.weekStartDate) {
            // Same week -> Maximize
            local.weeklyPoints = Math.max(local.weeklyPoints, cloud.weeklyPoints || 0);
            local.weeklyConsistencyScore = Math.max(local.weeklyConsistencyScore, cloud.weeklyConsistencyScore || 0);
        } else if (cloudIsNewer && cloud.weekStartDate) {
            // Cloud has newer week (multi-device: other device already reset)
            // Cloud's weeklyPointsHistory already has the finalized archive for the old week.
            // Carry forward any offline excess to the new week instead of archiving to old week.
            const cloudArchive = (cloud.weeklyPointsHistory || {})[local.weekStartDate];
            const syncedPoints = cloudArchive ? (cloudArchive.points || 0) : (local.weeklyPoints || 0);
            const offlineExcess = Math.max(0, (local.weeklyPoints || 0) - syncedPoints);

            local.weekStartDate = cloud.weekStartDate;
            local.weeklyPoints = (cloud.weeklyPoints || 0) + offlineExcess;
            local.weeklyConsistencyScore = cloud.weeklyConsistencyScore;
        }

        // 3b. Language-Specific Points (Max for total, same-week logic for weekly)
        // Uses SUPPORTED_LANGUAGES for future-proofing (adding new languages)
        if (!local.languagePoints) {
            local.languagePoints = this._createEmptyLanguagePoints();
        }
        const cloudLangPoints = cloud.languagePoints || {};
        for (const lang of VocabProfileService.SUPPORTED_LANGUAGES) {
            if (!local.languagePoints[lang]) {
                local.languagePoints[lang] = { total: 0, weekly: 0 };
            }
            const cloudLang = cloudLangPoints[lang] || { total: 0, weekly: 0 };

            // Total: Max (can only increase)
            local.languagePoints[lang].total = Math.max(
                local.languagePoints[lang].total || 0,
                cloudLang.total || 0
            );

            // Weekly: Same logic as global weeklyPoints
            if (cloud.weekStartDate === local.weekStartDate) {
                local.languagePoints[lang].weekly = Math.max(
                    local.languagePoints[lang].weekly || 0,
                    cloudLang.weekly || 0
                );
            } else if (cloudIsNewer && cloud.weekStartDate) {
                // Carry forward offline excess per language
                const cloudLangArchive = (cloud.weeklyPointsHistory || {})[local.weekStartDate];
                const syncedLangPts = cloudLangArchive?.languagePoints?.[lang]?.weekly || 0;
                const langExcess = Math.max(0, (local.languagePoints[lang].weekly || 0) - syncedLangPts);
                local.languagePoints[lang].weekly = (cloudLang.weekly || 0) + langExcess;
            }
        }

        // 4. Per-Word Merge (LastSeen Wins)
        if (!local.words) local.words = {};
        for (const [key, cloudWord] of Object.entries(cloud.words || {})) {
            const localWord = local.words[key];
            if (!localWord) {
                // New word from cloud
                local.words[key] = cloudWord;
            } else {
                // Conflict: Compare timestamps
                if (cloudWord.lastSeen > localWord.lastSeen) {
                    local.words[key] = cloudWord;
                }
            }
        }

        // 5. Unlocks (Union)
        // Unlocks store PASSED chapter tests, not unlocked chapters
        // Empty array = no tests passed = only chapter 1 unlocked (via isChapterUnlockedForTraining logic)
        for (const [curriculum, chapters] of Object.entries(cloud.unlocks || {})) {
            let key = curriculum;
            // Migration: vg1-tysk1 -> tysk1-vg1
            if (key === 'vg1-tysk1') key = 'tysk1-vg1';

            if (!local.unlocks[key]) {
                // Use cloud's chapters directly (can be empty)
                local.unlocks[key] = chapters;
            } else {
                // Merge unique
                const set = new Set([...local.unlocks[key], ...chapters]);
                local.unlocks[key] = Array.from(set);
            }
        }
        console.log('[VocabProfileService] Unlocks after merge:', JSON.stringify(local.unlocks));

        // 5b. Selected Chapters (Newer wins, since this is a user preference)
        if (!local.selectedChapters) local.selectedChapters = {};
        const cloudSelectedChapters = cloud.selectedChapters || {};

        if (cloudIsNewer && Object.keys(cloudSelectedChapters).length > 0) {
            // Cloud is newer and has selected chapters - use cloud's selection
            local.selectedChapters = cloudSelectedChapters;
            console.log('☁️ Selected chapters updated from cloud');
        } else if (Object.keys(local.selectedChapters).length === 0 && Object.keys(cloudSelectedChapters).length > 0) {
            // Local has no selection, use cloud's
            local.selectedChapters = cloudSelectedChapters;
            console.log('☁️ Selected chapters loaded from cloud (local was empty)');
        }

        // 6. Chapter Tests (Merge unique by timestamp + chapter)
        const localTests = local.chapterTests || [];
        const cloudTests = cloud.chapterTests || [];

        // Create a map to deduplicate: key = "timestamp_chapter"
        const uniqueTests = new Map();

        // Helper to add tests to map
        const addTests = (tests) => {
            tests.forEach(t => {
                // Robust key generation
                const chapter = t.chapters ? t.chapters[0] : 'unknown';
                const ts = t.timestamp || '0';
                const key = `${ts}_${chapter}`;
                if (!uniqueTests.has(key)) {
                    uniqueTests.set(key, t);
                }
            });
        };

        addTests(localTests);
        addTests(cloudTests);

        // Sort by timestamp descending (newest first)
        local.chapterTests = Array.from(uniqueTests.values())
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));


        // 7. History (Merge Max)
        if (!local.dailyPointsHistory) local.dailyPointsHistory = {};
        for (const [date, points] of Object.entries(cloud.dailyPointsHistory || {})) {
            local.dailyPointsHistory[date] = Math.max(local.dailyPointsHistory[date] || 0, points);
        }

        // 8. Weekly Points History (Merge: keep highest points per week, prune to 4)
        if (!local.weeklyPointsHistory) local.weeklyPointsHistory = {};
        for (const [week, entry] of Object.entries(cloud.weeklyPointsHistory || {})) {
            if (!local.weeklyPointsHistory[week] || (entry.points || 0) > (local.weeklyPointsHistory[week].points || 0)) {
                local.weeklyPointsHistory[week] = entry;
            }
        }
        const histWeeks = Object.keys(local.weeklyPointsHistory).sort().reverse();
        for (const old of histWeeks.slice(4)) {
            delete local.weeklyPointsHistory[old];
        }

        this.profile = local;
    }

    // --- Points Management ---

    /**
     * Add points to the user's profile
     * @param {number} amount - Number of points to add
     * @param {string|null} language - Language for points: 'german', 'spanish', or null for global only
     */
    addPoints(amount, language = null) {
        if (!amount || amount <= 0) return;

        console.log(`[VocabProfileService] addPoints called: amount=${amount}, language=${language}`);

        // Initialize language points if needed
        this._initializeLanguagePoints();

        const today = this._getLocalDate();
        const dailyGoal = 20;
        const previousDailyPoints = this.profile.dailyPointsEarned || 0;

        // Update language-specific points (if language provided)
        if (language && this.profile.languagePoints[language]) {
            this.profile.languagePoints[language].total += amount;
            this.profile.languagePoints[language].weekly += amount;
            console.log(`[VocabProfile] Added ${amount} points to ${language}: total=${this.profile.languagePoints[language].total}, weekly=${this.profile.languagePoints[language].weekly}`);
        }

        // Update global totals (always)
        this.profile.totalPoints = (this.profile.totalPoints || 0) + amount;
        this.profile.dailyPointsEarned = (this.profile.dailyPointsEarned || 0) + amount;
        this.profile.weeklyPoints = (this.profile.weeklyPoints || 0) + amount;

        // Update History (global - for streak)
        if (!this.profile.dailyPointsHistory) this.profile.dailyPointsHistory = {};
        this.profile.dailyPointsHistory[today] = (this.profile.dailyPointsHistory[today] || 0) + amount;

        // Auto-update streak when daily goal is crossed
        // Only trigger when we cross the threshold (not if already above)
        if (previousDailyPoints < dailyGoal && this.profile.dailyPointsEarned >= dailyGoal) {
            this.updateStreak();

            // Track training day ONLY when daily goal is reached (for calendar display)
            // This ensures "dager trent" matches streak logic (20+ points = trained day)
            if (!this.profile.trainingDays) this.profile.trainingDays = [];
            if (!this.profile.trainingDays.includes(today)) {
                this.profile.trainingDays.push(today);
            }
        }

        // Use debounced save to prevent race conditions from rapid successive
        // addPoints calls (e.g., during tests where every answer triggers a save)
        this.saveProfileDebounced();
    }

    // --- Resets ---

    _checkDailyReset() {
        const today = this._getLocalDate();
        const pointsHistoryToday = this.profile.dailyPointsHistory ? (this.profile.dailyPointsHistory[today] || 0) : 0;

        // Only reset if it matches a new day (last training was not today AND no points recorded for today yet)
        if (this.profile.lastTrainingDate !== today && pointsHistoryToday === 0) {
            this.profile.dailyPointsEarned = 0;
            // Note: We don't save here, wait for first action
        } else if (pointsHistoryToday > 0) {
            // Ensure dailyPointsEarned is in sync with history if points exist for today
            this.profile.dailyPointsEarned = pointsHistoryToday;
        }
    }

    _checkWeeklyReset() {
        const monday = this._getMonday(new Date()).toISOString().split('T')[0];
        if (this.profile.weekStartDate !== monday) {
            const cloud = this._cloudWeeklySnapshot;
            const sameWeekAsCloud = cloud && cloud.weekStartDate === this.profile.weekStartDate;

            // Archive only the cloud-synced portion (what was visible to others)
            // Any offline excess carries forward to the new week
            const syncedPoints = sameWeekAsCloud ? cloud.weeklyPoints : (this.profile.weeklyPoints || 0);
            const offlineExcess = sameWeekAsCloud
                ? Math.max(0, (this.profile.weeklyPoints || 0) - syncedPoints)
                : 0;

            this._archiveWeeklyPoints(this.profile.weekStartDate, syncedPoints, sameWeekAsCloud ? cloud.languagePoints : this.profile.languagePoints);

            this.profile.weekStartDate = monday;

            // Reset global weekly stats, carrying forward offline excess
            this.profile.weeklyPoints = offlineExcess;
            this.profile.weeklyConsistencyScore = 0;
            this.profile.hviledagerUsedThisWeek = 0;

            // Reset language-specific weekly points, carrying forward offline excess
            if (this.profile.languagePoints) {
                for (const lang of Object.keys(this.profile.languagePoints)) {
                    if (sameWeekAsCloud) {
                        const cloudLangWeekly = cloud.languagePoints?.[lang]?.weekly || 0;
                        const langExcess = Math.max(0, (this.profile.languagePoints[lang].weekly || 0) - cloudLangWeekly);
                        this.profile.languagePoints[lang].weekly = langExcess;
                    } else {
                        this.profile.languagePoints[lang].weekly = 0;
                    }
                }
            }

            // Clean up snapshot
            this._cloudWeeklySnapshot = null;
        }
    }

    /**
     * Archive a week's points into weeklyPointsHistory.
     * Keeps only the last 4 weeks. Skips if weekStartDate is falsy or points are 0.
     */
    _archiveWeeklyPoints(weekStartDate, weeklyPoints, languagePoints) {
        if (!weekStartDate || !weeklyPoints) return;

        if (!this.profile.weeklyPointsHistory) {
            this.profile.weeklyPointsHistory = {};
        }

        // Only archive if we don't already have data for this week (prevent overwriting with lower values)
        if (!this.profile.weeklyPointsHistory[weekStartDate]) {
            const langSnapshot = {};
            if (languagePoints) {
                for (const lang of Object.keys(languagePoints)) {
                    langSnapshot[lang] = { weekly: languagePoints[lang]?.weekly || 0 };
                }
            }
            this.profile.weeklyPointsHistory[weekStartDate] = {
                points: weeklyPoints,
                languagePoints: langSnapshot
            };
        }

        // Prune to keep only the 4 most recent weeks
        const weeks = Object.keys(this.profile.weeklyPointsHistory).sort().reverse();
        for (const old of weeks.slice(4)) {
            delete this.profile.weeklyPointsHistory[old];
        }
    }

    /**
     * Migrate word IDs from Norwegian suffixes to English suffixes (one-time migration)
     * This is needed because vocabulary files now use English suffixes (_noun, _adj, _num)
     * but user's saved progress may have old Norwegian suffixes (_substantiv, _adjektiv, _tallord)
     * Matches iOS: shared/ios-core/Services/VocabProfileService.swift
     */
    async _migrateWordIdSuffixes() {
        // Check if migration already done for this profile
        if (this.profile._wordIdMigrationDone || this._wordIdMigrationDone) {
            return;
        }

        const words = this.profile.words || {};
        if (Object.keys(words).length === 0) {
            // No words to migrate
            this._wordIdMigrationDone = true;
            return;
        }

        // Check if any words need migration
        let needsMigration = false;
        for (const wordId of Object.keys(words)) {
            for (const oldSuffix of Object.keys(SUFFIX_MIGRATION_MAP)) {
                if (wordId.endsWith(oldSuffix)) {
                    needsMigration = true;
                    break;
                }
            }
            if (needsMigration) break;
        }

        if (!needsMigration) {
            this._wordIdMigrationDone = true;
            return;
        }

        console.log('🔄 Starting word ID suffix migration (Norwegian → English) in VocabProfile...');

        const migratedWords = {};
        let migrationCount = 0;
        let unchangedCount = 0;

        for (const [wordId, progress] of Object.entries(words)) {
            const newWordId = migrateWordIdSuffix(wordId);
            if (newWordId !== wordId) {
                migrationCount++;
                console.log(`   Migrated: ${wordId} → ${newWordId}`);
            } else {
                unchangedCount++;
            }
            migratedWords[newWordId] = progress;
        }

        // Replace the words dictionary with migrated version
        this.profile.words = migratedWords;
        this.profile._wordIdMigrationDone = true;
        this._wordIdMigrationDone = true;

        // Save to cloud
        await this.saveProfile();

        console.log(`🔄 Word ID migration complete:`);
        console.log(`   Migrated: ${migrationCount} words`);
        console.log(`   Unchanged: ${unchangedCount} words`);
        console.log(`   Total: ${Object.keys(migratedWords).length} words`);
    }

    /**
     * Migrate word IDs from underscore umlaut encoding to ae/oe/ue encoding (one-time migration)
     * This is needed because vocabulary files now use ae/oe/ue for umlauts
     * but user's saved progress may have old underscore encoding
     * Matches iOS: shared/ios-core/Services/VocabProfileService.swift
     */
    async _migrateUmlautEncoding() {
        // Check if migration already done for this profile
        if (this.profile._umlautEncodingMigrationDone || this._umlautEncodingMigrationDone) {
            return;
        }

        const words = this.profile.words || {};
        if (Object.keys(words).length === 0) {
            // No words to migrate
            this._umlautEncodingMigrationDone = true;
            return;
        }

        // Check if any words need migration
        let needsMigration = false;
        for (const wordId of Object.keys(words)) {
            if (UMLAUT_ENCODING_MAP[wordId]) {
                needsMigration = true;
                break;
            }
        }

        if (!needsMigration) {
            this._umlautEncodingMigrationDone = true;
            return;
        }

        console.log('🔄 Starting umlaut encoding migration (underscore → ae/oe/ue) in VocabProfile...');

        const migratedWords = {};
        let migrationCount = 0;
        let unchangedCount = 0;

        for (const [wordId, progress] of Object.entries(words)) {
            const newWordId = migrateUmlautEncoding(wordId);
            if (newWordId !== wordId) {
                migrationCount++;
                console.log(`   Migrated: ${wordId} → ${newWordId}`);
            } else {
                unchangedCount++;
            }
            migratedWords[newWordId] = progress;
        }

        // Replace the words dictionary with migrated version
        this.profile.words = migratedWords;
        this.profile._umlautEncodingMigrationDone = true;
        this._umlautEncodingMigrationDone = true;

        // Save to cloud
        await this.saveProfile();

        console.log(`🔄 Umlaut encoding migration complete:`);
        console.log(`   Migrated: ${migrationCount} words`);
        console.log(`   Unchanged: ${unchangedCount} words`);
        console.log(`   Total: ${Object.keys(migratedWords).length} words`);
    }

    _getMonday(d) {
        d = new Date(d);
        var day = d.getDay(),
            diff = d.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
        return new Date(d.setDate(diff));
    }

    // --- Word Progress Logic (SM-2 & Cross-Mode) ---

    /**
     * Cross-Mode Training Credit (V3.7 Spec)
     * @param {string} wordId - The word identifier
     * @param {number} quality - SM-2 quality rating (0-5)
     * @param {string} mode - Training mode: 'test', 'match', 'flashcards', 'write', 'gender'
     * @param {boolean|Object} options - If boolean: skipPoints. If object: { skipPoints, language, exposureOnly }
     * @returns {boolean} true if Full SM-2 Credit was given
     */
    updateWordProgressCrossMode(wordId, quality, mode, options = false) {
        // Handle backward compatibility: options can be boolean (skipPoints) or object
        let skipPoints = false;
        let language = null;
        let exposureOnly = false;
        if (typeof options === 'boolean') {
            skipPoints = options;
        } else if (typeof options === 'object' && options !== null) {
            skipPoints = options.skipPoints || false;
            language = options.language || null;
            exposureOnly = options.exposureOnly || false;
        }

        let progress = this.profile.words[wordId] || this._createWordEntry();
        let wasCorrect = quality >= 3;

        // Points Logic - Skip for modes that handle points manually (e.g., Kombiner adds 2 per round)
        if (wasCorrect && !skipPoints) {
            this.addPoints(1, language);
        }

        // Exposure-only mode: Used for lesson-specific training where we want points
        // but only exposure credit for SSR (no full SM-2 scheduling updates)
        if (exposureOnly) {
            progress = SM2Algorithm.recordGameExposure(progress, wasCorrect);
            this.profile.words[wordId] = progress;
            this._dirtyFields.add(wordId);
            this.saveProfileDebounced();
            return false;
        }

        // Test Mode: Always Full Credit
        if (mode === 'test') {
            progress = SM2Algorithm.update(progress, quality);
            this.profile.words[wordId] = progress;
            this._dirtyFields.add(wordId);
            this.saveProfileDebounced();
            return true;
        }

        // Match Mode: Always Exposure Credit
        if (mode === 'match') {
            progress = SM2Algorithm.recordGameExposure(progress, wasCorrect);
            this.profile.words[wordId] = progress;
            this._dirtyFields.add(wordId);
            this.saveProfileDebounced();
            return false;
        }

        // Gender Mode: Always Exposure Credit (like match)
        if (mode === 'gender') {
            progress = SM2Algorithm.recordGameExposure(progress, wasCorrect);
            this.profile.words[wordId] = progress;
            this._dirtyFields.add(wordId);
            this.saveProfileDebounced();
            return false;
        }

        // Write/Flashcards: Alternating Logic
        const shouldGiveFullCredit = !progress.lastMode || progress.lastMode === mode;

        if (shouldGiveFullCredit) {
            progress = SM2Algorithm.update(progress, quality);
            progress.lastMode = mode;
            this.profile.words[wordId] = progress;
            this._dirtyFields.add(wordId);
            this.saveProfileDebounced();
            return true;
        } else {
            // Exposure Credit Only
            progress = SM2Algorithm.recordGameExposure(progress, wasCorrect);
            progress.lastMode = mode; // Switch mode for next time
            this.profile.words[wordId] = progress;
            this._dirtyFields.add(wordId);
            this.saveProfileDebounced();
            return false;
        }
    }

    /**
     * Mark a word as "Known" (removing it from training)
     */
    markWordAsKnown(wordId) {
        let word = this.profile.words[wordId] || this._createWordEntry();
        word.status = 'known';
        word.lastSeen = new Date().toISOString().split('T')[0];
        this.profile.words[wordId] = word;
        this.saveProfile();
    }

    unmarkWordAsKnown(wordId) {
        let word = this.profile.words[wordId];
        if (!word) return;
        word.status = 'learning';
        word.lastSeen = new Date().toISOString().split('T')[0];
        // Reset intervals? Spec says yes (demote).
        word.interval = 1;
        word.reps = 0;

        this.profile.words[wordId] = word;
        this.saveProfile();
    }

    isWordKnown(wordId) {
        return this.profile.words[wordId]?.status === 'known';
    }

    /**
     * Check if a word is due for review (SM-2 scheduling)
     * V3.7 Spec: Words are due when nextReview <= today
     * @param {string} wordId - The word identifier
     * @returns {boolean} true if word is due for review
     */
    isWordDue(wordId) {
        const word = this.profile.words[wordId];
        if (!word) return true; // New word = due by default
        if (word.status === 'known') return false; // Known words are excluded

        const today = new Date().toISOString().split('T')[0];
        return !word.nextReview || word.nextReview <= today;
    }

    /**
     * Get all due word IDs from a list of word IDs
     * V3.7 Spec Section 1.1.1.2: Flashcards shows ONLY due words
     * @param {Array<string>} wordIds - Array of word identifiers to check
     * @returns {Array<string>} - Array of word IDs that are due for review
     */
    getDueWords(wordIds) {
        return wordIds.filter(wordId => this.isWordDue(wordId));
    }

    /**
     * Get all learning (non-known) word IDs from a list of word IDs
     * V3.7 Spec Section 1.1.1.2: Write/Match shows ALL learning words
     * @param {Array<string>} wordIds - Array of word identifiers to check
     * @returns {Array<string>} - Array of word IDs that are in learning status
     */
    getLearningWords(wordIds) {
        return wordIds.filter(wordId => !this.isWordKnown(wordId));
    }

    /**
     * Check if there are words that need Write training (lastMode = flashcards)
     * V3.7 Spec: Cross-mode credit - words trained in flashcards can get extra credit in write
     * @param {Array<string>} wordIds - Array of word identifiers to check
     * @returns {boolean} - True if there are words with lastMode='flashcards'
     */
    hasWordsNeedingWriteMode(wordIds) {
        return wordIds.some(wordId => {
            const word = this.profile.words[wordId];
            return word && word.status !== 'known' && word.lastMode === 'flashcards';
        });
    }

    /**
     * Check if there are words that need Flashcard training (lastMode = write)
     * @param {Array<string>} wordIds - Array of word identifiers to check
     * @returns {boolean} - True if there are words with lastMode='write'
     */
    hasWordsNeedingFlashcardMode(wordIds) {
        return wordIds.some(wordId => {
            const word = this.profile.words[wordId];
            return word && word.status !== 'known' && word.lastMode === 'write';
        });
    }

    // --- Streak Logic ---

    updateStreak() {
        const today = this._getLocalDate();
        if (this.profile.lastTrainingDate === today) return; // Already done

        const lastDate = this.profile.lastTrainingDate;
        if (!lastDate) {
            this.profile.currentStreak = 1;
        } else {
            const diff = this._daysBetween(lastDate, today);
            if (diff === 1) {
                this.profile.currentStreak++;
            } else if (diff === 2 && this.profile.hviledagerUsedThisWeek < 1) {
                // Use Rest Day
                this.profile.hviledagerUsedThisWeek++;
                this.profile.currentStreak++;
            } else {
                // Broken Streak
                this.profile.currentStreak = 1;
                this._resetStreakTracking();
            }
        }

        this.profile.longestStreak = Math.max(this.profile.longestStreak, this.profile.currentStreak);
        this.profile.lastTrainingDate = today;

        // Simple Weekly Consistency
        this.profile.weeklyConsistencyScore = Math.min(7, this.profile.weeklyConsistencyScore + 1);

        this._checkAndAwardMilestones();
        // updateStreak is called from addPoints which already does debounced save,
        // so just save to localStorage here (Firestore write will be batched)
        this._saveToLocalStorage();
    }

    _resetStreakTracking() {
        if (this.profile.streakBadges) {
            this.profile.streakBadges.currentStreakMilestonesAwarded = [];
        }
    }

    _checkAndAwardMilestones() {
        const streak = this.profile.currentStreak;
        if (!this.profile.streakBadges) {
            this.profile.streakBadges = {
                ukeMester: 0,
                toUkersChampion: 0,
                manedsMaestro: 0,
                hundredagersStrekken: 0,
                arsMester: 0,
                currentStreakMilestonesAwarded: []
            };
        }

        const badges = this.profile.streakBadges;
        if (!badges.currentStreakMilestonesAwarded) badges.currentStreakMilestonesAwarded = [];

        const milestones = [
            { id: 'ukeMester', days: 7 },
            { id: 'toUkersChampion', days: 14 },
            { id: 'manedsMaestro', days: 30 },
            { id: 'hundredagersStrekken', days: 100 },
            { id: 'arsMester', days: 365 }
        ];

        let newBadgeEarned = false;

        milestones.forEach(m => {
            if (streak >= m.days) {
                // Check if already awarded for THIS streak
                if (!badges.currentStreakMilestonesAwarded.includes(m.id)) {
                    // Award it!
                    badges[m.id]++;
                    badges.currentStreakMilestonesAwarded.push(m.id);
                    newBadgeEarned = true;
                    console.log(`🏆 Milestone Reached: ${m.id} (${m.days} days)!`);
                }
            }
        });

        // Note: UI notification logic (Confetti) belongs in the UI layer observing the profile.
    }

    /**
     * Trim historical data to prevent unbounded document growth.
     * - reviewLog: 28 days (matches SRS_SCORING_PERIOD_DAYS for SR-mester leaderboard)
     * - trainingDays: 28 days (same scoring window)
     * - dailyPointsHistory: NOT trimmed (kept forever, like Duolingo — ~36KB for 5 years)
     *
     * Streak counters (currentStreak, longestStreak) are NOT affected by trimming.
     * See: back-stage/zebigplans/architecture_and_improvements_DONE.md
     */
    _trimHistory() {
        const now = new Date();

        const cutoff28 = new Date(now);
        cutoff28.setDate(cutoff28.getDate() - 28);
        const cutoff28Str = cutoff28.toISOString().split('T')[0];

        // Trim reviewLog to 28 days (matches SRS scoring window)
        const reviewBefore = (this.profile.reviewLog || []).length;
        this.profile.reviewLog = (this.profile.reviewLog || [])
            .filter(r => r.reviewDate >= cutoff28Str);

        // Trim trainingDays to 28 days (matches SRS scoring window)
        const trainingBefore = (this.profile.trainingDays || []).length;
        this.profile.trainingDays = (this.profile.trainingDays || [])
            .filter(d => d >= cutoff28Str);

        // dailyPointsHistory is NOT trimmed — kept forever for motivation (like Duolingo).
        // Storage cost is negligible: ~20 bytes/day × 365 days = ~7KB/year.

        const reviewRemoved = reviewBefore - (this.profile.reviewLog || []).length;
        const trainingRemoved = trainingBefore - (this.profile.trainingDays || []).length;
        if (reviewRemoved > 0 || trainingRemoved > 0) {
            console.log(`[VocabProfileService] 🧹 Trimmed history: ${reviewRemoved} reviewLog, ${trainingRemoved} trainingDays entries`);
        }
    }

    _daysBetween(d1, d2) {
        const oneDay = 24 * 60 * 60 * 1000;
        return Math.round(Math.abs((new Date(d1) - new Date(d2)) / oneDay));
    }

    _getLocalDate() {
        const d = new Date();
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().split('T')[0];
    }

    // --- Helpers ---

    _createWordEntry() {
        return {
            status: 'learning',
            interval: 1,
            ease: 2.5,
            reps: 0,
            nextReview: this._getLocalDate(),
            lastSeen: this._getLocalDate(),
            lastMode: null
        };
    }

    // --- Selected Chapters for Training ---

    /**
     * Get selected chapters for a curriculum
     * @param {string} curriculum - The curriculum identifier (e.g., "tysk1-vg1")
     * @returns {Array<number>} - Array of selected chapter numbers (defaults to [1])
     */
    getSelectedChapters(curriculum) {
        if (!this.profile.selectedChapters) {
            this.profile.selectedChapters = {};
        }
        return this.profile.selectedChapters[curriculum] || [1];
    }

    /**
     * Set selected chapters for a curriculum
     * @param {string} curriculum - The curriculum identifier
     * @param {Array<number>} chapters - Array of chapter numbers to select
     */
    setSelectedChapters(curriculum, chapters) {
        if (!this.profile.selectedChapters) {
            this.profile.selectedChapters = {};
        }
        this.profile.selectedChapters[curriculum] = chapters;
        this.profile.lastUpdated = Date.now();
        this.profile.lastDevice = navigator.userAgent;
        console.log(`📚 Selected chapters for ${curriculum}:`, chapters);
        this.saveProfile();
    }

    /**
     * Toggle a chapter's selection for a curriculum
     * @param {string} curriculum - The curriculum identifier
     * @param {number} chapter - The chapter number to toggle
     */
    toggleChapterSelection(curriculum, chapter) {
        let chapters = this.getSelectedChapters(curriculum);

        if (chapters.includes(chapter)) {
            chapters = chapters.filter(c => c !== chapter);
            // Ensure at least one chapter is selected
            if (chapters.length === 0) {
                chapters = [1];
            }
        } else {
            chapters = [...chapters, chapter];
            chapters.sort((a, b) => a - b);
        }

        this.setSelectedChapters(curriculum, chapters);
    }

    /**
     * Check if a chapter is selected for training
     * @param {string} curriculum - The curriculum identifier
     * @param {number} chapter - The chapter number to check
     * @returns {boolean} - True if the chapter is selected
     */
    isChapterSelected(curriculum, chapter) {
        return this.getSelectedChapters(curriculum).includes(chapter);
    }

    // --- Word Statistics (matching iOS logic) ---

    /**
     * Get count of all words with status 'known' in the profile
     * This counts ALL known words regardless of curriculum
     * @returns {number} - Total count of known words
     */
    getTotalKnownWordsCount() {
        return Object.values(this.profile.words || {}).filter(w => w.status === 'known').length;
    }

    /**
     * Get count of words currently in the learning queue (status = 'learning')
     * These are words the user has started learning but hasn't marked as "known" yet
     * @returns {number} - Count of words in learning queue
     */
    getLearningQueueCount() {
        return Object.values(this.profile.words || {}).filter(w => w.status === 'learning').length;
    }

    /**
     * Get learning words for specific chapters
     * @param {Array<string>} wordIds - Array of word IDs to check
     * @returns {{learning: number, total: number}} - Learning count and total words
     */
    getLearningWordsForWordIds(wordIds) {
        let learningCount = 0;
        const words = this.profile.words || {};

        for (const wordId of wordIds) {
            const progress = words[wordId];
            if (progress && progress.status === 'learning') {
                learningCount++;
            }
        }

        return { learning: learningCount, total: wordIds.length };
    }

    /**
     * Get known words for specific word IDs
     * @param {Array<string>} wordIds - Array of word IDs to check
     * @returns {{known: number, total: number}} - Known count and total words
     */
    getKnownWordsForWordIds(wordIds) {
        let knownCount = 0;
        const words = this.profile.words || {};

        for (const wordId of wordIds) {
            const progress = words[wordId];
            if (progress && progress.status === 'known') {
                knownCount++;
            }
        }

        return { known: knownCount, total: wordIds.length };
    }

    /**
     * Check if a word is marked as known
     * @param {string} wordId - The word ID to check
     * @returns {boolean} - True if word status is 'known'
     */
    isWordKnown(wordId) {
        const progress = this.profile.words?.[wordId];
        return progress?.status === 'known';
    }

    // --- Known Words by Chapter (matching iOS KnownWordsListView) ---

    /**
     * Get all known word IDs from the profile
     * @returns {Array<string>} - Array of all word IDs with status 'known'
     */
    getAllKnownWordIds() {
        const words = this.profile.words || {};
        return Object.entries(words)
            .filter(([_, progress]) => progress.status === 'known')
            .map(([wordId, _]) => wordId);
    }

    /**
     * Get known words organized by chapter
     * Matches iOS: KnownWordsListView.swift
     * @param {Object} manifest - Vocab manifest with lessons structure
     * @param {Object} wordbanks - Combined wordbanks { general, verbs, nouns, adjectives }
     * @param {string} translationLang - Translation language code (default: 'nb')
     * @returns {Array<Object>} - Array of chapter stats: { chapter, total, known, knownWords, progress }
     */
    getKnownWordsByChapter(manifest, wordbanks, translationLang = 'nb') {
        if (!manifest || !manifest.lessons) return [];

        const words = this.profile.words || {};
        const chapterStats = new Map();

        // Group lessons by chapter number
        for (const [lessonId, lesson] of Object.entries(manifest.lessons)) {
            const chapterNum = parseInt(lessonId.split('.')[0], 10);
            const wordIds = lesson.words || [];

            if (!chapterStats.has(chapterNum)) {
                chapterStats.set(chapterNum, {
                    chapter: chapterNum,
                    total: 0,
                    known: 0,
                    knownWords: []
                });
            }

            const stats = chapterStats.get(chapterNum);

            for (const wordId of wordIds) {
                stats.total++;
                const progress = words[wordId];

                if (progress && progress.status === 'known') {
                    stats.known++;

                    // Look up word details from wordbanks
                    const wordDetails = this._findWordInBanks(wordId, wordbanks, translationLang);
                    if (wordDetails) {
                        stats.knownWords.push({
                            id: wordId,
                            german: wordDetails.word,
                            norwegian: wordDetails.translation,
                            type: wordDetails.type,
                            chapter: chapterNum
                        });
                    } else {
                        // Word not found in banks - still add it with fallback info
                        console.warn(`[VocabProfileService] Known word not found in wordbanks: ${wordId}`);
                        const typeMatch = wordId.match(/_([a-z]+)$/);
                        const type = typeMatch ? typeMatch[1] : 'unknown';
                        // Try to extract a readable word from the ID
                        const wordPart = wordId.replace(/_[a-z]+$/, '').replace(/_/g, ' ');
                        stats.knownWords.push({
                            id: wordId,
                            german: wordPart,
                            norwegian: '(ukjent)',
                            type: type,
                            chapter: chapterNum
                        });
                    }
                }
            }
        }

        // Convert to array and calculate progress
        const result = Array.from(chapterStats.values())
            .map(stats => ({
                ...stats,
                progress: stats.total > 0 ? stats.known / stats.total : 0
            }))
            .sort((a, b) => a.chapter - b.chapter);

        return result;
    }

    /**
     * Find a word in the wordbanks and return its details
     * @private
     */
    _findWordInBanks(wordId, wordbanks, translationLang) {
        if (!wordbanks) return null;

        // Determine word type from ID suffix
        const typeMatch = wordId.match(/_([a-z]+)$/);
        const type = typeMatch ? typeMatch[1] : 'unknown';

        // Search in all banks (including numbers for _num words)
        const banks = [
            { bank: wordbanks.general, name: 'general' },
            { bank: wordbanks.verbs, name: 'verbs' },
            { bank: wordbanks.nouns, name: 'nouns' },
            { bank: wordbanks.adjectives, name: 'adjectives' },
            { bank: wordbanks.numbers, name: 'numbers' }
        ];

        for (const { bank } of banks) {
            if (bank && bank[wordId]) {
                const entry = bank[wordId];
                return {
                    word: entry.word || entry.infinitive || wordId,
                    translation: entry.translations?.[translationLang] || entry.translation || '',
                    type: type
                };
            }
        }

        return null;
    }

    /**
     * Get all known words as a flat array with details
     * @param {Object} manifest - Vocab manifest
     * @param {Object} wordbanks - Combined wordbanks
     * @param {string} translationLang - Translation language code
     * @returns {Array<Object>} - Array of known word objects
     */
    getAllKnownWordsWithDetails(manifest, wordbanks, translationLang = 'nb') {
        const chapterStats = this.getKnownWordsByChapter(manifest, wordbanks, translationLang);
        const allKnownWords = [];

        for (const chapter of chapterStats) {
            allKnownWords.push(...chapter.knownWords);
        }

        return allKnownWords;
    }
}

