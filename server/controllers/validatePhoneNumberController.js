const { buildPhoneCandidates, findUserByPhone } = require('../utils/phoneNumber');

exports.validatePhoneNumber = async (req, res) => {
  try {
    const { User } = req.models;
    const { phoneNumber } = req.query;

    if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    const phoneCandidates = buildPhoneCandidates(phoneNumber);
    if (phoneCandidates.length === 0) {
      return res.status(400).json({ message: 'Invalid phone number' });
    }
    const user = await findUserByPhone(User, phoneNumber);

    if (user) {
      return res.status(200).json({ exists: true, message: 'Phone number already exists' });
    } else {
      return res.status(200).json({ exists: false, message: 'Phone number is available' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
