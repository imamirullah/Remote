import mongoose from 'mongoose';
import { logger } from '@remote-support/shared-utils';

export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/remote-support';
    await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 2000 });
    logger.info('MongoDB connected successfully (API service)');
  } catch (error) {
    logger.warn(`MongoDB connection failed (API service): ${error}. Running in Database-Less (In-Memory Fallback) mode.`);
  }
};
export default connectDB;
