from pathlib import Path
from datetime import datetime, timedelta
from random import Random, choice, uniform
import sqlite3, hashlib, string, os

RND = Random(42)
START_DATE = datetime(2025, 5, 1)
END_DATE = datetime(2025, 10, 28)
CLASSES = [('economy', 1.0), ('business', 2.5), ('first', 5)]

# CITY_NAMES = ["Athens", "London", "Paris", "Rome", "Berlin", "Madrid",
#               "New York", "Chicago", "Tokyo", "Sydney", "Toronto", "Dubai",
#               "Cairo", "Bangkok", "Singapore", "Dublin", "Lisbon", "Vienna"]
CITY_NAMES=["Athens", "London", "Paris", "Rome", "Berlin", "Madrid",
               "New York","Dublin"]
# CITY_COUNTRY = {
#     "Athens": "Greece", "London": "United Kingdom", "Paris": "France", "Rome": "Italy",
#     "Berlin": "Germany", "Madrid": "Spain", "New York": "USA", "Chicago": "USA",
#     "Tokyo": "Japan", "Sydney": "Australia", "Toronto": "Canada", "Dubai": "UAE",
#     "Cairo": "Egypt", "Bangkok": "Thailand", "Singapore": "Singapore", "Dublin": "Ireland",
#     "Lisbon": "Portugal", "Vienna": "Austria"
# }

ROUTE_FREQUENCY = {"high": 5, "medium": 3, "default": 1}
AIRLINE_CODES = ["AE", "BA", "DL", "UA", "AF"]

def assign_frequency(src_city, dst_city):
    # popular_routes = [("Athens", "London"),  ("Paris", "Rome"),
    #                   ("Athens", "Berlin"), ("Berlin", "Madrid")]
    # if (src_city, dst_city) in popular_routes or (dst_city, src_city) in popular_routes:
    #     return "high"
    if src_city in CITY_NAMES[:4] or dst_city in CITY_NAMES[:4]:
        return "medium"
    return "default"

def iso(dt): return dt.strftime("%Y-%m-%d %H:%M")

def hash_pw(password): return hashlib.sha256(password.encode()).hexdigest()

def random_password(): return ''.join(RND.choices(string.ascii_letters + string.digits, k=8))

def seasonal_price_adjustment(dep_date):
    return 1.5 if dep_date.month in [6, 7, 8] else 1.3 if dep_date.month in [12, 1] else 1.0

def generate_unique_flight_id(al_code, flight_ids):
    while True:
        fid = f"{al_code}{RND.randint(1, 9999):04}"
        if fid not in flight_ids:
            flight_ids.add(fid)
            return fid

def create_schema(cur):
    cur.executescript("""
    CREATE TABLE IF NOT EXISTS "AIRPORT" ("id" STRING PRIMARY KEY, "city" STRING, "country" STRING);
    CREATE TABLE IF NOT EXISTS "AIRLINE" ("id" STRING PRIMARY KEY, "name" STRING, "website_link" STRING);
    CREATE TABLE IF NOT EXISTS "FLIGHT" (
        "id" STRING PRIMARY KEY, "num_tickets" INTEGER NOT NULL CHECK (num_tickets >= 0),
        "time_departure" STRING, "time_arrival" STRING,
        "airport_depart_id" STRING, "airport_arrive_id" STRING, "airline_id" STRING,
        FOREIGN KEY ("airport_depart_id") REFERENCES "AIRPORT" ("id"),
        FOREIGN KEY ("airport_arrive_id") REFERENCES "AIRPORT" ("id"),
        FOREIGN KEY ("airline_id") REFERENCES "AIRLINE" ("id")
    );
    CREATE TABLE IF NOT EXISTS "TICKET" (
        "code" TEXT,
        "flight_id" TEXT NOT NULL,
        "airline_id" TEXT NOT NULL,
        "class" TEXT NOT NULL,
        "price" INTEGER NOT NULL CHECK (price >= 0),
        "availability" INTEGER NOT NULL CHECK (availability >= 0),
        PRIMARY KEY ("code", "flight_id", "airline_id"),
        FOREIGN KEY ("flight_id") REFERENCES "FLIGHT" ("id"),
        FOREIGN KEY ("airline_id") REFERENCES "AIRLINE" ("id")
    );

    CREATE TABLE IF NOT EXISTS "USER" ("id" STRING PRIMARY KEY, "password" STRING);
    CREATE TABLE IF NOT EXISTS "Hearts" (
        "ticket_code" TEXT NOT NULL,
        "flight_id" TEXT NOT NULL,
        "airline_id" TEXT NOT NULL,
        "user_id" TEXT NOT NULL,
        PRIMARY KEY ("ticket_code", "flight_id", "airline_id", "user_id"),
        FOREIGN KEY ("ticket_code", "flight_id", "airline_id") REFERENCES "TICKET" ("code", "flight_id", "airline_id"),
        FOREIGN KEY ("user_id") REFERENCES "USER" ("id")
    );

    """)

def get_db_connection():
    script_path = os.path.abspath(__file__)
    db_dir = os.path.join(os.path.dirname(script_path), "data")
    os.makedirs(db_dir, exist_ok=True)
    db_path = os.path.join(db_dir, "flights.db")
    return sqlite3.connect(db_path), db_path

def insert_data(cur):
    # === Insert Airports ===
    airport_data = [(city.upper()[:3], city, 'countryX') for city in CITY_NAMES]
    cur.executemany('INSERT OR IGNORE INTO AIRPORT (id, city, country) VALUES (?, ?, ?)', airport_data)

    # === Insert Airlines ===
    airline_data = [(code, f"Airline_{code}", f"https://www.airline{code}.com") for code in AIRLINE_CODES]
    cur.executemany('INSERT OR IGNORE INTO AIRLINE (id, name, website_link) VALUES (?, ?, ?)', airline_data)

    # === Generate Flights and Tickets ===
    flight_ids = set()
    ticket_data = []
    flight_data = []
    current_date = START_DATE

    while current_date <= END_DATE:
        for city1 in CITY_NAMES:
            for city2 in CITY_NAMES:
                if city1 == city2:
                    continue
                freq_label = assign_frequency(city1, city2)
                for _ in range(ROUTE_FREQUENCY[freq_label]):
                    dep_time = current_date + timedelta(hours=RND.randint(0, 23))
                    arr_time = dep_time + timedelta(hours=RND.randint(2, 12))
                    airline_id = choice(AIRLINE_CODES)
                    flight_id = generate_unique_flight_id(airline_id, flight_ids)

                    flight_data.append((flight_id, 200, iso(dep_time), iso(arr_time),
                                        city1.upper()[:3], city2.upper()[:3], airline_id))

                    for seat_class, multiplier in CLASSES:
                        base_price = RND.uniform(100, 500)
                        price = int(base_price * multiplier * seasonal_price_adjustment(dep_time))  

                        code = f"{flight_id}-{seat_class[0].upper()}"
                        availability = RND.randint(10, 200)
                        ticket_data.append((code, flight_id, airline_id, seat_class, price, availability))

        current_date += timedelta(days=1)

    # Insert Flights and Tickets in Bulk
    cur.executemany('INSERT INTO FLIGHT VALUES (?, ?, ?, ?, ?, ?, ?)', flight_data)
    cur.executemany(
        'INSERT INTO TICKET (code, flight_id, airline_id, class, price, availability) VALUES (?, ?, ?, ?, ?, ?)',
        ticket_data)

    # === Insert Users ===
    user_data = []
    for i in range(1, 101):
        user_id = f"user{i:03}"
        password_hash = hash_pw(random_password())
        user_data.append((user_id, password_hash))
    cur.executemany('INSERT INTO USER (id, password) VALUES (?, ?)', user_data)

    # === Insert Hearts (Matching full composite key) ===
    ticket_rows = cur.execute('SELECT code, flight_id, airline_id FROM TICKET').fetchall()
    user_ids = [f"user{i:03}" for i in range(1, 101)]

    total_hearts = 500
    selected_tickets = RND.choices(ticket_rows, k=total_hearts)

    hearts_data = [(code, fid, aid, choice(user_ids)) for (code, fid, aid) in selected_tickets]

    cur.executemany(
        'INSERT OR IGNORE INTO Hearts (ticket_code, flight_id, airline_id, user_id) VALUES (?, ?, ?, ?)',
        hearts_data
    )


def main():
    conn, db_path = get_db_connection()
    cur = conn.cursor()
    create_schema(cur)

    # BEGIN TRANSACTION for batch commit
    conn.execute('BEGIN TRANSACTION;')
    insert_data(cur)
    conn.commit()

    conn.close()
    print(f"Database created and populated at: {db_path}")


if __name__ == "__main__":
    main()
