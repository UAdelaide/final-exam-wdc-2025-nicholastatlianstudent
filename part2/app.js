const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '/public')));

// Routes
const walkRoutes = require('./routes/walkRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);

// Get dogs for a specific owner
app.get('/api/dogs', async (req, res) => {
  try {
    const username = req.query.owner;

    if (!username) {
      return res.status(400).json({ error: 'Owner username required' });
    }

    // MySQL query using your database structure
    const query = `
      SELECT d.dog_id, d.name, d.size
      FROM Dogs d
      INNER JOIN Users u ON d.owner_id = u.user_id
      WHERE u.username = ? AND u.role = 'owner'
    `;

    db.query(query, [username], (error, results) => {
      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({ error: 'Database error' });
      }

      res.json(results);
    });

  } catch (error) {
    console.error('Error fetching dogs:', error);
    res.status(500).json({ error: 'Failed to fetch dogs' });
  }
});

module.exports = app;