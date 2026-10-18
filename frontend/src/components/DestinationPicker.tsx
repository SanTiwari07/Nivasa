import { GraduationCap, LocateFixed, MapPin, Search } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'
import { api, ApiError } from '../lib/api'
import type { College, Destination, GeocodeResult } from '../lib/types'
import { TILE_ATTRIBUTION, TILE_URL, PUNE_CENTER } from './mapConfig'
import { destIcon } from './signs'
import { SignBadge } from './ui'

type Tab = 'college' | 'search' | 'pin'

function PinOnClick({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) })
  return null
}

interface Props {
  value: Destination
  colleges: College[]
  geocoderEnabled: boolean
  regionBounds: [number, number, number, number]
  onChange: (d: Destination) => void
  error?: string
}

export function DestinationPicker({ value, colleges, geocoderEnabled, regionBounds, onChange, error }: Props) {
  const [tab, setTab] = useState<Tab>(value.lat != null && !value.college_id ? 'pin' : 'college')
  const [filter, setFilter] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodeResult[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const abort = useRef<AbortController | null>(null)
  const ids = useId()
  const selectedCollege = colleges.find((c) => c.id === value.college_id)

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase()
    const list = f ? colleges.filter((c) => `${c.name} ${c.short_name} ${c.area}`.toLowerCase().includes(f)) : colleges
    return list.slice(0, 40)
  }, [colleges, filter])

  useEffect(() => () => abort.current?.abort(), [])

  async function runSearch() {
    const q = query.trim()
    if (q.length < 3) {
      setSearchError('Type at least 3 characters.')
      return
    }
    abort.current?.abort()
    abort.current = new AbortController()
    setSearching(true)
    setSearchError(null)
    try {
      const r = await api.geocode(q, abort.current.signal)
      setResults(r)
      if (!r.length) setSearchError('No places in the Pune region match that. Try a landmark or area name, or pin the map.')
    } catch (e) {
      if (e instanceof DOMException) return
      setSearchError(e instanceof ApiError ? e.message : 'Address search failed.')
    } finally {
      setSearching(false)
    }
  }

  const summary = selectedCollege
    ? { title: selectedCollege.name, sub: selectedCollege.area }
    : value.lat != null && value.lng != null
      ? { title: value.label || 'Pinned location', sub: `${value.lat.toFixed(4)}, ${value.lng.toFixed(4)}` }
      : null

  const tabBtn = (t: Tab, label: string, Icon: typeof Search) => (
    <button type="button" role="tab" aria-selected={tab === t} aria-controls={`${ids}-${t}`} onClick={() => setTab(t)}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors ${tab === t ? 'bg-ink text-on-ink' : 'text-ink hover:bg-surface-3'}`}>
      <Icon className="size-4" aria-hidden /> {label}
    </button>
  )

  return (
    <div className="flex flex-col gap-3">
      <div className={`flex min-h-14 items-center gap-3 rounded-2xl px-3 py-2.5 ${summary ? 'bg-surface' : error ? 'bg-bad-soft' : 'bg-surface-3/60'}`} aria-live="polite">
        {summary ? (
          <>
            <SignBadge kind="college" />
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-muted">Going to</span>
              <b className="block truncate">{summary.title}</b>
            </span>
            <span className="ml-auto hidden shrink-0 text-xs text-muted sm:block">{summary.sub}</span>
          </>
        ) : <span className="px-1 text-muted">No destination chosen yet.</span>}
      </div>
      {error && <p className="field-error" id={`${ids}-err`}>{error}</p>}
      <div role="tablist" aria-label="How to choose your destination" className="flex flex-wrap gap-1">
        {tabBtn('college', 'College', GraduationCap)}
        {tabBtn('search', 'Address', Search)}
        {tabBtn('pin', 'Pin on map', MapPin)}
      </div>

      {tab === 'college' && (
        <div id={`${ids}-college`} role="tabpanel" className="flex flex-col gap-2">
          <label htmlFor={`${ids}-filter`} className="sr-only">Filter colleges</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
            <input id={`${ids}-filter`} className="input rounded-full pl-10" placeholder="Search by name or area, e.g. COEP, Kothrud" value={filter}
              onChange={(e) => setFilter(e.target.value)} />
          </div>
          <ul role="listbox" aria-label="Colleges" className="max-h-64 overflow-auto rounded-2xl bg-surface p-1">
            {filtered.map((c) => {
              const on = value.college_id === c.id
              return (
                <li key={c.id} role="option" aria-selected={on}>
                  <button type="button" onClick={() => onChange({ college_id: c.id })}
                    className={`flex w-full flex-col items-start rounded-xl px-3 py-2 text-left text-sm transition-colors ${on ? 'bg-ink text-on-ink' : 'hover:bg-surface-2'}`}>
                    <span className="font-semibold">{c.name}</span>
                    <span className={`text-xs ${on ? 'opacity-75' : 'text-muted'}`}>{c.area}</span>
                  </button>
                </li>
              )
            })}
            {!filtered.length && <li className="px-3 py-3 text-sm text-muted">No college matches. Try the Address or Pin on map tab.</li>}
          </ul>
          <p className="text-xs text-muted">Locations come from OpenStreetMap. Colleges we could not verify are not listed; pin them instead.</p>
        </div>
      )}

      {tab === 'search' && (
        <div id={`${ids}-search`} role="tabpanel" className="flex flex-col gap-2">
          {!geocoderEnabled && <p className="text-sm text-muted">Address search is turned off on this server. It can still find colleges by name.</p>}
          {/* Not a <form>: this sits inside the preferences form, and nested forms submit the outer one. */}
          <div className="flex gap-2">
            <label htmlFor={`${ids}-q`} className="sr-only">Address or landmark</label>
            <input id={`${ids}-q`} className="input rounded-full" placeholder="e.g. Hinjewadi Phase 1, Magarpatta, Pune Station" value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void runSearch() } }} />
            <button className="btn-primary btn min-h-11 rounded-full" type="button" disabled={searching} onClick={() => void runSearch()}>
              {searching ? 'Searching…' : 'Search'}
            </button>
          </div>
          {searchError && <p className="text-sm font-medium text-warn">{searchError}</p>}
          {results && results.length > 0 && (
            <ul className="rounded-2xl bg-surface p-1">
              {results.map((r) => {
                const on = value.lat === r.lat && value.lng === r.lng
                return (
                  <li key={`${r.lat},${r.lng},${r.label}`}>
                    <button type="button" className={`flex w-full flex-col items-start rounded-xl px-3 py-2 text-left text-sm ${on ? 'bg-ink text-on-ink' : 'hover:bg-surface-2'}`}
                      onClick={() => onChange({ lat: r.lat, lng: r.lng, label: r.short_label })}>
                      <span className="font-semibold">{r.short_label}</span>
                      <span className={`line-clamp-1 text-xs ${on ? 'opacity-75' : 'text-muted'}`}>{r.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          <p className="text-xs text-muted">Search by © OpenStreetMap Nominatim, limited to the Pune region.</p>
        </div>
      )}

      {tab === 'pin' && (
        <div id={`${ids}-pin`} role="tabpanel" className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-sm text-muted"><LocateFixed className="size-4" aria-hidden /> Tap the map where you travel to every day.</p>
          <div className="h-64 overflow-hidden rounded-2xl">
            <MapContainer center={value.lat != null && value.lng != null ? [value.lat, value.lng] : PUNE_CENTER} zoom={12}
              maxBounds={[[regionBounds[0], regionBounds[1]], [regionBounds[2], regionBounds[3]]]} minZoom={10} className="h-full w-full">
              <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
              <PinOnClick onPick={(lat, lng) => {
                const [s, w, n, e] = regionBounds
                if (lat < s || lat > n || lng < w || lng > e) return
                onChange({ lat, lng, label: 'Pinned location' })
              }} />
              {value.lat != null && value.lng != null && !value.college_id && <Marker position={[value.lat, value.lng]} icon={destIcon} />}
            </MapContainer>
          </div>
        </div>
      )}
    </div>
  )
}
