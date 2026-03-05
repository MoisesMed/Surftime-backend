const mongoose = require('mongoose');

let isConnected;

const defaultDbName = process.env.MONGODB_DEFAULT_DB || 'dosanjos';
async function connectToDatabase() {
  if (isConnected) {
    console.log('Using existing database connection');
    return;
  }

  try {
    // Use the environment variables only (no hardcoded credentials)
    const mongoDBURI =
      process.env.MONGODB_BASE_URI || process.env.MONGODB_URI;
    if (!mongoDBURI) {
      throw new Error('Missing MongoDB connection string in MONGODB_BASE_URI or MONGODB_URI');
    }
    await mongoose.connect(mongoDBURI, { dbName: defaultDbName });
    isConnected = mongoose.connection.readyState;
    console.log('Connected to MongoDB Atlas');
  } catch (error) {
    console.error('Error connecting to MongoDB Atlas:', error);
    throw error;
  }
}

module.exports = connectToDatabase;
