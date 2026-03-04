/**
 * =================================================================
 * FIREBASE BACKEND ADAPTER
 * =================================================================
 *
 * Wraps Firebase Auth + Firestore to implement the BackendAdapter interface.
 * This is the existing backend — all operations delegate to the Firebase SDK.
 *
 * Requires Firebase SDKs loaded via <script> tags in HTML:
 *   - firebase-app.js
 *   - firebase-auth.js
 *   - firebase-firestore.js
 */

import { BackendAdapter, BatchWriter } from '../base/BackendAdapter.js';

// ─── Firebase SDK Lazy Init ─────────────────────────

let _app = null;
let _auth = null;
let _firestore = null;
let _initialized = false;
let _authAvailable = false;

function ensureInitialized(config) {
    if (_initialized) return;
    _initialized = true;

    if (typeof firebase === 'undefined') {
        console.warn('[FirebaseBackend] Firebase SDK not loaded — auth disabled');
        return;
    }

    try {
        if (!firebase.apps.length) {
            _app = firebase.initializeApp(config);
        } else {
            _app = firebase.apps[0];
        }
        _auth = firebase.auth();
        _firestore = firebase.firestore();

        // Enable offline persistence
        _firestore.enablePersistence({ synchronizeTabs: true })
            .catch(err => {
                if (err.code === 'failed-precondition') {
                    console.warn('[FirebaseBackend] Persistence failed: multiple tabs open');
                } else if (err.code === 'unimplemented') {
                    console.warn('[FirebaseBackend] Persistence not supported in this browser');
                }
            });

        _authAvailable = true;
    } catch (err) {
        console.error('[FirebaseBackend] Initialization failed:', err);
    }
}

// ─── Helper: Normalize Firebase User ────────────────

function toBackendUser(firebaseUser) {
    if (!firebaseUser) return null;

    const providerData = firebaseUser.providerData?.[0];
    return {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || firebaseUser.email || 'User',
        providerId: providerData?.providerId || null,
        providerUid: providerData?.uid || null,
        organization: null, // Populated async via getIdTokenResult
        _raw: firebaseUser   // Keep raw reference for advanced operations
    };
}

// ─── OAuth Provider Factory ─────────────────────────

function createOAuthProvider(providerId) {
    switch (providerId) {
        case 'google':
            return new firebase.auth.GoogleAuthProvider();
        case 'feide': {
            const provider = new firebase.auth.OAuthProvider('oidc.feide');
            provider.addScope('openid');
            provider.addScope('userid-feide');
            provider.addScope('profile');
            provider.addScope('email');
            provider.addScope('groups-org');
            return provider;
        }
        default:
            throw new Error(`Unknown OAuth provider: ${providerId}`);
    }
}

// ─── Firebase Backend Implementation ────────────────

export class FirebaseBackend extends BackendAdapter {
    constructor(config = {}) {
        super(config);
        ensureInitialized(config);
    }

    // ─── Auth ────────────────────────────────────────

    isAuthAvailable() {
        return _authAvailable;
    }

    getCurrentUser() {
        if (!_auth) return null;
        return toBackendUser(_auth.currentUser);
    }

    onAuthStateChanged(callback) {
        if (!_auth) {
            callback(null);
            return () => {};
        }
        return _auth.onAuthStateChanged(user => callback(toBackendUser(user)));
    }

    async signInWithPopup(providerId) {
        const provider = createOAuthProvider(providerId);
        const result = await _auth.signInWithPopup(provider);
        return toBackendUser(result.user);
    }

    async signInWithRedirect(providerId) {
        const provider = createOAuthProvider(providerId);
        await _auth.signInWithRedirect(provider);
    }

    async getRedirectResult() {
        if (!_auth) return { user: null };
        const result = await _auth.getRedirectResult();
        return { user: toBackendUser(result.user) };
    }

    async signOut() {
        if (_auth) await _auth.signOut();
    }

    async upsertUserProfile(user, profileData = {}) {
        if (!_firestore || !user) return;
        const docRef = _firestore.collection('user_profiles').doc(user.uid);
        await docRef.set({
            user_id: user.uid,
            email: user.email,
            full_name: user.displayName,
            ...profileData,
            updated_at: new Date().toISOString()
        }, { merge: true });
    }

    async deleteUserAccount() {
        const user = _auth?.currentUser;
        if (!user) return;

        // Delete user data from Firestore
        const batch = _firestore.batch();
        const userDataRef = _firestore.collection('user_data').doc(user.uid);

        // Delete subcollections
        for (const sub of ['progress', 'exercise_states', 'vocab_trainer']) {
            const snapshot = await userDataRef.collection(sub).get();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
        }

        // Delete profile
        batch.delete(_firestore.collection('user_profiles').doc(user.uid));
        await batch.commit();

        // Delete Firebase Auth account
        await user.delete();
    }

    async exportUserData() {
        const user = _auth?.currentUser;
        if (!user) return {};

        const exported = { profile: null, progress: [], exerciseStates: [], vocabTrainer: null };

        // Profile
        const profileSnap = await _firestore.collection('user_profiles').doc(user.uid).get();
        if (profileSnap.exists) exported.profile = profileSnap.data();

        // Progress
        const progressSnap = await _firestore.collection('user_data').doc(user.uid)
            .collection('progress').get();
        progressSnap.docs.forEach(doc => exported.progress.push({ id: doc.id, ...doc.data() }));

        // Exercise states
        const statesSnap = await _firestore.collection('user_data').doc(user.uid)
            .collection('exercise_states').get();
        statesSnap.docs.forEach(doc => exported.exerciseStates.push({ id: doc.id, ...doc.data() }));

        // Vocab
        const vocabSnap = await _firestore.collection('user_data').doc(user.uid)
            .collection('vocab_trainer').doc('known_words').get();
        if (vocabSnap.exists) exported.vocabTrainer = vocabSnap.data();

        return exported;
    }

    // ─── Database ────────────────────────────────────

    async getDocument(collection, docId) {
        if (!_firestore) return null;
        const snap = await _firestore.collection(collection).doc(docId).get();
        return snap.exists ? snap.data() : null;
    }

    async setDocument(collection, docId, data, options = {}) {
        if (!_firestore) return;
        await _firestore.collection(collection).doc(docId).set(data, options);
    }

    async deleteDocument(collection, docId) {
        if (!_firestore) return;
        await _firestore.collection(collection).doc(docId).delete();
    }

    async getCollection(collection, options = {}) {
        if (!_firestore) return [];
        let ref = _firestore.collection(collection);
        const snap = await ref.get();
        return snap.docs.map(doc => ({ id: doc.id, data: doc.data() }));
    }

    createBatch() {
        return new FirestoreBatch(_firestore);
    }

    // ─── Sync ────────────────────────────────────────

    async syncExercise(exerciseId, lessonId, data) {
        const user = this.getCurrentUser();
        if (!user) return { success: false, error: 'Not authenticated' };

        try {
            const docId = `${data.curriculum || 'default'}_${lessonId}`;
            const docRef = `user_data/${user.uid}/progress`;
            await this.setDocument(docRef, docId, {
                ...data,
                synced_at: new Date().toISOString()
            }, { merge: true });
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    async syncAllProgress(progressData) {
        const user = this.getCurrentUser();
        if (!user) return { success: false, error: 'Not authenticated' };

        try {
            const batch = this.createBatch();
            let count = 0;
            const basePath = `user_data/${user.uid}/progress`;

            for (const [key, value] of Object.entries(progressData)) {
                if (key === 'studentProfile') continue;
                batch.set(basePath, key, {
                    ...value,
                    synced_at: new Date().toISOString()
                }, { merge: true });
                count++;

                // Firestore batch limit safety
                if (count % 400 === 0) {
                    await batch.commit();
                }
            }

            await batch.commit();
            return { success: true, itemCount: count };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    async loadProgressFromCloud() {
        const user = this.getCurrentUser();
        if (!user) return {};

        const docs = await this.getCollection(`user_data/${user.uid}/progress`);
        const progress = {};
        for (const doc of docs) {
            progress[doc.id] = doc.data;
        }
        return progress;
    }

    async syncKnownWords(words) {
        const user = this.getCurrentUser();
        if (!user) return { success: false, error: 'Not authenticated' };

        try {
            await this.setDocument(
                `user_data/${user.uid}/vocab_trainer`,
                'known_words',
                { words, last_updated: new Date().toISOString() },
                { merge: true }
            );
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    async loadKnownWords() {
        const user = this.getCurrentUser();
        if (!user) return [];

        const data = await this.getDocument(
            `user_data/${user.uid}/vocab_trainer`,
            'known_words'
        );
        return data?.words || [];
    }

    // ─── Raw Access (for advanced/legacy code) ──────

    /** @returns Firebase Auth instance (use sparingly) */
    get rawAuth() { return _auth; }

    /** @returns Firestore instance (use sparingly) */
    get rawFirestore() { return _firestore; }
}

// ─── Firestore Batch Writer ─────────────────────────

class FirestoreBatch extends BatchWriter {
    constructor(firestore) {
        super();
        this._firestore = firestore;
        this._batch = firestore.batch();
        this._count = 0;
    }

    set(collection, docId, data, options = {}) {
        const ref = this._firestore.collection(collection).doc(docId);
        this._batch.set(ref, data, options);
        this._count++;
    }

    delete(collection, docId) {
        const ref = this._firestore.collection(collection).doc(docId);
        this._batch.delete(ref);
        this._count++;
    }

    async commit() {
        if (this._count === 0) return;
        await this._batch.commit();
        // Reset for next batch
        this._batch = this._firestore.batch();
        this._count = 0;
    }
}
