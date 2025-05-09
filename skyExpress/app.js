import express from 'express';
import path from 'path';

const app = express();

app.use(express.static(path.join(process.cwd(), 'public'))); // Serve static files from /public

// Example route
app.get('/', (req, res) => {
    res.render('air_tickets', { title: '✈🎫', cities: ['Athens', 'Paris', 'London', 'New York'] });
});

// Set Handlebars as the view engine
import { engine } from 'express-handlebars';
app.engine('hbs', engine({ extname: '.hbs' }));
app.set('view engine', 'hbs');
app.set('views', './views');

app.listen(3000, () => console.log('Server running on port 3000'));
