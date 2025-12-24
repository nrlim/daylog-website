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

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

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
