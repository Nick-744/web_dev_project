import airTicketsRouter from './routes/airTicketsRouter.mjs';
import { engine } from 'express-handlebars';
import SQLiteStore from 'connect-sqlite3';
import session from 'express-session'; // User session management
import crypto from 'node:crypto';
import express from 'express';
import path from 'path';

console.log('-> App started fresh!');

const app = express();
const __dirname = path.resolve();

// Session Middleware (User Authentication Support)
// Production-safe session storage using SQLite
app.use(session({
    store: new (SQLiteStore(session))({
        db: 'sessions.db',
        dir: './data',
        concurrentDB: true,
    }),
    secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 1 Day
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    }
}));

// Prevent Caching
app.use((req, res, next) => {
    res.locals.session = req.session;
    
    // Set a flag to indicate if the current page is an authentication page!
    res.locals.isAuthPage = ['/login', '/register'].includes(req.path);
    res.locals.authPageType = req.path === '/login' ? 'login' : req.path === '/register' ? 'register' : '';

    res.set('Cache-Control', 'no-store');
    next();
});

// Middleware for Parsing Form Data
app.use(express.urlencoded({ extended: true }));

// Serve Static Files from ./public
app.use(express.static(path.join(__dirname, 'public')));

// Handlebars View Engine
app.engine('hbs', engine({
    extname: '.hbs',
    helpers: {
        eq: (a, b) => a === b,
        includes: (array, value) => Array.isArray(array) && array.includes(value),
        multiply: (a, b) => a * b,
        json: (context) => JSON.stringify(context)
    }
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Register Router
app.use('/', airTicketsRouter);

// Error Handling
app.use((err, req, res, next) => {
   console.error(err.stack);
   res.status(500).render('error', { error: err, layout: false });
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
