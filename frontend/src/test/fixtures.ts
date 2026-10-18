import type { College, MatchResult, Meta } from '../lib/types'

export const meta: Meta = {
  stay_types: { hostel: 'Hostel', pg: 'PG', flat: 'Shared flat' },
  genders: { boys: 'Boys only', girls: 'Girls only', coed: 'Co-ed' },
  sharing: { single: 'Single room', double: 'Double sharing', triple: 'Triple sharing', quad: 'Four sharing' },
  modes: { walk: 'Walk', cycle: 'Cycle', two_wheeler: 'Own two-wheeler', metro: 'Pune Metro', bus: 'PMPML bus', auto: 'Auto-rickshaw' },
  diets: { veg: 'Vegetarian', nonveg: 'Non-veg is fine', jain: 'Jain' },
  cuisines: ['Maharashtrian', 'North Indian'],
  amenities: { wifi: 'Wi-Fi', ac: 'AC' },
  safety: { cctv: 'CCTV' },
  essentials: { grocery: 'Grocery' },
  factors: { budget: 'Budget', commute: 'Commute', food: 'Food', facilities: 'Facilities', market: 'Market & essentials', safety: 'Safety' },
  default_weights: { budget: 4, commute: 4, food: 3, facilities: 3, market: 2, safety: 3 },
  region_bounds: [18.35, 73.65, 18.78, 74.1],
  datasets: [],
  geocoder_enabled: false,
  routing_provider: 'estimate',
}

export const colleges: College[] = [
  { id: 'coep', name: 'COEP Technological University', short_name: 'COEP', area: 'Shivajinagar', lat: 18.5306, lng: 73.8565, osm_ref: 'r3718263' },
  { id: 'fergusson', name: 'Fergusson College', short_name: 'Fergusson', area: 'FC Road', lat: 18.5241, lng: 73.8388, osm_ref: 'w208180365' },
]

export function makeResult(over: Partial<MatchResult> = {}): MatchResult {
  return {
    listing: {
      id: 'demo-001', name: 'Green Leaf PG', stay_type: 'pg', gender: 'boys', area: 'Shivajinagar', address: null,
      lat: 18.53, lng: 73.85, location_precision: 'approximate', description: null,
      rooms: [{ sharing: 'double', monthly_rent: 9500 }], food_included: true, meals: 'Breakfast + dinner',
      kitchen_cuisines: ['Maharashtrian'], kitchen_pure_veg: true, electricity_included: null, electricity_estimate: null,
      deposit: null, notice_period: null, lock_in: null, curfew: null, guest_policy: null, available_beds: 2,
      amenities: { wifi: true }, safety: {}, contact_name: null, contact_phone: null, contact_email: null,
      is_demo: true, verification_status: 'unverified', verified_on: null, data_source: 'demo',
    },
    score: 66,
    assessed_score: 72,
    score_coverage: 0.84,
    factors: [],
    cost: {
      rent: { amount: 9500, basis: 'reported', note: 'Double sharing' }, sharing: 'double',
      food: { amount: 0, basis: 'included', note: 'Included' },
      travel: { amount: 0, basis: 'not_needed', note: 'Walk' },
      electricity: { amount: null, basis: 'unknown', note: 'Not reported' },
      all_in_known: 9500, unknown_parts: ['electricity'], budget: 13000, budget_mode: 'all_in', compared_amount: 9500, difference: 3500,
    },
    commute: {
      distance_km: 1.1, straight_km: 0.85, routing_source: 'estimate', within_limit: true,
      recommended: { mode: 'walk', label: 'Walk', available: true, in_preferences: true, minutes: 14, monthly_cost: 0, per_trip_cost: 0, note: '1.1 km on foot' },
      options: [],
    },
    food: [],
    essentials: { by_category: {}, within_walk: 3, categories_total: 8 },
    nearest_police: null,
    nearest_hospital: null,
    reasons: ['₹3,500 under your all-in budget', '14-minute walk to COEP'],
    warnings: ['Demo listing: not a real property', 'Electricity cost unknown, so the all-in figure may be low'],
    hidden_reasons: [],
    ...over,
  }
}
