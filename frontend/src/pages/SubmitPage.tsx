import { CheckCircle2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'
import { PUNE_CENTER, TILE_ATTRIBUTION, TILE_URL } from '../components/mapConfig'
import { dropPinIcon } from '../components/signs'
import { ErrorBox, Spinner } from '../components/ui'
import { api, ApiError } from '../lib/api'
import type { Gender, Sharing, StayType, SubmissionInput } from '../lib/types'
import { useReference } from '../lib/useReference'


function Pick({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) })
  return null
}

type Errors = Partial<Record<'name' | 'area' | 'location' | 'contact_phone' | 'rooms' | 'form', string>>

export function SubmitPage() {
  const ref = useReference()
  const [f, setF] = useState({
    name: '', stay_type: 'pg' as StayType, gender: '' as Gender | '', area: '', address: '',
    lat: null as number | null, lng: null as number | null,
    rooms: [{ sharing: 'double' as Sharing, rent: '' }], food: '' as '' | 'yes' | 'no',
    amenities: [] as string[], contact_name: '', contact_phone: '', notes: '',
  })
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)

  if (!ref.data) return ref.error ? <div className="mx-auto max-w-xl p-6"><ErrorBox message={ref.error} onRetry={ref.retry} /></div> : <Spinner />
  const meta = ref.data.meta
  const [s, w, n, e] = meta.region_bounds

  function validate(): Errors {
    const errs: Errors = {}
    if (f.name.trim().length < 3) errs.name = 'Enter the name of the hostel, PG or building.'
    if (f.area.trim().length < 2) errs.area = 'Enter the area, e.g. Kothrud.'
    if (f.lat == null || f.lng == null) errs.location = 'Tap the map to mark where the stay is.'
    if (f.contact_phone && !/^\+?[0-9 -]{8,16}$/.test(f.contact_phone.trim())) errs.contact_phone = 'Enter a phone number with 8 to 16 digits.'
    if (f.rooms.some((r) => r.rent && (Number(r.rent) < 1000 || Number(r.rent) > 100000))) errs.rooms = 'Rent should be between ₹1,000 and ₹1,00,000, or left blank if unknown.'
    return errs
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length) return
    const body: SubmissionInput = {
      name: f.name.trim(), stay_type: f.stay_type, gender: f.gender || null, area: f.area.trim(), address: f.address.trim() || null,
      lat: f.lat!, lng: f.lng!, rooms: f.rooms.map((r) => ({ sharing: r.sharing, monthly_rent: r.rent ? Number(r.rent) : null })),
      food_included: f.food === '' ? null : f.food === 'yes',
      amenities: Object.fromEntries(f.amenities.map((k) => [k, true])),
      contact_name: f.contact_name.trim() || null, contact_phone: f.contact_phone.trim() || null, notes: f.notes.trim() || null,
    }
    setBusy(true)
    try {
      const r = await api.submit(body)
      setDone(r.message)
    } catch (err) {
      setErrors({ form: err instanceof ApiError ? err.message : 'Could not send the listing.' })
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-start gap-4 px-4 py-12">
        <CheckCircle2 className="size-10 text-good" aria-hidden />
        <h1 className="text-[36px] font-extrabold">Listing received</h1>
        <p className="text-muted">{done} Until then it won't appear in search results.</p>
        <Link to="/" className="btn-primary btn">Back to search</Link>
      </div>
    )
  }

  const field = 'flex flex-col gap-1.5'
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-[36px] font-extrabold sm:text-[44px]">Add a hostel or PG</h1>
        <p className="mt-2 text-lg text-muted">Owners and students can suggest a stay. It is reviewed before it appears. Leave anything you don't know blank; Nivasa shows it as "not reported" rather than guessing.</p>
      </div>
      <form onSubmit={submit} noValidate className="card-lg flex flex-col gap-6 p-5 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className={field}><label htmlFor="s-name" className="text-sm font-semibold text-ink">Name *</label>
            <input id="s-name" className="input" value={f.name} aria-invalid={Boolean(errors.name)} onChange={(e) => setF({ ...f, name: e.target.value })} />
            {errors.name && <p className="field-error">{errors.name}</p>}</div>
          <div className={field}><label htmlFor="s-type" className="text-sm font-semibold text-ink">Kind of stay *</label>
            <select id="s-type" className="input" value={f.stay_type} onChange={(e) => setF({ ...f, stay_type: e.target.value as StayType })}>
              {Object.entries(meta.stay_types).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></div>
          <div className={field}><label htmlFor="s-gender" className="text-sm font-semibold text-ink">Who can stay</label>
            <select id="s-gender" className="input" value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value as Gender | '' })}>
              <option value="">Not sure</option>{Object.entries(meta.genders).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></div>
          <div className={field}><label htmlFor="s-area" className="text-sm font-semibold text-ink">Area *</label>
            <input id="s-area" className="input" placeholder="e.g. Kothrud" value={f.area} aria-invalid={Boolean(errors.area)} onChange={(e) => setF({ ...f, area: e.target.value })} />
            {errors.area && <p className="field-error">{errors.area}</p>}</div>
        </div>
        <div className={field}><label htmlFor="s-addr" className="text-sm font-semibold text-ink">Address</label>
          <input id="s-addr" className="input" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
        <div className={field}>
          <span className="text-sm font-semibold text-ink">Location on the map *</span>
          <div className={`h-64 overflow-hidden rounded-2xl ${errors.location ? 'ring-2 ring-bad' : ''}`}>
            <MapContainer center={f.lat != null && f.lng != null ? [f.lat, f.lng] : PUNE_CENTER} zoom={12} className="h-full w-full" maxBounds={[[s, w], [n, e]]} minZoom={10}>
              <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
              <Pick onPick={(lat, lng) => setF({ ...f, lat, lng })} />
              {f.lat != null && f.lng != null && <Marker position={[f.lat, f.lng]} icon={dropPinIcon} />}
            </MapContainer>
          </div>
          {errors.location ? <p className="field-error">{errors.location}</p> : <p className="text-xs text-muted">{f.lat != null ? `Marked at ${f.lat.toFixed(5)}, ${f.lng?.toFixed(5)}` : 'Tap the exact building.'}</p>}
        </div>
        <fieldset className={field}>
          <legend className="mb-1.5 text-sm font-semibold text-ink">Rooms and monthly rent</legend>
          {f.rooms.map((r, i) => (
            <div key={i} className="flex gap-2">
              <select aria-label={`Room ${i + 1} sharing`} className="input w-40" value={r.sharing}
                onChange={(e) => setF({ ...f, rooms: f.rooms.map((x, j) => (j === i ? { ...x, sharing: e.target.value as Sharing } : x)) })}>
                {Object.entries(meta.sharing).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input aria-label={`Room ${i + 1} rent`} type="number" inputMode="numeric" className="input" placeholder="Rent in ₹ (blank if unknown)" value={r.rent}
                onChange={(e) => setF({ ...f, rooms: f.rooms.map((x, j) => (j === i ? { ...x, rent: e.target.value } : x)) })} />
              {f.rooms.length > 1 && <button type="button" className="btn-ghost btn" onClick={() => setF({ ...f, rooms: f.rooms.filter((_, j) => j !== i) })}>Remove</button>}
            </div>
          ))}
          {f.rooms.length < 4 && <button type="button" className="btn self-start" onClick={() => setF({ ...f, rooms: [...f.rooms, { sharing: 'triple', rent: '' }] })}>Add another room type</button>}
          {errors.rooms && <p className="field-error">{errors.rooms}</p>}
        </fieldset>
        <div className={field}><label htmlFor="s-food" className="text-sm font-semibold text-ink">Meals included in rent?</label>
          <select id="s-food" className="input w-48" value={f.food} onChange={(e) => setF({ ...f, food: e.target.value as '' | 'yes' | 'no' })}>
            <option value="">Not sure</option><option value="yes">Yes</option><option value="no">No</option>
          </select></div>
        <fieldset className={field}>
          <legend className="mb-1.5 text-sm font-semibold text-ink">Facilities you can confirm</legend>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(meta.amenities).map(([k, v]) => {
              const on = f.amenities.includes(k)
              return <button key={k} type="button" className="chip" aria-pressed={on} onClick={() => setF({ ...f, amenities: on ? f.amenities.filter((x) => x !== k) : [...f.amenities, k] })}>{v}</button>
            })}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className={field}><label htmlFor="s-cn" className="text-sm font-semibold text-ink">Contact name</label>
            <input id="s-cn" className="input" value={f.contact_name} onChange={(e) => setF({ ...f, contact_name: e.target.value })} /></div>
          <div className={field}><label htmlFor="s-cp" className="text-sm font-semibold text-ink">Contact phone</label>
            <input id="s-cp" className="input" inputMode="tel" value={f.contact_phone} aria-invalid={Boolean(errors.contact_phone)} onChange={(e) => setF({ ...f, contact_phone: e.target.value })} />
            {errors.contact_phone && <p className="field-error">{errors.contact_phone}</p>}</div>
        </div>
        <div className={field}><label htmlFor="s-notes" className="text-sm font-semibold text-ink">Anything else</label>
          <textarea id="s-notes" className="input min-h-24" maxLength={1000} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        {errors.form && <ErrorBox message={errors.form} />}
        <button className="btn-primary btn min-h-12 self-start px-6" disabled={busy}>{busy ? 'Sending…' : 'Send for review'}</button>
      </form>
    </div>
  )
}
