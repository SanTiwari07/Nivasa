import { describe, expect, it } from 'vitest'
import { emptyPreferences, fromSearchParams, hasDestination, toSearchParams, validatePreferences } from './prefs'

describe('preferences', () => {
  it('requires a destination and sensible values', () => {
    const p = emptyPreferences()
    expect(hasDestination(p)).toBe(false)
    const e = validatePreferences({ ...p, budget: 100, stay_types: [], modes: [] })
    expect(Object.keys(e).sort()).toEqual(['budget', 'destination', 'modes', 'stay_types'])
  })

  it('rejects all-zero priorities', () => {
    const p = { ...emptyPreferences(), destination: { college_id: 'coep' } }
    const zero = { budget: 0, commute: 0, food: 0, facilities: 0, market: 0, safety: 0 }
    expect(validatePreferences({ ...p, weights: zero }).weights).toBeTruthy()
    expect(validatePreferences(p)).toEqual({})
  })

  it('round-trips through the URL', () => {
    const p = {
      ...emptyPreferences(),
      destination: { college_id: 'mit-wpu' },
      budget: 15500,
      budget_mode: 'rent' as const,
      gender: 'girls' as const,
      stay_types: ['pg' as const],
      sharing: 'single' as const,
      modes: ['metro' as const, 'auto' as const],
      max_commute_min: 45,
      diet: 'jain' as const,
      cuisines: ['North Indian', 'Jain'],
      must_haves: ['wifi', 'ac'],
      weights: { budget: 5, commute: 1, food: 0, facilities: 2, market: 3, safety: 4 },
    }
    expect(fromSearchParams(toSearchParams(p))).toEqual(p)
  })

  it('round-trips a pinned point with a label', () => {
    const p = { ...emptyPreferences(), destination: { lat: 18.59131, lng: 73.73891, label: 'Hinjewadi Phase 1' } }
    const back = fromSearchParams(toSearchParams(p))
    expect(back.destination).toEqual({ lat: 18.59131, lng: 73.73891, label: 'Hinjewadi Phase 1' })
  })

  it('ignores junk in the URL instead of crashing', () => {
    const p = fromSearchParams(new URLSearchParams('college=coep&types=castle,pg&modes=teleport&w=99&budget=abc&diet=keto'))
    expect(p.stay_types).toEqual(['pg'])
    expect(p.modes).toEqual([])
    expect(p.budget).toBe(13000)
    expect(p.diet).toBe('veg')
    expect(validatePreferences(p).modes).toBeTruthy()
  })
})
