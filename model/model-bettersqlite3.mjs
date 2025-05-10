/*c:\Users\USER\Documents\GitHub\mybooks-2025-updates\model\model-bettersqlite3.mjs
uses better-sqlite3 module
npm install better-sqlite3
*/
import { default as bettersqlite3 } from 'better-sqlite3';

console.log('Using better-sqlite3 module');

const db = new bettersqlite3(`${import.meta.dirname}/../data/books.db`, { fileMustExist: true });


const getBooks = () => {
   try {

      const getBooksStm = db.prepare('SELECT * FROM Books ORDER BY title');

      return getBooksStm.all();
   } catch (err) {
      throw err;
   }
};

const addBook = (book) => {
   try {
      const addBookStm = db.prepare('INSERT INTO Books (title, author, comment, user)  VALUES (?, ?, ?, ?)');
      const result = addBookStm.run(book.title, book.author, book.comment, book.user);
      return result;
   } catch (err) {
      throw err;
   }
};

const deleteBook = (bookID) => {
   try {
      const deleteBookStm = db.prepare('DELETE FROM Books WHERE bookID = ?');
      const result = deleteBookStm.run(bookID);
      return result;
   } catch (err) {
      throw err;
   }
};

const getBook = (bookID) => {
   try {
      const getBookStm = db.prepare('SELECT * FROM Books WHERE bookID = ?');

      const row = getBookStm.all(bookID);
      return row[0];
   } catch (err) {
      throw err;
   }
};

const editBook = (book) => {
   try {
      const editBookStm = db.prepare('UPDATE Books SET title = ?, author = ?, comment = ? WHERE (bookID = ?)');

      const result = editBookStm.run(book.title, book.author, book.comment, book.bookID);
      return result;
   } catch (err) {
      throw err;
   }
};

function shutdown() {
   try {
      db.close();
      console.log('Έκλεισε η σύνδεση με την SQLite.');
   } catch (err) {
      throw err;
   }
}

export { getBooks, addBook, getBook, editBook, deleteBook, shutdown };
