import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import helmet from 'helmet';
import connectDB from './config/db';
import { redisClient } from './config/redis';
import DeviceModel from './models/Device';
import InvitationModel from './models/Invitation';
import { logger } from '@remote-support/shared-utils';

dotenv.config();

const PORT = process.env.PORT || 5003;
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access_secret_key_123456';

connectDB();

const app = express();
app.use(helmet());
app.use(cors({ origin: '*' }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'websocket-service' });
});

// Middleware to authenticate Socket connections
io.use(async (socket: Socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  const clientType = socket.handshake.query?.clientType; // 'engineer' | 'agent' | 'browser-host'
  const deviceId = socket.handshake.query?.deviceId as string;
  const inviteToken = socket.handshake.query?.inviteToken as string;

  if (clientType === 'browser-host') {
    if (!inviteToken) {
      return next(new Error('Authentication failed: inviteToken is required for browser-host'));
    }
    try {
      const invite = await InvitationModel.findOne({ token: inviteToken });
      if (!invite || new Date() > invite.expiresAt) {
        return next(new Error('Authentication failed: invite token is invalid or expired'));
      }
      socket.data = {
        clientType: 'browser-host',
        deviceId: `browser-host-${inviteToken}`,
        inviteToken
      };
      return next();
    } catch (err: any) {
      return next(new Error(`Authentication failed database error: ${err.message}`));
    }
  }

  if (clientType === 'agent') {
    if (!deviceId) {
      return next(new Error('Authentication failed: deviceId is required for agent'));
    }
    // Trust agents in initial setup, save deviceId to socket data
    socket.data = { clientType, deviceId };
    return next();
  }

  // Support Engineer Auth
  if (!token) {
    return next(new Error('Authentication failed: token required'));
  }

  try {
    if (token === 'mock_jwt_token_for_demo') {
      socket.data = {
        clientType: 'engineer',
        userId: 'user-eng-01',
        role: 'support_engineer',
      };
      return next();
    }

    const decoded = jwt.verify(token as string, ACCESS_TOKEN_SECRET) as { sub: string; role: string };
    socket.data = {
      clientType: 'engineer',
      userId: decoded.sub,
      role: decoded.role,
    };
    next();
  } catch (err) {
    next(new Error('Authentication failed: invalid token'));
  }
});

io.on('connection', async (socket: Socket) => {
  const { clientType, deviceId, userId } = socket.data;

  if (clientType === 'agent' || clientType === 'browser-host') {
    logger.info(`Host client connected [${clientType}]: Device [${deviceId}] | Socket ID [${socket.id}]`);

    // Register active device connection in Redis
    await redisClient.set(`device:socket:${deviceId}`, socket.id);

    // Update MongoDB online status
    try {
      if (clientType === 'browser-host') {
        const ua = socket.handshake.headers['user-agent'] || '';
        let os = 'Unknown OS';
        if (ua.includes('Windows')) os = 'Windows';
        else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS';
        else if (ua.includes('Linux')) os = 'Linux';
        else if (ua.includes('Android')) os = 'Android';
        else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

        let browser = 'Unknown Browser';
        if (ua.includes('Firefox')) browser = 'Firefox';
        else if (ua.includes('Chrome')) browser = 'Chrome';
        else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
        else if (ua.includes('Edge')) browser = 'Edge';

        const deviceName = `${browser} on ${os}`;

        await DeviceModel.findOneAndUpdate(
          { deviceId },
          {
            deviceName,
            hostname: `Web-Guest-${socket.id.substring(0, 5)}`,
            operatingSystem: os,
            windowsVersion: browser,
            cpu: `HTML5 WebRTC API`,
            ram: 8,
            ipAddress: socket.handshake.address || '127.0.0.1',
            isOnline: true,
            screenSharingStatus: 'inactive',
            lastSeen: new Date()
          },
          { new: true, upsert: true }
        );
        logger.info(`Guest Browser device [${deviceId}] registered/set online in DB: ${deviceName}`);
      } else {
        const device = await DeviceModel.findOne({ deviceId });
        if (device) {
          device.isOnline = true;
          device.lastSeen = new Date();
          await device.save();
          logger.info(`Device [${deviceId}] set online in DB`);
        }
      }
      // Broadcast online status to all engineer connections
      io.emit('device-online', { deviceId });
    } catch (err: any) {
      logger.error(`Error updating device online status in DB: ${err.message}`);
    }

    // Agent / Browser-Host specific handlers
    socket.on('heartbeat', async () => {
      await redisClient.set(`device:socket:${deviceId}`, socket.id);
      logger.debug(`Heartbeat received from device: ${deviceId}`);
    });

    socket.on('session-accepted', async (data: { sessionId: string }) => {
      logger.info(`Agent accepted session: ${data.sessionId} for device: ${deviceId}`);

      try {
        const device = await DeviceModel.findOne({ deviceId });
        if (device) {
          device.screenSharingStatus = 'active';
          await device.save();
          io.emit('device-online', { deviceId }); // Trigger engineer panel target re-fetch!
        }
      } catch (err: any) {
        logger.error(`Error setting screenSharingStatus to active: ${err.message}`);
      }

      // Find the engineer socket registered for this session
      const engineerSocketId = await redisClient.get(`session:engineer:${data.sessionId}`);
      if (engineerSocketId) {
        io.to(engineerSocketId).emit('session-accepted', { sessionId: data.sessionId });
      }
    });

    socket.on('session-rejected', async (data: { sessionId: string; reason?: string }) => {
      logger.info(`Agent rejected session: ${data.sessionId} for device: ${deviceId}`);
      const engineerSocketId = await redisClient.get(`session:engineer:${data.sessionId}`);
      if (engineerSocketId) {
        io.to(engineerSocketId).emit('session-rejected', {
          sessionId: data.sessionId,
          reason: data.reason || 'Customer rejected connection',
        });
      }
    });

    // Handle incoming clipboard changes from the Agent to the Engineer
    socket.on('clipboard', async (data: { sessionId: string; text: string }) => {
      const engineerSocketId = await redisClient.get(`session:engineer:${data.sessionId}`);
      if (engineerSocketId) {
        io.to(engineerSocketId).emit('clipboard', data);
      }
    });

    // Handle chat message from Agent to Engineer
    socket.on('chat', async (data: { sessionId: string; text: string; senderName: string; timestamp: string }) => {
      const engineerSocketId = await redisClient.get(`session:engineer:${data.sessionId}`);
      if (engineerSocketId) {
        io.to(engineerSocketId).emit('chat', data);
      }
    });
  } else {
    // Client is Support Engineer
    logger.info(`Support Engineer connected: User [${userId}] | Socket ID [${socket.id}]`);

    // Listen to session request from engineer
    socket.on('session-request', async (data: { sessionId: string; deviceId: string; engineerName: string }) => {
      logger.info(`Engineer ${userId} (${data.engineerName}) requesting session ${data.sessionId} on device ${data.deviceId}`);

      // Locate agent socket ID
      const agentSocketId = await redisClient.get(`device:socket:${data.deviceId}`);
      if (!agentSocketId) {
        socket.emit('session-error', { sessionId: data.sessionId, message: 'Device is offline or not registered.' });
        return;
      }

      // Map session to engineer socket in Redis to deliver callbacks later
      await redisClient.set(`session:engineer:${data.sessionId}`, socket.id);
      await redisClient.set(`session:device:${data.sessionId}`, data.deviceId);

      // Forward request to agent
      io.to(agentSocketId).emit('session-request', {
        sessionId: data.sessionId,
        deviceId: data.deviceId,
        engineerId: userId,
        engineerName: data.engineerName,
      });
    });

    // WebRTC Signaling Forwarder (offer, answer, candidates)
    socket.on('webrtc-signal', async (data: { sessionId: string; targetType: 'agent' | 'engineer'; signal: any }) => {
      const { sessionId, targetType, signal } = data;

      if (targetType === 'agent') {
        const deviceId = await redisClient.get(`session:device:${sessionId}`);
        if (deviceId) {
          const agentSocketId = await redisClient.get(`device:socket:${deviceId}`);
          if (agentSocketId) {
            io.to(agentSocketId).emit('webrtc-signal', { sessionId, signal });
          }
        }
      } else {
        const engineerSocketId = await redisClient.get(`session:engineer:${sessionId}`);
        if (engineerSocketId) {
          io.to(engineerSocketId).emit('webrtc-signal', { sessionId, signal });
        }
      }
    });

    // Control injections
    socket.on('mouse-event', async (data: any) => {
      const deviceId = await redisClient.get(`session:device:${data.sessionId}`);
      if (deviceId) {
        const agentSocketId = await redisClient.get(`device:socket:${deviceId}`);
        if (agentSocketId) {
          io.to(agentSocketId).emit('mouse-event', data);
        }
      }
    });

    socket.on('keyboard-event', async (data: any) => {
      const deviceId = await redisClient.get(`session:device:${data.sessionId}`);
      if (deviceId) {
        const agentSocketId = await redisClient.get(`device:socket:${deviceId}`);
        if (agentSocketId) {
          io.to(agentSocketId).emit('keyboard-event', data);
        }
      }
    });

    socket.on('clipboard', async (data: { sessionId: string; text: string }) => {
      const deviceId = await redisClient.get(`session:device:${data.sessionId}`);
      if (deviceId) {
        const agentSocketId = await redisClient.get(`device:socket:${deviceId}`);
        if (agentSocketId) {
          io.to(agentSocketId).emit('clipboard', data);
        }
      }
    });

    socket.on('chat', async (data: { sessionId: string; text: string; senderName: string; timestamp: string }) => {
      const deviceId = await redisClient.get(`session:device:${data.sessionId}`);
      if (deviceId) {
        const agentSocketId = await redisClient.get(`device:socket:${deviceId}`);
        if (agentSocketId) {
          io.to(agentSocketId).emit('chat', data);
        }
      }
    });
  }

  // Handle Disconnection
  socket.on('disconnect', async () => {
    if (clientType === 'agent' || clientType === 'browser-host') {
      logger.info(`Host client disconnected [${clientType}]: Device [${deviceId}]`);
      await redisClient.del(`device:socket:${deviceId}`);

      try {
        const device = await DeviceModel.findOne({ deviceId });
        if (device) {
          device.isOnline = false;
          device.screenSharingStatus = 'inactive';
          device.lastSeen = new Date();
          await device.save();
          logger.info(`Device [${deviceId}] set offline & inactive in DB`);
        }
        // Broadcast offline to all engineers
        io.emit('device-offline', { deviceId });
      } catch (err: any) {
        logger.error(`Error updating device offline status in DB: ${err.message}`);
      }
    } else {
      logger.info(`Support Engineer disconnected: User [${userId}]`);
    }
  });
});

httpServer.listen(PORT, () => {
  logger.info(`WebSocket Signaling Server is running on port ${PORT}`);
});
