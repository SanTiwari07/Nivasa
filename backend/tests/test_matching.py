"""Matching must explain itself and never invent unknown facts."""

from __future__ import annotations

from app.models import Listing, RoomOption
from app.schemas import Preferences
from app.services.context import get_context
from app.services.geo import Point
from app.services.matching import budget_needed, evaluate, rupees

from .conftest import prefs

COEP = Point(18.5306, 73.8565)


def make_listing(**over) -> Listing:
    rooms = over.pop("rooms", [RoomOption(sharing="double", monthly_rent=8000)])
    base = dict(id="t-1", name="Test PG", stay_type="pg", gender="boys", area="Shivajinagar", address=None,
                lat=18.5316, lng=73.8466, location_precision="exact", description=None, food_included=True,
                meals="Breakfast + dinner", kitchen_cuisines=["Maharashtrian"], kitchen_pure_veg=True,
                electricity_included=True, electricity_estimate=None, deposit=None, notice_period=None,
                lock_in=None, curfew=None, guest_policy=None, available_beds=2,
                amenities={"wifi": True, "ac": False}, safety={"cctv": True},
                contact_name=None, contact_phone=None, contact_email=None, is_demo=False,
                verification_status="visit_verified", verified_on=None, data_source="test")
    base.update(over)
    return Listing(**base, rooms=rooms)


def run(listing: Listing, **p):
    return evaluate(listing, Preferences(**prefs(**p)), COEP, "COEP", get_context())


def test_complete_listing_scores_every_factor():
    r = run(make_listing())
    assert r.score is not None and 0 <= r.score <= 100
    assert r.score_coverage == 1.0 and r.score == r.assessed_score
    assert r.hidden_reasons == []
    assert r.cost.food.basis == "included" and r.cost.food.amount == 0
    assert r.cost.all_in_known == 8000 + (r.cost.travel.amount or 0)
    assert any("under your all-in budget" in s for s in r.reasons)


def test_unknown_rent_is_not_guessed_and_not_hidden():
    r = run(make_listing(rooms=[RoomOption(sharing="double", monthly_rent=None)]))
    budget = next(f for f in r.factors if f.key == "budget")
    assert budget.score is None
    assert r.cost.rent.amount is None and r.cost.rent.basis == "unknown"
    assert r.cost.all_in_known is None
    assert "budget" not in r.hidden_reasons
    assert r.score_coverage < 1.0
    assert r.score is not None and r.assessed_score is not None and r.score < r.assessed_score
    assert any("Rent not reported" in w for w in r.warnings)


def test_hiding_rent_does_not_beat_reporting_it():
    known = run(make_listing(rooms=[RoomOption(sharing="double", monthly_rent=9000)]))
    hidden = run(make_listing(rooms=[RoomOption(sharing="double", monthly_rent=None)]))
    assert known.score is not None and hidden.score is not None and known.score > hidden.score


def test_unknown_facts_reduce_coverage_instead_of_score():
    r = run(make_listing(amenities={}, safety={}))
    keys = {f.key: f.score for f in r.factors}
    assert keys["facilities"] is None and keys["safety"] is None
    assert r.score is not None


def test_gender_and_type_filters():
    assert "gender" in run(make_listing(gender="girls")).hidden_reasons
    assert run(make_listing(gender="coed")).hidden_reasons == []
    unknown = run(make_listing(gender=None))
    assert unknown.hidden_reasons == [] and any("policy not reported" in w for w in unknown.warnings)
    assert "type" in run(make_listing(), stay_types=["hostel"]).hidden_reasons


def test_sharing_filter_hides_only_when_rooms_are_known():
    assert "sharing" in run(make_listing(), sharing="single").hidden_reasons
    r = run(make_listing(rooms=[]), sharing="single")
    assert "sharing" not in r.hidden_reasons


def test_over_budget_is_hidden_past_tolerance():
    r = run(make_listing(rooms=[RoomOption(sharing="double", monthly_rent=20000)]), budget=12000)
    assert "budget" in r.hidden_reasons
    r2 = run(make_listing(rooms=[RoomOption(sharing="double", monthly_rent=20000)]), budget=12000, budget_mode="rent")
    assert "budget" in r2.hidden_reasons and r2.cost.compared_amount == 20000


def test_missing_and_unconfirmed_must_haves_are_flagged():
    r = run(make_listing(), must_haves=["ac", "gym"])
    assert any(w.startswith("No AC") for w in r.warnings)
    assert any("Not confirmed: Gym" in w for w in r.warnings)


def test_demo_listing_is_labelled():
    r = run(make_listing(is_demo=True))
    assert r.warnings[0].startswith("Demo listing")


def test_far_listing_hidden_by_commute_limit():
    r = run(make_listing(lat=18.6528, lng=73.7621), modes=["walk"], max_commute_min=20)
    assert "commute" in r.hidden_reasons


def test_rupee_format_and_budget_helper():
    assert rupees(123456) == "₹1,23,456"
    assert rupees(950) == "₹950"
    assert rupees(-1200) == "-₹1,200"
    assert budget_needed(11500) == 10000
