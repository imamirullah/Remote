import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import DeviceModel, { inMemoryDevices } from '../models/Device';
import { AppError, logger } from '@remote-support/shared-utils';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export const registerDevice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { deviceId, deviceName, hostname, operatingSystem, windowsVersion, cpu, ram, ipAddress } = req.body;

    if (!deviceId || !deviceName || !hostname || !operatingSystem || !windowsVersion || !cpu || !ram || !ipAddress) {
      throw new AppError('Incomplete device registration payload', 400);
    }

    let device = await DeviceModel.findOne({ deviceId });

    if (device) {
      device.deviceName = deviceName;
      device.hostname = hostname;
      device.operatingSystem = operatingSystem;
      device.windowsVersion = windowsVersion;
      device.cpu = cpu;
      device.ram = ram;
      device.ipAddress = ipAddress;
      device.isOnline = true;
      device.lastSeen = new Date();
      await device.save();
    } else {
      device = await DeviceModel.create({
        deviceId,
        deviceName,
        hostname,
        operatingSystem,
        windowsVersion,
        cpu,
        ram,
        ipAddress,
        isOnline: true,
        lastSeen: new Date(),
      });
    }

    res.status(200).json({
      status: 'success',
      data: { device },
    });
  } catch (error) {
    next(error);
  }
};

export const getDevices = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const devices = await DeviceModel.find().sort({ isOnline: -1, updatedAt: -1 });

    res.status(200).json({
      status: 'success',
      results: devices.length,
      data: { devices },
    });
  } catch (error) {
    next(error);
  }
};

export const getDeviceById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const device = await DeviceModel.findOne({ deviceId: req.params.deviceId });

    if (!device) {
      throw new AppError('Device not found', 404);
    }

    res.status(200).json({
      status: 'success',
      data: { device },
    });
  } catch (error) {
    next(error);
  }
};

export const updateDeviceStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { isOnline, latency } = req.body;
    const device = await DeviceModel.findOne({ deviceId: req.params.deviceId });

    if (!device) {
      throw new AppError('Device not found', 404);
    }

    device.isOnline = isOnline;
    device.lastSeen = new Date();
    if (latency !== undefined) {
      device.latency = latency;
    }

    await device.save();

    res.status(200).json({
      status: 'success',
      data: { device },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDevice = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const device = await DeviceModel.findOneAndDelete({ deviceId: req.params.deviceId });

    if (!device) {
      throw new AppError('Device not found', 404);
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

import InvitationModel from '../models/Invitation';

export const createInvitation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const engineerId = (req as any).user?.id || 'demo-engineer';
    const token = crypto.randomUUID ? crypto.randomUUID() : require('crypto').randomUUID();
    
    // Set 1-hour expiration
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    
    await InvitationModel.create({
      token,
      createdBy: engineerId,
      expiresAt
    });

    logger.info(`Session invitation created by ${engineerId} with token: ${token}`);

    res.status(201).json({
      status: 'success',
      data: {
        token,
        expiresAt
      }
    });
  } catch (error) {
    next(error);
  }
};

export const validateInvitation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token } = req.params;
    const invite = await InvitationModel.findOne({ token });

    if (!invite) {
      throw new AppError('Invalid or expired invitation link', 404);
    }

    if (new Date() > invite.expiresAt) {
      await InvitationModel.findOneAndDelete({ token });
      throw new AppError('Invitation link has expired', 410);
    }

    res.status(200).json({
      status: 'success',
      data: {
        valid: true,
        createdBy: invite.createdBy
      }
    });
  } catch (error) {
    next(error);
  }
};

export const syncDevice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { device } = req.body;
    if (!device || !device.deviceId) {
      res.status(400).json({ status: 'error', message: 'Invalid device payload' });
      return;
    }

    const index = inMemoryDevices.findIndex((d) => d.deviceId === device.deviceId);
    if (index !== -1) {
      inMemoryDevices[index] = { ...inMemoryDevices[index], ...device };
    } else {
      inMemoryDevices.push(device);
    }

    logger.info(`Synchronized in-memory device from WebSocket service: ${device.deviceId}`);
    res.status(200).json({ status: 'success' });
  } catch (error) {
    next(error);
  }
};

