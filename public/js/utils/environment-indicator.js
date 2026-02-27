/**
 * =================================================================
 * ENVIRONMENT INDICATOR MODULE
 * =================================================================
 *
 * Displays a visual indicator badge for non-production environments.
 * Helps developers and testers know which environment they're using.
 */

import { getCurrentEnvironment } from '../auth/firebase-client.js';

/**
 * Initialize and display environment indicator badge
 */
export function initEnvironmentIndicator() {
    const environment = getCurrentEnvironment();

    // Only show indicator for dev and staging
    if (environment === 'production') {
        return;
    }

    // Create indicator badge
    const indicator = document.createElement('div');
    indicator.id = 'environment-indicator';
    indicator.setAttribute('role', 'status');
    indicator.setAttribute('aria-live', 'polite');

    // Style based on environment
    const styles = {
        development: {
            bg: '#10b981', // green
            text: '🛠️ DEV MODE',
            title: 'Development Environment (tysk01-dev)'
        },
        staging: {
            bg: '#f59e0b', // amber
            text: '🧪 STAGING',
            title: 'Staging Environment (tysk01-staging)'
        }
    };

    const config = styles[environment];

    // Apply styles - positioned bottom-left to avoid iOS banner and login UI
    Object.assign(indicator.style, {
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        backgroundColor: config.bg,
        color: 'white',
        padding: '8px 16px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 'bold',
        zIndex: '9999',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        cursor: 'help',
        userSelect: 'none'
    });

    indicator.textContent = config.text;
    indicator.title = config.title;

    // Add hover effect
    indicator.addEventListener('mouseenter', () => {
        indicator.style.transform = 'scale(1.05)';
        indicator.style.transition = 'transform 0.2s ease';
    });

    indicator.addEventListener('mouseleave', () => {
        indicator.style.transform = 'scale(1)';
    });

    // Add to page
    document.body.appendChild(indicator);

    console.log(`✅ Environment indicator displayed: ${environment.toUpperCase()}`);
}

/**
 * Initialize after AppShell has finished rendering
 * Uses delay to ensure AppShell DOM manipulation is complete
 */
function initWithDelay() {
    // Wait for AppShell to finish DOM manipulation
    setTimeout(() => {
        initEnvironmentIndicator();

        // Set up observer to re-add badge if AppShell removes it
        const observer = new MutationObserver(() => {
            const existing = document.getElementById('environment-indicator');
            if (!existing) {
                initEnvironmentIndicator();
            }
        });

        // Watch for body child changes (AppShell rebuilding DOM)
        observer.observe(document.body, { childList: true });

        // Stop observing after 5 seconds (AppShell should be done by then)
        setTimeout(() => observer.disconnect(), 5000);
    }, 500);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWithDelay);
} else {
    initWithDelay();
}
