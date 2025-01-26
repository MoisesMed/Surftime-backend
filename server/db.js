const mongoose = require('mongoose');

// Replace 'your_database_url' with your actual MongoDB connection string
const dbURI = 'mongodb+srv://leo:swqhfumAbTIbNDJ2@surftimeapp.c261d.mongodb.net/?retryWrites=true&w=majority&appName=surftimeapp';

mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));