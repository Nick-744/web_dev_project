// controllers/airTicketsController.mjs

const cities = ['Athens', 'Paris', 'London', 'New York', 'Tokyo'];
const topDestinations = ['Santorini', 'Bali', 'Maldives', 'Dubai'];

// In-memory flight storage (simulate database)
let flights = [];

/* ----------- Page Rendering Controllers ----------- */

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

// Handle form submission (renders tickets view)
function handleFlightSearch(req, res) {
    const { fromInput, toInput, tripType, class: flightClass, adults, children } = req.body;

    // Basic validation
    if (!fromInput || !toInput || fromInput === toInput) {
        return res.status(400).send('Invalid flight search inputs.');
    }

    // Simulate search result and store it in memory
    const newFlight = {
        from: fromInput,
        to: toInput,
        price: 199, // Example static price
        flightClass,
        tripType,
        adults,
        children
    };

    flights.push(newFlight);

    res.render('tickets', { 
        title: 'Available Flights - FlyExpress', 
        tickets: flights 
    });
}

// API: Get all available cities
function apiGetCities(req, res) {
    res.json(cities);
}

// API: Get all booked flights
function apiGetFlights(req, res) {
    res.json(flights);
}

export { 
    showHomePage, 
    showTicketsPage, 
    showTopDestinations, 
    showAboutPage, 
    handleFlightSearch,
    apiGetCities,
    apiGetFlights
};
