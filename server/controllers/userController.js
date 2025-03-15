const User = require('../models/User');
const mongoose = require('mongoose');
const StudentProfile = require('../models/StudentProfile');
const School = require('../models/School');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { client, twilioPhoneNumber } = require('../config/twilioConfig');
const messages = require('../resources/messages');

const JWT_SECRET = process.env.JWT_SECRET;

exports.loginUser = async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;

    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(400).json({ message: messages.pt.phoneNumberNotFound });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: messages.pt.invalidPassword });
    }

    const token = jwt.sign({ id: user._id, role: user.role, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '1h' });

    const { password: _, ...userWithoutPassword } = user.toObject();

    res.status(200).json({
      message: messages.pt.loginSuccess,
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    res.status(500).json({ message: messages.pt.loginError,  error: error.message });
  }
};

exports.registerUser = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { fullName, email, cpf, birthday, phoneNumber, password } = req.body;

    // Validate required fields
    if (!fullName || !email || !phoneNumber || !password || !cpf || !birthday) {
      return res.status(400).json({ message: messages.pt.allFieldsRequired });
    }

    // Check if a user with the same email or phone number already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { cpf }, { phoneNumber }],
    });

    if (existingUser) {
      return res.status(400).json({ message: messages.pt.userExists });
    }

    // Create a new user
    const newUser = new User({
      fullName,
      email,
      phoneNumber,
      cpf,
      birthday,
      password
    });

    await newUser.save({ session });

    // if the user is a student, save StudentProfile
    if (newUser.role === 'student') {
      const studentProfile = new StudentProfile({ user: newUser._id });
      await studentProfile.save({ session });
    }

    // Find the school and add the user to it
    const school = await School.findOne({ name: 'Dos Anjos Surf School' }).session(session);
    if (school) {
      await School.findByIdAndUpdate(school._id, { $push: { users: newUser._id } }, { session });
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();
    
    const token = jwt.sign({ id: newUser._id, role: newUser.role, isAdmin: newUser.isAdmin }, JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({ message: messages.pt.registrationSuccess, token, user: newUser });
  } catch (error) {
    // Abort the transaction in case of error
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: messages.pt.registrationError, error: error.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: messages.pt.fetchUsersError,  error: error.message });
  }
};

exports.validateEmail = async (req, res) => {
  try {
    const { email } = req.query;

    // Validate required fields
    if (!email) {
      return res.status(400).json({ message: messages.pt.emailRequired,  error: error.message });
    }

    // Check if the email is already in use
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(200).json({ isAvailable: false, message: messages.pt.emailInUse });
    } else {
      return res.status(200).json({ isAvailable: true });
    }
  } catch (error) {
    res.status(500).json({ message: messages.pt.internalServerError,  error: error.message });
  }
};

exports.requestPasswordReset = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    // Validate required fields
    if (!phoneNumber) {
      return res.status(400).json({ message: messages.pt.phoneNumberRequired,  error: error.message });
    }

    // find user with phone number
    const user = await User.findOne({ phoneNumber });

    if (!user) {
      return res.status(404).json({ message: messages.pt.userNotFound,  error: error.message });
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

    res.status(200).json({ message: messages.pt.passwordResetCode });

  } catch (error) {
    res.status(500).json({ message: messages.pt.internalServerError,  error: error.message });
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
      return res.status(400).json({ message: messages.pt.verificationCodeInvalid,  error: error.message });
    }

    user.password = newPassword;
    user.resetToken = undefined;
    user.resetTokenExpiration = undefined;
    await user.save();

    res.status(200).json({ message: messages.pt.passwordResetSuccess });
  } catch (error) {
    res.status(500).json({ message: messages.pt.internalServerError,  error: error.message });
  }
};