
/**
 * =================================================================
 * FIREBASE-FEIDE AUTHENTICATION MODULE
 * =================================================================
 *
 * Handles FEIDE OpenID Connect authentication using Firebase.
 * Provides login, logout, and session management functions.
 */

import {
  auth,
  firestore,
  isAuthAvailable,
  getCurrentUser,
  getFeideUserId,
  getUserFullName,
  getOAuthProvider
} from './firebase-client.js';
import { updateAuthUI } from './auth-ui.js';
import { showErrorToast } from '../error-handler.js';

/**
 * Initiate FEIDE login flow.
 * Redirects the user to the FEIDE login page via Firebase Auth.
 * NOTE: You must configure an OIDC provider for FEIDE in your Firebase Console.
 * The provider ID used here is 'oidc.feide'.
 * @returns {Promise<void>}
 */
export async function loginWithFEIDE() {
  if (!isAuthAvailable()) {
    showErrorToast('Firebase-innlogging er ikke konfigurert');
    return;
  }

  console.log('=== FEIDE LOGIN DEBUG ===');
  console.log('Firebase Auth Domain:', auth.app.options.authDomain);
  console.log('Firebase Project ID:', auth.app.options.projectId);
  console.log('Current origin:', window.location.origin);

  // Use the Generic OAuth provider for OIDC
  const provider = getOAuthProvider('oidc.feide');
  if (!provider) {
    showErrorToast('Kunne ikke opprette FEIDE auth provider');
    return;
  }

  console.log('OIDC Provider ID:', 'oidc.feide');
  console.log('Provider created successfully');

  // Add required scopes for FEIDE
  provider.addScope('openid');
  provider.addScope('profile');
  provider.addScope('email');
  provider.addScope('userid-feide');

  console.log('Scopes added:', ['openid', 'profile', 'email', 'userid-feide']);

  // Note: Firebase will automatically set context_uri to the current origin
  // Make sure your Vercel domain is configured in FEIDE Dataporten!

  try {
    // Try popup flow first (better for cross-domain, works on most browsers)
    console.log('Attempting popup flow for FEIDE login...');

    try {
      const result = await auth.signInWithPopup(provider);

      if (result && result.user) {
        console.log('=== FEIDE LOGIN SUCCESSFUL (POPUP) ===');
        console.log('User:', result.user.email);
        console.log('Provider:', result.user.providerData);

        // Create user profile
        await createOrUpdateUserProfile(result.user, result.additionalUserInfo);

        // Known words auto-sync via cloud-sync.js (no migration needed)

        // Update UI
        updateAuthUI(result.user);

        console.log('=== FEIDE LOGIN COMPLETE ===');
      }
    } catch (popupError) {
      // Popup blocked or not supported (iOS Safari, embedded browsers, etc.)
      if (popupError.code === 'auth/popup-blocked' ||
          popupError.code === 'auth/operation-not-supported-in-this-environment' ||
          popupError.code === 'auth/cancelled-popup-request') {

        console.log('⚠️ Popup flow failed, falling back to redirect flow');
        console.log('Reason:', popupError.code);

        // Fall back to redirect flow for browsers that don't support popups
        await auth.signInWithRedirect(provider);
        // After redirect, checkAuthStatus() will handle the result
        return;
      } else {
        // Re-throw other errors
        throw popupError;
      }
    }
  } catch (error) {
    console.error('FEIDE login error:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      details: error
    });

    // Provide more specific error messages
    let errorMessage = 'Kunne ikke logge inn med FEIDE.';

    if (error.code === 'auth/popup-blocked') {
      errorMessage = 'Popup ble blokkert. Vennligst tillat popups for denne siden.';
    } else if (error.code === 'auth/network-request-failed') {
      errorMessage = 'Nettverksfeil. Sjekk internettforbindelsen din.';
    } else if (error.code === 'auth/invalid-oauth-provider') {
      errorMessage = 'FEIDE-innlogging er ikke konfigurert riktig i Firebase. Se FEIDE_FIREBASE_SETUP.md';
    } else if (error.message && error.message.includes('400')) {
      errorMessage = 'FEIDE avviste forespørselen (400 Bad Request). Sjekk Firebase OIDC-konfigurasjonen.';
    }

    showErrorToast(errorMessage);
  }
}

/**
 * Logout from Firebase and FEIDE.
 * Always clears user-specific localStorage to prevent data leaking between users.
 * Cloud data is NOT affected — it will be fetched fresh on next login.
 * @returns {Promise<boolean>} True if logout is successful.
 */
export async function logout() {
  if (!isAuthAvailable()) {
    return false;
  }

  try {
    // Always clear user-specific localStorage to prevent data leaking between users.
    // When User A logs out and User B logs in, B should NOT see A's vocabulary progress.
    // Cloud data is safe — each user's data is fetched fresh from Firestore on login.
    const userDataPrefixes = ['vocabProfile', 'vg1-', 'us-', 'tysk'];
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && userDataPrefixes.some(prefix => key.startsWith(prefix))) {
        keysToRemove.push(key);
      }
    }
    if (keysToRemove.length > 0) {
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`[Logout] Cleared ${keysToRemove.length} user-specific localStorage keys`);
    }

    // Check if user is logged in with FEIDE
    const currentUser = auth.currentUser;
    const isFEIDEUser = currentUser?.providerData?.some(p => p.providerId === 'oidc.feide');

    console.log('Logging out...', { isFEIDEUser, providers: currentUser?.providerData });

    // For FEIDE users, get the ID token BEFORE signing out (required for proper logout)
    let idToken = null;
    if (isFEIDEUser && currentUser) {
      try {
        idToken = await currentUser.getIdToken();
        console.log('ID token retrieved for FEIDE logout');
      } catch (error) {
        console.warn('Could not get ID token for logout:', error);
      }
    }

    // Clear Firebase OAuth state from localStorage to prevent session conflicts
    // This removes pending redirect operations and stale OAuth state
    const firebaseKeysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('firebase:') || key.includes('pendingRedirect'))) {
        firebaseKeysToRemove.push(key);
      }
    }
    if (firebaseKeysToRemove.length > 0) {
      firebaseKeysToRemove.forEach(key => localStorage.removeItem(key));
      console.log('Cleared Firebase OAuth state from localStorage:', firebaseKeysToRemove.length, 'keys');
    }

    // Sign out from Firebase
    await auth.signOut();
    updateAuthUI(null);
    console.log('Firebase logout successful');

    // If user was logged in with FEIDE, redirect to FEIDE logout to clear FEIDE session
    if (isFEIDEUser) {
      console.log('FEIDE user detected - redirecting to FEIDE OpenID Connect endsession endpoint');

      // Get current URL without hash/query params for clean redirect
      const currentOrigin = window.location.origin;
      const redirectUrl = `${currentOrigin}/index.html`;

      // FEIDE OpenID Connect endsession endpoint (correct standard endpoint)
      // See: https://docs.feide.no/reference/oauth_oidc/logout.html
      let feideLogoutUrl = 'https://auth.dataporten.no/openid/endsession';

      // Add parameters as query string
      const params = new URLSearchParams();

      // id_token_hint is REQUIRED for proper OIDC logout
      if (idToken) {
        params.append('id_token_hint', idToken);
      }

      // post_logout_redirect_uri should be registered in FEIDE Dataporten dashboard
      params.append('post_logout_redirect_uri', redirectUrl);

      feideLogoutUrl += '?' + params.toString();

      console.log('Redirecting to FEIDE logout:', feideLogoutUrl);

      // Redirect to FEIDE logout, which will then redirect back to our app
      window.location.href = feideLogoutUrl;
    } else {
      // For non-FEIDE users (Google), just reload the page
      console.log('Non-FEIDE user - simple page reload');
      window.location.reload();
    }

    return true;
  } catch (error) {
    console.error('Logout error:', error);
    showErrorToast('Kunne ikke logge ut');
    return false;
  }
}

/**
 * Create or update a user profile in Firestore.
 * @private
 * @param {firebase.User} user - User object from Firebase Auth.
 * @param {Object} additionalUserInfo - Additional info from OIDC provider.
 * @returns {Promise<Object|null>} User profile or null on error.
 */
async function createOrUpdateUserProfile(user, additionalUserInfo) {
  if (!isAuthAvailable() || !user) return null;

  // Always use Firebase UID as document ID (for security rules compatibility)
  // Store FEIDE ID as a field in the document
  const feideId = getFeideUserId(user);
  const userId = user.uid;

  console.log('Creating/updating user profile:', {
    userId,
    feideId,
    firebaseUid: user.uid,
    email: user.email,
    displayName: user.displayName
  });

  // Extract organization from the OIDC profile claims if available
  const organization = additionalUserInfo?.profile?.['dataporten-userid_sec']?.[0] || 'FEIDE';

  const userProfile = {
    user_id: userId,
    firebase_uid: user.uid,  // Store Firebase UID for security rules
    feide_id: feideId || null,  // Store FEIDE ID if available
    full_name: getUserFullName(user),
    email: user.email,
    organization: organization,
    provider: feideId ? 'oidc.feide' : 'firebase',
    last_login: new Date().toISOString()
  };

  try {
    // Use .set() with { merge: true } to create or update the document
    await firestore.collection('user_profiles').doc(userId).set(userProfile, { merge: true });
    console.log('User profile updated in Firestore:', userProfile);
    return userProfile;
  } catch (error) {
    console.error('Exception creating/updating user profile:', error);
    return null;
  }
}

// Track if we've already processed the redirect result
let redirectResultProcessed = false;

/**
 * Checks authentication status and restores the session.
 * This should be called on app startup.
 * It sets up an observer that listens for auth state changes.
 */
export function checkAuthStatus() {
  if (!isAuthAvailable()) {
    updateAuthUI(null);
    return;
  }

  // First, check if we just came back from a redirect (only once on page load)
  if (!redirectResultProcessed) {
    redirectResultProcessed = true;
    auth.getRedirectResult()
      .then(async (result) => {
        if (result && result.user) {
          console.log('=== FEIDE REDIRECT RESULT OBTAINED ===');
          console.log('User:', result.user.email);
          console.log('Provider:', result.user.providerData);

          await createOrUpdateUserProfile(result.user, result.additionalUserInfo);

          // Known words auto-sync via cloud-sync.js (no migration needed)

          // IMPORTANT: Explicitly update UI after successful redirect
          console.log('Explicitly updating UI after FEIDE redirect');
          updateAuthUI(result.user);

          console.log('=== FEIDE LOGIN COMPLETE ===');
        } else {
          console.log('No redirect result (user probably navigated directly to page)');
        }
      })
      .catch((error) => {
        console.error('Error getting redirect result:', error);
        console.error('Redirect error details:', {
          code: error.code,
          message: error.message
        });

        // Show user-friendly error messages for critical errors
        if (error.code === 'auth/invalid-oauth-provider') {
          showErrorToast('FEIDE-innlogging er ikke riktig konfigurert. Kontakt administrator.');
        } else if (error.code === 'auth/network-request-failed') {
          showErrorToast('Nettverksfeil under innlogging. Prøv igjen.');
        } else if (error.message && error.message.includes('400')) {
          showErrorToast('FEIDE avviste innloggingen. Sjekk Firebase-konfigurasjonen.');
        } else if (error.code && error.code !== 'auth/no-redirect-operation') {
          // Only show error if it's not just "no redirect operation in progress"
          console.warn('Redirect result error (non-critical):', error.message);
        }
      });
  }

  // Set up auth state observer (fires on every auth state change)
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      // User is signed in.
      console.log('Auth state changed - User signed in:', user.email);
      updateAuthUI(user);
    } else {
      // User is signed out.
      console.log('Auth state changed - User signed out');
      updateAuthUI(null);
    }
  });
}

/**
 * Export user data (GDPR Article 15 - Right to Access).
 * Downloads user profile data as JSON.
 * Note: This is a simplified version. A complete solution would require a backend function.
 * @returns {Promise<boolean>} True if export is successful.
 */
export async function exportUserData() {
  if (!isAuthAvailable()) {
    showErrorToast('Du må være logget inn for å eksportere data');
    return false;
  }

  const user = await getCurrentUser();
  if (!user) {
    showErrorToast('Du må være logget inn for å eksportere data');
    return false;
  }

  // Use FEIDE ID if available, otherwise use Firebase UID
  const userId = getFeideUserId(user) || user.uid;

  try {
    // Fetch all user-related data from Firestore.
    // This example only fetches the user profile.
    const profileDoc = await firestore.collection('user_profiles').doc(userId).get();
    
    if (!profileDoc.exists) {
        showErrorToast('Fant ingen brukerdata å eksportere.');
        return false;
    }
    
    const userData = {
        profile: profileDoc.data(),
        // TODO: Add other user data collections here, e.g., progress, settings etc.
    };

    const jsonString = JSON.stringify(userData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    const date = new Date().toISOString().slice(0, 10);
    anchor.download = `firebase-data-export-${date}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);

    console.log('User data exported successfully');
    return true;
  } catch (error) {
    console.error('Exception exporting user data:', error);
    showErrorToast('Kunne ikke eksportere data');
    return false;
  }
}

/**
 * Delete all user data (GDPR Article 17 - Right to Erasure).
 * WARNING: This is a simplified and potentially incomplete client-side implementation.
 * For a robust solution, use a Firebase Cloud Function triggered by user deletion.
 * @returns {Promise<boolean>} True if deletion is successful.
 */
export async function deleteUserAccount() {
  if (!isAuthAvailable()) {
    showErrorToast('Du må være logget inn for å slette kontoen');
    return false;
  }

  const user = await getCurrentUser();
  if (!user) {
    showErrorToast('Du må være logget inn for å slette kontoen');
    return false;
  }

  // Use FEIDE ID if available, otherwise use Firebase UID
  const userId = getFeideUserId(user) || user.uid;

  if (!confirm('ADVARSEL: Dette vil permanent slette din brukerkonto og all relatert data i skyen!\nDette kan IKKE angres.\nEr du sikker?')) {
    return false;
  }
  if (!confirm('Er du HELT sikker? Din konto vil bli slettet for godt.')) {
    return false;
  }

  try {
    // 1. Delete user data from Firestore
    // This is a simplified example. You should delete ALL user data from all collections.
    await firestore.collection('user_profiles').doc(userId).delete();
    
    // TODO: Delete user data from other collections here.
    // E.g. await firestore.collection('user_progress').doc(feideId).delete();

    // 2. Delete the user from Firebase Authentication
    await user.delete();
    
    alert('Kontoen din er slettet fra Firebase.');
    console.log('User account deleted successfully');
    
    // Reload to clear all state
    window.location.href = '/index.html';
    
    return true;
  } catch (error) {
    console.error('Exception deleting user account:', error);
    showErrorToast('Kunne ikke slette kontoen. Du må kanskje logge inn på nytt for å fullføre slettingen.');
    return false;
  }
}

