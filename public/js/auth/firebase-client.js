/**
 * =================================================================
 * FIREBASE CLIENT MODULE
 * =================================================================
 *
 * Initializes and exports Firebase services with environment support.
 *
 * Environments:
 * - development: localhost, 127.0.0.1 → tysk01-dev
 * - staging: preview deployments, tysk.papertek.no → tysk01-staging
 * - production: www.papertek.no → tysk01-141b1
 */

export let firebaseApp;
export let auth;
export let firestore;
let _isAuthAvailable = false;
let _initializationAttempted = false;
let _currentEnvironment = null;

// --- ENVIRONMENT DETECTION ---
function detectEnvironment() {
    const hostname = window.location.hostname;

    // Development: localhost or 127.0.0.1
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'development';
    }

    // Staging: Vercel preview deployments, tysk.papertek.no, or staging.papertek.no
    if (hostname.includes('vercel.app') || hostname === 'tysk.papertek.no' || hostname === 'staging.papertek.no') {
        return 'staging';
    }

    // Production: papertek.no with or without www
    if (hostname === 'www.papertek.no' || hostname === 'papertek.no') {
        return 'production';
    }

    // Default to production for other hosts (safer for prod deployment)
    // This matches AuthManager behavior for consistency
    console.warn(`firebase-client: Unknown hostname '${hostname}', defaulting to production`);
    return 'production';
}

// --- FIREBASE CONFIGURATIONS ---
// Loaded from papertek.config.js at runtime (firebase.dev / firebase.staging / firebase.production)
// Each project must provide its own Firebase credentials — never hardcode them in the engine.
const FIREBASE_CONFIGS = window.__PAPERTEK_FIREBASE_CONFIGS__ || {};

// Lazy initialization - only initialize when first needed
function ensureFirebaseInitialized() {
    if (_initializationAttempted) return;
    _initializationAttempted = true;

    try {
        // Detect environment and get appropriate config
        _currentEnvironment = detectEnvironment();
        const firebaseConfig = FIREBASE_CONFIGS[_currentEnvironment];

        if (!firebaseConfig || !firebaseConfig.apiKey) {
            throw new Error(`No Firebase config for environment '${_currentEnvironment}'. Provide firebase configs via papertek.config.js or window.__PAPERTEK_FIREBASE_CONFIGS__.`);
        }

        console.log(`🔥 Firebase Environment: ${_currentEnvironment.toUpperCase()}`);
        console.log(`   Project ID: ${firebaseConfig.projectId}`);
        // ------------------------------

        if (typeof firebase === 'undefined') {
            throw new Error("Firebase scripts are not loaded. App will run in offline mode.");
        }

        // Check if Firebase is already initialized (e.g., by AuthManager)
        // This prevents conflicts when multiple modules try to initialize Firebase
        if (firebase.apps.length > 0) {
            console.log("Firebase already initialized, reusing existing app");
            firebaseApp = firebase.apps[0];
        } else {
            firebaseApp = firebase.initializeApp(firebaseConfig);
            console.log("Firebase initialized successfully.");
        }

        auth = firebase.auth();
        firestore = firebase.firestore();

        // Enable offline persistence for automatic write queuing and cache-first reads
        firestore.enablePersistence({ synchronizeTabs: true })
            .catch(err => {
                if (err.code === 'failed-precondition') {
                    console.warn('Firestore persistence unavailable: multiple tabs open');
                } else if (err.code === 'unimplemented') {
                    console.warn('Firestore persistence not supported in this browser');
                } else {
                    console.warn('Firestore persistence failed:', err.code);
                }
            });

        _isAuthAvailable = true;

    } catch (error) {
        console.error("Firebase initialization error:", error);
    }
}

// --- EXPORTED FUNCTIONS ---

export function isAuthAvailable() {
    ensureFirebaseInitialized();
    return _isAuthAvailable;
}

export function getCurrentUser() {
    ensureFirebaseInitialized();
    if (!_isAuthAvailable) return null;
    return auth.currentUser;
}

export function getUserFullName(user) {
    if (!user) return '';
    return user.displayName || 'Anonymous';
}

export function getFeideUserId(user) {
    if (!user || !user.providerData) return null;
    const feideProvider = user.providerData.find(p => p.providerId === 'oidc.feide');
    return feideProvider ? feideProvider.uid : null;
}

export async function getUserOrganization(user) {
    ensureFirebaseInitialized();
    if (!_isAuthAvailable || !user) return null;
    try {
        const idTokenResult = await user.getIdTokenResult();
        return idTokenResult.claims['c'] || null;
    } catch (error) {
        console.error("Error getting user organization from token:", error);
        return null;
    }
}

export function getGoogleAuthProvider() {
    ensureFirebaseInitialized();
    if (!_isAuthAvailable) return null;
    return new firebase.auth.GoogleAuthProvider();
}

export function getOAuthProvider(providerId) {
    ensureFirebaseInitialized();
    if (!_isAuthAvailable) return null;
    return new firebase.auth.OAuthProvider(providerId);
}

export function getCurrentEnvironment() {
    if (!_currentEnvironment) {
        _currentEnvironment = detectEnvironment();
    }
    return _currentEnvironment;
}
