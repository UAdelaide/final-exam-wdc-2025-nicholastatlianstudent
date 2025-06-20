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
  `;

  db.query(createTablesSQL, (err) => {
    if (err) {
      console.error('Error creating tables:', err);
      return;
    }

    // Insert sample users
    const insertUsersSQL = `
      INSERT IGNORE INTO Users (username, email, password_hash, role) VALUES
      ('alice123', 'alice@example.com', 'hashed123', 'owner'),
      ('bobwalker', 'bob@example.com', 'hashed456', 'walker'),
      ('carol123', 'carol@example.com', 'hashed789', 'owner');
    `;

    db.query(insertUsersSQL, (err) => {
      if (err) return console.error('Error inserting users:', err);

      // Insert sample dogs
      const insertDogsSQL = `
        INSERT IGNORE INTO Dogs (owner_id, name, size) VALUES
        ((SELECT user_id FROM Users WHERE username='alice123'), 'Max', 'medium'),
        ((SELECT user_id FROM Users WHERE username='carol123'), 'Bella', 'small');
      `;

      db.query(insertDogsSQL, (err) => {
        if (err) return console.error('Error inserting dogs:', err);

        // Insert walk requests
        const insertWalksSQL = `
          INSERT IGNORE INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status) VALUES
          ((SELECT dog_id FROM Dogs WHERE name='Max'), '2025-06-10 08:00:00', 30, 'Parklands', 'open'),
          ((SELECT dog_id FROM Dogs WHERE name='Bella'), '2025-06-10 09:30:00', 45, 'Beachside Ave', 'open');
        `;

        db.query(insertWalksSQL, (err) => {
          if (err) return console.error('Error inserting walk requests:', err);
          console.log('Database seeded.');
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

app.get('/api/dogs', async (req, res) => {
    db.query('SELECT Dogs.dog_id, Dogs.name, Dogs.size FROM Dogs', (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to fetch Dogs' });
        }
        res.json(results);
    });
});

app.get('/api/walkrequests/open', (req, res) => {
    db.query(`
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
    `, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to fetch open walk requests' });
        }
        res.json(results);
    });
});

app.get('/api/walkers/summary', (req, res) => {
    db.query(`
        SELECT
            u.username AS walker_username,
            COUNT(r.rating_id) AS total_ratings,
            ROUND(AVG(r.rating), 1) AS average_rating,
            COUNT(DISTINCT CASE
                WHEN wr.status = 'completed' AND a.status = 'accepted' THEN wr.request_id
                ELSE NULL
            END) AS completed_walks
        FROM Users u
        LEFT JOIN WalkApplications a ON a.walker_id = u.user_id
        LEFT JOIN WalkRequests wr ON wr.request_id = a.request_id
        LEFT JOIN WalkRatings r ON r.walker_id = u.user_id
        WHERE u.role = 'walker'
        GROUP BY u.user_id
    `, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to fetch walker summary' });
        }
        res.json(results);
    });
});

app.use(express.static(path.join(__dirname, 'public')));


module.exports = app;

