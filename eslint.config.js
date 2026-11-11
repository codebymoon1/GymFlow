import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Core ESLint does not count JSX tag references as variable usage.
      // Ignore PascalCase names here (components and icon components).
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z]', argsIgnorePattern: '^[A-Z]' }],
      // These React Compiler diagnostics are useful when adopting the compiler,
      // which this project has not enabled; preserve existing memoization and
      // local stateless view helpers until a dedicated refactor is planned.
      'react-hooks/static-components': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
  {
    files: ['src/context/**/*.jsx'],
    rules: {
      // Context modules intentionally export both their provider and hook.
      'react-refresh/only-export-components': 'off',
    },
  },
])
