"""Commute estimates from a stay to a student's destination, per travel mode.

Times and fares are estimates for a typical weekday trip, not live timetables.
Fare references (October 2026):
  * Auto: ₹30 for the first 1.5 km, then ₹20/km (Pune RTA, from 1 Sep 2026).
  * PMPML bus: ₹10 up to 5 km, ₹20 up to 10 km, ₹30 up to 15 km, ₹40 up to 20 km;
    monthly pass ₹1,500 (from 1 Jun 2025).
  * Pune Metro: ₹10-35 by distance, 30% student concession.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from app.config import Settings
from app.services.geo import Point, haversine_km
from app.services.transit import MetroNetwork

Mode = Literal["walk", "cycle", "two_wheeler", "metro", "bus", "auto"]
ALL_MODES: tuple[Mode, ...] = ("walk", "cycle", "two_wheeler", "metro", "bus", "auto")
MODE_LABELS: dict[str, str] = {"walk": "Walk", "cycle": "Cycle", "two_wheeler": "Own two-wheeler",
                               "metro": "Pune Metro", "bus": "PMPML bus", "auto": "Auto-rickshaw"}

WALK_KMPH = 4.8
CYCLE_KMPH = 12.0
TWO_WHEELER_KMPH = 22.0
AUTO_KMPH = 20.0
BUS_KMPH = 14.0
BUS_OVERHEAD_MIN = 13.0      # walk to the stop and average wait
METRO_WAIT_MIN = 5.0
METRO_MAX_WALK_KM = 1.5      # road distance to a station that is still worth walking
BUS_PASS_MONTHLY = 1500


@dataclass(slots=True)
class ModeOption:
    mode: Mode
    available: bool
    minutes: int | None
    monthly_cost: int | None
    per_trip_cost: int | None
    note: str
    detail: dict = field(default_factory=dict)


@dataclass(slots=True)
class CommuteEstimate:
    distance_km: float          # road distance used for walk/cycle/road modes
    straight_km: float
    routing_source: str         # "estimate" or "osrm"
    options: list[ModeOption]


def walk_minutes(km: float) -> int:
    return max(1, round(km / WALK_KMPH * 60))


def metro_fare(ride_km: float) -> int:
    for limit, fare in ((1, 10), (2, 15), (4, 20), (8, 25), (16, 30)):
        if ride_km <= limit:
            return fare
    return 35


def bus_fare(km: float) -> int:
    for limit, fare in ((5, 10), (10, 20), (15, 30), (20, 40)):
        if km <= limit:
            return fare
    return 50


def auto_fare(km: float) -> int:
    return round(30 + max(0.0, km - 1.5) * 20)


def fmt_km(km: float) -> str:
    return f"{round(km * 1000 / 10) * 10:.0f} m" if km < 1 else f"{km:.1f} km"


def estimate_commute(origin: Point, dest: Point, settings: Settings, network: MetroNetwork | None,
                     road_km: float | None = None, routing_source: str = "estimate") -> CommuteEstimate:
    straight = haversine_km(origin, dest)
    km = road_km if road_km is not None else max(0.1, straight * settings.detour_factor)
    trips = 2 * settings.college_days_per_month
    opts: list[ModeOption] = []

    opts.append(ModeOption("walk", km <= 3.5, walk_minutes(km), 0, 0, f"{fmt_km(km)} on foot"))
    opts.append(ModeOption("cycle", km <= 10, round(km / CYCLE_KMPH * 60) + 2, 0, 0,
                           "Your own or a rented cycle"))
    fuel = round(km * settings.petrol_cost_per_km)
    opts.append(ModeOption("two_wheeler", True, round(km / TWO_WHEELER_KMPH * 60) + 3, fuel * trips, fuel,
                           f"Fuel about ₹{fuel} a trip at ₹{settings.petrol_cost_per_km:g}/km, plus parking"))
    opts.append(_metro_option(origin, dest, settings, network, trips))
    bf = bus_fare(km)
    opts.append(ModeOption("bus", km >= 1.2, round(BUS_OVERHEAD_MIN + km / BUS_KMPH * 60),
                           min(bf * trips, BUS_PASS_MONTHLY), bf,
                           "Too close to be worth a bus" if km < 1.2 else
                           f"₹{bf} a ride" + (". A ₹1,500 monthly pass works out cheaper" if bf * trips > BUS_PASS_MONTHLY else "")))
    af = auto_fare(km)
    opts.append(ModeOption("auto", True, round(4 + km / AUTO_KMPH * 60), af * trips, af,
                           f"Meter about ₹{af} a ride (₹30 for 1.5 km, then ₹20/km)"))
    return CommuteEstimate(round(km, 2), round(straight, 2), routing_source, opts)


def _metro_option(origin: Point, dest: Point, settings: Settings, network: MetroNetwork | None, trips: int) -> ModeOption:
    unavailable = ModeOption("metro", False, None, None, None, "No metro station within a 20-minute walk of both ends")
    if network is None or not network.stops:
        return unavailable
    radius = METRO_MAX_WALK_KM / settings.detour_factor
    starts = network.nearest_stops(origin, radius)[:4]
    ends = network.nearest_stops(dest, radius)[:4]
    if not starts or not ends:
        return unavailable
    best: tuple[float, dict] | None = None
    for si, sd in starts:
        for ei, ed in ends:
            path = network.path(si, ei)
            if path is None:
                continue
            wa, wb = sd * settings.detour_factor, ed * settings.detour_factor
            total = walk_minutes(wa) + METRO_WAIT_MIN + path.ride_min + walk_minutes(wb)
            if best is None or total < best[0]:
                best = (total, {"path": path, "walk_in_km": wa, "walk_out_km": wb})
    if best is None:
        same = network.stops[starts[0][0]].name
        return ModeOption("metro", False, None, None, None, f"Both ends are nearest to {same}, so the metro does not help")
    total, d = best
    p = d["path"]
    fare = round(metro_fare(p.ride_km) * (1 - settings.metro_student_concession))
    change = f", change at {p.transfers[0]}" if p.transfers else ""
    note = (f"{p.board.name} to {p.alight.name} on the {' then '.join(p.lines)}{change}, {p.stops} stop{'s' if p.stops != 1 else ''}. "
            f"Walk {fmt_km(d['walk_in_km'])} + {fmt_km(d['walk_out_km'])}. ₹{fare} a ride after the student concession")
    return ModeOption("metro", True, round(total), fare * trips, fare, note, {
        "board": p.board.name, "alight": p.alight.name, "lines": p.lines, "transfers": p.transfers,
        "stops": p.stops, "walk_in_km": round(d["walk_in_km"], 2), "walk_out_km": round(d["walk_out_km"], 2),
    })


def recommend(options: list[ModeOption], allowed: list[str], max_minutes: int) -> tuple[ModeOption | None, bool]:
    """Pick the best mode for this student: fast and cheap, among modes they accept.

    Returns (option, within_limit). Money is traded against time at ₹120 per minute
    per month (so ₹1,200 a month is worth about 10 minutes a trip).
    """
    usable = [o for o in options if o.available and o.mode in allowed and o.minutes is not None]
    within = [o for o in usable if o.minutes <= max_minutes]
    if within:
        return min(within, key=lambda o: o.minutes + (o.monthly_cost or 0) / 120), True
    if usable:
        return min(usable, key=lambda o: o.minutes), False
    return None, False
