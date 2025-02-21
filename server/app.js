require('dotenv').config();

const express = require('express');
const connectToDatabase = require('./db');
const studentRoutes = require('./routes/studentRoutes');
const professorRoutes = require('./routes/professorRoutes');
const validateRoutes = require('./routes/validatePhoneNumberRoutes');

const app = express();
app.use(express.json());

// Connect to MongoDB
connectToDatabase();

// Use routes
app.use('/api/students', studentRoutes);
app.use('/api/professors', professorRoutes);
app.use('/api/validate', validateRoutes);

const PORT = process.env.PORT || 3005;
console.log(`This is my jwt: ${process.env.JWT_SECRET}`);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});