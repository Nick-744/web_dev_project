import express from 'express';
import * as controller from '../controller/controller.mjs'; // import the controller

const router = express.Router();

router.get('/', (req, res, next) => {
   res.redirect('/books');
}); 
router.get('/books', controller.getBooks); // GET /books
router.get('/create', controller.showAddBookForm); // GET /create
router.post('/create', controller.addBook); // POST /create
router.get('/delete/:id', controller.deleteBook); // GET /delete/:bookID
router.get('/edit/:bookID', controller.showEditBookForm); // GET /edit/:bookID
router.post('/edit/:id', controller.editBook); // POST /edit/:bookID
// router.get('/about', about); // GET /about
// router.post('/delete/:id', deleteBook); // POST /delete/:bookID
// router.get('/logout', logout); // GET /logout

export { router };
