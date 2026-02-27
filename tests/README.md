# Testing Guide

This project uses **Vitest** for unit tests and **Playwright** for end-to-end (E2E) tests.

## Running Tests

### Unit Tests (Vitest)

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

### E2E Tests (Playwright)

```bash
# Run E2E tests (headless)
npm run test:e2e

# Run E2E tests with UI mode
npm run test:e2e:ui

# Run E2E tests in a specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### All Tests

```bash
# Run both unit and E2E tests
npm run test:all
```

## Test Structure

```
tests/
├── unit/               # Unit tests (Vitest)
│   ├── progress.test.js
│   └── error-handler.test.js
├── e2e/                # E2E tests (Playwright)
│   └── homepage.spec.js
├── setup.js            # Test setup (mocks, etc.)
└── README.md           # This file
```

## Writing Tests

### Unit Tests

Unit tests use Vitest and test individual functions/modules:

```javascript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../js/my-module.js';

describe('My Module', () => {
  it('should do something', () => {
    const result = myFunction();
    expect(result).toBe(expected);
  });
});
```

### E2E Tests

E2E tests use Playwright and test user workflows:

```javascript
import { test, expect } from '@playwright/test';

test('should navigate to lesson', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Leksjon 1.1');
  await expect(page).toHaveURL(/leksjon-1-1/);
});
```

## Test Coverage

Current test coverage includes:

### Unit Tests
- ✅ Progress tracking (saveData, loadData)
- ✅ Error handling (safeStorage, safeExecute)
- ✅ Exercise database validation

### E2E Tests
- ✅ Homepage navigation
- ✅ Lesson accessibility
- ✅ Responsive design
- ✅ Accessibility features (skip link, headings, alt text)

## Adding New Tests

### For New Features

1. **Write unit tests first** (TDD approach)
2. **Test critical paths** in E2E tests
3. **Aim for >80% coverage** of new code

### For Bug Fixes

1. **Write a failing test** that reproduces the bug
2. **Fix the bug**
3. **Verify test passes**

## Continuous Integration

Tests run automatically on:
- Pull requests
- Main branch commits
- Before deployment

## Test Configuration

- **vitest.config.js** - Vitest configuration
- **playwright.config.js** - Playwright configuration
- **tests/setup.js** - Test setup and mocks

## Debugging Tests

### Vitest

```bash
# Run specific test file
npm test progress.test.js

# Run tests matching pattern
npm test -- --grep="saveData"
```

### Playwright

```bash
# Debug mode (opens browser)
npx playwright test --debug

# Show browser while testing
npx playwright test --headed

# Generate test code
npx playwright codegen http://localhost:3000
```

## Best Practices

1. **Keep tests focused** - One assertion per test when possible
2. **Use descriptive names** - Test names should describe what they test
3. **Mock external dependencies** - Keep tests isolated
4. **Clean up after tests** - Use beforeEach/afterEach
5. **Test edge cases** - Not just happy paths
6. **Keep tests fast** - Unit tests should run in milliseconds

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
