/**
 * Build-time constants injected by the `define` block in vite.config.ts.
 * Declaring them here is what makes `__APP_VERSION__` type-safe; without this
 * declaration every use of it in About.tsx would be an implicit `any`.
 */
declare const __APP_VERSION__: string
declare const __GIT_COMMIT__: string
declare const __BUILD_TIME__: string

interface ImportMetaEnv {
  readonly VITE_APP_VERSION?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_SOLVER_BASE_URL?: string
  readonly VITE_SWAGGER_URL?: string
  readonly VITE_API_PROXY_TARGET?: string
  readonly VITE_SOLVER_PROXY_TARGET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
