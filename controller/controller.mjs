// controllers/airTicketsController.mjs
//console.log('📢 controller/controller.mjs loaded!');

const cities = ['Athens', 'Paris', 'London', 'New York', 'Tokyo'];
const topDestinations = ['Santorini', 'Bali', 'Maldives', 'Dubai'];

// In-memory flight storage (simulate database)
let flights = [];

/* ----------- Page Rendering Controllers ----------- */

// function showHomePage(req, res) {
//     res.render('air_tickets', { 
//         title: '✈🎫 FlyExpress', 
//         cities 
//     });
// }
function showHomePage(req, res) {
    res.render('air_tickets', { 
        title: '✈🎫 FlyExpress', 
        cities,
        script: `
            <script src="/js/cities.js"></script>
            <script src="/js/globe.js"></script>
        `
    });
}
function showTicketsPage(req, res) {
    res.render('tickets', { 
        title: 'Tickets - FlyExpress', 
        tickets: flights 
    });
}

function showTopDestinations(req, res) {
    res.render('top_destinations', { 
        title: 'Top Destinations - FlyExpress', 
        destinations: topDestinations 
    });
}

function showAboutPage(req, res) {
    res.render('about', { 
        title: 'About Us - FlyExpress' 
    });
}

/* ----------- Form and API Handlers ----------- */

// API: Get all available cities
// function apiGetCities(req, res) {
//     res.json(cities);
// }
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

// API: Get all booked flights
function apiGetFlights(req, res) {
    res.json(flights);
}

// API: SEARCH TICKETS
import { db } from '../lib/db.js';



function searchTickets(req, res) {
    const { fromInput, toInput, class: flightClass, adults, children, tripType } = req.query;
    // console.log('Search Tickets:');
    // console.log('From:', fromInput);       // 'Athens'
    // console.log('To:', toInput);            // 'Paris'
    // console.log('Class:', flightClass);     // 'Economy'
    // console.log('Adults:', adults);         // '1'
    // console.log('Children:', children);     // '0'
    // console.log('Trip Type:', tripType);    // 'oneway'
    try {
        const stmt = db.prepare(`
            SELECT 
                f.id AS flight_id,
                a1.city AS departure_city,
                a2.city AS arrival_city,
                f.time_departure,
                f.time_arrival,
                t.class,
                t.price,
                t.availability,
                al.name AS airline_name
            FROM flight f
            JOIN airport a1 ON f.airport_depart_id = a1.id
            JOIN airport a2 ON f.airport_arrive_id = a2.id
            JOIN ticket t ON f.id = t.flight_id
            JOIN airline al ON f.airline_id = al.id
            WHERE LOWER(a1.city) = LOWER(?) 
            AND LOWER(a2.city) = LOWER(?) 
            AND LOWER(t.class) = LOWER(?) 
            AND t.availability > 0;
        `);

        const results = stmt.all(fromInput, toInput, flightClass);

        res.render('tickets', { 
            title: 'Available Flights - FlyExpress', 
            tickets: results 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Database Error');
    }
}



export { 
    showHomePage, 
    showTicketsPage, 
    showTopDestinations, 
    showAboutPage, 
    apiGetCities,
    apiGetFlights,
    searchTickets
};
