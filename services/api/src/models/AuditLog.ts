import { Schema, model, Document } from 'mongoose';
import { IAuditLog } from '@remote-support/shared-types';

export interface AuditLogDocument extends Omit<IAuditLog, 'id'>, Document {}

const AuditLogSchema = new Schema<AuditLogDocument>(
  {
    userId: {
      type: String,
      index: true,
    },
    deviceId: {
      type: String,
      index: true,
    },
    sessionId: {
      type: String,
      index: true,
    },
    action: {
      type: String,
      required: true,
    },
    details: {
      type: String,
      required: true,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
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

export const AuditLogModel = model<AuditLogDocument>('AuditLog', AuditLogSchema);
export default AuditLogModel;
