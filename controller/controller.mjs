// controllers/airTicketsController.mjs


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

/* ----------- Search Tickets with Filters ----------- */
import { db } from '../lib/db.js';

function searchTickets(req, res) {
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

    let baseSQL = `
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

export {
    showHomePage,
    showTopDestinations,
    showAboutPage,
    apiGetCities,
    apiGetFlights,
    searchTickets
};
