const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  timeSlot: {
    start: { type: String, required: true },
    end: { type: String, required: true },
  },
  instructors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  studentLimit: { type: Number, required: true },
  location: { type: String, required: true },
  notes: { type: String },
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true }
});

const LessonSchema = mongoose.model('Lesson', lessonSchema);

module.exports = LessonSchema;