import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import connectDB from './config/db';
import deviceRoutes from './routes/deviceRoutes';
import sessionRoutes from './routes/sessionRoutes';
import teamRoutes from './routes/teamRoutes';
import auditLogRoutes from './routes/auditLogRoutes';
import { errorHandler, logger } from '@remote-support/shared-utils';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5002;

// Connect to Database
connectDB();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());

// API Routes configuration
app.use('/api/devices', deviceRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/logs', auditLogRoutes);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy', service: 'api-service' });
});

// Catch-all route handler for 404
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({ status: 'error', message: 'Resource not found' });
});

// Error handling middleware
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`API Service is running on port ${PORT}`);
});
