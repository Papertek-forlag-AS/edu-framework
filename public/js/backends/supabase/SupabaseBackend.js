/**
 * =================================================================
 * SUPABASE BACKEND ADAPTER
 * =================================================================
 *
 * Implements BackendAdapter using Supabase (Auth + PostgreSQL).
 * Provides the same interface as FirebaseBackend for seamless switching.
 *
 * Requires Supabase JS client loaded via <script> or ES module:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *
 * PostgreSQL schema required (see sql/supabase-schema.sql):
 *   - user_profiles
 *   - progress
 *   - exercise_states
 *   - known_words
 *   - vocab_test_results
 *   - answer_reports
 */

import { BackendAdapter, BatchWriter } from '../base/BackendAdapter.js';

// ─── Supabase Client Lazy Init ──────────────────────

let _client = null;
let _initialized = false;
let _authAvailable = false;

function ensureInitialized(config) {
    if (_initialized) return;
    _initialized = true;

    if (typeof supabase === 'undefined' || !supabase.createClient) {
        console.warn('[SupabaseBackend] Supabase SDK not loaded — auth disabled');
        return;
    }

    if (!config.supabaseUrl || !config.supabaseAnonKey) {
        console.warn('[SupabaseBackend] Missing supabaseUrl or supabaseAnonKey in config');
        return;
    }

    try {
        _client = supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true
            }
        });
        _authAvailable = true;
    } catch (err) {
        console.error('[SupabaseBackend] Initialization failed:', err);
    }
}

// ─── Helper: Normalize Supabase User ────────────────

function toBackendUser(supabaseUser) {
    if (!supabaseUser) return null;

    const identity = supabaseUser.identities?.[0];
    return {
        uid: supabaseUser.id,
        email: supabaseUser.email || '',
        displayName: supabaseUser.user_metadata?.full_name
            || supabaseUser.user_metadata?.name
            || supabaseUser.email
            || 'User',
        providerId: identity?.provider || null,
        providerUid: identity?.identity_id || null,
        organization: supabaseUser.user_metadata?.organization || null
    };
}

// ─── Supabase Backend Implementation ────────────────

export class SupabaseBackend extends BackendAdapter {
    constructor(config = {}) {
        super(config);
        ensureInitialized(config);
    }

    // ─── Auth ────────────────────────────────────────

    isAuthAvailable() {
        return _authAvailable;
    }

    getCurrentUser() {
        if (!_client) return null;
        // Supabase stores session synchronously after init
        const session = _client.auth.getSession?.() || null;
        // getSession is async in v2 — use the cached user from onAuthStateChanged
        return this._cachedUser || null;
    }

    onAuthStateChanged(callback) {
        if (!_client) {
            callback(null);
            return () => {};
        }

        const { data: { subscription } } = _client.auth.onAuthStateChange(
            (event, session) => {
                const user = toBackendUser(session?.user || null);
                this._cachedUser = user;
                callback(user);
            }
        );

        // Also get initial session
        _client.auth.getSession().then(({ data: { session } }) => {
            const user = toBackendUser(session?.user || null);
            this._cachedUser = user;
            callback(user);
        });

        return () => subscription?.unsubscribe();
    }

    async signInWithPopup(providerId) {
        const providerMap = {
            google: 'google',
            feide: 'keycloak' // FEIDE typically via OIDC/Keycloak in Supabase
        };

        const provider = providerMap[providerId] || providerId;

        const { data, error } = await _client.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: window.location.origin + '/auth-callback.html',
                skipBrowserRedirect: false
            }
        });

        if (error) throw error;
        return toBackendUser(data.user);
    }

    async signInWithRedirect(providerId) {
        // In Supabase, signInWithOAuth already does redirect by default
        return this.signInWithPopup(providerId);
    }

    async getRedirectResult() {
        // Supabase handles redirect automatically via detectSessionInUrl
        const { data: { session } } = await _client.auth.getSession();
        return { user: toBackendUser(session?.user || null) };
    }

    async signOut() {
        if (_client) await _client.auth.signOut();
        this._cachedUser = null;
    }

    async upsertUserProfile(user, profileData = {}) {
        if (!_client || !user) return;

        const { error } = await _client.from('user_profiles').upsert({
            id: user.uid,
            email: user.email,
            full_name: user.displayName,
            ...profileData,
            updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

        if (error) console.error('[SupabaseBackend] upsertUserProfile error:', error);
    }

    async deleteUserAccount() {
        const { data: { user } } = await _client.auth.getUser();
        if (!user) return;

        // Delete user data (RLS ensures only own data)
        await _client.from('progress').delete().eq('user_id', user.id);
        await _client.from('exercise_states').delete().eq('user_id', user.id);
        await _client.from('known_words').delete().eq('user_id', user.id);
        await _client.from('user_profiles').delete().eq('id', user.id);

        // Note: Supabase account deletion requires admin API or edge function
        // The auth.admin.deleteUser() call needs a server-side function
        console.warn('[SupabaseBackend] Auth account deletion requires server-side edge function');
    }

    async exportUserData() {
        const { data: { user } } = await _client.auth.getUser();
        if (!user) return {};

        const [profile, progress, states, vocab] = await Promise.all([
            _client.from('user_profiles').select('*').eq('id', user.id).single(),
            _client.from('progress').select('*').eq('user_id', user.id),
            _client.from('exercise_states').select('*').eq('user_id', user.id),
            _client.from('known_words').select('*').eq('user_id', user.id).single()
        ]);

        return {
            profile: profile.data,
            progress: progress.data || [],
            exerciseStates: states.data || [],
            vocabTrainer: vocab.data
        };
    }

    // ─── Database ────────────────────────────────────

    async getDocument(table, docId) {
        if (!_client) return null;

        const { data, error } = await _client
            .from(table)
            .select('*')
            .eq('id', docId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
            console.error(`[SupabaseBackend] getDocument error (${table}/${docId}):`, error);
        }
        return data || null;
    }

    async setDocument(table, docId, data, options = {}) {
        if (!_client) return;

        const payload = { id: docId, ...data };

        if (options.merge) {
            const { error } = await _client.from(table).upsert(payload, { onConflict: 'id' });
            if (error) console.error(`[SupabaseBackend] setDocument error (${table}/${docId}):`, error);
        } else {
            // Replace: delete then insert
            await _client.from(table).delete().eq('id', docId);
            const { error } = await _client.from(table).insert(payload);
            if (error) console.error(`[SupabaseBackend] setDocument error (${table}/${docId}):`, error);
        }
    }

    async deleteDocument(table, docId) {
        if (!_client) return;
        const { error } = await _client.from(table).delete().eq('id', docId);
        if (error) console.error(`[SupabaseBackend] deleteDocument error (${table}/${docId}):`, error);
    }

    async getCollection(table, options = {}) {
        if (!_client) return [];

        let query = _client.from(table).select('*');
        if (options.userId) {
            query = query.eq('user_id', options.userId);
        }

        const { data, error } = await query;
        if (error) {
            console.error(`[SupabaseBackend] getCollection error (${table}):`, error);
            return [];
        }

        return (data || []).map(row => ({ id: row.id, data: row }));
    }

    createBatch() {
        return new SupabaseBatch(_client);
    }

    // ─── Sync ────────────────────────────────────────

    async syncExercise(exerciseId, lessonId, data) {
        const user = this.getCurrentUser();
        if (!user) return { success: false, error: 'Not authenticated' };

        try {
            const { error } = await _client.from('progress').upsert({
                user_id: user.uid,
                curriculum: data.curriculum || 'default',
                lesson_id: lessonId,
                ...data,
                synced_at: new Date().toISOString()
            }, { onConflict: 'user_id,curriculum,lesson_id' });

            if (error) throw error;
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    async syncAllProgress(progressData) {
        const user = this.getCurrentUser();
        if (!user) return { success: false, error: 'Not authenticated' };

        try {
            const rows = [];
            for (const [key, value] of Object.entries(progressData)) {
                if (key === 'studentProfile') continue;
                // Parse curriculum and lesson from key format: "curriculum_lessonId"
                const separatorIndex = key.lastIndexOf('_');
                const curriculum = separatorIndex > 0 ? key.substring(0, separatorIndex) : 'default';
                const lessonId = separatorIndex > 0 ? key.substring(separatorIndex + 1) : key;

                rows.push({
                    user_id: user.uid,
                    curriculum,
                    lesson_id: lessonId,
                    data: value,
                    synced_at: new Date().toISOString()
                });
            }

            // Batch upsert
            const { error } = await _client.from('progress').upsert(rows, {
                onConflict: 'user_id,curriculum,lesson_id'
            });

            if (error) throw error;
            return { success: true, itemCount: rows.length };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    async loadProgressFromCloud() {
        const user = this.getCurrentUser();
        if (!user) return {};

        const { data, error } = await _client
            .from('progress')
            .select('*')
            .eq('user_id', user.uid);

        if (error) {
            console.error('[SupabaseBackend] loadProgressFromCloud error:', error);
            return {};
        }

        const progress = {};
        for (const row of (data || [])) {
            const key = `${row.curriculum}_${row.lesson_id}`;
            progress[key] = row.data || row;
        }
        return progress;
    }

    async syncKnownWords(words) {
        const user = this.getCurrentUser();
        if (!user) return { success: false, error: 'Not authenticated' };

        try {
            const { error } = await _client.from('known_words').upsert({
                user_id: user.uid,
                words,
                last_updated: new Date().toISOString()
            }, { onConflict: 'user_id' });

            if (error) throw error;
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    async loadKnownWords() {
        const user = this.getCurrentUser();
        if (!user) return [];

        const { data, error } = await _client
            .from('known_words')
            .select('words')
            .eq('user_id', user.uid)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('[SupabaseBackend] loadKnownWords error:', error);
        }
        return data?.words || [];
    }

    // ─── Raw Access ─────────────────────────────────

    /** @returns Supabase client instance (use sparingly) */
    get rawClient() { return _client; }
}

// ─── Supabase Batch Writer ──────────────────────────
// Supabase doesn't have native batch writes like Firestore.
// We collect operations and execute them as parallel upserts.

class SupabaseBatch extends BatchWriter {
    constructor(client) {
        super();
        this._client = client;
        this._operations = [];
    }

    set(table, docId, data, options = {}) {
        this._operations.push({ type: 'set', table, docId, data, options });
    }

    delete(table, docId) {
        this._operations.push({ type: 'delete', table, docId });
    }

    async commit() {
        if (this._operations.length === 0) return;

        // Group by table for efficient bulk operations
        const byTable = {};
        const deletes = [];

        for (const op of this._operations) {
            if (op.type === 'set') {
                if (!byTable[op.table]) byTable[op.table] = [];
                byTable[op.table].push({ id: op.docId, ...op.data });
            } else if (op.type === 'delete') {
                deletes.push(op);
            }
        }

        const promises = [];

        // Bulk upserts per table
        for (const [table, rows] of Object.entries(byTable)) {
            promises.push(
                this._client.from(table).upsert(rows, { onConflict: 'id' })
            );
        }

        // Individual deletes
        for (const op of deletes) {
            promises.push(
                this._client.from(op.table).delete().eq('id', op.docId)
            );
        }

        const results = await Promise.allSettled(promises);
        const errors = results.filter(r => r.status === 'rejected' || r.value?.error);
        if (errors.length > 0) {
            console.error('[SupabaseBackend] Batch commit had errors:', errors);
        }

        // Reset
        this._operations = [];
    }
}
