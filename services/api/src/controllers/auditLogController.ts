import { Request, Response, NextFunction } from 'express';
import AuditLogModel from '../models/AuditLog';
import { AppError } from '@remote-support/shared-utils';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export const createAuditLog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, deviceId, sessionId, action, details } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';

    if (!action || !details) {
      throw new AppError('Action and details are required', 400);
    }

    const log = await AuditLogModel.create({
      userId,
      deviceId,
      sessionId,
      action,
      details,
      ipAddress,
    });

    res.status(201).json({
      status: 'success',
      data: { log },
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query: any = {};

    if (req.query.userId) query.userId = req.query.userId;
    if (req.query.deviceId) query.deviceId = req.query.deviceId;
    if (req.query.sessionId) query.sessionId = req.query.sessionId;

    const logs = await AuditLogModel.find(query).sort({ timestamp: -1 }).limit(100);

    res.status(200).json({
      status: 'success',
      results: logs.length,
      data: { logs },
    });
  } catch (error) {
    next(error);
  }
};
