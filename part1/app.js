var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const mysql = require('mysql');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

let db;

(async () => {
    try {
      // Connect to MySQL without specifying a database
      const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '' // Set your MySQL root password
      });

      // Create the database if it doesn't exist
      await connection.query('CREATE DATABASE IF NOT EXISTS DogWalkService');
      await connection.end();

      // Now connect to the created database
      db = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'DogWalkService'
      });

      // Create a table if it doesn't exist
    //   await db.execute(`
    //     CREATE TABLE IF NOT EXISTS books (
    //       id INT AUTO_INCREMENT PRIMARY KEY,
    //       title VARCHAR(255),
    //       author VARCHAR(255)
    //     )
    //   `);

      // Insert data if table is empty
//       const [rows] = await db.execute('SELECT COUNT(*) AS count FROM Users');
//       if (rows[0].count === 0) {
//         await db.execute(`
//           INSERT INTO books (title, author) VALUES
//           ('1984', 'George Orwell'),
//           ('To Kill a Mockingbird', 'Harper Lee'),
//           ('Brave New World', 'Aldous Huxley')
//         `);
//       }
    } catch (err) {
      console.error('Error setting up database. Ensure Mysql is running: service mysql start', err);
    }
  })();


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

  // Route to return books as JSON
app.get('/dogs', async (req, res) => {
    db.query('SELECT Dogs.dog_id, Dogs.name, Dogs.size FROM Dogs', (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to fetch Dogs' });
        }
        res.json(results);
    });
});

app.use(express.static(path.join(__dirname, 'public')));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

