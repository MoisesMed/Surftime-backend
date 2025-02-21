const Student = require('../models/Student');

exports.registerStudent = async (req, res) => {
  try {
    const { fullName, email, phoneNumber, cpf, birthday, observations, profileImageUrl } = req.body;

    // Validate required fields
    if (!fullName || !email || !phoneNumber || !birthday) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Create a new student
    const newStudent = new Student({
      fullName,
      email,
      phoneNumber,
      cpf,
      birthday: new Date(birthday),
      observations,
      profileImageUrl,
    });

    // Save the student to the database
    await newStudent.save();
    res.status(201).json({ message: 'Student registered successfully', student: newStudent });
  } catch (error) {
    if (error.code === 11000) {
      // Handle duplicate key error (e.g., email or phone number already exists)
      return res.status(400).json({ message: 'Email or phone number already exists' });
    }
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};