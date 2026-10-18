// Tile provider is configurable. The OpenStreetMap standard tiles are fine for development,
// but their usage policy forbids heavy production traffic: set VITE_TILE_URL to a commercial
// or self-hosted provider before launch (https://operations.osmfoundation.org/policies/tiles/).
export const TILE_URL: string = import.meta.env.VITE_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
export const TILE_ATTRIBUTION: string =
  import.meta.env.VITE_TILE_ATTRIBUTION ??
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
export const PUNE_CENTER: [number, number] = [18.5204, 73.8567]
