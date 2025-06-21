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

    // First get the user_id from username
    const userQuery = `
      SELECT user_id
      FROM Users
      WHERE username = ? AND role = 'owner'
    `;

    const [users] = await db.execute(userQuery, [username]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'Owner not found' });
    }

    const userId = users[0].user_id;

    // Then get all dogs for this owner
    const dogsQuery = `
      SELECT dog_id, name, size
      FROM Dogs
      WHERE owner_id = ?
    `;

    const [dogs] = await db.execute(dogsQuery, [userId]);

    res.json(dogs);
  } catch (error) {
    console.error('Error fetching dogs:', error);
    res.status(500).json({ error: 'Failed to fetch dogs' });
  }
});

module.exports = app;