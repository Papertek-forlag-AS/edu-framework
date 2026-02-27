/**
 * =================================================================
 * ERROR CAPTURE MODULE
 * =================================================================
 *
 * Captures console errors and warnings for inclusion in feedback reports.
 * Helps developers understand what went wrong when users report issues.
 */

const capturedErrors = [];
const MAX_ERRORS = 20;
const MAX_MESSAGE_LENGTH = 500;
let isCapturing = false;

// Store original console methods
let originalError = null;
let originalWarn = null;

/**
 * Start capturing console errors and warnings
 * Should be called early in app initialization
 */
export function startErrorCapture() {
    if (isCapturing) return;
    isCapturing = true;

    // Capture console.error
    originalError = console.error;
    console.error = (...args) => {
        addCapturedError('error', args.map(formatArg).join(' '));
        originalError.apply(console, args);
    };

    // Capture console.warn
    originalWarn = console.warn;
    console.warn = (...args) => {
        addCapturedError('warn', args.map(formatArg).join(' '));
        originalWarn.apply(console, args);
    };

    // Capture unhandled errors
    window.addEventListener('error', (event) => {
        const location = event.filename ? ` at ${event.filename}:${event.lineno}:${event.colno}` : '';
        addCapturedError('error', `${event.message}${location}`);
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason instanceof Error
            ? `${event.reason.name}: ${event.reason.message}`
            : String(event.reason);
        addCapturedError('error', `Unhandled rejection: ${reason}`);
    });

    console.log('[ErrorCapture] Started capturing errors');
}

/**
 * Stop capturing errors and restore original console methods
 */
export function stopErrorCapture() {
    if (!isCapturing) return;

    if (originalError) {
        console.error = originalError;
        originalError = null;
    }
    if (originalWarn) {
        console.warn = originalWarn;
        originalWarn = null;
    }

    isCapturing = false;
    console.log('[ErrorCapture] Stopped capturing errors');
}

/**
 * Format an argument for logging
 * @param {any} arg - The argument to format
 * @returns {string} Formatted string
 */
function formatArg(arg) {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
    if (typeof arg === 'object') {
        try {
            return JSON.stringify(arg);
        } catch {
            return String(arg);
        }
    }
    return String(arg);
}

/**
 * Add a captured error to the list
 * @param {string} type - 'error' or 'warn'
 * @param {string} message - The error message
 */
function addCapturedError(type, message) {
    // Truncate long messages
    const truncatedMessage = message.length > MAX_MESSAGE_LENGTH
        ? message.slice(0, MAX_MESSAGE_LENGTH) + '...'
        : message;

    capturedErrors.push({
        type,
        message: truncatedMessage,
        timestamp: Date.now()
    });

    // Keep only recent errors
    if (capturedErrors.length > MAX_ERRORS) {
        capturedErrors.shift();
    }
}

/**
 * Get captured errors for feedback report
 * @returns {Array} Array of captured error objects
 */
export function getCapturedErrors() {
    return [...capturedErrors];
}

/**
 * Get only errors from the last N minutes
 * @param {number} minutes - Number of minutes to look back
 * @returns {Array} Array of recent error objects
 */
export function getRecentErrors(minutes = 5) {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return capturedErrors.filter(e => e.timestamp >= cutoff);
}

/**
 * Clear captured errors
 */
export function clearCapturedErrors() {
    capturedErrors.length = 0;
}

/**
 * Check if error capture is active
 * @returns {boolean} True if capturing
 */
export function isErrorCaptureActive() {
    return isCapturing;
}

/**
 * Get count of captured errors
 * @returns {number} Number of captured errors
 */
export function getCapturedErrorCount() {
    return capturedErrors.length;
}
