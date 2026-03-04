/**
 * =================================================================
 * FEIDE AUTH PROVIDER DEFINITION
 * =================================================================
 *
 * Self-contained provider config for FEIDE (Norwegian education SSO).
 * Dynamically imports the Firebase-FEIDE auth module at registration time.
 *
 * To register: import and call registerFeideProvider()
 * Or let registerDefaultProviders() handle it automatically.
 */

import { registerAuthProvider } from '../auth-provider-registry.js';

/** Provider metadata */
export const feideProvider = {
    id: 'feide',
    label: 'Logg inn med FEIDE',
    priority: 1,
    buttonClass: 'bg-info-600 text-white hover:bg-info-700',
    icon: `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
    </svg>`
};

/**
 * Register the FEIDE provider with the auth registry.
 * Dynamically loads the auth module to avoid eager imports.
 */
export async function registerFeideProvider() {
    try {
        const module = await import('../firebase-feide-auth.js');
        registerAuthProvider({
            ...feideProvider,
            login: module.loginWithFEIDE,
            logout: module.logout,
            checkAuthStatus: module.checkAuthStatus,
            exportUserData: module.exportUserData,
            deleteUserAccount: module.deleteUserAccount
        });
    } catch (err) {
        console.log('FEIDE auth module not available:', err.message);
    }
}
