import { Schema, model, Document } from 'mongoose';
import { ISubscription } from '@remote-support/shared-types';

export interface SubscriptionDocument extends Omit<ISubscription, 'id'>, Document {}

const SubscriptionSchema = new Schema<SubscriptionDocument>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tier: {
      type: String,
      enum: ['free', 'professional', 'enterprise'],
      default: 'free',
    },
    status: {
      type: String,
      enum: ['active', 'canceled', 'past_due', 'unpaid'],
      default: 'active',
    },
    currentPeriodStart: {
      type: Date,
      default: Date.now,
    },
    currentPeriodEnd: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
    stripeSubscriptionId: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        const anyRet = ret as any;
        anyRet.id = anyRet._id.toString();
        delete anyRet._id;
        delete anyRet.__v;
        return anyRet;
      },
    },
  }
);

export const SubscriptionModel = model<SubscriptionDocument>('Subscription', SubscriptionSchema);
export default SubscriptionModel;
