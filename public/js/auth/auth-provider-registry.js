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
// Providers are defined in auth/providers/*.js as self-contained modules.
// Each module exports a register function and provider metadata.
// To add a new provider (Apple, Microsoft, etc.), create a new file
// in auth/providers/ and add it to the list below.

/**
 * Available provider modules.
 * Each entry is a dynamic import path to a provider definition file.
 * To add a new provider: create auth/providers/myProvider.js and add it here.
 */
const DEFAULT_PROVIDER_MODULES = [
    () => import('./providers/feide.js').then(m => m.registerFeideProvider()),
    () => import('./providers/google.js').then(m => m.registerGoogleProvider()),
    // Add new providers here:
    // () => import('./providers/apple.js').then(m => m.registerAppleProvider()),
    // () => import('./providers/microsoft.js').then(m => m.registerMicrosoftProvider()),
];

/**
 * Load and register all default auth providers.
 * Called lazily — only when auth is available.
 * Each provider module handles its own error catching.
 */
export async function registerDefaultProviders() {
    await Promise.allSettled(
        DEFAULT_PROVIDER_MODULES.map(loader => loader())
    );
}
