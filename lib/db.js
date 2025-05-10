/*****************************************************************************************
 * db.js  –  SQLite schema + helper for the “Google-Flights-like” project (Express.js)
 * ---------------------------------------------------------------------------------------
 * • Uses better-sqlite3 (synchronous, zero-dependency) for simplicity & performance.
 * • Automatically creates / migrates all tables on first require().
 * • ALL column / table names have been sanitized to snake_case so we avoid
 *   problematic spaces in identifiers. Original ER-diagram names are kept in
 *   comments for clarity.
 *****************************************************************************************/

import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* ----------------------------------------------------------------------------
 * Resolve database file ( <project-root>/data/flights.db )
 * ------------------------------------------------------------------------- */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbFile    = path.join(__dirname, '..', 'data', 'flights.db');

/* ----------------------------------------------------------------------------
 * Create / open DB & enable FK constraints
 * ------------------------------------------------------------------------- */
const db = new Database(dbFile);
db.pragma('foreign_keys = ON');

/* ----------------------------------------------------------------------------
 * Full schema (idempotent - uses IF NOT EXISTS)
 * ------------------------------------------------------------------------- */
const schema = `
/* ===== USER ============================================================= */
CREATE TABLE IF NOT EXISTS user (
    id        TEXT PRIMARY KEY,                /* USER.id        */
    password  TEXT NOT NULL                    /* USER.password  */
);

/* ===== AIRPORT ========================================================== */
CREATE TABLE IF NOT EXISTS airport (
    id      TEXT PRIMARY KEY,                  /* AIRPORT.id     */
    city    TEXT NOT NULL,                     /* AIRPORT.city   */
    country TEXT NOT NULL                      /* AIRPORT.country*/
);

/* ===== AIRLINE ========================================================== */
CREATE TABLE IF NOT EXISTS airline (
    id           TEXT PRIMARY KEY,             /* AIRLINE.id           */
    name         TEXT NOT NULL,                /* AIRLINE.name         */
    website_link TEXT                          /* AIRLINE.website link */
);

/* ===== FLIGHT =========================================================== */
CREATE TABLE IF NOT EXISTS flight (
    id                TEXT PRIMARY KEY,        /* FLIGHT.id                     */
    airline_id        TEXT NOT NULL,           /* FK → airline.id               */
    airport_depart_id TEXT NOT NULL,           /* FLIGHT “departs from” airport */
    airport_arrive_id TEXT NOT NULL,           /* FLIGHT “goes to” airport      */
    time_departure    TEXT NOT NULL,           /* ISO-8601 (YYYY-MM-DD HH:MM)   */
    time_arrival      TEXT NOT NULL,
    num_tickets       INTEGER NOT NULL CHECK (num_tickets >= 0),
    FOREIGN KEY (airline_id)        REFERENCES airline (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    FOREIGN KEY (airport_depart_id) REFERENCES airport (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    FOREIGN KEY (airport_arrive_id) REFERENCES airport (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
);

/* ===== TICKET =========================================================== */
CREATE TABLE IF NOT EXISTS ticket (
    code        TEXT,                          /* TICKET.code  (e.g., A1B2C3) */
    flight_id   TEXT NOT NULL,                 /* FK → flight.id              */
    airline_id  TEXT NOT NULL,                 /* FK → airline.id             */
    class       TEXT NOT NULL,                 /* economy | business | first  */
    price       REAL NOT NULL CHECK (price >= 0),
    availability INTEGER NOT NULL CHECK (availability >= 0),
    PRIMARY KEY (code, flight_id, airline_id),
    FOREIGN KEY (flight_id)  REFERENCES flight  (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    FOREIGN KEY (airline_id) REFERENCES airline (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
);

/* ===== HEARTS  (user favourites) ======================================= */
CREATE TABLE IF NOT EXISTS hearts (
    ticket_code TEXT NOT NULL,
    flight_id   TEXT NOT NULL,
    airline_id  TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    PRIMARY KEY (ticket_code, flight_id, airline_id, user_id),
    FOREIGN KEY (ticket_code, flight_id, airline_id)
        REFERENCES ticket (code, flight_id, airline_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES user (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
);
`;

/* Execute schema once (fast / idempotent) */
db.exec(schema);

/* ----------------------------------------------------------------------------
 * Helper exports
 * ------------------------------------------------------------------------- */
export { db };                     // raw db object for ad-hoc queries
export const begin  = () => db.transaction(() => {}); // simple tx starter

/* Example prepared statement export – extend as needed */
export const getFlightById = db.prepare(`
    SELECT f.*, a.name AS airline_name,
           ap_from.city  AS depart_city,
           ap_to.city    AS arrive_city
    FROM   flight f
    JOIN   airline a        ON a.id = f.airline_id
    JOIN   airport ap_from  ON ap_from.id = f.airport_depart_id
    JOIN   airport ap_to    ON ap_to.id   = f.airport_arrive_id
    WHERE  f.id = ?
`);
