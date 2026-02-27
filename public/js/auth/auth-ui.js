/**
 * =================================================================
 * AUTH UI COMPONENTS
 * =================================================================
 *
 * Manages authentication UI: login button, user menu, profile display.
 * Updates UI based on authentication state using Firebase.
 */

import { loginWithFEIDE, logout, exportUserData, deleteUserAccount, checkAuthStatus } from './firebase-feide-auth.js';
import { loginWithGoogle } from './google-auth.js';
import { isAuthAvailable, getUserFullName, getUserOrganization } from './firebase-client.js';
import { syncProgressFromCloud, startAutoSync, stopAutoSync } from '../sync/cloud-sync.js';

let autoSyncIntervalId = null;

/**
 * Gets user initials from a Firebase user object.
 * @param {firebase.User} user
 * @returns {string}
 */
function getUserInitials(user) {
  const fullName = getUserFullName(user);
  if (!fullName) return '??';
  const nameParts = fullName.trim().split(' ');
  if (nameParts.length > 1) {
    const firstInitial = nameParts[0].charAt(0).toUpperCase();
    const lastInitial = nameParts[nameParts.length - 1].charAt(0).toUpperCase();
    return `${firstInitial}${lastInitial}`;
  }
  return fullName.substring(0, 2).toUpperCase();
}

/**
 * Initialize authentication UI
 * Sets up event listeners for login/logout buttons and starts auth check.
 */
export function initAuthUI() {
  if (!isAuthAvailable()) {
    console.log('Auth not available - hiding auth UI');
    hideAuthUI();
    return;
  }

  // Immediately check the authentication status on startup
  checkAuthStatus();

  // Setup FEIDE login button
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', handleLoginClick);
  }

  // Setup Google login button
  const googleLoginBtn = document.getElementById('google-login-btn');
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', handleGoogleLoginClick);
  }

  // Setup logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogoutClick);
  }

  // Setup user menu toggle
  const userMenuBtn = document.getElementById('user-menu-btn');
  const userDropdown = document.getElementById('user-dropdown');
  if (userMenuBtn && userDropdown) {
    userMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('hidden');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      userDropdown.classList.add('hidden');
    });
  }

  // Setup export data button
  const exportBtn = document.getElementById('export-data-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      await exportUserData();
    });
  }

  // Setup delete account button
  const deleteBtn = document.getElementById('delete-account-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      await deleteUserAccount();
    });
  }

  // Setup manual sync button
  const syncBtn = document.getElementById('manual-sync-btn');
  if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
      await syncProgressFromCloud();
    });
  }
}

/**
 * Handle FEIDE login button click
 * @private
 */
async function handleLoginClick() {
  await loginWithFEIDE();
}

/**
 * Handle Google login button click
 * @private
 */
async function handleGoogleLoginClick() {
  await loginWithGoogle();
}

/**
 * Handle logout button click
 * @private
 */
async function handleLogoutClick() {
  const success = await logout(); // Always clears user-specific localStorage
  if (success) {
    // Stop auto-sync
    if (autoSyncIntervalId) {
      stopAutoSync(autoSyncIntervalId);
      autoSyncIntervalId = null;
    }

    // Show logged out message
    showToast('Du er nå logget ut', 'success');
  }
}

/**
 * Update UI to reflect authentication state
 * @param {firebase.User|null} user - User object or null if not logged in
 */
export async function updateAuthUI(user) {
  const userMenu = document.getElementById('user-menu');
  const teacherLoginBtn = document.getElementById('teacher-login-btn');

  if (!isAuthAvailable()) {
    hideAuthUI();
    return;
  }

  if (!user) {
    // Show login buttons, hide user menu
    const loginButtons = document.getElementById('login-buttons');
    if (loginButtons) loginButtons.classList.remove('hidden');
    if (userMenu) userMenu.classList.add('hidden');
    if (teacherLoginBtn) teacherLoginBtn.classList.add('hidden');

    // Stop auto-sync
    if (autoSyncIntervalId) {
      stopAutoSync(autoSyncIntervalId);
      autoSyncIntervalId = null;
    }

    return;
  }

  // Hide login buttons, show user menu
  const loginButtons = document.getElementById('login-buttons');
  if (loginButtons) loginButtons.classList.add('hidden');
  if (userMenu) userMenu.classList.remove('hidden');
  if (teacherLoginBtn) {
    teacherLoginBtn.classList.remove('hidden');
  }

  // Update user info in menu
  const userInitials = document.getElementById('user-initials');
  const userName = document.getElementById('user-name');
  const userNameInDropdown = document.getElementById('user-name-dropdown');
  const userEmail = document.getElementById('user-email');
  const userOrg = document.getElementById('user-organization');

  if (userInitials) userInitials.textContent = getUserInitials(user);
  if (userName) userName.textContent = getUserFullName(user);
  if (userNameInDropdown) userNameInDropdown.textContent = getUserFullName(user);
  if (userEmail) userEmail.textContent = user.email || '';
  if (userOrg) {
    const org = await getUserOrganization(user);
    if (org) {
      userOrg.textContent = org;
      userOrg.classList.remove('hidden');
    } else {
      userOrg.classList.add('hidden');
    }
  }

  // Start auto-sync
  if (!autoSyncIntervalId) {
    autoSyncIntervalId = startAutoSync();
  }

  // Sync from cloud on login
  setTimeout(() => {
    syncProgressFromCloud();
  }, 1000);
}

/**
 * Hide all authentication UI (when auth is not configured)
 * @private
 */
function hideAuthUI() {
  const authContainer = document.getElementById('auth-container');
  if (authContainer) {
    authContainer.classList.add('hidden');
  }
}

/**
 * Show a toast notification
 * @private
 * @param {string} message - Message to display
 * @param {string} type - 'success', 'error', or 'info'
 */
function showToast(message, type = 'info') {
  const colors = {
    success: 'bg-success-500',
    error: 'bg-error-500',
    info: 'bg-info-500'
  };

  const toast = document.createElement('div');
  toast.className = `fixed top-4 left-1/2 transform -translate-x-1/2 z-50 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg`;
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'all 0.5s ease-out';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(-20px)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 500);
  }, 3000);
}

/**
 * Inject auth UI HTML into the page
 * Call this on pages that don't have auth UI already
 */
export function injectAuthUI() {
  // Determine if this is the German portal (for iOS app link)
  const isGermanPortal = window.location.pathname.includes('/tysk/') ||
    (!window.location.pathname.includes('/spansk/') && !window.location.pathname.includes('/ordtrener/spansk'));

  // Check if auth container already exists
  if (document.getElementById('auth-container')) {
    return;
  }

  // iOS app link HTML (only for German portal)
  // Temporarily points to "coming soon" page while app is being transferred to business account
  const iosAppLink = isGermanPortal ? `
        <a href="../ios-app.html"
           class="flex items-center gap-2 bg-neutral-800 text-white px-3 py-2 rounded-lg hover:bg-neutral-900 transition-colors shadow-lg text-sm">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
          iOS-app
        </a>` : '';

  const authHTML = `
    <div id="auth-container" class="fixed top-4 right-4 z-50">
      <!-- Login Buttons (shown when NOT logged in) -->
      <div id="login-buttons" class="flex flex-col gap-2">
        <button id="login-btn" class="bg-info-600 text-white px-4 py-2 rounded-lg hover:bg-info-700 transition-colors shadow-lg flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          Logg inn med FEIDE
        </button>

        <button id="google-login-btn" class="bg-surface border-2 border-neutral-300 text-neutral-700 px-4 py-2 rounded-lg hover:border-error-500 transition-colors shadow-lg flex items-center gap-2">
          <svg class="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Test med Google
        </button>
      </div>

      ${iosAppLink}

      <!-- User Menu (shown when logged in) -->
      <div id="user-menu" class="hidden relative">
        <button id="user-menu-btn" class="flex items-center gap-2 bg-surface border-2 border-neutral-300 rounded-lg px-3 py-2 hover:border-info-500 transition-colors shadow-lg">
          <div class="w-8 h-8 bg-info-600 rounded-full flex items-center justify-center text-white font-bold">
            <span id="user-initials">??</span>
          </div>
          <div class="text-left hidden sm:block">
            <div class="font-semibold text-sm text-neutral-800" id="user-name">Laster...</div>
            <div class="text-xs text-success-600 font-medium">Logget inn</div>
          </div>
          <svg class="w-4 h-4 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <!-- Dropdown Menu -->
        <div id="user-dropdown" class="hidden absolute right-0 mt-2 w-72 bg-surface border-2 border-neutral-200 rounded-lg shadow-xl">
          <!-- User Info Section -->
          <div class="p-4 border-b border-neutral-200">
            <div class="font-semibold text-neutral-800" id="user-name-dropdown">Laster...</div>
            <div class="text-sm text-neutral-600 mt-1" id="user-email">laster@example.com</div>
            <div class="text-xs text-neutral-500 mt-1" id="user-organization"></div>
          </div>

          <!-- Menu Options -->
          <div class="p-2">
            <button id="manual-sync-btn" class="w-full text-left px-3 py-2 hover:bg-neutral-100 rounded flex items-center gap-2 text-neutral-700">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Synkroniser nå
            </button>

            <button id="export-data-btn" class="w-full text-left px-3 py-2 hover:bg-neutral-100 rounded flex items-center gap-2 text-neutral-700">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Last ned mine data
            </button>

            <hr class="my-2 border-neutral-200">

            <button id="logout-btn" class="w-full text-left px-3 py-2 hover:bg-error-50 rounded flex items-center gap-2 text-error-600 font-medium">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logg ut
            </button>

            <button id="delete-account-btn" class="w-full text-left px-3 py-2 hover:bg-error-50 rounded flex items-center gap-2 text-error-600 text-sm mt-1">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Slett konto
            </button>
          </div>
        </div>
      </div>

    </div>

    <!-- Sync Status Indicator -->
    <div id="sync-status" class="hidden fixed bottom-4 right-4 px-3 py-2 rounded-lg shadow-lg">
    </div>
  `;

  // Insert at beginning of body
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = authHTML;
  document.body.insertBefore(tempDiv.firstElementChild, document.body.firstChild);
  document.body.appendChild(tempDiv.lastElementChild);

  // Initialize after injection
  initAuthUI();
}
