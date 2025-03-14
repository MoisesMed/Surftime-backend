require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectToDatabase = require('./db');
const userRoutes = require('./routes/userRoutes');
const validateRoutes = require('./routes/validatePhoneNumberRoutes');
const schoolRoutes = require('./routes/schoolRoutes');
const lessonRoutes = require('./routes/lessonRoutes');
const validateHttps = require('./middleware/validateHttps');
const context = require('./middleware/context');
const helmet = require('helmet')

const app = express();
app.use(express.json());
app.use(helmet());
// app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
  }
}));
app.disable('x-powered-by');

// if (process.env.NODE_ENV === 'production') {
//   app.use(validateHttps);
//   app.use(context);
// }

const allowedOrigins = [
  'http://localhost:5173', // Development origin
  'https://surftime-frontend.onrender.com', // Production origin
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed HTTP methods
  credentials: true, // Allow credentials (e.g., cookies, authorization headers)
}));

// Connect to MongoDB
connectToDatabase();

// Use routes
app.use('/api/users', userRoutes);
app.use('/api/validate', validateRoutes);
app.use('/api/school', schoolRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/', (req, res)=> {
  res.send('Hello, welcome to the surftime API!');
});

const PORT = process.env.PORT || 3005;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});