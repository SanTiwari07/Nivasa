/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the FastAPI backend. Empty means same origin (the Vite dev proxy or a reverse proxy). */
  readonly VITE_API_BASE_URL?: string
  /** Leaflet tile URL template. Defaults to OpenStreetMap standard tiles (development use only). */
  readonly VITE_TILE_URL?: string
  readonly VITE_TILE_ATTRIBUTION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
