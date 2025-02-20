const express = require('express');
const connectToDatabase = require('./db');
const studentRoutes = require('./routes/studentRoutes');
const professorRoutes = require('./routes/professorRoutes');

const app = express();
app.use(express.json());

// Connect to MongoDB
connectToDatabase();

// Use routes
app.use('/api/students', studentRoutes);
app.use('/api/professors', professorRoutes);

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});