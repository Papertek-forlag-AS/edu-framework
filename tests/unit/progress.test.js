import { describe, it, expect, beforeEach } from 'vitest';
import { saveData, loadData } from '@engine/progress/store.js';
import { EXERCISE_DATABASE } from '@engine/progress/config.js';

describe('Progress Tracking', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('saveData / loadData', () => {
    it('should round-trip data through save and load', () => {
      const testData = { test: 'value' };
      saveData('test-key', testData);

      const loaded = loadData('test-key');
      expect(loaded).toEqual(testData);
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

    it('should return null for non-existent keys', () => {
      const loaded = loadData('non-existent');
      expect(loaded).toBeNull();
    });
  });

  describe('EXERCISE_DATABASE', () => {
    it('should have correct structure for lesson 1-1', () => {
      expect(EXERCISE_DATABASE['1-1']).toBeDefined();
      expect(EXERCISE_DATABASE['1-1']).toHaveProperty('exercises');
      expect(EXERCISE_DATABASE['1-1']).toHaveProperty('extraExercises');
      expect(EXERCISE_DATABASE['1-1']).toHaveProperty('tests');
    });

    it('should have consistent data across all lessons', () => {
      Object.keys(EXERCISE_DATABASE).forEach(lessonId => {
        const lesson = EXERCISE_DATABASE[lessonId];

        expect(lesson.exercises).toBeTypeOf('number');
        expect(lesson.exercises).toBeGreaterThanOrEqual(0);

        expect(lesson.extraExercises).toBeTypeOf('number');
        expect(lesson.extraExercises).toBeGreaterThanOrEqual(0);

        expect(lesson.tests).toBeInstanceOf(Array);
        expect(lesson.tests.length).toBeGreaterThan(0);
      });
    });

    it('should mark last lessons in chapters with chapter test', () => {
      expect(EXERCISE_DATABASE['1-3'].tests).toContain('chapter');
      expect(EXERCISE_DATABASE['2-3'].tests).toContain('chapter');
      expect(EXERCISE_DATABASE['3-3'].tests).toContain('chapter');
    });

    it('should mark cumulative test lessons correctly', () => {
      expect(EXERCISE_DATABASE['2-3'].tests).toContain('cumulative');
      expect(EXERCISE_DATABASE['3-3'].tests).toContain('cumulative');
    });

    it('should have lesson test for every lesson', () => {
      Object.keys(EXERCISE_DATABASE).forEach(lessonId => {
        expect(EXERCISE_DATABASE[lessonId].tests).toContain('lesson');
      });
    });
  });
});
