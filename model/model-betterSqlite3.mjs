// model/model-betterSqlite3.mjs
import { db } from '../lib/db.js';

function getTopDestinations() {
    return db.prepare(`
        SELECT a2.city AS name, COUNT(*) AS favorites_count
        FROM hearts h
        JOIN ticket t ON h.ticket_code = t.code
        JOIN flight f ON t.flight_id = f.id
        JOIN airport a2 ON f.airport_arrive_id = a2.id
        GROUP BY a2.city
        ORDER BY favorites_count DESC
        LIMIT 5
    `).all();
}

function getCities() {
    return db.prepare(`SELECT DISTINCT city FROM airport ORDER BY city`).all().map(row => row.city);
}

function getCalendarPrices(from, to) {
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
    return db.prepare(sql).all(from.toLowerCase(), to.toLowerCase());
}

function getUserById(username) {
    return db.prepare('SELECT * FROM user WHERE id = ?').get(username);
}

function createUser(username, hashed) {
    return db.prepare('INSERT INTO user (id, password) VALUES (?, ?)').run(username, hashed);
}

function getFavorites(userId) {
    return db.prepare(`
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
}

function addFavorite(userId, ticketId, flightId, airlineId) {
    return db.prepare(`
        INSERT OR IGNORE INTO hearts (ticket_code, flight_id, airline_id, user_id) 
        VALUES (?, ?, ?, ?)
    `).run(ticketId, flightId, airlineId, userId);
}

function removeFavorite(userId, ticketId, flightId, airlineId) {
    return db.prepare(`
        DELETE FROM hearts 
        WHERE user_id = ? AND ticket_code = ? AND flight_id = ? AND airline_id = ?
    `).run(userId, ticketId, flightId, airlineId);
}

function getDateGrid({ fromInput, toInput, outStart, outEnd, retStart, retEnd }) {
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

    return {
        outboundPrices: db.prepare(outboundSQL).all(fromInput.toLowerCase(), toInput.toLowerCase(), outStart, outEnd),
        returnPrices: db.prepare(returnSQL).all(toInput.toLowerCase(), fromInput.toLowerCase(), retStart, retEnd)
    };
}

function getDateGridDay({ dir, date, fromInput, toInput }) {
    if (!dir || !date) return [];

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

    return db.prepare(sql).all(
        dir === 'out'
            ? [fromInput.toLowerCase(), toInput.toLowerCase(), date]
            : [toInput.toLowerCase(), fromInput.toLowerCase(), date]
    );
}

function getDateGridColumn({ fromInput, toInput, depDate }) {
    /* -----------------------------------------------------
     *   Cheapest outbound for the selected departure date
     * ----------------------------------------------------- */
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

    /* --------------------------------------------------------
     *   Cheapest returns + *total* price (outbound + return)
     * -------------------------------------------------------- */
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

    const prices = db.prepare(returnSQL).all(
        outboundPrice,
        toInput.toLowerCase(),
        fromInput.toLowerCase(),
        depDate
    );

    return { outboundPrice, prices };
}

function searchTickets(req) {
    const userId = req.session.user;
    let favoriteTickets = [];

    if (userId) {
        favoriteTickets = db.prepare(`SELECT ticket_code FROM hearts WHERE user_id = ?`)
                             .all(userId)
                             .map(row => row.ticket_code);
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
    const { rlimit = 5, limit = 5 } = req.query;

    if (!fromInput || !toInput || !flightClass) {
        return {
            title: 'Available Flights - FlyExpress',
            outboundFlights: [],
            returnFlights: []
        };
    }

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
    outboundParams.push(parseInt(limit) || 5);

    const outboundFlights = db.prepare(outboundSQL).all(...outboundParams);

    let returnFlights = [];
    let hasMoreReturns = false;
    if (tripType === 'roundtrip') {
        const returnParams = [
            toInput.toLowerCase(),
            fromInput.toLowerCase(),
            flightClass.toLowerCase()
        ];
        if (returnDate) returnParams.push(returnDate);
        if (maxPrice) returnParams.push(parseFloat(maxPrice));
        if (maxDuration) returnParams.push(parseFloat(maxDuration));
        returnParams.push(parseInt(rlimit) || 5);
        returnFlights = db.prepare(returnSQL).all(...returnParams);
        hasMoreReturns = returnFlights.length >= parseInt(rlimit);
    }

    return {
        outboundFlights,
        returnFlights,
        favoritesList: favoriteTickets,
        fromInput,
        toInput,
        flightClass,
        tripType,
        departureDate,
        returnDate,
        sortBy,
        maxPrice,
        maxDuration,
        limit,
        rlimit,
        hasMore: outboundFlights.length >= parseInt(limit),
        hasMoreReturns
    };
}

export {
    getTopDestinations,
    getCities,
    getCalendarPrices,
    getUserById,
    createUser,
    getFavorites,
    addFavorite,
    removeFavorite,
    getDateGrid,
    getDateGridDay,
    getDateGridColumn,
    searchTickets
};
