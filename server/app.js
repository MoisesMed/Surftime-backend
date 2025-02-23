require('dotenv').config();

const express = require('express');
const connectToDatabase = require('./db');
const userRoutes = require('./routes/userRoutes');
const validateRoutes = require('./routes/validatePhoneNumberRoutes');
const validateHttps = require('./middleware/validateHttps'); 
const context = require('./middleware/context');

const app = express();
app.use(express.json());

// if (process.env.NODE_ENV === 'production') {
//   app.use(validateHttps);
//   app.use(context)
// }

// Connect to MongoDB
connectToDatabase();

// Use routes
app.use('/api/users', userRoutes);
app.use('/api/validate', validateRoutes);

const PORT = process.env.PORT || 3005;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});