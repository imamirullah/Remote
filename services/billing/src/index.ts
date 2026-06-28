import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { errorHandler, logger } from '@remote-support/shared-utils';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5004;

app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json());

// Mock subscription tiers database
const subscriptions: Record<string, { tier: string; status: string; currentPeriodEnd: string }> = {};

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'billing-service' });
});

// Get current billing plan for a user
app.get('/api/billing/subscription/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  const sub = subscriptions[userId] || {
    tier: 'free',
    status: 'active',
    currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  };

  res.status(200).json({
    status: 'success',
    data: { subscription: sub },
  });
});

// Mock Stripe checkout session creation
app.post('/api/billing/checkout', (req: Request, res: Response) => {
  const { userId, tier } = req.body;

  if (!userId || !tier) {
    res.status(400).json({ status: 'error', message: 'UserId and Tier are required' });
    return;
  }

  // Update mock database immediately
  subscriptions[userId] = {
    tier,
    status: 'active',
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  };

  logger.info(`Mock checkout session completed for user [${userId}] purchasing tier [${tier}]`);

  res.status(200).json({
    status: 'success',
    message: 'Subscription purchased successfully (Mocked)',
    data: {
      checkoutUrl: `http://localhost:5173/billing/success?tier=${tier}`,
      subscription: subscriptions[userId],
    },
  });
});

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Billing Service (Mock Stripe) running on port ${PORT}`);
});
