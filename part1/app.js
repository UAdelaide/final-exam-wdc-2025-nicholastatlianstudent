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

function seedDatabase() {
  const createTablesSQL = `
    CREATE TABLE IF NOT EXISTS Users (
      user_id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('owner', 'walker') NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS Dogs (
      dog_id INT AUTO_INCREMENT PRIMARY KEY,
      owner_id INT NOT NULL,
      name VARCHAR(50) NOT NULL,
      size ENUM('small', 'medium', 'large') NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES Users(user_id)
    );
    CREATE TABLE IF NOT EXISTS WalkRequests (
      request_id INT AUTO_INCREMENT PRIMARY KEY,
      dog_id INT NOT NULL,
      requested_time DATETIME NOT NULL,
      duration_minutes INT NOT NULL,
      location VARCHAR(255) NOT NULL,
      status ENUM('open', 'accepted', 'completed', 'cancelled') DEFAULT 'open',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dog_id) REFERENCES Dogs(dog_id)
    );
    CREATE TABLE IF NOT EXISTS WalkApplications (
      application_id INT AUTO_INCREMENT PRIMARY KEY,
      request_id INT NOT NULL,
      walker_id INT NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
      FOREIGN KEY (request_id) REFERENCES WalkRequests(request_id),
      FOREIGN KEY (walker_id) REFERENCES Users(user_id),
      CONSTRAINT unique_application UNIQUE (request_id, walker_id)
    );
    CREATE TABLE IF NOT EXISTS WalkRatings (
      rating_id INT AUTO_INCREMENT PRIMARY KEY,
      request_id INT NOT NULL,
      walker_id INT NOT NULL,
      owner_id INT NOT NULL,
      rating INT CHECK (rating BETWEEN 1 AND 5),
      comments TEXT,
      rated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (request_id) REFERENCES WalkRequests(request_id),
      FOREIGN KEY (walker_id) REFERENCES Users(user_id),
      FOREIGN KEY (owner_id) REFERENCES Users(user_id),
      CONSTRAINT unique_rating_per_walk UNIQUE (request_id)
    );
  `;

  db.query(createTablesSQL, (err) => {
    if (err) return console.error('Issue creating tables:', err);

    const insertUsersSQL = `
      INSERT IGNORE INTO Users (username, email, password_hash, role) VALUES
      ('alice123', 'alice@example.com', 'hashed123', 'owner'),
      ('bobwalker', 'bob@example.com', 'hashed456', 'walker'),
      ('carol123', 'carol@example.com', 'hashed789', 'owner'),
      ('newwalker', 'newwalker@example.com', 'hashed000', 'walker');
    `;

    db.query(insertUsersSQL, (err) => {
      if (err) return console.error('Error inserting users:', err);

      const insertDogsSQL = `
        INSERT IGNORE INTO Dogs (owner_id, name, size) VALUES
        ((SELECT user_id FROM Users WHERE username='alice123'), 'Max', 'medium'),
        ((SELECT user_id FROM Users WHERE username='carol123'), 'Bella', 'small');
      `;

      db.query(insertDogsSQL, (err) => {
        if (err) return console.error('Error inserting dogs:', err);

        const insertWalksSQL = `
          INSERT IGNORE INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status) VALUES
          ((SELECT dog_id FROM Dogs WHERE name='Max'), '2025-06-10 08:00:00', 30, 'Parklands', 'completed'),
          ((SELECT dog_id FROM Dogs WHERE name='Bella'), '2025-06-10 09:30:00', 45, 'Beachside Ave', 'open');
        `;

        db.query(insertWalksSQL, (err) => {
          if (err) return console.error('Error inserting walk requests:', err);

          // ✅ Insert WalkApplications
          const insertApplicationsSQL = `
            INSERT IGNORE INTO WalkApplications (request_id, walker_id, status) VALUES
            (
              (SELECT request_id FROM WalkRequests WHERE dog_id = (SELECT dog_id FROM Dogs WHERE name = 'Max') LIMIT 1),
              (SELECT user_id FROM Users WHERE username = 'bobwalker'),
              'accepted'
            );
          `;

          db.query(insertApplicationsSQL, (err) => {
            if (err) return console.error('Error inserting applications:', err);

            // ✅ Insert WalkRatings
            const insertRatingsSQL = `
              INSERT IGNORE INTO WalkRatings (request_id, walker_id, owner_id, rating, comments) VALUES
              (
                (SELECT request_id FROM WalkRequests WHERE dog_id = (SELECT dog_id FROM Dogs WHERE name = 'Max') LIMIT 1),
                (SELECT user_id FROM Users WHERE username = 'bobwalker'),
                (SELECT user_id FROM Users WHERE username = 'alice123'),
                5,
                'Excellent walk!'
              );
            `;

            db.query(insertRatingsSQL, (err) => {
              if (err) return console.error('Error inserting ratings:', err);
              console.log('✅ Database fully seeded with users, dogs, walks, applications, and ratings.');
            });
          });
        });
      });
    });
  });
}

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

