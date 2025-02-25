require('dotenv').config();

const express = require('express');
const connectToDatabase = require('./db');
const userRoutes = require('./routes/userRoutes');
const validateRoutes = require('./routes/validatePhoneNumberRoutes');
const schoolRoutes = require('./routes/schoolRoutes');
const lessonRoutes = require('./routes/lessonRoutes');
const swaggerUi = require('swagger-ui-express');
const swaggerDocs = require('./swaggerConfiguration');
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

//Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Use routes
app.use('/api/users', userRoutes);
app.use('/api/validate', validateRoutes);
app.use('/api/school', schoolRoutes);
app.use('/api/lesson', lessonRoutes);
app.use('/', (req, res)=> {
  res.send('Hello, welcome to the surftime API!');
});

const PORT = process.env.PORT || 3005;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});