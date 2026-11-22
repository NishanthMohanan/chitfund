/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API base URL, e.g. http://localhost:3000/api. Defaults to /api (Vite's proxy). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
