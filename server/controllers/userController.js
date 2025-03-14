const User = require('../models/User');
const School = require('../models/School');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { client, twilioPhoneNumber } = require('../config/twilioConfig');


const JWT_SECRET = process.env.JWT_SECRET;

exports.loginUser = async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;

    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(400).json({ message: 'Cannot find user with this phoneNumber' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    const token = jwt.sign({ id: user._id, role: user.role, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '1h' });

    const { password: _, ...userWithoutPassword } = user.toObject();

    res.status(200).json({
      message: 'Login successful',
      token,
      user: userWithoutPassword,
    });
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
    
    const token = jwt.sign({ id: newUser._id, role: newUser.role, isAdmin: newUser.isAdmin }, JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({ message: 'user registered successfully', token, user: newUser });
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

exports.requestPasswordReset = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    // Validate required fields
    if (!phoneNumber) {
      return res.status(400).json({ message: 'phoneNumber is required' });
    }

    // find user with phone number
    const user = await User.findOne({ phoneNumber });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // generate a reset token
    // const verificationCode = crypto.randomInt(100000, 999999).toString();
    const verificationCode = "123456"
    const resetTokenExpires = Date.now() + 3600000; // 1 hour

    // save the reset token and expiration date to the user
    user.resetToken = verificationCode;
    user.resetTokenExpiration = resetTokenExpires;
    await user.save();

    // Send SMS with Twilio
    // await client.messages.create({
    //   body: `Your password reset code is: ${verificationCode}`,
    //   from: twilioPhoneNumber,
    //   to: `+${user.phoneNumber}`,
    // });

    res.status(200).json({ message: 'Password reset code sent via SMS' });

  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { phoneNumber, verificationCode, newPassword } = req.body;

    // find the user with the reset token and check if it has expired, only use twillo verification code when you want to test the logic.
    const user = await User.findOne({
      phoneNumber,
      resetToken: verificationCode,
      resetTokenExpiration: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification code.' });
    }

    user.password = newPassword;
    user.resetToken = undefined;
    user.resetTokenExpiration = undefined;
    await user.save();

    res.status(200).json({ message: 'Password has been reset' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};