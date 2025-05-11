// controllers/airTicketsController.mjs
//console.log('📢 controller/controller.mjs loaded!');

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
        cities
    });
}
function showTicketsPage(req, res) {
    res.render('tickets', { 
        title: 'Tickets - FlyExpress', 
        tickets: flights 
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


// function searchTickets(req, res) {
//     console.log('Query Params Raw:', req.query);
//     const { fromInput, toInput, class: flightClass, adults, children, tripType, maxPrice } = req.query;

//     console.log('From:', fromInput);
//     console.log('To:', toInput);
//     console.log('Class:', flightClass);
//     console.log('Max Price:', maxPrice);

//     try {
//         // Build SQL dynamically based on whether maxPrice is set
//         let sql = `
//             SELECT 
//                 f.id AS flight_id,
//                 a1.city AS departure_city,
//                 a2.city AS arrival_city,
//                 f.time_departure,
//                 f.time_arrival,
//                 t.class,
//                 t.price,
//                 t.availability,
//                 al.name AS airline_name
//             FROM flight f
//             JOIN airport a1 ON f.airport_depart_id = a1.id
//             JOIN airport a2 ON f.airport_arrive_id = a2.id
//             JOIN ticket t ON f.id = t.flight_id
//             JOIN airline al ON f.airline_id = al.id
//             WHERE LOWER(a1.city) = LOWER(?) 
//               AND LOWER(a2.city) = LOWER(?) 
//               AND LOWER(t.class) = LOWER(?) 
//               AND t.availability > 0
//         `;

//         const params = [
//             fromInput.toLowerCase(), 
//             toInput.toLowerCase(), 
//             flightClass.toLowerCase()
//         ];

//         if (maxPrice && !isNaN(maxPrice)) {
//             sql += ' AND t.price <= ?';
//             params.push(parseFloat(maxPrice));
//         }

//         const stmt = db.prepare(sql);
//         const results = stmt.all(...params);

//         res.render('tickets', { 
//             title: 'Available Flights - FlyExpress', 
//             tickets: results 
//         });
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Database Error');
//     }
// }
function searchTickets(req, res) {
    
    const { 
        fromInput='', 
        toInput='', 
        class: flightClass='', 
        tripType,  
        departureDate, 
        returnDate 
    } = req.query;
    // If critical fields are missing, just render an empty result
    if (!fromInput || !toInput || !flightClass) {
        return res.render('tickets', { 
            title: 'Available Flights - FlyExpress', 
            outboundFlights: [],  
            returnFlights: [] 
        });
    }
    //console.log('Search Params:', req.query);

    const baseSQL = `
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
          ${departureDate ? 'AND DATE(f.time_departure) = DATE(?)' : ''} 
          AND t.availability > 0;
    `;

    const outboundParams = [fromInput.toLowerCase(), toInput.toLowerCase(), flightClass.toLowerCase()];
    if (departureDate) outboundParams.push(departureDate);  // Assuming 'YYYY-MM-DD' format
    //console.log('Outbound SQL:', baseSQL);
    //console.log('Outbound Params:', outboundParams);

    try {
        const outboundFlights = db.prepare(baseSQL).all(...outboundParams);
    
        //console.log('Outbound Query Results:');
        //console.table(outboundFlights);
    
        let returnFlights = [];
        if (tripType === 'roundtrip') {
            const returnParams = [toInput.toLowerCase(), fromInput.toLowerCase(), flightClass.toLowerCase()];
            if (returnDate) returnParams.push(returnDate);
            returnFlights = db.prepare(baseSQL).all(...returnParams);
            console.log('Return Flights Found:', returnFlights.length);
            //console.log('Return Query Results:');
            //console.table(returnFlights);
            if  (returnFlights){
                console.log('Return Flights:', returnFlights);
            }
        }
    
        res.render('tickets', { 
            title: 'Available Flights - FlyExpress', 
            outboundFlights: outboundFlights  || [],  
            returnFlights: returnFlights || []
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
