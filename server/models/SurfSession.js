const mongoose = require('mongoose');

const surfSessionSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array of ObjectIds
    notes: String,
    createdAt: { type: Date, default: Date.now }
  });

const SurfSession = mongoose.model('SurfSession', surfSessionSchema);

module.exports = SurfSession;