import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

interface Config {
  nodeEnv: string;
  port: number;
  mongodbUri: string;
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  frontendUrl: string;
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  storage: {
    uploadDir: string;
    workingDir: string;
    maxUploadSize: number;
  };
}

const config: Config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/safestack',
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  storage: {
    uploadDir: process.env.UPLOAD_DIR
      ? path.resolve(process.env.UPLOAD_DIR)
      : path.resolve(__dirname, '../../../../storage/uploads'),
    workingDir: process.env.WORKING_DIR
      ? path.resolve(process.env.WORKING_DIR)
      : path.resolve(__dirname, '../../../../storage/working'),
    maxUploadSize: process.env.MAX_UPLOAD_SIZE_MB
      ? parseInt(process.env.MAX_UPLOAD_SIZE_MB, 10) * 1024 * 1024
      : parseInt(process.env.MAX_UPLOAD_SIZE || `${1024 * 1024 * 1024}`, 10),
  },
};

// Ensure storage directories exist
import fs from 'fs';
if (!fs.existsSync(config.storage.uploadDir)) {
  fs.mkdirSync(config.storage.uploadDir, { recursive: true });
}
if (!fs.existsSync(config.storage.workingDir)) {
  fs.mkdirSync(config.storage.workingDir, { recursive: true });
}

export default config;
