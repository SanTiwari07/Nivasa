"""Pune Metro network model built from the OSM line relations.

Stations on different lines that are within TRANSFER_RADIUS_KM of each other
(District Court is mapped as separate platforms for the Purple and Aqua lines)
are joined by a walking transfer. Shortest paths use Dijkstra on minutes.
"""

from __future__ import annotations

import heapq
from dataclasses import dataclass, field

from app.services.geo import Point, haversine_km

RIDE_KMPH = 32.0          # average running speed between stations
DWELL_MIN = 0.5           # stop time at each intermediate station
TRANSFER_MIN = 6.0        # walk between platforms plus waiting for the second train
TRANSFER_RADIUS_KM = 0.4
TRACK_FACTOR = 1.1        # track is a little longer than the straight line between stations


@dataclass(frozen=True, slots=True)
class Stop:
    line_id: str
    line_name: str
    seq: int
    name: str
    lat: float
    lng: float


@dataclass(slots=True)
class MetroPath:
    board: Stop
    alight: Stop
    ride_km: float
    ride_min: float
    stops: int
    lines: list[str]
    transfers: list[str] = field(default_factory=list)


class MetroNetwork:
    def __init__(self, lines: list[tuple[str, str, list[tuple[str, float, float]]]]) -> None:
        """lines: [(line_id, line_name, [(stop_name, lat, lng), ...in order])]"""
        self.stops: list[Stop] = []
        for line_id, line_name, stops in lines:
            for seq, (name, lat, lng) in enumerate(stops):
                self.stops.append(Stop(line_id, line_name, seq, name, lat, lng))
        self._adj: dict[int, list[tuple[int, float, float, str]]] = {i: [] for i in range(len(self.stops))}
        idx = {(s.line_id, s.seq): i for i, s in enumerate(self.stops)}
        for i, s in enumerate(self.stops):
            nxt = idx.get((s.line_id, s.seq + 1))
            if nxt is not None:
                km = haversine_km(s, self.stops[nxt]) * TRACK_FACTOR
                minutes = km / RIDE_KMPH * 60 + DWELL_MIN
                self._adj[i].append((nxt, minutes, km, "ride"))
                self._adj[nxt].append((i, minutes, km, "ride"))
        for i, a in enumerate(self.stops):
            for j, b in enumerate(self.stops):
                if i < j and a.line_id != b.line_id and haversine_km(a, b) <= TRANSFER_RADIUS_KM:
                    self._adj[i].append((j, TRANSFER_MIN, 0.0, "transfer"))
                    self._adj[j].append((i, TRANSFER_MIN, 0.0, "transfer"))

    def nearest(self, p: Point) -> tuple[Stop, float] | None:
        if not self.stops:
            return None
        best = min(self.stops, key=lambda s: haversine_km(p, s))
        return best, haversine_km(p, best)

    def nearest_stops(self, p: Point, radius_km: float) -> list[tuple[int, float]]:
        out = [(i, haversine_km(p, s)) for i, s in enumerate(self.stops)]
        return sorted([x for x in out if x[1] <= radius_km], key=lambda x: x[1])

    def path(self, a: int, b: int) -> MetroPath | None:
        if a == b:
            return None
        dist = {a: 0.0}
        prev: dict[int, tuple[int, float, str]] = {}
        heap = [(0.0, a)]
        while heap:
            d, u = heapq.heappop(heap)
            if u == b:
                break
            if d > dist.get(u, float("inf")):
                continue
            for v, minutes, km, kind in self._adj[u]:
                nd = d + minutes
                if nd < dist.get(v, float("inf")):
                    dist[v] = nd
                    prev[v] = (u, km, kind)
                    heapq.heappush(heap, (nd, v))
        if b not in dist:
            return None
        ride_km, stops, transfers, lines = 0.0, 0, [], []
        node = b
        while node != a:
            u, km, kind = prev[node]
            if kind == "ride":
                ride_km += km
                stops += 1
                if not lines or lines[-1] != self.stops[node].line_name:
                    lines.append(self.stops[node].line_name)
            else:
                transfers.append(self.stops[node].name)
            node = u
        if stops == 0:  # only a platform transfer, e.g. between the two District Court platforms
            return None
        lines.reverse()
        return MetroPath(self.stops[a], self.stops[b], ride_km, dist[b], stops, lines, transfers)
