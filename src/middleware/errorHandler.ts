import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

class AppError extends Error {
  statusCode: number;
  code: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Internal server error';

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    code = 'FILE_TOO_LARGE';
    message = 'File size exceeds maximum allowed upload limit. Please upload a smaller ZIP archive or configure MAX_UPLOAD_SIZE_MB.';
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_ERROR';
    message = 'Resource already exists';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Token expired';
  }

  // Log error
  logger.error('Error:', {
    message: err.message,
    statusCode,
    code,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  const response: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(err.details && { details: err.details }),
    },
  };

  res.status(statusCode).json(response);
};

export { AppError, errorHandler };
