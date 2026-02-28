import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['scripts/**/*.js', 'vite.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.browser, gapi: 'readonly' },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^(?:[A-Z_].*|motion)$', argsIgnorePattern: '^_' }],
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    files: ['src/context/**/*.jsx', 'src/context/**/*.js'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['src/pages/Transactions.jsx'],
    rules: { 'react-hooks/preserve-manual-memoization': 'off' },
  },
])
