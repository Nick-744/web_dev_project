// scripts/seed-live.mjs
/****************************************************************************************
 * Populates the flights.db with **real-world flight offers** via the Amadeus sandbox API.
 * ---------------------------------------------------------------------
 * • Requires Node ≥ 18 (global fetch) and your existing lib/db.js schema.
 * • Put AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET in a .env file.
 * • Run once with:  npm run seed-live
 ****************************************************************************************/
import 'dotenv/config';
import { db } from '../lib/db.js';

/* ------------------------------------------------------------------ */
/* OAuth token                                                        */
/* ------------------------------------------------------------------ */
const tokenRes = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
  method : 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body   : new URLSearchParams({
    grant_type   : 'client_credentials',
    client_id    : process.env.AMADEUS_CLIENT_ID,
    client_secret: process.env.AMADEUS_CLIENT_SECRET
  })
}).then(r => r.json());

const accessToken = tokenRes.access_token;

/* ------------------------------------------------------------------ */
/* PLAN: Pull a handful of popular routes for the next 30 days.       */
/* ------------------------------------------------------------------ */
const routes = [
  { from:'ATH', to:'LHR' },
  { from:'ATH', to:'CDG' },
  { from:'LHR', to:'JFK' },
  { from:'JFK', to:'CDG' }
];

const today = new Date();
const plusDays = d => {
  const dt = new Date(today); dt.setDate(dt.getDate() + d);
  return dt.toISOString().split('T')[0];
};

/* ------------------------------------------------------------------ */
/* Prepared SQL statements                                            */
/* ------------------------------------------------------------------ */
const insAirline = db.prepare(`
  INSERT OR IGNORE INTO airline (id, name, website_link)
  VALUES (@id, @name, @link)
`);

const insAirport = db.prepare(`
  INSERT OR IGNORE INTO airport (id, city, country)
  VALUES (@id, @city, @country)
`);

const insFlight = db.prepare(`
  INSERT OR IGNORE INTO flight
  (id, airline_id, airport_depart_id, airport_arrive_id,
   time_departure, time_arrival, num_tickets)
  VALUES (@id, @airline, @from, @to, @dep, @arr, @seats)
`);

const insTicket = db.prepare(`
  INSERT OR IGNORE INTO ticket
  (code, flight_id, airline_id, class, price, availability)
  VALUES (@code, @flight, @airline, @class, @price, @avail)
`);

/* Transaction wrapper for speed */
const tx = db.transaction((airline, airportFrom, airportTo, flight, tickets) => {
  insAirline.run(airline);
  insAirport.run(airportFrom);
  insAirport.run(airportTo);
  insFlight.run(flight);
  tickets.forEach(t => insTicket.run(t));
});

/* ------------------------------------------------------------------ */
/* Fetch offers route-by-route                                        */
/* ------------------------------------------------------------------ */
for (const r of routes) {
  const searchDate = plusDays(14);      // ~2 weeks ahead
  const url = new URL('https://test.api.amadeus.com/v2/shopping/flight-offers');
  url.search = new URLSearchParams({
    originLocationCode      : r.from,
    destinationLocationCode : r.to,
    departureDate           : searchDate,
    adults                  : '1',
    currencyCode            : 'EUR',
    max                     : '5'
  });

  const offers = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  }).then(r => r.json()).then(j => j.data ?? []);

  for (const offer of offers) {
    /* Skip multi-segment itineraries for simplicity */
    if (offer.itineraries[0].segments.length !== 1) continue;

    const seg = offer.itineraries[0].segments[0];
    const airlineCode = seg.carrierCode;
    const flightNumber = seg.number;
    const flightId = `${airlineCode}${flightNumber}-${searchDate}`;

    /* Build objects for transaction */
    const airlineRow = {
      id  : airlineCode,
      name: airlineCode,          // Amadeus sandbox lacks full names
      link: null
    };

    const airportFrom = {
      id     : seg.departure.iataCode,
      city   : seg.departure.iataCode,
      country: ''
    };

    const airportTo = {
      id     : seg.arrival.iataCode,
      city   : seg.arrival.iataCode,
      country: ''
    };

    const flightRow = {
      id     : flightId,
      airline: airlineCode,
      from   : seg.departure.iataCode,
      to     : seg.arrival.iataCode,
      dep    : seg.departure.at,
      arr    : seg.arrival.at,
      seats  : offer.numberOfBookableSeats ?? 0
    };

    /* Amadeus splits by travelerPricings; we care only about price & class */
    const tickets = offer.travelerPricings.map((tp, idx) => ({
      code  : `${flightId}-${tp.fareDetailsBySegment[0].class}-${idx}`,
      flight: flightId,
      airline: airlineCode,
      class : tp.fareDetailsBySegment[0].cabin,
      price : offer.price.total,
      avail : offer.numberOfBookableSeats ?? 0
    }));

    tx(airlineRow, airportFrom, airportTo, flightRow, tickets);
  }

  console.log(`✔ Seeded route ${r.from} → ${r.to} (${offers.length} offers)`);
}

console.log('\n✔ Live data seeding finished.\n');
