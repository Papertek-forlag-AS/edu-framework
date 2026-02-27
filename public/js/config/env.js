/**
 * =================================================================
 * ENVIRONMENT CONFIGURATION
 * =================================================================
 *
 * This file contains environment-specific configuration.
 * The app uses Firebase for authentication and localStorage for data storage.
 */

// Environment configuration (currently minimal - Firebase configured separately)
window.ENV = {
  // App mode: Firebase + localStorage
  MODE: 'firebase-localStorage'
};

console.log('Environment config loaded:', {
  mode: 'Firebase + localStorage'
});
