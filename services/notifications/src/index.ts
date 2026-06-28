import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { errorHandler, logger } from '@remote-support/shared-utils';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5005;

app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'notifications-service' });
});

// Mock notification dispatcher
app.post('/api/notifications/dispatch', (req: Request, res: Response) => {
  const { channel, recipient, title, body } = req.body;

  if (!channel || !recipient || !title || !body) {
    res.status(400).json({ status: 'error', message: 'Incomplete notification payload' });
    return;
  }

  logger.info(`Dispatching [${channel}] alert to [${recipient}]: "${title}" - ${body}`);

  // In production, we'd hook up:
  // - Email: nodemailer / SendGrid
  // - SMS: Twilio
  // - Push: Firebase Cloud Messaging

  res.status(200).json({
    status: 'success',
    message: `Alert dispatched successfully via channel: ${channel}`,
  });
});

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Notifications Service running on port ${PORT}`);
});
