"""Load reference data (colleges, OSM snapshot) and demo listings into the database.

Reference tables are replaced on every run. Real listings (submitted or
imported, ``is_demo = false``) are never touched; demo listings are replaced.
"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.models import College, DataSnapshot, Listing, MetroLine, MetroStation, MetroStop, Poi, RoomOption

DATA_DIR = Path(__file__).parent / "data"


def _load(name: str) -> dict:
    return json.loads((DATA_DIR / name).read_text(encoding="utf-8"))


def _dedupe_stations(items: list[dict]) -> list[dict]:
    """OSM maps some stations more than once (platform nodes, renamed duplicates). Keep one per ~150 m."""
    kept: list[dict] = []
    for s in sorted(items, key=lambda x: (x["status"] != "open", x["network"] is None, len(x["name"]))):
        if any(abs(k["lat"] - s["lat"]) < 0.0014 and abs(k["lng"] - s["lng"]) < 0.0014 for k in kept):
            continue
        kept.append(s)
    return kept


def seed_reference(db: Session) -> dict[str, int]:
    counts: dict[str, int] = {}
    colleges = _load("colleges.json")
    db.execute(delete(College))
    db.add_all(College(id=c["id"], name=c["name"], short_name=c["short_name"], area=c["area"], lat=c["lat"],
                       lng=c["lng"], osm_ref=c.get("osm_ref")) for c in colleges["items"])
    counts["colleges"] = len(colleges["items"])

    stations = _load("osm_stations.json")
    lines = _load("osm_metro_lines.json")
    db.execute(delete(MetroStop))
    db.execute(delete(MetroLine))
    db.execute(delete(MetroStation))
    kept = _dedupe_stations([s for s in stations["items"] if s.get("network") or s["status"] == "open"])
    db.add_all(MetroStation(id=s["osm"], name=s["name"], lat=s["lat"], lng=s["lng"], status=s["status"]) for s in kept)
    for l in lines["items"]:
        line = MetroLine(id=l["ref"], name=l["name"], colour=l.get("colour"), osm_ref=l.get("osm"))
        line.stops = [MetroStop(seq=i, name=s["name"], lat=s["lat"], lng=s["lng"]) for i, s in enumerate(l["stops"])]
        db.add(line)
    counts["metro_stations"] = len(kept)
    counts["metro_lines"] = len(lines["items"])

    pois = _load("osm_pois.json")
    db.execute(delete(Poi))
    db.add_all(Poi(id=p["osm"], category=p["cat"], name=p.get("name"), lat=p["lat"], lng=p["lng"],
                   cuisine=p.get("cuisine"), pure_veg=p.get("pure_veg"), jain=p.get("jain"),
                   opening_hours=p.get("opening_hours")) for p in pois["items"])
    counts["pois"] = len(pois["items"])

    db.execute(delete(DataSnapshot))
    db.add_all([
        DataSnapshot(key="colleges", source=colleges["source"], fetched_at="2026-10-18", record_count=counts["colleges"]),
        DataSnapshot(key="metro", source=lines["source"], fetched_at=lines["fetched_at"], record_count=counts["metro_stations"]),
        DataSnapshot(key="pois", source=pois["source"], fetched_at=pois["fetched_at"], record_count=counts["pois"]),
    ])
    return counts


def seed_demo_listings(db: Session) -> int:
    data = _load("demo_listings.json")
    db.execute(delete(Listing).where(Listing.is_demo.is_(True)))
    for d in data["items"]:
        rooms = [RoomOption(sharing=r["sharing"], monthly_rent=r["monthly_rent"]) for r in d.pop("rooms")]
        db.add(Listing(**d, rooms=rooms, is_demo=True, status="active", verification_status="unverified",
                       data_source="Generated demo data (scripts/generate_demo_listings.py)"))
    db.add(DataSnapshot(key="demo_listings", source="Fictional demo listings for development",
                        fetched_at=date.today().isoformat(), record_count=len(data["items"])))
    return len(data["items"])


def seed_all(db: Session, include_demo: bool = True) -> dict[str, int]:
    counts = seed_reference(db)
    if include_demo:
        counts["demo_listings"] = seed_demo_listings(db)
    else:
        db.execute(delete(Listing).where(Listing.is_demo.is_(True)))
    db.commit()
    return counts
