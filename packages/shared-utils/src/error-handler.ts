import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

export interface CustomError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function errorHandler(
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error(`${req.method} ${req.originalUrl} - ${statusCode} - ${message} \nStack: ${err.stack}`);

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message: statusCode === 500 && process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred.' 
      : message,
  });
}
