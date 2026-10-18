"""python -m app.seed [--no-demo]

Run ``alembic upgrade head`` first so the tables exist.
"""

from __future__ import annotations

import argparse

from app.db import SessionLocal
from app.seed import seed_all


def main() -> None:
    parser = argparse.ArgumentParser(description="Load Nivasa reference data and demo listings.")
    parser.add_argument("--no-demo", action="store_true", help="Remove demo listings instead of loading them")
    args = parser.parse_args()
    with SessionLocal() as db:
        counts = seed_all(db, include_demo=not args.no_demo)
    for k, v in counts.items():
        print(f"{k:>16}: {v}")


if __name__ == "__main__":
    main()
