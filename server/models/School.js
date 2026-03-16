const mongoose = require('mongoose');
const contractSchema = require('./Contract'); // Import the contract schema

const settingsSchema = new mongoose.Schema({
  themeColor: { type: String, default: '#FFFFFF' },
  logoUrls: [{ type: String }],
  iconSet: { type: String },
  customCSS: { type: String },
  lessonDuration: { type: Number, default: 60 }, // in minutes
  timeZone: { type: String, default: 'America/Sao_Paulo' }, // Default time zone for UTC-3
  language: { type: String, default: 'pt' }, // Default language
  currency: { type: String, default: 'BRL' }, // Default currency
  cancellationPolicy: { type: Number, default: 12 }, // In hours
  bookingWindow: { type: Number, default: 8 }, // Hours before a lesson that a user can book
  numberOfStudentsPerLesson: { type: Number, default: 2 }, // Default number of students per class
  templateTimes: [
    {
      _id: false,
      startTime: { type: Date, required: true },
      endTime: { type: Date, required: true },
    },
  ],
  templateInstructorIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  contracts: [contractSchema], // Array of embedded contract schemas
});

const schoolSchema = new mongoose.Schema({
    name: { type: String, required: true },
    address: { type: String },
    contactEmail: { type: String },
    contactPhone: { type: String },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    lessons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }],
    settings: { type: settingsSchema, default: () => ({}) }, // Initialize with default values
    aboutUs: { type: String }
  }, { collection: 'school' });

module.exports = { name: 'School', schema: schoolSchema };
