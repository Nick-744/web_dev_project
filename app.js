import express from 'express';
import path from 'path';
import session from 'express-session'; // User session management
import { engine } from 'express-handlebars';
import airTicketsRouter from './routes/airTicketsRouter.mjs';
console.log('-> App started fresh!');

const app = express();
const __dirname = path.resolve();

// Session Middleware (User Authentication Support)
app.use(session({
    secret: 'super_secret_key', // Replace with a strong secret in production!
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 Day Session
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
        multiply: (a, b) => a * b,
        json: (context) => JSON.stringify(context)
    }
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Register Router
//app.use(airTicketsRouter);
app.use('/', airTicketsRouter);

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
