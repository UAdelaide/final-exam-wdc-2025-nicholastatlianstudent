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

// In your Express.js backend routes file
app.get('/api/dogs', async (req, res) => {
  try {
    const username = req.query.owner || req.session.username;

    // First get the user_id from username
    const userQuery = 'SELECT user_id FROM Users WHERE username = ?';
    const [users] = await db.query(userQuery, [username]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = users[0].user_id;

    // Then get all dogs for this user
    const dogsQuery = 'SELECT dog_id, name, size FROM Dogs WHERE owner_id = ?';
    const [dogs] = await db.query(dogsQuery, [userId]);

    res.json(dogs);
  } catch (error) {
    console.error('Error fetching dogs:', error);
    res.status(500).json({ error: 'Failed to fetch dogs' });
  }
});

// Alternative: Get dogs for the currently logged-in user
app.get('/api/owner/dogs', async (req, res) => {
  try {
    // Assuming you store user_id in session after login
    const userId = req.session.user_id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const query = 'SELECT dog_id, name, size FROM Dogs WHERE owner_id = ?';
    const [dogs] = await db.query(query, [userId]);

    res.json(dogs);
  } catch (error) {
    console.error('Error fetching dogs:', error);
    res.status(500).json({ error: 'Failed to fetch dogs' });
  }
});

// Export the app instead of listening here
module.exports = app;