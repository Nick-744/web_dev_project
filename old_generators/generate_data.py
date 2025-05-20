#!/usr/bin/env python3
# seed_airtickets.py
"""
Fully-synthetic, high-scale data generator for the **AirTickets** SQLite DB
(the schema created by lib/db.js).

Why a fresh generator?
──────────────────────
• No external CSVs or APIs – everything is procedurally built in-memory.
• Deterministic-ish output (seed 42) yet “realistic” sizes & schedules.
• Single transaction ⇒ FK-safe and very fast.

Run:
    python seed_airtickets.py --scale 2        # 2× default size
    python seed_airtickets.py                  # default size
"""
from pathlib import Path
from datetime import datetime, timedelta
from random   import Random
import argparse, hashlib, os, sqlite3, string, sys
from time import perf_counter

# ────────────────────────────────────────────────────────────────────────────
# Configuration
# ────────────────────────────────────────────────────────────────────────────
RND          = Random(42)                             # pseudo-random stream
CLASSES      = [('economy', 1.0), ('business', 2.5), ('first', 5)]
CITY_NAMES   = ["Athens", "London", "Paris", "Rome", "Berlin", "Madrid",
                "New York", "Chicago", "Tokyo", "Sydney", "Toronto", "Dubai",
                "Cairo", "Bangkok", "Singapore", "Dublin", "Lisbon", "Vienna"]

BASE = {            # baseline counts (× scale factor)
    "airports" : 300,
    "airlines" : 80,
    "users"    : 4000,
    "flights"  : 60000,
    "hearts"   : 15000,
}

THIS_DIR = Path(__file__).resolve().parent
DB_PATH  = THIS_DIR / "data" / "flights.db"    # must exist

# ────────────────────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────────────────────
def iata_code(n, width):
    """Generate n random uppercase codes (width = 2 or 3)."""
    seen = set()
    while len(seen) < n:
        code = ''.join(RND.choices(string.ascii_uppercase, k=width))
        if code not in seen:
            seen.add(code)
            yield code

def iso(dt: datetime):
    return dt.strftime("%Y-%m-%d %H:%M")

def hash_pw(email: str):
    """Quick SHA-256 hash (demo only)."""
    return hashlib.sha256(email.encode()).hexdigest()

# ────────────────────────────────────────────────────────────────────────────
# Core generator
# ────────────────────────────────────────────────────────────────────────────
def build(scale: float):
    sizes = {k: int(v*scale) for k, v in BASE.items()}
    print(f"• Target sizes {sizes}", file=sys.stderr)

    # 1. Airports
    airports = []
    for code, city in zip(iata_code(sizes["airports"], 3),
                          (RND.choice(CITY_NAMES) for _ in range(sizes["airports"]))):
        airports.append((code, city, "CountryX"))

    # 2. Airlines
    airlines = []
    adjectives = ["Global", "Blue", "Sky", "Prime", "Express", "United",
                  "Star", "Swift", "Aero", "Atlantic"]
    nouns      = ["Air", "Jet", "Fly", "Wings", "Lines"]
    for code in iata_code(sizes["airlines"], 2):
        name = f"{RND.choice(adjectives)} {RND.choice(nouns)}"
        airlines.append((code, name, None))

    # 3. Users
    fnames = ["alex","maria","john","kate","nick","sofia","paul","irene",
              "george","lena","bruce","clark","diana","peter","natasha"]
    lnames = ["smith","brown","garcia","miller","davis","martin","lee","walker"]
    users  = []
    for idx in range(sizes["users"]):
        email = f"{RND.choice(fnames)}{idx}@example.com"
        users.append((email, hash_pw(email)))

   # --- fix inside build() ----------------------------------------------------

    # 4. Flights + Tickets
    start_date = datetime.now(tz=datetime.utcnow().astimezone().tzinfo) + timedelta(days=2)
    end_date   = start_date + timedelta(days=120)
    flights, tickets = [], []
    flight_ids = set()

    for _ in range(sizes["flights"]):
        al_code = RND.choice(airlines)[0]          # pick only the airline IATA code
        src, dst = RND.sample(airports, 2)
        dep      = start_date + (end_date - start_date) * RND.random()
        arr      = dep + timedelta(minutes=RND.randint(60, 720))

        num  = RND.randint(1, 9999)
        fid  = f"{al_code}{num:04}"
        while fid in flight_ids:                   # keep flight ids unique
            num = RND.randint(1, 9999)
            fid = f"{al_code}{num:04}"
        flight_ids.add(fid)

        flights.append((fid, al_code, src[0], dst[0], iso(dep), iso(arr), 200))

        base_price = RND.randint(40, 600)
        for cls, mul in CLASSES:
            code  = f"{fid}-{cls[0].upper()}"
            price = round(base_price * mul, 2)
            avail = RND.randint(20, 120 if cls == 'economy' else 40)
            tickets.append((code, fid, al_code, cls, price, avail))

    # 5. Hearts (favourites)
    ticket_lookup = {t[0]: (t[1], t[2]) for t in tickets}  # ticket_code → (flight_id, airline_id)
    hearts = []
    for _ in range(min(sizes["hearts"], len(tickets))):
        tcode = RND.choice(tickets)[0]
        fid, aid = ticket_lookup[tcode]
        user_email = RND.choice(users)[0]
        hearts.append((tcode, fid, aid, user_email))


    # 5. Hearts
    hearts = []
    for _ in range(min(sizes["hearts"], len(tickets))):
        ticket_code, fid, aid, *_ = RND.choice(tickets)
        user_email, _ = RND.choice(users)
        hearts.append((ticket_code, fid, aid, user_email))

    return airports, airlines, users, flights, tickets, hearts

# ────────────────────────────────────────────────────────────────────────────
# DB insert
# ────────────────────────────────────────────────────────────────────────────
def seed(scale: float):
    data = build(scale)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    cur  = conn.cursor()

    print("• Inserting …", file=sys.stderr)
    t0 = perf_counter()
    cur.execute("BEGIN")

    cur.executemany('INSERT OR IGNORE INTO airport  (id, city, country) VALUES (?,?,?)',   data[0])
    cur.executemany('INSERT OR IGNORE INTO airline  (id, name, website_link) VALUES (?,?,?)',data[1])
    cur.executemany('INSERT OR IGNORE INTO "user"   (id, password) VALUES (?,?)',           data[2])
    cur.executemany('INSERT OR IGNORE INTO flight   (id, airline_id, airport_depart_id, airport_arrive_id, time_departure, time_arrival, num_tickets) VALUES (?,?,?,?,?,?,?)', data[3])
    cur.executemany('INSERT OR IGNORE INTO ticket   (code, flight_id, airline_id, class, price, availability) VALUES (?,?,?,?,?,?)', data[4])
    cur.executemany('INSERT OR IGNORE INTO hearts   (ticket_code, flight_id, airline_id, user_id) VALUES (?,?,?,?)', data[5])

    conn.commit()
    print(f"✔ Done in {perf_counter()-t0:.2f}s "
          f"({len(data[3]):,} flights | {len(data[4]):,} tickets)", file=sys.stderr)
    conn.close()

# ────────────────────────────────────────────────────────────────────────────
# CLI
# ────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Populate AirTickets DB with synthetic data.")
    ap.add_argument("--scale", type=float, default=1.0, help="× multiplier for base dataset sizes")
    args = ap.parse_args()

    if not DB_PATH.exists():
        sys.exit(f"[ERROR] SQLite file not found at {DB_PATH} – create schema first.")

    seed(max(args.scale, 0.01))
