import { describe, it, expect, beforeEach } from 'vitest';
import { saveData, loadData, EXERCISE_DATABASE } from '../../js/progress.js';

describe('Progress Tracking', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('saveData', () => {
    it('should save data to localStorage', () => {
      const testData = { test: 'value' };
      saveData('test-key', testData);

      const stored = localStorage.getItem('test-key');
      expect(stored).toBe(JSON.stringify(testData));
    });

    it('should handle complex objects', () => {
      const complexData = {
        lessons: {
          '1-1': { tabs: ['leksjon', 'ovelser'], exercises: ['aufgabeA', 'aufgabeB'] }
        }
      };

      saveData('complex-key', complexData);
      const loaded = loadData('complex-key');

      expect(loaded).toEqual(complexData);
    });
  });

  describe('loadData', () => {
    it('should load data from localStorage', () => {
      const testData = { key: 'value' };
      localStorage.setItem('test-key', JSON.stringify(testData));

      const loaded = loadData('test-key');
      expect(loaded).toEqual(testData);
    });

    it('should return null for non-existent keys', () => {
      const loaded = loadData('non-existent');
      expect(loaded).toBeNull();
    });

    it('should handle invalid JSON gracefully', () => {
      localStorage.setItem('invalid-json', 'not valid json{');
      const loaded = loadData('invalid-json');
      expect(loaded).toBeNull();
    });
  });

  describe('EXERCISE_DATABASE', () => {
    it('should have correct structure for lesson 1-1', () => {
      expect(EXERCISE_DATABASE['1-1']).toBeDefined();
      expect(EXERCISE_DATABASE['1-1']).toHaveProperty('ovelser');
      expect(EXERCISE_DATABASE['1-1']).toHaveProperty('ekstraovelser');
      expect(EXERCISE_DATABASE['1-1']).toHaveProperty('tests');
    });

    it('should have consistent data across all lessons', () => {
      Object.keys(EXERCISE_DATABASE).forEach(lessonId => {
        const lesson = EXERCISE_DATABASE[lessonId];

        expect(lesson.ovelser).toBeTypeOf('number');
        expect(lesson.ovelser).toBeGreaterThanOrEqual(0);

        expect(lesson.ekstraovelser).toBeTypeOf('number');
        expect(lesson.ekstraovelser).toBeGreaterThanOrEqual(0);

        expect(lesson.tests).toBeInstanceOf(Array);
        expect(lesson.tests.length).toBeGreaterThan(0);
      });
    });

    it('should mark last lessons in chapters correctly', () => {
      // Last lessons in chapters should have 'kapittel' test
      expect(EXERCISE_DATABASE['1-3'].tests).toContain('kapittel');
      expect(EXERCISE_DATABASE['2-3'].tests).toContain('kapittel');
      expect(EXERCISE_DATABASE['3-3'].tests).toContain('kapittel');
    });

    it('should mark cumulative test lessons correctly', () => {
      // Lessons 2-3, 3-3, etc. should have cumulative tests
      expect(EXERCISE_DATABASE['2-3'].tests).toContain('kumulativ');
      expect(EXERCISE_DATABASE['3-3'].tests).toContain('kumulativ');
    });
  });
});
