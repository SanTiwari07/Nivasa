"""Address and landmark lookup, limited to the Pune region.

Nominatim's usage policy allows at most one request per second with an
identifying User-Agent, and asks clients to cache results. Both are handled here.
"""

from __future__ import annotations

import threading
import time
from collections import OrderedDict

import httpx

from app.config import Settings
from app.schemas import GeocodeResult
from app.services.geo import REGION_BOUNDS, in_region


class GeocoderUnavailable(Exception):
    pass


class NominatimGeocoder:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._lock = threading.Lock()
        self._last = 0.0
        self._cache: OrderedDict[str, list[GeocodeResult]] = OrderedDict()

    def search(self, query: str, limit: int = 5) -> list[GeocodeResult]:
        key = " ".join(query.lower().split())
        if key in self._cache:
            self._cache.move_to_end(key)
            return self._cache[key]
        s, w, n, e = REGION_BOUNDS
        with self._lock:  # serialise requests to honour the 1 request/second policy
            wait = 1.0 - (time.monotonic() - self._last)
            if wait > 0:
                time.sleep(wait)
            try:
                r = httpx.get(f"{self.settings.nominatim_url.rstrip('/')}/search", timeout=self.settings.http_timeout_s,
                              headers={"User-Agent": self.settings.nominatim_user_agent},
                              params={"q": query, "format": "jsonv2", "limit": limit, "countrycodes": "in",
                                      "viewbox": f"{w},{n},{e},{s}", "bounded": 1, "addressdetails": 0})
                r.raise_for_status()
                rows = r.json()
            except Exception as exc:
                raise GeocoderUnavailable(str(exc)) from exc
            finally:
                self._last = time.monotonic()
        out = []
        for row in rows:
            lat, lng = float(row["lat"]), float(row["lon"])
            if not in_region(lat, lng):
                continue
            label = row.get("display_name", "")
            out.append(GeocodeResult(label=label, short_label=row.get("name") or label.split(",")[0],
                                     lat=lat, lng=lng, source="OpenStreetMap Nominatim"))
        self._cache[key] = out
        if len(self._cache) > 500:
            self._cache.popitem(last=False)
        return out


_geocoder: NominatimGeocoder | None = None


def get_geocoder(settings: Settings) -> NominatimGeocoder | None:
    global _geocoder
    if settings.geocoder == "none":
        return None
    if _geocoder is None or _geocoder.settings is not settings:
        _geocoder = NominatimGeocoder(settings)
    return _geocoder
