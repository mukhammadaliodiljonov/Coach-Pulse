/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "mock" (sample data, the default) or "api" (the Spring Boot backend). */
  readonly VITE_DATA_SOURCE?: string
  /** Base URL for API requests; "/api" by default, which the dev server proxies. */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
