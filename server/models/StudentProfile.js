const mongoose = require('mongoose');

const studentProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  totalCredits: { type: Number, default: 0 }, // Total number of credits purchased
  usedCredits: { type: Number, default: 0 }, // Number of credits used
  contract: { type: mongoose.Schema.Types.ObjectId }, // Reference to the assigned Contract within the school
  contractExpiration: { type: Date }, // Expiration date of the assigned Contract
  lessonHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }], 
});

module.exports = mongoose.model('StudentProfile', studentProfileSchema);