// const bcrypt = require('bcrypt');
// const jwt = require('jsonwebtoken');
// const Student = require('../models/Student');

// const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// exports.loginStudent = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     const student = await Student.findOne({ email });
//     if (!student) {
//       return res.status(400).json({ message: 'Invalid email or password' });
//     }

//     const isMatch = await bcrypt.compare(password, student.password);
//     if (!isMatch) {
//       return res.status(400).json({ message: 'Invalid email or password' });
//     }

//     const token = jwt.sign({ id: student._id }, JWT_SECRET, { expiresIn: '1h' });

//     res.status(200).json({ message: 'Login successful', token });
//   } catch (error) {
//     res.status(500).json({ message: 'Internal server error', error: error.message });
//   }
// };