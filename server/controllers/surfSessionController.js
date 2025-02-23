const SurfSession = require('../models/SurfSession');
const SurfSchool = require('../models/SurfSchool');

exports.createSurfSession = async (req, res) => {
  try {
    const { date, timeSlot, studentLimit, location, notes, professorId, surfSchoolId } = req.body;
    const userId = req.user.id;

    // Check if the user is an admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    // Validate required fields
    if (!date || !timeSlot || !studentLimit || !location || !professorId || !surfSchoolId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Create a new surf session
    const newSurfSession = new SurfSession({
      date: new Date(date),
      timeSlot,
      professor: professorId,
      studentLimit,
      location,
      notes,
      surfSchool: surfSchoolId,
    });

    // Save the surf session to the database
    await newSurfSession.save();

    // Add the session to the surf school
    await SurfSchool.findByIdAndUpdate(surfSchoolId, { $push: { surfSessions: newSurfSession._id } });

    res.status(201).json({ message: 'Surf session created successfully', surfSession: newSurfSession });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};