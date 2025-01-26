const cors = require('cors');
const express = require('express');
const SurfSession = require('./models/SurfSession'); // Adjust the path as necessary
require('./db'); // Ensure the database connection is established

const app = express();
app.use(cors());
app.use(express.json());

// Create a new surf session
app.post('/sessions', async (req, res) => {
  try {
    const session = new SurfSession(req.body);
    await session.save();
    res.status(201).send(session);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Get all surf sessions
app.get('/sessions', async (req, res) => {
  try {
    const sessions = await SurfSession.find();
    res.status(200).send(sessions);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

