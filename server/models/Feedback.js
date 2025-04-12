const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
  rating: { type: Number, min: 1, max: 5, required: true }, // Rating from 1 to 5
  comment: { type: String }, // Optional comment
  anonymous: { type: Boolean, default: true }, // Indicates if the feedback is anonymous
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: function() { return !this.anonymous; } }, // Reference to the user if not anonymous
  createdAt: { type: Date, default: Date.now }, // Timestamp for when the feedback was created
});

module.exports = mongoose.model('Feedback', feedbackSchema);