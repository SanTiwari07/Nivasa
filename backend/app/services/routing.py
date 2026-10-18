"""Road-distance providers. The default estimate needs no network access."""

from __future__ import annotations

import logging

import httpx

from app.config import Settings
from app.services.geo import Point

log = logging.getLogger(__name__)


def road_distances(origins: list[Point], dest: Point, settings: Settings) -> tuple[list[float] | None, str]:
    """Road distances in km from each origin to dest, or (None, "estimate") to use the straight-line estimate."""
    if settings.routing_provider != "osrm" or not origins:
        return None, "estimate"
    # OSRM table service: one request for all origins. Coordinates are lng,lat.
    coords = ";".join(f"{p.lng:.6f},{p.lat:.6f}" for p in [*origins, dest])
    sources = ";".join(str(i) for i in range(len(origins)))
    url = f"{settings.osrm_url.rstrip('/')}/table/v1/driving/{coords}"
    try:
        r = httpx.get(url, params={"sources": sources, "destinations": str(len(origins)), "annotations": "distance"},
                      timeout=settings.http_timeout_s)
        r.raise_for_status()
        data = r.json()
        rows = data.get("distances")
        if data.get("code") != "Ok" or not rows:
            raise ValueError(data.get("code"))
        out = [row[0] / 1000 if row and row[0] is not None else None for row in rows]
        if any(v is None for v in out):
            raise ValueError("missing distances")
        return [float(v) for v in out], "osrm"  # type: ignore[arg-type]
    except Exception as exc:  # any failure falls back to the documented estimate
        log.warning("OSRM routing failed, using estimate: %s", exc)
        return None, "estimate"
