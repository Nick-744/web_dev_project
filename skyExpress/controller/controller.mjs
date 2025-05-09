// controllers/airTicketsController.mjs

// Example in-memory data; replace later with DB queries
const cities = ['Athens', 'Paris', 'London', 'New York', 'Tokyo'];

function showHomePage(req, res) {
    res.render('air_tickets', { 
        title: '✈🎫 FlyExpress', 
        cities 
    });
}

function showTicketsPage(req, res) {
    res.render('tickets', { 
        title: 'Tickets - FlyExpress', 
        tickets: [] // Populate when you implement DB logic
    });
}

function showTopDestinations(req, res) {
    res.render('top_destinations', { 
        title: 'Top Destinations - FlyExpress', 
        destinations: ['Santorini', 'Bali', 'Maldives', 'Dubai']
    });
}

function showAboutPage(req, res) {
    res.render('about', { 
        title: 'About Us - FlyExpress' 
    });
}

// Handle form submission (dummy logic for now)
function handleFlightSearch(req, res) {
    const { fromInput, toInput, tripType, class: flightClass, adults, children } = req.body;

    // You can add validation here

    // Simulate search result
    const availableFlights = [{
        from: fromInput,
        to: toInput,
        price: 199,
        flightClass,
        tripType
    }];

    res.render('tickets', { 
        title: 'Available Flights - FlyExpress', 
        tickets: availableFlights 
    });
}

export { 
    showHomePage, 
    showTicketsPage, 
    showTopDestinations, 
    showAboutPage, 
    handleFlightSearch 
};
