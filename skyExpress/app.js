import express from 'express';
import path from 'path';
import { engine } from 'express-handlebars';
import airTicketsRouter from './routes/airTicketsRouter.mjs';

const app = express();
const __dirname = path.resolve();

// Middleware for form data
app.use(express.urlencoded({ extended: true }));

// ✅ Serve Static Files from ./public
app.use(express.static(path.join(__dirname, 'public')));

// Handlebars View Engine
app.engine('hbs', engine({ extname: '.hbs' }));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Register Router
app.use(airTicketsRouter);

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
