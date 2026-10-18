# Nivasa frontend

React 19 + TypeScript (strict) + Vite, styled with Tailwind CSS 4, maps with Leaflet / React Leaflet, icons from Lucide.
See the repository [README](../README.md) for setup.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on http://127.0.0.1:5173, proxying `/api` to the backend on :8000 |
| `npm run typecheck` | `tsc -b` |
| `npm run lint` | oxlint |
| `npm test` | Vitest + Testing Library (jsdom) |
| `npm run build` | Type-check and production build into `dist/` |

Source layout:

- `src/pages/` route screens: search form, results with map, listing detail, saved, compare, add a listing, how it works
- `src/components/` the preference form, destination picker, Leaflet results map, result cards and detail sections
- `src/lib/` API client, shared types (mirrors `backend/app/schemas.py`), URL-encoded preferences, local storage
