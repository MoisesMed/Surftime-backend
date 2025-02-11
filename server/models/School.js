const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema({
    name: { type: String, required: true },
    address: { type: String },
    contactEmail: { type: String },
    contactPhone: { type: String },
    professors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Professor' }],
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
    surfSessions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SurfSession' }],
    settings: { type: mongoose.Schema.Types.ObjectId, ref: 'Settings' }, // Reference to Settings
  });

const SchoolSchema = mongoose.model('schoolSchema', schoolSchema);

module.exports = SchoolSchema;