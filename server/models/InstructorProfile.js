const mongoose = require('mongoose');

const instructorProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  lessonsGiven: { type: Number, default: 0 }, // Number of lessons the instructor has given
  futureLessons: { type: Number, default: 0 }, // Number of lessons the instructor is assigned to in the future
});

module.exports = { name: 'InstructorProfile', schema: instructorProfileSchema };
