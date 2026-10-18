"""In-memory reference data (POIs, metro network) loaded once from the database.

The OSM snapshot changes only when the seed command runs, so it is cached for
the life of the process. Call ``reset_context()`` after reseeding in-process.
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.db import SessionLocal
from app.models import MetroLine, Poi
from app.services.geo import GridIndex
from app.services.transit import MetroNetwork


@dataclass(frozen=True, slots=True)
class PoiRec:
    id: str
    category: str
    name: str | None
    lat: float
    lng: float
    cuisine: tuple[str, ...] | None
    pure_veg: bool | None
    jain: bool | None
    opening_hours: str | None


@dataclass(slots=True)
class Context:
    settings: Settings
    poi_index: dict[str, GridIndex[PoiRec]]
    metro: MetroNetwork


def build_context(db: Session, settings: Settings) -> Context:
    by_cat: dict[str, list[PoiRec]] = {}
    for p in db.scalars(select(Poi)):
        by_cat.setdefault(p.category, []).append(PoiRec(
            p.id, p.category, p.name, p.lat, p.lng, tuple(p.cuisine) if p.cuisine else None,
            p.pure_veg, p.jain, p.opening_hours))
    lines = [(l.id, l.name, [(s.name, s.lat, s.lng) for s in l.stops]) for l in db.scalars(select(MetroLine))]
    return Context(settings, {k: GridIndex(v) for k, v in by_cat.items()}, MetroNetwork(lines))


@lru_cache(maxsize=1)
def get_context() -> Context:
    with SessionLocal() as db:
        return build_context(db, get_settings())


def reset_context() -> None:
    get_context.cache_clear()
