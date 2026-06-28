import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import connectDB from './config/db';
import authRoutes from './routes/authRoutes';
import { errorHandler, logger } from '@remote-support/shared-utils';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Connect to Database
connectDB();

// Security and utility middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173', // default dashboard port
    credentials: true,
  })
);
app.use(express.json());

// Custom lightweight cookie parser middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const list: Record<string, string> = {};
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    cookieHeader.split(';').forEach((cookie) => {
      const parts = cookie.split('=');
      const name = parts.shift()?.trim();
      const value = parts.join('=');
      if (name) {
        list[name] = decodeURIComponent(value);
      }
    });
  }
  req.cookies = list;
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy', service: 'auth-service' });
});

// Router configuration
app.use('/api/auth', authRoutes);

// Catch-all route handler for 404
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({ status: 'error', message: 'Resource not found' });
});

// Error handling middleware
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Auth Service is running on port ${PORT}`);
});
