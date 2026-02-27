let debugEnabled = false;

try {
  if (typeof window !== 'undefined' && window.localStorage) {
    debugEnabled = window.localStorage.getItem('tysk-debug') === 'true';
  }
} catch (error) {
  debugEnabled = false;
}

export function debug(...args) {
  if (debugEnabled) {
    console.debug(...args);
  }
}

export function setDebugLogging(enabled) {
  debugEnabled = Boolean(enabled);
}

export function isDebugLoggingEnabled() {
  return debugEnabled;
}
