import mongoose from 'mongoose';
import logger from '../utils/logger';

const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/safestack';

    await mongoose.connect(mongoUri);

    logger.info('✅ MongoDB connected successfully');
    logger.info(`📦 Database: ${mongoose.connection.name}`);

    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

  } catch (error) {
    logger.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

export default connectDatabase;
