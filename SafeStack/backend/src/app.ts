import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config/environment';
import { errorHandler } from './middleware/errorHandler';
import loggingMiddleware from './middleware/logging';
import rateLimiter from './middleware/rateLimiter';
import routes from './routes';

const app: Application = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        config.nodeEnv === 'development' ||
        origin === config.frontendUrl ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(loggingMiddleware);

// Rate limiting
app.use('/api/', rateLimiter);

// API routes
app.use('/api/v1', routes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'SafeStack Backend API',
    version: '1.0.0',
    documentation: '/api/v1',
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
