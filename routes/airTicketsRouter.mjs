import express from 'express';
import * as controller from '../controller/controller.mjs';

const router = express.Router();

// Page Routes
router.get('/', controller.showHomePage);
//router.get('/tickets', controller.showTicketsPage);
router.get('/top-destinations', controller.showTopDestinations);
router.get('/about', controller.showAboutPage);
router.get('/tickets', controller.searchTickets); // Must be EXACTLY this!

// Authentication Routes
router.get('/login', controller.showLoginPage);
router.post('/login', controller.handleLogin);
router.get('/register', controller.showRegisterPage);
router.post('/register', controller.handleRegister);
router.get('/logout', controller.handleLogout);
router.get('/favorites', controller.showFavorites);

// API Routes
router.get('/api/cities', controller.apiGetCities);
router.get('/api/flights', controller.apiGetFlights);
router.get('/api/price-calendar', controller.apiGetPriceCalendar);

router.post('/api/favorites/add', controller.addFavorite);
router.post('/api/favorites/remove', controller.removeFavorite);

export default router;
