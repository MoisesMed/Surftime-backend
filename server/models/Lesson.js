const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  startTime: { type: Date, required: true, index: true },
  endTime: { type: Date, required: true },
  instructors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  studentLimit: { type: Number, required: true },
  location: { type: String, required: true },
  notes: { type: String },
  isActive: { type: Boolean, default: true },
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true }
});

module.exports = { name: 'Lesson', schema: lessonSchema };
