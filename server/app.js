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

// Get a specific surf session by ID
app.get('/sessions/:id', async (req, res) => {
  try {
    const sessionId = req.params.id;
    
    // Validate the session ID
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).send({ message: 'Invalid session ID' });
    }

    const session = await SurfSession.findById(sessionId).populate('participants').populate('location');

    if (!session) {
      return res.status(404).send({ message: 'Surf session not found.' });
    }

    res.status(200).send(session);
  } catch (error) {
    res.status(500).send({ message: 'Error retrieving surf session', error });
  }
});

// Predefined surf session data
const mockSurfSession = {
  _id: "60d5f9f5f9f5f9f5f9f5f9f5",
  date: "2025-02-01T10:00:00Z",
  location: {
    _id: "60d5f9f5f9f5f9f5f9f5f9f8",
    name: "Bondi Beach",
    address: "Bondi Beach, Sydney, Australia",
    coordinates: {
      latitude: -33.8908,
      longitude: 151.2743
    },
    description: "A popular beach known for its great surf conditions."
  },
  participants: [
    {
      _id: "60d5f9f5f9f5f9f5f9f5f9f6",
      username: "surfer123",
      email: "surfer123@example.com",
      fullName: "John Doe"
    },
    {
      _id: "60d5f9f5f9f5f9f5f9f5f9f7",
      username: "waveRider",
      email: "waveRider@example.com",
      fullName: "Jane Smith"
    }
  ],
  notes: "Bring sunscreen and snacks."
};

// GET endpoint to retrieve the mock surf session
app.get('/session', async (req, res) => {
  // Create a new surf session instance
  const newSession = new SurfSession(mockSurfSession);

  // Save the new session to the database
  await newSession.save();

  res.status(200).send(mockSurfSession);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

