const Student = require('../models/Student');

exports.validatePhoneNumber = async (req, res) => {
  try {
    const { phoneNumber } = req.query;

    if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    const student = await Student.findOne({ phoneNumber });

    if (student) {
      return res.status(200).json({ exists: true, message: 'Phone number already exists' });
    } else {
      return res.status(200).json({ exists: false, message: 'Phone number is available' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};