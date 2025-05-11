import express from 'express';
import * as controller from '../controller/controller.mjs';

const router = express.Router();

// Page Routes
router.get('/', controller.showHomePage);
//router.get('/tickets', controller.showTicketsPage);
router.get('/top-destinations', controller.showTopDestinations);
router.get('/about', controller.showAboutPage);
router.get('/tickets', controller.searchTickets);  // Must be EXACTLY this!

// API Routes
router.get('/api/cities', controller.apiGetCities);
router.get('/api/flights', controller.apiGetFlights);

router.get('/top-destinations', (req, res) => {
    const destinations = [
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

    res.render('top_destinations', { destinations });
});

export default router;
