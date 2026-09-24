/// <reference path="./types/modules.d.ts" />
import app from './app';
import config from './config/environment';
import connectDatabase from './config/database';
import logger from './utils/logger';
import { GeminiService } from './services/ai/geminiService';

const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    await connectDatabase();

    // Start Express server
    app.listen(config.port, () => {
      logger.info(`🚀 SafeStack Backend running on port ${config.port}`);
      logger.info(`📍 Environment: ${config.nodeEnv}`);
      logger.info(`🌐 Frontend URL: ${config.frontendUrl}`);
      logger.info(`⏰ Server started at: ${new Date().toISOString()}`);

      // Safe integration status (never prints token value)
      const githubToken = process.env.GITHUB_TOKEN;
      if (githubToken && githubToken.length > 10) {
        logger.info(`🐙 GitHub integration: CONFIGURED (token length: ${githubToken.length})`);
      } else {
        logger.warn('🐙 GitHub integration: NOT CONFIGURED — set GITHUB_TOKEN in backend/.env');
      }

      if (GeminiService.isAvailable()) {
        logger.info('🤖 Gemini AI: CONFIGURED');
      } else {
        logger.warn('🤖 Gemini AI: NOT CONFIGURED — set GEMINI_API_KEY in backend/.env for AI explanations');
      }
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM signal received: closing HTTP server');
      process.exit(0);
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT signal received: closing HTTP server');
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
