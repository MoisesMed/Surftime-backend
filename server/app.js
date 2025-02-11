const cors = require('cors');
const express = require('express');
const SurfSession = require('./models/SurfSession'); // Adjust the path as necessary
require('./db'); // Ensure the database connection is established

const app = express();
app.use(cors());
app.use(express.json());

const registerRoute = require('./api/register');
const loginRoute = require('./api/login');
const validatePhoneNumberRoute = require('./api/validatePhoneNumber');

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

    const session = await SurfSession.findById(sessionId);

    if (!session) {
      return res.status(404).send({ message: 'Surf session not found.' });
    }

    res.status(200).send(session);
  } catch (error) {
    res.status(500).send({ message: 'Error retrieving surf session', error });
  }
});

// GET endpoint to save a mock surf session
app.post('/session', async (req, res) => {
  try {
    // Create a new surf session instance
    const newSession = new SurfSession(mockSurfSession);

    // Save the new session to the database
    const result = await newSession.save();

    res.status(201).send(`Document inserted with _id: ${result._id}`);
  } catch (error) {
    res.status(500).send('Error inserting document');
  }
});

app.use('/students', registerRoute);
// app.use('/students', loginRoute);
app.use('/students', validatePhoneNumberRoute);


// Start the server
// const PORT = process.env.PORT || 5005;
// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });

// Update
// app.put('/documents/:id', async (req, res) => {
//   try {
//     const result = await Document.findByIdAndUpdate(req.params.id, req.body, { new: true });
//     res.status(200).send(`Document updated: ${result}`);
//   } catch (error) {
//     res.status(500).send('Error updating document');
//   }
// });

// Delete
// app.delete('/documents/:id', async (req, res) => {
//   try {
//     const result = await Document.findByIdAndDelete(req.params.id);
//     res.status(200).send(`Document deleted: ${result}`);
//   } catch (error) {
//     res.status(500).send('Error deleting document');
//   }
// });