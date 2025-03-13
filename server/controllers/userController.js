const User = require('../models/User');
const School = require('../models/School');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Cannot find user with this email' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    const token = jwt.sign({ id: user._id, role: user.role, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ message: 'Login successful', token });

  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
};

exports.registerUser = async (req, res) => {
  try {
    const newUser = new User(req.body);
    await newUser.save();

    //TODO: this should not be hardcoded
    const school = await School.findOne({ name: 'Dos Anjos Surf School' });

    if (school) {
      // Add the user to the surf school
      await School.findByIdAndUpdate(school._id, { $push: { users: newUser._id } });
    }
    
    res.status(201).json({ message: 'user registered successfully', user: newUser });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};

exports.validateEmail = async (req, res) => {
  try {
    const { email } = req.query;

    // Validate required fields
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if the email is already in use
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(200).json({ isAvailable: false, message: 'Email is already in use' });
    } else {
      return res.status(200).json({ isAvailable: true });
    }
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};