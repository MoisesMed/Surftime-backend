const mongoose = require('mongoose');

const professorSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true, unique: true },
    isAdmin: { type: Boolean, default: false },
    profileImageUrl: { type: String }, // URL to the professor's profile image
  });

const ProfessorSchema = mongoose.model('professorSchema', professorSchema);

module.exports = ProfessorSchema;