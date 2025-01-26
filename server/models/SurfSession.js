const mongoose = require('mongoose');

const surfSessionSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  location: { type: String, required: true },
  participants: { type: Number, required: true },
  notes: String
});

const SurfSession = mongoose.model('SurfSession', surfSessionSchema);

module.exports = SurfSession;