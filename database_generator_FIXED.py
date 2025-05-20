#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime, timedelta
from random import Random
import argparse, hashlib, os, sqlite3, string, sys
from time import perf_counter
SCHEMA_SQL = """/* ===== USER ============================================================= */
CREATE TABLE IF NOT EXISTS user (
    id        TEXT PRIMARY KEY,
    password  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS airport (
    id      TEXT PRIMARY KEY,
    city    TEXT NOT NULL,
    country TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS airline (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    website_link TEXT
);

CREATE TABLE IF NOT EXISTS flight (
    id                TEXT PRIMARY KEY,
    airline_id        TEXT NOT NULL,
    airport_depart_id TEXT NOT NULL,
    airport_arrive_id TEXT NOT NULL,
    time_departure    TEXT NOT NULL,
    time_arrival      TEXT NOT NULL,
    num_tickets       INTEGER NOT NULL CHECK (num_tickets >= 0),
    FOREIGN KEY (airline_id)        REFERENCES airline (id),
    FOREIGN KEY (airport_depart_id) REFERENCES airport (id),
    FOREIGN KEY (airport_arrive_id) REFERENCES airport (id)
);

CREATE TABLE IF NOT EXISTS ticket (
    code         TEXT,
    flight_id    TEXT NOT NULL,
    airline_id   TEXT NOT NULL,
    class        TEXT NOT NULL,
    price        INTEGER NOT NULL CHECK (price >= 0),
    availability INTEGER NOT NULL CHECK (availability >= 0),
    PRIMARY KEY (code, flight_id, airline_id),
    FOREIGN KEY (flight_id)  REFERENCES flight  (id),
    FOREIGN KEY (airline_id) REFERENCES airline (id)
);

CREATE TABLE IF NOT EXISTS hearts (
    ticket_code TEXT NOT NULL,
    flight_id   TEXT NOT NULL,
    airline_id  TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    PRIMARY KEY (ticket_code, flight_id, airline_id, user_id),
    FOREIGN KEY (ticket_code, flight_id, airline_id)
        REFERENCES ticket (code, flight_id, airline_id),
    FOREIGN KEY (user_id) REFERENCES user (id)
);

"""
RND = Random(42)
CLASSES = [('economy', 1.0), ('business', 2.5), ('first', 5)]
CITY_NAMES = ["Athens", "London", "Paris", "Rome", "Berlin", "Madrid",
               "New York", "Chicago", "Tokyo", "Sydney", "Toronto", "Dubai",
               "Cairo", "Bangkok", "Singapore", "Dublin", "Lisbon", "Vienna"]

BASE = {
    "airports": 300,
    "airlines": 80,
    "users": 4000,
    "flights": 300000,
    "hearts": 15000,
}

THIS_DIR = Path(__file__).resolve().parent
DB_PATH = THIS_DIR / "data" / "flights.db"

ROUTE_FREQUENCY = {
    "high": 3,      # 3 flights per day
    "medium": 1,    # daily
    "low": 0.3     # every ~3 days
}
def create_db_schema():
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(SCHEMA_SQL)
    conn.commit()
    conn.close()
    print("✔ Database schema created.")

def iata_code(n, width):
    seen = set()
    while len(seen) < n:
        code = ''.join(RND.choices(string.ascii_uppercase, k=width))
        if code not in seen:
            seen.add(code)
            yield code

def iso(dt: datetime):
    return dt.strftime("%Y-%m-%d %H:%M")

def hash_pw(email: str):
    return hashlib.sha256(email.encode()).hexdigest()

def assign_frequency(src_city, dst_city):
    popular_routes = [("Athens", "London"), ("New York", "Tokyo"), ("Paris", "Rome"),("Athens", "Berlin"),("Bangkok", "Singapore"),("Berlin", "Madrid")]
    if (src_city, dst_city) in popular_routes or (dst_city, src_city) in popular_routes:
        return "high"
    elif src_city in CITY_NAMES[:5] or dst_city in CITY_NAMES[:5]:
        return "medium"
    return "low"

def seasonal_price_adjustment(dep_date):
    month = dep_date.month
    if month in [6, 7, 8]:  # Summer peak
        return 1.5
    elif month in [12, 1]:  # Winter holidays
        return 1.3
    return 1.0

def generate_unique_flight_id(al_code, flight_ids):
    while True:
        num = RND.randint(1, 9999)
        fid = f"{al_code}{num:04}"
        if fid not in flight_ids:
            flight_ids.add(fid)
            return fid

def generate_flight_and_tickets(dep_time, src_id, dst_id, al_code, flight_ids, flights, tickets):
    fid = generate_unique_flight_id(al_code, flight_ids)
    arr_time = dep_time + timedelta(minutes=RND.randint(60, 720))
    flights.append((fid, 200, iso(dep_time), iso(arr_time), src_id, dst_id, al_code))

    base_price = RND.randint(40, 600) * seasonal_price_adjustment(dep_time)
    for cls, mul in CLASSES:
        code = f"{fid}-{cls[0].upper()}"
        price = int(base_price * mul)   # integer euros

        avail = RND.randint(80, 200) if cls == 'economy' else RND.randint(10, 50)
        tickets.append((code, fid, al_code, cls, price, avail))


def build(scale: float):
    sizes = {k: int(v * scale) for k, v in BASE.items()}
    print(f"• Target sizes {sizes}", file=sys.stderr)

    # ✅ Generate Airports and Ensure Each City Has at Least One Airport
    airports = []
    city_to_airports = {}

    # First, one airport per city
    for city in CITY_NAMES:
        code = next(iata_code(1, 3))
        airports.append((code, city, "CountryX"))
        city_to_airports.setdefault(city, []).append(code)

    # Then, remaining airports assigned randomly to cities
    remaining_airports = sizes["airports"] - len(CITY_NAMES)
    for code in iata_code(remaining_airports, 3):
        city = RND.choice(CITY_NAMES)
        airports.append((code, city, "CountryX"))
        city_to_airports.setdefault(city, []).append(code)

    airport_ids = [a[0] for a in airports]

    # ✅ Generate Airlines
    airline_ids = [code for code in iata_code(sizes["airlines"], 2)]
    adjectives = ["Global", "Blue", "Sky", "Prime", "Express", "United", "Star", "Swift", "Aero", "Atlantic"]
    nouns = ["Air", "Jet", "Fly", "Wings", "Lines"]
    airlines = [(code, f"{RND.choice(adjectives)} {RND.choice(nouns)}", None) for code in airline_ids]

    # ✅ Generate Users
    fnames = ["alex", "maria", "john", "kate", "nick", "sofia", "paul", "irene",
              "george", "lena", "bruce", "clark", "diana", "peter", "natasha"]
    users = [(f"{RND.choice(fnames)}{idx}@example.com", hash_pw(f"{RND.choice(fnames)}{idx}@example.com"))
             for idx in range(sizes["users"])]

    start_date = datetime.now() + timedelta(days=2)
    end_date = start_date + timedelta(days=120)

    flights, tickets = [], []
    flight_ids = set()

    # ✅ Force Popular Routes to Have a Flight Every Day (Both Directions)
    popular_routes = [
        ("Athens", "London"),
        ("New York", "Tokyo"),
        ("Paris", "Rome"),
        ("Athens", "Berlin"),
        ("Bangkok", "Singapore"),
        ("Berlin", "Madrid"),
    ]

    for src_city, dst_city in popular_routes:
        for direction in [(src_city, dst_city), (dst_city, src_city)]:
            src_city_dir, dst_city_dir = direction
            al_code = RND.choice(airline_ids)

            src_candidates = city_to_airports.get(src_city_dir, [])
            dst_candidates = city_to_airports.get(dst_city_dir, [])

            if not src_candidates or not dst_candidates:
                continue  # Skip if no airport found for either city

            src_id = RND.choice(src_candidates)
            dst_id = RND.choice(dst_candidates)

            current_date = start_date
            while current_date < end_date:
                dep_time = current_date + timedelta(hours=RND.randint(0, 23), minutes=RND.randint(0, 59))
                generate_flight_and_tickets(dep_time, src_id, dst_id, al_code, flight_ids, flights, tickets)
                current_date += timedelta(days=1)

    # ✅ Generate Random Routes for Remaining Flights
    num_routes = max(1, sizes["flights"] // 50)
    for _ in range(num_routes):
        al_code = RND.choice(airline_ids)
        src_id, dst_id = RND.sample(airport_ids, 2)
        freq_level = assign_frequency(src_id, dst_id)
        freq_per_day = ROUTE_FREQUENCY[freq_level]

        current_date = start_date

        if freq_per_day >= 1:
            while current_date < end_date:
                for _ in range(int(freq_per_day)):
                    dep_time = current_date + timedelta(hours=RND.randint(0, 23), minutes=RND.randint(0, 59))
                    generate_flight_and_tickets(dep_time, src_id, dst_id, al_code, flight_ids, flights, tickets)
                current_date += timedelta(days=1)
        else:
            flights_per_week = max(1, int(round(freq_per_day * 7)))
            days_between_flights = 7 / flights_per_week

            while current_date < end_date:
                for _ in range(flights_per_week):
                    dep_time = current_date + timedelta(hours=RND.randint(0, 23), minutes=RND.randint(0, 59))
                    generate_flight_and_tickets(dep_time, src_id, dst_id, al_code, flight_ids, flights, tickets)
                    current_date += timedelta(days=days_between_flights)
                current_date += timedelta(weeks=1)

    # ✅ Generate Hearts (Favorites)
    ticket_lookup = [(t[0], t[1], t[2]) for t in tickets]  
    selected_tickets = RND.choices(ticket_lookup, k=sizes["hearts"])
    hearts = [(code, fid, aid, RND.choice(users)[0]) for (code, fid, aid) in selected_tickets]

    print(f"Generated flights: {len(flights)}")
    print(f"Generated tickets: {len(tickets)}")
    print(f"Generated hearts: {len(hearts)}")

    return airports, airlines, users, flights, tickets, hearts



def seed(scale: float):
    data = build(scale)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    cur = conn.cursor()

    print("• Inserting …", file=sys.stderr)
    t0 = perf_counter()
    cur.execute("BEGIN")
    cur.executemany('INSERT OR IGNORE INTO "AIRPORT" (id, city, country) VALUES (?,?,?)', data[0])
    cur.executemany('INSERT OR IGNORE INTO "AIRLINE" (id, name, website_link) VALUES (?,?,?)', data[1])
    cur.executemany('INSERT OR IGNORE INTO "USER" (id, password) VALUES (?,?)', data[2])
    airport_ids = set(a[0] for a in data[0])
    airline_ids = set(a[0] for a in data[1])

    for flight in data[3]:
        fid, num_tickets, time_dep, time_arr, dep_id, arr_id, al_id = flight
        if dep_id not in airport_ids:
            print(f"Invalid Departure Airport ID: {dep_id}")
        if arr_id not in airport_ids:
            print(f"Invalid Arrival Airport ID: {arr_id}")
        if al_id not in airline_ids:
            print(f"Invalid Airline ID: {al_id}")
    cur.executemany('INSERT OR IGNORE INTO "FLIGHT" (id, num_tickets, time_departure, time_arrival, airport_depart_id, airport_arrive_id, airline_id) VALUES (?,?,?,?,?,?,?)', data[3])
    cur.executemany('INSERT OR IGNORE INTO "TICKET" (code, flight_id, airline_id, class, price, availability) VALUES (?,?,?,?,?,?)', data[4])

    cur.executemany('INSERT OR IGNORE INTO "Hearts" (ticket_code, flight_id, airline_id, user_id) VALUES (?,?,?,?)', data[5])

    # cur.executemany('INSERT OR IGNORE INTO airport  (id, city, country) VALUES (?,?,?)', data[0])
    # cur.executemany('INSERT OR IGNORE INTO airline  (id, name, website_link) VALUES (?,?,?)', data[1])
    # cur.executemany('INSERT OR IGNORE INTO "user"   (id, password) VALUES (?,?)', data[2])
    # cur.executemany('INSERT OR IGNORE INTO flight   (id, airline_id, airport_depart_id, airport_arrive_id, time_departure, time_arrival, num_tickets) VALUES (?,?,?,?,?,?,?)', data[3])
    # cur.executemany('INSERT OR IGNORE INTO ticket   (code, flight_id, airline_id, class, price, availability) VALUES (?,?,?,?,?,?)', data[4])
    # cur.executemany('INSERT OR IGNORE INTO hearts   (ticket_code, flight_id, airline_id, user_id) VALUES (?,?,?,?)', data[5])

    conn.commit()
    print(f"✔ Done in {perf_counter()-t0:.2f}s "
          f"({len(data[3]):,} flights | {len(data[4]):,} tickets)", file=sys.stderr)
    conn.close()

if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Create and Populate AirTickets DB with Synthetic Data.")
    ap.add_argument("--scale", type=float, default=1.0, help="× multiplier for base dataset sizes")
    args = ap.parse_args()

    if not DB_PATH.exists():
        print("• Creating DB and schema …")
        create_db_schema()

    seed(max(args.scale, 0.01))
