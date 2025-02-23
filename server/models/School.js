const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema({
    name: { type: String, required: true },
    address: { type: String },
    contactEmail: { type: String },
    contactPhone: { type: String },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    surfSessions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SurfSession' }],
    settings: { type: mongoose.Schema.Types.ObjectId, ref: 'Settings' }, // Reference to Settings
  });

const SchoolSchema = mongoose.model('School', schoolSchema);

module.exports = SchoolSchema;