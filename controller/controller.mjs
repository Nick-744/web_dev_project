// controllers/airTicketsController.mjs

// DB Connection/access
import { db } from '../lib/db.js';

// Wikipedia stealer - Top Destinations Page!
async function getCityImage(city) {
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(city)}&prop=pageimages&format=json&pithumbsize=600&origin=*`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        const pages = data.query.pages;
        const page = Object.values(pages)[0];
        return page?.thumbnail?.source || '/images/default_city.jpg';
    } catch (err) {
        console.error(`Error fetching image for ${city}:`, err);
        return '/images/default_city.jpg';
    }
}

async function showTopDestinations(req, res) {
    const stats = db.prepare(`
        SELECT a2.city AS name, COUNT(*) AS favorites_count
        FROM hearts h
        JOIN ticket t ON h.ticket_code = t.code
        JOIN flight f ON t.flight_id = f.id
        JOIN airport a2 ON f.airport_arrive_id = a2.id
        GROUP BY a2.city
        ORDER BY favorites_count DESC
        LIMIT 5
    `).all();

    // Fetch images for each city dynamically
    const destinations = await Promise.all(
        stats.map(async (dest) => ({
            ...dest,
            image: await getCityImage(dest.name)
        }))
    );

    res.render('top_destinations', {
        title: 'Top Destinations - FlyExpress',
        destinations,
        statsData: stats
    });
}

let flights = [];

/* ----------- Page Rendering Controllers ----------- */
function showHomePage(req, res) {
    res.render('air_tickets', {
        title: '✈🎫 FlyExpress'
    });
}

function showAboutPage(req, res) {
    res.render('about', {
        title: 'About Us - FlyExpress'
    });
}

/* ----------- API Handlers ----------- */
function apiGetCities(req, res) {
    try {
        const stmt = db.prepare('SELECT DISTINCT city FROM airport ORDER BY city');
        const result = stmt.all().map(row => row.city);
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching cities');
    }
}

function apiGetFlights(req, res) {
    res.json(flights);
}

/* ---------- Prices in Calendar ----------- */
function apiGetPriceCalendar(req, res) {
    const { from, to } = req.query;

    if (!from || !to) {
        return res.status(400).json([]);
    }

    try {
        const sql = `
            SELECT DATE(f.time_departure) AS date, MIN(t.price) AS price
            FROM flight f
            JOIN airport a1 ON f.airport_depart_id = a1.id
            JOIN airport a2 ON f.airport_arrive_id = a2.id
            JOIN ticket t ON f.id = t.flight_id
            WHERE LOWER(a1.city) = LOWER(?) AND LOWER(a2.city) = LOWER(?)
            GROUP BY DATE(f.time_departure)
            ORDER BY date;
        `;
        const result = db.prepare(sql).all(from.toLowerCase(), to.toLowerCase());
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json([]);
    }
}

/* ----------- Search Tickets with Filters ----------- */
function searchTickets(req, res) {
    const userId = req.session.user;
    let favoriteTickets = [];

    if (userId) { // For Database integrity reasons!
        favoriteTickets = db.prepare(`
            SELECT ticket_code FROM hearts WHERE user_id = ?
        `).all(userId).map(row => row.ticket_code);
    }

    const {
        fromInput = '',
        toInput = '',
        flightClass: flightClass = '',
        tripType,
        departureDate,
        returnDate,
        sortBy,
        maxPrice,
        maxDuration
    } = req.query;
    const { rlimit = 5 } = req.query; //return limit
    const { limit = 5} = req.query; // outbound limit
    
    if (!fromInput || !toInput || !flightClass) {
        //console.log('Missing required fields');
        return res.render('tickets', {
            title: 'Available Flights - FlyExpress',
            outboundFlights: [],
            returnFlights: []
        });
    }

    /* t.code -> ticket code, so we can use it to add to favorites */
    let baseSQL = `
        SELECT 
            f.id AS flight_id,
            a1.city AS departure_city,
            a2.city AS arrival_city,
            f.time_departure,
            f.time_arrival,
            t.class,
            t.price,
            t.code AS code,
            t.availability,
            al.name AS airline_name,
            al.id AS airline_id,
            (strftime('%s', f.time_arrival) - strftime('%s', f.time_departure)) / 60 AS duration_minutes
        FROM flight f
        JOIN airport a1 ON f.airport_depart_id = a1.id
        JOIN airport a2 ON f.airport_arrive_id = a2.id
        JOIN ticket t ON f.id = t.flight_id
        JOIN airline al ON f.airline_id = al.id
        WHERE LOWER(a1.city) = LOWER(?)
        AND LOWER(a2.city) = LOWER(?)
        AND LOWER(t.class) = LOWER(?)
        ${departureDate ? 'AND DATE(f.time_departure) = DATE(?)' : ''}
        AND t.availability > 0
        ${maxPrice ? 'AND t.price <= ?' : ''}
        ${maxDuration ? 'AND duration_minutes <= ?' : ''}
    `;

    if (sortBy === 'price_asc') baseSQL += ' ORDER BY t.price ASC';
    if (sortBy === 'price_desc') baseSQL += ' ORDER BY t.price DESC';
    if (sortBy === 'duration_asc') baseSQL += ' ORDER BY duration_minutes ASC';
    if (sortBy === 'duration_desc') baseSQL += ' ORDER BY duration_minutes DESC';

    // Separate SQL queries for outbound and return flights
    const outboundSQL = baseSQL + ' LIMIT ?';
    const returnSQL = baseSQL + ' LIMIT ?';
    const outboundParams = [
        fromInput.toLowerCase(),
        toInput.toLowerCase(),
        flightClass.toLowerCase()
    ];


    if (departureDate) outboundParams.push(departureDate);
    if (maxPrice) outboundParams.push(parseFloat(maxPrice));
    if (maxDuration) outboundParams.push(parseFloat(maxDuration));
    // if (limit) outboundParams.push(parseInt(limit, 10));
    // else{outboundParams.push(10);}
    const numericLimit = parseInt(limit, 10) || 5; // Safe fallback
    outboundParams.push(numericLimit);
    const numericRlimit = parseInt(rlimit, 10) || 5; 
    let hasMoreReturns = false;
    try {
        const outboundFlights = db.prepare(outboundSQL).all(...outboundParams);
        const hasMore = outboundFlights.length >= numericLimit;
        let returnFlights = [];
        if (tripType === 'roundtrip') {
            
            const returnParams = [
                toInput.toLowerCase(),
                fromInput.toLowerCase(),
                flightClass.toLowerCase()
            ];
            if (returnDate) returnParams.push(returnDate);
            if (maxPrice) returnParams.push(parseFloat(maxPrice));
            if (maxDuration) returnParams.push(parseFloat(maxDuration));
            
            returnParams.push(numericRlimit);
            
            returnFlights = db.prepare(returnSQL).all(...returnParams);
            hasMoreReturns = returnFlights.length >= numericRlimit;
        
        }
        res.render('tickets', {
            title: 'Available Flights - FlyExpress',
            outboundFlights: outboundFlights || [],
            returnFlights: returnFlights || [],
            favoritesList: favoriteTickets || [],
            fromInput,
            toInput,
            flightClass: flightClass,
            tripType,
            departureDate,
            returnDate,
            sortBy,
            maxPrice,
            maxDuration,
            limit: numericLimit,
            rlimit: numericRlimit,
            hasMore,
            hasMoreReturns
        });
    
    } catch (err) {
        console.error(err);
        res.status(500).send('Database Error');
    }
}

/* ----------- Authentication Controllers ----------- */
import bcrypt from 'bcrypt'; // bcrypt for password hashing!

function showLoginPage(req, res) {
    res.render('login', { title: 'Login - FlyExpress' });
}

function showRegisterPage(req, res) {
    res.render('register', { title: 'Register - FlyExpress' });
}

function handleRegister(req, res) {
    const { username, password } = req.body;
    try {
        const existing = db.prepare('SELECT * FROM user WHERE id = ?').get(username);
        if (existing) {
            return res.render('register', { error: 'Username already exists', title: 'Register - FlyExpress' });
        }
        const hashed = bcrypt.hashSync(password, 10);
        db.prepare('INSERT INTO user (id, password) VALUES (?, ?)').run(username, hashed);
        res.redirect('/login');
    } catch (err) {
        console.error(err);
        res.status(500).send('Registration Error');
    }
}

function handleLogin(req, res) {
    const { username, password } = req.body;
    try {
        const user = db.prepare('SELECT * FROM user WHERE id = ?').get(username);
        if (user && bcrypt.compareSync(password, user.password)) {
            req.session.user = username;
            return res.redirect('/');
        }
        res.render('login', { title: 'Login - FlyExpress', error: 'Invalid credentials' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Login Error');
    }
}

function handleLogout(req, res) {
    req.session.destroy(() => res.redirect('/'));
}

// ----- Favorites API! -----
function showFavorites(req, res) {
    const userId = req.session.user;
    if (!userId) return res.redirect('/login');

    try {
        const favorites = db.prepare(`
            SELECT t.code AS id,
                   t.flight_id AS flight_id,
                   t.airline_id AS airline_id,
                   f.time_departure,
                   f.time_arrival,
                   a1.city AS origin,
                   a2.city AS destination,
                   t.price
            FROM hearts h
            JOIN ticket t ON h.ticket_code = t.code
            JOIN flight f ON t.flight_id = f.id
            JOIN airport a1 ON f.airport_depart_id = a1.id
            JOIN airport a2 ON f.airport_arrive_id = a2.id
            WHERE h.user_id = ?
        `).all(userId);

        res.render('favorites', { 
            title: 'My ❤️', 
            favorites 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error loading favorites');
    }
}

function addFavorite(req, res) {
    const userId = req.session.user;
    const { ticketId, flightId, airlineId } = req.query;

    if (!userId || !ticketId || !flightId || !airlineId) 
        return res.status(400).json({ success: false });

    try {
        const stmt = db.prepare(`
            INSERT OR IGNORE INTO hearts (ticket_code, flight_id, airline_id, user_id) 
            VALUES (?, ?, ?, ?)
        `);
        stmt.run(ticketId, flightId, airlineId, userId);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
}

function removeFavorite(req, res) {
    const userId = req.session.user;
    const { ticketId, flightId, airlineId } = req.query;

    if (!userId || !ticketId || !flightId || !airlineId) 
        return res.status(400).json({ success: false });

    try {
        const stmt = db.prepare(`
            DELETE FROM hearts 
            WHERE user_id = ? AND ticket_code = ? AND flight_id = ? AND airline_id = ?
        `);
        stmt.run(userId, ticketId, flightId, airlineId);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
}

function dateGrid(req, res) {
    try {
        const { fromInput, toInput, outStart, outEnd, retStart, retEnd } = req.query;

        if (!fromInput || !toInput || !outStart || !outEnd || !retStart || !retEnd) {
            return res.status(400).json({ error: 'Missing parameters.' });
        }

        // SQL 1: Outbound Prices
        const outboundSQL = `
            SELECT DATE(f.time_departure) AS outDate, MIN(t.price) AS min_out_price
            FROM flight f 
            JOIN airport a1 ON f.airport_depart_id = a1.id
            JOIN airport a2 ON f.airport_arrive_id = a2.id
            JOIN ticket t ON f.id = t.flight_id
            WHERE lower(a1.city) = ? 
              AND lower(a2.city) = ?
              AND DATE(f.time_departure) BETWEEN ? AND ?
            GROUP BY outDate
            LIMIT 7;
        `;

        // SQL 2: Return Prices
        const returnSQL = `
            SELECT DATE(r.time_departure) AS retDate, MIN(t.price) AS min_ret_price
            FROM flight r 
            JOIN airport a2 ON r.airport_depart_id = a2.id
            JOIN airport a1 ON r.airport_arrive_id = a1.id
            JOIN ticket t ON r.id = t.flight_id
            WHERE lower(a2.city) = ? 
              AND lower(a1.city) = ?
              AND DATE(r.time_departure) BETWEEN ? AND ?
            GROUP BY retDate
            LIMIT 7;
        `;

        const outboundPrices = db.prepare(outboundSQL).all(fromInput.toLowerCase(), toInput.toLowerCase(), outStart, outEnd);
        const returnPrices = db.prepare(returnSQL).all(toInput.toLowerCase(), fromInput.toLowerCase(), retStart, retEnd);
        //console.log('📡 /api/date-grid called with params:', req.query);
        // console.log('Outbound Prices:', outboundPrices);
        // console.log('Return Prices:', returnPrices);
        res.json({ outboundPrices, returnPrices });
    } catch (err) {
        console.error('Error in DateGrid:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
function dateGridDay(req, res) {
    const { dir, date, fromInput, toInput } = req.query;
    if (!dir || !date) return res.json([]);
  
    const sql =
      dir === 'out'
        ? `SELECT DATE(f.time_departure) AS outDate,
                  MIN(t.price)         AS min_out_price
           FROM flight f
           JOIN airport a1 ON f.airport_depart_id = a1.id
           JOIN airport a2 ON f.airport_arrive_id = a2.id
           JOIN ticket  t  ON f.id = t.flight_id
           WHERE lower(a1.city)=? AND lower(a2.city)=?
             AND DATE(f.time_departure)=?
           GROUP BY outDate
           LIMIT 1`
        : `SELECT DATE(r.time_departure) AS retDate,
                  MIN(t.price)         AS min_ret_price
           FROM flight r
           JOIN airport a2 ON r.airport_depart_id = a2.id
           JOIN airport a1 ON r.airport_arrive_id = a1.id
           JOIN ticket  t  ON r.id = t.flight_id
           WHERE lower(a2.city)=? AND lower(a1.city)=?
             AND DATE(r.time_departure)=?
           GROUP BY retDate
           LIMIT 1`;
  
    const rows = db.prepare(sql).all(
        dir === 'out' ? [fromInput.toLowerCase(), toInput.toLowerCase(), date]
                      : [toInput.toLowerCase(),  fromInput.toLowerCase(), date]
    );
    res.json(rows);            // either [] or 1-row array
  }

function dateGridColumn(req, res) {
    const { fromInput, toInput, depDate } = req.query;

    if (!fromInput || !toInput || !depDate) {
        return res.status(400).json({ error: 'Missing parameters.' });
    }

    // 1. Fetch outbound price for the selected departure date
    const outboundSQL = `
        SELECT MIN(t_out.price) AS min_out_price
        FROM flight f
        JOIN airport a1 ON f.airport_depart_id = a1.id
        JOIN airport a2 ON f.airport_arrive_id = a2.id
        JOIN ticket t_out ON f.id = t_out.flight_id
        WHERE lower(a1.city) = ?
          AND lower(a2.city) = ?
          AND DATE(f.time_departure) = ?
    `;

    const outboundRow = db.prepare(outboundSQL).get(
        fromInput.toLowerCase(),
        toInput.toLowerCase(),
        depDate
    );

    const outboundPrice = outboundRow ? outboundRow.min_out_price : 0;

    if (!outboundPrice) {
        return res.json({
            outDate: depDate,
            outboundPrice: 0,
            prices: []
        });
    }

    // 2. Fetch return prices and calculate total prices
    const returnSQL = `
        SELECT 
            DATE(r.time_departure) AS retDate,
            (? + MIN(t_ret.price)) AS totalPrice
        FROM flight r
        JOIN airport a2 ON r.airport_depart_id = a2.id
        JOIN airport a1 ON r.airport_arrive_id = a1.id
        JOIN ticket t_ret ON r.id = t_ret.flight_id
        WHERE lower(a2.city) = ?
          AND lower(a1.city) = ?
          AND DATE(r.time_departure) >= DATE(?)
        GROUP BY retDate
        ORDER BY retDate ASC;
    `;

    const rows = db.prepare(returnSQL).all(
        outboundPrice,                    // 👈 This gets added directly to return prices
        toInput.toLowerCase(),
        fromInput.toLowerCase(),
        depDate
    );

    res.json({
        outDate: depDate,
        outboundPrice,
        prices: rows // [{ retDate: '...', totalPrice: ... }]
    });
}


export {
    showHomePage,
    showTopDestinations,
    showAboutPage,
    searchTickets,

    // API Handlers
    apiGetCities,
    apiGetFlights,
    apiGetPriceCalendar,
    
    // User Authentication
    showLoginPage,
    handleLogin,
    showRegisterPage,
    handleRegister,
    handleLogout,
    
    showFavorites,
    addFavorite,
    removeFavorite,

    dateGrid,
    dateGridDay,
    dateGridColumn
};
