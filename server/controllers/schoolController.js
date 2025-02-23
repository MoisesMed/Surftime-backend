const School = require('../models/School');
const User = require('../models/User');

exports.createSchool = async (req, res) => {
  try {
    const { name, address, contactEmail, contactPhone } = req.body;

    if (!name) {
        return res.status(400).json({ status: 'fail', message: 'School must have a name' });
    }

    const school = new School({
      name,
      address,
      contactEmail,
      contactPhone,
    });
    await school.save();

    res.status(201).json({ message: 'Surf school created successfully', School: school });

  } catch (err) {
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

exports.getSchoolUsers = async (req, res) => {
  try {
    const { schoolId } = req.params;

    const school = await School.findById(schoolId).populate('users');

    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }

    res.status(200).json({ users: school.users });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};