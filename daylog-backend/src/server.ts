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

// Simple CORS configuration for Vercel
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5000', 'https://daylog-frontend.vercel.app'],
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// Preflight
app.options('*', cors());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/poker', pokerRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Daily Activity Team API' });
});

// Export for Vercel serverless
export default app;

// Listen for local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

