const mongoose = require('mongoose');

const schoolRegistrySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    subdomain: { type: String, required: true, unique: true },
    logoUrl: { type: String },
  },
  { timestamps: true }
);

module.exports = { name: 'SchoolRegistry', schema: schoolRegistrySchema };
