const Student = require('../models/Student');

exports.registerStudent = async (req, res) => {
  try {
    const { fullName, email, phoneNumber, cpf, birthday, observations, profileImageUrl, password } = req.body;

    if (!fullName || !email || !phoneNumber || !birthday || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const newStudent = new Student({
      fullName,
      email,
      phoneNumber,
      cpf,
      birthday: new Date(birthday),
      observations,
      profileImageUrl,
      password,
    });

    await newStudent.save();
    res.status(201).json({ message: 'Student registered successfully', student: newStudent });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email or phone number already exists' });
    }
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};