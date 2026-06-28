import { Schema, model, Document } from 'mongoose';
import { ISession } from '@remote-support/shared-types';

export interface SessionDocument extends Omit<ISession, 'id'>, Document {}

const SessionSchema = new Schema<SessionDocument>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    deviceId: {
      type: String,
      required: true,
      index: true,
    },
    engineerId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['requested', 'accepted', 'rejected', 'active', 'completed'],
      default: 'requested',
    },
    startedAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
    recordingUrl: {
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

export const SessionModel = model<SessionDocument>('Session', SessionSchema);
export default SessionModel;
