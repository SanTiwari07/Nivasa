# Matching methodology

This describes how Nivasa turns a student's preferences into a ranked, explained list of stays,
as implemented in `backend/app/services/`. Figures were checked in October 2026.

## Principles

- **Unknown stays unknown.** Missing listing facts are stored as `NULL` (or a missing key in the
  `amenities`/`safety` maps) and shown as "Not reported". They are never filled with guesses.
- **Estimates are labelled.** Travel time, travel cost and the mess cost for stays without meals are
  estimates and say so in the API (`basis: "estimate"`) and the UI.
- **Absence of map data is not absence.** OpenStreetMap is volunteer-mapped; "no mess mapped nearby"
  never counts as "no mess nearby".

## Eligibility (hidden stays)

A stay is hidden, and counted in `hidden_counts`, when:

| Reason | Rule |
| --- | --- |
| `type` | its stay type is not one the student picked |
| `gender` | it is boys-only or girls-only and does not match (unknown policy is shown with a warning) |
| `sharing` | the student wants a specific room type and the stay reports rooms but none of that type |
| `commute` | no allowed travel mode reaches the destination within the student's limit |
| `budget` | the compared amount (all-in or rent) is known and more than 15% over budget |

Stays hidden only by budget or commute are returned as grey "hidden" dots on the map, and the API
suggests the budget that would reveal up to three more.

## Factor scores (0-100)

| Factor | Inputs | Unknown when |
| --- | --- | --- |
| Budget | compared amount ÷ budget: 100 at ≤75%, 55 at 100%, 15 at 115% | rent not reported |
| Commute | recommended trip time: 100 at ≤8 min, 35 at the student's limit | never (0 if no mode works) |
| Food | best single kitchen within 1.5 km: 60% cuisine coverage + 40% proximity | no kitchen or mapped mess nearby |
| Facilities | 35 + 65 × confirmed amenities ÷ 12, −15 per confirmed-missing must-have, −7 per unconfirmed must-have | no amenities reported |
| Market | weighted nearness of grocery, pharmacy, xerox, vegetables, laundry, ATM, gym, library (OSM) | no mapped places within 1.5 km |
| Safety | 85 × reported safety features present ÷ reported, +15 if a police station is mapped within 2 km | no safety features reported |

A kitchen whose menu is unknown can score at most 50 on food when the student picked cuisines.

## Best-Fit score

```
assessed = Σ(weight × factor score) ÷ Σ(weight)        over factors that are known
coverage = Σ(weight of known factors) ÷ Σ(all weights)
score    = assessed × (0.5 + 0.5 × coverage)
```

Weights are the student's 0-5 priority sliders. Missing facts are excluded from `assessed` rather than
guessed, and the coverage multiplier keeps a stay that withholds what the student cares about from
outranking one that reports it. Bands: 78+ great, 62+ good, 45+ fair.

## Commute model

Road distance is `straight line × 1.3` (configurable), or OSRM road distance when
`NIVASA_ROUTING_PROVIDER=osrm` (falling back to the estimate on any failure).

| Mode | Time | Monthly cost (24 days × 2 trips) |
| --- | --- | --- |
| Walk | 4.8 km/h, only up to 3.5 km | free |
| Cycle | 12 km/h + 2 min, up to 10 km | free |
| Own two-wheeler | 22 km/h + 3 min | ₹2.4/km fuel (≈₹105/litre at 45 km/litre) |
| Pune Metro | walk to station + 5 min wait + 32 km/h + 0.5 min per stop + 6 min per change + walk | slab fare ₹10-35 by distance, minus 30% student concession |
| PMPML bus | 13 min walk and wait + 14 km/h, from 1.2 km | ₹10 (≤5 km), ₹20 (≤10), ₹30 (≤15), ₹40 (≤20), capped by the ₹1,500 pass |
| Auto | 4 min + 20 km/h | ₹30 for the first 1.5 km, then ₹20/km |

Metro routing uses the operational Purple and Aqua lines from OpenStreetMap route relations,
with a walking transfer between platforms on different lines within 400 m (District Court).
Stations still under construction are shown on the map but not used for routing. Stations are
used only if they are within about 1.5 km by road of each end.

The recommended mode is the allowed mode within the time limit that minimises
`minutes + monthly cost ÷ 120`, i.e. ₹1,200 a month is treated as worth about 10 minutes per trip.

## Monthly cost

`all-in = rent + food + travel + electricity`, counting only known parts and listing the unknown ones.

- Food when meals are not included: ₹2,900, from the SPPU member rate of ₹48 per veg meal (October 2026)
  × 2 meals × 30 days. OpenStreetMap has no mess prices.
- Electricity: included, the owner's reported estimate, or unknown.

## Sources

- Pune RTA auto tariff from 1 September 2026: The Bridge Chronicle, Punekar News.
- PMPML fares and passes from 1 June 2025: Punekar News.
- Pune Metro fare range and student concession: Housiey guide, Punekar News.
- SPPU mess rates from 1 October 2026: Punekar News.
- Rent references for demo data: Housing.com (Shivajinagar PGs), MahaCET student cost-of-living guide.
