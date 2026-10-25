import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      /**
       * Hooks and helpers deliberately live next to the component that owns
       * them: `useAuth` in lib/auth.tsx, `useToast` in components/ui.tsx,
       * `byId` in components/DataTable.tsx, `useGuardState` in
       * components/ProtectedRoute.tsx. Fast Refresh still works; it only loses
       * the local state of those files when they are edited. The rule is dev
       * experience advice, not a correctness check, so it must not fail
       * `npm run lint`. Splitting every hook into its own module would only
       * add indirection in this project.
       */
      'react-refresh/only-export-components': 'off',
    },
  },
])
