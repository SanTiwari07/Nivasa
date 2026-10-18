from __future__ import annotations

import pytest

from app.config import Settings
from app.services.commute import auto_fare, bus_fare, estimate_commute, metro_fare, recommend
from app.services.context import get_context
from app.services.geo import GridIndex, Point, haversine_km, in_region

COEP = Point(18.5306, 73.8565)
FERGUSSON = Point(18.5241, 73.8388)


def test_haversine_matches_known_distance():
    # COEP to Fergusson College is about 2.0 km in a straight line.
    assert haversine_km(COEP, FERGUSSON) == pytest.approx(2.0, abs=0.15)
    assert haversine_km(COEP, COEP) == 0


def test_region_bounds():
    assert in_region(18.52, 73.85)  # central Pune
    assert in_region(18.65, 73.76)  # Nigdi, PCMC
    assert not in_region(19.07, 72.88)  # Mumbai


def test_grid_index_radius_query_is_sorted_and_bounded():
    pts = [Point(18.5306 + i * 0.002, 73.8565) for i in range(20)]
    hits = GridIndex(pts).within(COEP, 1.0)
    assert hits and all(d <= 1.0 for d, _ in hits)
    assert [d for d, _ in hits] == sorted(d for d, _ in hits)
    assert len(hits) == 5  # 0, 0.22, 0.44, 0.67, 0.89 km


def test_metro_network_needs_transfer_between_lines():
    net = get_context().metro
    assert len(net.stops) >= 25
    vanaz = next(i for i, s in enumerate(net.stops) if s.name == "Vanaz")
    swargate = next(i for i, s in enumerate(net.stops) if s.name == "Swargate")
    path = net.path(vanaz, swargate)
    assert path is not None
    assert path.lines == ["Aqua Line", "Purple Line"]
    assert path.transfers, "Aqua to Purple must change at District Court"


def test_metro_same_line_has_no_transfer():
    net = get_context().metro
    a = next(i for i, s in enumerate(net.stops) if s.name == "Shivaji Nagar")
    b = next(i for i, s in enumerate(net.stops) if s.name == "PCMC Bhavan")
    path = net.path(a, b)
    assert path is not None and path.transfers == [] and path.lines == ["Purple Line"]
    assert path.stops == 8


@pytest.mark.parametrize(("km", "fare"), [(0.5, 10), (1.5, 15), (3, 20), (6, 25), (12, 30), (20, 35)])
def test_metro_fare_slabs(km, fare):
    assert metro_fare(km) == fare


def test_bus_and_auto_fares():
    assert bus_fare(4) == 10 and bus_fare(7) == 20 and bus_fare(14) == 30
    assert auto_fare(1.0) == 30          # minimum fare covers 1.5 km
    assert auto_fare(3.5) == 70          # 30 + 2 km x 20


def test_commute_options_for_nearby_and_far_stays():
    s = Settings(_env_file=None)
    near = estimate_commute(Point(18.5320, 73.8500), COEP, s, get_context().metro)
    walk = next(o for o in near.options if o.mode == "walk")
    assert walk.available and walk.minutes is not None and walk.minutes < 15
    bus = next(o for o in near.options if o.mode == "bus")
    assert not bus.available  # too close for a bus

    far = estimate_commute(Point(18.6528, 73.7621), COEP, s, get_context().metro)  # PCCOE, Nigdi
    assert not next(o for o in far.options if o.mode == "walk").available
    bus_far = next(o for o in far.options if o.mode == "bus")
    assert bus_far.monthly_cost == 1500  # capped at the monthly pass


def test_metro_route_from_kothrud_to_coep_uses_aqua_line():
    s = Settings(_env_file=None)
    est = estimate_commute(Point(18.5072, 73.8060), COEP, s, get_context().metro)  # beside Vanaz station
    metro = next(o for o in est.options if o.mode == "metro")
    assert metro.available
    assert "Aqua Line" in metro.detail["lines"]
    assert metro.per_trip_cost is not None and metro.per_trip_cost < 25  # student concession applied


def test_recommend_respects_allowed_modes_and_limit():
    s = Settings(_env_file=None)
    est = estimate_commute(Point(18.5102, 73.8482), COEP, s, get_context().metro)
    opt, within = recommend(est.options, ["walk"], 60)
    assert opt is not None and opt.mode == "walk" and within
    opt, within = recommend(est.options, ["walk"], 10)
    assert opt is not None and not within  # still reported, but flagged as over the limit
    opt, within = recommend(est.options, ["cycle"], 5)
    assert not within
