const mongoose = require('mongoose');

// Replace 'your_database_url' with your actual MongoDB connection string
const dbURI = 'mongodb://localhost:27017/your_database_name';

mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));