const mongoose = require('mongoose');

const surfSessionSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  timeSlot: {
    start: { type: String, required: true },
    end: { type: String, required: true },
  },
  professor: { type: mongoose.Schema.Types.ObjectId, ref: 'Professor', required: true },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
  studentLimit: { type: Number, required: true },
  location: { type: String, required: true },
  notes: { type: String },
});

const SurfSession = mongoose.model('SurfSession', surfSessionSchema);

module.exports = SurfSession;