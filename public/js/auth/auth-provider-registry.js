/**
 * =================================================================
 * AUTH PROVIDER REGISTRY
 * =================================================================
 *
 * Abstraction layer for authentication providers.
 * Instead of auth-ui.js hardcoding FEIDE and Google imports,
 * providers register themselves and the UI discovers them dynamically.
 *
 * Each provider must implement:
 *   - login()      → Promise<void>   Initiates the login flow
 *   - logout()     → Promise<boolean> Signs out (returns success)
 *   - id           → string           Unique provider ID
 *   - label        → string           Display label for button
 *   - icon         → string           SVG icon HTML (optional)
 *   - buttonClass  → string           CSS classes for button (optional)
 *   - priority     → number           Sort order (lower = first, default 10)
 *
 * Optional methods:
 *   - checkAuthStatus()  → Promise<void>  Handle redirect callbacks
 *   - exportUserData()   → Promise<void>  GDPR data export
 *   - deleteUserAccount()→ Promise<void>  GDPR account deletion
 */

const providers = new Map();

/**
 * Register an authentication provider.
 * @param {Object} provider - Provider implementation
 */
export function registerAuthProvider(provider) {
    if (!provider.id || !provider.login) {
        console.error('Auth provider must have id and login():', provider);
        return;
    }
    providers.set(provider.id, {
        priority: 10,
        buttonClass: 'bg-neutral-200 text-neutral-800',
        icon: '',
        ...provider
    });
}

/**
 * Get all registered providers, sorted by priority.
 * @returns {Array<Object>} Sorted provider list
 */
export function getAuthProviders() {
    return Array.from(providers.values())
        .sort((a, b) => (a.priority || 10) - (b.priority || 10));
}

/**
 * Get a specific provider by ID.
 * @param {string} id - Provider ID
 * @returns {Object|null}
 */
export function getAuthProvider(id) {
    return providers.get(id) || null;
}

/**
 * Check if any providers are registered.
 * @returns {boolean}
 */
export function hasAuthProviders() {
    return providers.size > 0;
}

/**
 * Call checkAuthStatus on all providers that support it.
 * Used on callback pages and initial load.
 */
export async function checkAllAuthStatus() {
    for (const provider of providers.values()) {
        if (typeof provider.checkAuthStatus === 'function') {
            try {
                await provider.checkAuthStatus();
            } catch (err) {
                console.error(`Auth status check failed for ${provider.id}:`, err);
            }
        }
    }
}

/**
 * Call logout on the active provider (or all providers).
 * @returns {Promise<boolean>}
 */
export async function logoutAll() {
    let success = false;
    for (const provider of providers.values()) {
        if (typeof provider.logout === 'function') {
            try {
                const result = await provider.logout();
                if (result) success = true;
            } catch (err) {
                console.error(`Logout failed for ${provider.id}:`, err);
            }
        }
    }
    return success;
}

/**
 * Export user data from all providers that support it.
 */
export async function exportAllUserData() {
    for (const provider of providers.values()) {
        if (typeof provider.exportUserData === 'function') {
            await provider.exportUserData();
        }
    }
}

/**
 * Delete user account from all providers that support it.
 */
export async function deleteAllUserAccounts() {
    for (const provider of providers.values()) {
        if (typeof provider.deleteUserAccount === 'function') {
            await provider.deleteUserAccount();
        }
    }
}

// --- Default Provider Registration ---
// FEIDE and Google are registered by default but can be overridden
// by content packages calling registerAuthProvider() with the same ID.

/**
 * Load and register the default FEIDE provider.
 * Called lazily — only when Firebase auth is available.
 */
export async function registerDefaultProviders() {
    try {
        const feideModule = await import('./firebase-feide-auth.js');
        registerAuthProvider({
            id: 'feide',
            label: 'Logg inn med FEIDE',
            priority: 1,
            buttonClass: 'bg-info-600 text-white hover:bg-info-700',
            icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>`,
            login: feideModule.loginWithFEIDE,
            logout: feideModule.logout,
            checkAuthStatus: feideModule.checkAuthStatus,
            exportUserData: feideModule.exportUserData,
            deleteUserAccount: feideModule.deleteUserAccount
        });
    } catch (err) {
        console.log('FEIDE auth module not available:', err.message);
    }

    try {
        const googleModule = await import('./google-auth.js');
        registerAuthProvider({
            id: 'google',
            label: 'Test med Google',
            priority: 5,
            buttonClass: 'bg-surface border-2 border-neutral-300 text-neutral-700 hover:border-error-500',
            icon: `<svg class="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>`,
            login: googleModule.loginWithGoogle,
            logout: async () => true // Google logout handled by Firebase signOut
        });
    } catch (err) {
        console.log('Google auth module not available:', err.message);
    }
}
