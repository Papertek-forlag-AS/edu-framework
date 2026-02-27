/**
 * Centralized Error Handling System
 * Prevents app crashes and provides user-friendly error messages
 */

import { debug } from './logger.js';

// Error types
export const ErrorType = {
    STORAGE: 'storage',
    NETWORK: 'network',
    EXERCISE: 'exercise',
    AUDIO: 'audio',
    SERVICE_WORKER: 'service_worker',
    GENERAL: 'general'
};

// Error logger (could be extended to send to analytics)
class ErrorLogger {
    constructor() {
        this.errors = [];
        this.maxErrors = 100;
    }

    log(error, context = {}) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            message: error.message || String(error),
            stack: error.stack,
            context,
            type: context.type || ErrorType.GENERAL
        };

        this.errors.push(errorEntry);

        // Keep only last N errors
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }

        // Log to console in development
        console.error('Error logged:', errorEntry);

        return errorEntry;
    }

    getErrors() {
        return this.errors;
    }

    clearErrors() {
        this.errors = [];
    }
}

export const errorLogger = new ErrorLogger();

/**
 * Show user-friendly error toast
 */
export function showErrorToast(message, duration = 5000) {
    const existingToast = document.getElementById('error-toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.id = 'error-toast';
    toast.className = 'fixed bottom-4 right-4 z-50 bg-error-600 text-white px-6 py-4 rounded-lg shadow-lg max-w-md animate-slide-in';
    toast.innerHTML = `
        <div class="flex items-start gap-3">
            <span class="text-2xl flex-shrink-0">⚠️</span>
            <div class="flex-1">
                <div class="font-bold">Noe gikk galt</div>
                <div class="text-sm mt-1">${message}</div>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="text-white hover:text-neutral-200">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.transition = 'all 0.3s ease-out';
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
}

/**
 * Safe localStorage wrapper with error handling
 */
export const safeStorage = {
    set(key, value) {
        try {
            if (typeof localStorage === 'undefined') {
                throw new Error('localStorage is not available');
            }
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            errorLogger.log(error, {
                type: ErrorType.STORAGE,
                action: 'set',
                key
            });

            // Check if it's a quota exceeded error
            if (error.name === 'QuotaExceededError') {
                showErrorToast('Lagringsplassen er full. Noen av fremgangen din kan ikke lagres.');
            }
            return false;
        }
    },

    get(key, defaultValue = null) {
        try {
            if (typeof localStorage === 'undefined') {
                return defaultValue;
            }
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            errorLogger.log(error, {
                type: ErrorType.STORAGE,
                action: 'get',
                key
            });
            return defaultValue;
        }
    },

    remove(key) {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem(key);
                return true;
            }
        } catch (error) {
            errorLogger.log(error, {
                type: ErrorType.STORAGE,
                action: 'remove',
                key
            });
        }
        return false;
    },

    isAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch {
            return false;
        }
    }
};

/**
 * Safe function executor with error boundary
 */
export function safeExecute(fn, context = {}, fallback = null) {
    try {
        return fn();
    } catch (error) {
        errorLogger.log(error, { ...context, type: context.type || ErrorType.GENERAL });

        if (context.showToast !== false) {
            showErrorToast(
                context.userMessage || 'En feil oppstod. Vennligst prøv igjen.'
            );
        }

        return fallback;
    }
}

/**
 * Safe async function executor
 */
export async function safeExecuteAsync(fn, context = {}, fallback = null) {
    try {
        return await fn();
    } catch (error) {
        errorLogger.log(error, { ...context, type: context.type || ErrorType.GENERAL });

        if (context.showToast !== false) {
            showErrorToast(
                context.userMessage || 'En feil oppstod. Vennligst prøv igjen.'
            );
        }

        return fallback;
    }
}

/**
 * Feature detection utilities
 */
export const features = {
    localStorage: () => safeStorage.isAvailable(),
    serviceWorker: () => 'serviceWorker' in navigator,
    fetch: () => typeof fetch !== 'undefined',
    audioContext: () => typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined'
};

/**
 * Initialize error handling
 */
export function initErrorHandling() {
    // Global error handler
    window.addEventListener('error', (event) => {
        errorLogger.log(event.error || event.message, {
            type: ErrorType.GENERAL,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
        });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
        errorLogger.log(event.reason, {
            type: ErrorType.GENERAL,
            promise: true
        });

        // Prevent default to avoid console warnings
        event.preventDefault();

        showErrorToast('En uventet feil oppstod. Vennligst last inn siden på nytt om problemet vedvarer.');
    });

    // Check for essential features
    if (!features.localStorage()) {
        console.warn('localStorage is not available. Progress will not be saved.');
    }

    // Add animation styles if not present
    if (!document.querySelector('#error-handler-styles')) {
        const style = document.createElement('style');
        style.id = 'error-handler-styles';
        style.textContent = `
            @keyframes slide-in {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            .animate-slide-in {
                animation: slide-in 0.3s ease-out;
            }
        `;
        document.head.appendChild(style);
    }

    debug('✅ Error handling initialized');
}

// Auto-initialize when module loads
if (typeof window !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initErrorHandling);
} else if (typeof window !== 'undefined') {
    initErrorHandling();
}
