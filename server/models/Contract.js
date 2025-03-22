const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema({
  type: { type: String, required: true, unique: true },
  credits: { type: Number, required: true }, // Number of lessons
  price: { type: Number, required: true }, // Price of the contract
  expirationPeriod: {
    value: { type: Number, required: true }, // Duration value
    unit: { type: String, required: true, enum: ['days', 'weeks', 'months', 'years'] }, // Duration unit
  },
});

module.exports = contractSchema;