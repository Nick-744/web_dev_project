#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime, timedelta
from random import Random
import argparse, hashlib, os, sqlite3, string, sys
from time import perf_counter
SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS "USER" (
    "id" STRING PRIMARY KEY,
    "password" STRING
);
CREATE TABLE IF NOT EXISTS "AIRPORT" (
    "id" STRING PRIMARY KEY,
    "city" STRING,
    "country" STRING
);
CREATE TABLE IF NOT EXISTS "AIRLINE" (
    "id" STRING PRIMARY KEY,
    "name" STRING,
    "website_link" STRING
);
CREATE TABLE IF NOT EXISTS "FLIGHT" (
    "id" STRING PRIMARY KEY,
    "num_of_tickets" STRING,
    "time_departure" STRING,
    "time_arrival" STRING,
    "airport_depart_id" STRING,
    "airport_arrive_id" STRING,
    "airline_id" STRING,
    FOREIGN KEY ("airport_depart_id") REFERENCES "AIRPORT" ("id"),
    FOREIGN KEY ("airport_arrive_id") REFERENCES "AIRPORT" ("id"),
    FOREIGN KEY ("airline_id") REFERENCES "AIRLINE" ("id")
);
CREATE TABLE IF NOT EXISTS "TICKET" (
    "code" STRING,
    "class" STRING,
    "price" STRING,
    "availability" STRING,
    "flight_id" STRING,
    "airline_id" STRING,
    PRIMARY KEY ("code", "flight_id", "airline_id"),
    FOREIGN KEY ("flight_id") REFERENCES "FLIGHT" ("id"),
    FOREIGN KEY ("airline_id") REFERENCES "AIRLINE" ("id")
);
CREATE TABLE IF NOT EXISTS "Hearts" (
    "ticket_code" STRING,
    "user_id" STRING,
    PRIMARY KEY ("ticket_code", "user_id"),
    FOREIGN KEY ("ticket_code") REFERENCES "TICKET" ("code"),
    FOREIGN KEY ("user_id") REFERENCES "USER" ("id")
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
    "flights": 60000,
    "hearts": 15000,
}

THIS_DIR = Path(__file__).resolve().parent
DB_PATH = THIS_DIR / "data" / "flights.db"

ROUTE_FREQUENCY = {
    "high": 3,      # 3 flights per day
    "medium": 1,    # daily
    "low": 0.3      # every ~3 days
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

def build(scale: float):
    sizes = {k: int(v * scale) for k, v in BASE.items()}
    print(f"• Target sizes {sizes}", file=sys.stderr)

    airports = [(code, RND.choice(CITY_NAMES), "CountryX") 
                 for code in iata_code(sizes["airports"], 3)]

    airlines = []
    adjectives = ["Global", "Blue", "Sky", "Prime", "Express", "United", 
                  "Star", "Swift", "Aero", "Atlantic"]
    nouns = ["Air", "Jet", "Fly", "Wings", "Lines"]
    for code in iata_code(sizes["airlines"], 2):
        name = f"{RND.choice(adjectives)} {RND.choice(nouns)}"
        airlines.append((code, name, None))

    fnames = ["alex", "maria", "john", "kate", "nick", "sofia", "paul", "irene",
              "george", "lena", "bruce", "clark", "diana", "peter", "natasha"]
    lnames = ["smith", "brown", "garcia", "miller", "davis", "martin", "lee", "walker"]
    users = []
    for idx in range(sizes["users"]):
        email = f"{RND.choice(fnames)}{idx}@example.com"
        users.append((email, hash_pw(email)))

    start_date = datetime.now() + timedelta(days=2)
    end_date = start_date + timedelta(days=120)
    flights, tickets = [], []
    flight_ids = set()

    for _ in range(sizes["flights"] // 100):  # Control total number of routes
        al_code = RND.choice(airlines)[0]
        src, dst = RND.sample(airports, 2)
        freq_level = assign_frequency(src[1], dst[1])
        flights_per_day = ROUTE_FREQUENCY[freq_level]
        current_date = start_date

        while current_date < end_date:
            for _ in range(int(flights_per_day)):
                dep_time = current_date + timedelta(hours=RND.randint(0, 23), 
                                                     minutes=RND.randint(0, 59))
                arr_time = dep_time + timedelta(minutes=RND.randint(60, 720))

                fid = generate_unique_flight_id(al_code, flight_ids)
                flights.append((fid, al_code, src[0], dst[0], iso(dep_time), iso(arr_time), 200))

                base_price = RND.randint(40, 600) * seasonal_price_adjustment(dep_time)
                for cls, mul in CLASSES:
                    code = f"{fid}-{cls[0].upper()}"
                    price = round(base_price * mul, 2)
                    avail = RND.randint(80, 200) if cls == 'economy' else RND.randint(10, 50)
                    tickets.append((code, fid, al_code, cls, price, avail))

            current_date += timedelta(days=1 if flights_per_day >= 1 
                                        else int(1 / flights_per_day))

    ticket_lookup = {t[0]: (t[1], t[2]) for t in tickets}
    hearts = []
    for _ in range(min(sizes["hearts"], len(tickets))):
        tcode = RND.choice(tickets)[0]
        fid, aid = ticket_lookup[tcode]
        user_email = RND.choice(users)[0]
        hearts.append((tcode, fid, aid, user_email))

    return airports, airlines, users, flights, tickets, hearts

def seed(scale: float):
    data = build(scale)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    cur = conn.cursor()

    print("• Inserting …", file=sys.stderr)
    t0 = perf_counter()
    cur.execute("BEGIN")

    cur.executemany('INSERT OR IGNORE INTO airport  (id, city, country) VALUES (?,?,?)', data[0])
    cur.executemany('INSERT OR IGNORE INTO airline  (id, name, website_link) VALUES (?,?,?)', data[1])
    cur.executemany('INSERT OR IGNORE INTO "user"   (id, password) VALUES (?,?)', data[2])
    cur.executemany('INSERT OR IGNORE INTO flight   (id, airline_id, airport_depart_id, airport_arrive_id, time_departure, time_arrival, num_tickets) VALUES (?,?,?,?,?,?,?)', data[3])
    cur.executemany('INSERT OR IGNORE INTO ticket   (code, flight_id, airline_id, class, price, availability) VALUES (?,?,?,?,?,?)', data[4])
    cur.executemany('INSERT OR IGNORE INTO hearts   (ticket_code, flight_id, airline_id, user_id) VALUES (?,?,?,?)', data[5])

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
