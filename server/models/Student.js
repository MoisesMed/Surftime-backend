const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true, unique: true },
    cpf: { type: String, unique: true, sparse: true },
    birthday: { type: Date, required: true },
    observations: { type: String },
    registeredSessions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SurfSession' }],
    profileImageUrl: { type: String }, // URL to the student's profile image
  });

  const StudentSchema = mongoose.model('studentSchema', studentSchema);
  
  module.exports = StudentSchema;