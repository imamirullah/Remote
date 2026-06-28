import { Request, Response, NextFunction } from 'express';
import SessionModel from '../models/Session';
import { AppError } from '@remote-support/shared-utils';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export const createSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sessionId, deviceId } = req.body;
    const engineerId = req.user?.id;

    if (!sessionId || !deviceId || !engineerId) {
      throw new AppError('Incomplete session payload', 400);
    }

    const session = await SessionModel.create({
      sessionId,
      deviceId,
      engineerId,
      status: 'requested',
    });

    res.status(201).json({
      status: 'success',
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};

export const updateSessionStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, recordingUrl } = req.body;
    const session = await SessionModel.findOne({ sessionId: req.params.sessionId });

    if (!session) {
      throw new AppError('Session not found', 404);
    }

    session.status = status;
    if (status === 'active' && !session.startedAt) {
      session.startedAt = new Date();
    }
    if (status === 'completed' && !session.endedAt) {
      session.endedAt = new Date();
    }
    if (recordingUrl) {
      session.recordingUrl = recordingUrl;
    }

    await session.save();

    res.status(200).json({
      status: 'success',
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};

export const getSessions = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sessions = await SessionModel.find().sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: sessions.length,
      data: { sessions },
    });
  } catch (error) {
    next(error);
  }
};

export const getSessionsForDevice = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sessions = await SessionModel.find({ deviceId: req.params.deviceId }).sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: sessions.length,
      data: { sessions },
    });
  } catch (error) {
    next(error);
  }
};
