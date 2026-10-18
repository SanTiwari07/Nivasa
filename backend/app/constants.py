"""Human-readable labels shared by the API and the matching engine."""

STAY_TYPES = {"hostel": "Hostel", "pg": "PG", "flat": "Shared flat"}
GENDERS = {"boys": "Boys only", "girls": "Girls only", "coed": "Co-ed"}
SHARING = {"single": "Single room", "double": "Double sharing", "triple": "Triple sharing", "quad": "Four sharing"}
MODES = {"walk": "Walk", "cycle": "Cycle", "two_wheeler": "Own two-wheeler", "metro": "Pune Metro",
         "bus": "PMPML bus", "auto": "Auto-rickshaw"}
DIETS = {"veg": "Vegetarian", "nonveg": "Non-veg is fine", "jain": "Jain"}
AMENITIES = {"wifi": "Wi-Fi", "ac": "AC", "attached_bathroom": "Attached bathroom", "laundry": "Laundry or washing machine",
             "power_backup": "Power backup", "hot_water": "Hot water", "study_table": "Study table",
             "housekeeping": "Housekeeping", "cctv": "CCTV", "gym": "Gym", "ro_water": "RO drinking water",
             "two_wheeler_parking": "Two-wheeler parking"}
SAFETY = {"cctv": "CCTV", "security_guard": "Security guard", "warden": "Warden on site",
          "lit_access_road": "Lit road to the main road"}
# Daily essentials and how much each counts towards the market score.
ESSENTIALS = {"grocery": "Grocery", "pharmacy": "Pharmacy", "stationery": "Xerox & stationery",
              "vegetables": "Vegetables & fruit", "laundry": "Laundry", "atm": "ATM or bank",
              "gym": "Gym", "library": "Library or reading room"}
ESSENTIAL_WEIGHTS = {"grocery": 2.0, "pharmacy": 2.0, "stationery": 1.5, "vegetables": 1.0, "laundry": 1.0,
                     "atm": 1.0, "gym": 0.5, "library": 0.75}
FACTORS = {"budget": "Budget", "commute": "Commute", "food": "Food", "facilities": "Facilities",
           "market": "Market & essentials", "safety": "Safety"}
