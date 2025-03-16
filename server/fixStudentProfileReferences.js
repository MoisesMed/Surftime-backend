const mongoose = require('mongoose');
const User = require('./models/User');
const School = require('./models/School');

// Connect to MongoDB
const uri = 'mongodb+srv://leo:swqhfumAbTIbNDJ2@surftimeapp.c261d.mongodb.net/surftimeapp_dosanjossurfschool?retryWrites=true&w=majority&appName=surftimeapp';

mongoose.connect(uri)
.then(() => console.log('Connected to MongoDB'))
.catch((error) => console.error('Error connecting to MongoDB:', error));

async function fixSomethingInDatabase() {
  try {
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