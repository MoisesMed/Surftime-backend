const mongoose = require('mongoose');

const studentProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  lessonsBooked: { type: Number, default: 0 },
  lessonsRemaining: { type: Number, default: 0 },
  contractType: { type: String, enum: ['12 lessons', 'experimental', '15 lessons'], default: 'experimental' },
  contractExpiration: { type: Date },
});

module.exports = mongoose.model('StudentProfile', studentProfileSchema);