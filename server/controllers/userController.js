const User = require('../models/User');
const mongoose = require('mongoose');
const StudentProfile = require('../models/StudentProfile');
const School = require('../models/School');
const Lesson = require('../models/Lesson');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const moment = require('moment-timezone');
const { client, twilioPhoneNumber } = require('../config/twilioConfig');
const messages = require('../resources/messages');
const getSchoolObject = require('../utils/getSchoolObject');

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

    const token = jwt.sign({ id: user._id, role: user.role, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '7d' });

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

      // Update the user with the studentProfile reference
      newUser.studentProfile = studentProfile._id;
      await newUser.save({ session });
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
}

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().populate('studentProfile');
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

// Get student lesson history
exports.getStudentLessonHistory = async (req, res) => {
  try {
    const studentId = req.user.id; // Get the student ID from the authenticated user

    // Retrieve the user's profile with the studentProfile populated
    const user = await User.findById(studentId).populate('studentProfile');

    if (!user.studentProfile) {
      return res.status(400).json({ message: 'Student profile not found' });
    }

    // Retrieve the lessons from the student's lesson history
    const lessons = await Lesson.find({
      _id: { $in: user.studentProfile.lessonHistory },
    }).populate('instructors students');

    res.status(200).json({ lessons });
  } catch (error) {
    console.error('Error retrieving lesson history:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Get authenticated user data
exports.getAuthenticatedUserData = async (req, res) => {
  try {
    const userId = req.user.id; // Get the user ID from the authenticated user

    // Find the user and populate related fields
    const user = await User.findById(userId).populate('studentProfile');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find lessons where the authenticated user is booked
    const lessons = await Lesson.find({
      students: userId,
    });

    res.status(200).json({ user, lessons });
  } catch (error) {
    console.error('Error retrieving user data:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Edit user information (admin-only)
exports.editUserInfo = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, isAdmin, status } = req.body;

    // Find the user by ID
    const user = await User.findById(userId).populate('studentProfile');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user fields
    if (role) user.role = role;
    if (typeof isAdmin === 'boolean') user.isAdmin = isAdmin;

    // Update student profile fields if the user is a student
    if (user.studentProfile) {
      if (status) user.studentProfile.status = status;
      await user.studentProfile.save();
    }

    // Save the updated user
    await user.save();

    res.status(200).json({ message: 'User information updated successfully', user });
  } catch (error) {
    console.error('Error updating user information:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Assign a contract to a student (admin-only)
exports.assignContractToStudent = async (req, res) => {
  try {
    const { userId } = req.params;
    const { contractType } = req.body; // Get contract type from request body

    // Find the user by ID and populate the studentProfile
    const user = await User.findById(userId).populate('studentProfile');
    if (!user || !user.studentProfile) {
      return res.status(404).json({ message: 'User or student profile not found' });
    }

    const school = await getSchoolObject();

    // Find the contract within the school's settings
    const contract = school.settings.contracts.find(c => c.type === contractType);
    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }

    // Calculate the contract expiration date
    const contractExpiration = moment().add(contract.expirationPeriod.value, contract.expirationPeriod.unit).toDate();

    // Update the student's profile with the new contract information
    user.studentProfile.contract = contract._id;
    user.studentProfile.totalCredits = contract.credits;
    user.studentProfile.usedCredits = 0; // Reset used credits
    user.studentProfile.contractExpiration = contractExpiration;
    await user.studentProfile.save();

    res.status(200).json({ message: 'Contract assigned successfully', studentProfile: user.studentProfile });
  } catch (error) {
    console.error('Error assigning contract:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};