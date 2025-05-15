import express from 'express';
import path from 'path';
import { engine } from 'express-handlebars';
import airTicketsRouter from './routes/airTicketsRouter.mjs';
console.log('✅ App started fresh!');

const app = express();
const __dirname = path.resolve();
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});
// app.use((req, res, next) => {
//     console.log(`Incoming request: ${req.method} ${req.url}`);
//     next();
// });

// Middleware for form data
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
