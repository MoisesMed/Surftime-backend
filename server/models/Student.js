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
    password: { type: String, required: true }
  });

  studentSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
      return next();
    }
  
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      next();
    } catch (error) {
      next(error);
    }
  });

  const StudentSchema = mongoose.model('studentSchema', studentSchema);
  
  module.exports = StudentSchema;