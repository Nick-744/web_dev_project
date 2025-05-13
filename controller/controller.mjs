// controllers/airTicketsController.mjs

const cities = ['Athens', 'Paris', 'London', 'New York', 'Tokyo'];

const topDestinations = [
    {
        name: "Paris",
        image: "/images/paris.jpg",
        description: "The city of lights, love, and culture. 🗼"
    },
    {
        name: "Tokyo",
        image: "/images/tokyo.jpg",
        description: "Futuristic vibes and timeless traditions. ⛩️"
    },
    {
        name: "New York",
        image: "/images/new-york.jpg",
        description: "The city that never sleeps. 🗽"
    }
];

function showTopDestinations(req, res) {
    res.render('top_destinations', {
        title: 'Top Destinations - FlyExpress',
        destinations: topDestinations,
        styles: `<link rel="stylesheet" href="/css/top_destinations.css">`
    });
}

let flights = [];

/* ----------- Page Rendering Controllers ----------- */
function showHomePage(req, res) {
    res.render('air_tickets', {
        title: '✈🎫 FlyExpress',
        cities
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

/* ----------- Search Tickets with Filters ----------- */
import { db } from '../lib/db.js';

function searchTickets(req, res) {
    const {
        fromInput = '',
        toInput = '',
        class: flightClass = '',
        tripType,
        departureDate,
        returnDate,
        sortBy,
        maxPrice,
        maxDuration
    } = req.query;

    if (!fromInput || !toInput || !flightClass) {
        return res.render('tickets', {
            title: 'Available Flights - FlyExpress',
            outboundFlights: [],
            returnFlights: []
        });
    }

    let sql = `
        SELECT 
            f.id AS flight_id,
            a1.city AS departure_city,
            a2.city AS arrival_city,
            f.time_departure,
            f.time_arrival,
            t.class,
            t.price,
            t.availability,
            al.name AS airline_name,
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
          LIMIT 10
    `;

    if (sortBy === 'price_asc') sql += ' ORDER BY t.price ASC';
    if (sortBy === 'price_desc') sql += ' ORDER BY t.price DESC';
    if (sortBy === 'duration_asc') sql += ' ORDER BY duration_minutes ASC';
    if (sortBy === 'duration_desc') sql += ' ORDER BY duration_minutes DESC';

    const outboundParams = [
        fromInput.toLowerCase(),
        toInput.toLowerCase(),
        flightClass.toLowerCase()
    ];
    if (departureDate) outboundParams.push(departureDate);
    if (maxPrice) outboundParams.push(parseFloat(maxPrice));
    if (maxDuration) outboundParams.push(parseFloat(maxDuration));

    try {
        const outboundFlights = db.prepare(sql).all(...outboundParams);

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

            returnFlights = db.prepare(sql).all(...returnParams);
        }

        res.render('tickets', {
            title: 'Available Flights - FlyExpress',
            outboundFlights: outboundFlights || [],
            returnFlights: returnFlights || [],
            fromInput,
            toInput,
            class: flightClass,
            tripType,
            departureDate,
            returnDate,
            sortBy,
            maxPrice,
            maxDuration
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Database Error');
    }
}

export {
    showHomePage,
    showTopDestinations,
    showAboutPage,
    apiGetCities,
    apiGetFlights,
    searchTickets
};
