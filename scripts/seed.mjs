// -------------------------------- scripts/seed.mjs -------------------------
/**
 * Seed script – fills the SQLite DB with *minimal* realistic data so that the
 * project can be tested end-to-end (search, pagination, favourites, etc.).
 *
 * Run once:
 *    npm run seed
 * ------------------------------------------------------------------------- */

import { db } from '../lib/db.js';

/* Helper ────────────────────────────────────────────────────────────────── */
const insertMany = (stmt, rows) => db.transaction(
    () => rows.forEach(r => stmt.run(r))
)();

/* 1.  AIRLINE ************************************************************* */
insertMany(
  db.prepare(`INSERT OR IGNORE INTO airline (id, name, website_link)
              VALUES (@id, @name, @link)`),
  [
    { id: 'A3',  name: 'Aegean Airlines',        link: 'https://en.aegeanair.com' },
    { id: 'BA',  name: 'British Airways',        link: 'https://www.ba.com'       },
    { id: 'DL',  name: 'Delta Air Lines',        link: 'https://www.delta.com'    }
  ]
);

/* 2.  AIRPORT ************************************************************* */
insertMany(
  db.prepare(`INSERT OR IGNORE INTO airport (id, city, country)
              VALUES (@id, @city, @country)`),
  [
    { id: 'ATH', city: 'Athens',  country: 'Greece'      },
    { id: 'LHR', city: 'London',  country: 'United Kingdom' },
    { id: 'JFK', city: 'New York',country: 'United States'  },
    { id: 'CDG', city: 'Paris',   country: 'France'      }
  ]
);

/* 3.  FLIGHT ************************************************************** */
insertMany(
  db.prepare(`INSERT OR IGNORE INTO flight
              (id, airline_id, airport_depart_id, airport_arrive_id,
               time_departure, time_arrival, num_tickets)
              VALUES (@id, @airline, @from, @to, @tdep, @tarr, @n)`),
  [
    { id:'F001', airline:'A3', from:'ATH', to:'LHR',
      tdep:'2025-06-01 08:30', tarr:'2025-06-01 10:30', n:180 },

    { id:'F002', airline:'BA', from:'LHR', to:'JFK',
      tdep:'2025-06-02 12:00', tarr:'2025-06-02 15:00', n:200 },

    { id:'F003', airline:'DL', from:'JFK', to:'CDG',
      tdep:'2025-06-03 18:45', tarr:'2025-06-04 07:55', n:220 }
  ]
);

/* 4.  TICKET ************************************************************** */
insertMany(
  db.prepare(`INSERT OR IGNORE INTO ticket
              (code, flight_id, airline_id, class, price, availability)
              VALUES (@code, @flight, @airline, @class, @price, @availability)`),
  [
    /* Flight F001 (A3) *************************************************** */
    { code:'ATH-LHR-ECO-001', flight:'F001', airline:'A3',
      class:'economy', price:120.00, availability:120 },
    { code:'ATH-LHR-BUS-001', flight:'F001', airline:'A3',
      class:'business', price:380.00, availability: 40 },
    { code:'ATH-LHR-FST-001', flight:'F001', airline:'A3',
      class:'first',   price:620.00, availability: 20 },

    /* Flight F002 (BA) **************************************************** */
    { code:'LHR-JFK-ECO-001', flight:'F002', airline:'BA',
      class:'economy', price:450.00, availability:150 },
    { code:'LHR-JFK-BUS-001', flight:'F002', airline:'BA',
      class:'business', price:900.00, availability: 40 },
    { code:'LHR-JFK-FST-001', flight:'F002', airline:'BA',
      class:'first',   price:1400.00, availability: 10 },

    /* Flight F003 (DL) **************************************************** */
    { code:'JFK-CDG-ECO-001', flight:'F003', airline:'DL',
      class:'economy', price:480.00, availability:160 },
    { code:'JFK-CDG-BUS-001', flight:'F003', airline:'DL',
      class:'business', price:950.00, availability: 45 },
    { code:'JFK-CDG-FST-001', flight:'F003', airline:'DL',
      class:'first',   price:1550.00, availability: 15 }
  ]
);

/* 5.  USER *************************************************************** */
insertMany(
  db.prepare(`INSERT OR IGNORE INTO user (id, password)
              VALUES (@id, @pwd)`),
  [
    { id:'alice@example.com', pwd:'$2b$10$hashed-pw-alice' }, // bcrypt hash
    { id:'bob@example.com',   pwd:'$2b$10$hashed-pw-bob'   }
  ]
);

/* 6.  HEARTS ************************************************************* */
insertMany(
  db.prepare(`INSERT OR IGNORE INTO hearts
              (ticket_code, flight_id, airline_id, user_id)
              VALUES (@code, @flight, @airline, @user)`),
  [
    { code:'ATH-LHR-ECO-001', flight:'F001', airline:'A3', user:'alice@example.com' },
    { code:'LHR-JFK-BUS-001', flight:'F002', airline:'BA', user:'bob@example.com'   }
  ]
);

console.log('✔ Database successfully seeded with demo data.');
