const mongoose = require('mongoose');

let isConnected;

// Static MongoDB URI for development or testing
const staticMongoDBURI = 'mongodb+srv://leo:swqhfumAbTIbNDJ2@surftimeapp.c261d.mongodb.net/surftimeapp_dosanjossurfschool?retryWrites=true&w=majority&appName=surftimeapp';
async function connectToDatabase() {
  if (isConnected) {
    console.log('Using existing database connection');
    return;
  }

  try {
    // Use the environment variable if available, otherwise use the static URI
    const mongoDBURI = process.env.MONGODB_URI || staticMongoDBURI;
    await mongoose.connect(mongoDBURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    isConnected = mongoose.connection.readyState;
    console.log('Connected to MongoDB Atlas');
  } catch (error) {
    console.error('Error connecting to MongoDB Atlas:', error);
    throw error;
  }
}

module.exports = connectToDatabase;