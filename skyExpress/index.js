import express from 'express';
import exphbs from 'express-handlebars';
import dotenv from 'dotenv';

dotenv.config();

// Δημιουργία εξυπηρετητή Express
const app = express();

// Διαμόρφωση του εξυπηρετητή - μηχανής handlebars
app.engine('hbs', exphbs.engine({ extname: 'hbs' }));
app.set('view engine', 'hbs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));


//// ROUTES //////
import { router } from './routes/router.mjs'; // import the router from router.mjs

app.use('/', router);

app.use((err, req, res, next) => {
   console.error(err.stack);
   res.status(500).render('error', { error: err, layout: false });
});

console.log(process.env.PORT);
// Εκκίνηση του εξυπηρετητή
const PORT = process.env.PORT || 3003;
const server = app.listen(PORT, () => {
   console.log(`Συνδεθείτε στη σελίδα: http://localhost:${PORT}`);
});

function shutdown(signal) {
   console.log(`\n Κλείνω λόγω ${signal}...`);
 
   server.close(async () => {
     console.log('Ο εξυπηρετητής HTTP έκλεισε.');
 
     try {
      const model = await import(`./model/model-${process.env.DB_MODEL}.mjs`);

       await model.shutdown();
     } catch (err) {
       console.error('Error during shutdown:', err);
     } finally {
       process.exit(0);
     }
   });
 }
 
 process.on('SIGINT', shutdown);   // Ctrl+C
 process.on('SIGTERM', shutdown);  // kill or Docker stop