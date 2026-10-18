import { inr } from './format'
import type { MatchResult } from './types'

/** Practical questions for a site visit, tailored to what this listing does and does not report. */
export function visitChecklist(r: MatchResult, destination: string): string[] {
  const l = r.listing
  const items = [
    l.deposit != null ? `Get the deposit refund terms in writing (${inr(l.deposit)}).` : 'Ask the deposit amount and get its refund terms in writing.',
    l.electricity_included === true ? 'Confirm electricity is included, including AC if there is one.' : 'Ask exactly how electricity is billed and what last month cost.',
    'Check water supply hours and the hot water in the bathroom you will use.',
    'Run a speed test on the Wi-Fi from the room, not the lobby.',
    l.stay_type === 'flat' ? 'Get a registered leave-and-licence agreement and complete police tenant verification.' : 'Ask for the house rules in writing, including notice period and lock-in.',
    `Make the trip to ${destination} at the time you would leave for an 8 am lecture.`,
    r.food[0] ? `Eat one meal at ${r.food[0].kind === 'in_house' ? 'the in-house kitchen' : r.food[0].name} before deciding.` : 'Find out where residents eat, and try it.',
    'Talk to a current resident without the owner present.',
  ]
  return items
}
