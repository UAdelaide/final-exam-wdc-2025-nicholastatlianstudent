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

// Get dogs for the authenticated owner
app.get('/api/dogs', async (req, res) => {
  try {
    // Get user_id from session (set during login)
    const userId = req.session.user_id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Single query to get all dogs for this owner
    const query = 'SELECT dog_id, name, size FROM Dogs WHERE owner_id = ?';

    db.query(query, [userId], (error, results) => {
      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(results);
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = app;