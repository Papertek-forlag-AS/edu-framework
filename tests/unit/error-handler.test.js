import { describe, it, expect, beforeEach, vi } from 'vitest';
import { safeStorage, safeExecute, ErrorType, errorLogger } from '@engine/error-handler.js';

describe('Error Handler', () => {
  beforeEach(() => {
    localStorage.clear();
    errorLogger.clearErrors();
  });

  describe('safeStorage', () => {
    it('should safely save and retrieve data', () => {
      const testData = { test: 'value' };
      const saved = safeStorage.set('test-key', testData);

      expect(saved).toBe(true);

      const loaded = safeStorage.get('test-key');
      expect(loaded).toEqual(testData);
    });

    it('should return default value for non-existent keys', () => {
      const result = safeStorage.get('non-existent', { default: true });
      expect(result).toEqual({ default: true });
    });

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError');
      });

      const result = safeStorage.set('test', { data: 'value' });
      expect(result).toBe(false);

      // Restore
      localStorage.setItem = originalSetItem;
    });

    it('should check if localStorage is available', () => {
      expect(safeStorage.isAvailable()).toBe(true);
    });
  });

  describe('safeExecute', () => {
    it('should execute function successfully', () => {
      const result = safeExecute(() => {
        return 42;
      });

      expect(result).toBe(42);
    });

    it('should catch errors and return fallback', () => {
      const result = safeExecute(
        () => {
          throw new Error('Test error');
        },
        { type: ErrorType.GENERAL, showToast: false },
        'fallback'
      );

      expect(result).toBe('fallback');
    });

    it('should log errors to errorLogger', () => {
      safeExecute(
        () => {
          throw new Error('Test error');
        },
        { type: ErrorType.STORAGE, showToast: false }
      );

      const errors = errorLogger.getErrors();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].type).toBe(ErrorType.STORAGE);
    });
  });

  describe('errorLogger', () => {
    it('should log errors with context', () => {
      const error = new Error('Test error');
      const context = { type: ErrorType.EXERCISE, action: 'test' };

      errorLogger.log(error, context);

      const errors = errorLogger.getErrors();
      expect(errors.length).toBe(1);
      expect(errors[0].message).toBe('Test error');
      expect(errors[0].type).toBe(ErrorType.EXERCISE);
    });

    it('should clear all errors', () => {
      errorLogger.log(new Error('Error 1'));
      errorLogger.log(new Error('Error 2'));

      expect(errorLogger.getErrors().length).toBe(2);

      errorLogger.clearErrors();
      expect(errorLogger.getErrors().length).toBe(0);
    });

    it('should limit number of stored errors', () => {
      // Log more than max errors (100)
      for (let i = 0; i < 150; i++) {
        errorLogger.log(new Error(`Error ${i}`));
      }

      const errors = errorLogger.getErrors();
      expect(errors.length).toBeLessThanOrEqual(100);
    });
  });

  describe('ErrorType constants', () => {
    it('should have all required error types', () => {
      expect(ErrorType.STORAGE).toBeDefined();
      expect(ErrorType.NETWORK).toBeDefined();
      expect(ErrorType.EXERCISE).toBeDefined();
      expect(ErrorType.AUDIO).toBeDefined();
      expect(ErrorType.SERVICE_WORKER).toBeDefined();
      expect(ErrorType.GENERAL).toBeDefined();
    });
  });
});
