import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import localRules from './eslint-rules/index.js'

export default defineConfig([
  globalIgnores(['dist', 'tmp', '.vite', 'node_modules', 'Saved', '.image-cache', '__pycache__']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        // Required for the local no-unformatted-number-render rule, which
        // reads TS types to determine whether a rendered expression is numeric.
        projectService: true,
      },
    },
    plugins: {
      local: localRules,
    },
    rules: {
      // `warn` for now: surfaced in every lint run and fails CI when
      // `--max-warnings=0` is set, but doesn't break `npm run lint` while a
      // backlog of placeholder-screen violations remains. Promote to `error`
      // once the unmigrated screens (MilitaryScreen, FactionOverviewScreen,
      // DiplomacyScreen, etc.) have bridge actions wired up.
      'local/no-unformatted-number-render': 'warn',
      'local/no-hardcoded-player-text': 'error',
      // Hard error: referenced asset files must exist on disk. No graceful
      // fallbacks for missing icons/textures.
      'local/no-missing-asset': 'error',
      'local/no-mixed-animation-units': 'error',
      'local/no-expensive-runtime-selectors': 'error',
      'react-hooks/immutability': 'error',
      'react-hooks/preserve-manual-memoization': 'error',
      'react-hooks/refs': 'error',
      'react-hooks/set-state-in-effect': 'error',
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
    },
  },
  {
    files: ['**/*.css'],
    plugins: {
      local: localRules,
    },
    processor: 'local/css',
    rules: {
      'local/no-mixed-animation-units': 'error',
      'local/no-expensive-runtime-selectors': 'error',
    },
  },
  {
    files: [
      'src/components/screens/Battle/BattleScreenParts.tsx',
      'src/components/screens/Military/ForceTreeParts.tsx',
      'src/components/screens/Military/TemplateManagementPanel.tsx',
      'src/components/sidebars/character/CharacterSidebarModel.tsx',
      'src/components/sidebars/character/CharacterSidebarPanels.tsx',
      'src/components/sidebars/military/MilitaryUnitsTab.tsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
