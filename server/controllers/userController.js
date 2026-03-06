const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const cloudinary = require('../config/cloudinaryConfig');
const messages = require('../resources/messages');
const getSchoolObject = require('../utils/getSchoolObject');

const JWT_SECRET = process.env.JWT_SECRET;

exports.loginUser = async (req, res) => {
  try {
    const { User } = req.models;
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
  const { User, StudentProfile, School } = req.models;
  const session = await User.db.startSession();
  session.startTransaction();

  try {
    const { fullName, email, cpf, birthday, phoneNumber, password } = req.body;

    // Validate required fields
    if (!fullName || !email || !phoneNumber || !password || !birthday) {
      return res.status(400).json({ message: messages.pt.allFieldsRequired });
    }

    // Check if a user with the same email or phone number already exists
    const existingUser = await User.findOne({
      $or: [
        { email },
        ...(cpf ? [{ cpf }] : []),
        { phoneNumber },
      ],
    });

    if (existingUser) {
      return res.status(400).json({ message: messages.pt.userExists });
    }

    // Create a new user
    const newUser = new User({
      fullName,
      email,
      phoneNumber,
      ...(cpf ? { cpf } : {}),
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
    const { User } = req.models;
    const users = await User.find().populate('studentProfile');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: messages.pt.fetchUsersError,  error: error.message });
  }
};

exports.validateEmail = async (req, res) => {
  try {
    const { User } = req.models;
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
    const { User } = req.models;
    const { phoneNumber, birthday } = req.body;

    // Validate required fields
    if (!phoneNumber) {
      return res.status(400).json({ message: 'Número de telefone obrigatório.' });
    }

    const user = await User.findOne({ phoneNumber });

    if (!user) {
      return res.status(404).json({ message: messages.pt.phoneNumberNotFound });
    }

    if (!birthday) {
      return res.status(400).json({ message: 'Data de nascimento obrigatória.' });
    }

    const incomingBirthday = new Date(birthday);
    if (Number.isNaN(incomingBirthday.getTime())) {
      return res.status(400).json({ message: 'Data de nascimento inválida.' });
    }

    const userBirthday = new Date(user.birthday);
    const sameDate =
      userBirthday.getUTCFullYear() === incomingBirthday.getUTCFullYear() &&
      userBirthday.getUTCMonth() === incomingBirthday.getUTCMonth() &&
      userBirthday.getUTCDate() === incomingBirthday.getUTCDate();

    if (!sameDate) {
      return res.status(400).json({ message: 'Data de nascimento não confere.' });
    }

    user.password = 'suasenha';
    await user.save();

    res.status(200).json({
      message: 'Senha redefinida para suasenha. Faça login e altere em seguida.',
    });
  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    res.status(500).json({ message: messages.pt.internalServerError });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { User } = req.models;
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
    const { User, Lesson } = req.models;
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
    const { User, Lesson } = req.models;
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


exports.updateAuthenticatedUserData = async (req, res) => {
  try {
    const { User } = req.models;
    const userId = req.user.id;
    const { fullName, email, birthday, cpf } = req.body;

    const user = await User.findById(userId).populate('studentProfile');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (typeof fullName === 'string') user.fullName = fullName.trim();
    if (typeof email === 'string') user.email = email.trim();
    if (birthday !== undefined) user.birthday = birthday || null;

    if (cpf !== undefined) {
      if (cpf === null || cpf === '' || String(cpf).toLowerCase() === 'null') {
        user.cpf = undefined;
      } else {
        user.cpf = String(cpf).replace(/\D/g, '');
      }
    }

    if (req.file) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        public_id: `user_${userId}_profile`,
        transformation: { width: 256, height: 256, crop: 'fill', gravity: 'face' },
      });
      user.profileImageUrl = uploadResult.secure_url;
    }

    await user.save();

    const userObject = user.toObject();
    delete userObject.password;

    return res.status(200).json({
      message: 'Perfil atualizado com sucesso',
      user: userObject,
    });
  } catch (error) {
    console.error('Error updating authenticated user:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
// Change authenticated user password
exports.changeAuthenticatedUserPassword = async (req, res) => {
  try {
    const { User } = req.models;
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Senha atual e nova senha são obrigatórias' });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({ message: 'A nova senha deve ter ao menos 8 caracteres' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'A nova senha deve ser diferente da senha atual' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      String(currentPassword),
      user.password
    );

    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Senha atual inválida' });
    }

    user.password = String(newPassword);
    await user.save();

    return res.status(200).json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Error changing authenticated user password:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Edit user information (admin-only)
exports.editUserInfo = async (req, res) => {
  try {
    const { User, StudentProfile } = req.models;
    const { userId } = req.params;
    const {
      fullName,
      email,
      phoneNumber,
      cpf,
      birthday,
      role,
      isAdmin,
      status,
      totalCredits,
    } = req.body;

    // Find the user by ID
    const user = await User.findById(userId).populate('studentProfile');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update basic user fields
    if (typeof fullName === 'string') user.fullName = fullName.trim();
    if (typeof email === 'string') user.email = email.trim();
    if (typeof phoneNumber === 'string') user.phoneNumber = phoneNumber.trim();
    if (birthday) user.birthday = birthday;
    if (cpf === null || cpf === '') {
      user.cpf = undefined;
    } else if (typeof cpf === 'string') {
      user.cpf = cpf.trim();
    }

    // Update role flags
    if (role) user.role = role;
    if (typeof isAdmin === 'boolean') user.isAdmin = isAdmin;

    // Ensure student profile exists for student users
    if (user.role === 'student' && !user.studentProfile) {
      const createdProfile = new StudentProfile({ user: user._id });
      await createdProfile.save();
      user.studentProfile = createdProfile._id;
      await user.populate('studentProfile');
    }

    // Update student profile fields
    if (user.studentProfile) {
      if (status) user.studentProfile.status = status;
      if (totalCredits !== undefined) {
        const parsedCredits = Number(totalCredits);
        const nextCredits = Number.isNaN(parsedCredits)
          ? user.studentProfile.totalCredits
          : Math.max(0, Math.floor(parsedCredits));
        user.studentProfile.totalCredits = nextCredits;
        if (user.studentProfile.usedCredits > nextCredits) {
          user.studentProfile.usedCredits = nextCredits;
        }
      }
      await user.studentProfile.save();
    } else if (totalCredits !== undefined) {
      return res.status(400).json({
        message: 'Este usuário não possui perfil de aluno para receber créditos.',
      });
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
    const { User } = req.models;
    const { userId } = req.params;
    const { contractType } = req.body; // Get contract type from request body

    // Find the user by ID and populate the studentProfile
    const user = await User.findById(userId).populate('studentProfile');
    if (!user || !user.studentProfile) {
      return res.status(404).json({ message: 'User or student profile not found' });
    }

    const school = await getSchoolObject(req.models);

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

exports.getActiveNonExperimentalContracts = async (req, res) => {
  try {
    const { StudentProfile } = req.models;
    // Query for active student profiles with a contract that is not "experimental"
    const studentProfiles = await StudentProfile.find({
      status: 'active',
      contract: { $exists: true },
    }).populate('user'); // Populate the user field to get user details

    const school = await getSchoolObject(req.models);

    // Filter out students with the "experimental" contract
    const studentsData = studentProfiles
      .map(profile => {
        const contract = school.settings.contracts.find(c => c._id.equals(profile.contract));
        if (contract && contract.type !== 'experimental') {
          return {
            userId: profile.user._id,
            fullName: profile.user.fullName,
            email: profile.user.email,
            contractType: contract.type,
            totalCredits: profile.totalCredits,
            usedCredits: profile.usedCredits,
            contractExpiration: profile.contractExpiration,
          };
        }
        return null;
      })
      .filter(data => data !== null);
        
    res.status(200).json({ students: studentsData });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.countActiveNonExperimentalContracts = async (req, res) => {
  try {
    const { StudentProfile } = req.models;
    const school = await getSchoolObject(req.models);

    // Get the IDs of non-experimental contracts
    const nonExperimentalContractIds = school.settings.contracts
      .filter(contract => contract.type !== 'experimental')
      .map(contract => contract._id);

    // Count active student profiles with a non-experimental contract
    const count = await StudentProfile.countDocuments({
      status: 'active',
      contract: { $in: nonExperimentalContractIds },
    });

    res.status(200).json({ activeNonExperimentalContractsCount: count });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};




