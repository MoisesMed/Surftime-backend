const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  themeColor: { type: String, default: '#FFFFFF' },
  logoUrl: { type: String },
  iconSet: { type: String },
  customCSS: { type: String },
  // Add more customization fields as needed
});

const SettingsSchema = mongoose.model('Settings', settingsSchema);

module.exports = SettingsSchema;