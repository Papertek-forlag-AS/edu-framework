/**
 * =================================================================
 * GOOGLE AUTHENTICATION MODULE (ALTERNATIVE TO FEIDE)
 * =================================================================
 *
 * Temporary alternative authentication for testing while FEIDE is being configured.
 * This allows you to test the app functionality without FEIDE.
 */

import {
  auth,
  firestore,
  isAuthAvailable,
  getCurrentUser,
  getGoogleAuthProvider
} from './firebase-client.js';
import { updateAuthUI } from './auth-ui.js';
import { showErrorToast } from '../error-handler.js';

/**
 * Login with Google using popup
 * @returns {Promise<void>}
 */
export async function loginWithGoogle() {
  if (!isAuthAvailable()) {
    showErrorToast('Firebase-innlogging er ikke konfigurert');
    return;
  }

  console.log('=== GOOGLE LOGIN DEBUG ===');
  console.log('Starting Google authentication...');

  const provider = getGoogleAuthProvider();
  if (!provider) {
    showErrorToast('Kunne ikke opprette Google auth provider');
    return;
  }
  provider.addScope('profile');
  provider.addScope('email');

  try {
    console.log('Opening Google sign-in popup...');
    const result = await auth.signInWithPopup(provider);

    console.log('Google sign-in successful:', result.user.email);

    // Create user profile
    await createGoogleUserProfile(result.user);

    // Known words auto-sync via cloud-sync.js (no migration needed)

    showSuccessToast('Logget inn med Google!');

  } catch (error) {
    console.error('Google login error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);

    let errorMessage = 'Kunne ikke logge inn med Google.';

    if (error.code === 'auth/popup-blocked') {
      errorMessage = 'Popup ble blokkert. Vennligst tillat popups for denne siden.';
    } else if (error.code === 'auth/popup-closed-by-user') {
      errorMessage = 'Innlogging ble avbrutt.';
    } else if (error.code === 'auth/network-request-failed') {
      errorMessage = 'Nettverksfeil. Sjekk internettforbindelsen din.';
    }

    showErrorToast(errorMessage);
  }
}

/**
 * Create or update Google user profile
 * @private
 */
async function createGoogleUserProfile(user) {
  if (!isAuthAvailable() || !user) return null;

  const userProfile = {
    user_id: user.uid,
    full_name: user.displayName || 'Anonymous',
    email: user.email,
    organization: 'Google',
    provider: 'google.com',
    last_login: new Date().toISOString()
  };

  try {
    await firestore.collection('user_profiles').doc(user.uid).set(userProfile, { merge: true });
    console.log('Google user profile created:', userProfile);
    return userProfile;
  } catch (error) {
    console.error('Error creating Google user profile:', error);
    return null;
  }
}

function showSuccessToast(message) {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-success-500 text-white px-6 py-3 rounded-lg shadow-lg';
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'all 0.5s ease-out';
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 500);
  }, 3000);
}
