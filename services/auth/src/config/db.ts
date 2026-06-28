import mongoose from 'mongoose';
import { logger } from '@remote-support/shared-utils';

export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/remote-support';
    await mongoose.connect(mongoURI);
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.warn(`MongoDB connection failed: ${error}. Running in Database-Less (In-Memory Fallback) mode.`);
  }
};
export default connectDB;
