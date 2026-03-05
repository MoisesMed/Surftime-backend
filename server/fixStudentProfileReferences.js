const mongoose = require('mongoose');
const { getModels } = require('./models');

// Connect to MongoDB
const uri = process.env.MONGODB_BASE_URI || process.env.MONGODB_URI;
if (!uri) {
  throw new Error('Missing MongoDB connection string in MONGODB_BASE_URI or MONGODB_URI');
}

mongoose.connect(uri)
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('Error connecting to MongoDB:', error));

async function fixSomethingInDatabase() {
  try {
    const { User, School } = getModels(mongoose.connection);

    // Find the school by name or other criteria
    const school = await School.findOne({ name: 'Dos Anjos Surf School' });
    if (!school) {
      console.error('School not found');
      return;
    }

    const usersToAssociate = await User.find();

    // Update the school's users array with the user IDs
    school.users = usersToAssociate.map(user => user._id);
    await school.save();

    console.log(`Updated school ${school._id} with users:`, school.users);
  } catch (error) {
    console.error('Error updating school with users:', error);
  } finally {
    // Close the database connection
    mongoose.connection.close();
  }
}

fixSomethingInDatabase();
