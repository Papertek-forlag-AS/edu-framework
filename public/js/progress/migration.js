/**
 * =================================================================
 * MIGRATION - Versjon 1 til Multi-Curriculum
 * =================================================================
 *
 * Migrerer eksisterende progresjonsdata fra enkelt-curriculum-format
 * til nytt multi-curriculum-format med achievements-system.
 *
 * VIKTIG: Denne migreringen kjører kun EN gang per student.
 */

import { safeStorage } from '../error-handler.js';
import { EXERCISE_DATABASE } from './config.js';
import { showAlertModal } from '../modals.js';
import { clearOldExerciseKeys } from '../exercises/storage-utils.js';
// Import core vocabulary from external API (for migration checks - no translations needed)
import { fetchCoreBank } from '../vocabulary/vocab-api-client.js';
import { getTargetLanguageCode, genusToArticle } from '../core/language-utils.js';
const nounBank = await fetchCoreBank(getTargetLanguageCode(), 'nounbank');
import { auth, isAuthAvailable } from '../auth/firebase-client.js';

// =================================================================
// Word ID Suffix Migration (Norwegian → English)
// =================================================================
// Mapping from old Norwegian suffixes to new English suffixes
const SUFFIX_MIGRATION_MAP = {
    '_substantiv': '_noun',
    '_adjektiv': '_adj',
    '_adverb': '_adv',
    '_preposisjon': '_prep',
    '_konjunksjon': '_conj',
    '_interjeksjon': '_interj',
    '_pronomen': '_pron',
    '_tallord': '_num',
    '_frase': '_phrase',
    '_spørreord': '_interr',
    '_eigenname': '_propn',
    '_sammentrekning': '_contr',
    '_utrykk': '_expr',
    '_artikkel': '_art',
    '_verbfrase': '_verbphrase',
    '_modalverb': '_modal',
    '_uttrykk': '_phrase',
    '_fast': '_phrase'  // "fast uttrykk" (fixed expression) → phrase
};

/**
 * Migrerer et enkelt ord-ID fra gammelt norsk suffix til nytt engelsk suffix
 * @param {string} wordId - Ord-ID som skal migreres
 * @returns {string} - Migrert ord-ID (eller originalen hvis ingen migrering trengs)
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
 * Sjekker om et ord-ID bruker gammelt norsk suffix-format
 * @param {string} wordId - Ord-ID som skal sjekkes
 * @returns {boolean} - True hvis gammelt format
 */
function usesLegacySuffix(wordId) {
    for (const oldSuffix of Object.keys(SUFFIX_MIGRATION_MAP)) {
        if (wordId.endsWith(oldSuffix)) {
            return true;
        }
    }
    return false;
}

/**
 * Sjekker om vi kjører i produksjon eller lokalt
 * @returns {boolean} True hvis produksjon, false hvis lokalt
 */
function isProduction() {
    const hostname = window.location.hostname;
    return hostname !== 'localhost' &&
        hostname !== '127.0.0.1' &&
        !hostname.startsWith('192.168.') &&
        !hostname.startsWith('10.0.');
}

/**
 * Venter på at Firebase auth er initialisert og sjekker om bruker er logget inn
 * @returns {Promise<boolean>} True hvis bruker er autentisert eller auth ikke er påkrevd
 */
async function checkAuthentication() {
    // DEVELOPMENT MODE: Simulate authenticated user for testing
    // Set this to true to test authenticated user flow locally/on develop
    const DEV_SIMULATE_AUTH = false; // PRODUCTION READY: Set to false before deploying

    // Hvis ikke produksjon, bruk dev-innstilling
    if (!isProduction()) {
        if (DEV_SIMULATE_AUTH) {
            console.log('🔧 DEV MODE: Simulerer autentisert bruker (får grønne achievements)');
            return true;
        } else {
            console.log('🔧 DEV MODE: Simulerer anonym bruker (blank slate)');
            return false;
        }
    }

    // PRODUCTION: Real Firebase auth check
    // Sjekk om Firebase er tilgjengelig (this triggers lazy initialization)
    if (!isAuthAvailable()) {
        console.warn('⚠️ Firebase ikke tilgjengelig - behandler som anonym bruker');
        return false; // Fallback: treat as anonymous if Firebase not loaded
    }

    // Vent på at Firebase auth er klar
    return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe(); // Stopp lytting etter første sjekk

            if (user) {
                console.log(`✅ Bruker autentisert: ${user.email || user.displayName || user.uid}`);
                resolve(true);
            } else {
                console.log('⏭️ Ingen bruker logget inn - behandler som anonym bruker');
                resolve(false);
            }
        });
    });
}

/**
 * Sjekker om migrering er nødvendig
 * @returns {boolean} True hvis gammel datastruktur eksisterer
 */
export function needsMigration() {
    // Sjekk om det finnes gammel progresjonsdata
    const oldProgress = safeStorage.get('tysk08-progress', null);

    // Sjekk om det finnes ny progresjonsdata
    const newProgress = safeStorage.get('progressData', null);

    // Trenger migrering hvis gammel data eksisterer og ny ikke eksisterer
    return oldProgress !== null && newProgress === null;
}

/**
 * Beregner achievements basert på autentiseringsstatus og leksjons-ID
 * Forenklet strategi: Alle innloggede brukere får grønne achievements for kapittel 1-5
 * @param {boolean} isAuthenticated - Om brukeren er logget inn
 * @param {string} lessonId - Leksjons-ID (f.eks. '1-1')
 * @param {string} migrationDate - ISO-timestamp for migreringsdato
 * @returns {object} Achievement-objekt med integer-verdier (0 = ikke oppnådd, 1+ = antall ganger oppnådd)
 */
function calculateAchievements(isAuthenticated, lessonId, migrationDate) {
    const [chapter, lesson] = lessonId.split('-').map(Number);
    const lessonConfig = EXERCISE_DATABASE[lessonId] || { exercises: 0, extraExercises: 0 };

    // Green achievements only for authenticated users, chapters 1-5 (lessons 1-1 through 5-3)
    const shouldHaveGreenAchievements = isAuthenticated && chapter >= 1 && chapter <= 5;

    // Green star only for lessons 2-1 through 5-3 with extraExercises
    const shouldHaveGreenStar = shouldHaveGreenAchievements &&
        chapter >= 2 &&
        lessonConfig.extraExercises > 0;

    return {
        leksjon: shouldHaveGreenAchievements ? 1 : 0, // 📗 Book icon
        exercises: shouldHaveGreenAchievements ? 1 : 0, // ✏️ Green pencil
        extraExercises: shouldHaveGreenStar ? 1 : 0,   // ⭐ Green star
        earnedDate: shouldHaveGreenAchievements ? migrationDate : null
    };
}

// Removed: convertExercisesToObject() - no longer needed with simplified migration

/**
 * Konverterer gamle known words til nytt format med artikler for substantiver
 * @param {string[]} oldKnownWords - Array med kjente ord (uten artikler)
 * @returns {string[]} Array med kjente ord (med artikler for substantiver)
 */
function convertKnownWordsToNewFormat(oldKnownWords) {
    if (!Array.isArray(oldKnownWords)) {
        return [];
    }

    const convertedWords = [];

    oldKnownWords.forEach(word => {
        // Sjekk om ordet er et substantiv i nounBank
        if (nounBank[word]) {
            // Finn riktig artikkel basert på genus
            const nounData = nounBank[word];
            const artikkel = genusToArticle(nounData.genus);

            // Legg til ord med artikkel
            convertedWords.push(`${artikkel} ${word}`);
            console.log(`🔄 Converted noun: "${word}" → "${artikkel} ${word}"`);
        } else {
            // Ikke et substantiv - behold som det er (verb, adjektiv, etc.)
            convertedWords.push(word);
        }
    });

    return convertedWords;
}

/**
 * Migrerer all progresjonsdata til nytt format
 * FORENKLET STRATEGI:
 * - Innloggede brukere: Grønne achievements for kapittel 1-5, blank slate på øvelser
 * - Anonyme brukere: Blank slate på alt
 * - BEHOLD: Kjente ord (vocabulary) med artikkelkonvertering
 * - BLANK SLATE: Ordtest-resultater (vocabulary tests)
 * @param {boolean} isAuthenticated - Om brukeren er logget inn
 * @returns {boolean} True hvis migrering var vellykket
 */
export function migrateProgressData(isAuthenticated) {
    try {
        // Hent gammel data
        const oldKnownWords = safeStorage.get('vocab-trainer-known-words', []);

        console.log('🔄 Starter FORENKLET migrering av progresjonsdata...');
        console.log(`🔐 Bruker: ${isAuthenticated ? 'Autentisert (får grønne achievements for kap 1-5)' : 'Anonym (blank slate)'}`);
        console.log('📖 Kjente ord (gammelt format):', oldKnownWords.length);

        // Konverter kjente ord til nytt format (med artikler for substantiver)
        const convertedKnownWords = convertKnownWordsToNewFormat(oldKnownWords);
        console.log('📖 Kjente ord (nytt format):', convertedKnownWords.length);

        // Opprett ny datastruktur
        const migrationDate = new Date().toISOString();
        const newData = {
            studentProfile: {
                name: "Student",
                activeCurriculum: 'tysk1-vg1',
                currentGrade: 'vg1',
                startYear: new Date().getFullYear(),
                migrated: true,
                migrationDate: migrationDate
            },
            progressByCurriculum: {
                'tysk1-vg1': {}
            },
            knownWords: convertedKnownWords, // BEHOLD vocabulary
            vocabTestHistory: [] // Fresh start on vocabulary tests
        };

        // Initialize ALL lessons (chapters 1-12, 3 lessons each = 36 lessons)
        // Fresh start: all exercises blank, but authenticated users get green achievements for chapters 1-5
        for (let chapter = 1; chapter <= 12; chapter++) {
            for (let lesson = 1; lesson <= 3; lesson++) {
                const lessonId = `${chapter}-${lesson}`;

                newData.progressByCurriculum['tysk1-vg1'][lessonId] = {
                    completed: false,
                    date: null,
                    tabs: [],        // Fresh start
                    exercises: {},   // Fresh start - all blank
                    tests: [],       // Fresh start
                    achievements: calculateAchievements(isAuthenticated, lessonId, migrationDate)
                };
            }
        }

        // Lagre ny data
        safeStorage.set('progressData', newData);

        // Backup old data
        const oldProgress = safeStorage.get('tysk08-progress', {});
        if (Object.keys(oldProgress).length > 0) {
            safeStorage.set('tysk08-progress-backup', oldProgress);
        }

        // Count achievements for logging
        let totalBooks = 0;
        let totalPencils = 0;
        let totalStars = 0;

        for (const lessonId in newData.progressByCurriculum['tysk1-vg1']) {
            const achievements = newData.progressByCurriculum['tysk1-vg1'][lessonId].achievements;
            if (achievements.leksjon) totalBooks++;
            if (achievements.exercises > 0) totalPencils++;
            if (achievements.extraExercises > 0) totalStars++;
        }

        console.log('✅ Migrering fullført!');
        console.log(`📚 36 leksjoner initialisert (12 kapitler × 3 leksjoner)`);
        console.log(`📗 ${totalBooks} grønne bøker tildelt`);
        console.log(`✏️  ${totalPencils} grønne blyanter tildelt`);
        console.log(`⭐ ${totalStars} gule stjerner tildelt`);
        console.log(`📖 ${newData.knownWords.length} kjente ord bevart`);

        return true;

    } catch (error) {
        console.error('❌ Feil under migrering:', error);
        return false;
    }
}

/**
 * Viser melding til bruker om vellykket migrering
 * @param {boolean} isAuthenticated - Om brukeren er logget inn
 */
export function showMigrationNotification(isAuthenticated) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-info-600 text-white px-8 py-6 rounded-xl shadow-2xl border-2 border-info-400 max-w-2xl';

    const authenticatedMessage = `
        <div class="flex items-start gap-4">
            <span class="text-4xl">🎉</span>
            <div>
                <div class="font-bold text-xl mb-2">Velkommen til den nye versjonen!</div>
                <div class="text-sm opacity-95 mb-3">
                    Vi har oppgradert appen! Din progresjon er trygt bevart:
                </div>
                <ul class="text-sm space-y-1 mb-3">
                    <li>✅ Du har fått grønne achievements for kapittel 1-5 (📗 ✏️ ⭐)</li>
                    <li>✅ Alle kjente ord er bevart</li>
                    <li>✅ Du kan nå gjøre øvelsene på nytt og få blå achievements!</li>
                </ul>
                <div class="text-xs opacity-75 italic">
                    Øvelsene er tilbakestilt slik at du kan repetere og få blå merker. Lykke til! 🇩🇪
                </div>
            </div>
        </div>
    `;

    const anonymousMessage = `
        <div class="flex items-start gap-4">
            <span class="text-4xl">🎉</span>
            <div>
                <div class="font-bold text-xl mb-2">Velkommen til den nye versjonen!</div>
                <div class="text-sm opacity-95 mb-3">
                    Vi har oppgradert appen med ny funksjonalitet!
                </div>
                <ul class="text-sm space-y-1 mb-3">
                    <li>✅ Kjente ord er bevart</li>
                    <li>✅ Øvelsene starter på nytt</li>
                    <li>✅ Logg inn for å synkronisere fremgangen din på tvers av enheter</li>
                </ul>
                <div class="text-xs opacity-75 italic">
                    Lykke til med læringen! 🇩🇪
                </div>
            </div>
        </div>
    `;

    toast.innerHTML = isAuthenticated ? authenticatedMessage : anonymousMessage;

    document.body.appendChild(toast);

    // Fjern melding etter 10 sekunder
    setTimeout(() => {
        toast.style.transition = 'all 0.5s ease-out';
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-20px)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 500);
    }, 10000);
}

/**
 * Sjekker om exercise key migration er nødvendig
 * @returns {boolean} True hvis gamle øvelses-lagringsnøkler eksisterer
 */
export function needsExerciseKeyMigration() {
    // Sjekk om migrering allerede er kjørt
    const migrated = safeStorage.get('exerciseKeysMigrated', null);
    if (migrated) {
        return false;
    }

    // Sjekk om det finnes gamle øvelses-nøkler
    const oldPatterns = [
        /^[^-]+-fill-in-/,
        /^[^-]+-true-false-/,
        /^[^-]+-matching-/,
        /^[^-]+-drag-drop-/,
        /^[^-]+-writing-/,
        /^[^-]+-quiz-/,
        /^[^-]+-minidialoge-/,
        /^[^-]+-image-matching-/,
        /^[^-]+-dilemma-/
    ];

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        for (const pattern of oldPatterns) {
            if (pattern.test(key)) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Kjører exercise key migration
 * Fjerner gamle localStorage-nøkler som ikke følger den nye standarden
 */
export function runExerciseKeyMigration() {
    console.log('🔄 Starting exercise storage key migration...');

    const clearedCount = clearOldExerciseKeys();

    // Marker som migrert
    safeStorage.set('exerciseKeysMigrated', true);

    console.log(`✅ Exercise key migration complete. Cleared ${clearedCount} old keys.`);
}

// =================================================================
// Word ID Suffix Migration (Norwegian → English)
// =================================================================

/**
 * Sjekker om word ID suffix migration er nødvendig
 * @returns {boolean} True hvis brukerdata inneholder gamle norske suffixes
 */
export function needsWordIdSuffixMigration() {
    // Sjekk om migrering allerede er kjørt
    const migrated = safeStorage.get('wordIdSuffixMigrated', null);
    if (migrated) {
        return false;
    }

    // Sjekk progressData for gamle suffixes i knownWords eller vocabProfile
    const progressData = safeStorage.get('progressData', null);
    if (progressData?.knownWords) {
        for (const word of progressData.knownWords) {
            if (usesLegacySuffix(word)) {
                return true;
            }
        }
    }

    // Sjekk vocab-profile for SM-2 data
    const vocabProfile = safeStorage.get('vocab-profile', null);
    if (vocabProfile) {
        for (const wordId of Object.keys(vocabProfile)) {
            if (usesLegacySuffix(wordId)) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Kjører word ID suffix migration
 * Konverterer alle lagrede ord-IDer fra norske til engelske suffixes
 */
export function runWordIdSuffixMigration() {
    console.log('🔄 Starting word ID suffix migration (Norwegian → English)...');
    let migratedCount = 0;

    // Migrer knownWords i progressData
    const progressData = safeStorage.get('progressData', null);
    if (progressData?.knownWords && Array.isArray(progressData.knownWords)) {
        const newKnownWords = progressData.knownWords.map(word => {
            const newWord = migrateWordIdSuffix(word);
            if (newWord !== word) {
                migratedCount++;
            }
            return newWord;
        });
        progressData.knownWords = newKnownWords;
        safeStorage.set('progressData', progressData);
        console.log(`  ✓ Migrerte ${migratedCount} knownWords i progressData`);
    }

    // Migrer vocab-profile (SM-2 spacing data)
    const vocabProfile = safeStorage.get('vocab-profile', null);
    if (vocabProfile) {
        const newVocabProfile = {};
        let profileMigratedCount = 0;
        for (const [wordId, data] of Object.entries(vocabProfile)) {
            const newWordId = migrateWordIdSuffix(wordId);
            if (newWordId !== wordId) {
                profileMigratedCount++;
            }
            newVocabProfile[newWordId] = data;
        }
        safeStorage.set('vocab-profile', newVocabProfile);
        console.log(`  ✓ Migrerte ${profileMigratedCount} ord i vocab-profile`);
        migratedCount += profileMigratedCount;
    }

    // Marker som migrert
    safeStorage.set('wordIdSuffixMigrated', true);
    safeStorage.set('wordIdSuffixMigrationDate', new Date().toISOString());

    console.log(`✅ Word ID suffix migration complete. Total ${migratedCount} IDs migrated.`);
    return migratedCount;
}

/**
 * Henter migrasjonsstatus for debugging og monitoring
 * Nyttig for å sjekke om studenter har migrert
 * @returns {object} Migrasjonsstatus
 */
export function getMigrationStatus() {
    const oldData = safeStorage.get('tysk08-progress', null);
    const newData = safeStorage.get('progressData', null);

    return {
        environment: isProduction() ? 'production' : 'development',
        hasMigrated: newData?.studentProfile?.migrated === true,
        migrationDate: newData?.studentProfile?.migrationDate || null,
        hasOldData: oldData !== null,
        hasNewData: newData !== null,
        needsMigration: needsMigration(),
        activeCurriculum: newData?.studentProfile?.activeCurriculum || null,
        totalLessons: newData ? Object.keys(newData.progressByCurriculum?.[newData.studentProfile?.activeCurriculum] || {}).length : 0,
        // Word ID suffix migration status
        wordIdSuffixMigrated: safeStorage.get('wordIdSuffixMigrated', false),
        wordIdSuffixMigrationDate: safeStorage.get('wordIdSuffixMigrationDate', null),
        needsWordIdSuffixMigration: needsWordIdSuffixMigration()
    };
}

/**
 * Kjører migrering hvis nødvendig
 * Skal kalles fra main.js ved oppstart
 */
export async function runMigrationIfNeeded() {
    // Sjekk autentisering først
    const isAuthenticated = await checkAuthentication();

    // Run progress data migration (runs for both authenticated and anonymous users)
    if (needsMigration()) {
        console.log('📦 Gammel progresjonsdata funnet. Starter migrering...');
        const success = migrateProgressData(isAuthenticated);

        if (success) {
            showMigrationNotification(isAuthenticated);
        } else {
            console.error('Migrering feilet. Gammel data er fortsatt intakt.');
            // Vis feilmelding til bruker
            await showAlertModal(
                'Det oppstod en feil under oppdatering av progresjonsdata.\n\nPrøv å laste siden på nytt.',
                '❌ Migreringsfeil',
                'error'
            );
        }
    } else {
        console.log('✨ Ny datastruktur allerede aktiv eller ingen data å migrere.');
    }

    // Run exercise key migration
    if (needsExerciseKeyMigration()) {
        runExerciseKeyMigration();
    }

    // Run word ID suffix migration (Norwegian → English)
    if (needsWordIdSuffixMigration()) {
        runWordIdSuffixMigration();
    }

    return true;
}
