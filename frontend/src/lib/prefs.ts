import type { Diet, FactorKey, Mode, Preferences, StayType, Weights } from './types'

export const FACTOR_ORDER: FactorKey[] = ['budget', 'commute', 'food', 'facilities', 'market', 'safety']
export const DEFAULT_WEIGHTS: Weights = { budget: 4, commute: 4, food: 3, facilities: 3, market: 2, safety: 3 }
const STAY_TYPES: StayType[] = ['hostel', 'pg', 'flat']
const MODES: Mode[] = ['walk', 'cycle', 'two_wheeler', 'metro', 'bus', 'auto']
const DIETS: Diet[] = ['veg', 'nonveg', 'jain']
export const BUDGET_MIN = 3000
export const BUDGET_MAX = 60000

/** A starting point for the form. The student must still choose a destination. */
export function emptyPreferences(): Preferences {
  return {
    destination: {},
    budget: 13000,
    budget_mode: 'all_in',
    gender: 'boys',
    stay_types: ['hostel', 'pg', 'flat'],
    sharing: 'any',
    modes: ['walk', 'metro', 'bus'],
    max_commute_min: 30,
    diet: 'veg',
    pure_veg_only: false,
    cuisines: [],
    must_haves: [],
    weights: { ...DEFAULT_WEIGHTS },
  }
}

export type PrefErrors = Partial<Record<'destination' | 'budget' | 'stay_types' | 'modes' | 'weights' | 'max_commute_min', string>>

export function validatePreferences(p: Preferences): PrefErrors {
  const e: PrefErrors = {}
  const d = p.destination
  if (!d.college_id && (d.lat == null || d.lng == null)) e.destination = 'Choose your college, search an address, or pin a spot on the map.'
  if (!Number.isFinite(p.budget) || p.budget < BUDGET_MIN || p.budget > BUDGET_MAX)
    e.budget = `Enter a monthly budget between ₹${BUDGET_MIN.toLocaleString('en-IN')} and ₹${BUDGET_MAX.toLocaleString('en-IN')}.`
  if (p.stay_types.length === 0) e.stay_types = 'Pick at least one kind of stay.'
  if (p.modes.length === 0) e.modes = 'Pick at least one way to get to college.'
  if (p.max_commute_min < 5 || p.max_commute_min > 90) e.max_commute_min = 'Choose a trip length between 5 and 90 minutes.'
  if (FACTOR_ORDER.every((k) => p.weights[k] === 0)) e.weights = 'At least one priority needs to be above zero.'
  return e
}

const list = <T extends string>(v: string | null, allowed: readonly T[]): T[] | null =>
  v == null ? null : (v.split(',').filter((x): x is T => (allowed as readonly string[]).includes(x)))

/** Preferences live in the URL so a search can be bookmarked and shared. */
export function toSearchParams(p: Preferences): URLSearchParams {
  const q = new URLSearchParams()
  const d = p.destination
  if (d.college_id) q.set('college', d.college_id)
  else if (d.lat != null && d.lng != null) {
    q.set('lat', d.lat.toFixed(5))
    q.set('lng', d.lng.toFixed(5))
    if (d.label) q.set('place', d.label)
  }
  q.set('budget', String(p.budget))
  if (p.budget_mode !== 'all_in') q.set('budget_mode', p.budget_mode)
  q.set('for', p.gender)
  q.set('types', p.stay_types.join(','))
  if (p.sharing !== 'any') q.set('sharing', p.sharing)
  q.set('modes', p.modes.join(','))
  q.set('max', String(p.max_commute_min))
  q.set('diet', p.diet)
  if (p.pure_veg_only) q.set('pureveg', '1')
  if (p.cuisines.length) q.set('food', p.cuisines.join('|'))
  if (p.must_haves.length) q.set('need', p.must_haves.join(','))
  q.set('w', FACTOR_ORDER.map((k) => p.weights[k]).join(''))
  return q
}

export function fromSearchParams(q: URLSearchParams): Preferences {
  const p = emptyPreferences()
  const college = q.get('college')
  const lat = Number(q.get('lat'))
  const lng = Number(q.get('lng'))
  if (college) p.destination = { college_id: college }
  else if (q.has('lat') && q.has('lng') && Number.isFinite(lat) && Number.isFinite(lng))
    p.destination = { lat, lng, label: q.get('place') ?? undefined }
  const budget = Number(q.get('budget'))
  if (Number.isFinite(budget) && budget > 0) p.budget = Math.round(budget)
  if (q.get('budget_mode') === 'rent') p.budget_mode = 'rent'
  if (q.get('for') === 'girls') p.gender = 'girls'
  p.stay_types = list(q.get('types'), STAY_TYPES) ?? p.stay_types
  const sharing = q.get('sharing')
  if (sharing === 'single' || sharing === 'double' || sharing === 'triple') p.sharing = sharing
  p.modes = list(q.get('modes'), MODES) ?? p.modes
  const max = Number(q.get('max'))
  if (Number.isFinite(max) && max > 0) p.max_commute_min = Math.round(max)
  const diet = q.get('diet')
  if (diet && (DIETS as string[]).includes(diet)) p.diet = diet as Diet
  p.pure_veg_only = q.get('pureveg') === '1'
  p.cuisines = q.get('food')?.split('|').filter(Boolean) ?? []
  p.must_haves = q.get('need')?.split(',').filter(Boolean) ?? []
  const w = q.get('w')
  if (w && /^[0-5]{6}$/.test(w)) FACTOR_ORDER.forEach((k, i) => { p.weights[k] = Number(w[i]) })
  return p
}

export function hasDestination(p: Preferences): boolean {
  return Boolean(p.destination.college_id) || (p.destination.lat != null && p.destination.lng != null)
}
