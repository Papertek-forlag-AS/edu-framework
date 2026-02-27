/**
 * Accessibility Enhancements
 * Improves usability for keyboard users, screen readers, and assistive technologies
 */

import { debug } from './logger.js';

/**
 * Announce message to screen readers
 * @param {string} message - Message to announce
 * @param {string} priority - 'polite' (default) or 'assertive'
 */
export function announce(message, priority = 'polite') {
  const announcer = getOrCreateAnnouncer(priority);
  announcer.textContent = '';

  // Small delay to ensure screen readers pick up the change
  setTimeout(() => {
    announcer.textContent = message;
  }, 100);
}

/**
 * Get or create ARIA live region for announcements
 */
function getOrCreateAnnouncer(priority = 'polite') {
  const id = `aria-announcer-${priority}`;
  let announcer = document.getElementById(id);

  if (!announcer) {
    announcer = document.createElement('div');
    announcer.id = id;
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    document.body.appendChild(announcer);
  }

  return announcer;
}

/**
 * Add screen-reader-only class to styles if not present
 */
export function addScreenReaderStyles() {
  if (document.querySelector('#accessibility-styles')) {
    return; // Already added
  }

  const style = document.createElement('style');
  style.id = 'accessibility-styles';
  style.textContent = `
    /* Screen reader only */
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }

    /* Skip to content link */
    .skip-link {
      position: absolute;
      top: -40px;
      left: 0;
      background: #000;
      color: #fff;
      padding: 8px;
      text-decoration: none;
      z-index: 100;
    }

    .skip-link:focus {
      top: 0;
    }

    /* Focus visible styles */
    *:focus-visible {
      outline: 3px solid #f59e0b;
      outline-offset: 2px;
    }

    /* Remove outline for mouse users */
    *:focus:not(:focus-visible) {
      outline: none;
    }

    /* Keyboard navigation indicator */
    .keyboard-nav *:focus {
      outline: 3px solid #f59e0b !important;
      outline-offset: 2px !important;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Add skip to main content link
 */
export function addSkipLink() {
  if (document.querySelector('.skip-link')) {
    return; // Already exists
  }

  const skipLink = document.createElement('a');
  skipLink.href = '#main-content';
  skipLink.className = 'skip-link';
  skipLink.textContent = 'Hopp til hovedinnhold';

  skipLink.addEventListener('click', e => {
    e.preventDefault();
    const mainContent = document.querySelector('#main-content') ||
                       document.querySelector('main') ||
                       document.querySelector('[role="main"]');

    if (mainContent) {
      mainContent.setAttribute('tabindex', '-1');
      mainContent.focus();
      mainContent.scrollIntoView();
    }
  });

  document.body.insertBefore(skipLink, document.body.firstChild);
}

/**
 * Make an element focusable and add keyboard support
 * @param {HTMLElement} element
 * @param {Function} onClick - Handler for click/Enter/Space
 */
export function makeKeyboardAccessible(element, onClick) {
  if (!element.hasAttribute('tabindex')) {
    element.setAttribute('tabindex', '0');
  }

  element.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(e);
    }
  });
}

/**
 * Enable keyboard navigation detection
 * Adds a class to body when user is using keyboard
 */
export function enableKeyboardNavDetection() {
  let isUsingKeyboard = false;

  document.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      isUsingKeyboard = true;
      document.body.classList.add('keyboard-nav');
    }
  });

  document.addEventListener('mousedown', () => {
    isUsingKeyboard = false;
    document.body.classList.remove('keyboard-nav');
  });
}

/**
 * Create focus trap for modals
 * @param {HTMLElement} container - Modal container
 * @returns {Object} - Object with activate/deactivate methods
 */
export function createFocusTrap(container) {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  function handleKeyDown(e) {
    if (e.key !== 'Tab') {
      return;
    }

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }

  return {
    activate() {
      container.addEventListener('keydown', handleKeyDown);
      firstElement?.focus();
    },

    deactivate() {
      container.removeEventListener('keydown', handleKeyDown);
    }
  };
}

/**
 * Add ARIA labels to exercise elements
 */
export function enhanceExerciseAccessibility(exerciseElement) {
  // Add role if not present
  if (!exerciseElement.hasAttribute('role')) {
    exerciseElement.setAttribute('role', 'region');
  }

  // Add aria-label from heading if not present
  if (!exerciseElement.hasAttribute('aria-label')) {
    const heading = exerciseElement.querySelector('h2, h3, h4');
    if (heading) {
      exerciseElement.setAttribute('aria-label', heading.textContent);
    }
  }

  // Enhance buttons
  const buttons = exerciseElement.querySelectorAll('button:not([aria-label])');
  buttons.forEach(button => {
    if (!button.textContent.trim() && button.classList.contains('reset')) {
      button.setAttribute('aria-label', 'Start på nytt');
    } else if (!button.textContent.trim() && button.classList.contains('check')) {
      button.setAttribute('aria-label', 'Sjekk svar');
    }
  });

  // Enhance inputs
  const inputs = exerciseElement.querySelectorAll('input[type="text"]:not([aria-label])');
  inputs.forEach((input, index) => {
    if (!input.id) {
      input.id = `input-${Date.now()}-${index}`;
    }

    // Add label if not present
    const label = exerciseElement.querySelector(`label[for="${input.id}"]`);
    if (!label && !input.hasAttribute('aria-label')) {
      input.setAttribute('aria-label', `Svar felt ${index + 1}`);
    }
  });
}

/**
 * Enhance tab navigation accessibility
 */
export function enhanceTabAccessibility() {
  const tabs = document.querySelectorAll('.tab-button');
  const tabPanels = document.querySelectorAll('.tab-content');

  tabs.forEach((tab, index) => {
    // Add ARIA attributes
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', tab.classList.contains('active') ? 'true' : 'false');
    tab.setAttribute('aria-controls', `panel-${index}`);

    if (!tab.id) {
      tab.id = `tab-${index}`;
    }
  });

  tabPanels.forEach((panel, index) => {
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', `tab-${index}`);
    panel.id = `panel-${index}`;
    panel.setAttribute('tabindex', '0');
  });

  // Add keyboard navigation (arrow keys)
  tabs.forEach((tab, index) => {
    tab.addEventListener('keydown', e => {
      let newIndex = index;

      if (e.key === 'ArrowRight') {
        newIndex = (index + 1) % tabs.length;
      } else if (e.key === 'ArrowLeft') {
        newIndex = (index - 1 + tabs.length) % tabs.length;
      } else if (e.key === 'Home') {
        newIndex = 0;
      } else if (e.key === 'End') {
        newIndex = tabs.length - 1;
      } else {
        return;
      }

      e.preventDefault();
      tabs[newIndex].click();
      tabs[newIndex].focus();
    });
  });
}

/**
 * Add ARIA labels to flashcards
 */
export function enhanceFlashcardAccessibility() {
  const flashcards = document.querySelectorAll('.flashcard');

  flashcards.forEach((card, index) => {
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Ordkort ${index + 1}. Klikk eller trykk Enter for å snu.`);

    // Make clickable with Enter/Space
    makeKeyboardAccessible(card, () => {
      card.click();
    });

    // Announce when flipped
    card.addEventListener('click', () => {
      const isFlipped = card.classList.contains('flipped');
      if (isFlipped) {
        const backText = card.querySelector('.flashcard-back')?.textContent;
        if (backText) {
          announce(`Baksiden: ${backText}`);
        }
      }
    });
  });
}

/**
 * Initialize all accessibility enhancements
 */
export function initAccessibility() {
  debug('🦾 Initializing accessibility enhancements...');

  // Add styles
  addScreenReaderStyles();

  // Add skip link
  addSkipLink();

  // Enable keyboard navigation detection
  enableKeyboardNavDetection();

  // Enhance tabs if present
  if (document.querySelector('.tab-button')) {
    enhanceTabAccessibility();
  }

  // Enhance exercises
  document.querySelectorAll('[class*="ovelse"], [class*="task"]').forEach(exercise => {
    enhanceExerciseAccessibility(exercise);
  });

  // Enhance flashcards when they're loaded
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1 && node.classList.contains('flashcard')) {
          enhanceFlashcardAccessibility();
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  debug('✅ Accessibility enhancements loaded!');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAccessibility);
} else {
  initAccessibility();
}
