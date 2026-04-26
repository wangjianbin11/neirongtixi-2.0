import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode: number;
  isOperational: boolean;
}

export class ErrorHandler {
  static handleError(error: Error | AppError, req: Request, res: Response, next: NextFunction) {
    if (this.isTrustedError(error as AppError)) {
      this.handleTrustedError(error as AppError, res);
    } else {
      this.handleCriticalError(error, req, res);
    }
  }

  private static isTrustedError(error: AppError): boolean {
    return error.isOperational;
  }

  private static handleTrustedError(error: AppError, res: Response) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.name,
        message: error.message,
      },
    });
  }

  private static handleCriticalError(error: Error, req: Request, res: Response) {
    logger.error('Critical error occurred', {
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
      },
    });
  }
}

export const errorMiddleware = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  ErrorHandler.handleError(err, req, res, next);
};
