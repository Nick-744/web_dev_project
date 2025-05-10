#!/usr/bin/env python3
# seed_airtickets.py
"""
Mass-scale data generator for the AirTickets SQLite database
(same schema you created in lib/db.js).

• Downloads real airports & airlines from the OpenFlights public dataset
  (only IATA-coded and active entries).
• Generates:
    – Airports   (≈3 000 worldwide)
    – Airlines   (≈1 000 active)
    – Users      (≤10 000, with hashed passwords)
    – Flights    (up to 50 000, random schedules next 90 days)
    – Tickets    (3 fare classes per flight)
    – Hearts     (random favourites)
• Fully FK-safe, one fast transaction.

Run:
    python seed_airtickets.py --scale 1         # ~50 k flights
    python seed_airtickets.py --scale 0.1       # smaller test set
"""

import argparse, csv, hashlib, random, sqlite3, ssl, sys, urllib.request
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from time import perf_counter

##############################################################################
# CONFIG  ────────────────────────────────────────────────────────────────────
##############################################################################

DATA_DIR      = Path(__file__).with_suffix('')          # script dir
DB_PATH       = DATA_DIR.parent / 'data' / 'flights.db' # must match Node side
OPENFLIGHTS   = {
    'airports':  'https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat',
    'airlines':  'https://raw.githubusercontent.com/jpatokal/openflights/master/data/airlines.dat',
}

BASE_COUNTS = {
    'users':       2000,
    'hearts':      8000,   # favourites
    'flights':    50000,
}

CLASSES = [
    ('economy', 1.0),
    ('business', 2.5),
    ('first', 5.0),
]

##############################################################################
# SMALL HELPERS  ─────────────────────────────────────────────────────────────
##############################################################################

ssl._create_default_https_context = ssl._create_unverified_context  # allow GH TLS

def download(url):
    return urllib.request.urlopen(url).read().decode('utf-8', errors='ignore')

def parse_csv(raw, wanted_cols):
    """Generic parser for OpenFlights *.dat (comma-separated, double-quoted)"""
    rdr = csv.reader(raw.splitlines())
    for row in rdr:
        if all(row[i] for i in wanted_cols):         # ensure required columns
            yield row

def iso(dt): return dt.strftime('%Y-%m-%d %H:%M')

def hash_pw(email):
    """Very light fake hash (SHA-256 of email) – NOT for prod"""
    return hashlib.sha256(email.encode()).hexdigest()

def random_date(start, end):
    delta = end - start
    return start + timedelta(seconds=random.randint(0, int(delta.total_seconds())))

##############################################################################
# MAIN GENERATOR  ────────────────────────────────────────────────────────────
##############################################################################

def build_datasets(scale):
    print('⇣ downloading OpenFlights datasets …', file=sys.stderr)

    raw_airports = download(OPENFLIGHTS['airports'])
    raw_airlines = download(OPENFLIGHTS['airlines'])

    airports = [
        (row[4], row[2], row[3])     # IATA, city, country
        for row in parse_csv(raw_airports, (4,))         # 4 = IATA
        if len(row[4]) == 3
    ]
    airlines = [
        (row[4], row[1])             # IATA, name
        for row in parse_csv(raw_airlines, (4,7))        # 7 = active flag
        if row[7] == 'Y'
    ]

    # thin out airports for realism (major hubs)
    airports = random.sample(airports, 3000)

    # USERS ───────────────────────────────────────────
    fnames = ['alex','maria','john','kate','nick','sofia','pavlos','irene','george','lena']
    lnames = ['smith','georgiou','brown','papadopoulos','miller','nikolaou','williams','pappas']
    users  = []
    for i in range(int(BASE_COUNTS['users']*scale)):
        email = f"{random.choice(fnames)}{i}@example.com"
        users.append((email, hash_pw(email)))

    # FLIGHTS + TICKETS ──────────────────────────────
    flights, tickets = [], []
    start  = datetime.utcnow() + timedelta(days=2)
    end    = start + timedelta(days=90)
    seat_default = 200

    route_seen = set()
    for i in range(int(BASE_COUNTS['flights']*scale)):
        airl = random.choice(airlines)
        src, dst = random.sample(airports, 2)
        route_key = (airl[0], src[0], dst[0])
        # allow same flight number only once per day
        fn_suffix = 1 + route_seen.count(route_key)
        route_seen.add(route_key)

        f_id = f"{airl[0]}{src[0]}{dst[0]}{fn_suffix}"
        dep  = random_date(start, end)
        dur  = timedelta(minutes=random.randint(60, 720))
        arr  = dep + dur

        flights.append((
            f_id, airl[0], src[0], dst[0], iso(dep), iso(arr), seat_default
        ))

        base_price = random.randint(40, 600)
        for cls, mul in CLASSES:
            code = f"{f_id}-{cls[0].upper()}"
            price = round(base_price*mul, 2)
            avail = random.randint(20, seat_default//(2 if cls=='economy' else 6))
            tickets.append((code, f_id, airl[0], cls, price, avail))

    # HEARTS ──────────────────────────────────────────
    hearts = set()
    for _ in range(int(BASE_COUNTS['hearts']*scale)):
        user = random.choice(users)[0]
        ticket = random.choice(tickets)[0]
        hearts.add((ticket, flights[0][0], flights[0][1], user))  # flight_id & airline_id pulled from first flight; corrected below
    # Fix hearts tuple with matching flight/airline
    fixed_hearts = []
    ticket_lookup = {t[0]:(t[1],t[2]) for t in tickets}
    for tcode,_,_,uid in hearts:
        fid, aid = ticket_lookup[tcodes := tcode]
        fixed_hearts.append((tcodes, fid, aid, uid))

    return airports, airlines, users, flights, tickets, fixed_hearts

##############################################################################
# DB INSERTION  ──────────────────────────────────────────────────────────────
##############################################################################

def seed(scale=1.0):
    airports, airlines, users, flights, tickets, hearts = build_datasets(scale)

    conn = sqlite3.connect(DB_PATH)
    conn.execute('PRAGMA foreign_keys = ON')
    cur  = conn.cursor()

    print('⚙ inserting …', file=sys.stderr)
    t0 = perf_counter()
    cur.execute('BEGIN')

    cur.executemany('INSERT OR IGNORE INTO airport  (id, city, country) VALUES (?,?,?)', airports)
    cur.executemany('INSERT OR IGNORE INTO airline  (id, name, website_link) VALUES (?,?,NULL)', airlines)
    cur.executemany('INSERT OR IGNORE INTO "user"   (id, password) VALUES (?,?)', users)
    cur.executemany('INSERT OR IGNORE INTO flight   (id, airline_id, airport_depart_id, airport_arrive_id, '
                    'time_departure, time_arrival, num_tickets) VALUES (?,?,?,?,?,?,?)', flights)
    cur.executemany('INSERT OR IGNORE INTO ticket   (code, flight_id, airline_id, class, price, availability) '
                    'VALUES (?,?,?,?,?,?)', tickets)
    cur.executemany('INSERT OR IGNORE INTO hearts   (ticket_code, flight_id, airline_id, user_id) '
                    'VALUES (?,?,?,?)', hearts)

    conn.commit()
    t1 = perf_counter()
    print(f'✔ seeded in {t1-t0:.2f}s  ({len(flights):,} flights, {len(tickets):,} tickets)', file=sys.stderr)
    conn.close()

##############################################################################
# ENTRY POINT  ───────────────────────────────────────────────────────────────
##############################################################################

if __name__ == '__main__':
    p = argparse.ArgumentParser(description='Seed AirTickets DB at scale.')
    p.add_argument('--scale', type=float, default=1.0, help='multiply base dataset size (e.g. 0.2, 2)')
    args = p.parse_args()

    random.seed(42)
    seed(args.scale)
