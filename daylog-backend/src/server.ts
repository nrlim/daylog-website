import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import teamRoutes from './routes/teamRoutes';
import activityRoutes from './routes/activityRoutes';
import pokerRoutes from './routes/pokerRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Allowed origins for CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'https://daylog-frontend-jbrys8aom-nrlims-projects.vercel.app',
  'https://daylog-frontend.vercel.app',
  process.env.FRONTEND_URL,
];

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));
app.use(express.json());
app.use(cookieParser());

// Preflight requests
app.options('*', cors());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/poker', pokerRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Daily Activity Team API' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
