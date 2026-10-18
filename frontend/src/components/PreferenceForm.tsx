import { Search } from 'lucide-react'
import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { BUDGET_MAX, BUDGET_MIN, FACTOR_ORDER, validatePreferences, type PrefErrors } from '../lib/prefs'
import type { College, Meta, Mode, Preferences, StayType } from '../lib/types'
import { inr } from '../lib/format'
import { DestinationPicker } from './DestinationPicker'
import { Glyph } from './ui'

/** Single-choice pills. Selected flips to ink, like every other toggle in Nivasa. */
function Choice<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: [T, string][]; onChange: (v: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map(([v, text]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)} className="chip">
          {text}
        </button>
      ))}
    </div>
  )
}

function Chips<T extends string>({ label, values, options, onChange, invalid, glyphs }: {
  label: string; values: T[]; options: [T, string][]; onChange: (v: T[]) => void; invalid?: boolean; glyphs?: boolean
}) {
  return (
    <div role="group" aria-label={label} aria-invalid={invalid || undefined} className="flex flex-wrap gap-1.5">
      {options.map(([v, text]) => {
        const on = values.includes(v)
        return (
          <button key={v} type="button" className="chip" aria-pressed={on}
            onClick={() => onChange(on ? values.filter((x) => x !== v) : [...values, v])}>
            {glyphs && <Glyph kind={v} />}{text}
          </button>
        )
      })}
    </div>
  )
}

function Group({ title, hint, error, children, errorId }: { title: string; hint?: ReactNode; error?: string; children: ReactNode; errorId?: string }) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 border-t border-line p-0 pt-6 first:border-t-0 first:pt-0">
      <legend className="float-left mb-3 w-full text-[17px] font-bold tracking-[-0.01em] text-ink">{title}</legend>
      {children}
      {hint && <p className="text-[13px] text-muted">{hint}</p>}
      {error && <p className="field-error" id={errorId}>{error}</p>}
    </fieldset>
  )
}

interface Props {
  initial: Preferences
  meta: Meta
  colleges: College[]
  submitLabel?: string
  serverErrors?: PrefErrors
  onSubmit: (p: Preferences) => void
  busy?: boolean
}

export function PreferenceForm({ initial, meta, colleges, submitLabel = 'Find my stays', serverErrors, onSubmit, busy }: Props) {
  const [p, setP] = useState<Preferences>(initial)
  const [errors, setErrors] = useState<PrefErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const id = useId()
  const set = <K extends keyof Preferences>(k: K, v: Preferences[K]) => {
    const next = { ...p, [k]: v }
    setP(next)
    if (submitted) setErrors(validatePreferences(next))
  }
  const shown = { ...serverErrors, ...errors }

  function submit(e: FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    const errs = validatePreferences(p)
    setErrors(errs)
    if (Object.keys(errs).length) {
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('.field-error')?.scrollIntoView?.({ block: 'center', behavior: 'smooth' }))
      return
    }
    onSubmit(p)
  }

  const modeOpts = (Object.keys(meta.modes) as Mode[]).map((m) => [m, meta.modes[m]] as [Mode, string])
  const typeOpts = (Object.keys(meta.stay_types) as StayType[]).map((t) => [t, meta.stay_types[t]] as [StayType, string])
  const errCount = Object.keys(shown).length

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-6">
      <Group title="Where do you study or work?">
        <DestinationPicker value={p.destination} colleges={colleges} geocoderEnabled={meta.geocoder_enabled}
          regionBounds={meta.region_bounds} onChange={(d) => set('destination', d)} error={shown.destination} />
      </Group>

      <Group title="Monthly budget" error={shown.budget} errorId={`${id}-budget-err`}
        hint={p.budget_mode === 'all_in'
          ? 'All-in counts rent, food, travel to college and electricity together. Unknown costs are flagged, not guessed.'
          : 'Compared against rent only. Food and travel are still shown on each stay.'}>
        <Choice label="What the budget covers" value={p.budget_mode} onChange={(v) => set('budget_mode', v)}
          options={[['all_in', 'Everything (all-in)'], ['rent', 'Rent only']]} />
        <div className="flex items-center gap-4">
          <label htmlFor={`${id}-budget`} className="sr-only">Budget in rupees per month</label>
          <div className="relative w-36 shrink-0">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-muted">₹</span>
            <input id={`${id}-budget`} type="number" inputMode="numeric" className="input num pl-8 font-semibold" min={BUDGET_MIN} max={BUDGET_MAX} step={500}
              value={Number.isFinite(p.budget) ? p.budget : ''} aria-invalid={Boolean(shown.budget)} aria-describedby={shown.budget ? `${id}-budget-err` : undefined}
              onChange={(e) => set('budget', e.target.value === '' ? Number.NaN : Number(e.target.value))} />
          </div>
          <input type="range" aria-label="Budget slider" className="range" min={BUDGET_MIN} max={30000} step={500}
            value={Number.isFinite(p.budget) ? Math.min(p.budget, 30000) : BUDGET_MIN} onChange={(e) => set('budget', Number(e.target.value))} />
        </div>
      </Group>

      <Group title="The stay" error={shown.stay_types}>
        <Choice label="Show stays for" value={p.gender} onChange={(v) => set('gender', v)}
          options={[['boys', 'Boys (and co-ed)'], ['girls', 'Girls (and co-ed)']]} />
        <Chips label="Kind of stay" values={p.stay_types} options={typeOpts} onChange={(v) => set('stay_types', v)} invalid={Boolean(shown.stay_types)} glyphs />
        <Choice label="Room sharing" value={p.sharing} onChange={(v) => set('sharing', v)}
          options={[['any', 'Any room'], ['single', 'Single'], ['double', 'Double'], ['triple', 'Triple']]} />
      </Group>

      <Group title="Getting to college" error={shown.modes ?? shown.max_commute_min}
        hint="Times are estimates for a weekday trip. Metro uses the open Purple and Aqua lines.">
        <Chips label="Ways you are happy to travel" values={p.modes} options={modeOpts} onChange={(v) => set('modes', v)} invalid={Boolean(shown.modes)} glyphs />
        <div className="flex items-center gap-4">
          <label htmlFor={`${id}-max`} className="whitespace-nowrap text-sm text-muted">Longest one-way trip</label>
          <input id={`${id}-max`} type="range" className="range" min={10} max={90} step={5} value={p.max_commute_min}
            onChange={(e) => set('max_commute_min', Number(e.target.value))} />
          <output htmlFor={`${id}-max`} className="num w-16 text-right text-sm font-bold text-ink">{p.max_commute_min} min</output>
        </div>
      </Group>

      <Group title="Food" hint="Nivasa looks for one mess (or the stay's own kitchen) that serves the most of what you want.">
        <Choice label="Diet" value={p.diet} onChange={(v) => set('diet', v)}
          options={[['veg', 'Vegetarian'], ['nonveg', 'Non-veg is fine'], ['jain', 'Jain']]} />
        {p.diet === 'veg' && (
          <label className="flex items-center gap-2.5 text-sm text-ink">
            <input type="checkbox" className="size-[18px] accent-[var(--ink)]" checked={p.pure_veg_only} onChange={(e) => set('pure_veg_only', e.target.checked)} />
            Only pure-veg kitchens
          </label>
        )}
        <Chips label="Food you want" values={p.cuisines} options={meta.cuisines.map((c) => [c, c] as [string, string])} onChange={(v) => set('cuisines', v)} />
      </Group>

      <Group title="Must-haves" hint="Stays that confirm they lack one are ranked lower; ones that don't say are flagged.">
        <Chips label="Must-have facilities" values={p.must_haves} options={Object.entries(meta.amenities) as [string, string][]}
          onChange={(v) => set('must_haves', v)} />
      </Group>

      <Group title="What matters most" error={shown.weights} hint="0 ignores a factor. 5 makes it count most.">
        <div className="grid grid-cols-[minmax(7.5rem,auto)_1fr_1.5rem] items-center gap-x-4 gap-y-3 text-sm">
          {FACTOR_ORDER.map((k) => (
            <div key={k} className="contents">
              <label htmlFor={`${id}-w-${k}`} className="font-medium text-ink">{meta.factors[k]}</label>
              <input id={`${id}-w-${k}`} type="range" min={0} max={5} step={1} className="range" value={p.weights[k]}
                onChange={(e) => set('weights', { ...p.weights, [k]: Number(e.target.value) })} />
              <output htmlFor={`${id}-w-${k}`} className="num text-right font-bold text-ink">{p.weights[k]}</output>
            </div>
          ))}
        </div>
      </Group>

      <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line bg-surface-2 py-4">
        <button type="submit" className="btn-primary btn min-h-12 px-6 text-[15px]" disabled={busy}>
          <Search className="size-4" aria-hidden /> {busy ? 'Searching…' : submitLabel}
        </button>
        {errCount > 0 && <span className="field-error" role="alert">Fix {errCount === 1 ? 'the highlighted field' : `${errCount} highlighted fields`} first.</span>}
        {errCount === 0 && Number.isFinite(p.budget) && <span className="num text-sm text-muted">{inr(p.budget)} {p.budget_mode === 'all_in' ? 'all-in' : 'rent'} · up to {p.max_commute_min} min</span>}
      </div>
    </form>
  )
}
