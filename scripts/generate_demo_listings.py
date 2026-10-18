"""Generate clearly-labelled DEMO accommodation listings for local development.

Nivasa has no verified real listings yet. Rather than leave the product empty,
this script produces a deterministic set of fictional hostels, PGs and shared
flats placed around real Pune neighbourhoods. Every record is marked
``is_demo: true`` and ``verification_status: "unverified"`` and the UI labels
it as demo data.

Some fields are deliberately left unknown (``null``) in a share of listings so
the product's "unknown stays unknown" behaviour can be exercised. Nothing here
includes contact details, ratings or reviews, because inventing those would be
misleading even in a demo.

Rent levels follow public Pune references gathered in October 2026:
PG beds around Shivajinagar at roughly ₹10,000-15,000/month and a citywide
student range of about ₹6,000-18,000/month.

    python scripts/generate_demo_listings.py
"""

from __future__ import annotations

import json
import random
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "backend" / "app" / "seed" / "data" / "demo_listings.json"
rnd = random.Random(20261018)

# (area, approximate centroid lat, lng, rent tier, number of demo listings)
AREAS = [
    ("Shivajinagar", 18.5316, 73.8466, 1.15, 4), ("Wakdewadi", 18.5358, 73.8538, 1.0, 2),
    ("Model Colony", 18.5288, 73.8366, 1.25, 2), ("Deccan Gymkhana", 18.5160, 73.8398, 1.3, 2),
    ("Sadashiv Peth", 18.5102, 73.8482, 1.05, 3), ("Narayan Peth", 18.5162, 73.8512, 1.0, 2),
    ("Kasba Peth", 18.5218, 73.8602, 0.9, 2), ("Erandwane", 18.5092, 73.8298, 1.2, 2),
    ("Kothrud", 18.5068, 73.8080, 1.05, 4), ("Karve Nagar", 18.4902, 73.8205, 0.95, 3),
    ("Aundh", 18.5592, 73.8082, 1.2, 3), ("Baner", 18.5590, 73.7868, 1.3, 2), ("Balewadi", 18.5760, 73.7790, 1.2, 2),
    ("Pashan", 18.5396, 73.7962, 1.0, 1), ("Bopodi", 18.5676, 73.8372, 0.85, 1), ("Khadki", 18.5632, 73.8492, 0.85, 1),
    ("Dhankawadi", 18.4592, 73.8532, 0.8, 3), ("Katraj", 18.4522, 73.8612, 0.75, 2), ("Bibwewadi", 18.4686, 73.8666, 0.85, 2),
    ("Narhe", 18.4555, 73.8250, 0.75, 2), ("Vadgaon Budruk", 18.4660, 73.8320, 0.78, 2), ("Swargate", 18.5002, 73.8582, 0.9, 1),
    ("Kondhwa", 18.4640, 73.8880, 0.8, 2), ("Camp", 18.5152, 73.8792, 1.1, 1), ("Koregaon Park", 18.5366, 73.8935, 1.45, 1),
    ("Yerawada", 18.5522, 73.8902, 0.9, 1), ("Viman Nagar", 18.5679, 73.9143, 1.3, 2), ("Kalyani Nagar", 18.5470, 73.9030, 1.35, 1),
    ("Hadapsar", 18.5030, 73.9260, 0.85, 2), ("Kharadi", 18.5515, 73.9405, 1.15, 2), ("Wagholi", 18.5800, 73.9800, 0.75, 1),
    ("Loni Kalbhor", 18.4880, 74.0200, 0.7, 1), ("Pimpri", 18.6279, 73.8009, 0.85, 2), ("Chinchwad", 18.6440, 73.7960, 0.85, 2),
    ("Akurdi", 18.6480, 73.7680, 0.85, 3), ("Nigdi", 18.6510, 73.7700, 0.85, 2), ("Wakad", 18.5990, 73.7620, 1.05, 2),
    ("Hinjewadi", 18.5913, 73.7389, 1.05, 2), ("Tathawade", 18.6150, 73.7480, 0.9, 2), ("Bhosari", 18.6290, 73.8480, 0.8, 1),
    ("Dighi", 18.6100, 73.8700, 0.75, 1), ("Lavale", 18.5420, 73.7330, 0.95, 2), ("Bavdhan", 18.5150, 73.7800, 1.1, 1),
    ("Alandi", 18.6760, 73.8960, 0.7, 1),
]

NAMES = {
    "hostel": ["Vidya Niwas Hostel", "Sahyadri Students' Hostel", "Saraswati Girls' Hostel", "Mutha View Hostel",
               "Shree Ganesh Boys' Hostel", "Gyan Ganga Hostel", "Indrayani Girls' Hostel", "Deccan Scholars' Home",
               "Shivneri Boys' Hostel", "Godavari Girls' Hostel", "Pawana Hostel", "Rajgad Boys' Hostel",
               "Kalpataru Students' Home", "Sinhagad View Hostel", "Krishna Girls' Hostel", "Purandar Hostel"],
    "pg": ["Green Leaf PG", "Nest 21 Co-living", "Kesar Girls' PG", "Orchid Stay PG", "Campus Corner PG", "Tulsi PG",
           "Banyan House PG", "Mogra Girls' PG", "Sunrise PG", "Chafa Residency", "Peth Lane PG", "Bakul Co-living",
           "Pinewood PG", "Jaswandi Girls' PG", "Riverbend PG", "Neem Court PG", "Gulmohar PG", "Parijat Girls' PG",
           "Saffron Nest PG", "Blue Door PG", "Kadamba PG", "Shevanti PG", "Amaltas PG", "Monsoon House PG"],
    "flat": ["2BHK, Raviraj Apartments", "3BHK, Sukhniwas Society", "2BHK, Ganga Heights", "1BHK, Anand Park",
             "2BHK, Shreeyash Society", "3BHK, Pratik Nagar Towers", "2BHK, Rohini Residency", "3BHK, Kamal Kunj",
             "2BHK, Sai Krupa Society", "1BHK, Vasant Vihar", "3BHK, Mayur Colony Society", "2BHK, Panchavati Apartments"],
}
AMENITIES = ["wifi", "ac", "attached_bathroom", "laundry", "power_backup", "hot_water", "study_table",
             "housekeeping", "cctv", "gym", "ro_water", "two_wheeler_parking"]
AMENITY_P = {
    "hostel": dict(wifi=.85, ac=.12, attached_bathroom=.45, laundry=.6, power_backup=.7, hot_water=.9, study_table=.95,
                   housekeeping=.8, cctv=.8, gym=.25, ro_water=.9, two_wheeler_parking=.6),
    "pg": dict(wifi=.95, ac=.35, attached_bathroom=.7, laundry=.7, power_backup=.75, hot_water=.9, study_table=.8,
               housekeeping=.85, cctv=.75, gym=.15, ro_water=.85, two_wheeler_parking=.55),
    "flat": dict(wifi=.6, ac=.3, attached_bathroom=.65, laundry=.45, power_backup=.5, hot_water=.95, study_table=.5,
                 housekeeping=.2, cctv=.5, gym=.2, ro_water=.6, two_wheeler_parking=.85),
}


def r250(x: float) -> int:
    return int(round(x / 250) * 250)


def maybe(p_known: float, value):
    """Return value, or None (unknown) with probability 1 - p_known."""
    return value if rnd.random() < p_known else None


def main() -> None:
    used = {k: 0 for k in NAMES}
    listings = []
    for area, lat, lng, tier, n in AREAS:
        for _ in range(n):
            roll = rnd.random()
            kind = "hostel" if roll < .28 else "pg" if roll < .76 else "flat"
            pool = NAMES[kind]
            i = used[kind]
            used[kind] += 1
            name = pool[i % len(pool)] + ("" if i < len(pool) else f" {['II', 'III', 'IV'][i // len(pool) - 1]}")
            if "Girls" in name:
                gender = "girls"
            elif "Boys" in name:
                gender = "boys"
            elif kind == "hostel":
                gender = rnd.choice(["boys", "girls"])
            else:
                gender = maybe(.92, rnd.choice(["boys", "girls", "coed", "boys", "girls"]))

            t = tier * rnd.uniform(.88, 1.14)
            food = (rnd.random() < .78) if kind == "hostel" else (rnd.random() < .55) if kind == "pg" else False
            food = maybe(.9, food)
            fa = 3200 if food else 0
            rooms: list[dict] = []
            rent_unknown = rnd.random() < .12  # "rent on request"
            if kind == "hostel":
                spec = [("single", 10500, .3), ("double", 7800, 1), ("triple", 6300, .7)]
            elif kind == "pg":
                spec = [("single", 13000, .6), ("double", 9500, 1), ("triple", 7800, .5)]
            elif name.startswith("1BHK"):
                spec = [("single", 16500, 1)]
            else:
                spec = [("double", 11000, 1), ("triple", 8500, 1 if name.startswith("3BHK") else .5)]
            for sharing, base, p in spec:
                if rnd.random() < p:
                    rooms.append({"sharing": sharing, "monthly_rent": None if rent_unknown else r250(base * t + fa)})

            amenities = {}
            for key in AMENITIES:
                if rnd.random() < .75:  # a quarter of facts are simply not reported
                    p = AMENITY_P[kind][key] + (.2 if key in ("ac", "gym") and tier > 1.15 else 0)
                    amenities[key] = rnd.random() < p
            safety = {}
            for key, p in (("cctv", amenities.get("cctv")), ("security_guard", .5), ("warden", .9 if kind == "hostel" else .3),
                           ("lit_access_road", .75)):
                if p is None:  # CCTV not reported in amenities, so it stays unknown here too
                    continue
                if rnd.random() < .65:
                    safety[key] = p if isinstance(p, bool) else rnd.random() < p

            kitchen = None
            if food:
                kitchen = ["Maharashtrian", rnd.choice(["North Indian", "South Indian", "North Indian"])]
                if rnd.random() < .3:
                    kitchen.append("Non-veg")
                if rnd.random() < .7:
                    kitchen.append("Breakfast")
            base_rent = next((r["monthly_rent"] for r in rooms if r["monthly_rent"]), None)

            listings.append({
                "id": f"demo-{len(listings) + 1:03d}",
                "name": name,
                "stay_type": kind,
                "gender": gender,
                "area": area,
                "lat": round(lat + rnd.uniform(-.0045, .0045), 6),
                "lng": round(lng + rnd.uniform(-.0045, .0045), 6),
                "location_precision": "approximate",
                "description": "Demo listing generated for development. This is not a real property.",
                "rooms": rooms,
                "food_included": food,
                "meals": (rnd.choice(["Breakfast + dinner", "Breakfast, lunch & dinner"]) if food else None),
                "kitchen_cuisines": kitchen,
                "kitchen_pure_veg": (None if not kitchen else "Non-veg" not in kitchen),
                "electricity_included": maybe(.7, kind == "hostel" or (kind == "pg" and rnd.random() < .6)),
                "electricity_estimate": None,
                "deposit": maybe(.75, r250(rnd.uniform(5000, 10000)) if kind == "hostel" or not base_rent
                                 else base_rent * rnd.choice([1, 2] if kind == "pg" else [2, 3])),
                "notice_period": maybe(.6, rnd.choice(["15 days", "1 month"])),
                "lock_in": maybe(.5, "Academic year" if kind == "hostel" else rnd.choice(["3 months", "6 months", "11 months"])),
                "curfew": maybe(.6, "No curfew" if kind == "flat" else rnd.choice(["10:00 pm", "10:30 pm", "11:00 pm"])),
                "guest_policy": maybe(.5, rnd.choice(["Day visitors until 8 pm", "Parents only, in the lobby", "No overnight guests"])),
                "available_beds": maybe(.6, rnd.randint(0, 6)),
                "amenities": amenities,
                "safety": safety,
            })
            # A metered flat's electricity is not included; estimate only when the listing says so.
            if listings[-1]["electricity_included"] is False:
                listings[-1]["electricity_estimate"] = maybe(.6, int(round(rnd.uniform(500, 1100), -2)))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "note": "DEMO DATA. Fictional listings for development only. Not real properties; do not contact or rely on them.",
        "items": listings,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"wrote {len(listings)} demo listings to {OUT}")


if __name__ == "__main__":
    main()
