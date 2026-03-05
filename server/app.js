require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const connectToDatabase = require('./db');
const userRoutes = require('./routes/userRoutes');
const validateRoutes = require('./routes/validatePhoneNumberRoutes');
const schoolRoutes = require('./routes/schoolRoutes');
const lessonRoutes = require('./routes/lessonRoutes');
const instructorRoutes = require('./routes/instructorRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const schoolsCatalogRoutes = require('./routes/schoolsCatalogRoutes');
const adminRoutes = require('./routes/adminRoutes');
const validateHttps = require('./middleware/validateHttps');
const context = require('./middleware/context');
const tenantContext = require('./middleware/tenantContext');
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
app.use('/static', express.static(path.join(__dirname, 'public')));

// if (process.env.NODE_ENV === 'production') {
//   app.use(validateHttps);
//   app.use(context);
// }

const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ||
  'http://localhost:5173,https://surftime-frontend.onrender.com,https://surf-time.vercel.app'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    const isLocalhostSubdomain =
      /^https?:\/\/[a-z0-9-]+\.localhost(:\d+)?$/i.test(origin);
    const isVercelPreview =
      /^https:\/\/(surf-time|surftime-frontend)(-[a-z0-9-]+)?\.vercel\.app$/i.test(origin);
    if (allowedOrigins.includes(origin) || isLocalhostSubdomain || isVercelPreview) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Provision-Key', 'X-Tenant'],
  credentials: true, // Allow credentials (e.g., cookies, authorization headers)
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(tenantContext);

// Connect to MongoDB
connectToDatabase();

// Use routes
app.use('/api/users', userRoutes);
app.use('/api/validate', validateRoutes);
app.use('/api/school', schoolRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/instructor', instructorRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/schools', schoolsCatalogRoutes);
app.use('/api/admin', adminRoutes);
app.use('/', (req, res) => {
  res.send('Hello, welcome to the surftime API!');
});

const PORT = process.env.PORT || 3005;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
