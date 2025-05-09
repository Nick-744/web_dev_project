import express from 'express';
import * as controller from '../controller/controller.mjs';

const router = express.Router();

// Page Routes
router.get('/', controller.showHomePage);
router.get('/tickets', controller.showTicketsPage);
router.get('/top-destinations', controller.showTopDestinations);
router.get('/about', controller.showAboutPage);

// API Routes
router.get('/api/cities', controller.apiGetCities);
router.get('/api/flights', controller.apiGetFlights);

// Form Submission
router.post('/search', controller.handleFlightSearch);

export default router;
