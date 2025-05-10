// scripts/seed-scale.mjs
/****************************************************************************************
 * Seed-script for **mass-scale, realistic aviation data** (50k+ flights) using the
 * open-source OpenFlights dataset (https://openflights.org/data.html).
 *
 * • Downloads three CSVs (airports, airlines, routes) – ~4 MB total.
 * • Populates your SQLite DB via better-sqlite3 in one fast transaction.
 * • Generates pseudo-schedules + ticket inventory for every route.
 *
 * Run with:
 *      npm run seed-scale      (add "seed-scale": "node scripts/seed-scale.mjs")
 * ----------------------------------------------------------------------------- */
import { db } from '../lib/db.js';
import { readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import https from 'node:https';

/* ------------------------------------------------------------------ */
/* 1. Utility: download small file via https → string                  */
/* ------------------------------------------------------------------ */
const fetchFile = url =>
  new Promise((res, rej) => {
    https.get(url, r => {
      if (r.statusCode !== 200) return rej(new Error(`GET ${url} → ${r.statusCode}`));
      let data = '';
      r.on('data', c => (data += c));
      r.on('end', () => res(data));
    }).on('error', rej);
  });

/* ------------------------------------------------------------------ */
/* 2. CSV parser (handles quoted commas)                               */
/* ------------------------------------------------------------------ */
const splitCSV = line => {
  const re = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/g; // commas not inside quotes
  return line.split(re).map(s => s.replace(/^"|"$/g, ''));
};

/* ------------------------------------------------------------------ */
/* 3. Download & parse datasets                                        */
/* ------------------------------------------------------------------ */
console.log('⇣ Downloading OpenFlights datasets …');
const [rawAirports, rawAirlines, rawRoutes] = await Promise.all([
  fetchFile('https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat'),
  fetchFile('https://raw.githubusercontent.com/jpatokal/openflights/master/data/airlines.dat'),
  fetchFile('https://raw.githubusercontent.com/jpatokal/openflights/master/data/routes.dat')
]);

/* 3a. Airports ------------------------------------------------------- */
const airports = rawAirports
  .trim()
  .split('\n')
  .map(splitCSV)
  .filter(a => a[4])                // keep rows with valid IATA code
  .map(a => ({
    id: a[4],                       // IATA
    city: a[2],
    country: a[3]
  }));

/* 3b. Airlines ------------------------------------------------------- */
const airlines = rawAirlines
  .trim()
  .split('\n')
  .map(splitCSV)
  .filter(a => a[4] && a[7] === 'Y') // IATA code & active
  .map(a => ({
    id: a[4],                       // IATA
    name: a[1],
    website_link: null
  }));

/* 3c. Routes  (≈ 67 k; we’ll keep those with IATA-coded endpoints) --- */
const routes = rawRoutes
  .trim()
  .split('\n')
  .map(splitCSV)
  .filter(r => r[0] && r[2] && r[4]) // airline IATA, src IATA, dst IATA
  .map((r, i) => ({
    airline: r[0],
    from: r[2],
    to: r[4],
    routeId: i                       // unique number for flight id
  }));

console.log(`✔ ${airports.length} airports, ${airlines.length} airlines, ${routes.length} routes parsed`);

/* ------------------------------------------------------------------ */
/* 4. Prepared statements                                              */
/* ------------------------------------------------------------------ */
const insAirport = db.prepare(`INSERT OR IGNORE INTO airport (id, city, country) VALUES (@id,@city,@country)`);
const insAirline = db.prepare(`INSERT OR IGNORE INTO airline (id, name, website_link) VALUES (@id,@name,@website_link)`);
const insFlight  = db.prepare(`INSERT OR IGNORE INTO flight
        (id, airline_id, airport_depart_id, airport_arrive_id, time_departure, time_arrival, num_tickets)
        VALUES (@id,@airline,@from,@to,@tdep,@tarr,@seats)`);
const insTicket  = db.prepare(`INSERT OR IGNORE INTO ticket
        (code, flight_id, airline_id, class, price, availability)
        VALUES (@code,@flight,@airline,@class,@price,@avail)`);

/* ------------------------------------------------------------------ */
/* 5. Massive-insert inside one transaction  **(FK-safe version)**     */
/* ------------------------------------------------------------------ */
const tx = db.transaction(() => {
  /* 5.1  Static lists ---------------------------------------------- */
  airports.forEach(a  => insAirport.run(a));
  airlines.forEach(al => insAirline.run(al));

  /* 5.2  Dynamic schedule & tickets -------------------------------- */
  const dayMs  = 86_400_000;
  const startT = Date.now() + dayMs * 7;

  routes.forEach(r => {
    /* Ensure FK targets exist even if they weren’t in the “active” CSVs */
    insAirline.run({ id: r.airline, name: r.airline, website_link: null });
    insAirport.run({ id: r.from, city: r.from, country: '' });
    insAirport.run({ id: r.to,   city: r.to,   country: '' });

    const depTime  = new Date(startT + (r.routeId % 14) * dayMs);
    const arrTime  = new Date(depTime.getTime() + ((r.routeId % 10) + 1) * 60 * 60_000);
    const flightId = `${r.airline}${String(r.routeId).padStart(5, '0')}`;

    insFlight.run({
      id      : flightId,
      airline : r.airline,
      from    : r.from,
      to      : r.to,
      tdep    : depTime.toISOString(),
      tarr    : arrTime.toISOString(),
      seats   : 200
    });

    ['economy','business','first'].forEach((cls, idx) => {
      insTicket.run({
        code  : `${flightId}-${cls[0].toUpperCase()}`,
        flight: flightId,
        airline: r.airline,
        class : cls,
        price : (idx + 1) * 150 + (r.routeId % 80),
        avail : Math.floor(200 / (idx + 1))
      });
    });
  });
});

console.time('⏱  Seeding');
tx();
console.timeEnd('⏱  Seeding');

console.log('🎉 Database seeded at real-world scale. Ready for take-off!\n');
