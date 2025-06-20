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

db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'DogWalkService',
  multipleStatements: true
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Connected to MySQL');

  // Seed the database after successful connection
  seedDatabase();
});



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
app.get('/api/dogs', (req, res) => {
  const sql = `
    SELECT Dogs.name AS dog_name, Dogs.size, Users.username AS owner_username
    FROM Dogs
    JOIN Users ON Dogs.owner_id = Users.user_id
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching dogs:', err);
      return res.status(500).json({ error: 'Failed to fetch dogs' });
    }
    res.json(results);
  });
});

app.get('/api/walkrequests/open', (req, res) => {
  const sql = `
    SELECT
      WalkRequests.request_id,
      Dogs.name AS dog_name,
      WalkRequests.requested_time,
      WalkRequests.duration_minutes,
      WalkRequests.location,
      Users.username AS owner_username
    FROM WalkRequests
    JOIN Dogs ON WalkRequests.dog_id = Dogs.dog_id
    JOIN Users ON Dogs.owner_id = Users.user_id
    WHERE WalkRequests.status = 'open'
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching open walk requests:', err);
      return res.status(500).json({ error: 'Failed to fetch open walk requests' });
    }
    res.json(results);
  });
});

app.get('/api/walkers/summary', (req, res) => {
  const sql = `
    SELECT
      Users.username AS walker_username,
      COUNT(DISTINCT WalkRatings.rating_id) AS total_ratings,
      ROUND(AVG(WalkRatings.rating), 2) AS average_rating,
      (
        SELECT COUNT(*) FROM WalkApplications wa
        WHERE wa.walker_id = Users.user_id AND wa.status = 'accepted'
      ) AS completed_walks
    FROM Users
    LEFT JOIN WalkRatings ON Users.user_id = WalkRatings.walker_id
    WHERE Users.role = 'walker'
    GROUP BY Users.user_id
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching walker summary:', err);
      return res.status(500).json({ error: 'Failed to fetch walker summary' });
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

