"""Small geospatial helpers: great-circle distance and a grid index for 'what is near here'."""

from __future__ import annotations

import math
from collections import defaultdict
from collections.abc import Iterable
from dataclasses import dataclass
from typing import Generic, Protocol, TypeVar

EARTH_RADIUS_KM = 6371.0088

# Pune Metropolitan Region, the area Nivasa covers (south, west, north, east).
REGION_BOUNDS = (18.35, 73.65, 18.78, 74.10)


class HasLatLng(Protocol):
    lat: float
    lng: float


@dataclass(frozen=True, slots=True)
class Point:
    lat: float
    lng: float


def haversine_km(a: HasLatLng, b: HasLatLng) -> float:
    p1, p2 = math.radians(a.lat), math.radians(b.lat)
    dp = p2 - p1
    dl = math.radians(b.lng - a.lng)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(h))


def in_region(lat: float, lng: float) -> bool:
    s, w, n, e = REGION_BOUNDS
    return s <= lat <= n and w <= lng <= e


T = TypeVar("T", bound=HasLatLng)


class GridIndex(Generic[T]):
    """Buckets points into ~1 km cells so radius queries only look at nearby cells."""

    CELL_DEG = 0.01  # about 1.1 km of latitude

    def __init__(self, items: Iterable[T]) -> None:
        self._cells: dict[tuple[int, int], list[T]] = defaultdict(list)
        self.size = 0
        for it in items:
            self._cells[self._key(it.lat, it.lng)].append(it)
            self.size += 1

    def _key(self, lat: float, lng: float) -> tuple[int, int]:
        return int(math.floor(lat / self.CELL_DEG)), int(math.floor(lng / self.CELL_DEG))

    def within(self, p: HasLatLng, radius_km: float) -> list[tuple[float, T]]:
        """Items within radius_km of p (straight line), nearest first, as (distance_km, item)."""
        r_cells = int(math.ceil(radius_km / 1.1)) + 1
        ci, cj = self._key(p.lat, p.lng)
        out: list[tuple[float, T]] = []
        for i in range(ci - r_cells, ci + r_cells + 1):
            for j in range(cj - r_cells, cj + r_cells + 1):
                for it in self._cells.get((i, j), ()):
                    d = haversine_km(p, it)
                    if d <= radius_km:
                        out.append((d, it))
        out.sort(key=lambda x: x[0])
        return out
