import js from '@eslint/js';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default [
  // Base recommended rules
  js.configs.recommended,

  // Prettier integration
  prettierConfig,

  {
    files: ['**/*.js'],

    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        self: 'readonly',
        caches: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        Promise: 'readonly',
        URL: 'readonly',
        AudioContext: 'readonly',
        webkitAudioContext: 'readonly',

        // Node.js globals (for build scripts)
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly'
      }
    },

    plugins: {
      prettier
    },

    rules: {
      // Prettier formatting
      'prettier/prettier': 'warn',

      // Error prevention
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-console': 'off', // Allow console in this app

      // Best practices
      'eqeqeq': ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'warn',
      'no-eval': 'error',

      // Code style
      'curly': ['error', 'all'],
      'brace-style': ['error', '1tbs'],
      'semi': ['error', 'always'],
      'quotes': ['error', 'single', { avoidEscape: true }],

      // Modern JS
      'prefer-arrow-callback': 'warn',
      'prefer-template': 'warn'
    }
  },

  {
    // Ignore patterns
    ignores: [
      'node_modules/**',
      'public/**',
      'bilder-original-backup/**',
      'lydfiler-wav-backup/**',
      '.vercel/**',
      'bibliotek/**',
      'Bokprosjekt - inspirasjon/**',
      'arkiv/**',
      '*.min.js'
    ]
  }
];
