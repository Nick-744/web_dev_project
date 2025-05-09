import dotenv from 'dotenv';
//
dotenv.config();

//const model = await import(`../model/model-${process.env.DB_MODEL}.mjs`);
const books = [];  // In-memory storage for books
let idCounter = 1;

const model = {
    async getBooks() {
        return books;
    },
    async getBook(id) {
        return books.find(b => b.bookID === parseInt(id));
    },
    async addBook(book) {
        book.bookID = idCounter++;
        books.push(book);
        return book;
    },
    async editBook(updatedBook) {
        const index = books.findIndex(b => b.bookID === parseInt(updatedBook.bookID));
        if (index !== -1) books[index] = updatedBook;
    },
    deleteBook(id) {
        const index = books.findIndex(b => b.bookID === parseInt(id));
        if (index !== -1) books.splice(index, 1);
    }
};

/* async only necessary when using an async api. on synchronous api, 
e.g. better-sqlite3, it will be ignored */
async function getBooks(req, res, next) {
   const books = await model.getBooks();
   res.render('books', { data: books });
}

function showAddBookForm(req, res) {
   res.render('create', { data: {} });
}

async function addBook(req, res) {
   const newBook = {
      title: req.body.title,
      author: req.body.author,
      comment: req.body.comment,
   };
   try {
      const result = await model.addBook(newBook);
      res.redirect('/books');
   } catch (err) {
      console.error(err);
      throw new Error('Error adding book');
   }
}

function deleteBook(req, res) {
   const id = req.params.id;
   try {
      model.deleteBook(id);
      res.redirect('/books');
   } catch (err) {
      console.error(err);
      throw new Error('Error deleting book');
   }
}

function about(req, res) {
   console.log('GET /about session=', req.session);
   res.render('about');
}

async function showEditBookForm(req, res) {
   const id = req.params.bookID;
   if (id) {
      try {
         const book = await model.getBook(id);
         res.render('edit', { data: book });
      } catch (err) {
         console.error(err);
         throw new Error('Error retrieving book');
      }
   }
}

async function editBook(req, res) {
   const id = req.params.id;
   const book = {
      title: req.body.title,
      author: req.body.author,
      comment: req.body.comment,
      bookID: id,
   };
   try {
      await model.editBook(book);
      res.redirect('/books');
   } catch (err) {
      console.error(err);
      throw new Error('Error editing book');
   }
}

export { about, showAddBookForm, addBook, deleteBook, showEditBookForm, getBooks, editBook };
