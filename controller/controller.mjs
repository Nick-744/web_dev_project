// controllers/airTicketsController.mjs
import dotenv from 'dotenv';
dotenv.config();

const model = await import(`../model/model-betterSqlite3.mjs`);

// Wikipedia stealer - Top Destinations Page!
async function getCityImage(city) {
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(city)}&prop=pageimages&format=json&pithumbsize=600&origin=*`;
    
    //throw new Error('Error fetching city image'); // For testing error handling!

    try {
        const res = await fetch(url);
        const data = await res.json();
        const pages = data.query.pages;
        const page = Object.values(pages)[0];
        return page?.thumbnail?.source || '/images/default_city.jpg';
    } catch (err) {
        console.error(`Error fetching image for ${city}:`, err);
        return '/images/default_city.jpg';
    }
}

async function showTopDestinations(req, res) {
    const stats = await model.getTopDestinations();

    // Fetch images for each city dynamically
    const destinations = await Promise.all(
        stats.map(async (dest) => ({
            ...dest,
            image: await getCityImage(dest.name)
        }))
    );

    res.render('top_destinations', {
        title: 'Top Destinations - FlyExpress',
        destinations,
        statsData: stats
    });
}

/* ----------- Page Rendering Controllers ----------- */
function showHomePage(req, res) {
    res.render('air_tickets', {title: '✈🎫 FlyExpress'});
}

function showAboutPage(req, res) {
    res.render('about', {title: 'About Us - FlyExpress'});
}

/* ----------- API Handlers ----------- */
async function apiGetCities(req, res) {
    try {
        const result = await model.getCities();
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching cities');
    }
}

let flights = [];
function apiGetFlights(req, res) {
    res.json(flights);
}

/* ---------- Prices in Calendar ----------- */
async function apiGetPriceCalendar(req, res) {
    const { from, to } = req.query;

    if (!from || !to) {
        return res.status(400).json([]);
    }

    try {
        const result = await model.getCalendarPrices(from, to);
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json([]);
    }
}

/* ----------- Search Tickets with Filters ----------- */
async function searchTickets(req, res) {
    try {
        const tickets = await model.searchTickets(req);
        tickets.title = 'Available Flights - FlyExpress';
        res.render('tickets', tickets );
    
    } catch (err) {
        console.error(err);
        res.status(500).send('Database Error');
    }
}

/* ----------- Authentication Controllers ----------- */
function showLoginPage(req, res) {
    res.render('login', { title: 'Login - FlyExpress' });
}

function showRegisterPage(req, res) {
    res.render('register', { title: 'Register - FlyExpress' });
}

import bcrypt from 'bcrypt'; // bcrypt for password hashing!
import { sendWelcomeEmail } from '../lib/mailer.js';

async function handleRegister(req, res) {
    const { username, password } = req.body;
    try {
        const existing = await model.getUserById(username);
        if (existing) {
            return res.render('register', { error: 'Username already exists', title: 'Register - FlyExpress' });
        }
        const hashed = bcrypt.hashSync(password, 12);
        await model.createUser(username, hashed);
        
        sendWelcomeEmail(username);
        res.redirect('/login');
    } catch (err) {
        console.error(err);
        res.status(500).send('Registration Error');
    }
}

async function handleLogin(req, res) {
    const { username, password } = req.body;
    try {
        const user = await model.getUserById(username);
        if (user && bcrypt.compareSync(password, user.password)) {
            req.session.user = username;
            return res.redirect('/');
        }
        res.render('login', { title: 'Login - FlyExpress', error: 'Invalid credentials' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Login Error');
    }
}

function handleLogout(req, res) {
    req.session.destroy(() => res.redirect('/'));
}

// ----- Favorites API! -----
async function showFavorites(req, res) {
    const userId = req.session.user;
    if (!userId) return res.redirect('/login');

    try {
        const favorites = await model.getFavorites(userId);
        res.render('favorites', { title: 'Favourites', favorites });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error loading favorites');
    }
}

async function addFavorite(req, res) {
    const { ticketId, flightId, airlineId } = req.query;
    const userId = req.session.user;

    if (!userId || !ticketId || !flightId || !airlineId) 
        return res.status(400).json({ success: false });

    try {
        await model.addFavorite(userId, ticketId, flightId, airlineId);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
}

async function removeFavorite(req, res) {
    const { ticketId, flightId, airlineId } = req.query;
    const userId = req.session.user;

    if (!userId || !ticketId || !flightId || !airlineId) 
        return res.status(400).json({ success: false });

    try {
        await model.removeFavorite(userId, ticketId, flightId, airlineId);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
}

// ----- Date Grid API! -----
async function dateGrid(req, res) {
    try {
        const {outboundPrices, returnPrices} = await model.getDateGrid(req.query);
        res.json({ outboundPrices, returnPrices });
    } catch (err) {
        console.error('Error in DateGrid:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

async function dateGridDay(req, res) {
    try {
        const rows = await model.getDateGridDay(req.query);
        res.json(rows); // either [] or 1-row array
    } catch (err) {
        console.error(err);
        res.status(500).json([]);
    }
}

async function dateGridColumn(req, res) {
    try {
        const { depDate } = req.query;

        const { outboundPrice, rows } = await model.getDateGridColumn(req.query);

        res.json({
            outDate: depDate,
            outboundPrice,
            prices: rows // [{ retDate: '...', totalPrice: ... }]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json([]);
    }
}

export {
    showHomePage,
    showTopDestinations,
    showAboutPage,
    searchTickets,

    // API Handlers
    apiGetCities,
    apiGetFlights,
    apiGetPriceCalendar,
    
    // User Authentication
    showLoginPage,
    handleLogin,
    showRegisterPage,
    handleRegister,
    handleLogout,
    
    showFavorites,
    addFavorite,
    removeFavorite,

    // Date Grid API
    dateGrid,
    dateGridDay,
    dateGridColumn
};
